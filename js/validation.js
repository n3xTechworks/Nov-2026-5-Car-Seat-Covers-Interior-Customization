/* Hexstitch: small reusable form validator.
   Browser: every <form data-validate novalidate> is wired automatically.
   Node:    const v = require('./js/validation.js'); v.validateName('Mary') -> '' (valid) or an error message.

   Rules (per field):
     - from data-rule="name|email|phone|pin|future-date|password|required" (space-separated allowed), else
     - inferred: name="name" (or *name) -> name; type=email / name=email -> email;
       type=tel / name=phone -> phone; type=date -> future-date.
     - the `required` attribute makes an empty field an error (checkbox: must be ticked).
     - optional empty fields are valid.
   UI: add data-no-reset to keep values after a successful submit; add data-match="#other" to require equal values (confirm password).
   UI: inline error <p class="field-error" id="<id>-error"> inside the .field (created if missing),
       aria-invalid="true|false", aria-describedby includes the error id; success box [data-form-success]. */
(function (global) {
  'use strict';

  var MSG = {
    required: 'Please fill in this field.',
    requiredCheck: 'Please tick this box to continue.',
    requiredSelect: 'Please choose an option.',
    nameShort: 'Please enter at least 2 letters.',
    nameDigits: 'Names cannot contain numbers.',
    nameChars: "Please use letters, spaces, hyphens ( - ), apostrophes ( ' ) or full stops only.",
    nameLong: 'Please keep the name under 80 characters.',
    email: 'Please enter a full email address, like name@example.com.',
    phoneChars: 'Please use digits only.',
    phoneLength: 'Please enter a 10-digit mobile number.',
    phoneStart: 'Indian mobile numbers start with 6, 7, 8 or 9.',
    pin: 'Please enter a 6-digit PIN code.',
    date: 'Please choose a valid date.',
    datePast: 'Please choose today or a date in the future.',
    password: 'Use at least 8 characters with a letter and a number.',
    match: 'These two fields do not match.'
  };

  function str(v) { return v == null ? '' : String(v).trim(); }

  /* ---------- pure validators: return '' when valid, otherwise a message ---------- */
  function validateRequired(value) {
    return str(value) ? '' : MSG.required;
  }

  function validateName(value) {
    var v = str(value);
    if (!v) return MSG.required;
    if (/\d/.test(v)) return MSG.nameDigits;
    if (!/^[\p{L}\p{M}' .\-’]+$/u.test(v)) return MSG.nameChars;
    var letters = v.match(/\p{L}/gu) || [];
    if (letters.length < 2) return MSG.nameShort;
    if (!/^\p{L}/u.test(v)) return MSG.nameChars;
    if (v.length > 80) return MSG.nameLong;
    return '';
  }

  var EMAIL_RE = /^(?!\.)(?!.*\.\.)[A-Za-z0-9._%+'-]+(?<!\.)@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;
  function validateEmail(value) {
    var v = str(value);
    if (!v) return MSG.required;
    if (v.length > 254 || !EMAIL_RE.test(v)) return MSG.email;
    return '';
  }

  /* Indian mobile: digits only (spaces allowed), exactly 10 digits, starting 6-9 */
  function validatePhone(value) {
    var v = str(value);
    if (!v) return MSG.required;
    if (!/^[\d ]+$/.test(v)) return MSG.phoneChars;
    var d = v.replace(/\D/g, '');
    if (d.length !== 10) return MSG.phoneLength;
    if (!/^[6-9]/.test(d)) return MSG.phoneStart;
    return '';
  }

  function validatePin(value) {
    var v = str(value);
    if (!v) return MSG.required;
    return /^[1-9]\d{5}$/.test(v) ? '' : MSG.pin;
  }

  function toISODate(d) {
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  /* value: 'YYYY-MM-DD' (what <input type="date"> gives). today: Date (defaults to now, local time). */
  function validateFutureDate(value, today) {
    var v = str(value);
    if (!v) return MSG.required;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    if (!m) return MSG.date;
    var y = +m[1], mo = +m[2], d = +m[3];
    var dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return MSG.date;
    if (v < toISODate(today || new Date())) return MSG.datePast;
    return '';
  }

  function validatePassword(value) {
    var v = String(value == null ? '' : value);
    if (!v) return MSG.required;
    if (v.length < 8 || v.length > 128 || !/[A-Za-z]/.test(v) || !/\d/.test(v)) return MSG.password;
    return '';
  }

  var RULES = {
    password: validatePassword,
    required: validateRequired,
    name: validateName,
    email: validateEmail,
    phone: validatePhone,
    pin: validatePin,
    'future-date': validateFutureDate
  };

  /* ---------- field-level logic (DOM-free, so it can be unit tested with plain objects) ---------- */
  function rulesFor(field) {
    var explicit = field.getAttribute && field.getAttribute('data-rule');
    if (explicit) return explicit.split(/\s+/).filter(Boolean);
    var name = (field.name || '').toLowerCase();
    var type = (field.type || '').toLowerCase();
    if (type === 'email' || name === 'email') return ['email'];
    if (name === 'new-password' || name === 'newpassword') return ['password'];
    if (type === 'tel' || name === 'phone' || name === 'mobile') return ['phone'];
    if (name === 'pin' || name === 'pincode') return ['pin'];
    if (type === 'date') return ['future-date'];
    if (name === 'name' || /(^|[-_])(first|last|full)?name$/.test(name)) return ['name'];
    return [];
  }

  function validateField(field) {
    var type = (field.type || '').toLowerCase();
    var required = !!field.required;
    if (type === 'checkbox') return required && !field.checked ? MSG.requiredCheck : '';
    var value = str(field.value);
    if (!value) {
      if (!required) return '';
      return field.tagName === 'SELECT' ? MSG.requiredSelect : MSG.required;
    }
    var rules = rulesFor(field);
    for (var i = 0; i < rules.length; i++) {
      var fn = RULES[rules[i]];
      if (!fn) continue;
      var msg = fn(value);
      if (msg) return msg;
    }
    var matchSel = field.getAttribute && field.getAttribute('data-match');
    if (matchSel && field.form && field.form.querySelector) {
      var other = field.form.querySelector(matchSel);
      if (other && other.value !== field.value) return MSG.match;
    }
    return '';
  }

  var api = {
    MESSAGES: MSG,
    validateRequired: validateRequired,
    validateName: validateName,
    validateEmail: validateEmail,
    validatePhone: validatePhone,
    validatePin: validatePin,
    validateFutureDate: validateFutureDate,
    validatePassword: validatePassword,
    validateField: validateField,
    rulesFor: rulesFor,
    toISODate: toISODate
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  if (typeof document === 'undefined') return;
  global.HXValidation = api;

  /* ---------- browser wiring ---------- */
  var uid = 0;
  function errorEl(field) {
    if (!field.id) field.id = 'fld-' + (field.name || 'x') + '-' + (++uid);
    var id = field.id + '-error';
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('p');
      el.className = 'field-error';
      el.id = id;
      var wrap = field.closest('.field, .check-field') || field.parentNode;
      var host = field.closest('.nl-row') ? field.closest('.newsletter') : wrap;
      host.appendChild(el);
    }
    var ids = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (ids.indexOf(id) === -1) { ids.push(id); field.setAttribute('aria-describedby', ids.join(' ')); }
    return el;
  }

  function show(field, msg) {
    var el = errorEl(field);
    el.textContent = msg;
    field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }

  function fieldsOf(form) {
    return Array.prototype.filter.call(form.elements, function (f) {
      return f.name && !f.disabled && /^(INPUT|SELECT|TEXTAREA)$/.test(f.tagName) && !/^(submit|button|hidden|reset)$/i.test(f.type);
    });
  }

  function wire(form) {
    var submitted = false;
    var success = form.querySelector('[data-form-success]');
    var today = toISODate(new Date());
    form.querySelectorAll('input[type="date"]').forEach(function (d) { if (!d.min) d.min = today; });

    fieldsOf(form).forEach(function (f) {
      f.addEventListener('blur', function () {
        /* Emails are case-insensitive: normalise to lowercase so "Name@GMAIL.com" is stored/sent consistently. */
        if (f.type === 'email' && f.value) f.value = f.value.trim().toLowerCase();
        if (submitted || str(f.value)) show(f, validateField(f));
      });
      f.addEventListener(f.type === 'checkbox' || f.tagName === 'SELECT' ? 'change' : 'input', function () {
        if (f.getAttribute('aria-invalid') === 'true') show(f, validateField(f));
        if (success && !success.hidden) success.hidden = true;
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitted = true;
      var firstBad = null;
      fieldsOf(form).forEach(function (f) {
        if (!show(f, validateField(f)) && !firstBad) firstBad = f;
      });
      if (firstBad) {
        if (success) success.hidden = true;
        firstBad.focus();
        return;
      }
      if (success) {
        var custom = form.getAttribute('data-success-message');
        var text = success.querySelector('[data-success-text]');
        if (custom && text) text.textContent = custom;
        success.hidden = false;
      }
      form.dispatchEvent(new CustomEvent('form:success', { bubbles: true }));
      if (!form.hasAttribute('data-no-reset')) form.reset();
      submitted = false;
      fieldsOf(form).forEach(function (f) { f.setAttribute('aria-invalid', 'false'); errorEl(f).textContent = ''; });
    });
  }

  function init() { document.querySelectorAll('form[data-validate]').forEach(wire); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(typeof window !== 'undefined' ? window : globalThis);
