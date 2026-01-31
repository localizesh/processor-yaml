# Localize.sh YAML Processor

YAML processor for the localize.sh ecosystem. This package parses YAML files into a localization-friendly AST (Abstract Syntax Tree) and stringifies them back, preserving structure while allowing content extraction.

## Installation

```bash
npm install @localizesh/processor-yaml
```

## Usage

### As a Library

```typescript
import YamlProcessor from "@localizesh/processor-yaml";

const processor = new YamlProcessor();

const yamlContent = 'hello: world';
// Parse into a Document (AST + Segments)
const document = processor.parse(yamlContent);

// ... modify document segments ...

// Stringify back to YAML
const newYamlContent = processor.stringify(document);
```

### As a CLI

This package provides a binary `localize-processor-yaml` that works with standard I/O. It reads a protobuf `ParseRequest` or `StringifyRequest` from stdin and writes a `ParseResponse` or `StringifyResponse` to stdout, making it compatible with the localize.sh plugin system.

## Features

- **Structure Preservation**: Maintains the original structure of the YAML document.
- **Round-trip**: Ensures that parsing and then stringifying results in the original YAML structure, including comments and formatting where possible.

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

## License

[Apache-2.0](LICENSE)