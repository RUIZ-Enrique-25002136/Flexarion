/**
 * ============================================================================
 * FLEXARION — Newsletter & Liste d'attente Démo
 * ============================================================================
 * Validation accessible (e-mail + consentement RGPD obligatoire), simulation
 * d'inscription et mémorisation locale pour éviter la double soumission.
 * ============================================================================
 */
(function () {
  'use strict';

  var forms = document.querySelectorAll('[data-newsletter-form]');
  if (!forms.length) return;

  var isEn = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
  var STORAGE_KEY = 'flx-newsletter-subscribed';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function getSavedEmail() {
    try { return localStorage.getItem(STORAGE_KEY) || ''; } catch (e) { return ''; }
  }

  function saveEmail(email) {
    try { localStorage.setItem(STORAGE_KEY, email); } catch (e) { /* navigation privée */ }
  }

  forms.forEach(function (form, idx) {
    var emailInput = form.querySelector('input[type="email"]');
    var consentInput = form.querySelector('input[type="checkbox"]');
    var emailError = form.querySelector('[data-nl-email-error]');
    var consentError = form.querySelector('[data-nl-consent-error]');
    var status = form.querySelector('[data-nl-status]');
    var submitBtn = form.querySelector('[type="submit"]');
    if (!emailInput || !consentInput || !status) return;

    // Identifiants uniques si plusieurs formulaires coexistaient.
    if (idx > 0) {
      emailInput.id += '-' + idx;
      consentInput.id += '-' + idx;
    }

    function showAlreadySubscribed(saved) {
      status.className = 'form-status form-status--success mt-4';
      status.innerHTML = isEn
        ? '<p><strong>You are on the private demo waitlist</strong> (' + saved.replace(/</g, '&lt;') + '). Thank you for following Flexarion!</p>'
        : '<p><strong>Vous êtes déjà inscrit(e) à la liste d’attente démo</strong> (' + saved.replace(/</g, '&lt;') + '). Merci de suivre Flexarion !</p>';
      status.hidden = false;
      if (submitBtn) submitBtn.disabled = true;
      emailInput.disabled = true;
      consentInput.disabled = true;
    }

    var already = getSavedEmail();
    if (already) {
      showAlreadySubscribed(already);
      return;
    }

    form.setAttribute('novalidate', '');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var val = emailInput.value.trim();
      var ok = true;

      if (!val || !EMAIL_RE.test(val)) {
        ok = false;
        emailInput.setAttribute('aria-invalid', 'true');
        if (emailError) {
          emailError.textContent = isEn
            ? 'Please enter a valid email address.'
            : 'Veuillez saisir une adresse e-mail valide.';
        }
      } else {
        emailInput.setAttribute('aria-invalid', 'false');
        if (emailError) emailError.textContent = '';
      }

      if (!consentInput.checked) {
        ok = false;
        consentInput.setAttribute('aria-invalid', 'true');
        if (consentError) {
          consentError.textContent = isEn
            ? 'Please accept the privacy notice to subscribe.'
            : 'Veuillez accepter la mention RGPD pour valider votre inscription.';
        }
      } else {
        consentInput.setAttribute('aria-invalid', 'false');
        if (consentError) consentError.textContent = '';
      }

      if (!ok) {
        (emailInput.getAttribute('aria-invalid') === 'true' ? emailInput : consentInput).focus();
        return;
      }

      saveEmail(val);
      status.className = 'form-status form-status--success mt-4';
      status.innerHTML = isEn
        ? '<p><span class="demo-badge">Confirmed</span><strong>Subscription registered!</strong> You will be notified when private demos and devlog updates go live.</p>'
        : '<p><span class="demo-badge">Confirmé</span><strong>Inscription enregistrée !</strong> Vous serez prévenu(e) dès l’ouverture des démos privées et des prochaines annonces.</p>';
      status.hidden = false;
      status.focus();

      if (submitBtn) submitBtn.disabled = true;
      emailInput.disabled = true;
      consentInput.disabled = true;
    });
  });
})();
