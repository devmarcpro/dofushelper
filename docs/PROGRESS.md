# PROGRESS — mémoire du projet

Mis à jour à chaque arrêt d'étape. Feuille de route : `docs/prompts/M0_M1.md`.

## Étape en cours

**Jalon M2 terminé (2026-09-19).** Moteur complet dans `src/core` : critères → `Requirement`, graphe, progression effective, résolution avec points de choix, besoins et conditions, façade `createEngine`. Dataset au format 1. Prochaine étape : **M3 (interface MVP)**, feuille de route `docs/prompts/M3.md`, étape M3-2 (dataset, routeur, coquille) ; M3-1 terminée. Tout est poussé sur `origin/main` ; la CI GitHub est verte ; `deploy` attend que Marc active Pages (Settings → Pages → Source « GitHub Actions »).

## Étapes

- [x] P0 — Lecture critique · 2026-09-18 · livrée en session, sans fichier
- [x] M0-1 — Socle du dépôt · 2026-09-18 · commits `558eaf2` → `README/PROGRESS` (voir `git log`)
- [x] M0-2 — CI et déploiement GitHub Pages · 2026-09-18 · commit `5105a3c`
- [x] M1-1 — Exploration de l'API DofusDB (60 requêtes max) · 2026-09-18 · 56 requêtes · `DATA_NOTES.md` v0.1
- [x] M1-2 — Client de snapshot · 2026-09-19 · commits `4e72b59` et suivant · snapshot `3.6.11.15`
- [x] M1-3 — Parseur syntaxique des critères (sans réseau) · 2026-09-18 · commit `5a6ba9d`
- [x] M1-4 — Compilation v0 et rapport · 2026-09-19 · commits `70b9a26`, `14419ae` · 100 % des critères analysés, dataset 835 Ko gzip
- [x] M1-5 — Tranches verticales et fixtures · 2026-09-19 · Dotruche (5 nœuds), quête 1329, Dofus des Glaces (50 nœuds)
- [x] Revue de fin de jalon M0 et M1 · 2026-09-19 · M1 : 4 critères sur 4 ; M0 : CI à constater après le push
- [x] M2-1 — Étage sémantique du parseur (`toRequirement`) · 2026-09-19 · 20 vecteurs réels avec attendus écrits à la main
- [x] M2-2 — Graphe et progression effective · 2026-09-19 · 1329 : 28 arêtes obligatoires, 3 alternatives, exclusions sans arête
- [x] M2-3 — Résolution, points de choix, ordonnancement · 2026-09-19 · 1329 : Bonta → 710, Brâkmar → 711, neutre → 1316 ; ordre stable
- [x] M2-4 — Besoins et conditions · 2026-09-19 · simulation d'inventaire, tranches de niveau, monstres, donjons, conditions
- [x] M2-5 — Intégration au dataset et test de fumée · 2026-09-19 · 4 781 objectifs résolus, buildGraph 56 ms, resolve 0,28 ms en moyenne, oracle `need` identique à 92 %
- [x] Revue de fin de jalon M2 · 2026-09-19 · 5 critères sur 5 (SPEC §12)
- [x] M3-1 — État, persistance, migrations, export/import, undo (`src/state`) · 2026-09-19 · pur, testé sans DOM
- [ ] M3-2 — Chargement du dataset, routeur, coquille de l'application
- [ ] M3-3 — Personnages et catalogue d'objectifs
- [ ] M3-4 — Écran plan : marche à suivre et choix
- [ ] M3-5 — Écran plan : à réunir et conditions ; fiche quête/succès
- [ ] M3-6 — Accessibilité, 380 px, poids du JS, frontière d'erreur
- [ ] Revue de fin de jalon M3

## Décisions de Marc

- Nom : Roadbook (provisoire) · UI : Preact + signals · hébergement : GitHub Pages · dataset versionné dans git : oui.
- Dépôt : https://github.com/devmarcpro/dofushelper (remote `origin`, branche `main`, jamais poussé par l'agent).
- Accord de l'équipe DofusDB : **reçu, confirmé par Marc le 2026-09-19** (« j'ai l'accord, tout est bon »), licence LPNC-IA comprise. Le snapshot complet est autorisé.
- Adresse de contact pour les en-têtes HTTP : à demander au début de M1-1.

