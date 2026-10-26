import { test, expect } from '@playwright/test';

test('home has clear navigation, game cards, and topic switching', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', {name:'Learn the language.'})).toBeVisible();
  if(await page.locator('#mobile-menu-toggle').isVisible())
    await page.locator('#mobile-menu-toggle').click();
  await expect(page.getByRole('navigation', {name:'Main navigation'})).toBeVisible();
  await page.locator('#activities-menu > summary').click();
  await expect(page.getByRole('link', {name:'Flashcards',exact:true})).toBeVisible();
  await page.keyboard.press('Escape'); // Close the disclosure (and the mobile Menu) before changing topics.
  await page.getByRole('button', { name: /Types of data/ }).click();
  await expect(page).toHaveURL(/#\/home\/data$/);
  await expect(page.getByRole('button', { name: /Types of data/ })).toHaveAttribute('aria-pressed','true');
  if(await page.locator('#mobile-menu-toggle').isVisible())
    await page.locator('#mobile-menu-toggle').click();
  await page.locator('#activities-menu > summary').click();
  await page.getByRole('link', {name:'Flashcards', exact:true}).click();
  await expect(page.getByRole('heading', {name:'Flashcards'})).toBeVisible();
  await expect(page.locator('.activity-topic')).toHaveText('Types of data');
});

test('flashcards reveal answers, toggle direction and save progress', async ({ page }) => {
  await page.goto('/#/flashcards/sampling');
  await expect(page.locator('.flashcard')).toBeVisible();
  const front = await page.locator('.flash-front').innerText();
  await page.getByRole('button',{name:/Term → definition/}).click();
  await expect(page.getByRole('button',{name:/Definition → term/})).toBeVisible();
  await page.locator('.flashcard').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('MODEL ANSWER')).toBeVisible();
  await expect(page.getByText('Example', {exact:true})).toBeVisible();
  await page.getByRole('button',{name:/Know it/}).click();
  await expect(page.locator('.flash-front')).not.toHaveText(front);
  const recorded = await page.evaluate(()=>JSON.parse(localStorage.getItem('sampling-arcade-progress-v1')));
  expect(recorded.answers).toBe(1);
  await page.reload();
  await page.goto('/#/home/sampling');
  await expect(page.locator('.progress-panel .stat-number').first()).toHaveText('1');
});

test('Match Up selects corresponding term and definition and removes matched pair', async ({ page }) => {
  await page.goto('/#/match/data');
  await expect(page.locator('[data-action="match-term"]')).toHaveCount(5);
  const id = await page.locator('[data-action="match-term"]').first().getAttribute('data-id');
  await page.locator('[data-action="match-term"][data-id="' + id + '"]').click();
  await expect(page.locator('[data-action="match-term"][data-id="' + id + '"]')).toHaveAttribute('aria-pressed','true');
  await page.locator('[data-action="match-def"][data-id="' + id + '"]').click();
  await expect(page.locator('[data-action="match-term"]')).toHaveCount(4);
  await expect(page.locator('[data-action="match-def"]')).toHaveCount(4);
  await expect(page.getByText('Correct pair. Well matched!')).toBeVisible();
  const state = await page.evaluate(()=>JSON.parse(localStorage.getItem('sampling-arcade-progress-v1')));
  expect(state.concepts[id].correct).toBe(1);
});

test('Missing Words uses checked answer key and explains incorrect answers', async ({ page }) => {
  await page.goto('/#/cloze/sampling');
  const id = await page.locator('[data-question-id]').getAttribute('data-question-id');
  const current = await page.evaluate(async id => {
    const response = await fetch('./content/cloze.json');
    const json = await response.json();
    return json.cloze.find(q => q.id === id);
  },id);
  const wrong = current.choices.find(choice => choice !== current.answer);
  await page.getByRole('button', {name:wrong, exact:true}).click();
  await expect(page.locator('.feedback-heading')).toContainText(current.answer);
  await expect(page.locator('.option-button:not(:disabled)')).toHaveCount(0);
  await page.getByRole('button', {name:/Next question/}).click();
  await expect(page.locator('[data-question-id]')).not.toHaveAttribute('data-question-id',id);
  await expect(page.locator('[data-action="cloze-option"]:not(:disabled)')).toHaveCount(4);
});

