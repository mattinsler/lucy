const fs = require('fs-extra');
const swc = require('@swc/core');
const Visitor = require('@swc/core/Visitor').default;

class DependencyExtractor extends Visitor {
  constructor() {
    super();
    this.deps = [];
  }

  visitTsType(e) {
    return e;
  }

  visitCallExpression(e) {
    if (
      e.callee.type === 'Identifier' &&
      e.arguments.length === 1 &&
      e.arguments[0].expression.type === 'StringLiteral'
    ) {
      if (e.callee.value === 'require') {
        this.deps.push({
          type: 'require',
          typesOnly: false,
          value: e.arguments[0].expression.value,
        });
      } else if (e.callee.value === 'import') {
        this.deps.push({
          type: 'import',
          typesOnly: false,
          value: e.arguments[0].expression.value,
        });
      }
    }
    return e;
  }

  visitImportDeclaration(e) {
    this.deps.push({
      type: 'import',
      typesOnly: e.typeOnly,
      value: e.source.value,
    });
    return e;
  }
}

async function extractSourceDepsFromCode(file, code) {
  try {
    const extractor = new DependencyExtractor();
    const ast = await swc.parse(code, {
      dynamicImport: true,
      syntax: 'typescript',
      tsx: true,
    });
    extractor.visitProgram(ast);
    return extractor.deps;
  } catch (err) {
    err.message = `[${file}] ${err.message}`;
    throw err;
  }
}

async function extractSourceDepsFromFile(file) {
  try {
    const code = await fs.readFile(file, 'utf8');
    return extractSourceDepsFromCode(file, code);
  } catch (err) {
    err.message = `[${file}] ${err.message}`;
    throw err;
  }
}

module.exports = {
  extractSourceDepsFromCode,
  extractSourceDepsFromFile,
};