## Décisions techniques prises en M0-1

- TypeScript 5.9.3 (la 7.x est refusée par typescript-eslint `<6.1`). Vite 8, Vitest 5, ESLint 10.
- Pas de `@preact/preset-vite` : JSX via `jsxImportSource` dans `tsconfig.json`, zéro plugin.
- Garde-fous `src/core` : règle ESLint locale `core/imports-only-core` (résout chaque import et refuse tout ce qui sort de `src/core`, paquets compris) + `no-restricted-globals` + `no-restricted-syntax` (`Date.now()`, `new Date()` sans argument, `Math.random()`). Preuve : `tests/eslint-guard.test.ts`.
- Prettier ignore `*.md` : les documents normatifs ne sont jamais reformatés par l'outillage.
- `.nvmrc` = 24 (version installée chez Marc, Windows). Fins de ligne forcées en LF (`.gitattributes`).

## Décisions techniques prises en M0-2

- Actions officielles épinglées par SHA (checkout v7, setup-node v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5). `actionlint` absent de la machine : relecture manuelle.
- `deploy` se déclenche par `workflow_run` de `ci` réussie sur `main`, et rebuild le commit `head_sha` validé.
- Base Vite `/dofushelper/` (variable `VITE_BASE` pour la surcharger). Preuve : `vite preview` répond 200 sur `/dofushelper/`, ses assets et `/dofushelper/data/`.
- Réglages GitHub à faire par Marc : voir README « Déploiement ». Le premier `git push` reste à faire par Marc.

## Décisions techniques prises en M1-3

