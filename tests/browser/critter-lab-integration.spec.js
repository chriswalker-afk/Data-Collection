import { test, expect } from '@playwright/test';

const KEY = 'critter-lab.avatar.v1';

async function ready(page) {
  await expect(page.locator('#creator-controls')).toBeVisible();
  await expect(page.locator('#critter-picture svg')).toHaveCount(3);
  await expect(page.locator('#head-options button')).toHaveCount(8);
  await expect(page.locator('#body-options button')).toHaveCount(6);
  await expect(page.locator('#legs-options button')).toHaveCount(6);
}

test('Sampling homepage offers Critter Lab without replacing any revision activities', async ({ page }) => {
  await page.goto('/index.html#/home/sampling');
  await expect(page.locator('.game-card')).toHaveCount(10);
  await expect(page.locator('.arcade-path-card')).toHaveCount(3);
  const promo = page.locator('.arcade-critter-promo');
  await expect(promo.getByRole('heading', { name: /build your critter/i })).toBeVisible();
  await promo.getByRole('link', { name: /open critter lab/i }).click();
  await expect(page).toHaveURL(/\/critter-lab\/index\.html$/);
  await ready(page);
  await expect(page.locator('#critter-name')).toHaveText('Foxy Waddler');
});

test('independent colours and animal parts persist across Arcade and Multiplayer pages', async ({ page }) => {
  await page.goto('/index.html#/home/sampling');
  const initialProgress = await page.evaluate(() => {
    localStorage.setItem('sampling-arcade-progress-v1', JSON.stringify({version:1,answers:0,sessions:0,concepts:{}}));
    return localStorage.getItem('sampling-arcade-progress-v1');
  });
  await page.goto('/critter-lab/index.html');
  await ready(page);
  await page.getByRole('button', { name: 'Owl head' }).click();
  await page.getByRole('button', { name: 'Bear body' }).click();
  await page.getByRole('button', { name: 'Rabbit legs' }).click();
  await page.getByRole('button', { name: 'Grape purple head colour' }).click();
  await page.getByRole('button', { name: 'Ocean teal body colour' }).click();
  await page.getByRole('button', { name: 'Sunset orange legs colour' }).click();
  await expect(page.locator('#critter-name')).toHaveText('Owly Hugger');
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved).toEqual({
    version: 1, head: 'owl', body: 'bear', legs: 'rabbit',
    colours: { head: 'grape-purple', body: 'ocean-teal', legs: 'sunset-orange' }
  });
  await page.getByRole('link', { name: /multiplayer arena/i }).click();
  await expect(page).toHaveURL(/\/multiplayer\.html$/);
  await expect(page.locator('#join-form')).toBeVisible();
  await expect(page.locator('.critter-entry-invite')).toContainText('Create or change your critter');
  await page.locator('.critter-entry-invite a').click();
  await ready(page);
  await expect(page.locator('#critter-name')).toHaveText('Owly Hugger');
  await expect(page.getByRole('button', { name: 'Grape purple head colour' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('link', { name: /solo arcade/i }).click();
  await expect(page.locator('.game-card')).toHaveCount(10);
  expect(await page.evaluate(() => localStorage.getItem('sampling-arcade-progress-v1'))).toBe(initialProgress);
});

test('creator remains usable on narrow phones without page overflow or remote assets', async ({ page }) => {
  const externals = [];
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:4173/')) externals.push(request.url()); });
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/critter-lab/index.html');
    await ready(page);
    await expect(page.getByRole('link', { name: /multiplayer arena/i })).toBeVisible();
    await page.getByRole('button', { name: 'Frog head' }).click();
    await page.getByRole('button', { name: 'Dino body' }).click();
    await page.getByRole('button', { name: 'Duck legs' }).click();
    await expect(page.locator('#critter-description')).toHaveText('Frog head · Dino body · Duck legs');
    const dims = await page.evaluate(() => ({ body: document.body.scrollWidth, viewport: document.documentElement.clientWidth }));
    expect(dims.body, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(dims.viewport + 1);
  }
  expect(externals).toEqual([]);
});

test('critter workshop is optional when joining an existing classroom', async ({ page }) => {
  await page.goto('/multiplayer.html?room=123456');
  await expect(page.locator('#room-code')).toHaveValue('123456');
  await expect(page.locator('#join')).toBeEnabled();
  await expect(page.locator('.critter-entry-invite a')).toHaveAttribute('href', './critter-lab/index.html');
  await page.locator('.critter-entry-invite a').click();
  await ready(page);
  await expect(page.getByRole('link', { name: /multiplayer arena/i })).toHaveAttribute('href', '../multiplayer.html?room=123456');
  await page.getByRole('link', { name: /multiplayer arena/i }).click();
  await expect(page).toHaveURL(/\/multiplayer\.html\?room=123456$/);
  await expect(page.locator('#room-code')).toHaveValue('123456');
});