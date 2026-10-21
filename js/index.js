// Pages and the native form remain usable without JavaScript.
document.querySelectorAll('[data-current-year]').forEach(element => {
  element.textContent = String(new Date().getFullYear());
});

const contactForm = document.querySelector('.contact-form');
if (contactForm) {
  const submitButton = contactForm.querySelector('[type="submit"]');
  const submitLabel = [...submitButton.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
  const status = contactForm.querySelector('.form-status');
  const nameInput = contactForm.elements.namedItem('name');
  const messageInput = contactForm.elements.namedItem('message');
  const i18n = window.PortfolioI18n;
  let resetTimer;
  let statusKey = '';

  const updateReturnUrl = () => {
    if (['http:', 'https:'].includes(location.protocol)) {
      const url = new URL('merci.html', location.href);
      url.searchParams.set('lang', i18n.language);
      contactForm.elements.namedItem('_next').value = url.href;
    }
  };
  const renderSubmission = () => {
    submitLabel.textContent = i18n.t(submitButton.disabled ? 'form.opening' : 'form.send') + ' ';
    status.textContent = statusKey ? i18n.t(statusKey) : '';
  };
  const validateText = () => {
    nameInput.setCustomValidity(nameInput.value.trim() ? '' : i18n.t('form.name'));
    messageInput.setCustomValidity(messageInput.value.trim().length >= 20 ? '' : i18n.t('form.message'));
  };
  [nameInput, messageInput].forEach(input => input.addEventListener('input', validateText));
  const resetSubmission = () => {
    clearTimeout(resetTimer);
    submitButton.disabled = false;
    contactForm.removeAttribute('aria-busy');
    statusKey = '';
    renderSubmission();
  };
  document.addEventListener('languagechange', () => {
    updateReturnUrl();
    validateText();
    renderSubmission();
  });
  updateReturnUrl();
  contactForm.addEventListener('submit', event => {
    validateText();
    if (!contactForm.reportValidity()) { event.preventDefault(); return; }
    if (!navigator.onLine) {
      event.preventDefault();
      statusKey = 'form.offline';
      renderSubmission();
      return;
    }
    if (submitButton.disabled) { event.preventDefault(); return; }
    // Native POST: FormSubmit handles verification and the redirect.
    submitButton.disabled = true;
    contactForm.setAttribute('aria-busy', 'true');
    statusKey = 'form.pending';
    renderSubmission();
    resetTimer = setTimeout(() => {
      resetSubmission();
      statusKey = 'form.retry';
      renderSubmission();
    }, 15000);
  });
  window.addEventListener('pageshow', resetSubmission);
}
