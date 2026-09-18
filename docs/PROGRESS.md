# PROGRESS — mémoire du projet

Mis à jour à chaque arrêt d'étape. Feuille de route : `docs/prompts/M0_M1.md`.

## Étape en cours

**M1-1 — Exploration DofusDB : en cours.** Plan des requêtes dans `scripts/explore/plan.md`, script `scripts/explore/explore.ts`. Exécution en mode boucle (carte blanche de Marc), 60 requêtes au plus.

## Étapes

- [x] P0 — Lecture critique · 2026-09-18 · livrée en session, sans fichier
- [x] M0-1 — Socle du dépôt · 2026-09-18 · commits `558eaf2` → `README/PROGRESS` (voir `git log`)
- [x] M0-2 — CI et déploiement GitHub Pages · 2026-09-18 · commit `5105a3c`
- [ ] M1-1 — Exploration de l'API DofusDB (60 requêtes max)
- [ ] M1-2 — Client de snapshot (arrêt après `--dry-run` tant que l'accord DofusDB n'est pas reçu)
- [x] M1-3 — Parseur syntaxique des critères (sans réseau) · 2026-09-18 · commit `5a6ba9d`
- [ ] M1-4 — Compilation v0 et rapport
- [ ] M1-5 — Tranches verticales et fixtures
- [ ] Revue de fin de jalon M0, puis M1

## Décisions de Marc

- Nom : Roadbook (provisoire) · UI : Preact + signals · hébergement : GitHub Pages · dataset versionné dans git : oui.
- Dépôt : https://github.com/devmarcpro/dofushelper (remote `origin`, branche `main`, jamais poussé par l'agent).
- Accord de l'équipe DofusDB : pas encore reçu. M1-2 s'arrête après le `--dry-run`.
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

## Notes de reprise

- Environnement : Windows 11, Node 24.14, npm 11.11, git 2.52. Le dossier local s'appelle « dofus helper » ; le dépôt GitHub s'appelle `dofushelper` (base Vite de M0-2 : `/dofushelper/`).
- `npm run typecheck && npm run lint && npm test && npm run build` : tous verts au 2026-09-18.
- Les scripts `data:*` sortent en code 1 avec « pas encore implémenté (jalon M1) ».
- Aucun `git push` n'a été fait : le dépôt distant est vide.
