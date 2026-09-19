# DATA_NOTES — carnet de bord des données réelles

Version 0.1 — 18 septembre 2026 · Jalon M1-1 · Source : 56 requêtes en lecture seule vers `https://api.dofusdb.fr` (script `scripts/explore/explore.ts`, réponses en cache dans `data/raw/_explore/`, gitignored). Aucun champ décrit ici n'a été déduit : tout a été lu dans une réponse.

## 0. Bloquant — licence de l'API DofusDB

Chaque réponse porte l'en-tête `x-license: LPNC-IA 1.0 / NCPUL-AI 1.0 - https://api.dofusdb.fr/`. Le texte complet est servi à la racine de l'API (HTML, français puis anglais). Points qui concernent ce projet, cités d'après le texte :

- **Attribution obligatoire** : « Données issues de DofusDB. Utilisation soumise à la LPNC-IA 1.0. » dans un endroit visible (accueil, README, mentions légales).
- **Partage à l'identique** : tout projet dérivé est distribué sous les mêmes termes ou une licence compatible.
- **Non commercial** strict (pas de publicité, d'abonnement, de vente).
- **Restrictions liées à l'IA (§4.2)** : l'usage ponctuel d'outils d'IA est toléré si l'utilisateur reste « l'auteur principal et responsable du Projet ». Sont interdits : un projet « dont la structure, le code, le contenu ou la logique a été produit en majorité (plus de 50 %) par des outils d'IA » ; « intégrer l'API dans un pipeline automatisé piloté par l'IA sans intervention humaine significative » ; « rendre les données disponibles à tout système d'IA, agent autonome ou bot ». Résiliation automatique en cas de violation, avec obligation de supprimer les données.

**Levée du blocage (2026-09-19)** : Marc a écrit à l'équipe DofusDB et confirme avoir leur accord pour ce projet et son mode de développement. L'attribution exigée figure dans le pied de page et le README. Le texte ci-dessous est conservé pour mémoire.

**Conséquence (au 2026-09-18)** : le mode de travail actuel (code écrit par un agent IA, exploration exécutée par cet agent) est en dehors du champ de cette licence. Toute activité réseau vers DofusDB est suspendue jusqu'à décision de Marc (voir « Propositions » §13). Le cache `data/raw/_explore/` est conservé localement pour cette décision ; il n'est pas versionné.

## 1. `/version`

Chaîne JSON : `"3.6.11.15"`. Clé de cache du snapshot ✅.

## 2. Pagination

- `$limit=100` → la réponse dit `limit: 50` et renvoie 50 éléments : **plafond 50** ✅.
- `$limit=0` → `{ total, limit: 0, skip: 0, data: [] }` : **compte gratuit** sans données ✅.
- Totaux observés : quests **1 976** (DATA_SOURCES disait 1 978), quest-steps 2 225, quest-objectives 15 547, quest-step-rewards 6 707, quest-objective-types 18, quest-categories 43, achievements 2 780, achievement-objectives 8 948, achievement-rewards 6 394, achievement-categories 134, items de type Dofus 34, monsters 5 135, dungeons 187, npcs 6 474, recipes 4 858, jobs 23, breeds 19, alignment-sides 4, item-super-types 26.

## 3. Quêtes : `/quests/1329` et routes détaillées

Champs de `/quests/1329` (hors `_id`, `m_id`, `className`, `createdAt`, `updatedAt`) :

```json
{ "id": 1329, "name": { "fr": "Le Dofus des Glaces", "en": "…" }, "slug": "…",
  "categoryId": 27, "type": 1, "repeatType": 0, "repeatLimit": 1,
  "isDungeonQuest": true, "isEvent": false, "isPartyQuest": false, "followable": true,
  "levelMin": 200, "levelMax": 200,
  "startCriterion": "Qf=612&…&(Qf=710|Qf=711|Qf=1316)&…&Qf=1327",
  "startPosition": [ { "mapId": 112204547, "npcId": 2051 } ],
  "stepIds": [ 1930 ],
  "steps": [ { "id": 1930, "questId": 1329, "name": {…}, "description": {…}, "optimalLevel": 200,
              "duration": 0.25, "dialogId": 0, "objectiveIds": [ 7390 ], "rewardsIds": [ 5760 ],
              "objectives": [ { "id": 7390, "typeId": 1, "parameters": { "numParams": 1, "parameter0": 2051, "parameter1": 0, "parameter2": 0, "parameter3": 0, "parameter4": 0, "dungeonOnly": false }, "text": { "fr": "Aller voir {npc,2051}" }, "mapId": 0, "dialogId": 0, "coords": null, "need": { "generated": { "dungeons": [], "items": [], "quantities": [], "itemToUse": [] } } } ],
              "rewards": [ { "id": 5760, "stepId": 1930, "levelMin": -1, "levelMax": -1, "kamasRatio": 1.2, "experienceRatio": 1.2, "kamasScaleWithPlayerLevel": false, "itemsReward": [], "itemsRewardIds": [], "items": [], "jobsReward": [], "emotesReward": [], "spellsReward": [], "titlesReward": [] } ] } ],
  "need": { "items": [], "quantities": [], "quests": [ 612, 613, …, 1327 ], "achievements": [] } }
```

- **Étapes, objectifs et récompenses sont embarqués** dans la quête (`steps[].objectives[]`, `steps[].rewards[]`), y compris sur la liste `/quests?$select[]=stepIds` (le `$select` de `stepIds` déclenche la population de `steps`) ✅. Une page de 3 quêtes pèse 100 Ko brut : l'embarqué coûte peu de requêtes (≈ 40 pages pour toutes les quêtes) mais beaucoup d'octets.
- Les routes séparées existent aussi ✅ : `/quest-steps?questId=1329`, `/quest-objectives?stepId=1930`, `/quest-step-rewards?stepId=1930`, `/quest-objective-types`, `/quest-categories` (avec `questIds[]` et `order`).
- `need` existe aussi sur les quêtes (pas seulement les succès). Sur 1329 il liste **31** quêtes : les 28 obligatoires **et** les 3 branches du `|` : c'est une borne haute, pas une conjonction.
- Surprises : 1329 est `isDungeonQuest: true` et `levelMin: 200` ; son unique objectif est « Aller voir {npc,2051} » ; sa récompense ne contient **aucun objet** (voir §6 : le Dofus vient d'un succès).
- Champ `type` (valeur 1) : sens inconnu ⚠️.

## 4. Types d'objectifs de quête et paramètres

Table complète (`/quest-objective-types`, 18 entrées, `name.fr`) avec les occurrences (`total` de `/quest-objectives?typeId=`) et la position des paramètres observée sur 2 exemples par type :

| typeId | Libellé fr | Occ. | `parameter0` | `parameter1` | `parameter2` | Autres | → `Objective` proposé |
|---:|---|---:|---|---|---|---|---|
| 0 | `#1` (texte libre) | 5 670 | id opaque (ex. 55641) | 0 | 0 | | `other` avec `text.fr` |
| 1 | Aller voir #1 | 4 213 | npcId | | | | `talkTo` |
| 2 | Montrer à #1 : #3 #2 | 323 | npcId | itemId | qty | `need.generated.items/quantities` remplis | `showItem` |
| 3 | Ramener à #1 : x#3 #2 | 2 146 | npcId | itemId | qty | `need.generated` vide | `bringItem` |
| 4 | Découvrir la carte : #1 | 874 | mapId | | | | `goTo { mapId }` |
| 5 | Découvrir la zone #1 | 5 | subareaId | | | | `goTo { subareaId }` |
| 6 | Vaincre x#2 #1 en un seul combat | 788 | monsterId | qty | | `dungeonOnly`, `need.generated.dungeons` | `killMonster { singleFight: true }` |
| 7 | Monstre à vaincre : #1 | 0 | | | | | — |
| 8 | Utiliser : #1 | 0 | | | | | — |
| 9 | Retourner voir #1 | 799 | npcId | | | | `talkTo` |
| 10 | Escorter #1 #2 | ? | non échantillonné | | | | `other` |
| 11 | Vaincre un joueur en défi #1 | ? | non échantillonné | | | | `other` |
| 12 | Rapporter #3 âme de #2 à #1 | 363 | npcId | monsterId | qty | `need.generated.dungeons` | nouveau : `bringSoul` |
| 13 | Eliminer #1 | 0 | | | | | — |
| 14 | Vaincre x#2 #1 | 143 | monsterId | qty | | | `killMonster { singleFight: false }` |
| 15 | Gagner un combat Krosmaster | ? | non échantillonné | | | | `other` |
| 16 | Vaincre x#2 #1 sur la carte #3 en un seul combat | 88 | monsterId | qty | mapId | `parameter4` (ex. 1137420, sens ⚠️), `dungeonOnly` | `killMonster` + `mapId` |
| 17 | Fabriquer #2 #1 et fermer l'interface | 109 | itemId | qty | | `need.generated.items` = ingrédients | nouveau : `craft` |

Forme des paramètres : `{ numParams, parameter0…parameter4, dungeonOnly }`. Le texte `text.fr` contient des balises `{npc,447}`, `{item,1501}`, `{monster,182}`, `{map,149165056}`, `{subarea,165}` à substituer à l'affichage. Le type 0 (texte libre) est le **plus fréquent** : plus d'un tiers des objectifs ne sont pas typés.

## 5. Récompenses de quête, répétable, groupe

- Récompenses **au niveau de l'étape** (`quest-step-rewards`, embarquées dans `steps[].rewards`) : `itemsReward: [[itemId, qty], …]` (paires), `itemsRewardIds[]`, `items[]` (objets peuplés), `kamasRatio`, `experienceRatio`, `kamasScaleWithPlayerLevel`, `levelMin`/`levelMax` (−1 = sans borne), `jobsReward[]`, `emotesReward[]`, `spellsReward[]`, `titlesReward[]`. **Aucun champ de critère** sur les récompenses d'étape.
- Exemple réel : `{ "id": 3, "stepId": 13, "itemsReward": [[6793, 1], [2576, 2]] }`.
- Répétable : `repeatType` (0 sur 26, 29, 1329 ; 1 sur la quête 18) et `repeatLimit` ; sens exact des valeurs ⚠️. Événementiel : `isEvent` (booléen) ✅. Groupe : `isPartyQuest` ✅ (vrai sur la quête 29).

## 6. Objets : type « Dofus », super-type des objets de quête, sources

- `/item-types?name.fr=Dofus` → **1** résultat : `id: 23`, `superTypeId: 13` (« Dofus / Trophée / Prysmaradite ») ✅.
- Super-types (26) : 13 « Dofus / Trophée / Prysmaradite », **14 « Objet de quête »** ✅, 9 « Ressource », 6 « Consommable », etc.
- `/items?typeId=23` → **34** objets, avec des doublons de nom (Dofus Cacao ×2, Dofus Sylvestre ×2, Dofus Vulbis ×2 à des niveaux différents).
- **`questsThatReward` n'est renseigné que sur 3 des 34** (Dofawa → 1959, Dotruche → 1517, Dofus Argenté Scintillant → 2051). **`achievementsThatReward`** l'est sur 25 : les Dofus de quête sont donnés par le **succès** qui clôt la série, pas par la dernière quête. Exemple : Dofus des Glaces 7043 ← succès 922 « Œuf à la neige » (objectifs `(OA=552)…(OA=920)`, récompense `itemsReward: [7043]`) ; Dofus Pourpre 694 ← succès 1101 « Pourpre profond » (objectifs `(Qf=1521)…(Qf=1529)`, récompense `[694]`).
- **8 Dofus sans aucune source** dans les données : 7754 Ocre, 8072 Kaliptus, 20833 et 20987 Cacao, 21186 Vulbis (niv. 100), 27803 Dom de Pin, 29134 Sylvestre, 29135 Verdoyant, 30356 Jyfus → `noSourceForItem` ou override.
- Objet complet (`/items/694`) : `criterions` et `criterionsTarget` (chaînes, vides ici), `questsThatUse[]`, `questsThatReward[]`, `achievementsThatReward[]`, `recipeIds[]`, `recipesThatUse[]`, `dropMonsterIds[]`, `dropSubAreaIds[]`, `resourcesBySubarea[]`, `exchangeable`, `isSaleable`, `usable`, `hasRecipe`, `price`, `effects[]`, `type` (peuplé avec `superTypeId`), `visibilityCriterion`.

## 7. Succès

- `/achievements` (2 780) : `id`, `name`, `description`, `categoryId`, `category` (peuplée), **`accountLinked`** (booléen ✅, faux sur les 5 vus), **`points`**, **`level`**, **`order`** ✅, `objectiveIds[]`, `objectives[]` (embarqués ; sur les succès 3, 4, 5 la liste contient `null`, sur 922 et 1101 elle est peuplée ⚠️), `rewardIds[]`, `rewards[]` (embarqués), `need`, `iconId`, `img`, `slug`.
- `need` ✅ : `{ "items": [15391, 7290], "quantities": [1, 1], "quests": [1521, …], "achievements": [] }` (succès 1101).
- `/achievement-objectives` (8 948) : `achievementId`, `order`, `name`, **`criterion`** brut, `readableCriterion`. Critères vus : `(Qf=1521)`, `(OA=552)`, `(EM>147,0,d)`, `HD>33001,0`. Donc : parenthèses autour d'un atome seul, **trois arguments**, et un **argument non numérique** (`d`) — hors grammaire de DATA_SOURCES §4.
- `readableCriterion` : tableau JSON de fragments : chaînes, sous-tableaux, séparateurs `"&"`/`"|"` et **objets ressource complets** embarqués (`className: "MonsterData"`, `"ItemData"`, `"JobData"`…). Exemple : `[["Avoir tué ", {MonsterData 147}, " en ", "donjon"]]`.
- `/achievement-rewards` (6 394) : `criterions` (ex. `"Ob!37"`, nouvelle clé `Ob`), `itemsReward[]` + `itemsQuantityReward[]` (parallèles), `titlesReward[]`, `ornamentsReward[]`, `emotesReward[]`, `spellsReward[]`, `alterationsReward[]`, `kamasRatio`, `experienceRatio`, `guildPoints`, `kamasScaleWithPlayerLevel`.
- `/achievement-categories` (134) : `parentId`, `order`, `achievementIds[]`, `visibilityCriterion`, `icon`, `color`.

## 8. Monstres et donjons

- `/monsters` (5 135) : **`isBoss`**, `isMiniBoss`, `isQuestMonster` ✅ ; `race`, `subareas[]`, `favoriteSubareaId`, `grades[{ grade, level, lifePoints, … }]`, `drops[{ monsterId, objectId, percentDropForGrade1…5, count, criterions, hasCriterions, hiddenIfInvalidCriterions, specificDropCoefficient[] }]`. Le filtre `isBoss=true` fonctionne : 209 boss.
- `/dungeons` (187) : `bosses[]`, `monsters[]` (ids), `mapIds[]`, `entranceMapId`, `exitMapId`, `minLevel`, `optimalPlayerLevel`, **`requiredObjects[{ id, quantity }]`** (clé du donjon), `achievements[]`, `subarea`. Exemple : donjon 1 « Cour du Bouftou Royal », monstres `[101, 134, 147, 148, 149, 4822]`, boss `[147]`, objet requis `1568 ×1`.
- Lien monstre → donjon : par `dungeons.monsters[]`, et, côté quête, par `objective.need.generated.dungeons[]` (rempli quand `dungeonOnly` est vrai).

## 9. `/criterion/<critère>?lang=fr`

Renvoie un tableau JSON : `[["Niveau > ", "29"], "&", ["Niveau de ", {JobData 26 Alchimiste}, " supérieur à ", 79], "&", ["Être abonné"]]` et, pour le second vecteur, des sous-tableaux imbriqués avec `"|"` et l'objet `ItemData 11267` embarqué en entier (10 Ko de réponse). Utilisable pour un libellé, pas pour raisonner ; les objets embarqués sont lourds.

## 10. En-têtes de réponse

`content-type: application/json; charset=utf-8`, `etag` faible, `vary: Accept, Accept-Encoding`, `access-control-allow-origin: *`, `strict-transport-security`, `x-content-type-options`, `x-frame-options`, **`x-license`**. **Aucun** en-tête de limite de débit ni de cache (`cache-control`, `ratelimit-*`, `retry-after` absents). Aucun 429 ni 5xx en 56 requêtes espacées de 500 ms.

## 11. Tables de référence

- `alignment-sides` : `0 Neutre`, `1 Bontarien`, `2 Brâkmarien`, `3 Mercenaire`. Le neutre a donc un id 0 côté jeu ; `Ps!1&Ps!2` reste la forme des critères.
- `breeds` (19) : **pas de champ `name`**, le nom est dans `shortName` (`{ fr: "Féca" }`). `jobs` (23) : `id`, `name`, `iconId`, `hasLegendaryCraft`. `npcs` (6 474) : `name`, dialogues, `look`. `recipes` : `resultId`, `ingredientIds[]`, `quantities[]`, `jobId`, `resultLevel`, `skillId` ✅.

## 12. Écarts avec DATA_SOURCES.md

1. Licence LPNC-IA 1.0 non connue de DATA_SOURCES (§0 ci-dessus).
2. Total des quêtes : 1 976 (et non 1 978).
3. Grammaire §4 : les critères d'objectifs de succès ont jusqu'à **3 arguments** et des **arguments alphabétiques** (`EM>147,0,d`), et un atome peut être **seul entre parenthèses**. Nouvelles clés : `EM`, `HD`, `Ob`, `ST` (dans `drops[].criterions`).
4. §2.4 : les cinq routes existent ; mais étapes, objectifs et récompenses sont **embarqués** dans `/quests`, et objectifs et récompenses dans `/achievements`.
5. §2.5 : `questsThatReward` est presque toujours vide sur les Dofus ; la source est `achievementsThatReward`. Les quêtes ont aussi un `need`. Champs `isEvent`, `repeatLimit`, `startPosition`, `type` non prévus. Récompenses d'étape : paires `[itemId, qty]`, pas de critère. `breeds.name` n'existe pas.
6. §3 budget : avec les objets embarqués, un snapshot complet tient en ≈ 250–400 requêtes (quêtes 40, succès 56, catégories/types 5, donjons 4, puis lots de 50 pour objets, monstres, PNJ et recettes référencés). Le poids brut est élevé (≈ 35 Ko par quête).
7. §2.6 : motifs d'URL du site non vérifiés (interdit en M1-1).

## 13. Propositions d'ajustement de la SPEC (Marc tranche)

1. **Licence (bloquant).** Trois voies : (a) écrire à l'équipe DofusDB pour exposer le mode de travail (agent IA sous supervision humaine, projet non commercial, code public) et demander un accord écrit ; (b) Marc reprend la main sur l'écriture du code, l'IA restant « ponctuelle et accessoire », et exécute lui-même les scripts réseau ; (c) changer de source de données (Dofusdude : licence à vérifier, à ne pas appeler avant décision). Tant que rien n'est décidé : aucune requête, pas de snapshot, pas de publication du dataset.
2. **§10 attribution** : ajouter la phrase exacte exigée par la licence dans le pied de page et le README, et choisir une licence de dépôt compatible (non commerciale, partage à l'identique).
3. **§6.4 racines d'un objectif objet** : `achievementsThatReward` en plus de `questsThatReward` ; le catalogue « Dofus » se construit via les succès.
4. **§5 `Objective`** : ajouter `bringSoul { npcId, monsterId, qty }`, `craft { itemId, qty }`, `killMonster.mapId?` ; `goTo` reçoit `mapId` (type 4) ou `subareaId` (type 5) ; type 0 → `other` avec texte (très fréquent).
5. **DATA_SOURCES §4 grammaire** : `VALUE := token (',' token)*` avec token entier **ou identifiant** ; le parseur M1-3 doit être étendu avant M1-4 (les critères de succès échoueraient sinon).
6. **§5 `Achievement`** : `accountLinked` existe → Q1 tranchée : ces coches se stockent au niveau du compte. `points`, `level`, `order` existent.
7. **§5 `Quest`** : `isRepeatable` ← `repeatType`/`repeatLimit` (sens à établir), `isEvent` disponible (Q3), `startPosition` utile pour « où commencer ».
8. **`AlignmentSide`** : le jeu a un id 0 « Neutre » et un 3 « Mercenaire » ; garder 0/1/2 dans le moteur, traiter 3 en `context`.
9. **Snapshot** : préférer les objets embarqués (moins de requêtes) et `$select` sur les champs utiles ; échantillonner d'abord le poids d'une page pleine.

## 14. Premier snapshot complet (M1-2, 2026-09-19)

Version `3.6.11.15` · `data/raw/3.6.11.15/` (gitignored) · 165 Mo bruts · **364 requêtes réseau au total** (12 de dry-run, 6 d'essai, 329 pour le snapshot, 17 pour le correctif des recettes), aucune reprise, aucun 429. Une seconde exécution ne fait que `/version`.

| Ressource | Lignes | Réponses | Poids brut |
|---|---:|---:|---:|
| quests (étapes, objectifs, récompenses embarqués) | 1 976 | 40 | 56 Mo |
| achievements (objectifs, récompenses embarqués) | 2 780 | 56 | 86 Mo |
| items référencés | 3 834 | 77 | 4,6 Mo |
| dofus-items (type 23) | 34 | 1 | 41 Ko |
| recipes (objets fabricables) | 601 | 13 | — |
| ingredient-items (non déjà référencés) | 121 | 3 | 47 Ko |
| monsters référencés (objectifs, succès, donjons, drops) | 2 151 | 44 | 12 Mo |
| npcs référencés (noms) | 2 476 | 50 | 0,4 Mo |
| subareas référencées | 189 | 4 | 48 Ko |
| dungeons | 187 | 4 | 94 Ko |
| item-types | 239 | 5 | 116 Ko |
| quest-categories · achievement-categories | 43 · 134 | 1 · 3 | — |
| quest-objective-types · item-super-types · jobs · breeds · alignment-sides | 18 · 26 · 23 · 19 · 4 | 1 chacun | — |

Constats :

1. **`items.recipeIds` liste les recettes qui UTILISENT l'objet**, pas celle qui le fabrique (objet 287 « Graine de Sésame » : `hasRecipe: false`, 11 `recipeIds`). L'indicateur « fabricable » est **`hasRecipe`** ; la recette se retrouve par `recipes?resultId=` (l'`id` d'une recette est égal à son `resultId`). Écart avec DATA_SOURCES §2.5.
2. **322 objectifs de succès embarqués valent `null`** (sur 9 168) ; les mêmes ids demandés à `/achievement-objectives` renvoient `total: 0` : ils n'existent pas en amont. À traiter comme objectifs manquants (`DataIssue`), jamais comme erreur.
3. Malgré `$select`, l'API ajoute des champs peuplés (`type` et `img` sur les objets ; `ingredients`, `result`, `job` sur les recettes ; `steps` sur les quêtes) : le poids vient de là. `data:build` ne garde que le nécessaire.
4. Budget : 364 requêtes pour tout le jalon, contre 2 000 autorisées.

## 15. Catalogue « Dofus » et tranches verticales (M1-5, 2026-09-19)

Taille du plan = fermeture des prérequis `Qf` / `QF` / `OA` positifs à partir de l'AST syntaxique, **toutes les branches des `|` comptées** (borne haute). Les atomes niés (`Qf!…`) ne sont jamais des prérequis. Produit par `npm run data:fixture -- --catalog`.

| Objet | Nom | Niv. | Source | Quêtes | Succès | Nœuds | Manquants |
|---:|---|---:|---|---:|---:|---:|---:|
| 972 | Dofus Cawotte | 60 | succès 992 | 0 | 1 | 1 | 0 |
| 7113 | Dofawa | 6 | quête 1959 | 2 | 0 | 2 | 0 |
| 13344 | Dolmanax | 100 | succès 568 | 1 | 1 | 2 | 0 |
| 15235 | Dotruche | 110 | quête 1517 | 4 | 1 | 5 | 0 |
| 17078 | Dokoko | 80 | succès 1397 | 5 | 1 | 6 | 0 |
| 10907 | Dokille | 80 | succès 980 | 6 | 1 | 7 | 0 |
| 31794 | Dofoozbz | 170 | succès 8855 | 7 | 1 | 8 | 0 |
| 23237 | Domakuro | 120 | succès 3034 | 8 | 1 | 9 | 0 |
| 6980 | Dofus Vulbis | 180 | succès 2198 | 9 | 1 | 10 | 0 |
| 23408 | Dorigami | 150 | succès 3078 | 11 | 1 | 12 | 0 |
| 7112 | Dofus Tacheté | 180 | succès 3082 | 13 | 1 | 14 | 0 |
| 16061 | Dofus des Veilleurs | 100 | succès 1187 | 15 | 5 | 20 | 0 |
| 26066 | Dofus du Cauchemar | 180 | succès 5162 | 32 | 1 | 33 | 0 |
| 19398 | Dofus Forgelave | 180 | succès 1656 | 28 | 6 | 34 | 0 |
| 694 | Dofus Pourpre | 110 | succès 1101 | 37 | 1 | 38 | 0 |
| 737 | Dofus Émeraude | 100 | succès 1048 | 37 | 1 | 38 | 0 |
| 739 | Dofus Turquoise | 160 | succès 1385 | 39 | 1 | 40 | 0 |
| 7114 | Dofus Ébène | 180 | succès 1704 | 39 | 1 | 40 | 0 |
| 7115 | Dofus Ivoire | 180 | succès 1622 | 39 | 1 | 40 | 0 |
| 18043 | Dofus Abyssal | 180 | succès 1498 | 40 | 8 | 48 | 0 |
| 7043 | Dofus des Glaces | 180 | succès 922 | 43 | 7 | 50 | 0 |
| 19629 | Dofus Argenté | 20 | succès 1679 | 74 | 15 | 89 | 0 |
| 8698 | Dofus Nébuleux | 180 | succès 1188 | 101 | 21 | 122 | 0 |
| 29136 | Dofus Sylvestre | 180 | succès 7761 | 148 | 15 | 163 | 0 |
| 20286 | Dofus Argenté Scintillant | 180 | quête 2051 | 149 | 24 | 173 | 0 |

9 objets de type Dofus n'ont aucune source dans les données et sont absents du catalogue : 7754 Dofus Ocre, 8072 Dofus Kaliptus, 20833 et 20987 Dofus Cacao, 21186 Dofus Vulbis (niv. 100), 27803 Dom de Pin, 29134 Dofus Sylvestre, 29135 Dofus Verdoyant, 30356 Jyfus. À traiter par override de `goals.json` si Marc veut les proposer.

**Tranches retenues pour M2.**

1. **Dotruche (objet 15235)** : 5 nœuds (4 quêtes, 1 succès), source = quête 1517. C'est le plus petit plan non trivial : Dofus Cawotte (1 nœud), Dofawa et Dolmanax (2 nœuds) ont moins de 3 nœuds et ont été écartés pour cette raison.
2. **Quête 1329 « Le Dofus des Glaces »** : 43 quêtes dans la fermeture, 14 donjons cités, 0 nœud manquant.
3. En plus : **objet 7043 « Dofus des Glaces »** (50 nœuds : 43 quêtes et 7 succès). C'est le vrai parcours « je veux ce Dofus » : l'objet est donné par le succès 922, dont les objectifs sont six autres succès, qui mènent à la quête 1329.

Fixtures versionnées dans `tests/fixtures/` : `item-15235-dotruche.json` (14 Ko), `quest-1329-le-dofus-des-glaces.json` (125 Ko), `item-7043-dofus-des-glaces.json` (138 Ko). `tests/fixtures.test.ts` charge chacune, valide son schéma et vérifie qu'elle est fermée.

**Vérifications sur 1329.** 28 prérequis `Qf` directs et un groupe `|` de 3 (710, 711, 1316) ✅. **Aucun écart avec DATA_SOURCES §5** : les 20 vecteurs relevés dans le cache tiers de février 2026 sont identiques, caractère pour caractère, au snapshot 3.6.11.15.

## 16. Clôture de M1

**⚠️ restants.**

- Sens de la plupart des clés de critères hors table §4 (`Ef`, `EH`, `BI`, `EB`, `Ob`, `SH`, `Nf`, clés d'objets…) et de l'opérateur `E`.
- Valeurs de `quests.repeatType` (−1, 0, 1, 2, 3) et de `quests.type` (0 à 3) : sens à établir.
- `parameter0` des objectifs de type 0 (texte libre) et `parameter4` du type 16 : opaques.
- Types d'objectifs 10, 11, 15 : jamais échantillonnés en détail (compilés en `other`).
- Motifs d'URL du site dofusdb.fr (§2.6) : à vérifier par Marc dans un navigateur.
- 322 objectifs de succès absents en amont ; 3 objets, 12 monstres et 22 PNJ cités mais introuvables (liste dans le rapport).

**Q1 — succès liés au compte.** Le champ `accountLinked` existe mais vaut `false` sur les 2 780 succès. Les données ne distinguent donc aucun succès de compte : on stocke toutes les coches de succès **par personnage** (SPEC §8 inchangée). À rouvrir si une version du jeu renseigne le champ.

**Q3 — quêtes répétables et événementielles.** Sur 1 976 quêtes : `isEvent: true` sur **579** (29 %) ; `repeatType ≠ 0` sur **608** (3 : 377, 1 : 140, −1 : 72, 2 : 19) ; la catégorie « Almanax » en compte 390 à elle seule ; `isPartyQuest` sur 167. Proposition : ne jamais proposer ces quêtes comme objectifs du catalogue et les masquer par défaut dans la saisie en masse, mais **ne pas les exclure des plans** : si un critère les exige, elles doivent apparaître. Le rapport M2 dira combien de plans « Dofus » en traversent.

**Propositions d'ajustement de la SPEC avant M2** (en plus de §13) :

1. §5 `Quest.rewards` : les récompenses dépendent du niveau du personnage (une ligne par niveau, fusionnées en `rewardBands`). La simulation d'inventaire (§6.6) doit choisir la tranche selon `Character.level`, et prendre le minimum garanti quand le niveau n'est pas renseigné.
2. §6.4 : racines d'un objectif objet = `questsThatReward` ∪ `achievementsThatReward`. 22 des 25 Dofus du catalogue passent par un succès.
3. §6.2 : les succès « chapeau » (`OA=` vers d'autres succès, `Qf=` vers des quêtes) sont des nœuds à part entière : 5 392 objectifs de succès sont de cette forme. Un succès dont tous les objectifs sont `Qf`/`OA` est entièrement déductible (§6.3).
4. §6.1 : `CriterionAtom.args` est `(number | string)[]`, sans limite de nombre.
5. §5 `Objective` : variantes `bringSoul` et `craft` ajoutées ; `killMonster` porte `mapId` et `dungeonIds` ; chaque objectif garde `id` et `text` (texte du jeu avec balises `{npc,id}`…). 36,6 % des objectifs sont de type 0 (texte libre) et restent `other`.
6. §6.6 donjons : le lien vient de `objective.dungeonIds` (donnée amont) plutôt que d'une déduction par monstre.
7. §11 poids : 835 Ko gzip pour tout le dataset (55 % de la cible) ; un découpage n'est pas nécessaire au MVP.
