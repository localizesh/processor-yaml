import {assert} from "chai";
import eol from "eol";

import fs from "fs";
import path from "path";

import YamlProcessor from "../src/index.js";

const processor = new YamlProcessor();

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

function processAndCompareWithExpected(filename: string) {
  const inDoc = eol.lf(fs.readFileSync(path.join('test', 'fixtures', filename), {encoding: 'utf-8'}));
  const inDocExpected = eol.lf(fs.readFileSync(path.join('test', 'expected', filename), {encoding: 'utf-8'}));


  const doc = processor.parse(inDoc);
  const outDoc = processor.stringify(doc);
debugger
  assert.equal(outDoc, inDocExpected);
  console.log(filename);
}

describe('YamlProcessorTest', function() {
  it('documents should be equal', function() {
    processAndCompareWithExpected('with-spaces.yaml');
    // processAndCompare('comments.yaml');
    // processAndCompare('paragraphs.yaml');
    // processAndCompare('travel.yaml');
    // processAndCompare('test.yaml');
    // processAndCompare('frontmatter.yaml');
    // processAndCompare('microcopy.yml');
    // processAndCompare('dependabot.yml');
  });
});



