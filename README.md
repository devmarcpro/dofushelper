# Roadbook (nom provisoire)

Site compagnon pour **Dofus 3**, 100 % statique. Tu choisis un objectif (un Dofus, un succès, une quête), tu coches ce que tu as déjà fait, le site calcule la marche à suivre : quêtes dans l'ordre, conditions, objets à réunir, monstres et donjons à prévoir, prochaine action.

Aucune interaction avec le jeu, aucun compte : la progression est saisie à la main et reste dans ton navigateur. Les données de jeu viennent d'un snapshot [DofusDB](https://dofusdb.fr) compilé hors ligne.

Dofus est une marque d'Ankama. Site non officiel, sans lien avec Ankama.

## Commandes

```bash
npm install
npm run dev            # serveur de dev
npm run build          # build de production
npm run preview        # sert le build
npm test               # Vitest (une passe)
npm run test:watch
npm run typecheck
npm run lint
npm run format

npm run data:snapshot  # DofusDB → data/raw/<gameVersion>/   (jalon M1)
npm run data:build     # data/raw + data/overrides → public/data/
npm run data:report    # couverture des critères, incohérences, tailles
npm run data:fixture -- --goal item:<id>
```

Node ≥ 20 (voir `.nvmrc`).

## Documentation

Tout est dans [`docs/`](docs/) : [`SPEC.md`](docs/SPEC.md) (fonctionnel, moteur, jalons), [`DATA_SOURCES.md`](docs/DATA_SOURCES.md) (API DofusDB, grammaire des critères, pipeline), [`PROGRESS.md`](docs/PROGRESS.md) (état du projet), [`prompts/`](docs/prompts/) (feuille de route). Le cadre de travail est dans [`CLAUDE.md`](CLAUDE.md).
