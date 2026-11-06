/* contact page: "Send a message" success state */
(function () {
  'use strict';
  var form = document.getElementById('contactForm');
  if (!form) return;
  var wrap = document.querySelector('[data-msg-form-wrap]');
  var done = document.querySelector('[data-msg-done]');
  form.addEventListener('form:success', function () {
    var name = (form.elements.name.value || '').trim().split(/\s+/)[0];
    var phone = (form.elements.phone.value || '').replace(/\D/g, '');
    var topic = form.elements.topic.value;
    var ref = 'HX-M-' + String(Date.now()).slice(-4);
    done.querySelector('[data-msg-done-title]').textContent = 'Thanks, ' + name + '. Message sent.';
    done.querySelector('[data-msg-done-text]').textContent = 'Our studio team will reply about "' + topic + '" within one working day, by email or on +91 ' + phone.slice(0, 5) + ' ' + phone.slice(5) + '.';
    done.querySelector('[data-msg-ref]').textContent = 'Reference ' + ref;
    wrap.hidden = true;
    done.hidden = false;
    done.querySelector('[data-msg-done-title]').focus();
    if (window.HX && HX.toast) HX.toast('Message sent. We reply within one working day.', 'ok');
  });
  done.querySelector('[data-msg-again]').addEventListener('click', function () {
    done.hidden = true;
    wrap.hidden = false;
    form.reset();
    form.elements.name.focus();
  });
})();
