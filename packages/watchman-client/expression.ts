import { EOL } from 'os';
import objectHash from 'object-hash';

import { Expression } from './types';

export function simplifyExpression(expression: Expression): Expression {
  function coalesceInner(expr: Expression): Expression | undefined {
    if (Array.isArray(expr)) {
      if (~['allof', 'anyof'].indexOf(expr[0])) {
        const map: { [hash: string]: any } = {};
        (expr as any[])
          .slice(1)
          .map(coalesceInner)
          .filter(Boolean)
          .forEach((e) => { map[objectHash(e)] = e; });

        const values = Object.values(map);

        if (values.length === 0) {
          return undefined;
        }

        return values.length === 1 ? values[0] : [expr[0], ...values];
      }

      return (expr as any).map(coalesceInner);
    }

    return expr;
  }

  function coalesce(expr: Expression): Expression {
    const result = coalesceInner(expr);
    if (!result) {
      throw new Error(
        [
          'Simplifying watchman expression resulted in a bad state.',
          '== Initial expression ==',
          JSON.stringify(expr, null, 2),
        ].join(EOL)
      );
    }
    return result;
  }

  while (true) {
    const hash = objectHash(expression);
    expression = coalesce(expression);
    if (hash === objectHash(expression)) {
      break;
    }
  }

  return expression;
}
