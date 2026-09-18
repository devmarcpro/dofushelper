# DATA_SOURCES — d'où viennent les données et comment s'en servir

Version 0.1 — 18 septembre 2026 · Emplacement : `docs/DATA_SOURCES.md`

## 1. Légende et règle du jeu

- ✅ **vérifié** : lu dans le code ou les données d'un projet tiers qui utilise réellement l'API (source citée au §10).
- ⚠️ **à vérifier** : déduction raisonnable, jamais testée par nous. À lever au jalon M1 par un appel réel, puis à passer en ✅ avec la date au §10.
- L'API n'a pas été appelée pendant la rédaction de ce document. **Le premier travail de M1 est de confronter cette page à la réalité** et de consigner les écarts dans `docs/DATA_NOTES.md`.

## 2. DofusDB — source principale

Site : https://dofusdb.fr · Projet communautaire, non officiel. Données extraites du client Dofus 3.

### 2.1 Bases ✅

| Environnement | URL |
|---|---|
| Production | `https://api.dofusdb.fr` |
| Bêta du jeu | `https://api.beta.dofusdb.fr` (ne pas utiliser pour le dataset publié) |

API REST de type FeathersJS. Deux formes : `GET /<ressource>/<id>` (un objet) et `GET /<ressource>?…` (liste paginée).

Réponse de liste ✅ :

```json
{ "total": 1978, "limit": 50, "skip": 0, "data": [ { "id": 18, "name": { "fr": "…", "en": "…" } } ] }
```

Taille de page : **50** observé ✅ ; demander plus renvoie vraisemblablement 50 ⚠️. Les textes sont des objets multilingues `{ fr, en, es, de, pt }` ✅.

### 2.2 Syntaxe de requête ✅

| Besoin | Forme |
|---|---|
| Pagination | `$limit=50&$skip=100` |
| Champs | `$select[]=id&$select[]=name&$select[]=startCriterion` |
| Tri | `$sort[level]=1` (croissant) · `$sort[level]=-1` (décroissant) |
| Égalité | `typeId=<n>` · champ imbriqué : `name.fr=…` |
| Comparaison | `level[$gte]=50&level[$lte]=100` · `[$gt]` `[$lt]` `[$ne]` |
| Ensemble | `id[$in][]=1&id[$in][]=2` · `[$nin][]` |
| Logique | `$or[0][typeId]=1&$or[1][typeId]=2` · `$and[0]…` |

`$select` DOIT être utilisé partout : il divise le poids des réponses.

### 2.3 Endpoints vérifiés ✅

`version` · `criterion` · `quests` · `achievements` · `achievement-categories` · `achievement-objectives` · `achievement-rewards` · `items` · `item-types` · `item-super-types` · `item-sets` · `recipes` · `jobs` · `skills` · `monsters` · `monster-races` · `monster-super-races` · `dungeons` · `npcs` · `npc-messages` · `maps` · `map-positions` · `subareas` · `areas` · `super-areas` · `worlds` · `breeds` · `alignment-sides` · `alignment-ranks` · `titles` · `ornaments` · `challenges` · `servers` · `almanax-calendars` · `almanax`

### 2.4 Endpoints probables ⚠️ (détail des quêtes)

Noms déduits de la liste des types de ressources que l'API sait référencer (`Quests`, `QuestSteps`, `QuestObjectives`, `QuestStepRewards`, `QuestObjectiveTypes`, `QuestCategories`) :
`quest-steps` · `quest-objectives` · `quest-step-rewards` · `quest-objective-types` · `quest-categories`

À établir en M1 : ces routes existent-elles ? `GET /quests/<id>` embarque-t-il déjà étapes, objectifs et récompenses ? Si oui, préférer la forme qui coûte le moins de requêtes.

### 2.5 Champs utiles

**`quests`** — ✅ `id`, `name`, `startCriterion`, `levelMin`, `levelMax`, `isDungeonQuest` · ⚠️ probables : `stepIds`, `categoryId`, `repeatType`, `isPartyQuest`, `followable`.

