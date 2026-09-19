import { err, ok, type Result } from '../result';
import {
  CRITERION_OPS,
  type CriterionArg,
  type CriterionAst,
  type CriterionOp,
  type ParseError,
} from './ast';

/*
 * Grammar (DATA_SOURCES.md §4), with the usual precedence ('&' binds tighter than '|'):
 *
 *   or    := and ( '|' and )*
 *   and   := term ( '&' term )*
 *   term  := '(' or ')' | atom
 *   atom  := KEY OP VALUE
 *   KEY   := two letters, case-sensitive
 *   OP    := '=' | '!' | '>' | '<' | 'E'
 *   VALUE := arg ( ',' arg )*
 *   arg   := integer | identifier          (identifier: letters, digits, '_', starting with a letter)
 */

const END_OF_INPUT = 'end of input';

function isLetter(ch: string): boolean {
  return (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z');
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9';
}

function isIdentifierChar(ch: string): boolean {
  return isLetter(ch) || isDigit(ch) || ch === '_';
}

function isOp(ch: string): ch is CriterionOp {
  return (CRITERION_OPS as readonly string[]).includes(ch);
}

/** Merges children of the same kind into the parent and drops single-item groups. */
function group(kind: 'and' | 'or', items: CriterionAst[]): CriterionAst {
  const flat: CriterionAst[] = [];
  for (const item of items) {
    if (item.k === kind) flat.push(...item.items);
    else flat.push(item);
  }
  const first = flat[0];
  if (flat.length === 1 && first !== undefined) return first;
  return { k: kind, items: flat };
}

/**
 * Parses a raw criterion string into its syntactic AST. Never throws.
 * Nested groups of the same kind are flattened; a group of one element is that element.
 */
export function parseCriterionSyntax(raw: string): Result<CriterionAst, ParseError> {
  let pos = 0;

  const found = (): string => (pos < raw.length ? (raw[pos] ?? END_OF_INPUT) : END_OF_INPUT);
  const fail = (expected: string): Result<never, ParseError> =>
    err({ pos, expected, found: found() });

  function parseArg(): Result<CriterionArg, ParseError> {
    const start = pos;
    if (isDigit(raw[pos] ?? '')) {
      while (pos < raw.length && isDigit(raw[pos] ?? '')) pos += 1;
      return ok(Number(raw.slice(start, pos)));
    }
    if (isLetter(raw[pos] ?? '')) {
      while (pos < raw.length && isIdentifierChar(raw[pos] ?? '')) pos += 1;
      return ok(raw.slice(start, pos));
    }
    return fail('an integer or an identifier');
  }

  function parseAtom(): Result<CriterionAst, ParseError> {
    const start = pos;
    for (let i = 0; i < 2; i += 1) {
      if (!isLetter(raw[pos] ?? ''))
        return fail(i === 0 ? 'a two-letter key' : 'a second key letter');
      pos += 1;
    }
    const key = raw.slice(start, pos);
    const opChar = raw[pos] ?? '';
    if (!isOp(opChar)) return fail("an operator ('=', '!', '>', '<' or 'E')");
    const op: CriterionOp = opChar;
    pos += 1;
    const first = parseArg();
    if (!first.ok) return first;
    const args: CriterionArg[] = [first.value];
    while (raw[pos] === ',') {
      pos += 1;
      const next = parseArg();
      if (!next.ok) return next;
      args.push(next.value);
    }
    return ok({ k: 'atom', key, op, args, raw: raw.slice(start, pos) });
  }

  function parseTerm(): Result<CriterionAst, ParseError> {
    if (raw[pos] === '(') {
      pos += 1;
      const inner = parseOr();
      if (!inner.ok) return inner;
      if (raw[pos] !== ')') return fail("')'");
      pos += 1;
      return inner;
    }
    return parseAtom();
  }

  function parseAnd(): Result<CriterionAst, ParseError> {
    const items: CriterionAst[] = [];
    const first = parseTerm();
    if (!first.ok) return first;
    items.push(first.value);
    while (raw[pos] === '&') {
      pos += 1;
      const next = parseTerm();
      if (!next.ok) return next;
      items.push(next.value);
    }
    return ok(group('and', items));
  }

  function parseOr(): Result<CriterionAst, ParseError> {
    const items: CriterionAst[] = [];
    const first = parseAnd();
    if (!first.ok) return first;
    items.push(first.value);
    while (raw[pos] === '|') {
      pos += 1;
      const next = parseAnd();
      if (!next.ok) return next;
      items.push(next.value);
    }
    return ok(group('or', items));
  }

  if (raw.length === 0) return fail('a criterion');
  const result = parseOr();
  if (!result.ok) return result;
  if (pos < raw.length) return fail("'&', '|' or end of input");
  return result;
}

/**
 * True when '&' and '|' appear at the same parenthesis level without parentheses separating them,
 * e.g. "A=1&B=2|C=3". Such strings parse with the usual precedence but data:report must flag them.
 * Purely lexical: works on strings that do not parse.
 */
export function hasMixedPrecedence(raw: string): boolean {
  const frames: { and: boolean; or: boolean }[] = [{ and: false, or: false }];
  for (const ch of raw) {
    if (ch === '(') {
      frames.push({ and: false, or: false });
    } else if (ch === ')') {
      if (frames.length > 1) frames.pop();
    } else if (ch === '&' || ch === '|') {
      const top = frames[frames.length - 1];
      if (top === undefined) continue;
      if (ch === '&') top.and = true;
      else top.or = true;
      if (top.and && top.or) return true;
    }
  }
  return false;
}
