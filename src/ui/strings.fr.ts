/**
 * Tous les textes d'interface, en français. Le code ne concatène jamais de phrases :
 * une phrase à trou est une fonction ici, qui gère aussi le pluriel.
 */
const plural = (n: number, one: string, many: string): string => (n > 1 ? many : one);

export const fr = {
  app: {
    name: 'Roadbook',
    tagline: 'Choisis un objectif, coche ce que tu as fait, suis la marche à suivre.',
    skipToContent: 'Aller au contenu',
  },
  nav: {
    label: 'Navigation principale',
    home: 'Accueil',
    catalog: 'Objectifs',
    characters: 'Personnages',
    about: 'À propos',
    search: 'Recherche',
    bulk: 'Saisie rapide',
  },
  search: {
    title: 'Recherche',
    label: 'Rechercher une quête, un succès ou un Dofus',
    placeholder: 'Nom, même partiel',
    hint: 'Tape au moins deux caractères. Les accents et la casse ne comptent pas.',
    none: 'Aucun résultat.',
    count: (n: number, limited: boolean) =>
      limited
        ? `${n} premiers résultats : précise ta recherche pour en voir moins.`
        : `${n} ${plural(n, 'résultat', 'résultats')}`,
    kinds: { goal: 'Dofus', quest: 'Quêtes', achievement: 'Succès' } as Record<string, string>,
    openPlan: 'Ouvrir le plan',
    openSheet: 'Voir la fiche',
  },
  bulk: {
    title: 'Saisie rapide',
    intro:
      'Coche d’un coup ce que tu as déjà fait. Cocher une quête marque aussi ses prérequis obligatoires comme faits.',
    needCharacter: 'Crée d’abord un personnage pour enregistrer ta progression.',
    kind: 'Type',
    quests: 'Quêtes',
    achievements: 'Succès',
    category: 'Catégorie',
    chooseCategory: 'Choisis une catégorie',
    categoryOption: (name: string, count: number) => `${name} (${count})`,
    uncategorized: 'Sans catégorie',
    showSpecial: 'Afficher les quêtes événementielles et répétables',
    summary: (done: number, total: number) =>
      `${done} sur ${total} déjà faits dans cette catégorie`,
    tickAll: (n: number) => `Tout cocher (${n})`,
    untickAll: (n: number) => `Tout décocher (${n})`,
    empty: 'Rien à afficher dans cette catégorie avec ces filtres.',
    hidden: (n: number) =>
      `${n} ${plural(n, 'quête événementielle ou répétable est masquée', 'quêtes événementielles ou répétables sont masquées')}.`,
    ticked: (ticked: number, implied: number) =>
      implied > 0
        ? `${ticked} ${plural(ticked, 'étape cochée', 'étapes cochées')}, ${implied} ${plural(implied, 'autre déduite', 'autres déduites')}.`
        : `${ticked} ${plural(ticked, 'étape cochée', 'étapes cochées')}.`,
    unticked: (n: number) => `${n} ${plural(n, 'étape décochée', 'étapes décochées')}.`,
  },
  data: {
    loading: 'Chargement des données de jeu…',
    errorTitle: 'Les données de jeu n’ont pas pu être chargées',
    errorNetwork: (file: string) =>
      `Le fichier ${file} est inaccessible. Vérifie ta connexion puis réessaie.`,
    errorInvalid: (file: string) => `Le fichier ${file} a une forme inattendue.`,
    errorFormat:
      'Les données publiées ne correspondent pas à cette version du site. Recharge la page.',
    retry: 'Réessayer',
    version: (version: string) => `Données du jeu : version ${version}`,
  },
  corrupt: {
    title: 'Ta progression enregistrée est illisible',
    detail:
      'Rien n’a été effacé ni écrasé. Tu peux télécharger le contenu brut pour le conserver, puis repartir d’un état vide.',
    reason: (reason: string) => `Détail technique : ${reason}`,
    download: 'Télécharger le contenu brut',
    reset: 'Repartir d’un état vide',
    resetConfirm: 'Confirmer : effacer et repartir à zéro',
  },
  newer: {
    title: 'Ta progression vient d’une version plus récente du site',
    detail:
      'Rien n’a été touché. Recharge la page pour récupérer la dernière version du site, qui saura la lire.',
    reload: 'Recharger la page',
    download: 'Télécharger une copie par sécurité',
  },
  storageBlocked: {
    title: 'Ta progression n’est pas enregistrée',
    detail:
      'Ce navigateur refuse d’écrire (navigation privée, stockage bloqué ou plein). Tout fonctionne, mais tout sera perdu en fermant l’onglet : exporte ta progression.',
  },
  otherTab: {
    title: 'Un autre onglet a enregistré une progression différente',
    detail: 'Pour ne rien écraser, cet onglet a cessé d’enregistrer. Choisis la version à garder.',
    adopt: 'Prendre celle de l’autre onglet',
    keep: 'Garder celle de cet onglet',
  },
  crash: {
    title: 'Une erreur inattendue est survenue',
    detail:
      'Ta progression est en sécurité dans ce navigateur. Tu peux en télécharger une copie avant de recharger.',
    download: 'Télécharger ma progression',
    reload: 'Recharger la page',
  },
  notFound: {
    title: 'Page introuvable',
    back: 'Revenir à l’accueil',
  },
  character: {
    active: 'Personnage actif',
    none: 'Aucun personnage',
    summary: (name: string, level: number | null) =>
      level === null ? name : `${name} · niveau ${level}`,
  },
  home: {
    title: 'Accueil',
    emptyTitle: 'Bienvenue',
    emptyDetail:
      'Crée un personnage, puis choisis un premier objectif : le site calcule la marche à suivre.',
    createCharacter: 'Créer un personnage',
    noGoalTitle: 'Aucun objectif suivi',
    noGoalDetail: 'Choisis un objectif dans le catalogue pour obtenir ton plan.',
    chooseGoal: 'Choisir un objectif',
    goals: 'Mes objectifs',
    progress: (done: number, total: number) =>
      `${done} sur ${total} ${plural(total, 'étape faite', 'étapes faites')}`,
    nextAction: 'Prochaine action',
    allDone: 'Objectif atteint',
    nothingAvailable: 'Aucune étape disponible pour le moment',
    openPlan: 'Ouvrir le plan',
  },
  catalog: {
    title: 'Objectifs',
    tabDofus: 'Dofus',
    tabs: { goal: 'Dofus', achievement: 'Succès', quest: 'Quêtes' } as Record<string, string>,
    tabsLabel: 'Type d’objectif',
    search: 'Rechercher un objectif',
    searchPlaceholder: 'Nom, même partiel',
    typeToSearch: 'Tape au moins deux caractères pour chercher parmi les succès ou les quêtes.',
    limited: (n: number) => `${n} premiers résultats : précise ta recherche.`,
    level: (level: number | null) => (level === null ? 'Niveau inconnu' : `Niveau ${level}`),
    follow: 'Suivre cet objectif',
    unfollow: 'Ne plus suivre',
    followed: 'Suivi',
    open: 'Ouvrir le plan',
    noResult: 'Aucun objectif ne correspond à cette recherche.',
    needCharacter: 'Crée d’abord un personnage pour suivre un objectif.',
    count: (n: number) => `${n} ${plural(n, 'objectif', 'objectifs')}`,
  },
  characters: {
    title: 'Personnages',
    create: 'Nouveau personnage',
    edit: 'Modifier',
    save: 'Enregistrer',
    cancel: 'Annuler',
    add: 'Créer le personnage',
    name: 'Nom',
    nameRequired: 'Le nom est obligatoire.',
    breed: 'Classe',
    level: 'Niveau',
    alignment: 'Alignement',
    server: 'Serveur',
    unknown: 'Non renseigné',
    alignments: { 0: 'Neutre', 1: 'Bonta', 2: 'Brâkmar' } as Record<number, string>,
    optionalHint:
      'Tout sauf le nom est facultatif : une information non renseignée ne bloque jamais un plan.',
    activate: 'Rendre actif',
    activeBadge: 'Actif',
    remove: 'Supprimer',
    removeConfirm: (name: string) => `Confirmer la suppression de ${name}`,
    stats: (quests: number, achievements: number, goals: number) =>
      `${quests} ${plural(quests, 'quête cochée', 'quêtes cochées')} · ${achievements} ${plural(achievements, 'succès coché', 'succès cochés')} · ${goals} ${plural(goals, 'objectif', 'objectifs')}`,
    backupTitle: 'Sauvegarde',
    backupDetail:
      'Ta progression ne vit que dans ce navigateur. Exporte-la pour la conserver ou la déplacer.',
    exportAll: 'Exporter toute la progression',
    importFile: 'Importer un fichier',
    importDone: (added: number, replaced: number, kept: number, ambiguous: number) =>
      `Import terminé : ${added} ${plural(added, 'ajouté', 'ajoutés')}, ${replaced} ${plural(replaced, 'mis à jour', 'mis à jour')}, ${kept} ${plural(kept, 'conservé tel quel', 'conservés tels quels')}.` +
      (ambiguous > 0
        ? ` ${ambiguous} ${plural(ambiguous, 'personnage sans date exploitable a été conservé tel quel', 'personnages sans date exploitable ont été conservés tels quels')}.`
        : ''),
    importError: (reason: string) => `Import impossible : ${reason}`,
    empty: 'Aucun personnage pour le moment.',
  },
  about: {
    title: 'À propos et sources',
    what: 'Roadbook est un site de fan, non commercial. Il ne se connecte jamais au jeu : la progression est saisie à la main et reste dans ton navigateur.',
    data: 'Les données de jeu viennent d’un instantané de DofusDB, compilé hors ligne. Le site ne contacte aucun service tiers.',
    uncertainty:
      'Les données du jeu n’exposent pas tous les prérequis : certains vivent dans des dialogues. Quand le site ne sait pas, il l’indique au lieu d’inventer.',
  },
  footer: {
    // Formulation exigée telle quelle par la licence de l'API DofusDB (LPNC-IA 1.0, §3.1).
    dataCredit: 'Données issues de DofusDB. Utilisation soumise à la LPNC-IA 1.0.',
    dataCreditUrl: 'https://dofusdb.fr',
    trademark: 'Dofus est une marque d’Ankama. Site non officiel, sans lien avec Ankama.',
    repository: 'Code source',
    repositoryUrl: 'https://github.com/devmarcpro/dofushelper',
  },
  plan: {
    unknownGoal: 'Cet objectif est introuvable dans les données.',
    noSource:
      'Les données du jeu ne disent pas comment obtenir cet objet : aucun plan ne peut être calculé.',
    needCharacter:
      'Crée un personnage pour cocher ta progression. Le plan ci-dessous est calculé sans profil.',
    tabs: {
      steps: 'Marche à suivre',
      gather: 'À réunir',
      conditions: 'Conditions',
      choices: 'Choix',
    } as Record<string, string>,
    tabsLabel: 'Sections du plan',
    progress: (done: number, total: number) =>
      `${done} sur ${total} ${plural(total, 'étape faite', 'étapes faites')}`,
    nextAction: 'Prochaine action',
    allDone: 'Objectif atteint : tout est fait.',
    nothingAvailable: 'Aucune étape n’est disponible : regarde les raisons de blocage ci-dessous.',
    hideDone: 'Masquer ce qui est fait',
    onlyAvailable: 'Seulement le disponible',
    emptyFilter: 'Aucune étape ne correspond à ces filtres.',
    level: (level: number) => `niv. ${level}`,
    status: {
      done: 'Fait',
      implied: 'Déduit',
      available: 'Disponible',
      blocked: 'Bloqué',
    } as Record<string, string>,
    impliedBy: (name: string) => `Déduit de : ${name}`,
    impliedLocked: 'Pour le décocher, décoche l’étape dont il découle.',
    badges: {
      dungeon: 'Donjon',
      party: 'Groupe',
      event: 'Événement',
      repeatable: 'Répétable',
      achievement: 'Succès',
      uninterpreted: 'Critère non interprété',
    },
    blockedNode: (name: string) => `Nécessite : ${name}`,
    blockedLevel: (level: number) => `Niveau ${level} requis`,
    blockedJob: (job: string, level: number) => `${job} niveau ${level} requis`,
    blockedAlignment: (side: string) => `Alignement requis : ${side}`,
    blockedNotAlignment: (side: string) => `Incompatible avec l’alignement ${side}`,
    blockedBreed: (breed: string) => `Classe requise : ${breed}`,
    blockedNotBreed: (breed: string) => `Incompatible avec la classe ${breed}`,
    incompatibleWith: (names: string) => `Incompatible avec : ${names}`,
    tickedImplied: (n: number) =>
      `${n} ${plural(n, 'étape prérequise marquée comme faite', 'étapes prérequises marquées comme faites')}.`,
    tickedOne: 'Étape marquée comme faite.',
    unticked: (n: number) =>
      n > 0
        ? `Étape décochée. ${n} ${plural(n, 'étape déduite redevient', 'étapes déduites redeviennent')} à faire.`
        : 'Étape décochée.',
    issuesTitle: 'Données incomplètes pour cet objectif',
    issuesDetail:
      'Le plan reste utilisable, mais certaines informations du jeu manquent ou ne sont pas interprétées.',
    issueCycle: (names: string) => `Boucle de prérequis ignorée : ${names}`,
    issueMissing: (key: string) => `Prérequis absent des données : ${key}`,
    issueUnknown: (raw: string, owner: string) => `Critère non interprété sur ${owner} : ${raw}`,
    openSheet: 'Voir la fiche',
  },
  choices: {
    none: 'Ce plan ne comporte aucun choix.',
    intro:
      'Quand le jeu accepte plusieurs chemins, un seul suffit. Voici celui que le plan retient, et pourquoi.',
    owner: (name: string) => `Pour : ${name}`,
    goalOwner: 'Pour obtenir l’objectif',
    branch: (index: number) => `Chemin ${index}`,
    chosenBy: {
      progress: 'Retenu parce que tu l’as déjà fait.',
      user: 'Retenu parce que tu l’as choisi.',
      profile: 'Retenu parce que c’est le seul compatible avec ton profil.',
      default:
        'Retenu par défaut : c’est le chemin le plus court. Renseigne ton profil ou choisis toi-même.',
    } as Record<string, string>,
    auto: 'Laisser le site choisir',
    otherConditions: 'autres conditions',
  },
  gather: {
    itemsTitle: 'Objets',
    noItems: 'Aucun objet à réunir pour les étapes restantes.',
    showQuestItems: 'Afficher les objets de quête',
    questItem: 'Objet de quête',
    remaining: (remaining: number) =>
      remaining === 0 ? 'Rien à acquérir' : `Reste à acquérir : ${remaining}`,
    owned: 'J’en ai',
    decrease: (name: string) => `Retirer un exemplaire de ${name}`,
    increase: (name: string) => `Ajouter un exemplaire de ${name}`,
    usedBy: 'Utilisé par',
    usedLine: (name: string, qty: number, consumed: boolean) =>
      consumed ? `${name} : ${qty} (donné)` : `${name} : ${qty} (montré)`,
    providedBy: 'Offert par une étape du plan',
    providedLine: (name: string, qty: number) => `${name} : ${qty}`,
    sources: 'Provenance connue',
    dropLine: (monster: string, min: number, max: number) =>
      min === max ? `${monster} : ${max} %` : `${monster} : ${min} à ${max} %`,
    recipe: (job: string | null) => (job ? `Recette (${job})` : 'Recette'),
    ingredientLine: (name: string, qty: number) => `${qty} × ${name}`,
    noSource: 'Provenance inconnue des données (achat, échange ou obtention pendant une quête).',
    monstersTitle: 'Monstres à affronter',
    noMonsters: 'Aucun monstre imposé par les étapes restantes.',
    monsterLine: (name: string, qty: number) => `${name} : ${qty}`,
    singleFight: (qty: number) => `dont ${qty} en un seul combat`,
    dungeonsTitle: 'Donjons à prévoir',
    noDungeons: 'Aucun donjon imposé par les étapes restantes.',
    dungeonLine: (name: string, level: number | null) =>
      level === null ? name : `${name} (niveau ${level})`,
  },
  conditions: {
    none: 'Aucune condition de profil pour les étapes restantes.',
    level: (required: number, current: number | null) =>
      current === null
        ? `Niveau ${required} requis (ton niveau n’est pas renseigné).`
        : `Niveau ${required} requis, tu es niveau ${current}.`,
    job: (job: string, required: number, current: number | null) =>
      current === null
        ? `${job} niveau ${required} requis (non renseigné).`
        : `${job} niveau ${required} requis, tu es niveau ${current}.`,
    alignment: (side: string) => `Alignement requis : ${side}.`,
    breed: (breed: string) => `Classe requise : ${breed}.`,
    ok: 'Rempli',
    missing: 'À atteindre',
    unknown: 'À vérifier',
    contextTitle: 'Conditions de contexte et critères non interprétés',
    contextDetail:
      'Ces conditions existent dans le jeu mais un plan ne peut pas les piloter (événement, carte, abonnement…) ou leur sens n’est pas encore établi. Elles sont affichées telles quelles et ne bloquent jamais.',
  },
  sheet: {
    quest: 'Quête',
    achievement: 'Succès',
    notFound: 'Cette fiche est introuvable dans les données.',
    done: 'Fait',
    steps: 'Étapes et objectifs',
    noSteps: 'Les données ne détaillent aucune étape.',
    objectives: 'Objectifs',
    missingObjectives: (n: number) =>
      `${n} ${plural(n, 'objectif est absent', 'objectifs sont absents')} des données du jeu.`,
    requires: 'Prérequis obligatoires',
    alternatives: 'Prérequis au choix (un seul suffit)',
    exclusions: 'Incompatible avec',
    unlocks: 'Débloque',
    none: 'Aucun',
    rewards: 'Récompenses',
    rewardLine: (name: string, qty: number) => `${qty} × ${name}`,
    rewardBand: (min: number, max: number) =>
      min === -1 && max === -1 ? 'Tous niveaux' : `Niveaux ${min} à ${max}`,
    noRewards: 'Aucun objet en récompense.',
    criteria: 'Critère du jeu',
    unknownRef: (kind: string, id: number) => `${kind} ${id}`,
  },
  toast: {
    undo: 'Annuler',
    dismiss: 'Fermer',
  },
} as const;
