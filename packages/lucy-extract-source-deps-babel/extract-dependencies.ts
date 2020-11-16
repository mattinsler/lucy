import fs from 'fs-extra';
import * as babel from '@babel/core';

import { SourceDependency } from './types';

const t = babel.types;

const options = babel.loadPartialConfig({
  presets: [require.resolve('@babel/preset-typescript')],
})?.options;

export async function extractSourceDepsFromCode(file: string, code: string): Promise<SourceDependency[]> {
  try {
    const ast = await babel.parseAsync(code, {
      ...options,
      filename: file,
    });

    if (ast === null) {
      return [];
    }

    const deps: SourceDependency[] = [];

    babel.traverse(ast, {
      CallExpression({ node }) {
        const { arguments: args, callee } = node;

        if (t.isIdentifier(callee) && callee.name === 'require' && args.length === 1 && t.isStringLiteral(args[0])) {
          deps.push({
            location: [args[0].start!, args[0].end!],
            type: 'require',
            typesOnly: false,
            value: args[0].value,
          });
        }
      },
      Import(path) {
        if (t.isCallExpression(path.parent)) {
          const args = path.parent.arguments;

          if (args.length === 1 && t.isStringLiteral(args[0])) {
            deps.push({
              location: [args[0].start!, args[0].end!],
              type: 'dynamic import',
              typesOnly: false,
              value: args[0].value,
            });
          }
        }
      },
      ImportDeclaration({ node }) {
        const { source } = node;

        deps.push({
          location: [source.start!, source.end!],
          type: 'import',
          typesOnly: node.importKind === 'type',
          value: source.value,
        });
      },
    });

    return deps;
  } catch (err) {
    err.message = `[${file}] ${err.message}`;
    throw err;
  }
}

export async function extractSourceDepsFromFile(file: string): Promise<SourceDependency[]> {
  try {
    const code = await fs.readFile(file, 'utf8');
    return extractSourceDepsFromCode(file, code);
  } catch (err) {
    err.message = `[${file}] ${err.message}`;
    throw err;
  }
}
