/**
 * ============================================================================
 * FLEXARION — Lightbox accessible (<dialog>) pour les galeries de jeux
 * ============================================================================
 */
(function () {
  'use strict';

  var galleries = document.querySelectorAll('[data-lightbox-gallery]');
  if (!galleries.length) return;

  var isEn = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
  var dialog = null;
  var activeItems = [];
  var activeIndex = 0;
  var lastTrigger = null;

  function ensureDialog() {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'flx-lightbox';
    dialog.setAttribute('aria-labelledby', 'flx-lightbox-title');
    dialog.innerHTML =
      '<div class="flx-lightbox__inner">' +
        '<div class="flx-lightbox__head">' +
          '<div class="flex items-center gap-3">' +
            '<span class="tag" data-lb-tag></span>' +
            '<span class="mono text-muted" data-lb-counter></span>' +
          '</div>' +
          '<button type="button" class="copy-btn" data-lb-close aria-label="' + (isEn ? 'Close preview' : 'Fermer l’aperçu') + '">' +
            (isEn ? 'Close · Esc' : 'Fermer · Échap') +
          '</button>' +
        '</div>' +
        '<figure class="flx-lightbox__figure">' +
          '<img src="" alt="" width="1200" height="750" data-lb-img>' +
        '</figure>' +
        '<div class="flx-lightbox__foot">' +
          '<div class="max-w-xl">' +
            '<h3 id="flx-lightbox-title" class="h-sub" data-lb-title></h3>' +
            '<p class="mt-2 text-muted" data-lb-desc></p>' +
          '</div>' +
          '<div class="flx-lightbox__nav">' +
            '<button type="button" class="copy-btn" data-lb-prev>' + (isEn ? '← Previous' : '← Précédent') + '</button>' +
            '<button type="button" class="copy-btn" data-lb-next>' + (isEn ? 'Next →' : 'Suivant →') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(dialog);

    dialog.querySelector('[data-lb-close]').addEventListener('click', function () {
      dialog.close();
    });
    dialog.querySelector('[data-lb-prev]').addEventListener('click', function () {
      step(-1);
    });
    dialog.querySelector('[data-lb-next]').addEventListener('click', function () {
      step(1);
    });

    // Clic sur le backdrop extérieur (cible == <dialog> lui-même).
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) dialog.close();
    });

    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    });

    dialog.addEventListener('close', function () {
      if (lastTrigger && typeof lastTrigger.focus === 'function') {
        lastTrigger.focus();
      }
      lastTrigger = null;
    });

    return dialog;
  }

  function render() {
    if (!dialog || !activeItems.length) return;
    var item = activeItems[activeIndex];
    var img = dialog.querySelector('[data-lb-img]');
    img.src = item.src;
    img.alt = item.title;
    dialog.querySelector('[data-lb-tag]').textContent = item.tag;
    dialog.querySelector('[data-lb-counter]').textContent = (activeIndex + 1) + ' / ' + activeItems.length;
    dialog.querySelector('[data-lb-title]').textContent = item.title;
    dialog.querySelector('[data-lb-desc]').textContent = item.desc;
  }

  function step(delta) {
    if (!activeItems.length) return;
    activeIndex = (activeIndex + delta + activeItems.length) % activeItems.length;
    render();
  }

  galleries.forEach(function (gallery) {
    var buttons = Array.prototype.slice.call(gallery.querySelectorAll('[data-lightbox-item]'));
    var items = buttons.map(function (btn) {
      return {
        src: btn.getAttribute('data-src') || '',
        tag: btn.getAttribute('data-tag') || '',
        title: btn.getAttribute('data-title') || '',
        desc: btn.getAttribute('data-desc') || '',
      };
    });

    buttons.forEach(function (btn, idx) {
      btn.addEventListener('click', function () {
        ensureDialog();
        activeItems = items;
        activeIndex = idx;
        lastTrigger = btn;
        render();
        if (typeof dialog.showModal === 'function') {
          dialog.showModal();
        } else {
          dialog.setAttribute('open', '');
        }
        var closeBtn = dialog.querySelector('[data-lb-close]');
        if (closeBtn) closeBtn.focus();
      });
    });
  });
})();
