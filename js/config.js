/**
 * ============================================================================
 * FLEXARION — Configuration centrale du site
 * ============================================================================
 */
window.FLEXARION_CONFIG = Object.freeze({
  siteUrl: 'https://flexarion.timeoms.fr',

  studio: {
    name: 'Flexarion',
    activity: 'Studio indépendant de développement et de création de jeux vidéo',
    city: 'Aix-en-Provence',
    department: 'Bouches-du-Rhône',
    region: "Provence-Alpes-Côte d'Azur",
    country: 'France',
    countryCode: 'FR',
  },

  contact: {
    email: 'contact@flexarion.timeoms.fr',
  },

  /* Formulaire de contact :
     Endpoint Web3Forms configuré avec une clé de démonstration factice.
     Remplacer `accessKey` par une clé Web3Forms réelle en production. */
  form: {
    endpoint: 'https://api.web3forms.com/submit',
    accessKey: '00000000-0000-0000-0000-flexariondemo',
  },

  /* Réseaux sociaux officiels du studio */
  social: {
    bluesky: { label: 'Bluesky', url: 'https://bsky.app/profile/flexarion-studio.bsky.social' },
    youtube: { label: 'YouTube', url: 'https://www.youtube.com/@FlexarionStudio' },
    itch: { label: 'Itch.io', url: 'https://flexarion.itch.io' },
    github: { label: 'GitHub', url: 'https://github.com/RUIZ-Enrique-25002136/Flexarion.git' },
  },

  team: {
    timeo: { name: 'Timéo Morsilli', role: 'Développeur', bio: '' },
    hugo: { name: 'Hugo Banti', role: 'Modélisateur 3D', bio: '' },
    enrique: { name: 'Enrique Ruiz', role: 'Développeur', bio: '' },
  },

  games: [
    { id: 'projet-01', name: 'Les Veilleurs de Brume', status: 'dev', genre: 'Aventure narrative', platforms: ['PC'], detailUrl: 'games/les-veilleurs-de-brume.html' },
    { id: 'projet-02', name: 'Neon Calanques', status: 'soon', genre: 'Action roguelite', platforms: ['PC', 'Console'], detailUrl: 'games/neon-calanques.html' },
    { id: 'projet-03', name: 'Lisière', status: 'soon', genre: 'Puzzle contemplatif', platforms: ['PC', 'Mobile'], detailUrl: 'games/lisiere.html' },
  ],
});
