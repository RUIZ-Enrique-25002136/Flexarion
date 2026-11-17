/**
 * ============================================================================
 * FLEXARION — Script principal (commun à toutes les pages)
 * ============================================================================
 * Modules :
 *   1. Hydratation depuis config.js (e-mail, réseaux sociaux, liaisons texte)
 *   2. En-tête : état au scroll + masquage/affichage
 *   3. Menu mobile accessible (focus trap, Échap, aria-expanded)
 *   4. Transitions de page (rideau GSAP à la sortie, CSS à l'entrée)
 *   5. Divers (année du copyright)
 *
 * Aucun contenu indexable ne dépend de ce fichier : tout le texte est dans le
 * HTML. Ce script n'ajoute que de l'interactivité (amélioration progressive).
 * ============================================================================
 */
(function () {
  'use strict';

  var CONFIG = window.FLEXARION_CONFIG || {};
  var root = document.documentElement;
  var isEn = (root.lang || '').toLowerCase().indexOf('en') === 0;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------------------
   * 1. HYDRATATION DEPUIS LA CONFIGURATION
   * --------------------------------------------------------------------- */

  /** Lit une valeur imbriquée : getPath(obj, "team.timeo.role") */
  function getPath(obj, path) {
    return path.split('.').reduce(function (acc, key) {
      return acc && acc[key] !== undefined ? acc[key] : undefined;
    }, obj);
  }

  function hydrateEmail() {
    var email = CONFIG.contact && CONFIG.contact.email;
    if (!email) return;
    document.querySelectorAll('[data-email-link]').forEach(function (el) {
      el.setAttribute('href', 'mailto:' + email);
      if (el.hasAttribute('data-email-text')) el.textContent = email;
    });
  }

  /** Remplace le texte des éléments [data-bind="chemin"] si la config est renseignée. */
  function hydrateBindings() {
    document.querySelectorAll('[data-bind]').forEach(function (el) {
      var value = getPath(CONFIG, el.getAttribute('data-bind'));
      if (typeof value === 'string' && value.trim() !== '') {
        el.textContent = value;
        el.classList.remove('ph');
      }
    });
  }

  /* ------------------------------------------------------------------------
   * 2. EN-TÊTE : fond au scroll + masquage quand on descend
   * --------------------------------------------------------------------- */
  function initHeader() {
    var header = document.querySelector('[data-header]');
    if (!header) return;
    var lastY = window.scrollY;
    var ticking = false;

    function update() {
      var y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 24);
      // Masquer en descendant (au-delà de 400px), réafficher en remontant.
      var hide = y > 400 && y > lastY && !root.classList.contains('menu-open') && !header.contains(document.activeElement);
      header.classList.toggle('is-hidden', hide);
      lastY = y;
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    // Un focus clavier dans l'en-tête le réaffiche toujours.
    header.addEventListener('focusin', function () { header.classList.remove('is-hidden'); });
    update();
  }

  /* ------------------------------------------------------------------------
   * 3. MENU MOBILE
   * --------------------------------------------------------------------- */
  function initMobileMenu() {
    var toggle = document.querySelector('[data-menu-toggle]');
    var menu = document.getElementById('mobile-menu');
    if (!toggle || !menu) return;

    var links = menu.querySelectorAll('[data-menu-item]');
    var isOpen = false;
    var tl = null;
    var canAnimate = function () { return window.gsap && !reduceMotion.matches; };

    function focusables() {
      return [toggle].concat(Array.prototype.slice.call(
        menu.querySelectorAll('a[href], button:not([disabled])')
      ));
    }

    function open() {
      isOpen = true;
      menu.hidden = false;
      root.classList.add('menu-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', isEn ? 'Close menu' : 'Fermer le menu');
      if (canAnimate()) {
        if (tl) tl.kill();
        tl = window.gsap.timeline();
        tl.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.7, ease: 'expo.inOut' })
          .fromTo(links, { yPercent: 110 }, { yPercent: 0, duration: 0.8, stagger: 0.06, ease: 'expo.out' }, '-=0.3')
          .fromTo(menu.querySelector('.mobile-menu__footer'), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.5 }, '-=0.5');
      }
      var first = menu.querySelector('a[href]');
      if (first) first.focus({ preventScroll: true });
    }

    function close(returnFocus) {
      if (!isOpen) return;
      isOpen = false;
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', isEn ? 'Open menu' : 'Ouvrir le menu');
      var finish = function () {
        menu.hidden = true;
        root.classList.remove('menu-open');
        menu.style.clipPath = '';
      };
      if (canAnimate()) {
        if (tl) tl.kill();
        tl = window.gsap.timeline({ onComplete: finish });
        tl.to(menu, { clipPath: 'inset(0 0 100% 0)', duration: 0.6, ease: 'expo.inOut' });
      } else {
        finish();
      }
      if (returnFocus) toggle.focus();
    }

    toggle.addEventListener('click', function () { isOpen ? close(false) : open(); });

    document.addEventListener('keydown', function (e) {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        close(true);
        return;
      }
      if (e.key === 'Tab') {
        // Piège à focus : la tabulation reste dans le menu ouvert.
        var items = focusables();
        var first = items[0];
        var last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    // Repasser en affichage bureau ferme le menu.
    window.matchMedia('(min-width: 1024px)').addEventListener('change', function (mq) {
      if (mq.matches) close(false);
    });

    // Lien vers une ancre de la page courante : fermer le menu.
    menu.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (a && a.getAttribute('href').charAt(0) === '#') close(false);
    });
  }

  /* ------------------------------------------------------------------------
   * 4. TRANSITIONS DE PAGE (RIDEAU ORANGE)
   *    Animations 100 % CSS (@keyframes flx-curtain-in / flx-curtain-out)
   *    pilotées sans conflit entre pages avec ou sans GSAP.
   * --------------------------------------------------------------------- */
  function initPageTransitions() {
    var curtain = document.querySelector('.page-curtain');
    if (!curtain) return;
    var leaving = false;
    var enterTimer = null;

    function clearEnterState() {
      if (enterTimer) {
        window.clearTimeout(enterTimer);
        enterTimer = null;
      }
      root.classList.remove('pt-enter');
    }

    if (root.classList.contains('pt-enter')) {
      enterTimer = window.setTimeout(clearEnterState, 1000);
      curtain.addEventListener('animationend', function onEnterEnd(ev) {
        if (ev.animationName === 'flx-curtain-out') {
          curtain.removeEventListener('animationend', onEnterEnd);
          clearEnterState();
        }
      });
    }

    // Nettoyage lors d'un retour arrière depuis le bfcache navigateur.
    window.addEventListener('pageshow', function (e) {
      leaving = false;
      root.classList.remove('pt-leave');
      if (e.persisted) clearEnterState();
    });

    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var link = e.target.closest('a[href]');
      if (!link || reduceMotion.matches || leaving) return;
      if (link.target && link.target !== '_self') return;
      if (link.hasAttribute('download') || link.hasAttribute('data-no-transition')) return;

      var href = link.getAttribute('href');
      if (!href || href.charAt(0) === '#' || /^(mailto|tel|javascript):/i.test(href)) return;

      var url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      // Même page avec ancre : laisser le défilement natif.
      if (url.pathname === window.location.pathname && url.hash) return;

      e.preventDefault();
      leaving = true;
      clearEnterState();
      try { sessionStorage.setItem('flx-pt', '1'); } catch (err) { /* navigation privée */ }
      root.classList.add('pt-leave');

      var navigated = false;
      var navigate = function () {
        if (navigated) return;
        navigated = true;
        window.location.href = url.href;
      };

      curtain.addEventListener('animationend', function onLeaveEnd(ev) {
        if (ev.animationName === 'flx-curtain-in') {
          curtain.removeEventListener('animationend', onLeaveEnd);
          window.requestAnimationFrame(function () {
            window.setTimeout(navigate, 20);
          });
        }
      });
      window.setTimeout(navigate, 450);
    });
  }

  /* ------------------------------------------------------------------------
   * 5. PRÉCHARGEMENT AU SURVOL DES LIENS INTERNES
   * --------------------------------------------------------------------- */
  function initLinkPrefetch() {
    var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn && (conn.saveData || /2g/.test(conn.effectiveType || ''))) return;
    var prefetched = Object.create(null);

    function prefetch(link) {
      if (!link || (link.target && link.target !== '_self')) return;
      if (link.hasAttribute('download')) return;
      var href = link.getAttribute('href');
      if (!href || href.charAt(0) === '#' || /^(mailto|tel|javascript):/i.test(href)) return;
      var url;
      try { url = new URL(link.href, window.location.href); } catch (e) { return; }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      if (!/\.html$/i.test(url.pathname) && url.pathname.slice(-1) !== '/') return;
      if (prefetched[url.href]) return;
      prefetched[url.href] = true;
      var hint = document.createElement('link');
      hint.rel = 'prefetch';
      hint.as = 'document';
      hint.href = url.href;
      document.head.appendChild(hint);
    }

    document.addEventListener('pointerenter', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (a) prefetch(a);
    }, true);
    document.addEventListener('focusin', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (a) prefetch(a);
    });
  }

  /* ------------------------------------------------------------------------
   * 5. DIVERS
   * --------------------------------------------------------------------- */
  function initYear() {
    var year = String(new Date().getFullYear());
    document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = year; });
  }

  /* ------------------------------------------------------------------------
   * INITIALISATION
   * --------------------------------------------------------------------- */
  function init() {
    hydrateEmail();
    hydrateBindings();
    initHeader();
    initMobileMenu();
    initPageTransitions();
    initLinkPrefetch();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
