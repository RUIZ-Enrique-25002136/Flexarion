/**
 * ============================================================================
 * FLEXARION — Animations GSAP + ScrollTrigger
 * ============================================================================
 * Principes :
 *  - Amélioration progressive : sans JS ou sans GSAP, tout reste visible.
 *  - Accessibilité : rien n'est animé si prefers-reduced-motion: reduce.
 *  - Performance : uniquement transform / opacity / clip-path, ScrollTrigger
 *    en mode "once" pour les révélations, pas d'écouteurs scroll maison.
 *
 * Attributs HTML pilotant les animations :
 *  [data-hero]            conteneur du hero (titre pré-découpé en .split-word)
 *  [data-hero-fade]       éléments du hero révélés après le titre
 *  [data-hero-media]      visuel du hero (zoom d'entrée + parallaxe)
 *  [data-reveal]          révélation au scroll (valeur optionnelle = délai)
 *  [data-reveal-stagger]  conteneur dont les enfants directs [data-reveal] sont échelonnés
 *  [data-split]           titre découpé en mots puis révélé au scroll
 *  [data-scrub-words]     texte dont les mots s'allument au fil du scroll
 *  [data-mask-reveal]     image révélée par un masque (clip-path)
 *  [data-parallax="0.15"] parallaxe verticale (fraction de la hauteur)
 *  [data-marquee]         bandeau défilant infini
 *  [data-magnetic]        bouton « magnétique » (pointeur fin uniquement)
 * ============================================================================
 */
