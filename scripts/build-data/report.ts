/**
 * npm run data:report — docs/reports/data-report-<gameVersion>.md
 * Criteria coverage per source, objective types, orphan references, file weights (M1-4).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { buildGraph } from '../../src/core/graph';
import { compileDataset } from './compile';
import {
  citedIds,
  computeCriteriaStats,
  parsedShare,
  type CriteriaStats,
  type CriterionSample,
} from './criteria-stats';
import { OBJECTIVE_KINDS } from './objective-types';
import { BuildError, findSnapshot, loadOverrides, loadSnapshot } from './raw';

const DATA_DIR = path.join('public', 'data');
const REPORT_DIR = path.join('docs', 'reports');
/** SPEC §11: what is needed for a first plan should stay under 1.5 MB gzip. */
const GZIP_TARGET = 1_500_000;

type Obj = Record<string, unknown>;
const asObj = (v: unknown): Obj | undefined =>
  v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : undefined;
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

const pct = (share: number): string => `${(share * 100).toFixed(2)} %`;
const code = (raw: string): string => `\`${raw.replaceAll('|', '\\|')}\``;
const sortedEntries = (map: Map<string, number>): [string, number][] =>
  [...map].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

function criteriaSection(title: string, stats: CriteriaStats): string[] {
  const lines = [`### ${title}`, ''];
  const nonEmpty = stats.total - stats.empty;
  lines.push(
    `- Total : **${stats.total}** (dont ${stats.empty} vides) · analysés sans erreur : **${stats.parsed} / ${nonEmpty}** (${pct(parsedShare(stats))})`,
    `- Arguments par atome : jusqu'à ${stats.maxArgs} · atomes avec un argument alphabétique : ${stats.identifierArgs}`,
    `- Précédence mélangée (\`&\` et \`|\` au même niveau) : **${stats.mixedPrecedence.length}**`,
    '',
  );
  if (stats.byKey.size > 0) {
    lines.push('| Clé | Occurrences | Dans la table §4 |', '|---|---:|---|');
    for (const [key, count] of sortedEntries(stats.byKey)) {
      lines.push(`| \`${key}\` | ${count} | ${stats.unknownKeys.has(key) ? '**non**' : 'oui'} |`);
    }
    lines.push(
      '',
      `Opérateurs : ${sortedEntries(stats.byOp)
        .map(([op, n]) => `\`${op}\` ${n}`)
        .join(' · ')}`,
      '',
    );
  }
  if (stats.unknownKeys.size > 0) {
    lines.push(
      'Clés absentes de la table de DATA_SOURCES §4 :',
      '',
      '| Clé | Occ. | Exemples |',
      '|---|---:|---|',
    );
    for (const [key, entry] of [...stats.unknownKeys].sort(
      (a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]),
    )) {
      lines.push(`| \`${key}\` | ${entry.count} | ${entry.examples.map(code).join(' · ')} |`);
    }
    lines.push('');
  }
  if (stats.failed.length > 0) {
    lines.push(
      `Échecs d'analyse (${stats.failed.length}, 15 premiers) :`,
      '',
      '| Porteur | Critère | Position | Attendu | Trouvé |',
      '|---|---|---:|---|---|',
    );
    for (const f of stats.failed.slice(0, 15)) {
      lines.push(
        `| ${f.owner} | ${code(f.raw.slice(0, 80))} | ${f.error.pos} | ${f.error.expected} | \`${f.error.found}\` |`,
      );
    }
    lines.push('');
  }
  if (stats.mixedPrecedence.length > 0) {
    lines.push('Critères à précédence mélangée (10 premiers) :', '');
    for (const s of stats.mixedPrecedence.slice(0, 10))
      lines.push(`- ${s.owner} : ${code(s.raw.slice(0, 160))}`);
    lines.push('');
  }
  lines.push('Les 10 critères les plus longs :', '');
  for (const s of stats.longest)
    lines.push(
      `- ${s.owner} (${s.raw.length} car.) : ${code(s.raw.slice(0, 120))}${s.raw.length > 120 ? '…' : ''}`,
    );
  lines.push('');
  return lines;
}