**`achievements`** — ✅ `id`, `categoryId`, `iconId`, `objectiveIds`, `rewardIds`, `name`, `description`, `slug`, `img`, et surtout **`need`** : `{ items: number[], quantities: number[], quests: number[], achievements: number[] }` — agrégat précalculé par DofusDB. On ne s'appuie pas dessus pour le moteur (il ne couvre que les succès), mais c'est un **oracle de test** gratuit. · ⚠️ `points`, `level`, `order`, indicateur « lié au compte ».

**`achievement-objectives`** — ✅ `achievementId`, `order`, `criterion` (brut), `name`, `readableCriterion` (arbre lisible, même forme que l'endpoint `criterion`).

**`achievement-rewards`** — ✅ `achievementId`, `criteria`, `itemsReward[]` + `itemsQuantityReward[]` (tableaux parallèles), `titlesReward[]`, `ornamentsReward[]`, `emotesReward[]`, `spellsReward[]`, `kamasRatio`, `experienceRatio`, `kamasScaleWithPlayerLevel`, `guildPoints`.

**`items`** — ✅ `id`, `typeId`, `type`, `name`, `level`, `img`, `iconId`, `criteria`, `recipeIds[]`, `recipesThatUse[]`, `dropMonsterIds[]`, `dropSubAreaIds[]`, `resourcesBySubarea`, **`questsThatUse[]`**, **`questsThatReward[]`**, `exchangeable`, `isSaleable`.
→ « Quelle quête donne ce Dofus ? » = `questsThatReward` de l'objet. Pas besoin d'inverser nous-mêmes les récompenses de quêtes, mais `data:report` DEVRAIT recouper les deux quand les récompenses d'étapes seront disponibles.
→ ⚠️ identifiant du type d'objet « Dofus » : chercher dans `item-types` celui dont `name.fr` vaut « Dofus ». Idem pour le super-type des objets de quête.

**`recipes`** — ✅ `resultId`, `ingredientIds[]` + `quantities[]` (parallèles), `jobId`, `resultLevel`.

**`monsters`** — ✅ drops : `{ monsterId, objectId, percentDropForGrade1…5, count, criteria, hasCriteria }` · ⚠️ champ « boss », grades, zones.

**`dungeons`** — ✅ `name`, `optimalPlayerLevel`, `mapIds[]`, `entranceMapId`, `exitMapId`, `monsters[]`, `subarea`.

### 2.6 Pages du site (liens sortants) ⚠️

URLs observées : `https://dofusdb.fr/database/quest/903` et `https://dofusdb.fr/fr/database/achievements`. Vérifier les motifs exacts (avec ou sans préfixe de langue) pour quête, succès, objet, monstre, donjon avant de générer des liens.

### 2.7 Autres routes ✅

- `GET /version` → chaîne JSON, version des données de jeu. **Clé de cache du snapshot.**
- `GET /criterion/<critère encodé URL>?lang=fr` → arbre lisible : nœuds *texte*, *ressource* `{ id, type }`, *séquence*, *opération* `{ left, operator: and|or, right }` (noms JSON exacts ⚠️). Sert à **afficher** un critère, pas à raisonner dessus : le moteur a son propre parseur (§4). Usage éventuel en M5, à la compilation uniquement, pour donner un libellé français aux critères de contexte.
- Images : servies sous `/img/items/`, `/img/monsters/`, `/img/achievements/`… ✅ (nommage exact des fichiers ⚠️ ; le champ `img` des objets donne l'URL). Ne pas les appeler depuis le site sans accord (SPEC §10).

## 3. Étiquette réseau (obligatoire pour `scripts/snapshot`)

DofusDB est un service bénévole. Nos scripts DOIVENT :

1. **Ne jamais tourner dans le navigateur des visiteurs.** Snapshot hors-ligne uniquement.
2. Appeler `/version` d'abord ; si la version est déjà dans `data/raw/`, **ne rien retélécharger**.
3. Une requête à la fois, **≥ 250 ms** entre deux, reprise avec attente exponentielle sur 429/5xx, arrêt propre après 5 échecs consécutifs.
4. Mettre chaque réponse en cache disque (clé : URL + version) ; un snapshot interrompu reprend où il s'était arrêté.
5. Toujours `$select` ; ne télécharger que les objets et monstres **référencés** par les quêtes et succès (par lots `id[$in][]` de 50), jamais l'encyclopédie entière.
6. S'identifier : en-têtes `User-Agent` et `Referer` décrivant le projet avec une adresse de contact.
7. Budget indicatif ⚠️ : < 2 000 requêtes pour un snapshot complet. Si un besoin le fait exploser, s'arrêter et en parler à Marc.

Action de Marc (SPEC §13, D5) : présenter le projet à l'équipe DofusDB et leur demander leurs limites avant la mise en ligne.

## 4. Grammaire des critères

Les conditions du jeu (lancement de quête, objectif de succès, condition d'objet…) sont des chaînes compactes.

```
expr   := term ( ('&' | '|') term )*
term   := '(' expr ')' | atom
atom   := KEY OP VALUE
KEY    := deux lettres, casse significative        (PL, Qf, PO, Pj ≠ PJ, Sc ≠ SC …)
OP     := '=' | '!' | '>' | '<' | 'E'               ('E' : 2 occurrences, sens ⚠️)
VALUE  := entier | entier ',' entier
```

Constats sur les 1 978 critères de lancement de quêtes observés ✅ : aucun critère vide (le « toujours vrai » s'écrit `BT=1`) ; **aucun** ne mélange `&` et `|` au même niveau de parenthèses. Le parseur applique la précédence usuelle (`&` avant `|`) et `data:report` DOIT signaler tout critère qui mélangerait les deux sans parenthèses.

Opérateurs rencontrés : `=` 3 304 · `>` 1 745 · `!` 894 · `<` 48 · `E` 2. Attention : `PL>109` signifie **niveau ≥ 110**.

### Clés observées (occurrences sur les critères de lancement de quêtes)

| Clé | Occ. | Sens | Confiance | Rôle |
|---|---:|---|---|---|
| `PL` | 1 527 | niveau du personnage | ✅ | **moteur** → `level` (`>`), `context` (`<`) |
| `Qf` | 1 421 | quête terminée (`=`) / non terminée (`!`) | ✅ | **moteur** → `questDone`, `not(questDone)` |
| `Qa` | 813 | quête en cours | ✅ probable | contexte (exclusions mutuelles) |
| `Ad` | 390 | jour du calendrier Almanax (quêtes « Offrande à … ») | ⚠️ | contexte |
| `Pr` | 348 | ordre / rang d'alignement | ⚠️ | contexte |
| `Ps` | 281 | alignement : 1 Bonta, 2 Brâkmar ; neutre = `Ps!1&Ps!2` | ✅ | **moteur** → `alignment` |
| `Pa` | 264 | niveau d'alignement | ✅ probable | contexte |
| `Sc` | 195 | drapeau de contenu / d'événement côté serveur | ⚠️ | contexte |
| `PO` | 122 | objet possédé : `PO=id`, `PO!id`, `PO>id,n` (plus de n) | ✅ / ⚠️ forme quantité | **moteur** → `hasItem` |
| `Qo` | 116 | état d'un objectif de quête | ⚠️ | contexte |
| `Pm` | 90 | carte où se trouve le personnage | ⚠️ | contexte |
| `PG` | 76 | classe (ex. 13 Roublard, 14 Zobal ✅) | ✅ | **moteur** → `breed` |
| `Qc` | 70 | quête « lançable » | ⚠️ | contexte |
| `PJ` | 53 | niveau de métier : `PJ>jobId,niveau` (28 Paysan, 2 Bûcheron, 24 Mineur, 26 Alchimiste, 36 Pêcheur, 41 Chasseur ✅) | ✅ | **moteur** → `jobLevel` |
| `PZ` / `Pz` | 53 / 1 | abonnement | ⚠️ | contexte |
| `BT` | 44 | toujours `BT=1` : « sans condition » | ⚠️ | à ignorer (équivaut à vrai) |
| `OA` | 28 | succès obtenu | ✅ probable | **moteur** → `achievementDone` |
| `Pj` | 25 | lié aux métiers (≠ `PJ`) | ⚠️ | contexte |
| `WE` | 18 | événement mondial en cours | ⚠️ | contexte |
| `QF` | 16 | `QF>questId,n` : quête terminée plus de n fois | ⚠️ | à trancher en M1 (`QF>id,0` ≈ `Qf=id` ?) |
| `DD` `DH` `DM` | 12 / 4 / 3 | délai en jours / heures / minutes lié à un objet : `DD>6,11267` | ⚠️ | contexte (→ `flags.timeGated`) |
| `SC` `ST` | 10 / 9 | type de serveur / saison | ⚠️ | contexte |
| `Sv` `HA` | 3 / 1 | inconnu | ⚠️ | `unknown` |

Toute clé absente de cette table → `unknown`, affichée brute, jamais bloquante. Les critères des **objectifs de succès** utilisent d'autres clés (monstres vaincus, donjons, défis…) : à inventorier en M1 avec la même méthode.

## 5. Vecteurs de test réels

Critères de lancement relevés tels quels (cache DofusDB d'un projet tiers, février 2026). À recopier dans `tests/fixtures/criteria.real.json` **puis à revalider contre le snapshot frais** : si un critère a changé, c'est le snapshot qui fait foi.

| Quête | Critère |
|---|---|
| 29 | `PL>109` |
| 18 | `BT=1` |
| 56 | `Ps=1&Pa=1&PL>29&Qf=55` |
| 275 | `Ps=2&Pa=55&PL>129&(Qf=272\|Qf=273\|Qf=274)` |
| 215 | `PL>29&Qf=211&PO!8576&Qa!216&Qf!216` |
| 147 | `PL>29&PJ>26,79&PZ=1` |
| 318 | `Ps=1&Pa=70&PL>169&QF>333,0` |
| 580 | `PL>99&(PO!11267\|DD>6,11267)` |
| 658 | `PO>11540,9` |
| 676 | `PL>162&POE11563` |
| 143 | `PL>59&Ps!1&Ps!2` |
| 495 | `PL>19&PL<51&Qa!496&Qa!497&Qa!498&Qa!500&Qa!882&(Qa=890\|Qc=890)` |
| 674 | `PL>99&Qf=631&(PO=11195\|PO=11197\|DD>8,11198)&Sc=702` |
| 747 | `(Qf=720\|Qf=721\|Qf=722\|Qf=723)&Qf=724&Qf=725&Qf=726&Qf=741&Qf=742` |
| 1614 | `PL>179&Qf=1613&OA=1077&OA=1107&OA=1147` |
| 1317 | `PL>99&Sc=702&(Qf=710\|Qf=711\|Qf=1316)&((Pm=217318404&Ps=1&Pa>0)\|(Pm=216530944&Ps=2&Pa>0)\|(Pm=95684097&Ps!1&Ps!2))` |
| 710 | `PL>49&Ps=1&Pa>0&Sc=701&Qf!711&Qf!1316` |
| 711 | `PL>49&Ps=2&Pa>0&Sc=701&Qf!710&Qf!1316` |
| 1316 | `PL>49&Ps!1&Ps!2&Sc=701&Qf!710&Qf!711` |

**Cas d'école — quête 1329 « Le Dofus des Glaces »** (28 `Qf` obligatoires + un groupe de 3) :

```
Qf=612&Qf=613&Qf=614&Qf=619&Qf=620&Qf=621&Qf=622&Qf=623&Qf=624&Qf=625&Qf=626&Qf=649&Qf=650&Qf=651&Qf=652&Qf=653&Qf=655&Qf=919&Qf=1309&Qf=1330&Qf=1325&Qf=1310&Qf=1333&Qf=1334&(Qf=710|Qf=711|Qf=1316)&Qf=1317&Qf=1318&Qf=1326&Qf=1327
```

Les quêtes 710, 711 et 1316 s'excluent mutuellement et dépendent de l'alignement : c'est le test de référence des points de choix (SPEC §6.7).
(Dans le tableau, `\|` est un échappement Markdown : le caractère réel est `|`.)

## 6. Pipeline : du snapshot au dataset

**`data:snapshot`** → `data/raw/<gameVersion>/` (gitignored), une réponse par fichier.
Ressources : `quests` (+ étapes, objectifs, récompenses, types d'objectifs, catégories ⚠️ §2.4) · `achievements`, `achievement-objectives`, `achievement-rewards`, `achievement-categories` · `item-types`, `item-super-types` · `jobs`, `breeds`, `alignment-sides` · `dungeons` · puis, par lots d'IDs référencés uniquement : `items`, `recipes` (un niveau), `monsters`, `npcs` (noms seulement).

**`data:build`** → `public/data/` :

| Fichier | Contenu |
|---|---|
| `manifest.json` | `gameVersion`, `builtAt`, liste `{ file, bytes, sha256 }` |
| `quests.json` | quêtes compactes : `start` déjà parsé en `Requirement`, étapes → `Objective[]`, récompenses |
| `achievements.json` | succès compacts, objectifs parsés, récompenses, `dbNeed` |
| `items.json` · `monsters.json` · `dungeons.json` | uniquement les entités référencées, champs minimaux, provenance des objets |
| `refs.json` | catégories, métiers, classes, types d'objets |
| `goals.json` | catalogue d'objectifs (objets de type « Dofus » ayant une source) + overrides |

Règles : sortie **déterministe** (clés triées, pas d'horodatage hors manifest) pour des diffs git lisibles entre deux versions du jeu · validation de schéma en fin de build · français seul au MVP, langue en paramètre · la table `typeId d'objectif → Objective` vit dans `scripts/build-data/objective-types.ts`, construite à partir de la liste réelle relevée en M1 ; type non mappé → `other` avec son texte.

**`data:report`** → couverture des critères par clé, critères non entièrement interprétés, cycles, IDs orphelins, écarts avec `need`, overrides obsolètes, tailles des fichiers.

## 7. Liens vers les soluces (Dofus pour les Noobs)

Le dépôt GitHub `AntoninHuaut/DofusNoobsIdentifier` publie `storage/mapping.json` ✅ :

```json
{ "quest": { "439": "https://www.dofuspourlesnoobs.com/…html" }, "dungeon": { "1": "https://www.dofuspourlesnoobs.com/…html" } }
```

Clés = IDs DofusDB. Dernière mise à jour observée : 14 février 2026. **Le dépôt n'a pas de licence** : ne pas l'intégrer ni le télécharger automatiquement tant que Marc n'a pas l'accord de l'auteur (SPEC §13, D6). Une fois l'accord obtenu : import dans `data/overrides/links.json`, avec crédit. On ne récupère **que des URLs**, jamais le contenu des pages.

## 8. Dofusdude — source secondaire

`https://api.dofusdu.de` · API ouverte, SDK JavaScript, routes de la forme `/{game}/{lang}/items/…`, plus l'Almanax. Pas nécessaire au MVP. Usage envisagé plus tard : widget Almanax, recoupement d'objets. ⚠️ Vérifier l'identifiant `{game}` à utiliser pour Dofus 3 et la couverture avant tout usage.

## 9. Projets de référence (s'en inspirer, ne rien copier)

- **Nokazu** (nokazu.com) — suivi de progression par cases à cocher, multi-personnages. La référence du « tracker ».
- **Dafous** (dafous.app) — catalogue de quêtes avec filtre par Dofus.
- **Ganymède**, **DofusGuide** — guides pas à pas dans une application compagnon.
- **`RenaudJuliani/dofus-tracker`** (GitHub, sans licence) — tracker de quêtes par Dofus à chaînes **éditées à la main**. Son vocabulaire est instructif pour nos overrides : sections *prérequis / principal*, groupes de quêtes à mener ensemble, types (*combat solo, combat groupe, donjon, métier, boss, succès, horaires*), quête *évitable*, variantes par alignement et par métier.

Notre différence : le plan est **calculé** à partir des critères du jeu et de la progression du joueur, puis corrigé à la marge — pas l'inverse.

## 10. Journal des vérifications

| Date | Élément | Résultat | Source |
|---|---|---|---|
| 2026-09-18 | URLs de base, syntaxe de requête, forme des listes, endpoints du §2.3, champs des succès / objets / recettes / drops / donjons, routes `version`, `criterion`, images | ✅ | code du client `DofusSharp/DofusSharp` (GitHub) |
| 2026-09-18 | `quests` : `name`, `startCriterion`, total 1 978, page de 50 ; statistiques et vecteurs des §4–5 | ✅ | cache de `AntoninHuaut/DofusNoobsIdentifier` (GitHub, févr. 2026) |
| 2026-09-18 | `quests` : `levelMin`, `levelMax`, `isDungeonQuest` | ✅ | code de `lurio84/dofus-agente` (GitHub) |
| — | tout ce qui porte ⚠️ | à faire en M1 | appels réels, résultats dans `DATA_NOTES.md` |
