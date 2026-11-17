/**
 * ============================================================================
 * FLEXARION — Formulaire de contact (contact.html & en/contact.html)
 * ============================================================================
 * - Validation front-end accessible : aria-describedby, aria-invalid, focus
 *   sur le premier champ en erreur.
 * - Envoi vers l'endpoint configuré (js/config.js → form.endpoint + accessKey).
 * - Si l'endpoint factice de démonstration échoue réseau/HTTP, affiche une
 *   confirmation simulée avec le badge discret [Mode Démo] ainsi qu'un lien
 *   secondaire mailto: pré-rempli.
 * ============================================================================
 */
(function () {
  'use strict';

  var form = document.querySelector('[data-contact-form]');
  if (!form) return;

  var isEn = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
  var CONFIG = window.FLEXARION_CONFIG || {};
  var endpoint = (CONFIG.form && CONFIG.form.endpoint) || '';
  var accessKey = (CONFIG.form && CONFIG.form.accessKey) || '';
  var email = (CONFIG.contact && CONFIG.contact.email) || '';
  var status = form.querySelector('[data-form-status]');
  var submitBtn = form.querySelector('[type="submit"]');
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  form.setAttribute('novalidate', '');

  var rules = {
    name: function (v) {
      if (!v) return isEn ? 'Please enter your name.' : 'Veuillez indiquer votre nom.';
      if (v.length < 2) return isEn ? 'Your name must be at least 2 characters.' : 'Votre nom doit comporter au moins 2 caractères.';
      return '';
    },
    email: function (v) {
      if (!v) return isEn ? 'Please enter your email address.' : 'Veuillez indiquer votre adresse e-mail.';
      if (!EMAIL_RE.test(v)) {
        return isEn
          ? 'Invalid email format (example: name@domain.com).'
          : 'Le format de l’adresse e-mail est invalide (exemple : nom@domaine.fr).';
      }
      return '';
    },
    subject: function (v) {
      if (!v) return isEn ? 'Please select a subject.' : 'Veuillez choisir le sujet de votre message.';
      return '';
    },
    message: function (v) {
      if (!v) return isEn ? 'Please write your message.' : 'Veuillez écrire votre message.';
      if (v.length < 20) {
        return isEn
          ? 'Your message must be at least 20 characters (currently ' + v.length + ').'
          : 'Votre message doit comporter au moins 20 caractères (actuellement ' + v.length + ').';
      }
      if (v.length > 5000) {
        return isEn
          ? 'Your message must not exceed 5,000 characters.'
          : 'Votre message ne doit pas dépasser 5 000 caractères.';
      }
      return '';
    },
  };

  function fieldError(field, message) {
    var errorEl = document.getElementById(field.id + '-error');
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (errorEl) errorEl.textContent = message;
  }

  function validateField(field) {
    var rule = rules[field.name];
    if (!rule) return '';
    var msg = rule(field.value.trim());
    fieldError(field, msg);
    return msg;
  }

  Object.keys(rules).forEach(function (name) {
    var field = form.elements[name];
    if (!field) return;
    field.addEventListener('blur', function () { if (field.value.trim() !== '') validateField(field); });
    field.addEventListener('input', function () {
      if (field.getAttribute('aria-invalid') === 'true') validateField(field);
    });
  });

  function showStatus(type, html) {
    status.className = 'form-status form-status--' + type;
    status.innerHTML = html;
    status.hidden = false;
    status.focus();
  }

  function escapeHTML(str) {
    return str.replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function mailtoHref(data) {
    var subject = (isEn ? '[Flexarion Website] ' : '[Site Flexarion] ') + data.subject;
    var body = data.message + '\n\n— ' + data.name + ' (' + data.email + ')';
    return 'mailto:' + email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  function resetValidation() {
    Object.keys(rules).forEach(function (n) {
      if (form.elements[n]) form.elements[n].removeAttribute('aria-invalid');
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var trap = form.elements['website'];
    if (trap && trap.value) return;

    var errors = [];
    Object.keys(rules).forEach(function (name) {
      var field = form.elements[name];
      if (!field) return;
      var msg = validateField(field);
      if (msg) errors.push({ field: field, msg: msg });
    });

    if (errors.length) {
      var list = errors.map(function (er) {
        return '<li><a href="#' + er.field.id + '">' + escapeHTML(er.msg) + '</a></li>';
      }).join('');
      var title = isEn
        ? 'The form contains ' + errors.length + ' error' + (errors.length > 1 ? 's' : '') + ':'
        : 'Le formulaire contient ' + errors.length + ' erreur' + (errors.length > 1 ? 's' : '') + ' :';
      showStatus('error', '<p><strong>' + title + '</strong></p><ul>' + list + '</ul>');
      errors[0].field.focus();
      return;
    }

    var data = {
      name: form.elements['name'].value.trim(),
      email: form.elements['email'].value.trim(),
      subject: form.elements['subject'].options[form.elements['subject'].selectedIndex].text,
      message: form.elements['message'].value.trim(),
    };

    var payload = new FormData(form);
    if (accessKey) payload.append('access_key', accessKey);

    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
    var label = submitBtn.querySelector('[data-label]');
    var initialLabel = label ? label.textContent : '';
    if (label) label.textContent = isEn ? 'Sending…' : 'Envoi en cours…';

    if (!endpoint) {
      showDemoSuccess(data);
      submitBtn.disabled = false;
      submitBtn.removeAttribute('aria-busy');
      if (label) label.textContent = initialLabel;
      return;
    }

    fetch(endpoint, {
      method: 'POST',
      body: payload,
      headers: { Accept: 'application/json' },
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (json) {
        if (json && json.success === false) throw new Error(json.message || 'Rejected');
        form.reset();
        resetValidation();
        showStatus('success', isEn
          ? '<p><strong>Thank you, your message has been sent.</strong> The Flexarion team will reply shortly.</p>'
          : '<p><strong>Merci, votre message a bien été envoyé.</strong> L’équipe Flexarion vous répondra dès que possible.</p>');
      })
      .catch(function () {
        showDemoSuccess(data);
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.removeAttribute('aria-busy');
        if (label) label.textContent = initialLabel;
      });
  });

  function showDemoSuccess(data) {
    form.reset();
    resetValidation();
    if (isEn) {
      showStatus('success',
        '<p><span class="demo-badge">Demo Mode</span><strong>Message recorded for ' + escapeHTML(data.name) + '.</strong></p>' +
        '<p class="mt-2">The fictional Web3Forms key is not wired to a live inbox. ' +
        '<a href="' + mailtoHref(data) + '">Send via your email app (' + escapeHTML(email) + ')</a>.</p>'
      );
    } else {
      showStatus('success',
        '<p><span class="demo-badge">Mode Démo</span><strong>Message enregistré pour ' + escapeHTML(data.name) + '.</strong></p>' +
        '<p class="mt-2">La clé de démonstration n’est pas raccordée à une boîte réelle. ' +
        '<a href="' + mailtoHref(data) + '">Ouvrir dans votre messagerie (' + escapeHTML(email) + ')</a>.</p>'
      );
    }
  }
})();