- `src/core/result.ts` : type `Result` partagé. `src/core/criteria/` : `ast.ts`, `parse.ts` (descente récursive, jamais d'exception), `print.ts`, `index.ts`.
- Forme canonique de `printCriterion` : tout groupe non-atome est parenthésé ; l'aller-retour parse→print→parse est prouvé sur les 20 vecteurs réels.
- Grammaire stricte : entiers non signés seulement, pas d'espace. Un `-` ou un espace produit une `ParseError` que `data:report` remontera (M1-4).
- `hasMixedPrecedence` est purement lexical (fonctionne aussi sur une chaîne qui ne parse pas).
- Couverture `src/core/criteria` : 97 % instructions, 100 % lignes (`npm run test:coverage`, devDependency `@vitest/coverage-v8` 5.0.1).

## Décisions prises sous carte blanche (Marc, 2026-09-18 : « à toi de trancher »)

1. Dataset final : `Requirement` compilé au build, chaîne brute conservée. M1-4 stocke `startRaw` + `startAst` ; M2 remplace l'AST par `start`.
2. SPEC §6.2 : un chemin traversant un `not` ne crée jamais d'arête.
3. `BT=1` → `{ t: 'all', of: [] }`.
4. `hasItem` jamais bloquant : besoin seulement. Retrait de `BlockReason.item` à proposer en M2.
5. Snapshot phase A : table explicite des objets de type « Dofus » filtrée par `typeId`.
6. Motifs d'URL de dofusdb.fr : restent ⚠️ tant que Marc ne les a pas vérifiés dans son navigateur ; aucun lien généré avant.
7. Contact des en-têtes HTTP : `https://github.com/devmarcpro/dofushelper/issues` (jamais l'adresse mail de Marc sans demande explicite).
8. TypeScript 5.9 conservé.

Restent à Marc : contrôle visuel à 380 px, premier `git push`, réglages GitHub Pages, accord de l'équipe DofusDB (bloque le snapshot complet M1-2).

## Décisions techniques prises en M1-2 (carte blanche)

- Parseur étendu avant M1-4 : arguments entiers **ou identifiants**, en nombre quelconque (`EM>147,0,d`). `CriterionAtom.args` devient `(number | string)[]` : écart assumé avec SPEC §6.1, à reporter dans la SPEC par Marc.
- Snapshot : quêtes et succès téléchargés avec leurs objets embarqués (96 pages au lieu de ~700). Phase B par lots `id[$in][]` de 50 : objets, recettes (`hasRecipe`), ingrédients, monstres (objectifs, critères `EM`, donjons, drops des objets), PNJ, sous-zones.
- Le type « Dofus » est résolu à l'exécution dans `item-types` (`name.fr === 'Dofus'`), jamais écrit en dur.
- `--only` écrit `snapshot.partial.json` ; seul un run complet écrit `snapshot.json`. `--refresh` reconstruit depuis le cache.
- Table `scripts/build-data/objective-types.ts` : position des ids dans les paramètres d'objectifs, tirée de DATA_NOTES §4.
- Attribution LPNC-IA ajoutée au pied de page et au README. **Reste à Marc : choisir une licence de dépôt compatible (non commerciale, partage à l'identique).**

## Décisions techniques prises en M1-4 et M1-5 (carte blanche)

- Dataset v0 : chaque critère est stocké brut + AST (`{ raw, ast, error? }`). Types dans `src/core/types.ts` et `src/core/dataset.ts`. Sortie déterministe (`stable-json.ts`), validation de schéma maison (`validate.ts`), sans dépendance.
- Récompenses d'étape fusionnées en tranches de niveau (`rewardBands`) ; la récompense de quête agrège le maximum par objet.
- `isQuestItem` = super-type « Objet de quête », résolu par nom dans `item-super-types`, surchargeable par `data/overrides/items.json`.
- `data/overrides/*.json` créés vides ; `data:build` échoue si un override vise un id absent ou n'a pas `reason` et `source`.
- `data:fixture` lit `public/data/` ; `--catalog` imprime le tableau des plans. Fermeture des prérequis dans `scripts/build-data/subgraph.ts` (provisoire : le vrai graphe arrive en M2 dans `src/core`).
- Écarts assumés avec la SPEC, listés dans `DATA_NOTES.md` §13 et §16 : **Marc doit les reporter dans `docs/SPEC.md`** (l'agent ne modifie pas la SPEC).

## Décisions du 2026-09-19 (carte blanche réaffirmée : « c'est à toi de trancher »)

Marc ne veut plus de questions en fin de tour : l'agent décide, agit et consigne ici ; Marc peut tout renverser après coup.

1. **Licence du dépôt** : `LICENSE.md`. Données sous LPNC-IA 1.0 (DofusDB), code et documentation sous CC BY-NC-SA 4.0, pour rester non commercial et en partage à l'identique.
2. **`git push`** : délégué à l'agent. Premier push de `main` vers `origin`. Les réglages GitHub Pages (README « Déploiement ») restent manuels côté Marc, l'agent n'y a pas accès.
3. **Quêtes événementielles et répétables** : conservées dans les plans qui les exigent, jamais proposées au catalogue, masquées par défaut dans la saisie en masse (M4).
4. **Feuille de route M2** : `docs/prompts/M2.md`, cinq étapes puis revue.
5. **Nettoyage de la revue M1** : `scripts/not-implemented.mjs` supprimé, README mis à jour. Le niveau des monstres (`grades`) sera ajouté au snapshot quand M2-4 en aura besoin.
6. **SPEC** : l'agent ne la modifie toujours pas ; les écarts sont dans `DATA_NOTES.md` §13 et §16.

## Notes de reprise

- Environnement : Windows 11, Node 24.14, npm 11.11, git 2.52. Dossier local « dofus helper », dépôt GitHub `dofushelper` (base Vite `/dofushelper/`).
- `npm run typecheck && npm run lint && npm test && npm run build` : verts au 2026-09-19 (151 tests).
- Snapshot brut `data/raw/3.6.11.15/` (165 Mo, gitignored). `npm run data:build` puis `npm run data:report` le recompilent sans réseau. `npm run data:snapshot` ne refait qu'un appel à `/version` tant que la version du jeu ne change pas.
- Dataset compilé versionné dans `public/data/` ; rapport dans `docs/reports/data-report-3.6.11.15.md`.
- Aucun `git push` n'a été fait. Restent à Marc : premier push, réglages GitHub Pages, contrôle visuel à 380 px, licence du dépôt compatible LPNC-IA, vérification des URL du site DofusDB, report des propositions dans la SPEC.
