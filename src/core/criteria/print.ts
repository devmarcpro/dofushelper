import type { CriterionAst } from './ast';

/**
 * Canonical textual form of an AST. Every non-atom child of a group is parenthesised,
 * so the output never mixes '&' and '|' at the same level and always parses back to
 * a structurally equal AST.
 */
export function printCriterion(ast: CriterionAst): string {
  if (ast.k === 'atom') return `${ast.key}${ast.op}${ast.args.join(',')}`;
  const separator = ast.k === 'and' ? '&' : '|';
  return ast.items
    .map((item) => (item.k === 'atom' ? printCriterion(item) : `(${printCriterion(item)})`))
    .join(separator);
}
