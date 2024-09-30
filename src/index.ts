import {visitParents} from "unist-util-visit-parents";
import yaml from "./utils.js";
import {SegmentsMap} from "./types";
import {Context, Document, IdGenerator, LayoutRoot, Segment, Processor} from "@localizesh/sdk";

function astToDocument(layout: LayoutRoot, ctx: Context): Document {
    const idGenerator: IdGenerator = new IdGenerator();
    const segments: Segment[] = [];

    const setSegment = (node: any) => {
        const tags = node.children[0].tags;
        let text = node.children[0].value !== null ? node.children[0].value : '';

        const isBool = typeof text === "boolean";
        if(isBool) {
          node.properties = {...node.properties, isBool: true};
          text = text.toString();
        }

        const id: string = idGenerator.generateId(text, tags, ctx)
        const segment: Segment = {
            id,
            text,
            ...(tags && { tags }),
        };

        segments.push(segment);
        node.children = [{type: "segment", id}]
    }

    visitParents(layout,
      (node: any) => node?.properties?.type === "yamlValue" || node.tagName === "p",
      (node: any) => {
        if(node.children[0].type === "text") setSegment(node);
      }
    )

    return { layout, segments };
}

function documentToAst(data: Document): any {
    const segmentsMap: SegmentsMap = {};

    data.segments.forEach((segment: Segment): void => {
        segmentsMap[segment.id] = segment;
    });

    visitParents(data.layout, { type: "segment" }, (node: any, parent) => {
        const currentParent = parent[parent.length - 1];

        currentParent.children = [{type: "text", value: segmentsMap[node.id].text}]
    });

    return data.layout;
}

class YamlProcessor implements Processor {
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