test('progress survives reload and can be reset only after confirmation', async ({page}) => {
  await page.goto('/#/cloze/data');
  await page.locator('[data-action="cloze-option"]').first().click();
  const saved = await page.evaluate(()=>JSON.parse(localStorage.getItem('sampling-arcade-progress-v1')));
  expect(saved.answers).toBe(1);
  await page.reload();
  await page.goto('/#/home/data');
  await expect(page.locator('.progress-panel .stat-number').first()).toHaveText('1');
  page.once('dialog',dialog=>dialog.dismiss());
  await page.getByRole('button',{name:'Reset my progress'}).click();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('sampling-arcade-progress-v1')).answers)).toBe(1);
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Reset my progress'}).click();
  expect(await page.evaluate(()=>localStorage.getItem('sampling-arcade-progress-v1'))).toBe(null);
});

test('mobile layouts remain inside viewport at 320px and 390px', async ({page}) => {
  for (const width of [320,390]) {
    await page.setViewportSize({width,height:780});
    for (const route of ['home','flashcards','match','cloze']) {
      await page.goto('/#/' + route + '/sampling');
      await expect(page.locator('#app')).not.toContainText('Loading your revision activities');
      const dimensions=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewport:window.innerWidth}));
      expect(dimensions.scrollWidth,route + ' at ' + width).toBeLessThanOrEqual(dimensions.viewport+1);
    }
  }
});

test('damaged local progress does not stop a new session', async ({page}) => {
  await page.goto('/#/home/sampling');
  await page.evaluate(()=>localStorage.setItem('sampling-arcade-progress-v1','{not json}'));
  await page.reload();
  await expect(page.getByRole('heading',{name:'Choose a challenge'})).toBeVisible();
  await page.goto('/#/cloze/sampling');
  await expect(page.locator('.option-button')).toHaveCount(4);
});


test('a full Match Up round is recorded and a new round starts cleanly', async ({page}) => {
  await page.goto('/#/match/data');
  for (let i = 0; i < 5; i++) {
    const id = await page.locator('[data-action="match-term"]').first().getAttribute('data-id');
    await page.locator('[data-action="match-term"][data-id="' + id + '"]').click();
    await page.locator('[data-action="match-def"][data-id="' + id + '"]').click();
  }
  await expect(page.getByText('Round complete', {exact:true})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('sampling-arcade-progress-v1')).sessions)).toBe(1);
  await page.getByRole('button',{name:/Play another round/}).click();
  await expect(page.locator('[data-action="match-term"]')).toHaveCount(5);
});

test('a full Missing Words round can be finished from the checked data bank', async ({page}) => {
  await page.goto('/#/cloze/data');
  const bank = await page.evaluate(async()=>{
    const response = await fetch('./content/cloze.json');
    return (await response.json()).cloze;
  });
  const dataQuestions = bank.filter(q => ['qualitative-data','quantitative-data','discrete-variable','continuous-variable','grouped-frequency-table','class-boundaries','class-width','class-midpoint'].includes(q.conceptId));
  for (let i = 0; i < dataQuestions.length; i++) {
    const id = await page.locator('[data-question-id]').getAttribute('data-question-id');
    const item = bank.find(q => q.id === id);
    await page.getByRole('button',{name:item.answer,exact:true}).click();
    await page.locator('[data-action="cloze-next"]').click();
  }
  await expect(page.getByText('Round complete', {exact:true})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('sampling-arcade-progress-v1')).sessions)).toBe(1);
});

test('skip link focuses content without breaking the current game route', async ({page}) => {
  await page.goto('/#/flashcards/sampling');
  await page.locator('.skip-link').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#main')).toBeFocused();
  await expect(page).toHaveURL(/#\/flashcards\/sampling$/);
  await expect(page.locator('.flashcard')).toBeVisible();
});
