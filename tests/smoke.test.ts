/**
 * Smoke test over the whole compiled dataset (SPEC §12, M2): resolving every quest, every
 * achievement and every catalog goal must never throw, whatever the data (cycles, missing ids,
 * unknown criteria), and must stay fast. public/data/ is versioned, so this runs in CI.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CompiledDataset } from '../src/core/dataset';
import { createEngine } from '../src/core/engine';
import type { Character, Goal } from '../src/core/types';

const read = <T>(file: string): T =>
  JSON.parse(readFileSync(path.join('public', 'data', file), 'utf8')) as T;

const dataset: CompiledDataset = {
  quests: read('quests.json'),
  achievements: read('achievements.json'),
  items: read('items.json'),
  monsters: read('monsters.json'),
  dungeons: read('dungeons.json'),
  refs: read('refs.json'),
  goals: read('goals.json'),
};

const character: Character = {
  id: 'FAKE-smoke',
  name: 'FAKE',
  breedId: null,
  level: null,
  alignment: null,
  jobs: {},
  serverName: null,
  doneQuests: [],
  doneAchievements: [],
  inventory: {},
  goals: [],
  choices: {},
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('smoke test on the full dataset', () => {
  const buildStart = performance.now();
  const engine = createEngine(dataset);
  const buildMs = performance.now() - buildStart;

  const goals: Goal[] = [
    ...dataset.quests.map((q): Goal => ({ t: 'quest', id: q.id })),
    ...dataset.achievements.map((a): Goal => ({ t: 'achievement', id: a.id })),
    ...engine.catalog.map((g): Goal => g.goal),
  ];

  it('builds the graph of every quest and achievement quickly', () => {
    expect(engine.graph.nodes.size).toBe(dataset.quests.length + dataset.achievements.length);
    console.log(
      `buildGraph + indexes: ${buildMs.toFixed(1)} ms for ${engine.graph.nodes.size} nodes`,
    );
    expect(buildMs).toBeLessThan(300);
  });

  it('resolves every goal without throwing, within the time budget', () => {
    let slowest = { ms: 0, goal: '' };
    let largest = { nodes: 0, goal: '' };
    let cycles = 0;
    let missing = 0;
    const start = performance.now();
    for (const goal of goals) {
      const t0 = performance.now();
      const plan = engine.resolve(goal, character);
      const ms = performance.now() - t0;
      const label = JSON.stringify(goal);
      if (ms > slowest.ms) slowest = { ms, goal: label };
      if (plan.nodes.length > largest.nodes) largest = { nodes: plan.nodes.length, goal: label };
      cycles += plan.issues.filter((i) => i.t === 'cycle').length;
      missing += plan.issues.filter((i) => i.t === 'missingNode').length;
      expect(plan.progress.total).toBe(plan.nodes.length);
    }
    const total = performance.now() - start;
    console.log(
      `resolved ${goals.length} goals in ${total.toFixed(0)} ms (mean ${(total / goals.length).toFixed(2)} ms) · slowest ${slowest.ms.toFixed(1)} ms ${slowest.goal} · largest plan ${largest.nodes} nodes ${largest.goal} · cycle issues ${cycles} · missing-node issues ${missing}`,
    );
    expect(total / goals.length).toBeLessThan(50);
    expect(slowest.ms).toBeLessThan(250);
  });

  it('every plan is ordered: prerequisites come before dependants', () => {
    for (const preset of engine.catalog) {
      const plan = engine.resolve(preset.goal, character);
      const position = new Map(plan.nodes.map((n, index) => [n.key, index]));
      for (const node of plan.nodes) {
        for (const dependency of node.dependsOn) {
          expect(position.get(dependency)).toBeLessThan(position.get(node.key) ?? -1);
        }
      }
      expect(plan.nodes.length).toBeGreaterThan(0);
    }
  });

  it('ticking the goal of a catalog plan completes the mandatory part of the plan', () => {
    for (const preset of engine.catalog) {
      const [root] = engine.itemSources(preset.goal.itemId);
      if (!root) continue;
      const id = Number(root.slice(2));
      const done: Character = root.startsWith('q:')
        ? { ...character, doneQuests: [id] }
        : { ...character, doneAchievements: [id] };
      const plan = engine.resolve(preset.goal, done);
      expect(plan.nodes.at(-1)?.status).toBe('done');
      expect(
        plan.nextActions.every(
          (key) => plan.nodes.find((n) => n.key === key)?.status === 'available',
        ),
      ).toBe(true);
    }
  });
});
