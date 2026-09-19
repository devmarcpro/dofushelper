/** Compiles a raw game criterion into the form stored in the dataset. Never throws. */
import { parseCriterion } from './criteria';
import type { CompiledCriterion } from './dataset';

export function compileCriterion(raw: string): CompiledCriterion {
  const parsed = parseCriterion(raw);
  return parsed.ok
    ? { raw, req: parsed.value }
    : { raw, req: { t: 'unknown', raw }, error: parsed.error };
}
