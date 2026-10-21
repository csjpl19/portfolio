const { test, expect } = require('@playwright/test');
const pages = ['index.html', 'profil.html', 'merci.html', 'confidentialite.html'];
test.use({ locale: 'fr-FR' });

test('English default, complete round trip and responsive French on all pages', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const file of pages) {
    await page.setViewportSize({ width: 1440, height: 950 });
    await page.goto('/' + file + '?lang=en');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    const english = await page.locator('[data-i18n], [data-i18n-attrs]').evaluateAll(nodes => nodes.map(node => ({
      text: node.textContent, label: node.getAttribute('aria-label'), placeholder: node.getAttribute('placeholder'), content: node.getAttribute('content')
    })));
    await page.getByRole('button', { name: 'Switch to French', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.locator('.primary-nav a').first()).toHaveText('Accueil');
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'fr_FR');
    await expect(page.locator('.footer-bottom')).toContainText('Confidentialité');
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), `${file} French overflow at ${width}`).toBe(false);
      if (width === 320) {
        await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
        await expect(page.getByRole('button', { name: 'Passer en anglais', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Fermer le menu' })).toBeVisible();
        await page.locator('.language-switch').click();
        await expect(page.getByRole('button', { name: 'Close menu' })).toBeVisible();
        await page.locator('.language-switch').click();
        await expect(page.getByRole('button', { name: 'Fermer le menu' })).toBeVisible();
        await page.keyboard.press('Escape');
      }
    }
    await page.getByRole('button', { name: 'Passer en anglais', exact: true }).focus();
    await page.getByRole('button', { name: 'Passer en anglais', exact: true }).click();
    const restored = await page.locator('[data-i18n], [data-i18n-attrs]').evaluateAll(nodes => nodes.map(node => ({
      text: node.textContent, label: node.getAttribute('aria-label'), placeholder: node.getAttribute('placeholder'), content: node.getAttribute('content')
    })));
    expect(restored).toEqual(english);
    await expect(page.locator('.language-switch')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(page.locator('.language-switch')).toHaveAccessibleName('Passer en anglais');
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  }
  expect(errors).toEqual([]);
});

test('explicit choice persists through navigation, reload and confirmation page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.locator('.language-switch').click();
  await page.getByRole('link', { name: 'Voir mon profil' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page).toHaveTitle('Mon profil');
  await expect(page.locator('#parcours')).toContainText('Étudiant en L4');
  await page.reload();
  await expect(page.locator('.language-switch')).toHaveAccessibleName('Passer en anglais');
  await page.goto('/merci.html');
  await expect(page.locator('h1')).toContainText('Merci pour');
  await page.locator('.language-switch').click();
  await page.goto('/profil.html');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#parcours')).toContainText('Fourth-year (L4)');
});

test('French remains usable when browser storage is blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
  });
  await page.goto('/');
  await page.locator('.language-switch').click();
  await page.getByRole('link', { name: 'Voir mon profil' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect(page.locator('#projets')).toContainText('Temporairement indisponibles');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
});

test('switching language preserves form values and translates validation and offline status', async ({ page, context }) => {
  await page.goto('/');
  await page.locator('#contact-name').fill('Visitor');
  await page.locator('#contact-email').fill('test@example.com');
  await page.locator('#contact-company').fill('Example');
  await page.locator('#contact-type').selectOption({ label: 'Website or application development' });
  await page.locator('#contact-message').fill('short');
  await page.locator('.language-switch').click();
  await expect(page.locator('#contact-message')).toHaveValue('short');
  expect(await page.locator('#contact-message').evaluate(node => node.validationMessage)).toContain('au moins 20 caractères');
  await expect(page.locator('#contact-type option:checked')).toHaveText('Création de site ou d’application');
  await expect(page.locator('#contact-type')).toHaveValue('Website or application development');
  await expect(page.locator('#contact-name')).toHaveValue('Visitor');
  await expect(page.locator('#contact-email')).toHaveValue('test@example.com');
  await expect(page.locator('#contact-company')).toHaveValue('Example');
  await page.locator('#contact-message').fill('Test message that stays in the form when changing languages.');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Envoyer mon message' }).click();
  await expect(page.getByRole('status')).toContainText('hors ligne');
  await page.locator('.language-switch').click();
  await expect(page.getByRole('status')).toContainText('offline');
  await expect(page.locator('#contact-message')).toHaveValue('Test message that stays in the form when changing languages.');
  await expect(page.getByRole('button', { name: 'Send my message' })).toBeEnabled();
});

test('French submission returns to French and resets correctly after going back', async ({ page }) => {
  let payload;
  await page.route('https://formsubmit.co/**', async route => {
    payload = new URLSearchParams(route.request().postData());
    await route.fulfill({ status: 303, headers: { location: payload.get('_next') } });
  });
  await page.goto('/?lang=fr');
  await page.locator('#contact-name').fill('Visiteur');
  await page.locator('#contact-email').fill('test@example.com');
  await page.locator('#contact-type').selectOption({ label: 'Création de site ou d’application' });
  await page.locator('#contact-message').fill('Message de test intercepté, aucun e-mail réel envoyé.');
  await page.getByRole('button', { name: 'Envoyer mon message' }).click();
  await expect(page).toHaveURL(/merci\.html\?lang=fr$/);
  await expect(page.locator('h1')).toContainText('Merci pour');
  expect(payload.get('_subject')).toBe('Portfolio — Nouvelle prise de contact');
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Envoyer mon message' })).toBeEnabled();
  await page.locator('.language-switch').click();
  await expect(page.getByRole('button', { name: 'Send my message' })).toBeEnabled();
  await expect(page.locator('.contact-submit [aria-hidden]')).toHaveCount(1);
});
