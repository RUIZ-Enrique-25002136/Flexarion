# Flexarion — Site officiel

Site web multipage statique de **Flexarion**, studio indépendant de développement et création de jeux vidéo basé à **Aix-en-Provence** (Provence-Alpes-Côte d’Azur, France).

---

## Stack technique

- **HTML5 sémantique** (architecture multipage sans framework ni bundler obligatoire)
- **CSS3 modulaire** (`css/style.css`, `css/responsive.css`)
- **Tailwind CSS** via CDN + configuration prête pour une compilation de production (`tailwind.config.js`)
- **JavaScript Vanilla** modulaire (`js/config.js`, `js/main.js`, `js/animations.js`, `js/filters.js`, `js/faq.js`, `js/contact.js`)
- **GSAP 3.12.5 + ScrollTrigger** via CDN (avec intégrité SRI et respect de `prefers-reduced-motion`)

---

## Architecture des fichiers

```text
flexarion/
├── index.html                  # Accueil
├── studio.html                 # Présentation, philosophie, valeurs, méthode, Aix-en-Provence
├── games.html                  # Galerie des projets + filtres interactifs
├── faq.html                    # Foire aux questions (accordéons <details>/<summary>)
├── credits.html                # Équipe (Timéo Morsilli, Hugo Banti, Enrique Ruiz)
├── contact.html                # Coordonnées + formulaire avec validation front-end
├── legal.html                  # Mentions légales (placeholders LCEN à compléter)
├── privacy.html                # Politique de confidentialité (RGPD)
├── 404.html                    # Page d'erreur 404 (noindex)
├── games/
│   ├── les-veilleurs-de-brume.html
│   ├── neon-calanques.html
│   └── lisiere.html
├── robots.txt
├── sitemap.xml
├── site.webmanifest
├── tailwind.config.js
├── css/
│   ├── style.css
│   ├── responsive.css
│   └── tailwind.input.css
├── js/
│   ├── config.js               # Configuration centralisée
│   ├── main.js
│   ├── animations.js
│   ├── filters.js
│   ├── faq.js
│   └── contact.js
└── assets/
    ├── icons/
    └── images/
```

---

## Checklist avant mise en ligne (remplacement des placeholders)

Toutes les données provisoires sont repérables par la classe `.ph` ou les occurrences suivantes :

1. **Domaine officiel** : le site est configuré pour `https://flexarion.timeoms.fr` dans les pages HTML, `robots.txt`, `sitemap.xml` et `js/config.js`.
2. **Adresse e-mail** : l’adresse publique configurée est `contact@flexarion.timeoms.fr` ; remplacez-la si nécessaire dans `js/config.js` et les fichiers HTML.
3. **Réseaux sociaux** : renseigner les URLs officielles (Instagram, TikTok, YouTube, Discord, X) dans `js/config.js` et les ajouter dans le tableau `"sameAs"` du JSON-LD `Organization` (`index.html`, `studio.html`).
4. **Équipe** : renseigner les rôles et biographies dans `js/config.js`, `index.html`, `studio.html` et `credits.html`, puis remplacer les portraits dans `assets/images/team/`.
5. **Projets / Jeux** : les fiches indexables de `Les Veilleurs de Brume`, `Neon Calanques` et `Lisière` sont publiées dans `games/`, référencées depuis `index.html`, `games.html`, `js/config.js` et `sitemap.xml`.
6. **Mentions légales & Confidentialité** : compléter les blocs `[À COMPLÉTER ...]` dans `legal.html` et `privacy.html` (éditeur, directeur de publication, hébergeur, durée de conservation).
7. **Formulaire de contact** : par défaut, `js/contact.js` ne simule aucun envoi sans serveur. Pour activer l’envoi direct, renseigner `form.endpoint` dans `js/config.js` (ex. Formspree, Basin, fonction serverless ou script backend renvoyant HTTP 2xx).

---

## Configuration de la page 404 et des URLs propres

Configurer l’hébergeur pour renvoyer un **véritable statut HTTP 404** avec `404.html` :

- **Apache (`.htaccess`)** :
  ```apache
  ErrorDocument 404 /404.html
  ```
- **Nginx** :
  ```nginx
  error_page 404 /404.html;
  ```
- **Netlify / Cloudflare Pages / GitHub Pages** : `404.html` à la racine est automatiquement servi avec un code HTTP `404`.

---

## Passage en production (Tailwind CSS optimisé, optionnel)

Le site fonctionne directement via le CDN Tailwind sans étape de build. Pour optimiser les performances en production (suppression du runtime JS Tailwind et CSS purgé) :

```bash
npx tailwindcss@3 -c tailwind.config.js -i css/tailwind.input.css -o css/tailwind.min.css --minify
```

Puis dans chaque fichier HTML, remplacer les deux balises `<script src="https://cdn.tailwindcss.com"></script>` et `<script src="tailwind.config.js"></script>` par :

```html
<link rel="stylesheet" href="css/tailwind.min.css">
```

(avec `/css/tailwind.min.css` dans `404.html` et `../css/tailwind.min.css` dans les fiches du dossier `games/`).
