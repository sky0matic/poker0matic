import type en from './en'
import flagSvg from 'flag-icons/flags/4x3/ca.svg'

export const meta = {
  flagSvg,
  nativeName: 'Français',
}

const messages = {
  app: {
    nav: {
      home: 'Accueil',
      room: 'Salle',
      roomWithName: 'Salle - {name}',
      config: 'Configuration',
    },
    selectLanguage: 'Choisir la langue',
  },
  index: {
    createRoom: 'Créer une salle',
    roomCode: 'Code de salle',
    joinRoom: 'Rejoindre la salle',
    attributions: {
      title: 'Attributions',
      casinoChip: 'Icônes de jetons de casino créées par POD Gladiator - Flaticon',
    },
  },
  config: {
    title: 'Configuration',
    noConfigAlert: 'Aucune configuration Firebase trouvée. Veuillez remplir les paramètres de votre projet Firebase ci-dessous.',
    shareUrlAlert: 'Vous pouvez charger une configuration depuis une URL partagée — demandez un lien de config à votre équipe.',
    newTeamAlert: `Nouvelle équipe ? Si personne n'a encore de projet Firebase, suivez le {link} pour commencer.`,
    setupGuide: 'guide de configuration',
    fields: {
      apiKey: 'apiKey',
      authDomain: 'authDomain',
      databaseUrl: 'databaseUrl',
      projectId: 'projectId',
      storageBucket: 'storageBucket',
      messagingSenderId: 'messagingSenderId',
      appId: 'appId',
    },
    save: 'Enregistrer',
    shareConfig: 'Partager la config',
    copiedToClipboard: 'URL de configuration copiée dans le presse-papiers',
    copyThisLink: 'Copiez ce lien',
  },
  create: {
    title: 'Créer une salle',
    yourName: 'Votre nom',
    roomName: 'Nom de la salle',
    cardDeck: 'Paquet de cartes',
    presets: {
      fibonacci: 'Fibonacci',
      modifiedFib: 'Fib modifiée',
      tshirt: 'T-Shirt',
      powersOf2: 'Puissances de 2',
    },
    addCard: 'Ajouter une carte',
    add: 'Ajouter',
    timerThresholds: 'Seuils du minuteur',
    optional: '(facultatif)',
    targetDuration: 'Durée cible (minutes)',
    targetHint: 'Le minuteur devient jaune quand atteint',
    ceilingDuration: 'Durée maximale (minutes)',
    ceilingHint: 'Le minuteur devient rouge quand atteint',
    create: 'Créer',
  },
  room: {
    revealVotes: 'Révéler les votes',
    resetVotes: 'Réinitialiser les votes',
    missingFeatures: 'Cette salle manque de fonctionnalités récentes :',
    previouslyAcknowledged: 'Fonctionnalités déjà reconnues',
    wantFeatures: `Vous voulez ces fonctionnalités ? Demandez à quelqu'un de créer une nouvelle salle.`,
    timeSinceReset: 'Temps depuis la réinitialisation : {time}',
    pastTarget: 'Durée cible dépassée pour cette salle',
    pastCeiling: `Durée maximale dépassée — envisagez une discussion d'équipe avant de réévaluer`,
    revealedAt: '(révélé à {time})',
    yourVote: 'Votre vote',
    table: {
      name: 'Nom',
      vote: 'Vote',
      you: '(Vous)',
      average: 'Moyenne',
      median: 'Médiane',
    },
    notFound: 'Salle introuvable. Redirection...',
    shareConfigCopied: 'Lien de la salle avec config copié dans le presse-papiers',
    copyRoomUrl: `Copiez l'URL de la salle`,
    joinDialog: {
      title: 'Rejoindre la salle',
      description: 'Rejoindre la salle « {name} ».',
      descriptionDefault: 'Rejoindre la salle.',
      button: 'Rejoindre',
      yourName: 'Votre nom',
    },
  },
  userMenu: {
    changeName: 'Changer de nom',
    lightMode: 'Mode clair',
    darkMode: 'Mode sombre',
    enableAnimations: 'Activer les animations',
    reduceMotion: 'Réduire les animations',
    changeNameDialog: {
      title: 'Changer de nom',
      yourName: 'Votre nom',
      cancel: 'Annuler',
      save: 'Enregistrer',
    },
  },
} satisfies typeof en

export default messages
