import {
  stringify as stringifyYaml,
  parseDocument as parseYamlDoc,
  YAMLMap,
  YAMLSeq,
  Pair as YAMLPair,
  Scalar,
  Pair,
  Document as YamlDoc,
  isSeq,
  isMap,
} from "yaml";
import {
  type LayoutElement,
  type LayoutRoot,
  type LayoutNode,
  element,
  text,
} from "@localizesh/sdk";

export enum HastTypeNames {
  root = "root",
  element = "element",
  text = "text",
  comment = "comment",
}

export enum LayoutLevelTypeNames {
  segment = "segment",
  yaml = "yaml",
}

const yamlSequenceTags = ["ul", "ol", "li"];

const astToString = (rootAst: LayoutRoot): string => {
  const astToObjectRecursive = (ast: LayoutNode, options: any = {}): {} => {
    const { yaml: yamlValueProps, typeof: typeOfSourceValue } = options;

    let result: any;
    const isTableTag = (ast as LayoutElement)?.tagName === "table";
    const isRoot = ast?.type === HastTypeNames.root;

    if (isRoot) {
      const table = (ast as LayoutRoot)?.children[0];
      return astToObjectRecursive(table);
    } else if (isTableTag) {
      const tbody = (ast as LayoutElement)?.children[0] as LayoutElement;
      result = new YAMLMap();

      tbody.children.forEach((value: LayoutNode) => {
        result.add(astToObjectRecursive(value) as unknown as Pair);
      });
    } else if (yamlSequenceTags.includes((ast as LayoutElement)?.tagName)) {
      const yamlSeq = new YAMLSeq();
      const el = ast as LayoutElement;

      if (el.properties?.yaml) {
        // @ts-ignore
        yamlSeq.flow = el.properties.yaml.flow;
        // @ts-ignore
        yamlSeq.spaceBefore = el.properties.yaml.spaceBefore;
      }

      el.children.forEach((value: LayoutNode) => {
        const valEl = value as LayoutElement;
        const firstChild = valEl.children[0] as LayoutElement;
        const properties = "properties" in firstChild && firstChild.properties;

        yamlSeq.add(
          astToObjectRecursive(
            valEl.tagName === "li"
              ? "children" in firstChild
                ? firstChild.children[0]
                : firstChild
              : value,
            { ...properties },
          ),
        );
      });

      result = yamlSeq;
    } else if ((ast as LayoutElement)?.tagName === "tr") {
      const el = ast as LayoutElement;
      const [key, value] = el.children as LayoutElement[];
      const [keyChild] = key.children as any[];
      const [valueChild] = value.children as LayoutNode[];
      const pair = new YAMLPair({});

      pair.key = new Scalar(keyChild.value);
      if (key.properties?.yaml) {
        for (const [keyProp, prop] of Object.entries(key.properties.yaml)) {
          //@ts-ignore
          pair.key[keyProp] = prop;
        }
      }

      pair.value = astToObjectRecursive(valueChild, value.properties);

      result = pair;
    } else if (ast?.type === HastTypeNames.text) {
      const isBool = typeOfSourceValue === "boolean";
      const isNumber = typeOfSourceValue === "number";
      // @ts-ignore
      const val = ast.value;

      result = new Scalar(
        isBool ? val === "true" : isNumber ? Number(val) : val.toString(),
      );
      if (yamlValueProps) {
        for (const [key, value] of Object.entries(yamlValueProps)) {
          result[key] = value;
        }
      }
    }
    return result;
  };

  const yamlDoc = new YamlDoc(astToObjectRecursive(rootAst));
  const docProps = rootAst.data;

  if (docProps) {
    for (const [key, value] of Object.entries(docProps)) {
      //@ts-ignore
      yamlDoc[key] = value;
    }
  }

  return stringifyYaml(yamlDoc, { lineWidth: 0 });
};

const stringToAst = (rootString: string): LayoutRoot => {
  const yamlObject = parseYamlDoc(rootString);

  const stringToAstRecursive: any = (yaml: any) => {
    const yamlContent = yaml.contents || yaml;

    if (isMap(yamlContent)) {
      return {
        type: LayoutLevelTypeNames.yaml,
        tagName: "table",
        properties: {},
        children: [ element("tbody", getPropertiesInYamlObj(yaml, stringToAstRecursive)) ],
      };
    } else if (isSeq(yamlContent)) {
      return element(
        "ul",
        {
          yaml: { flow: !!yaml?.flow, spaceBefore: yaml.spaceBefore },
        },
        yaml.items.map((value: any) => {
          return element(
            "li",
            { yaml: { spaceBefore: value.spaceBefore } },
            element(
              "p",
              {
                typeof: typeof value.value,
                yaml: {
                  type: value.type,
                  comment: value.comment,
                  commentBefore: value.commentBefore,
                  spaceBefore: value.spaceBefore,
                },
              },
              stringToAstRecursive(value),
            ),
          );
        }),
      );
    } else {
      return text(yaml.source);
    }
  };
  const ast: LayoutElement = stringToAstRecursive(yamlObject);

  return {
    type: HastTypeNames.root,
    children: [ast],
    data: {
      comment: yamlObject.comment,
      commentBefore: yamlObject.commentBefore,
    },
  };
};

function getPropertiesInYamlObj(
  yaml: any,
  stringToAstRecursive: any,
): LayoutElement[] {
  const contentsItems: YAMLPair[] = yaml?.contents?.items || yaml?.items || [];

  return contentsItems
    .filter((pair: YAMLPair) => "key" in pair)
    .map((pair: YAMLPair) => {
      const yamlHastKey = stringToAstRecursive(pair.key);
      const yamlHastValue = stringToAstRecursive(pair.value);

      const yaVal: any = pair?.value;
      const yaKey: any = pair?.key;
      const yamlValueProperties: any = {
        kind: "yamlValue",
        typeof: typeof yaVal.value,
        yaml: {},
      };

      if (yamlHastValue.type === HastTypeNames.text) {
        yamlValueProperties.yaml = {
          type: yaVal?.type,
          comment: yaVal?.comment,
          commentBefore: yaVal?.commentBefore,
        };
      }

      // We manually construct the AST node here instead of using the 'element' helper from @localizesh/sdk.
      // The 'element' helper (wrapper around 'hastscript') has two issues for our use case:
      // 1. It interprets objects with a 'type' property as child nodes, forcing us to use 'kind' instead.
      // 2. It sanitizes properties for HTML compliance, stringifying our complex 'yaml' object into "[object Object]",
      //    which breaks our logic that relies on the raw object reference.
      return {
        type: HastTypeNames.element,
        tagName: "tr",
        children: [
          {
            type: HastTypeNames.element,
            tagName: "td",
            children: [yamlHastKey],
            properties: {
              yaml: {
                comment: yaKey?.comment,
                commentBefore: yaKey?.commentBefore,
                spaceBefore: yaKey.spaceBefore,
              },
            },
          },
          {
            type: HastTypeNames.element,
            tagName: "td",
            children: [yamlHastValue],
            properties: yamlValueProperties,
          },
        ],
        properties: {},
      };
    });
}

const yaml: {
  astToString: (rootHast: LayoutRoot) => string;
  stringToAst: (rootString: string) => LayoutRoot;
} = {
  astToString,
  stringToAst,
};

export default yaml;
