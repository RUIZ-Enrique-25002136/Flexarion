/**
 * ============================================================================
 * FLEXARION — Bouton Wishlist simulé sur les fiches jeux
 * ============================================================================
 */
(function () {
  'use strict';

  var buttons = document.querySelectorAll('[data-wishlist-btn]');
  if (!buttons.length) return;

  var isEn = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
  var toast = null;
  var timer = null;

  function showToast(gameTitle) {
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast-banner';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }

    toast.innerHTML = isEn
      ? '<p class="font-display font-medium text-ember">Wishlist — ' + gameTitle + '</p><p class="mt-1 text-sm text-bone/90">The official Steam &amp; Itch.io store page will open upon public announcement. Subscribe below to be notified first.</p>'
      : '<p class="font-display font-medium text-ember">Liste de souhaits — ' + gameTitle + '</p><p class="mt-1 text-sm text-bone/90">La page magasin Steam &amp; Itch.io ouvrira lors de l’annonce officielle. Inscrivez-vous ci-dessous pour être alerté(e) en priorité.</p>';
    toast.hidden = false;

    if (timer) clearTimeout(timer);
    timer = setTimeout(function () { toast.hidden = true; }, 5500);
  }

  buttons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var title = btn.getAttribute('data-wishlist-btn') || 'Flexarion';
      btn.setAttribute('aria-pressed', 'true');
      showToast(title);
    });
  });
})();
