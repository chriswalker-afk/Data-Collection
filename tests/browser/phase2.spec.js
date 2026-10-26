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
  await expect(page.locator('.game-card')).toHaveCount(10);
  await expect(page.locator('.game-card').filter({hasText:'Sort It!'})).toContainText('Sampling only');
  await expect(page.locator('.game-card').filter({hasText:'Which Method?'})).toContainText('Sampling only');
  await page.locator('.game-card').filter({hasText:'Sort It!'}).click();
  await expect(page).toHaveURL(/#\/sort\/sampling$/);
  await expect(page.getByRole('heading',{name:'Sort It!'})).toBeVisible();
  await expect(page.locator('.activity-scope')).toContainText('Sampling methods only');
  await expect(page.locator('.sort-drop-zone')).toHaveCount(4);
  await expect(page.locator('.sort-tray .sort-card')).toHaveCount(10);
  if(await page.locator('#mobile-menu-toggle').isVisible())
    await page.locator('#mobile-menu-toggle').click();
  await page.locator('#activities-menu > summary').click();
  await page.getByRole('link',{name:'Which Method?',exact:true}).click();
  await expect(page).toHaveURL(/#\/identify\/sampling$/);
  await expect(page.getByRole('heading',{name:'Which Method?'})).toBeVisible();
  await expect(page.locator('.classification-choice')).toHaveCount(5);
  await page.goto('/#/identify/data');
  await expect(page.locator('.activity-topic')).toHaveText('Sampling');
});

test('Sort It! records an entire two-method board on the first check, never on movement',async({page})=>{
 await page.goto('/#/sort/sampling');
 await expect(page.locator('#sort-set')).toHaveValue('pair-srs-stratified');
 const bank=await loadBank(page,'evaluations','evaluations');
 const card=bank.find(c=>c.id==='srs-subgroups');
 await expect(page.locator('[data-sort-card="srs-subgroups"]')).toContainText(card.claim);
 await page.locator('[data-sort-card="srs-subgroups"]').click();
 await page.locator('[data-action="sort-place"][data-sort-destination="simple-random:disadvantage"]').click();
 await expect(page.locator('[data-sort-drop="simple-random:disadvantage"] [data-sort-card="srs-subgroups"]')).toBeVisible();
 expect(await savedProgress(page)).toBe(null);
 const pairs=await loadBank(page,'sort-pairs','pairs');
 const original=pairs.find(p=>p.id==='pair-srs-stratified');
 for(const id of original.evaluationIds.filter(id=>id!=='srs-subgroups')){
  const item=bank.find(x=>x.id===id);
  await page.locator('[data-sort-card="'+id+'"]').click();
  await page.locator('[data-action="sort-place"][data-sort-destination="'+item.subject+':'+item.polarity+'"]').click();
 }
 await expect(page.locator('[data-action="sort-check"]')).toBeEnabled();
 await page.locator('[data-action="sort-check"]').click();
 await expect(page.locator('.sort-board-feedback')).toContainText('All placements are correct');
 const saved=await savedProgress(page);
 expect(saved.answers).toBe(original.evaluationIds.length);
 expect(saved.concepts['simple-random-sampling'].correct).toBe(6);
 expect(saved.concepts['stratified-sampling'].correct).toBe(4);
 await page.locator('[data-action="sort-check"]').evaluate(el=>el.click());
 expect((await savedProgress(page)).answers).toBe(original.evaluationIds.length);
 await page.locator('[data-action="sort-finish"]').click();
 await expect(page.locator('.completion-score')).toContainText('first check');
 expect((await savedProgress(page)).sessions).toBe(1);
});

test('Sort It! offers six curated two-method sets, each with four destinations',async({page})=>{
 await page.goto('/#/sort/sampling');
 await expect(page.locator('#sort-set option')).toHaveCount(10);
 const pairs=await loadBank(page,'sort-pairs','pairs');
 for(const pair of pairs){
  await page.locator('#sort-set').selectOption(pair.id);
  await expect(page.locator('.sort-method')).toHaveCount(2);
  await expect(page.locator('.sort-drop-zone')).toHaveCount(4);
  await expect(page.locator('.sort-tray .sort-card')).toHaveCount(pair.evaluationIds.length);
  await expect(page.locator('.sort-board-title')).toContainText('Place each statement');
 }
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

test('Sort It! and Which Method? remain usable at 320px and 390px',async({page})=>{
 for(const width of [320,390]){
  await page.setViewportSize({width,height:780});
  await page.goto('/#/sort/sampling');
  await page.locator('.sort-tray .sort-card').first().click();
  await page.locator('.sort-drop-button').first().click();
  await expect(page.locator('.sort-zone-cards .sort-card')).toHaveCount(1);
  let dimensions=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  expect(dimensions.scroll,'sort '+width).toBeLessThanOrEqual(dimensions.width+1);
  await page.goto('/#/identify/sampling');
  await page.locator('.classification-choice').first().click();
  await expect(page.locator('.classification-feedback')).toBeVisible();
  dimensions=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  expect(dimensions.scroll,'identify '+width).toBeLessThanOrEqual(dimensions.width+1);
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
