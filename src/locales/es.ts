import type en from './en'
import flagSvg from 'flag-icons/flags/4x3/es.svg'

export const meta = {
  flagSvg,
  nativeName: 'Español',
}

const messages = {
  app: {
    nav: {
      home: 'Inicio',
      room: 'Sala',
      roomWithName: 'Sala - {name}',
      config: 'Configuración',
    },
    selectLanguage: 'Seleccionar idioma',
  },
  index: {
    createRoom: 'Crear una sala',
    roomCode: 'Código de sala',
    joinRoom: 'Unirse a la sala',
    attributions: {
      title: 'Atribuciones',
      casinoChip: 'Íconos de fichas de casino creados por POD Gladiator - Flaticon',
    },
  },
  config: {
    title: 'Configuración',
    noConfigAlert: 'No se encontró configuración de Firebase. Por favor, completa los ajustes de tu proyecto Firebase a continuación.',
    shareUrlAlert: 'Puedes cargar una configuración desde una URL compartida — pide un enlace de config a tu equipo.',
    newTeamAlert: '¿Equipo nuevo? Si nadie tiene aún un proyecto de Firebase, sigue la {link} para comenzar.',
    setupGuide: 'guía de configuración',
    fields: {
      apiKey: 'apiKey',
      authDomain: 'authDomain',
      databaseUrl: 'databaseUrl',
      projectId: 'projectId',
      storageBucket: 'storageBucket',
      messagingSenderId: 'messagingSenderId',
      appId: 'appId',
    },
    save: 'Guardar',
    shareConfig: 'Compartir config',
    copiedToClipboard: 'URL de configuración copiada al portapapeles',
    copyThisLink: 'Copia este enlace',
  },
  create: {
    title: 'Crear una sala',
    yourName: 'Tu nombre',
    roomName: 'Nombre de la sala',
    cardDeck: 'Mazo de cartas',
    presets: {
      fibonacci: 'Fibonacci',
      modifiedFib: 'Fib modificado',
      tshirt: 'Camiseta',
      powersOf2: 'Potencias de 2',
    },
    addCard: 'Agregar carta',
    add: 'Agregar',
    timerThresholds: 'Umbrales del temporizador',
    optional: '(opcional)',
    targetDuration: 'Duración objetivo (minutos)',
    targetHint: 'El temporizador se vuelve amarillo al alcanzarse',
    ceilingDuration: 'Duración máxima (minutos)',
    ceilingHint: 'El temporizador se vuelve rojo al alcanzarse',
    create: 'Crear',
  },
  room: {
    revealVotes: 'Revelar votos',
    resetVotes: 'Reiniciar votos',
    missingFeatures: 'A esta sala le faltan características nuevas:',
    previouslyAcknowledged: 'Características reconocidas anteriormente',
    wantFeatures: '¿Quieres estas características? Pide a alguien que cree una nueva sala.',
    timeSinceReset: 'Tiempo desde el reinicio: {time}',
    pastTarget: 'Se superó la duración objetivo de esta sala',
    pastCeiling: 'Se superó la duración máxima — considera una discusión en equipo antes de reestimar',
    revealedAt: '(revelado en {time})',
    yourVote: 'Tu voto',
    table: {
      name: 'Nombre',
      vote: 'Voto',
      you: '(Tú)',
      average: 'Promedio',
      median: 'Mediana',
    },
    notFound: 'Sala no encontrada. Redirigiendo...',
    shareConfigCopied: 'Enlace de sala con config copiado al portapapeles',
    copyRoomUrl: 'Copia la URL de la sala',
    joinDialog: {
      title: 'Unirse a la sala',
      description: 'Uniéndose a la sala "{name}".',
      descriptionDefault: 'Uniéndose a la sala.',
      button: 'Unirse',
      yourName: 'Tu nombre',
    },
  },
  userMenu: {
    changeName: 'Cambiar nombre',
    lightMode: 'Modo claro',
    darkMode: 'Modo oscuro',
    enableAnimations: 'Activar animaciones',
    reduceMotion: 'Reducir movimiento',
    changeNameDialog: {
      title: 'Cambiar nombre',
      yourName: 'Tu nombre',
      cancel: 'Cancelar',
      save: 'Guardar',
    },
  },
} satisfies typeof en

export default messages
