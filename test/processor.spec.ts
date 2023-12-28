import {assert} from "chai";

import fs from "fs";
import path from "path";

import YamlProcessor from "../src/processor.js";

const processor = new YamlProcessor("test");

function processAndCompare(filename: string) {
  const inDoc = fs.readFileSync(path.join('test', 'fixtures', filename), { encoding: 'utf-8' });

  const doc = processor.parse(inDoc);
  const docStr = JSON.stringify(doc);

  const outDoc = processor.stringify(doc);
  const outDocStructure = processor.parse(outDoc);
  const outDocStructureStr = JSON.stringify(outDocStructure);

  assert.equal(outDocStructureStr, docStr);
  console.log(filename);
}

describe('MdProcessorTest', function() {
  it('documents should be equal', function() {
    processAndCompare('frontmatter.yaml');
    processAndCompare('microcopy.yml');
    processAndCompare('dependabot.yml');

  });
});



