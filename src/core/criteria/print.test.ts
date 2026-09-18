import { describe, expect, it } from 'vitest';
import type { CriterionAst } from './ast';
import { parseCriterionSyntax } from './parse';
import { printCriterion } from './print';

function parseOrThrow(raw: string): CriterionAst {
  const result = parseCriterionSyntax(raw);
  if (!result.ok) throw new Error(`unexpected parse error on ${raw}`);
  return result.value;
}

describe('printCriterion', () => {
  it('prints atoms as written', () => {
    expect(printCriterion(parseOrThrow('PL>109'))).toBe('PL>109');
    expect(printCriterion(parseOrThrow('PJ>26,79'))).toBe('PJ>26,79');
    expect(printCriterion(parseOrThrow('POE11563'))).toBe('POE11563');
  });

  it('keeps a flat conjunction flat', () => {
    expect(printCriterion(parseOrThrow('Ps=1&Pa=1&PL>29&Qf=55'))).toBe('Ps=1&Pa=1&PL>29&Qf=55');
  });

  it('drops redundant parentheses', () => {
    expect(printCriterion(parseOrThrow('((PL>1))&(Qf=2)'))).toBe('PL>1&Qf=2');
    expect(printCriterion(parseOrThrow('(Qf=1&Qf=2)&Qf=3'))).toBe('Qf=1&Qf=2&Qf=3');
  });

  it('parenthesises every nested group, so & and | never mix at one level', () => {
    expect(printCriterion(parseOrThrow('Qf=1&Qf=2|Qf=3'))).toBe('(Qf=1&Qf=2)|Qf=3');
    expect(printCriterion(parseOrThrow('Qf=1|Qf=2&Qf=3'))).toBe('Qf=1|(Qf=2&Qf=3)');
    expect(printCriterion(parseOrThrow('PL>99&(PO!11267|DD>6,11267)'))).toBe(
      'PL>99&(PO!11267|DD>6,11267)',
    );
  });

  it('prints a hand-built AST', () => {
    const ast: CriterionAst = {
      k: 'or',
      items: [
        { k: 'atom', key: 'Qf', op: '=', args: [1], raw: 'Qf=1' },
        {
          k: 'and',
          items: [
            { k: 'atom', key: 'PL', op: '>', args: [9], raw: 'PL>9' },
            { k: 'atom', key: 'PO', op: '>', args: [5, 2], raw: 'PO>5,2' },
          ],
        },
      ],
    };
    expect(printCriterion(ast)).toBe('Qf=1|(PL>9&PO>5,2)');
  });
});
