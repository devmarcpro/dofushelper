# SPEC — Roadbook (nom de code provisoire)

Version 0.2 — brouillon du 18 septembre 2026 · Auteur : Marc · Emplacement : `docs/SPEC.md`
Changement 0.2 : parseur de critères en deux étages (syntaxe en M1, sémantique en M2).

## 0. Comment lire ce document

- **DOIT** = exigence. **DEVRAIT** = attendu sauf bonne raison documentée. **PEUT** = optionnel.
- ✅ = vérifié (source indiquée dans `DATA_SOURCES.md`). ⚠️ = hypothèse à vérifier sur les données réelles au jalon M1 ; ne rien construire de fragile dessus avant.
- Aucun exemple de contenu de jeu n'est inventé. Les seuls exemples réels cités — la quête **1329 « Le Dofus des Glaces »** et quelques critères de lancement — ont été relevés dans des données DofusDB (voir `DATA_SOURCES.md` §5).

**Résumé pour agent pressé.** Un objectif (objet, succès ou quête) est transformé en graphe de prérequis à partir des critères du jeu. On croise ce graphe avec les coches du joueur pour produire un plan ordonné, des statuts (fait / déduit / disponible / bloqué), la liste des objets à réunir calculée par simulation d'inventaire, les monstres et donjons à prévoir, et la prochaine action. Tout le calcul vit dans `src/core`, pur et testé. Les données viennent d'un snapshot DofusDB compilé hors-ligne, corrigé par une couche d'overrides manuels.

## 1. Vision

**Problème.** L'information Dofus est éclatée entre encyclopédies, soluces et trackers à cases. Aucun outil ne répond simplement à : « pour atteindre X, il me reste quoi à faire, dans quel ordre, et qu'est-ce que je dois réunir — compte tenu de ce que j'ai déjà fait ? »

**Promesse.** Tu choisis un objectif, tu coches ce qui est fait, le site te donne la marche à suivre.

**Principes produit.**

1. **L'objectif d'abord.** L'entrée n'est pas une encyclopédie mais une intention (« je veux ce Dofus »).
2. **Cocher doit coûter moins cher que de s'en passer.** Propagation des prérequis, saisie en masse, annulation en un geste.
3. **Tout est dérivé des données.** Rien de spécifique à un Dofus n'est codé en dur ; les exceptions passent par `data/overrides/`.
4. **Honnête sur l'incertitude.** Les données du jeu n'exposent pas tous les prérequis (certains vivent dans des dialogues de PNJ). Quand le site ne sait pas, il le dit et renvoie vers une soluce.
5. **Bon citoyen.** On s'appuie sur les API communautaires sans les charger, on crédite, on renvoie du trafic vers les fansites au lieu de les copier.

**Utilisateur cible.** Joueur Dofus 3, mono ou multi-personnages, souvent sur téléphone à côté du jeu. Premier utilisateur : Marc (reprise de zéro sur serveur monocompte, plusieurs classes à monter) — le **multi-personnage est un besoin de départ**, pas une option.

## 2. Glossaire