(function () {
  'use strict';

  var root = document.documentElement;

  // GSAP est chargé : on annule le filet de sécurité posé dans le <head>.
  if (window.__flxFailsafe) clearTimeout(window.__flxFailsafe);

  if (!window.gsap) {
    root.classList.add('anim-fallback');
    return;
  }

  var gsap = window.gsap;
  var hasST = !!window.ScrollTrigger;
  if (hasST) gsap.registerPlugin(window.ScrollTrigger);

  gsap.defaults({ ease: 'expo.out', duration: 1.1 });

  /* ------------------------------------------------------------------------
   * Utilitaire : découpe un élément en mots masqués, en conservant les
   * balises internes (ex. <span class="text-ember">). Le texte reste lisible
   * par les lecteurs d'écran et les moteurs (même contenu, simples <span>).
   * --------------------------------------------------------------------- */
  function splitWords(el, wrapClass) {
    if (el.dataset.splitDone) return el.querySelectorAll('.split-word > span, .word');
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var parts = child.textContent.split(/(\s+)/);
          var frag = document.createDocumentFragment();
          parts.forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              frag.appendChild(document.createTextNode(' '));
            } else if (wrapClass === 'word') {
              var w = document.createElement('span');
              w.className = 'word';
              w.textContent = part;
              frag.appendChild(w);
            } else {
              var outer = document.createElement('span');
              outer.className = 'split-word';
              var inner = document.createElement('span');
              inner.textContent = part;
              outer.appendChild(inner);
              frag.appendChild(outer);
            }
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(el);
    el.dataset.splitDone = '1';
    return wrapClass === 'word' ? el.querySelectorAll('.word') : el.querySelectorAll('.split-word > span');
  }

  /* ------------------------------------------------------------------------
   * HERO (accueil) et HERO des pages secondaires
   * --------------------------------------------------------------------- */
  function heroIntro() {
    var hero = document.querySelector('[data-hero]');
    if (!hero) return;
    var words = hero.querySelectorAll('.split-word > span');
    var fades = hero.querySelectorAll('[data-hero-fade]');
    var media = hero.querySelector('[data-hero-media]');
    var delay = 0.08;

    // Mot par mot : on reprend l'état initial défini en CSS (translateY 110%).
    gsap.set(words, { yPercent: 110, y: 0 });

    var tl = gsap.timeline({ delay: delay });
    if (media) {
      // Le visuel (élément LCP) n'est jamais masqué : seul un léger zoom est animé.
      tl.fromTo(media, { scale: 1.12 }, { scale: 1, duration: 2.4, ease: 'power3.out' }, 0);
    }
    tl.to(words, { yPercent: 0, y: 0, duration: 1.25, stagger: 0.075 }, 0.1)
      .to(fades, { opacity: 1, y: 0, duration: 1, stagger: 0.1 }, 0.55);

    if (media && hasST) {
      gsap.to(media, {
        yPercent: 12,
        ease: 'none',
        scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
      });
    }
  }

  /* ------------------------------------------------------------------------
   * RÉVÉLATIONS AU SCROLL
   * --------------------------------------------------------------------- */
  function reveals() {
    var items = gsap.utils.toArray('[data-reveal]').filter(function (el) {
      return !el.closest('[data-hero]') && !el.closest('[data-reveal-stagger]');
    });

    items.forEach(function (el) {
      var delay = parseFloat(el.getAttribute('data-reveal')) || 0;
      gsap.to(el, {
        opacity: 1,
        y: 0,
        delay: delay,
        duration: 1.1,
        scrollTrigger: hasST ? { trigger: el, start: 'top 92%', once: true } : null,
      });
    });

    // Groupes échelonnés (grilles de cartes, listes…)
    gsap.utils.toArray('[data-reveal-stagger]').forEach(function (group) {
      var children = group.querySelectorAll(':scope > [data-reveal]');
      if (!children.length) return;
      gsap.to(children, {
        opacity: 1,
        y: 0,
        duration: 1.1,
        stagger: 0.12,
        scrollTrigger: hasST ? { trigger: group, start: 'top 92%', once: true } : null,
      });
    });
  }

  /* ------------------------------------------------------------------------
   * TITRES DÉCOUPÉS EN MOTS
   * --------------------------------------------------------------------- */
  function splitHeadings() {
    gsap.utils.toArray('[data-split]').forEach(function (el) {
      if (el.closest('[data-hero]')) return;
      var words = splitWords(el, 'split');
      // Réinitialise y: 0 après le translateY(110%) CSS pour ne pas animer vers +110%.
      gsap.set(words, { yPercent: 110, y: 0 });
      gsap.to(words, {
        yPercent: 0,
        y: 0,
        duration: 1.2,
        stagger: 0.06,
        scrollTrigger: hasST ? { trigger: el, start: 'top 92%', once: true } : null,
      });
    });
  }

  /* ------------------------------------------------------------------------
   * MANIFESTE : les mots s'allument au rythme du scroll
   * --------------------------------------------------------------------- */
  function scrubWords() {
    if (!hasST) return;
    gsap.utils.toArray('[data-scrub-words]').forEach(function (el) {
      var words = splitWords(el, 'word');
      gsap.fromTo(words, { opacity: 0.18 }, {
        opacity: 1,
        ease: 'none',
        stagger: 0.1,
        scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 50%', scrub: 0.6 },
      });
    });
  }

  /* ------------------------------------------------------------------------
   * MASQUES D'IMAGE
   * --------------------------------------------------------------------- */
  function maskReveals() {
    gsap.utils.toArray('[data-mask-reveal]').forEach(function (el) {
      var img = el.querySelector('img');
      var tl = gsap.timeline({
        scrollTrigger: hasST ? { trigger: el, start: 'top 96%', once: true } : null,
      });
      tl.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' });
      if (img) tl.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 1.8, ease: 'expo.out' }, 0.1);
    });
  }

  /* ------------------------------------------------------------------------
   * PARALLAXE SUBTILE
   * --------------------------------------------------------------------- */
  function parallax() {
    if (!hasST) return;
    gsap.utils.toArray('[data-parallax]').forEach(function (el) {
      var amount = parseFloat(el.getAttribute('data-parallax')) || 0.15;
      gsap.fromTo(el, { yPercent: -amount * 50 }, {
        yPercent: amount * 50,
        ease: 'none',
        scrollTrigger: { trigger: el.parentElement || el, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
  }

  /* ------------------------------------------------------------------------
   * BANDEAU DÉFILANT (vitesse modulée par la vélocité du scroll)
   * --------------------------------------------------------------------- */
  function marquees() {
    gsap.utils.toArray('[data-marquee]').forEach(function (el) {
      var track = el.querySelector('.marquee__track');
      if (!track) return;
      var loop = gsap.to(track, { xPercent: -50, ease: 'none', duration: 28, repeat: -1 });
      if (!hasST) return;
      window.ScrollTrigger.create({
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: function (self) { self.isActive ? loop.play() : loop.pause(); },
        onUpdate: function (self) {
          var v = Math.min(Math.abs(self.getVelocity()) / 400, 4);
          gsap.to(loop, { timeScale: 1 + v, duration: 0.2, overwrite: true });
          gsap.to(loop, { timeScale: 1, duration: 1, delay: 0.2 });
        },
      });
    });
  }

  /* ------------------------------------------------------------------------
   * CURSEUR & BOUTONS MAGNÉTIQUES (pointeur fin uniquement)
   * --------------------------------------------------------------------- */
  function pointerFx() {
    var cursor = document.createElement('div');
    cursor.className = 'cursor';
    cursor.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cursor);

    var xTo = gsap.quickTo(cursor, 'x', { duration: 0.45, ease: 'power3' });
    var yTo = gsap.quickTo(cursor, 'y', { duration: 0.45, ease: 'power3' });

    var onMove = function (e) {
      cursor.classList.add('is-visible');
      xTo(e.clientX);
      yTo(e.clientY);
    };
    var onOver = function (e) {
      var interactive = e.target.closest('a[href], button, summary, [data-cursor]');
      cursor.classList.toggle('is-hover', !!interactive);
    };
    var onLeave = function () { cursor.classList.remove('is-visible'); };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerover', onOver, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);

    gsap.utils.toArray('[data-magnetic]').forEach(function (btn) {
      var bx = gsap.quickTo(btn, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      var by = gsap.quickTo(btn, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        bx((e.clientX - r.left - r.width / 2) * 0.25);
        by((e.clientY - r.top - r.height / 2) * 0.35);
      });
      btn.addEventListener('pointerleave', function () { bx(0); by(0); });
    });

    return function cleanup() {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onOver);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      cursor.remove();
    };
  }

  /* ------------------------------------------------------------------------
   * ORCHESTRATION via gsap.matchMedia (gère prefers-reduced-motion et le
   * nettoyage automatique si la préférence change en cours de session).
   * --------------------------------------------------------------------- */
  var mm = gsap.matchMedia();

  // Mouvement réduit : aucun effet, tout est révélé immédiatement.
  mm.add('(prefers-reduced-motion: reduce)', function () {
    root.classList.add('anim-fallback');
  });

  // Animations principales.
  mm.add('(prefers-reduced-motion: no-preference)', function () {
    root.classList.remove('anim-fallback');
    heroIntro();
    reveals();
    splitHeadings();
    scrubWords();
    maskReveals();
    parallax();
    marquees();
  });

  // Effets de pointeur : souris uniquement, grands écrans (contexte séparé pour
  // ne pas rejouer les animations principales lors d'un redimensionnement).
  mm.add('(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine) and (min-width: 1024px)', function () {
    return pointerFx();
  });

  // Recalcul des positions une fois les polices et images chargées.
  if (hasST) {
    window.addEventListener('load', function () { window.ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { window.ScrollTrigger.refresh(); });
    }
  }

  // API minimale exposée aux autres modules (filtres, FAQ).
  window.FLX_ANIM = { splitWords: splitWords };
})();
