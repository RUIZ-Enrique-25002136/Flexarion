/**
 * ============================================================================
 * FLEXARION — Configuration Tailwind CSS (fichier unique, double usage)
 * ============================================================================
 *
 * 1) DÉVELOPPEMENT (actuel) : ce fichier est chargé dans le navigateur juste
 *    après le CDN Tailwind (https://cdn.tailwindcss.com). Il renseigne alors
 *    l'objet global `tailwind.config`.
 *
 * 2) PRODUCTION (recommandé) : le même fichier peut être utilisé tel quel par
 *    le CLI Tailwind v3 pour générer une feuille de style compilée et purgée :
 *
 *      npx tailwindcss@3 -c tailwind.config.js -i css/tailwind.input.css \
 *        -o css/tailwind.min.css --minify
 *
 *    Puis, dans chaque page HTML : supprimer les deux balises <script> du CDN
 *    et de cette config, et ajouter <link rel="stylesheet" href="css/tailwind.min.css">
 *    AVANT css/style.css. (Voir README.md, section « Passage en production ».)
 *
 *    Aucune étape de build n'est obligatoire : le site fonctionne sans.
 * ============================================================================
 */
(function (root) {
  var flexarionTailwindConfig = {
    // Fichiers analysés par le compilateur (ignoré par le CDN, utile en production).
    content: ['./*.html', './en/**/*.html', './games/**/*.html', './src/**/*.html', './scripts/**/*.mjs', './js/**/*.js'],
    theme: {
      extend: {
        colors: {
          ink: '#090909',        // Noir profond
          coal: '#151515',       // Anthracite
          bone: '#F4F2ED',       // Blanc cassé
          ash: '#858585',        // Gris
          ember: {               // Accent orange électrique
            DEFAULT: '#FF5A1F',
            soft: '#FF7A47',
            deep: '#D9430F',
          },
          pulse: '#7C4DFF',      // Accent secondaire (violet intense), usage parcimonieux
        },
        fontFamily: {
          display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
          sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
          mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        },
        maxWidth: {
          site: '90rem', // 1440px
        },
        letterSpacing: {
          tightest: '-0.06em',
        },
        transitionTimingFunction: {
          expo: 'cubic-bezier(0.19, 1, 0.22, 1)',
        },
      },
    },
    plugins: [],
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = flexarionTailwindConfig; // CLI / Node
  } else if (root && root.tailwind) {
    root.tailwind.config = flexarionTailwindConfig; // CDN navigateur
  }
})(typeof window !== 'undefined' ? window : undefined);