| Terme | Sens dans ce projet |
|---|---|
| **Objectif** (`Goal`) | Ce que le joueur veut atteindre : obtenir un objet, finir un succès, finir une quête. |
| **Nœud** (`Node`) | Élément cochable du graphe : une quête ou un succès. |
| **Prérequis** (`Requirement`) | Expression booléenne issue d'un critère du jeu : quêtes/succès à avoir finis, niveau, métier, alignement, classe, objet possédé… |
| **Plan** | Résultat du moteur pour un objectif et un personnage : nœuds ordonnés + statuts + besoins + conditions + prochaine action. |
| **Besoin** (`Need`) | Ce qu'il faut réunir ou affronter : objets, monstres, donjons. |
| **Condition** | Exigence de profil : niveau, niveau de métier, alignement, classe. |
| **Fait / Déduit** | *Fait* = coché explicitement. *Déduit* = impliqué par une autre coche (prérequis obligatoire d'un nœud fait). |
| **Point de choix** | Prérequis en « OU » : plusieurs branches possibles, une seule nécessaire. |
| **Override** | Correction ou enrichissement manuel versionné, appliqué au snapshot à la compilation. |
| **Dataset** | Données de jeu compilées, servies en statique dans `public/data/`. |

## 3. Parcours utilisateur

- **P1 — Premier lancement.** Création d'un personnage (nom, classe, niveau ; alignement et métiers facultatifs). Choix d'un premier objectif dans le catalogue.
- **P2 — « Je veux ce Dofus ».** Le joueur choisit un Dofus. Le site trouve la ou les quêtes/succès qui le donnent, déroule les prérequis, affiche le plan : X quêtes dont Y faites, prochaine quête disponible, objets à réunir, niveau à atteindre, donjons à prévoir.
- **P3 — Au fil du jeu.** Le joueur coche une quête terminée ; statuts, besoins et prochaine action se mettent à jour instantanément.
- **P4 — « J'ai déjà fait plein de choses ».** Le joueur coche la dernière quête faite d'une chaîne : tous ses prérequis obligatoires passent en *déduit*. Un message indique combien, avec *Annuler*.
- **P5 — Préparer les objets.** Onglet « À réunir » : quantités restantes, quantité déjà possédée saisissable, d'où vient chaque objet (drop, craft, récolte, récompense d'une quête du plan).
- **P6 — Plusieurs personnages.** Bascule de personnage en un geste ; objectifs, coches, inventaire et choix sont propres à chaque personnage.
- **P7 — Ne rien perdre.** Export / import JSON de toute la progression.

