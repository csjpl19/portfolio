// Les pages et le formulaire restent utilisables sans JavaScript.
document.querySelectorAll('[data-current-year]').forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});

const contactForm = document.querySelector('.contact-form');
if (contactForm) {
  const submitButton = contactForm.querySelector('[type="submit"]');
  const status = contactForm.querySelector('.form-status');
  const initialLabel = submitButton.innerHTML;
  let resetTimer;

  // Le retour fonctionne aussi depuis l’URL github.io du dépôt ou l’aperçu local.
  if (['http:', 'https:'].includes(window.location.protocol)) {
    contactForm.elements.namedItem('_next').value = new URL('merci.html', window.location.href).href;
  }
  const nameInput = contactForm.elements.namedItem('name');
  const messageInput = contactForm.elements.namedItem('message');
  const validateText = () => {
    nameInput.setCustomValidity(nameInput.value.trim() ? '' : 'Indiquez votre nom.');
    messageInput.setCustomValidity(messageInput.value.trim().length >= 20 ? '' : 'Décrivez votre demande en au moins 20 caractères.');
  };
  [nameInput, messageInput].forEach((input) => input.addEventListener('input', validateText));
  const resetSubmission = () => {
    window.clearTimeout(resetTimer);
    submitButton.disabled = false;
    submitButton.innerHTML = initialLabel;
    contactForm.removeAttribute('aria-busy');
    status.textContent = '';
  };
  contactForm.addEventListener('submit', (event) => {
    validateText();
    if (!contactForm.reportValidity()) { event.preventDefault(); return; }
    if (!navigator.onLine) {
      event.preventDefault();
      status.textContent = 'Vous semblez hors ligne. Votre message est conservé dans le formulaire : reconnectez-vous puis réessayez.';
      return;
    }
    if (submitButton.disabled) { event.preventDefault(); return; }
    // POST natif : FormSubmit gère la vérification anti-spam et le retour.
    // Aucun succès d’envoi n’est simulé dans cette page.
    submitButton.disabled = true;
    submitButton.textContent = 'Ouverture de la vérification…';
    contactForm.setAttribute('aria-busy', 'true');
    status.textContent = 'Vous allez accéder à la vérification anti-spam pour finaliser votre envoi.';
    resetTimer = window.setTimeout(() => {
      resetSubmission();
      status.textContent = 'Si la page de vérification ne s’est pas ouverte, réessayez ou utilisez le lien e-mail ci-contre.';
    }, 15000);
  });
  // Réactive le bouton après un retour arrière du navigateur.
  window.addEventListener('pageshow', resetSubmission);
}
