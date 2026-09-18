# CLAUDE.md — Roadbook (nom de code provisoire)

> Lu automatiquement par Claude Code à chaque session. Ce fichier fixe le cadre ; le détail est dans `docs/`.
> Emplacement : racine du dépôt. `SPEC.md` et `DATA_SOURCES.md` vont dans `docs/`.

## Le projet en 5 lignes

Site web compagnon pour **Dofus 3 (Unity)**, développé en solo par Marc.
Le joueur choisit un **objectif** (ex. « obtenir tel Dofus », « finir tel succès »), **coche ce qu'il a déjà fait**, et le site calcule la **marche à suivre** : quêtes dans l'ordre, conditions (niveau, métiers, alignement), objets à réunir, monstres et donjons à prévoir, prochaine action disponible.
Il n'y a **aucune synchronisation automatique avec le jeu** : la progression est saisie à la main, mais la saisie doit être très rapide (cocher une quête marque ses prérequis comme faits).
Site **100 % statique** : données de jeu embarquées sous forme de snapshot, progression stockée dans le navigateur.

## À lire avant de coder

0. `docs/PROGRESS.md` **s'il existe** — où en est le projet. À lire en premier, à chaque session.
1. `docs/SPEC.md` — fonctionnel, modèle de domaine, moteur, UI, jalons. **Normatif.**
2. `docs/DATA_SOURCES.md` — API DofusDB, grammaire des critères, étiquette réseau, pipeline snapshot.
3. `docs/DATA_NOTES.md` — ton carnet de bord sur les données réelles. À créer au jalon M1, à tenir à jour ensuite.

Dans ces documents, ✅ = vérifié, ⚠️ = hypothèse à vérifier sur les données réelles avant de s'appuyer dessus.

## Règles d'or (non négociables)

1. **Aucune interaction avec le jeu.** Pas de lecture du trafic réseau, de la mémoire ou des fichiers du client, pas de macro, pas d'overlay qui lit l'écran. Jamais d'identifiants Ankama. Pas de requêtes automatisées vers dofus.com.
2. **Pas de contenu éditorial copié.** Les soluces des fansites (textes, captures, cartes annotées) ne sont ni scrapées ni reformulées. On fait des **liens sortants**, c'est tout.
3. **Le site ne parle jamais à une API tierce au runtime.** Le navigateur ne charge que `public/data/*`. Seuls les scripts de `scripts/` appellent DofusDB, poliment (voir `DATA_SOURCES.md` §3).
4. **Ne jamais inventer de données de jeu.** Aucun ID, nom de quête, prérequis, quantité ou taux de drop « de mémoire ». Tout vient du snapshot ou de `data/overrides/`. Si l'information manque, le dire et l'afficher comme manquante. Les fixtures de test sont **extraites du snapshot réel** (`npm run data:fixture`) ; les cas synthétiques utilisent des IDs ≥ 9 000 000 et un nom préfixé `FAKE`.
5. **`src/core` est pur.** Zéro DOM, zéro `fetch`, zéro accès au stockage, zéro horloge implicite. Entrées → sorties. Tout y est testé.
6. **L'état dérivé n'est jamais stocké.** On persiste les faits saisis par le joueur (coches explicites, inventaire, choix) ; statuts, quêtes « déduites », agrégats et pourcentages sont recalculés.
7. **Une donnée inattendue ne fait jamais planter.** Critère inconnu, ID introuvable, cycle dans les prérequis → on dégrade proprement, on affiche le brut, on consigne un `DataIssue`.

## Stack (proposée — à valider par Marc, voir SPEC §13)

- TypeScript strict · Vite · Vitest · ESLint + Prettier · Node ≥ 20 (`.nvmrc`)
- UI : Preact + `@preact/signals`, CSS natif (custom properties), mobile-first, routeur hash minimal
- Scripts de données : TypeScript exécuté avec `tsx`, `fetch` natif
- Hébergement statique (GitHub Pages ou Cloudflare Pages) · CI GitHub Actions : lint + typecheck + tests + build
- Pas de backend, pas de comptes, pas d'analytics au MVP

## Commandes

```bash
npm run dev            # serveur de dev
npm run build          # build de production
npm run preview        # sert le build
npm test               # Vitest (une passe)
npm run test:watch
npm run typecheck
npm run lint
npm run format

npm run data:snapshot  # DofusDB → data/raw/<gameVersion>/   (réseau, lent, poli)
npm run data:build     # data/raw + data/overrides → public/data/
npm run data:report    # couverture des critères, incohérences, tailles
npm run data:fixture -- --goal item:<id>   # extrait un sous-graphe réel vers tests/fixtures/
```

## Arborescence cible

