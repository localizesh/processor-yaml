import { assert, describe, it } from "vitest";
import eol from "eol";

import fs from "fs";
import path from "path";

import YamlProcessor from "../src/index.js";

const processor = new YamlProcessor();

function processAndCompare(filename: string) {
  const inDoc = fs.readFileSync(path.join("test", "fixtures", filename), {
    encoding: "utf-8",
  });

  const doc = processor.parse(inDoc);
  const docStr = JSON.stringify(doc);

  const outDoc = processor.stringify(doc);

  const outDocStructure = processor.parse(outDoc);
  const outDocStructureStr = JSON.stringify(outDocStructure);

  assert.equal(outDocStructureStr, docStr);
  console.log(filename);
}

function processAndCompareWithExpected(filename: string) {
  const inDoc = eol.lf(
    fs.readFileSync(path.join("test", "fixtures", filename), {
      encoding: "utf-8",
    }),
  );
  const inDocExpected = eol.lf(
    fs.readFileSync(path.join("test", "expected", filename), {
      encoding: "utf-8",
    }),
  );

  const doc = processor.parse(inDoc);
  const outDoc = processor.stringify(doc);

  assert.equal(outDoc, inDocExpected);
  console.log(filename);
}

describe("YamlProcessorTest", function () {
  describe("Expected Output Match", function () {
    const fixtures = ["with-spaces.yaml"];

    fixtures.forEach((filename) => {
      it(`should match expected output for ${filename}`, function () {
        processAndCompareWithExpected(filename);
      });
    });
  });

  describe("Structure Identity", function () {
    const fixtures = [
      "comments.yaml",
      "paragraphs.yaml",
      "travel.yaml",
      "test.yaml",
      "frontmatter.yaml",
      "microcopy.yml",
      "dependabot.yml",
    ];

    fixtures.forEach((filename) => {
      it(`should maintain structure for ${filename}`, function () {
        processAndCompare(filename);
      });
    });
  });
});
