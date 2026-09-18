import { describe, expect, it } from 'vitest';
import fixture from '../../../tests/fixtures/criteria.real.json';
import type { CriterionAst, ParseError } from './ast';
import { hasMixedPrecedence, parseCriterionSyntax } from './parse';
import { printCriterion } from './print';

const vectors = fixture.vectors;

function parseOrThrow(raw: string): CriterionAst {
  const result = parseCriterionSyntax(raw);
  if (!result.ok)
    throw new Error(`unexpected parse error on ${raw}: ${JSON.stringify(result.error)}`);
  return result.value;
}

function errorOf(raw: string): ParseError {
  const result = parseCriterionSyntax(raw);
  if (result.ok) throw new Error(`expected a parse error on ${raw}`);
  return result.error;
}

describe('parseCriterionSyntax — real vectors (DATA_SOURCES §5)', () => {
  it('has the expected number of vectors', () => {
    expect(vectors).toHaveLength(20);
  });

  it.each(vectors.map((v) => [v.questId, v.criterion] as const))(
    'parses the start criterion of quest %i',
    (_questId, criterion) => {
      expect(parseCriterionSyntax(criterion).ok).toBe(true);
    },
  );

  it('round-trips through printCriterion: parse(print(parse(x))) equals parse(x)', () => {
    for (const { criterion } of vectors) {
      const ast = parseOrThrow(criterion);
      expect(parseOrThrow(printCriterion(ast))).toEqual(ast);
    }
  });

  it('flags no vector as mixing & and | without parentheses', () => {
    for (const { criterion } of vectors) {
      expect(hasMixedPrecedence(criterion)).toBe(false);
    }
  });
});

describe('parseCriterionSyntax — atoms', () => {
  it('parses a single atom', () => {
    expect(parseOrThrow('PL>109')).toEqual({
      k: 'atom',
      key: 'PL',
      op: '>',
      args: [109],
      raw: 'PL>109',
    });
  });

  it('parses two comma-separated arguments', () => {
    expect(parseOrThrow('PJ>26,79')).toEqual({
      k: 'atom',
      key: 'PJ',
      op: '>',
      args: [26, 79],
      raw: 'PJ>26,79',
    });
  });

  it("accepts the 'E' operator (POE11563)", () => {
    expect(parseOrThrow('POE11563')).toEqual({
      k: 'atom',
      key: 'PO',
      op: 'E',
      args: [11563],
      raw: 'POE11563',
    });
  });

  it('keeps key case (Pj is not PJ)', () => {
    const lower = parseOrThrow('Pj=1');
    const upper = parseOrThrow('PJ=1');
    expect(lower.k === 'atom' && lower.key).toBe('Pj');
    expect(upper.k === 'atom' && upper.key).toBe('PJ');
  });

  it("accepts every operator ('=', '!', '>', '<', 'E')", () => {
    for (const op of ['=', '!', '>', '<', 'E']) {
      const ast = parseOrThrow(`Qf${op}5`);
      expect(ast.k === 'atom' && ast.op).toBe(op);
    }
  });
});

describe('parseCriterionSyntax — groups', () => {
  it('quest 1329: 28 Qf atoms at the first level and one or-group of 3', () => {
    const vector = vectors.find((v) => v.questId === 1329);
    if (!vector) throw new Error('vector 1329 missing');
    const ast = parseOrThrow(vector.criterion);
    expect(ast.k).toBe('and');
    if (ast.k !== 'and') return;
    expect(ast.items).toHaveLength(29);
    const atoms = ast.items.filter((i) => i.k === 'atom');
    expect(atoms).toHaveLength(28);
    expect(atoms.every((a) => a.k === 'atom' && a.key === 'Qf' && a.op === '=')).toBe(true);
    const groups = ast.items.filter((i) => i.k !== 'atom');
    expect(groups).toHaveLength(1);
    expect(groups[0]).toEqual({
      k: 'or',
      items: [
        { k: 'atom', key: 'Qf', op: '=', args: [710], raw: 'Qf=710' },
        { k: 'atom', key: 'Qf', op: '=', args: [711], raw: 'Qf=711' },
        { k: 'atom', key: 'Qf', op: '=', args: [1316], raw: 'Qf=1316' },
      ],
    });
  });

  it('quest 1317: three nesting levels (and → or → and)', () => {
    const vector = vectors.find((v) => v.questId === 1317);
    if (!vector) throw new Error('vector 1317 missing');
    const ast = parseOrThrow(vector.criterion);
    expect(ast.k).toBe('and');
    if (ast.k !== 'and') return;
    expect(ast.items).toHaveLength(4);
    const [pl, sc, alignmentQuests, mapBranches] = ast.items;
    expect(pl).toEqual({ k: 'atom', key: 'PL', op: '>', args: [99], raw: 'PL>99' });
    expect(sc).toEqual({ k: 'atom', key: 'Sc', op: '=', args: [702], raw: 'Sc=702' });
    expect(alignmentQuests?.k).toBe('or');
    expect(mapBranches?.k).toBe('or');
    if (mapBranches?.k !== 'or') return;
    expect(mapBranches.items).toHaveLength(3);
    for (const branch of mapBranches.items) {
      expect(branch.k).toBe('and');
      if (branch.k === 'and') expect(branch.items).toHaveLength(3);
    }
    const third = mapBranches.items[2];
    expect(third).toEqual({
      k: 'and',
      items: [
        { k: 'atom', key: 'Pm', op: '=', args: [95684097], raw: 'Pm=95684097' },
        { k: 'atom', key: 'Ps', op: '!', args: [1], raw: 'Ps!1' },
        { k: 'atom', key: 'Ps', op: '!', args: [2], raw: 'Ps!2' },
      ],
    });
  });

  it('applies precedence: & binds tighter than |', () => {
    const ast = parseOrThrow('Qf=1&Qf=2|Qf=3');
    expect(ast.k).toBe('or');
    if (ast.k !== 'or') return;
    expect(ast.items).toHaveLength(2);
    expect(ast.items[0]?.k).toBe('and');
    expect(ast.items[1]?.k).toBe('atom');
  });

  it('flattens nested groups of the same kind', () => {
    expect(parseOrThrow('(Qf=1&Qf=2)&Qf=3')).toEqual(parseOrThrow('Qf=1&Qf=2&Qf=3'));
    expect(parseOrThrow('(Qf=1|Qf=2)|Qf=3')).toEqual(parseOrThrow('Qf=1|Qf=2|Qf=3'));
  });

  it('reduces a group of one element to that element', () => {
    expect(parseOrThrow('(PL>1)')).toEqual(parseOrThrow('PL>1'));
    expect(parseOrThrow('((PL>1))')).toEqual(parseOrThrow('PL>1'));
  });

  it('does not flatten a group of another kind', () => {
    const ast = parseOrThrow('Qf=1&(Qf=2|Qf=3)');
    expect(ast.k).toBe('and');
    if (ast.k !== 'and') return;
    expect(ast.items[1]?.k).toBe('or');
  });
});