async function main(): Promise<void> {
  const versionIndex = process.argv.indexOf('--version');
  const { dir, manifest } = await findSnapshot(
    versionIndex >= 0 ? (process.argv[versionIndex + 1] ?? null) : null,
  );
  const raw = await loadSnapshot(dir, manifest);
  const { dataset, errors, warnings, obsoleteOverrides } = compileDataset(
    raw,
    await loadOverrides(),
    'fr',
  );

  // ---------- Criteria samples per source ----------
  const questStart: CriterionSample[] = dataset.quests.map((q) => ({
    raw: q.start.raw,
    owner: `quête ${q.id}`,
  }));
  const achievementObjectives: CriterionSample[] = dataset.achievements.flatMap((a) =>
    a.objectives.map((o) => ({ raw: o.criterion.raw, owner: `succès ${a.id}, objectif ${o.id}` })),
  );
  const itemCriteria: CriterionSample[] = dataset.items.flatMap((i) =>
    i.criterion ? [{ raw: i.criterion.raw, owner: `objet ${i.id}` }] : [],
  );
  const rewardCriteria: CriterionSample[] = (raw.tables.achievements ?? []).flatMap((a) =>
    asArray(asObj(a)?.rewards).flatMap((r) => {
      const c = asObj(r)?.criterions;
      return typeof c === 'string' && c.length > 0
        ? [{ raw: c, owner: `succès ${String(asObj(a)?.id)}, récompense ${String(asObj(r)?.id)}` }]
        : [];
    }),
  );

  const statsQuest = computeCriteriaStats(questStart);
  const lines: string[] = [
    `# Rapport de données — version ${raw.gameVersion}`,
    '',
    'Produit par `npm run data:report` à partir du snapshot brut et du dataset compilé. Données issues de DofusDB. Utilisation soumise à la LPNC-IA 1.0.',
    '',
    '## 1. Volumes',
    '',
    `Quêtes ${dataset.quests.length} · succès ${dataset.achievements.length} · objets ${dataset.items.length} · monstres ${dataset.monsters.length} · donjons ${dataset.dungeons.length} · PNJ ${dataset.refs.npcs.length} · objectifs au catalogue ${dataset.goals.length}.`,
    '',
    '## 2. Critères par source',
    '',
    ...criteriaSection('2.1 Lancement de quête (`startCriterion`)', statsQuest),
    ...criteriaSection(
      '2.2 Objectifs de succès (`criterion`)',
      computeCriteriaStats(achievementObjectives),
    ),
    ...criteriaSection("2.3 Critères d'objet (`criterions`)", computeCriteriaStats(itemCriteria)),
    ...criteriaSection(
      '2.4 Conditions des récompenses de succès (`criterions`)',
      computeCriteriaStats(rewardCriteria),
    ),
  ];

  // ---------- Objective types ----------
  const typeNames = new Map(dataset.refs.objectiveTypes.map((t) => [t.id, t.name]));
  const typeCounts = new Map<number, number>();
  let objectiveTotal = 0;
  for (const q of raw.tables.quests ?? []) {
    for (const s of asArray(asObj(q)?.steps)) {
      for (const o of asArray(asObj(s)?.objectives)) {
        const typeId = asObj(o)?.typeId;
        if (typeof typeId !== 'number') continue;
        typeCounts.set(typeId, (typeCounts.get(typeId) ?? 0) + 1);
        objectiveTotal += 1;
      }
    }
  }
  let mapped = 0;
  lines.push(
    "## 3. Types d'objectifs de quête",
    '',
    '| typeId | Libellé | Occurrences | Compilé en |',
    '|---:|---|---:|---|',
  );
  for (const [typeId, count] of [...typeCounts].sort((a, b) => b[1] - a[1])) {
    const kind = OBJECTIVE_KINDS[typeId];
    if (kind) mapped += count;
    lines.push(
      `| ${typeId} | ${typeNames.get(typeId) ?? '?'} | ${count} | ${kind ? `\`${kind}\`` : '`other`'} |`,
    );
  }
  lines.push(
    '',
    `Objectifs : **${objectiveTotal}** · part typée : **${pct(objectiveTotal === 0 ? 1 : mapped / objectiveTotal)}** (le reste est compilé en \`other\` avec son texte).`,
    '',
  );

  // ---------- Orphan references ----------
  const questIds = new Set(dataset.quests.map((q) => q.id));
  const achievementIds = new Set(dataset.achievements.map((a) => a.id));
  const itemIds = new Set(dataset.items.map((i) => i.id));
  const monsterIds = new Set(dataset.monsters.map((m) => m.id));
  const npcIds = new Set(dataset.refs.npcs.map((n) => n.id));
  const cited = citedIds([...questStart, ...achievementObjectives]);
  const orphans: string[] = [];
  for (const [id, owner] of cited.quests)
    if (!questIds.has(id)) orphans.push(`quête ${id} (citée par ${owner})`);
  for (const [id, owner] of cited.achievements)
    if (!achievementIds.has(id)) orphans.push(`succès ${id} (cité par ${owner})`);
  const missing = {
    items: new Set<number>(),
    monsters: new Set<number>(),
    npcs: new Set<number>(),
  };
  for (const q of dataset.quests) {
    for (const item of q.rewards.items)
      if (!itemIds.has(item.itemId)) missing.items.add(item.itemId);
    for (const s of q.steps) {
      for (const o of s.objectives) {
        if ('itemId' in o && o.itemId > 0 && !itemIds.has(o.itemId)) missing.items.add(o.itemId);
        if ('monsterId' in o && o.monsterId > 0 && !monsterIds.has(o.monsterId))
          missing.monsters.add(o.monsterId);
        if ('npcId' in o && o.npcId !== null && o.npcId > 0 && !npcIds.has(o.npcId))
          missing.npcs.add(o.npcId);
      }
    }
  }
  for (const a of dataset.achievements)
    for (const item of a.rewards.items)
      if (!itemIds.has(item.itemId)) missing.items.add(item.itemId);
  const missingObjectives = dataset.achievements.reduce(
    (n, a) => n + a.missingObjectiveIds.length,
    0,
  );
  const list = (set: Set<number>): string =>
    set.size === 0
      ? 'aucun'
      : `${set.size} (${[...set]
          .sort((a, b) => a - b)
          .slice(0, 12)
          .join(', ')}${set.size > 12 ? ', …' : ''})`;
  lines.push(
    '## 4. Références orphelines (ID cité, absent du snapshot)',
    '',
    `- Quêtes et succès cités par des critères : ${orphans.length === 0 ? 'aucun' : `${orphans.length}`}`,
    ...orphans.slice(0, 25).map((o) => `  - ${o}`),
    `- Objets : ${list(missing.items)}`,
    `- Monstres : ${list(missing.monsters)}`,
    `- PNJ : ${list(missing.npcs)}`,
    `- Objectifs de succès listés mais absents en amont : ${missingObjectives}`,
    '',
  );

  // ---------- Oracle: DofusDB's `need` aggregate vs our direct prerequisites ----------
  const graph = buildGraph(dataset);
  const oracle = { compared: 0, equal: 0, oursOnly: 0, theirsOnly: 0, examples: [] as string[] };
  const compareNeed = (
    key: `q:${number}` | `a:${number}`,
    label: string,
    need: { quests: number[]; achievements: number[] } | null,
  ): void => {
    const node = graph.nodes.get(key);
    if (!node || !need) return;
    const ours = new Set<string>([...node.mandatory, ...node.alternative]);
    const theirs = new Set<string>([
      ...need.quests.map((id) => `q:${id}`),
      ...need.achievements.map((id) => `a:${id}`),
    ]);
    if (ours.size === 0 && theirs.size === 0) return;
    oracle.compared += 1;
    const oursOnly = [...ours].filter((k) => !theirs.has(k));
    const theirsOnly = [...theirs].filter((k) => !ours.has(k));
    if (oursOnly.length === 0 && theirsOnly.length === 0) {
      oracle.equal += 1;
      return;
    }
    if (oursOnly.length > 0) oracle.oursOnly += 1;
    if (theirsOnly.length > 0) oracle.theirsOnly += 1;
    if (oracle.examples.length < 12) {
      oracle.examples.push(
        `${label} : chez nous seulement [${oursOnly.slice(0, 6).join(', ')}] · chez DofusDB seulement [${theirsOnly.slice(0, 6).join(', ')}]`,
      );
    }
  };
  for (const q of dataset.quests) compareNeed(`q:${q.id}`, `quête ${q.id}`, q.dbNeed);
  for (const a of dataset.achievements) compareNeed(`a:${a.id}`, `succès ${a.id}`, a.dbNeed);
  lines.push(
    '## 5. Oracle `need` de DofusDB',
    '',
    'Comparaison, nœud par nœud, entre nos prérequis directs (arêtes obligatoires et alternatives du graphe) et les listes `need.quests` / `need.achievements` précalculées par DofusDB.',
    '',
    `- Nœuds comparés (au moins un prérequis d'un côté) : **${oracle.compared}**`,
    `- Identiques : **${oracle.equal}** (${pct(oracle.compared === 0 ? 1 : oracle.equal / oracle.compared)})`,
    `- Avec des prérequis chez nous seulement : ${oracle.oursOnly} · chez DofusDB seulement : ${oracle.theirsOnly}`,
    '',
    ...oracle.examples.map((e) => `- ${e}`),
    '',
  );

  // ---------- Warnings, overrides ----------
  lines.push('## 6. Avertissements de compilation', '');
  if (errors.length + warnings.length === 0) lines.push('Aucun.', '');
  for (const e of errors) lines.push(`- **ERREUR** ${e}`);
  for (const w of warnings) lines.push(`- ${w}`);
  lines.push('');

  lines.push('## 6 bis. Overrides devenus inutiles', '');
  if (obsoleteOverrides.length === 0) lines.push('Aucun.', '');
  else lines.push(...obsoleteOverrides.map((o) => `- ${o}`), '');

  // ---------- File weights ----------
  lines.push(
    '## 7. Poids des fichiers de `public/data/`',
    '',
    '| Fichier | Brut (octets) | gzip (octets) |',
    '|---|---:|---:|',
  );
  let rawTotal = 0;
  let gzipTotal = 0;
  try {
    const datasetManifest = JSON.parse(
      await readFile(path.join(DATA_DIR, 'manifest.json'), 'utf8'),
    ) as { files: { file: string }[] };
    for (const { file } of datasetManifest.files) {
      const body = await readFile(path.join(DATA_DIR, file));
      const gz = gzipSync(body, { level: 9 }).length;
      rawTotal += body.length;
      gzipTotal += gz;
      lines.push(`| ${file} | ${body.length} | ${gz} |`);
    }
    lines.push(
      `| **Total** | **${rawTotal}** | **${gzipTotal}** |`,
      '',
      `Cible SPEC §11 : ≤ ${GZIP_TARGET} octets gzip pour le premier plan → **${gzipTotal <= GZIP_TARGET ? 'respectée' : 'DÉPASSÉE'}** (${pct(gzipTotal / GZIP_TARGET)} de la cible, tous fichiers confondus).`,
      '',
    );
  } catch {
    lines.push('| (public/data/manifest.json absent : lance `npm run data:build`) | | |', '');
  }

  await mkdir(REPORT_DIR, { recursive: true });
  const out = path.join(REPORT_DIR, `data-report-${raw.gameVersion}.md`);
  await writeFile(out, `${lines.join('\n')}\n`);
  console.log(`Rapport écrit : ${out}`);
  console.log(
    `Critères de lancement analysés sans erreur : ${pct(parsedShare(statsQuest))} (${statsQuest.parsed}/${statsQuest.total - statsQuest.empty})`,
  );
}

main().catch((error: unknown) => {
  if (error instanceof BuildError) console.error(`ÉCHEC data:report — ${error.message}`);
  else console.error(error);
  process.exitCode = 1;
});