```
src/
  core/            # PUR : types, parseur de critères, graphe, résolveur, agrégats
  data/            # chargement du dataset compilé (fetch local, cache, validation)
  state/           # progression : store, persistance, migrations, export/import, undo
  ui/              # composants Preact, pages, routeur, strings.fr.ts
  styles/
scripts/
  explore/         # scripts jetables d'exploration de l'API (M1-1)
  snapshot/        # client DofusDB (pagination, throttle, cache disque, reprise)
  build-data/      # raw → dataset compilé (+ table des types d'objectifs)
data/
  raw/             # gitignored
  overrides/       # versionné : corrections et enrichissements manuels
public/data/       # dataset compilé + manifest.json
tests/fixtures/    # sous-graphes réels extraits + cas synthétiques FAKE
docs/              # SPEC, DATA_SOURCES, DATA_NOTES, prompts/ (prompts de jalons), reports/ (rapports de données par version)
```

Règle de dépendance : `core` n'importe rien d'autre ; `data` et `state` importent `core` ; `ui` importe tout ; `scripts` peut importer `core` (types et parseur partagés).

## Conventions

- `strict`, `noUncheckedIndexedAccess`, pas de `any` hors frontière JSON (et celle-ci est validée). Unions discriminées plutôt que classes. Parsing faillible → type `Result`, pas d'exception.
- Code, identifiants, commits : **anglais**. Textes d'interface : **français**, centralisés dans `src/ui/strings.fr.ts`. Docs : français.
- Commits conventionnels (`feat:`, `fix:`, `test:`, `data:`, `docs:`), petits, un sujet par commit.
- Tests d'abord pour le parseur de critères et le résolveur. Chaque bug corrigé dans `core` arrive avec son test.
- Accessibilité : cases à cocher natives, labels, focus visible, navigation clavier, contrastes AA.
- Dépendance runtime nouvelle → **demander avant**. Cible : JS initial ≤ 80 Ko gzip hors données.

## Protocole de pilotage

La feuille de route vit dans `docs/prompts/` (un fichier par groupe de jalons). Tu en exécutes les étapes **dans l'ordre, une seule à la fois**, en appliquant le texte de chaque bloc comme si Marc venait de te l'envoyer.

**Cycle d'une étape.**
1. Tu présentes ton plan (5–10 lignes : fichiers touchés, tests prévus, risques) et tu attends « go ».
2. Tu exécutes par petites étapes ; `npm run typecheck && npm test` au fil de l'eau.
3. Tu vérifies toi-même les critères de sortie et tu en montres la preuve (commande et résultat).
4. Tu commites, sans jamais pousser.
5. Tu mets à jour `docs/PROGRESS.md` et les docs impactées (⚠️ levés → ✅ datés dans `DATA_SOURCES.md`).
6. Tu t'arrêtes avec un résumé en trois blocs (fait / pas fait / questions) et tu attends « suite ».

**`docs/PROGRESS.md` est la mémoire du projet.** Créé au début de M0-1, mis à jour à chaque arrêt. Contenu : étape en cours et son état · liste des étapes avec cases cochées, date et commit · décisions de Marc · questions en attente · notes de reprise (10 lignes maximum). Marc doit pouvoir ouvrir une session neuve à tout moment, écrire « reprends », et que tu continues sans rien perdre.

**Mots-clés de Marc.** « go » : exécute le plan proposé · « suite » : présente le plan de l'étape suivante · « reprends » : lis `PROGRESS.md`, résume l'état en 5 lignes, propose la suite · « revue » : applique le bloc *Revue de fin de jalon* · « stop » : applique le bloc *Recadrage*.

**Arrête-toi et demande** — accord explicite obligatoire, même après un « go » : toute requête vers DofusDB (M1-1 : après validation de la liste des URL ; M1-2 : après le `--dry-run`, et premier snapshot complet seulement quand Marc confirme l'accord de l'équipe DofusDB) · volume de requêtes inhabituel · appel réseau vers autre chose que DofusDB/Dofusdude · quoi que ce soit qui ressemble à du scraping · nouvelle dépendance runtime · changement du modèle de domaine ou du format de stockage · modification de `docs/SPEC.md` (tu proposes, Marc tranche) · `git push` · ambiguïté fonctionnelle.

**Si les données réelles contredisent la spec** : ne bricole pas. Note le constat dans `docs/DATA_NOTES.md`, propose l'ajustement, puis continue sur ce qui n'est pas bloqué.

**Communication.** En français, court, pas de pavés. Questions numérotées et fermées, pour que Marc puisse répondre en une ligne (« 1 oui, 2 non, go »). Entre deux options : ta recommandation et une phrase de justification.

## Définition de « terminé »

- typecheck, lint et tests verts ; aucun test désactivé sans explication
- pas de `TODO` orphelin (un TODO référence une question de SPEC §13 ou une entrée de `DATA_NOTES.md`)
- vérifié sur un viewport de 380 px de large
- aucune requête réseau runtime hors `public/data/*`
- docs à jour

## Hors périmètre (ne pas proposer, ne pas implémenter)

Synchronisation automatique avec le jeu sous quelque forme que ce soit · connexion Ankama · scraping de dofus.com ou de fansites · copie de soluces · backend, comptes, synchro multi-appareils (jalon ultérieur dédié) · Dofus Rétro et Dofus Touch · builds/stuffs, HDV, élevage, chasses au trésor (d'autres outils le font déjà bien).
