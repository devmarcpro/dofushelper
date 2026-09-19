import { describe, expect, it } from 'vitest';
import fixture from '../../../tests/fixtures/criteria.real.json';
import type { Requirement } from '../types';
import { keyRole } from './criteria-map';
import { parseCriterion, simplify } from './to-requirement';

// Small constructors so the hand-written expectations stay readable.
const all = (...of: Requirement[]): Requirement => ({ t: 'all', of });
const any = (...of: Requirement[]): Requirement => ({ t: 'any', of });
const not = (of: Requirement): Requirement => ({ t: 'not', of });
const q = (id: number): Requirement => ({ t: 'questDone', id });
const a = (id: number): Requirement => ({ t: 'achievementDone', id });
const level = (min: number): Requirement => ({ t: 'level', min });
const job = (jobId: number, min: number): Requirement => ({ t: 'jobLevel', jobId, min });
const side = (s: 0 | 1 | 2): Requirement => ({ t: 'alignment', side: s });
const item = (itemId: number, qty = 1): Requirement => ({ t: 'hasItem', itemId, qty });
const ctx = (raw: string): Requirement => ({ t: 'context', key: raw.slice(0, 2), raw });
const unknown = (raw: string): Requirement => ({ t: 'unknown', raw });

/** Expected Requirement for every real vector of DATA_SOURCES §5, written by hand. */
const EXPECTED: Record<number, Requirement> = {
  29: level(110),
  18: all(),
  56: all(side(1), ctx('Pa=1'), level(30), q(55)),
  275: all(side(2), ctx('Pa=55'), level(130), any(q(272), q(273), q(274))),
  215: all(level(30), q(211), not(item(8576)), ctx('Qa!216'), not(q(216))),
  147: all(level(30), job(26, 80), ctx('PZ=1')),
  318: all(side(1), ctx('Pa=70'), level(170), q(333)),
  580: all(level(100), any(not(item(11267)), ctx('DD>6,11267'))),
  658: item(11540, 10),
  676: all(level(163), unknown('POE11563')),
  143: all(level(60), not(side(1)), not(side(2))),
  495: all(
    level(20),
    ctx('PL<51'),
    ctx('Qa!496'),
    ctx('Qa!497'),
    ctx('Qa!498'),
    ctx('Qa!500'),
    ctx('Qa!882'),
    any(ctx('Qa=890'), ctx('Qc=890')),
  ),
  674: all(level(100), q(631), any(item(11195), item(11197), ctx('DD>8,11198')), ctx('Sc=702')),
  747: all(any(q(720), q(721), q(722), q(723)), q(724), q(725), q(726), q(741), q(742)),
  1614: all(level(180), q(1613), a(1077), a(1107), a(1147)),
  1317: all(
    level(100),
    ctx('Sc=702'),
    any(q(710), q(711), q(1316)),
    any(
      all(ctx('Pm=217318404'), side(1), ctx('Pa>0')),
      all(ctx('Pm=216530944'), side(2), ctx('Pa>0')),
      all(ctx('Pm=95684097'), not(side(1)), not(side(2))),
    ),
  ),
  710: all(level(50), side(1), ctx('Pa>0'), ctx('Sc=701'), not(q(711)), not(q(1316))),
  711: all(level(50), side(2), ctx('Pa>0'), ctx('Sc=701'), not(q(710)), not(q(1316))),
  1316: all(level(50), not(side(1)), not(side(2)), ctx('Sc=701'), not(q(710)), not(q(711))),
  1329: all(
    ...[
      612, 613, 614, 619, 620, 621, 622, 623, 624, 625, 626, 649, 650, 651, 652, 653, 655, 919,
      1309, 1330, 1325, 1310, 1333, 1334,
    ].map(q),
    any(q(710), q(711), q(1316)),
    ...[1317, 1318, 1326, 1327].map(q),
  ),
};

function requirementOf(raw: string): Requirement {
  const result = parseCriterion(raw);
  if (!result.ok) throw new Error(`unexpected parse error on ${raw}`);
  return result.value;
}

describe('toRequirement — real vectors (DATA_SOURCES §5)', () => {
  it('has a hand-written expectation for every vector', () => {
    expect(
      Object.keys(EXPECTED)
        .map(Number)
        .sort((x, y) => x - y),
    ).toEqual(fixture.vectors.map((v) => v.questId).sort((x, y) => x - y));
  });

  it.each(fixture.vectors.map((v) => [v.questId, v.criterion] as const))(
    'quest %i produces the expected requirement',
    (questId, criterion) => {
      expect(requirementOf(criterion)).toEqual(EXPECTED[questId]);
    },
  );

  it('quest 1329: 28 mandatory quests and one choice of 3', () => {
    const requirement = requirementOf(
      fixture.vectors.find((v) => v.questId === 1329)?.criterion ?? '',
    );
    expect(requirement.t).toBe('all');
    if (requirement.t !== 'all') return;
    expect(requirement.of.filter((r) => r.t === 'questDone')).toHaveLength(28);
    expect(requirement.of.filter((r) => r.t === 'any')).toHaveLength(1);
  });
});

