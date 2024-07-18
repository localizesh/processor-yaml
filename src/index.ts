import {visitParents} from "unist-util-visit-parents";
import yaml from "./utils.js";
import {SegmentsMap} from "./types";
import {Document, Context, IdGenerator, LayoutRoot, Segment, Processor} from "@localizesh/sdk";


function astToDocument(layout: LayoutRoot, ctx: Context): Document {
    const idGenerator: IdGenerator = new IdGenerator();
    const segments: Segment[] = [];

    const setSegment = (node: any) => {
        const tags = node.children[0].tags;
        const text = node.children[0].value !== null ? node.children[0].value : '';
        const id: string = idGenerator.generateId(text, tags)
        const segment: Segment = {
            id,
            text,
            ...(tags && { tags }),
        };

        segments.push(segment);
        node.children = [{type: "segment", id}]
    }

    visitParents(layout, { tagName: "tr" }, (node: any) => {
        const childrenKey = node.children[0]
        const childrenValue = node.children[1]

        if(childrenKey.tagName === "td" && childrenValue.tagName === "td") {
            if(childrenValue.children[0].type === "text") {
                setSegment(childrenValue)
            }

            if(childrenValue.children[0].tagName === "ul") {
                childrenValue.children[0].children.forEach((child: any)=> {
                    if(child.children[0].children[0].type === "text") {
                        setSegment(child.children[0])
                    }
                })
            }
        }
    })

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

    private context: Context;

    constructor(context: Context) {
        this.context = context;
    }

    parse(res: string): Document {
        const ast: LayoutRoot = yaml.stringToAst(res);

        return astToDocument(ast, this.context);
    }

    stringify(data: Document): string {
        const ast = documentToAst(data);

        return yaml.astToString(ast);
    }
}

export default YamlProcessor;