**Exemple réel de forme de plan.** La quête 1329 exige 28 quêtes finies **et** une parmi trois (710 / 711 / 1316, dont les critères propres dépendent de l'alignement : `Ps=1`, `Ps=2`, ni l'un ni l'autre). Le moteur doit donc gérer : une longue conjonction, un point de choix, et la résolution de ce choix par le profil du personnage.

## 4. Périmètre

**MVP (jalons M0 → M3)** : personnages multiples · objectifs de type objet / succès / quête · catalogue « Dofus » · plan ordonné avec statuts · propagation des coches · besoins en objets (avec possédé), monstres, donjons · conditions de profil · points de choix · persistance locale, export/import, annulation · liens sortants DofusDB.

**Ensuite (M4 → M5)** : saisie en masse et recherche · fiches quête/succès navigables (prérequis ↔ débloque) · overrides et signalement d'erreurs de données · liens vers soluces · PWA hors-ligne.

**Plus tard, non planifié** : décomposition récursive des crafts · objectifs « métier niveau N » · groupes de quêtes à mener en parallèle et itinéraires par zone · comptes et synchro multi-appareils · autres langues · contributions communautaires aux overrides.

**Exclu** : voir `CLAUDE.md` (« Hors périmètre »).

## 5. Modèle de domaine

Types de référence pour `src/core/types.ts`. Les noms DOIVENT être repris ; les champs PEUVENT être étendus si M1 révèle des données utiles.

```ts
// ---------- Identifiants ----------
type QuestId = number;  type AchievementId = number;  type ItemId = number;
type MonsterId = number; type DungeonId = number;     type JobId = number;  type BreedId = number;
type NodeKey = `q:${QuestId}` | `a:${AchievementId}`;
type AlignmentSide = 0 | 1 | 2;              // 1 Bonta, 2 Brâkmar ✅ ; 0 = neutre est NOTRE convention : le jeu écrit « Ps!1&Ps!2 »

// ---------- Prérequis ----------
type Requirement =
  | { t: 'all'; of: Requirement[] }
  | { t: 'any'; of: Requirement[] }
  | { t: 'not'; of: Requirement }
  | { t: 'questDone'; id: QuestId }
  | { t: 'achievementDone'; id: AchievementId }
  | { t: 'level'; min: number }                          // « PL>109 » → min = 110
  | { t: 'jobLevel'; jobId: JobId; min: number }
  | { t: 'alignment'; side: AlignmentSide }
  | { t: 'breed'; id: BreedId }
  | { t: 'hasItem'; itemId: ItemId; qty: number }
  | { t: 'context'; key: string; raw: string }           // vrai côté jeu mais non pilotable par un plan (événement, carte, abonnement…)
  | { t: 'unknown'; raw: string };                       // non interprété : jamais bloquant, toujours affichable

// ---------- Quêtes ----------
interface Quest {
  id: QuestId; name: string; categoryId: number | null;
  levelMin: number; levelMax: number; isDungeonQuest: boolean;
  isRepeatable: boolean | null; isPartyQuest: boolean | null;   // ⚠️ selon disponibilité
  start: Requirement;                                           // startCriterion parsé (+ overrides)
  steps: QuestStep[];
  rewards: Reward;
  flags: { avoidable?: boolean; timeGated?: boolean; note?: string };   // overrides uniquement
}
interface QuestStep { id: number; name: string; optimalLevel: number | null; objectives: Objective[] }

type Objective =
  | { t: 'bringItem'; itemId: ItemId; qty: number; npcId: number | null }     // consommé
  | { t: 'showItem';  itemId: ItemId; qty: number; npcId: number | null }     // non consommé
  | { t: 'useItem';   itemId: ItemId; qty: number }
  | { t: 'killMonster'; monsterId: MonsterId; qty: number; singleFight: boolean }
  | { t: 'talkTo'; npcId: number }
  | { t: 'goTo'; mapId: number | null; subareaId: number | null }
  | { t: 'other'; typeId: number; text: string };                             // type non mappé : texte rendu tel quel

// ---------- Succès ----------
interface Achievement {
  id: AchievementId; name: string; description: string; categoryId: number;
  points: number | null; level: number | null;                  // ⚠️ selon disponibilité
  objectives: { id: number; name: string; req: Requirement }[];
  rewards: Reward;
  dbNeed: { items: [ItemId, number][]; quests: QuestId[]; achievements: AchievementId[] } | null; // champ `need` de DofusDB, sert d'oracle de test
}

interface Reward {
  items: { itemId: ItemId; qty: number }[];
  titles: number[]; ornaments: number[]; emotes: number[]; spells: number[];
}

// ---------- Objectifs et plan ----------
type Goal =
  | { t: 'item'; itemId: ItemId }
  | { t: 'achievement'; id: AchievementId }
  | { t: 'quest'; id: QuestId };

type NodeStatus = 'done' | 'implied' | 'available' | 'blocked';
type BlockReason =
  | { t: 'node'; key: NodeKey } | { t: 'level'; min: number } | { t: 'jobLevel'; jobId: JobId; min: number }
  | { t: 'alignment'; side: AlignmentSide } | { t: 'breed'; id: BreedId } | { t: 'item'; itemId: ItemId; qty: number };

interface PlanNode {
  key: NodeKey; status: NodeStatus; blockedBy: BlockReason[];
  dependsOn: NodeKey[]; unlocks: NodeKey[];                      // limités au plan
}
interface ChoicePoint { id: string; owner: NodeKey; branches: Requirement[]; chosen: number; chosenBy: 'progress' | 'user' | 'profile' | 'default' }

interface ItemNeed {
  itemId: ItemId; toAcquire: number; owned: number; remaining: number;
  usedBy: { key: NodeKey; qty: number; consumed: boolean }[];
  providedBy: { key: NodeKey; qty: number }[];                   // récompenses de nœuds du plan
  isQuestItem: boolean;                                          // objet interne à une quête, masqué par défaut
}
interface MonsterNeed { monsterId: MonsterId; qty: number; singleFightMax: number; usedBy: NodeKey[] }
interface DungeonNeed { dungeonId: DungeonId; usedBy: NodeKey[] }

interface Plan {
  goal: Goal;
  nodes: PlanNode[];                                             // ordonnés, prérequis avant dépendants
  choicePoints: ChoicePoint[];
  needs: { items: ItemNeed[]; monsters: MonsterNeed[]; dungeons: DungeonNeed[] };
  conditions: { level: number | null; jobs: { jobId: JobId; min: number }[]; alignment: AlignmentSide | null; breed: BreedId | null; context: string[] };
  progress: { done: number; total: number };                     // done inclut implied
  nextActions: NodeKey[];                                        // nœuds 'available', dans l'ordre du plan
  issues: DataIssue[];
}
type DataIssue =
  | { t: 'cycle'; path: NodeKey[] } | { t: 'missingNode'; key: NodeKey; referencedBy: NodeKey }
  | { t: 'unknownCriterion'; raw: string; owner: NodeKey } | { t: 'noSourceForItem'; itemId: ItemId };
```

## 6. Moteur (`src/core`)

### 6.1 Des critères aux prérequis

- Le parseur est en **deux étages**. (1) *Syntaxe* : `parseCriterionSyntax(raw) → CriterionAst`, soit `{ k: 'and' | 'or', items }` ou `{ k: 'atom', key, op, args: number[], raw }` — livré dès M1, car `data:report` en dépend. (2) *Sémantique* : `toRequirement(ast) → Requirement` — livré en M2. `parseCriterion` est la composition des deux.
- L'étage syntaxique DOIT accepter la grammaire décrite dans `DATA_SOURCES.md` §4 et réussir sur **tous** les vecteurs de test du §5.
- Table de correspondance clé → `Requirement` dans un seul fichier (`criteria-map.ts`). Seules les clés marquées « moteur » dans `DATA_SOURCES.md` produisent des feuilles typées ; les clés « contexte » produisent `context` ; le reste produit `unknown`.
- L'opérateur `!` produit `not`. Deux cas à distinguer :
  - `not` autour d'une feuille de **profil** (`Ps!1`, `PG!…`) : c'est une condition de profil comme une autre, évaluable (le neutre s'écrit `Ps!1&Ps!2` ✅) ;
  - `not` autour d'un **état de quête** (`Qf!216`) : c'est une **exclusion mutuelle** entre quêtes. Jamais bloquant pour le plan, mais DOIT être affiché (« incompatible avec … »). Les `Qa!…` (quête en cours) sont rangés en `context` mais s'affichent de la même façon.
- `PL<n` (plafond de niveau, quêtes événementielles) → `context` au MVP.
- Simplification DEVRAIT être appliquée : aplatissement des `all`/`any` imbriqués, suppression des doublons, `all` d'un seul élément → l'élément.
- `npm run data:report` DOIT lister chaque clé rencontrée avec son nombre d'occurrences et la part de critères entièrement interprétés.

### 6.2 Graphe

- Nœuds : toutes les quêtes et tous les succès du dataset.
- Arêtes : pour un nœud N, chaque feuille `questDone` / `achievementDone` atteignable dans `N.start` (quête) ou dans les `req` de ses objectifs (succès) crée une arête *prérequis → N*, étiquetée **obligatoire** si le chemin jusqu'à la feuille ne traverse que des `all`, **alternative** s'il traverse un `any`.
- L'index inverse (« débloque ») DOIT être construit une fois et mémoïsé.

### 6.3 Progression effective

```
explicitDone  = coches du joueur (quêtes + succès)
impliedDone   = fermeture transitive des arêtes OBLIGATOIRES en remontant depuis explicitDone
effectiveDone = explicitDone ∪ impliedDone
```

- Les arêtes *alternatives* ne propagent rien (on ne sait pas quelle branche a été prise), sauf si une seule branche du `any` est compatible avec le profil.
- Un succès dont **tous** les objectifs sont évaluables et satisfaits par `effectiveDone` PEUT être présenté comme *déduit* ; dès qu'un objectif est `context`/`unknown`, seul le joueur peut le cocher.
- Décocher un nœud *déduit* est impossible : l'UI explique de quelle coche il découle.

### 6.4 Résolution d'un objectif

1. **Racines.** `quest` / `achievement` → le nœud. `item` → les nœuds qui le donnent en récompense (champ `questsThatReward` des objets ✅, récompenses de succès). Plusieurs sources → point de choix. Aucune → `DataIssue noSourceForItem` et plan vide avec explication.
2. **Expansion** en profondeur depuis les racines, à travers les prérequis :
   - `all` → toutes les branches ; `any` → une seule branche (voir 6.7) ;
   - `questDone` / `achievementDone` → ajoute le nœud et déroule ses propres prérequis ;
   - feuilles de profil (`level`, `jobLevel`, `alignment`, `breed`, `hasItem`) → rattachées au nœud porteur ;
   - `not` sur état de quête, `context`, `unknown` → notes du nœud, jamais de nœud, jamais bloquant (un `not` sur feuille de profil suit la règle des feuilles de profil).
3. **Garde-fous.** Ensemble de visite ; cycle détecté → arête ignorée + `DataIssue cycle`. Référence vers un ID absent → `missingNode`, le nœud porteur reste dans le plan.
4. **Statuts.** `done` (explicite) › `implied` › `available` (tous les prérequis obligatoires et la branche choisie sont dans `effectiveDone`, et aucune condition de profil **renseignée** n'échoue) › `blocked` avec la liste des raisons.
   Règle : **une information de profil non renseignée n'est jamais bloquante** ; elle apparaît seulement dans les conditions.

### 6.5 Ordonnancement

Tri topologique (Kahn) avec file de priorité. Clé de départage, dans l'ordre : `orderHint` d'override · `levelMin` croissant · `categoryId` · `id`. L'ordre DOIT être déterministe et stable d'un recalcul à l'autre (cocher un nœud ne doit pas mélanger la liste).

### 6.6 Besoins

**Objets — par simulation d'inventaire.** On parcourt les nœuds **non faits** dans l'ordre du plan, objet par objet :

```
held = owned ; toAcquire = 0
pour chaque événement dans l'ordre :
  récompense(qty)      → held += qty
  bringItem/useItem    → si held < qty : toAcquire += qty - held ; held = qty ;   puis held -= qty
  showItem / hasItem   → si held < qty : toAcquire += qty - held ; held = qty
remaining = toAcquire
```

Cette règle évite de compter deux fois un objet seulement *montré*, et ne demande pas de farmer un objet qu'une quête précédente du plan offre.
Les objets de type « objet de quête » ⚠️ sont marqués `isQuestItem` et masqués par défaut (ils s'obtiennent en général pendant la quête).
Pour chaque objet, le dataset fournit ce qu'on sait de sa provenance : monstres (taux par grade), recette (un niveau d'ingrédients, dépliable à la demande), zones de récolte. Ce qu'on ne sait pas (achat PNJ, HDV) n'est pas inventé.

**Monstres.** Somme des `qty` par monstre ; `singleFightMax` = plus grande quantité exigée en un seul combat.
**Donjons.** Un donjon est « à prévoir » si un nœud non fait est `isDungeonQuest` ou exige un monstre listé dans ce donjon ⚠️.
**Conditions.** `level` = max des minima des nœuds non faits ; idem par métier ; alignement/classe si exigés.

### 6.7 Points de choix

Branche retenue, par priorité : (1) une branche déjà satisfaite par `effectiveDone` ; (2) le choix enregistré du joueur ; (3) l'unique branche compatible avec le profil (en évaluant le `start` des quêtes de chaque branche — cas 710/711/1316) ; (4) à défaut, la branche au moins de nœuds restants, égalité → la première. L'UI DOIT montrer le choix, sa raison (`chosenBy`) et permettre d'en changer.

### 6.8 API publique du cœur

```ts
parseCriterionSyntax(raw: string): Result<CriterionAst, ParseError>   // M1
toRequirement(ast: CriterionAst): Requirement                          // M2 — ne peut pas échouer : au pire 'unknown'
parseCriterion(raw: string): Result<Requirement, ParseError>          // composition des deux
buildGraph(dataset: Dataset): Graph                                  // mémoïsé par version de dataset
computeEffectiveDone(graph: Graph, character: Character): EffectiveDone
resolvePlan(graph: Graph, goal: Goal, character: Character): Plan
listGoalCatalog(dataset: Dataset): GoalPreset[]                      // ex. tous les objets de type « Dofus » ayant une source
```

### 6.9 Performance

Ordre de grandeur : ~2 000 quêtes ✅ et quelques milliers de succès. Tout tient en mémoire. Cibles : `buildGraph` < 300 ms et `resolvePlan` < 50 ms sur un téléphone milieu de gamme ; recalcul complet à chaque coche, sans état incrémental.

## 7. Overrides (`data/overrides/`)

Les données du jeu ne disent pas tout et contiennent des scories. Une couche manuelle, versionnée, est fusionnée par `data:build`. Un fichier JSON par sujet, chaque entrée DOIT porter `reason` et `source` (lien ou « testé en jeu le … »).

```jsonc
// data/overrides/quests.json
{
  "<questId>": {
    "addRequires":    [{ "t": "questDone", "id": 0 }],   // prérequis absent des données (ex. caché dans un dialogue PNJ)
    "removeRequires": ["Qf=0"],                         // critère brut erroné à ignorer
    "orderHint": 120,                                   // départage dans l'ordonnancement
    "flags": { "avoidable": true, "timeGated": true, "note": "texte court affiché sur la ligne" },
    "reason": "…", "source": "…"
  }
}
```

Autres fichiers prévus : `achievements.json` (même forme), `goals.json` (objectifs mis en avant, regroupements), `links.json` (liens sortants par nœud), `items.json` (forcer/retirer `isQuestItem`).
`data:build` DOIT échouer si un override vise un ID absent du snapshot, et `data:report` DOIT lister les overrides devenus inutiles (la donnée amont a été corrigée).

## 8. Progression et persistance (`src/state`)

```ts
interface AppStateV1 {
  schemaVersion: 1;
  lastDatasetVersion: string;                 // version de jeu du dernier dataset chargé
  activeCharacterId: string | null;
  characters: Character[];
}
interface Character {
  id: string;                                 // uuid
  name: string; breedId: BreedId | null; level: number | null;
  alignment: AlignmentSide | null; jobs: Record<JobId, number>; serverName: string | null;
  doneQuests: QuestId[]; doneAchievements: AchievementId[];      // coches EXPLICITES uniquement
  inventory: Record<ItemId, number>;                             // quantités possédées saisies
  goals: Goal[]; choices: Record<string, number>;                // ChoicePoint.id → branche
  updatedAt: string;                                             // ISO 8601
}
```

- Stockage : `localStorage`, clé `roadbook:state:v1`, écriture différée (debounce ~300 ms), derrière une interface `ProgressStore` pour pouvoir passer à IndexedDB ou à une synchro distante sans toucher au reste.
- Toute lecture DOIT être validée ; état illisible → on ne l'écrase pas, on propose export brut + réinitialisation.
- Migrations : une fonction pure par saut de `schemaVersion`, testée.
- Changement de version du dataset : les IDs du jeu sont stables ; un ID coché devenu introuvable est **conservé** et signalé, jamais supprimé en silence.
- Export / import JSON (fichier), avec fusion « le plus récent gagne » par personnage à l'import.
- Annulation : un niveau d'undo sur la dernière modification de progression (suffisant pour la propagation accidentelle).
- Pas de données personnelles, pas de cookie, pas de traceur.

## 9. Interface (`src/ui`)

Mobile d'abord (380 px), utilisable au pouce, lisible à côté du jeu ; s'élargit proprement sur bureau. Thème clair et sombre.

| Écran | Contenu |
|---|---|
| **Accueil** | Personnage actif (bascule rapide). Pour chaque objectif : barre de progression, prochaine action, raccourci vers le plan. État vide : invitation à créer un personnage puis choisir un objectif. |
| **Catalogue d'objectifs** | Onglets Dofus / Succès / Quêtes, recherche par nom. Une carte par objectif, avec progression si déjà suivi. |
| **Plan d'un objectif** | En-tête : nom, progression, carte « prochaine action ». Onglets : **Marche à suivre** · **À réunir** · **Conditions** · **Choix**. |
| **Fiche quête / succès** | Étapes et objectifs, prérequis, « débloque », récompenses, notes d'override, liens sortants. Coche depuis la fiche. |
| **Personnages** | Créer, modifier, supprimer (avec confirmation), exporter, importer. |

**Marche à suivre.** Liste ordonnée. Chaque ligne : case à cocher · nom · niveau · pastilles (donjon, groupe, alignement, évitable, critère non interprété) · statut. Ligne *bloquée* : raison principale en clair (« nécessite : … », « niveau 110 requis »). Filtres : masquer le fait, seulement le disponible.

**Règles d'interaction.**
- Cocher un nœud qui implique N prérequis → message « N quêtes prérequises marquées comme faites · Annuler ».
- Nœud *déduit* : case cochée et verrouillée, libellé « déduit de : … ».
- Décocher un nœud explicite : les nœuds qui n'étaient déduits que de lui redeviennent non faits — l'annoncer.
- Toute action de progression répond en < 100 ms perçus ; pas de rechargement de page.

**À réunir.** Par objet : restant / total, champ « j'en ai » (pas à pas + saisie directe), utilisé par (quêtes), provenance connue, bascule « afficher les objets de quête ». Section monstres (dont « en un seul combat ») et donjons.

**Conditions.** Niveau requis vs niveau du personnage, métiers, alignement, classe, puis la liste des critères de contexte et non interprétés, affichés tels quels avec une phrase d'explication.

**Choix.** Un bloc par point de choix : branches, branche retenue, pourquoi, bouton pour changer.

**Transparence.** Si `plan.issues` n'est pas vide, un bandeau discret « données incomplètes pour cet objectif » ouvre le détail et le lien vers la soluce.

## 10. Liens sortants et attribution

- Chaque fiche DOIT lier la page DofusDB correspondante ⚠️ (motif d'URL à vérifier, voir `DATA_SOURCES.md` §2.6).
- Lien vers la soluce Dofus pour les Noobs quand une correspondance existe (`DATA_SOURCES.md` §7) — **seulement après accord de l'auteur du mapping**. Sinon, pas de lien deviné.
- Pied de page : sources de données créditées (DofusDB), mention « Dofus est une marque d'Ankama. Site non officiel, sans lien avec Ankama. », lien vers le dépôt.
- Images : aucune au MVP, ou icônes servies depuis notre propre hébergement après accord ; **pas de hotlink** vers l'API d'images de DofusDB sans leur feu vert.

## 11. Exigences non fonctionnelles

- **Poids.** JS initial ≤ 80 Ko gzip hors données. Dataset découpé ; cible ⚠️ ≤ 1,5 Mo gzip pour ce qui est nécessaire au premier plan, le reste chargé à la demande. `data:report` affiche les tailles.
- **Hors-ligne.** Une fois le dataset chargé, tout fonctionne sans réseau (cache HTTP au MVP, service worker à M5).
- **Robustesse.** Aucune exception non rattrapée ne doit vider l'écran ; frontière d'erreur avec export de secours de la progression.
- **Internationalisation.** Interface en français. Le code ne DOIT pas concaténer de phrases ; la langue du dataset est un paramètre de `data:build` (français seul au MVP).
- **Accessibilité.** Voir `CLAUDE.md`.

## 12. Jalons et critères d'acceptation

**M0 — Socle.** Dépôt initialisé, outillage complet, CI verte, page vide déployée.
✔ `npm run typecheck && npm run lint && npm test && npm run build` passent en local et en CI.

**M1 — Exploration des données et snapshot.** Lever les ⚠️ de `DATA_SOURCES.md` contre l'API réelle, écrire `docs/DATA_NOTES.md` (endpoints, champs, types d'objectifs de quête, identifiant du type d'objet « Dofus », volumes, surprises), implémenter `data:snapshot` (poli, reprenable, mis en cache) et un premier `data:build`.
✔ Snapshot complet des ressources listées en `DATA_SOURCES.md` §6 sans dépasser le budget de requêtes.
✔ `parseCriterionSyntax` réussit sur tous les vecteurs de `DATA_SOURCES.md` §5.
✔ `data:report` : ≥ 95 % des `startCriterion` analysés sans erreur de syntaxe ; liste des clés inconnues.
✔ Choix, d'après les données, de deux tranches verticales : le Dofus dont le plan compte le moins de nœuds, et la quête 1329 (cas long avec point de choix). Fixtures extraites.

**M2 — Moteur.** Étage sémantique du parseur, graphe, progression effective, résolution, ordonnancement, besoins.
✔ `toRequirement` : chaque vecteur de `DATA_SOURCES.md` §5 produit le `Requirement` attendu (attendus écrits à la main et relus par Marc).
✔ Sur la fixture 1329 : 28 prérequis obligatoires directs + 1 point de choix à 3 branches ; la branche suit l'alignement du personnage ; cocher 1329 déduit ses 28 prérequis obligatoires et leurs propres prérequis.
✔ Oracle : pour les succès dotés d'un champ `need`, l'écart entre nos quêtes/objets calculés et `need` est listé par `data:report` et expliqué dans `DATA_NOTES.md`.
✔ Simulation d'inventaire couverte par des cas synthétiques `FAKE` (montré puis donné, donné puis montré, récompense intermédiaire, quantité possédée).
✔ Aucun cycle ni ID manquant ne fait échouer `resolvePlan` sur l'ensemble du dataset (test de fumée : résoudre chaque quête comme objectif).

**M3 — Interface MVP.** Personnages, catalogue Dofus, écran plan complet (4 onglets), persistance, export/import, undo.
✔ Parcours P1 → P7 réalisables au pouce sur 380 px.
✔ Rechargement de page : progression intacte. Import d'un export : état identique.

**M4 — Confort.** Recherche globale, fiches navigables (prérequis ↔ débloque), objectifs succès et quête dans le catalogue, saisie en masse par catégorie.

**M5 — Finitions.** Overrides outillés (validation, rapport), liens soluces si accord obtenu, PWA hors-ligne, page « À propos / sources », passe accessibilité et performance.

## 13. Décisions à valider et questions ouvertes (pour Marc)

| # | Sujet | Proposition | Statut |
|---|---|---|---|
| D1 | Nom du projet | « Roadbook » en attendant ; éviter les marques d'Ankama dans le nom et le domaine | à décider |
| D2 | UI | Preact + signals plutôt que vanilla : beaucoup d'état dérivé affiché à plusieurs endroits | à valider |
| D3 | Hébergement | GitHub Pages (simple, gratuit) ; Cloudflare Pages si besoin d'en-têtes de cache fins | à valider |
| D4 | Dataset dans git ? | Oui au début (diffs lisibles entre versions du jeu) ; artefact CI si le poids gêne | à valider |
| D5 | Contact DofusDB | Présenter le projet sur leur Discord avant mise en ligne ; demander leurs limites d'usage et leur position sur les images | à faire par Marc |
| D6 | Mapping soluces | Demander à l'auteur de `DofusNoobsIdentifier` l'autorisation de réutiliser son mapping | à faire par Marc |
| Q1 | Succès liés au compte | Si les données exposent l'information ⚠️, stocker ces coches au niveau du compte plutôt que du personnage | après M1 |
| Q2 | « Forcer non fait » | Permettre au joueur de contredire une déduction quand un prérequis des données est faux ? | après M3 |
| Q3 | Quêtes répétables et événementielles | Les exclure des plans par défaut ? Les afficher à part ? | après M1 |
| Q4 | Variantes d'alignement | Un personnage neutre qui vise un objectif exigeant un alignement : proposer le choix ou bloquer ? | après M2 |
