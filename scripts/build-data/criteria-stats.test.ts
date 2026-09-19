import { describe, expect, it } from 'vitest';
import fixture from '../../tests/fixtures/criteria.real.json';
import { citedIds, computeCriteriaStats, parsedShare } from './criteria-stats';

const questSamples = fixture.vectors.map((v) => ({
  raw: v.criterion,
  owner: `quête ${v.questId}`,
}));

describe('computeCriteriaStats on the real vectors', () => {
  const stats = computeCriteriaStats(questSamples);

  it('parses every real vector', () => {
    expect(stats.total).toBe(20);
    expect(stats.parsed).toBe(20);
    expect(stats.failed).toEqual([]);
    expect(parsedShare(stats)).toBe(1);
  });

  it('counts keys and operators', () => {
    // 1329 alone carries 31 Qf atoms
    expect(stats.byKey.get('Qf')).toBeGreaterThanOrEqual(31);
    expect(stats.byKey.get('BT')).toBe(1);
    expect(stats.byOp.get('E')).toBe(1);
  });

  it('knows every key of the DATA_SOURCES §4 table', () => {
    expect([...stats.unknownKeys.keys()]).toEqual([]);
  });

  it('lists the longest criteria first', () => {
    expect(stats.longest[0]?.owner).toBe('quête 1329');
    expect(stats.longest).toHaveLength(10);
  });
});

describe('computeCriteriaStats on synthetic input', () => {
  const stats = computeCriteriaStats([
    { raw: '', owner: 'FAKE a' },
    { raw: 'Zz=1&Zz=2&Zz=3&Zz=4', owner: 'FAKE b' },
    { raw: 'PL>1&Qf=2|Qf=3', owner: 'FAKE c' },
    { raw: 'PL>>', owner: 'FAKE d' },
    { raw: '(EM>9300001,0,d)', owner: 'FAKE e' },
  ]);

  it('separates empty, parsed and failed criteria', () => {
    expect(stats.empty).toBe(1);
    expect(stats.parsed).toBe(3);
    expect(stats.failed.map((f) => f.owner)).toEqual(['FAKE d']);
    expect(parsedShare(stats)).toBe(0.75);
  });

  it('reports unknown keys with at most three distinct examples', () => {
    expect(stats.unknownKeys.get('Zz')).toEqual({ count: 4, examples: ['Zz=1', 'Zz=2', 'Zz=3'] });
    expect(stats.unknownKeys.has('EM')).toBe(true);
  });

  it('flags mixed precedence and tracks argument shapes', () => {
    expect(stats.mixedPrecedence.map((s) => s.owner)).toEqual(['FAKE c']);
    expect(stats.maxArgs).toBe(3);
    expect(stats.identifierArgs).toBe(1);
  });
});

describe('citedIds', () => {
  it('collects quests and achievements cited by criteria with their first owner', () => {
    const cited = citedIds([
      { raw: 'Qf=9000001&(Qa!9000002|OA=9000201)', owner: 'FAKE x' },
      { raw: 'Qf=9000001', owner: 'FAKE y' },
    ]);
    expect([...cited.quests]).toEqual([
      [9000001, 'FAKE x'],
      [9000002, 'FAKE x'],
    ]);
    expect([...cited.achievements]).toEqual([[9000201, 'FAKE x']]);
  });
});
