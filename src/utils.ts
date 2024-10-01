import jsYaml, { CORE_SCHEMA } from "js-yaml";
import {LayoutElement, LayoutRoot} from "@localizesh/sdk";


const yamlSequenceTags = ["ul", "li"];

const quoteCustomCodes: { [key: string]: string } = {
  single: "{$sqc0}",
  double: "{$dqc0}",
  without: "{$without0}",
};

enum quotesTypes {
  single = "single",
  double = "double",
}

const astToString = (rootAst: LayoutRoot): string => {
  const astToStringRecursive = (ast: any, options: any = {}): LayoutElement => {
    const {
      isBool = false,
      isNumber = false
    } = options;

    let result: any;
    const isTableTag = ast?.tagName === "table";
    const isRoot = ast?.type === "root";

    if(isRoot){
      const table = ast?.children[0];
      return astToStringRecursive(table)
    } else if (isTableTag) {
      const tbody = ast?.children[0];
      result = tbody.children.reduce((result: {}, value: LayoutElement) => {
        return { ...result, ...astToStringRecursive(value) };
      }, {});
    } else if (yamlSequenceTags.includes(ast?.tagName)) {
      const children = ast.children.map((value: LayoutElement) => {
        const firstChild = value.children[0];
        const properties = "properties" in firstChild && firstChild.properties;

        const str: any = astToStringRecursive(
          value.tagName === "li" ?
                ("children" in firstChild ? firstChild.children[0] : firstChild) : value,
          {...properties}
        );
        return str;
      });
      result = ast?.tagName === "li" ? children[0] : children;
    } else if (ast?.tagName === "tr") {
      const [key, value] = ast.children;
      const [keyChild] = key.children;
      const [valueChild] = value.children;
      const quotes = value?.properties?.quotes;

      const isValueChildNumber = !isNaN(Number(valueChild.value));
      if (isValueChildNumber) valueChild.value = Number(valueChild.value);
      if (quotes && valueChild.value && quoteCustomCodes[quotes]) {
        valueChild.value =
            quoteCustomCodes[quotes] +
            valueChild.value +
            quoteCustomCodes[quotes];
      } else if (valueChild.value) {
        valueChild.value =
            quoteCustomCodes.without +
            valueChild.value +
            quoteCustomCodes.without;
      }

      result = { [keyChild.value]: astToStringRecursive(valueChild) };
    } else if (ast?.type === "text") {
      result = isBool ?
        (ast.value === "true") :
        (isNumber ? Number(ast.value): ast.value);

    }
    return result;
  };

  const yamlObject: Object = astToStringRecursive(rootAst);

  let yamlString: string = jsYaml.dump(yamlObject, { lineWidth: -1 });
  yamlString = replaceCustomQuotes(yamlString);

  return yamlString;
};

const stringToAst = (rootString: string): LayoutRoot => {
  const yamlObject = jsYaml.load(rootString, { schema: CORE_SCHEMA });
  const stringToAstRecursive: any = (yaml: any) => {
    const isSeq: boolean = Array.isArray(yaml);
    const isMap: boolean = isPlainObject(yaml);

    if (isMap) {
      return {
        type: "yaml",
        tagName: "table",
        children: [
          {
            type: "element",
            tagName: "tbody",
            children: getPropertiesInYamlObj(
              yaml,
              stringToAstRecursive,
              rootString
            ),
            properties: {},
          },
        ],
        properties: {},
      }
    } else if (isSeq) {
      return {
        type: "element",
        tagName: "ul",
        children: yaml.map((value: LayoutElement) => {
          return {
            type: "element",
            tagName: "li",
            children: [
              {
                type: "element",
                tagName: "p",
                children: [stringToAstRecursive(value)],
                properties: {},
              }
            ],
            properties: {},
          };
        }),
        properties: {}
      }
    } else {
      return {
        type: "text",
        value: yaml,
      };
    }
  };
  const ast: LayoutElement = stringToAstRecursive(yamlObject);

  return {
    type: "root",
    children: [ast]
  };
};

const getQuotesType = (yaml: string, rootString: string) => {
  const startIndex = rootString.indexOf(yaml);
  const bracket = rootString[startIndex - 1];
  if (!bracket || !bracket.trim()) {
    return "";
  } else {
    return bracket === `'` ? quotesTypes.single : quotesTypes.double;
  }
};

const replaceCustomQuotes = (str: string): string => {
  const quotesMap: string[][] = [
    [`'${quoteCustomCodes.without}`, ``],
    [`${quoteCustomCodes.without}'`, ``],
    [`${quoteCustomCodes.without}`, ``],
    [`'${quoteCustomCodes.double}`, `"`],
    [`${quoteCustomCodes.double}'`, `"`],
    [`${quoteCustomCodes.double}`, ``],
    [`'${quoteCustomCodes.single}`, `'`],
    [`${quoteCustomCodes.single}'`, `'`],
    [`${quoteCustomCodes.single}`, ``]
  ];

  for (const [key, value] of quotesMap) {
    str = str.replaceAll(key, value);
  }

  return  str;
};

const isPlainObject = function (obj: Object): boolean {
  return Object.prototype.toString.call(obj) === "[object Object]";
};

function getPropertiesInYamlObj(
    yaml: { [key: string]: string },
    stringToAstRecursive: any,
    rootString: string
) {
  const children = [];
  for (let key in yaml) {
    if (yaml.hasOwnProperty(key)) {
      const yamlKey = stringToAstRecursive(key);
      const yamlValue = stringToAstRecursive(yaml[key]);

      let yamlValueProperties: any = { type: "yamlValue" };

      if (yamlValue.type === "text") {
        yamlValue.value = yamlValue.value.toString();
        const quotes = getQuotesType(yamlValue.value, rootString);
        if (quotes) yamlValueProperties = { ...yamlValueProperties, quotes };
      }

      const value = {
        type: "element",
        tagName: "tr",
        children: [
          {
            type: "element",
            tagName: "td",
            children: [yamlKey],
            properties: {},
          },
          {
            type: "element",
            tagName: "td",
            children: [yamlValue],
            properties: yamlValueProperties,
          },
        ],
        properties: {},
      };
      children.push(value);
    }
  }
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
