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
  isMap
} from 'yaml';
import {RootData} from "hast";
import {LayoutElement, LayoutRoot} from "@localizesh/sdk";

export enum HastTypeNames {
  root = 'root',
  element = "element",
  text = "text",
  comment = "comment",
}

export enum LayoutLevelTypeNames {
  segment = "segment",
  yaml = "yaml"
}

const yamlSequenceTags = ["ul", "li"];

const astToString = (rootAst: LayoutRoot): string => {
  const astToObjectRecursive = (ast: any, options: any = {}): {} => {
    const {
      yaml: yamlValueProps,
      typeof: typeOfSourceValue
    } = options;

    let result: any;
    const isTableTag = ast?.tagName === "table";
    const isRoot = ast?.type === HastTypeNames.root;


    if(isRoot){
      const table = ast?.children[0];
      return astToObjectRecursive(table)
    } else if (isTableTag) {
      const tbody = ast?.children[0];
      result = new YAMLMap();

      tbody.children.forEach((value: LayoutElement) => {
        result.add(astToObjectRecursive(value) as unknown as Pair);
      });

    } else if (yamlSequenceTags.includes(ast?.tagName)) {
      const yamlSeq = new YAMLSeq();

      ast.children.forEach((value: LayoutElement) => {
        const firstChild = value.children[0];
        const properties = "properties" in firstChild && firstChild.properties;

        yamlSeq.add(
          astToObjectRecursive(
            value.tagName === "li" ?
              ("children" in firstChild ? firstChild.children[0] : firstChild) : value,
            {...properties}
          )
        );
      });

      result = yamlSeq;
    } else if (ast?.tagName === "tr") {
      const [key, value] = ast.children;
      const [keyChild] = key.children;
      const [valueChild] = value.children;
      const pair = new YAMLPair({});

      pair.key = new Scalar(keyChild.value);
      if(key.properties?.yaml) {
        for (let [keyProp, prop] of Object.entries(key.properties.yaml)) {
          //@ts-ignore
          pair.key[keyProp] = prop;
        }
      }

      pair.value = astToObjectRecursive(valueChild, value.properties);

      result = pair;
    } else if (ast?.type === HastTypeNames.text) {

      const isBool = typeOfSourceValue === "boolean";
      const isNumber = typeOfSourceValue === "number";

      result = new Scalar(
        isBool ?
          (ast.value === "true") :
          (isNumber ? Number(ast.value) : ast.value.toString())
      );
      if(yamlValueProps) {
        for (let [key, value] of Object.entries(yamlValueProps)) {
          result[key] = value;
        }
      }
    }
    return result;
  };

  const yamlDoc = new YamlDoc(astToObjectRecursive(rootAst));
  const docProps: RootData | undefined = rootAst.data;

  if (docProps) {
    for (let [key, value] of Object.entries(docProps)) {
      //@ts-ignore
      yamlDoc[key] = value;
    }
  }

  return stringifyYaml(yamlDoc, {lineWidth: 0});;
};

const stringToAst = (rootString: string): LayoutRoot => {
  const yamlObject = parseYamlDoc(rootString);

  const stringToAstRecursive: any = (yaml: any) => {
    const yamlContent = yaml.contents || yaml;

    if (isMap(yamlContent)) {
      return {
        type: LayoutLevelTypeNames.yaml,
        tagName: "table",
        children: [
          {
            type: HastTypeNames.element,
            tagName: "tbody",
            children: getPropertiesInYamlObj(
              yaml,
              stringToAstRecursive
            ),
            properties: {},
          },
        ],
        properties: {},
      }
    } else if (isSeq(yamlContent)) {
      return {
        type: HastTypeNames.element,
        tagName: "ul",
        children: yaml.items.map((value: any) => {

          return {
            type: HastTypeNames.element,
            tagName: "li",
            children: [
              {
                type: HastTypeNames.element,
                tagName: "p",
                children: [stringToAstRecursive(value)],
                properties: {
                  typeof: typeof value.value,
                  yaml: {
                    type: value.type,
                    comment: value.comment,
                    commentBefore: value.commentBefore
                  }
                },
              }
            ],
            properties: {},
          };
        }),
        properties: {}
      }
    } else {
      return {
        type: HastTypeNames.text,
        value: yaml.source,
      };
    }
  };
  const ast: LayoutElement = stringToAstRecursive(yamlObject);

  return {
    type: HastTypeNames.root,
    children: [ast],
    data: {
      comment: yamlObject.comment,
      commentBefore: yamlObject.commentBefore
    }
  };
};

function getPropertiesInYamlObj(
    yaml: any,
    stringToAstRecursive: any
) {
  const children: any[] = [];
  const contentsItems: YAMLPair[] = yaml?.contents?.items || yaml?.items || [];

  contentsItems.forEach((pair: YAMLPair) => {
    if ("key" in pair) {

      const yamlHastKey = stringToAstRecursive(pair.key);
      const yamlHastValue = stringToAstRecursive(pair.value);

      const yaVal: any = pair?.value;
      const yaKey: any = pair?.key;
      let yamlValueProperties = {type: "yamlValue", typeof: typeof yaVal.value, yaml: {}};

      if (yamlHastValue.type === HastTypeNames.text) {
        yamlValueProperties.yaml = {
          type: yaVal?.type,
          comment: yaVal?.comment,
          commentBefore: yaVal?.commentBefore,
        };
      }

      const value = {
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
                commentBefore: yaKey?.commentBefore
              }
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
      children.push(value);
    }
  })
  return children;
}

const yaml: {
  astToString: (rootHast: LayoutRoot) => string;
  stringToAst: (rootString: string) => LayoutRoot;
} = {
  astToString,
  stringToAst,
};

export default yaml;
