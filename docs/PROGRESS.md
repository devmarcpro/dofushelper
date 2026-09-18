# PROGRESS — mémoire du projet

Mis à jour à chaque arrêt d'étape. Feuille de route : `docs/prompts/M0_M1.md`.

## Étape en cours

**M0-1 — Socle du dépôt : terminée**, en attente de « suite » (prochaine étape : M0-2 CI et déploiement).

## Étapes

- [x] P0 — Lecture critique · 2026-09-18 · livrée en session, sans fichier
- [x] M0-1 — Socle du dépôt · 2026-09-18 · commits `558eaf2` → `README/PROGRESS` (voir `git log`)
- [ ] M0-2 — CI et déploiement GitHub Pages
- [ ] M1-1 — Exploration de l'API DofusDB (60 requêtes max)
- [ ] M1-2 — Client de snapshot (arrêt après `--dry-run` tant que l'accord DofusDB n'est pas reçu)
- [ ] M1-3 — Parseur syntaxique des critères (sans réseau)
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

## Questions en attente (posées en P0, sans réponse)

1. Format final du dataset : `Requirement` compilé au build (recommandé) ou AST au runtime ? Tranche avant M1-4.
2. SPEC §6.2 : un chemin traversant un `not` ne crée jamais d'arête. À confirmer.
3. `BT=1` → `{ t: 'all', of: [] }`. À confirmer.
4. `hasItem` : jamais bloquant, seulement un besoin. À confirmer.
5. Snapshot phase A : table explicite « items de type Dofus ». À confirmer avant M1-2.
6. Motifs d'URL du site dofusdb.fr (§2.6) : vérifiés par Marc dans son navigateur ?
7. Contrôle visuel de la page à 380 px : à faire par Marc (`npm run dev`), l'agent n'a pas de navigateur.

## Notes de reprise

- Environnement : Windows 11, Node 24.14, npm 11.11, git 2.52. Le dossier local s'appelle « dofus helper » ; le dépôt GitHub s'appelle `dofushelper` (base Vite de M0-2 : `/dofushelper/`).
- `npm run typecheck && npm run lint && npm test && npm run build` : tous verts au 2026-09-18.
- Les scripts `data:*` sortent en code 1 avec « pas encore implémenté (jalon M1) ».
- Aucun `git push` n'a été fait : le dépôt distant est vide.
