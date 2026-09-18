# M1-1 — Plan des requêtes d'exploration (lecture seule, 60 maximum)

Base : `https://api.dofusdb.fr` · une requête à la fois, 500 ms d'écart · en-têtes `User-Agent` et `Referer` identifiant le projet · chaque réponse mise en cache dans `data/raw/_explore/` (gitignored) et relue avant toute nouvelle demande · arrêt au premier 429 ou à la deuxième 5xx.

Les URL marquées « dépend » utilisent un identifiant lu dans une réponse précédente ; elles sont sautées si l'identifiant manque.

| # | Question | URL |
|---|---|---|
| 1 | Q1 version | `/version` |
| 2 | Q2 pagination | `/quests?$limit=100&$select[]=id` |
| 3 | Q2 pagination | `/quests?$limit=0` |
| 4 | Q3 quête | `/quests/1329` |
| 5 | Q3 quête | `/quests?$limit=3&$select[]=id&$select[]=name&$select[]=startCriterion&$select[]=stepIds&$select[]=categoryId&$select[]=repeatType&$select[]=isPartyQuest&$select[]=followable&$select[]=levelMin&$select[]=levelMax&$select[]=isDungeonQuest` |
| 6 | Q3 étapes | `/quest-steps?$limit=1` |
| 7 | Q3 étapes | `/quest-steps?questId=1329&$limit=50` |
| 8 | Q3 objectifs | `/quest-objectives?$limit=1` |
| 9 | Q3 objectifs | `/quest-objectives?stepId=<première étape de 1329>&$limit=10` (dépend) |
| 10 | Q3 récompenses | `/quest-step-rewards?$limit=3` |
| 11 | Q3 récompenses | `/quest-step-rewards?stepId=<première étape de 1329>&$limit=10` (dépend) |
| 12 | Q4 types d'objectifs | `/quest-objective-types?$limit=50` (liste complète autorisée ; page 2 si `total` > 50) |
| 13 | Q3 catégories | `/quest-categories?$limit=50` (page 2 si `total` > 50) |
| 14–21 | Q4 paramètres | `/quest-objectives?typeId=<t>&$limit=2` pour les 8 premiers types observés (dépend) |
| 22 | Q5 répétable / groupe | couvert par #4 et #5 |
| 23 | Q6 type Dofus | `/item-types?name.fr=Dofus&$limit=5` |
| 24 | Q6 super-types | `/item-super-types?$limit=50` (liste complète autorisée) |
| 25 | Q6 objets Dofus | `/items?typeId=<Dofus>&$limit=0` (dépend) |
| 26 | Q6 objets Dofus | `/items?typeId=<Dofus>&$limit=50&$select[]=id&$select[]=name&$select[]=level&$select[]=questsThatReward&$select[]=typeId` (dépend ; page 2 si `total` > 50) |
| 27 | Q6 objet complet | `/items/<premier Dofus>` (dépend) |
| 28 | Q7 succès | `/achievements?$limit=3` |
| 29 | Q7 succès | `/achievements?$limit=0` |
| 30 | Q7 objectifs | `/achievement-objectives?$limit=3` |
| 31 | Q7 objectifs | `/achievement-objectives?$limit=0` |
| 32 | Q7 récompenses | `/achievement-rewards?$limit=2` |
| 33 | Q7 catégories | `/achievement-categories?$limit=3` |
| 34 | Q8 monstres | `/monsters?$limit=2` |
| 35 | Q8 donjons | `/dungeons?$limit=2` |
| 36 | Q8 lien monstre ↔ donjon | `/monsters?id[$in][]=<monstres du premier donjon>&$limit=10` (dépend) |
| 37 | Q8 boss | `/monsters?isBoss=true&$limit=2` (champ ⚠️, résultat vide accepté) |
| 38 | Q9 criterion | `/criterion/<PL>29&PJ>26,79&PZ=1 encodé>?lang=fr` |
| 39 | Q9 criterion | `/criterion/<PL>99&(PO!11267|DD>6,11267) encodé>?lang=fr` |
| 40 | référence | `/jobs?$limit=3` |
| 41 | référence | `/breeds?$limit=2` |
| 42 | référence | `/alignment-sides?$limit=5` |
| 43 | référence | `/npcs?$limit=1` |
| 44 | référence | `/recipes?$limit=1` |
| 45 | Q3 objectif → objet | `/items/<premier objet cité par un objectif de 1329>` (dépend) |

Budget : 45 requêtes prévues, 60 au plus (pages 2 éventuelles comprises). Q10 (en-têtes de réponse) est observée sur toutes les réponses.

Interdits : déduire un champ non observé ; API d'images ; dofusdb.fr (le site) ou tout autre domaine.
