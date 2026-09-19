import { describe, expect, it } from 'vitest';
import { compileCriterion, compileCriterionWithOverride, parseRequirementLeaf } from './criterion';

const q = (id: number) => ({ t: 'questDone', id }) as const;

describe('compileCriterion', () => {
  it('stores the raw string and its requirement', () => {
    expect(compileCriterion('Qf=9000001')).toEqual({ raw: 'Qf=9000001', req: q(9000001) });
  });

  it('degrades an unparsable string to unknown, with the error', () => {
    const compiled = compileCriterion('PL>>');
    expect(compiled.req).toEqual({ t: 'unknown', raw: 'PL>>' });
    expect(compiled.error?.pos).toBe(3);
  });
});

describe('compileCriterionWithOverride (SPEC §7)', () => {
  it('changes nothing without override', () => {
    const outcome = compileCriterionWithOverride('PL>9&Qf=9000001', undefined);
    expect(outcome.criterion).toEqual(compileCriterion('PL>9&Qf=9000001'));
    expect(outcome.unusedRemovals).toEqual([]);
  });

  it('removes a wrong atom and keeps the raw game string for display', () => {
    const outcome = compileCriterionWithOverride('PL>9&Qf=9000001&Qf=9000002', {
      removeRequires: ['Qf=9000002'],
    });
    expect(outcome.criterion).toEqual({
      raw: 'PL>9&Qf=9000001&Qf=9000002',
      req: { t: 'all', of: [{ t: 'level', min: 10 }, q(9000001)] },
    });
  });

  it('removes inside groups and collapses what is left', () => {
    const inGroup = compileCriterionWithOverride('Qf=9000001&(Qf=9000002|Qf=9000003)', {
      removeRequires: ['Qf=9000003'],
    });
    expect(inGroup.criterion.req).toEqual({ t: 'all', of: [q(9000001), q(9000002)] });
    const everything = compileCriterionWithOverride('Qf=9000001', {
      removeRequires: ['Qf=9000001'],
    });
    expect(everything.criterion.req).toEqual({ t: 'all', of: [] });
  });

  it('adds a hidden prerequisite', () => {
    const outcome = compileCriterionWithOverride('PL>9', { addRequires: [q(9000005)] });
    expect(outcome.criterion.req).toEqual({ t: 'all', of: [{ t: 'level', min: 10 }, q(9000005)] });
    expect(
      compileCriterionWithOverride('BT=1', { addRequires: [q(9000005)] }).criterion.req,
    ).toEqual(q(9000005));
  });

  it('reports obsolete overrides: atom already gone, prerequisite already there', () => {
    const outcome = compileCriterionWithOverride('PL>9&Qf=9000001', {
      removeRequires: ['Qf=9000009'],
      addRequires: [q(9000001)],
    });
    expect(outcome.unusedRemovals).toEqual(['Qf=9000009']);
    expect(outcome.redundantAdditions).toEqual([q(9000001)]);
    expect(outcome.criterion).toEqual(compileCriterion('PL>9&Qf=9000001'));
  });

  it('rejects additions that are not a plain requirement leaf', () => {
    const bad = [{ t: 'any', of: [] }, { t: 'questDone', id: 'x' }, null, { t: 'level', min: 0 }];
    expect(compileCriterionWithOverride('PL>9', { addRequires: bad }).invalidAdditions).toEqual(
      bad,
    );
  });
});

describe('parseRequirementLeaf', () => {
  it('accepts every supported leaf and drops extra fields', () => {
    expect(parseRequirementLeaf({ t: 'jobLevel', jobId: 9900001, min: 20, extra: true })).toEqual({
      t: 'jobLevel',
      jobId: 9900001,
      min: 20,
    });
    expect(parseRequirementLeaf({ t: 'alignment', side: 0 })).toEqual({ t: 'alignment', side: 0 });
    expect(parseRequirementLeaf({ t: 'hasItem', itemId: 9100001, qty: 2 })).toEqual({
      t: 'hasItem',
      itemId: 9100001,
      qty: 2,
    });
    expect(parseRequirementLeaf({ t: 'breed', id: 9900101 })).toEqual({ t: 'breed', id: 9900101 });
    expect(parseRequirementLeaf({ t: 'alignment', side: 3 })).toBeNull();
    expect(parseRequirementLeaf('Qf=1')).toBeNull();
  });
});
