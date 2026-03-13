import { segment, text } from "@localizesh/sdk";
import yaml, { HastTypeNames, LayoutLevelTypeNames } from "./utils.js";
import {
  Document,
  LayoutRoot,
  Segment,
  Processor,
  visitParents,
  LayoutElement,
  LayoutSegment,
  LayoutNode,
} from "@localizesh/sdk";

class YamlProcessor extends Processor {
  parse(res: string): Document {
    const ast: LayoutRoot = yaml.stringToAst(res);

    return this.astToDocument(ast);
  }

  stringify(data: Document): string {
    const ast = this.documentToAst(data);

    return yaml.astToString(ast);
  }

  private astToDocument(layout: LayoutRoot): Document {
    const segments: Segment[] = [];

    const getKeyPath = (parents: LayoutNode[]): string => {
      return parents
        .filter((p) => (p as LayoutElement).tagName === "tr")
        .map((tr) => {
          const keyTd = (tr as LayoutElement).children[0] as LayoutElement;
          // @ts-ignore
          return keyTd.children[0]?.value ?? "";
        })
        .join(".");
    };

    const setSegment = (node: LayoutElement, parents: LayoutNode[]) => {
      const child = node.children[0] as LayoutElement;
      // @ts-ignore
      const tags = child.tags;
      // @ts-ignore
      const text = child.value !== null ? child.value : "";

      const key = getKeyPath(parents);
      const id: string = this.id(text, tags, { key });
      segments.push({
        id,
        text,
        ...(tags && { tags }),
        ...(key && { metadata: { key } }),
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
      (node: LayoutNode, parents: LayoutNode[]) => {
        const el = node as LayoutElement;
        if (el.children[0].type === HastTypeNames.text)
          setSegment(el, parents);
      },
    );

    return { layout, segments };
  }

  private documentToAst(data: Document): LayoutRoot {
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
}

export default YamlProcessor;
