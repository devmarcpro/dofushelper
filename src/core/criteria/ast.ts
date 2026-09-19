/**
 * Syntactic AST of a game criterion string (DATA_SOURCES.md §4).
 * This stage carries no meaning: the semantic stage (toRequirement, M2) interprets keys and operators.
 */

/** Operators observed in the data. The meaning of 'E' is still to be established (⚠️). */
export type CriterionOp = '=' | '!' | '>' | '<' | 'E';

export const CRITERION_OPS: readonly CriterionOp[] = ['=', '!', '>', '<', 'E'];

/** An argument is an integer, or an identifier such as the 'd' of "EM>147,0,d" (achievement objectives). */
export type CriterionArg = number | string;

export interface CriterionAtom {
  k: 'atom';
  /** Exactly two letters, case-sensitive (Pj ≠ PJ). */
  key: string;
  op: CriterionOp;
  /** One or more arguments (quest start criteria: one or two integers). */
  args: CriterionArg[];
  /** The atom as written in the source string. */
  raw: string;
}

export interface CriterionGroup {
  k: 'and' | 'or';
  /** At least two items; nested groups of the same kind are flattened. */
  items: CriterionAst[];
}

export type CriterionAst = CriterionAtom | CriterionGroup;

export interface ParseError {
  /** 0-based offset in the source string where parsing stopped. */
  pos: number;
  /** What the parser expected at that position. */
  expected: string;
  /** What it found instead (a character, or 'end of input'). */
  found: string;
}
