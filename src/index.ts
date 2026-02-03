import { segment, text } from "@localizesh/sdk";
import yaml, { HastTypeNames, LayoutLevelTypeNames } from "./utils.js";
import {
  Context,
  Document,
  IdGenerator,
  LayoutRoot,
  Segment,
  Processor,
  visitParents,
  LayoutElement,
  LayoutSegment,
  LayoutNode,
} from "@localizesh/sdk";

function astToDocument(layout: LayoutRoot, ctx: Context): Document {
  const idGenerator: IdGenerator = new IdGenerator();
  const segments: Segment[] = [];

  const setSegment = (node: LayoutElement) => {
    const child = node.children[0] as LayoutElement;
    // @ts-ignore
    const tags = child.tags;
    // @ts-ignore
    const text = child.value !== null ? child.value : "";

    const id: string = idGenerator.generateId(text, tags, ctx);
    segments.push({
      id,
      text,
      ...(tags && { tags }),
    });
    // @ts-ignore
    node.children = [segment(id)];
  };

  visitParents(
    layout,
    (node: LayoutNode) =>
      // @ts-ignore
      node?.properties?.kind === "yamlValue" ||
      (node as LayoutElement).tagName === "p",
    (node: LayoutNode) => {
      const el = node as LayoutElement;
      if (el.children[0].type === HastTypeNames.text) setSegment(el);
    },
  );

  return { layout, segments };
}

function documentToAst(data: Document): any {
  const segments: Record<string, Segment> = {};

  data.segments.forEach((segment: Segment): void => {
    segments[segment.id] = segment;
  });

  visitParents(
    data.layout,
    { type: LayoutLevelTypeNames.segment },
    (node: LayoutNode, parent: LayoutNode[]) => {
      const segmentNode = node as LayoutSegment;
      const currentParent = parent[parent.length - 1] as LayoutElement;

      currentParent.children = [text(segments[segmentNode.id].text)];
    },
  );

  return data.layout;
}

class YamlProcessor extends Processor {
  parse(res: string, ctx?: Context): Document {
    const ast: LayoutRoot = yaml.stringToAst(res);

    return astToDocument(ast, ctx);
  }

  stringify(data: Document, ctx?: Context): string {
    const ast = documentToAst(data);

    return yaml.astToString(ast);
  }
}

export default YamlProcessor;