describe('toRequirement — key semantics', () => {
  it('PL: > is a minimum level (+1), < is context, = is unknown', () => {
    expect(requirementOf('PL>0')).toEqual(level(1));
    expect(requirementOf('PL<51')).toEqual(ctx('PL<51'));
    expect(requirementOf('PL=50')).toEqual(unknown('PL=50'));
  });

  it('QF: more than 0 times is questDone, more than n times is context', () => {
    expect(requirementOf('QF>333,0')).toEqual(q(333));
    expect(requirementOf('QF>333,4')).toEqual(ctx('QF>333,4'));
    expect(requirementOf('QF=333')).toEqual(unknown('QF=333'));
  });

  it('OA, PG, Ps: = is the leaf, ! is its negation', () => {
    expect(requirementOf('OA=1077')).toEqual(a(1077));
    expect(requirementOf('OA!1077')).toEqual(not(a(1077)));
    expect(requirementOf('PG=13')).toEqual({ t: 'breed', id: 13 });
    expect(requirementOf('PG!14')).toEqual(not({ t: 'breed', id: 14 }));
    expect(requirementOf('Ps=0')).toEqual(side(0));
    expect(requirementOf('Ps=3')).toEqual(ctx('Ps=3'));
  });

  it('PO: quantity form means "more than n"', () => {
    expect(requirementOf('PO=8576')).toEqual(item(8576));
    expect(requirementOf('PO>11540,9')).toEqual(item(11540, 10));
    expect(requirementOf('PO<11540,9')).toEqual(unknown('PO<11540,9'));
  });

  it('PJ: job level is a minimum (+1)', () => {
    expect(requirementOf('PJ>26,79')).toEqual(job(26, 80));
    expect(requirementOf('PJ=26')).toEqual(unknown('PJ=26'));
  });

  it('BT=1 is "always true"; any other BT is unknown', () => {
    expect(requirementOf('BT=1')).toEqual(all());
    expect(requirementOf('BT=0')).toEqual(unknown('BT=0'));
  });

  it('keys outside the table are unknown, never an error', () => {
    expect(requirementOf('(EM>147,0,d)')).toEqual(unknown('EM>147,0,d'));
    expect(requirementOf('Zz=1&PL>9')).toEqual(all(unknown('Zz=1'), level(10)));
  });

  it('engine keys with an identifier argument are unknown', () => {
    expect(requirementOf('Qf=abc')).toEqual(unknown('Qf=abc'));
    expect(requirementOf('PO=abc')).toEqual(unknown('PO=abc'));
  });

  it('only the syntactic stage can fail', () => {
    expect(parseCriterion('PL>>').ok).toBe(false);
  });

  it('exposes the role of each key', () => {
    expect(keyRole('Qf')).toBe('engine');
    expect(keyRole('Sc')).toBe('context');
    expect(keyRole('Ef')).toBe('unknown');
  });
});

describe('simplify', () => {
  it('flattens nested groups of the same kind', () => {
    expect(simplify(all(q(1), all(q(2), all(q(3)))))).toEqual(all(q(1), q(2), q(3)));
    expect(simplify(any(q(1), any(q(2), q(3))))).toEqual(any(q(1), q(2), q(3)));
  });

  it('removes duplicates', () => {
    expect(simplify(all(q(1), level(10), q(1)))).toEqual(all(q(1), level(10)));
  });

  it('reduces a group of one element, including after de-duplication', () => {
    expect(simplify(all(q(1)))).toEqual(q(1));
    expect(simplify(any(q(1), q(1)))).toEqual(q(1));
  });

  it('drops "always true" from all, and makes any true when one branch is true', () => {
    expect(simplify(all(all(), q(1)))).toEqual(q(1));
    expect(simplify(any(q(1), all()))).toEqual(all());
    expect(requirementOf('BT=1&PL>9')).toEqual(level(10));
  });

  it('simplifies under not and keeps other kinds nested', () => {
    expect(simplify(not(all(q(1))))).toEqual(not(q(1)));
    expect(simplify(all(q(1), any(q(2), q(3))))).toEqual(all(q(1), any(q(2), q(3))));
  });
});