describe('parseCriterionSyntax — errors (never throws)', () => {
  it('empty string', () => {
    expect(errorOf('')).toEqual({ pos: 0, expected: 'a criterion', found: 'end of input' });
  });

  it('unclosed parenthesis', () => {
    expect(errorOf('(PL>1')).toEqual({ pos: 5, expected: "')'", found: 'end of input' });
    expect(errorOf('(PL>1&(Qf=2)')).toMatchObject({ pos: 12, expected: "')'" });
  });

  it('stray closing parenthesis', () => {
    expect(errorOf('PL>1)')).toEqual({ pos: 4, expected: "'&', '|' or end of input", found: ')' });
  });

  it('missing operator between atoms', () => {
    expect(errorOf('PL>1Qf=2')).toEqual({
      pos: 4,
      expected: "'&', '|' or end of input",
      found: 'Q',
    });
  });

  it('single-letter key', () => {
    expect(errorOf('P=1')).toEqual({ pos: 1, expected: 'a second key letter', found: '=' });
    expect(errorOf('=1')).toEqual({ pos: 0, expected: 'a two-letter key', found: '=' });
  });

  it('unknown operator', () => {
    expect(errorOf('PL~1')).toEqual({
      pos: 2,
      expected: "an operator ('=', '!', '>', '<' or 'E')",
      found: '~',
    });
  });

  it('non-numeric argument', () => {
    expect(errorOf('PL>abc')).toEqual({ pos: 3, expected: 'an integer', found: 'a' });
    expect(errorOf('PJ>26,x')).toEqual({ pos: 6, expected: 'an integer', found: 'x' });
    expect(errorOf('PL>-1')).toEqual({ pos: 3, expected: 'an integer', found: '-' });
  });

  it('dangling separator', () => {
    expect(errorOf('PL>1&')).toEqual({
      pos: 5,
      expected: 'a two-letter key',
      found: 'end of input',
    });
    expect(errorOf('|PL>1')).toEqual({ pos: 0, expected: 'a two-letter key', found: '|' });
  });

  it('whitespace is not part of the grammar', () => {
    expect(errorOf('PL>1 & Qf=2')).toMatchObject({ pos: 4, found: ' ' });
  });
});

describe('hasMixedPrecedence', () => {
  it('is false for pure conjunctions and disjunctions', () => {
    expect(hasMixedPrecedence('Qf=1&Qf=2&Qf=3')).toBe(false);
    expect(hasMixedPrecedence('Qf=1|Qf=2')).toBe(false);
    expect(hasMixedPrecedence('PL>109')).toBe(false);
  });

  it('is false when parentheses separate the two operators', () => {
    expect(hasMixedPrecedence('Qf=1&(Qf=2|Qf=3)')).toBe(false);
    expect(hasMixedPrecedence('(Qf=1&Qf=2)|(Qf=3&Qf=4)')).toBe(false);
  });

  it('is true when & and | share a level', () => {
    expect(hasMixedPrecedence('Qf=1&Qf=2|Qf=3')).toBe(true);
    expect(hasMixedPrecedence('Qf=1|Qf=2&Qf=3')).toBe(true);
    expect(hasMixedPrecedence('PL>1&(Qf=1|Qf=2&Qf=3)')).toBe(true);
  });

  it('tolerates unbalanced input', () => {
    expect(hasMixedPrecedence('Qf=1)&Qf=2|Qf=3')).toBe(true);
    expect(hasMixedPrecedence(')(')).toBe(false);
  });
});
