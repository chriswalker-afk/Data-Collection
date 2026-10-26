import { test, expect } from '@playwright/test';

async function loadBank(page, name, collection) {
  return page.evaluate(async ({name,collection}) => {
    const response = await fetch('./content/' + name + '.json');
    if (!response.ok) throw new Error('Missing ' + name + ' bank');
    return (await response.json())[collection];
  }, {name,collection});
}
async function savedProgress(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('sampling-arcade-progress-v1')));
}

test('two new games are visible and sampling-only routes stay honest', async ({page}) => {
  await page.goto('/#/home/data');
  await expect(page.locator('.game-card')).toHaveCount(9);
  await expect(page.locator('.game-card').filter({hasText:'Sort It!'})).toContainText('Sampling only');
  await expect(page.locator('.game-card').filter({hasText:'Which Method?'})).toContainText('Sampling only');
  await page.locator('.game-card').filter({hasText:'Sort It!'}).click();
  await expect(page).toHaveURL(/#\/sort\/sampling$/);
  await expect(page.getByRole('heading',{name:'Sort It!'})).toBeVisible();
  await expect(page.locator('.activity-scope')).toContainText('Sampling methods only');
  await expect(page.locator('.classification-choice')).toHaveCount(2);
  await page.getByRole('link',{name:'Which Method?',exact:true}).click();
  await expect(page).toHaveURL(/#\/identify\/sampling$/);
  await expect(page.getByRole('heading',{name:'Which Method?'})).toBeVisible();
  await expect(page.locator('.classification-choice')).toHaveCount(5);
  await page.goto('/#/identify/data');
  await expect(page.locator('.activity-topic')).toHaveText('Sampling');
});

test('Sort It! grades the actual evaluation and logs an answer only once', async ({page}) => {
  await page.goto('/#/sort/sampling');
  await expect(page.locator('#sort-set')).toHaveValue('sort-srs');
  const cards = await loadBank(page,'evaluations','evaluations');
  const id = await page.locator('[data-item-id]').getAttribute('data-item-id');
  const card = cards.find(item => item.id === id);
  expect(card).toBeTruthy();
  const wrong = card.polarity === 'advantage' ? 'disadvantage' : 'advantage';
  await page.locator('[data-action="classify-option"][data-choice="' + wrong + '"]').click();
  await expect(page.locator('.classification-feedback')).toBeVisible();
  await expect(page.locator('.classification-feedback')).toContainText(card.explanation);
  await expect(page.locator('.feedback-heading')).toContainText(card.polarity === 'advantage' ? 'Advantage' : 'Disadvantage');
  await expect(page.locator('.classification-choice:disabled')).toHaveCount(2);
  const stored = await savedProgress(page);
  expect(stored.answers).toBe(1);
  expect(stored.concepts['simple-random-sampling'].attempts).toBe(1);
  expect(stored.concepts['simple-random-sampling'].correct).toBe(0);
  await page.locator('[data-action="classify-option"]').first().evaluate(node=>node.click());
  expect((await savedProgress(page)).answers).toBe(1);
  await page.getByRole('button',{name:'Next question →'}).click();
  await expect(page.locator('[data-item-id]')).not.toHaveAttribute('data-item-id',id);
});

test('Sort It! offers all nine sets including the explicit comparisons', async ({page}) => {
  await page.goto('/#/sort/sampling');
  await expect(page.locator('#sort-set option')).toHaveCount(9);
  await page.locator('#sort-set').selectOption('compare-quota-stratified');
  await expect(page.locator('.classification-choice')).toHaveCount(2);
  await expect(page.locator('[data-choice="stratified"]')).toBeVisible();
  await expect(page.locator('[data-choice="quota"]')).toBeVisible();
  const bank = await loadBank(page,'sort-rounds','rounds');
  const cardId = await page.locator('[data-item-id]').getAttribute('data-item-id');
  const [roundId,index] = cardId.split(':');
  const card = bank.find(item=>item.id===roundId).cards[Number(index)];
  await page.locator('[data-action="classify-option"][data-choice="' + card.answer + '"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.classification-feedback')).toContainText(card.why);
  await expect(page.locator('.classification-feedback')).toBeFocused();
  await expect(page.locator('[data-choice="'+card.answer+'"]')).toHaveAttribute('aria-pressed','true');
  await page.locator('#sort-set').selectOption('compare-simple-systematic');
  await expect(page.locator('[data-choice="simple-random"]')).toBeVisible();
  await expect(page.locator('[data-choice="systematic"]')).toBeVisible();
});

test('Sort It! completes a census round and saves result with no duplicate session', async ({page}) => {
  await page.goto('/#/sort/sampling');
  await page.locator('#sort-set').selectOption('sort-census');
  const evaluations = await loadBank(page,'evaluations','evaluations');
  for (let i=0;i<5;i++) {
    const id = await page.locator('[data-item-id]').getAttribute('data-item-id');
    const card = evaluations.find(item=>item.id===id);
    await page.locator('[data-action="classify-option"][data-choice="'+card.polarity+'"]').click();
    await page.locator('[data-action="classify-next"]').click();
  }
  await expect(page.getByText('Round complete', {exact:true})).toBeVisible();
  await expect(page.locator('.completion-score')).toContainText('5 of 5');
  const stored = await savedProgress(page);
  expect(stored.answers).toBe(5);
  expect(stored.sessions).toBe(1);
  expect(stored.concepts.census.streak).toBe(5);
  await page.reload();
  await page.goto('/#/home/sampling');
  await expect(page.locator('.progress-panel .stat-number').first()).toHaveText('5');
});

test('Which Method? balances one of each in quick mode and completes a round', async ({page}) => {
  await page.goto('/#/identify/sampling');
  await expect(page.locator('#scenario-length')).toHaveValue('10');
  await page.locator('#scenario-length').selectOption('5');
  const bank = await loadBank(page,'scenarios','scenarios');
  const seen = new Set();
  for(let i=0;i<5;i++) {
    const id = await page.locator('[data-item-id]').getAttribute('data-item-id');
    const scenario = bank.find(item=>item.id===id);
    seen.add(scenario.correctMethod);
    await page.locator('[data-action="classify-option"][data-choice="'+scenario.correctMethod+'"]').click();
    await expect(page.locator('.classification-feedback')).toContainText(scenario.reason);
    await expect(page.locator('.feedback-contrast')).toHaveText(scenario.contrast);
    await page.locator('[data-action="classify-next"]').click();
  }
  expect(seen.size).toBe(5);
  await expect(page.getByText('Round complete', {exact:true})).toBeVisible();
  await expect(page.locator('.completion-score')).toContainText('5 of 5');
  const stored=await savedProgress(page);
  expect(stored.answers).toBe(5);
  expect(stored.sessions).toBe(1);
  await page.getByRole('button',{name:/Play another round/}).click();
  await expect(page.locator('[data-item-id]')).toBeVisible();
  await expect(page.locator('#scenario-length')).toHaveValue('5');
});

test('Which Method? incorrect response shows contrast and does not award false mastery', async ({page}) => {
  await page.goto('/#/identify/sampling');
  const bank=await loadBank(page,'scenarios','scenarios');
  const id = await page.locator('[data-item-id]').getAttribute('data-item-id');
  const scenario=bank.find(item=>item.id===id);
  const wrong=['simple-random','systematic','stratified','quota','opportunity'].find(x=>x!==scenario.correctMethod);
  await page.locator('[data-action="classify-option"][data-choice="'+wrong+'"]').click();
  await expect(page.locator('.feedback-heading')).toContainText('Not quite');
  await expect(page.locator('.feedback-contrast')).toContainText(scenario.contrast);
  await expect(page.locator('[data-choice="'+scenario.correctMethod+'"]')).toHaveClass(/is-correct/);
  const state=await savedProgress(page);
  expect(state.answers).toBe(1);
  const stats=Object.values(state.concepts);
  expect(stats.length).toBe(1);
  expect(stats[0].correct).toBe(0);
  await page.reload();
  await page.goto('/#/home/sampling');
  await expect(page.locator('.progress-panel .stat-number').first()).toHaveText('1');
});

test('new games remain usable at 320px and 390px including answer feedback', async ({page}) => {
  for(const width of [320,390]) {
    await page.setViewportSize({width,height:780});
    for(const game of ['sort','identify']) {
      await page.goto('/#/'+game+'/sampling');
      await expect(page.locator('.classification-choice').first()).toBeVisible();
      let sizes = await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,width:innerWidth}));
      expect(sizes.scrollWidth, game+' '+width).toBeLessThanOrEqual(width+1);
      await page.locator('[data-action="classify-option"]').first().click();
      await expect(page.locator('.classification-feedback')).toBeVisible();
      sizes=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,width:innerWidth}));
      expect(sizes.scrollWidth, game+' feedback '+width).toBeLessThanOrEqual(width+1);
    }
  }
});

test('keyboard-only student can choose a scenario answer and continue', async ({page}) => {
  await page.goto('/#/identify/sampling');
  await page.locator('.classification-choice').first().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.classification-feedback')).toBeFocused();
  await expect(page.locator('.classification-choice:disabled')).toHaveCount(5);
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-action="classify-next"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.classification-choice:not(:disabled)')).toHaveCount(5);
});
