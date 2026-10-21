const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const pages = ['index.html', 'profil.html', 'merci.html', 'confidentialite.html'];

test('pages, assets, liens internes et affichage responsive', async ({ page, request }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const file of pages) {
    await page.goto('/' + file);
    await expect(page.locator('h1')).toHaveCount(1);
    await page.locator('img[loading="lazy"]').evaluateAll(images => images.forEach(img => { img.loading = 'eager'; }));
    await expect.poll(() => page.locator('img').evaluateAll(images => images.filter(img => !img.complete || !img.naturalWidth).map(img => img.src)), { message: file + ' images chargées' }).toEqual([]);
    const links = await page.locator('a[href], link[href], script[src], img[src]').evaluateAll(nodes => nodes.map(el => el.getAttribute('href') || el.getAttribute('src')));
    for (const link of new Set(links)) {
      if (/^(https?:|mailto:)/.test(link)) continue;
      const [target, hash] = link.split('#');
      const destination = target || file;
      expect(fs.existsSync(path.resolve(destination)), `${file} → ${link}`).toBe(true);
      if (hash) expect(fs.readFileSync(destination, 'utf8'), `${file} → ${link}`).toContain(`id="${hash}"`);
      if (target) expect((await request.get('/' + target)).status()).toBe(200);
    }
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      expect(overflow, `${file} débordement à ${width}px`).toBe(false);
      const overhanging = await page.locator('header, main, footer, h1, form').evaluateAll(nodes => nodes.filter(n => n.getBoundingClientRect().right > innerWidth + 1).map(n => n.tagName));
      expect(overhanging, `${file} éléments coupés à ${width}px`).toEqual([]);
      if ([390, 1440].includes(width) && ['index.html', 'profil.html'].includes(file)) {
        await page.screenshot({ path: `.local/screenshots/${file.replace('.html', '')}-${width}.png`, fullPage: true });
      }
    }
  }
  expect(errors).toEqual([]);
});

test('navigation au clavier, noms accessibles et liens sociaux', async ({ page }) => {
  for (const file of pages) {
    await page.goto('/' + file);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#contenu-principal$/);
    await expect(page.locator('.brand')).toHaveAccessibleName(/Carl Stephen Jr\..*Software Engineer.*home/);
    const brokenSemantics = await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
      return {
        duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
        unnamedSocials: [...document.querySelectorAll('.social-link')].filter(el => !el.getAttribute('aria-label') || !el.querySelector('svg')).length,
        unsafeNewTabs: [...document.querySelectorAll('a[target="_blank"]')].filter(el => !el.relList.contains('noopener')).length
      };
    });
    expect(brokenSemantics).toEqual({ duplicateIds: [], unnamedSocials: 0, unsafeNewTabs: 0 });
  }
});

test('le repère de navigation suit les sections sans rester sur Accueil', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const nav = page.locator('.primary-nav');
  await expect(nav.locator('[aria-current]')).toHaveText('Home');
  await nav.getByRole('link', { name: 'Expertise', exact: true }).click();
  await expect(nav.locator('[aria-current]')).toHaveText('Expertise');
  await nav.getByRole('link', { name: 'Let’s talk about your project' }).click();
  await expect(nav.locator('[aria-current]')).toContainText('Let’s talk about your project');
  await page.locator('#solvix').scrollIntoViewIfNeeded();
  await page.evaluate(() => document.getElementById('solvix').scrollIntoView());
  await expect(nav.locator('[aria-current]')).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(nav.locator('[aria-current]')).toHaveText('Home');
});

test('profil, INUKA, projets indisponibles et Solvix futur', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#projets')).toHaveCount(0);
  await expect(page.locator('#solvix')).toContainText('The project has not launched yet');
  await page.getByRole('link', { name: 'View my profile' }).click();
  await expect(page).toHaveURL(/profil\.html$/);
  await expect(page.locator('#parcours')).toContainText('INUKA University');
  await expect(page.locator('#parcours')).toContainText('Fourth-year (L4) student');
  await expect(page.locator('#projets')).toContainText('Temporarily unavailable');
  await expect(page.locator('.primary-nav [aria-current="page"]')).toHaveText('My profile');
});

test('menu mobile : ouverture, Échap, navigation et redimensionnement', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Open menu' });
  await expect(page.locator('.primary-nav')).not.toBeVisible();
  await toggle.click();
  await expect(page.locator('.primary-nav')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await expect(page.locator('.primary-nav')).not.toBeVisible();
  await toggle.click();
  await page.locator('.primary-nav').getByRole('link', { name: 'Expertise', exact: true }).click();
  await expect(page).toHaveURL(/#expertise$/);
  await expect(page.locator('.primary-nav')).not.toBeVisible();
  await page.setViewportSize({ width: 1440, height: 950 });
  await expect(page.locator('.primary-nav')).toBeVisible();
});

async function fillForm(page) {
  await page.getByLabel('Your name *', { exact: true }).fill('Visiteur de test');
  await page.getByLabel('Your email *', { exact: true }).fill('test@example.com');
  await page.getByLabel('Organisation').fill('Organisation de test');
  await page.getByLabel('Message subject').selectOption({ label: 'Website or application development' });
  await page.getByLabel('Your message *', { exact: true }).fill('Message de test local, aucun e-mail réel ne doit être envoyé.');
}

test('validation du formulaire puis POST complet intercepté, sans e-mail réel', async ({ page }) => {
  let payload;
  await page.route('https://formsubmit.co/**', async route => {
    payload = { method: route.request().method(), url: route.request().url(), data: new URLSearchParams(route.request().postData()) };
    await route.fulfill({ status: 303, headers: { location: 'http://127.0.0.1:4173/merci.html' } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Send my message' }).click();
  expect(payload).toBeUndefined();
  await fillForm(page);
  await page.getByLabel('Your message *', { exact: true }).fill('                         ');
  await page.getByRole('button', { name: 'Send my message' }).click();
  expect(payload).toBeUndefined();
  await fillForm(page);
  await page.getByRole('button', { name: 'Send my message' }).click();
  await expect(page).toHaveURL(/merci\.html$/);
  expect(payload.method).toBe('POST');
  expect(payload.url).toBe('https://formsubmit.co/messagerie@carlstephenjuniorpierrelouis.site');
  expect(payload.data.get('name')).toBe('Visiteur de test');
  expect(payload.data.get('email')).toBe('test@example.com');
  expect(payload.data.get('organisation')).toBe('Organisation de test');
  expect(payload.data.get('sujet')).toBe('Website or application development');
  expect(payload.data.get('message')).toContain('aucun e-mail réel');
  expect(payload.data.get('_honey')).toBe('');
  expect(payload.data.get('_captcha')).not.toBe('false');
  expect(payload.data.get('_next')).toBe('http://127.0.0.1:4173/merci.html?lang=en');
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Send my message' })).toBeEnabled();
});

test('hors ligne : message préservé, erreur compréhensible et bouton disponible', async ({ page, context }) => {
  await page.goto('/');
  await fillForm(page);
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Send my message' }).click();
  await expect(page.getByRole('status')).toContainText('offline');
  await expect(page.getByLabel('Your message *', { exact: true })).toHaveValue(/Message de test local/);
  await expect(page.getByRole('button', { name: 'Send my message' })).toBeEnabled();
});

test('sans JavaScript : navigation mobile et formulaire natif disponibles', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  let sent = false;
  await page.route('https://formsubmit.co/**', async route => {
    sent = route.request().method() === 'POST';
    await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: '<p>Envoi intercepté par le test.</p>' });
  });
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('h1')).toContainText('Clear ideas.');
  await expect(page.locator('.language-switch')).not.toBeVisible();
  await expect(page.locator('.primary-nav')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open menu' })).not.toBeVisible();
  await fillForm(page);
  await page.getByRole('button', { name: 'Send my message' }).click();
  await expect(page.getByText('Envoi intercepté par le test.')).toBeVisible();
  expect(sent).toBe(true);
  await context.close();
});
