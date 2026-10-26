import {test,expect} from '@playwright/test';

const progressKey='sampling-arcade-progress-v1';
const fetchData=async(page,name,key)=>page.evaluate(async({name,key})=>
 (await(await fetch('./content/'+name+'.json')).json())[key],{name,key});
const state=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),progressKey);
async function start(page,id='pair-srs-stratified'){
 await page.goto('/#/sort/sampling');
 if(id!=='pair-srs-stratified')await page.locator('#sort-set').selectOption(id);
 await expect(page.locator('.sort-drop-zone')).toHaveCount(4);
}
async function place(page,id,destination){
 await page.locator('[data-sort-card="'+id+'"]').click();
 await page.locator('[data-action="sort-place"][data-sort-destination="'+destination+'"]').click();
 await expect(page.locator('[data-sort-drop="'+destination+'"] [data-sort-card="'+id+'"]')).toBeVisible();
}
async function fillBoard(page,id='pair-srs-stratified',mistake=null){
 const pairs=await fetchData(page,'sort-pairs','pairs');
 const evals=await fetchData(page,'evaluations','evaluations');
 const pair=pairs.find(p=>p.id===id);
 for(const cardId of pair.evaluationIds){
  const item=evals.find(e=>e.id===cardId);
  const destination=cardId===mistake?item.subject+':'+(item.polarity==='advantage'?'disadvantage':'advantage'):
    item.subject+':'+item.polarity;
  await place(page,cardId,destination);
 }
 return pair;
}

test('Sort It! presents exactly two method panels and four distinguishable advantage/disadvantage zones',async({page})=>{
 await start(page);
 await expect(page.locator('.sort-method')).toHaveCount(2);
 await expect(page.locator('.sort-method-title')).toHaveText(['Simple random sampling','Stratified sampling']);
 await expect(page.locator('.sort-zone-name')).toHaveText(['Advantages','Disadvantages','Advantages','Disadvantages']);
 await expect(page.locator('.sort-tray .sort-card')).toHaveCount(10);
 await expect(page.locator('.sort-progress-count')).toHaveText('0 of 10 placed');
 await expect(page.locator('[data-action="sort-check"]')).toBeDisabled();
 await expect(page.locator('[data-sort-drop="simple-random:disadvantage"]')).toHaveAttribute('aria-label',/Simple random sampling.*disadvantages/);
 await expect(page.locator('[data-sort-card="srs-subgroups"]')).toContainText('Small subgroups may be underrepresented by chance.');
});

test('native mouse drag and drop actually moves a statement to the correct method and polarity',async({page})=>{
 await page.setViewportSize({width:1440,height:950});
 await start(page);
 const card=page.locator('[data-sort-card="srs-subgroups"]');
 const drop=page.locator('[data-sort-drop="simple-random:disadvantage"] .sort-drop-button');
 await card.dragTo(drop);
 await expect(page.locator('[data-sort-drop="simple-random:disadvantage"] [data-sort-card="srs-subgroups"]')).toBeVisible();
 await expect(page.locator('.sort-progress-count')).toHaveText('1 of 10 placed');
 expect(await state(page)).toBeNull();
});

test('tap-select placement and returning a card work without awarding credit',async({page})=>{
 await start(page);
 const id='srs-subgroups';
 await page.locator('[data-sort-card="'+id+'"]').click();
 await expect(page.locator('.sort-selection-message')).toContainText('Small subgroups');
 await expect(page.locator('[data-action="sort-place"]').first()).toBeFocused();
 await page.locator('[data-action="sort-place"][data-sort-destination="simple-random:disadvantage"]').click();
 await expect(page.locator('.sort-tray [data-sort-card="'+id+'"]')).toHaveCount(0);
 await page.locator('[data-sort-card="'+id+'"]').click();
 await page.getByRole('button',{name:'Return to tray'}).click();
 await expect(page.locator('.sort-tray [data-sort-card="'+id+'"]')).toBeVisible();
 await expect(page.locator('.sort-progress-count')).toHaveText('0 of 10 placed');
 expect(await state(page)).toBeNull();
});

test('first complete check scores once, later corrections remain learning without retroactive credit',async({page})=>{
 await start(page);
 const pair=await fillBoard(page,'pair-srs-stratified','srs-subgroups');
 await expect(page.locator('[data-action="sort-check"]')).toBeEnabled();
 await page.locator('[data-action="sort-check"]').click();
 await expect(page.locator('.sort-board-feedback')).toContainText('9 of 10 in the right place');
 await expect(page.locator('[data-sort-card="srs-subgroups"]')).toHaveClass(/is-incorrect/);
 const first=await state(page);
 expect(first.answers).toBe(pair.evaluationIds.length);
 expect(first.concepts['simple-random-sampling'].correct).toBe(5);
 await place(page,'srs-subgroups','simple-random:disadvantage');
 await expect(page.locator('[data-action="sort-check"]')).toBeEnabled();
 await page.locator('[data-action="sort-check"]').click();
 await expect(page.locator('.sort-board-feedback')).toContainText('All placements are correct');
 await expect(page.locator('.sort-board-feedback')).toContainText('first-check score is 9 of 10');
 const second=await state(page);
 expect(second.answers).toBe(first.answers);
 expect(second.concepts['simple-random-sampling'].correct).toBe(5);
 await page.locator('[data-action="sort-finish"]').click();
 await expect(page.locator('.completion-score')).toContainText('9 of 10');
 expect((await state(page)).sessions).toBe(1);
});

test('asking for model explanations distinguishes destination and mathematical reasoning',async({page})=>{
 await start(page);
 await fillBoard(page,'pair-srs-stratified','srs-subgroups');
 await page.locator('[data-action="sort-check"]').click();
 await expect(page.locator('[data-action="sort-reveal"]')).toBeVisible();
 await page.locator('[data-action="sort-reveal"]').click();
 const wrong=page.locator('[data-sort-card="srs-subgroups"]');
 await expect(wrong.locator('.sort-card-solution')).toContainText('Simple random sampling — disadvantages');
 await expect(wrong.locator('.sort-card-explanation')).toContainText('No fixed subgroup proportions');
 await expect(page.locator('.sort-card:disabled')).toHaveCount(10);
 await expect(page.locator('[data-action="sort-check"]')).toBeDisabled();
 expect((await state(page)).answers).toBe(10);
});

test('all six pair choices regenerate an unmarked board and expose both methods',async({page})=>{
 await start(page);
 const bank=await fetchData(page,'sort-pairs','pairs');
 for(const pair of bank){
  await page.locator('#sort-set').selectOption(pair.id);
  await expect(page.locator('.sort-method-title')).toHaveCount(2);
  await expect(page.locator('.sort-drop-zone')).toHaveCount(4);
  await expect(page.locator('.sort-tray [data-sort-card]')).toHaveCount(pair.evaluationIds.length);
  await expect(page.locator('[data-action="sort-check"]')).toBeDisabled();
  await expect(page.locator('.sort-progress-count')).toContainText('0 of');
 }
});

test('keyboard-only selection, destination choice and announcements are usable',async({page})=>{
 await start(page);
 const tile=page.locator('[data-sort-card="srs-subgroups"]');
 await tile.focus();await page.keyboard.press('Enter');
 await expect(page.locator('.sort-selection-bar')).toContainText('Small subgroups');
 await expect(page.locator('[data-action="sort-place"]').first()).toBeFocused();
 const dest=page.locator('[data-action="sort-place"][data-sort-destination="simple-random:disadvantage"]');
 await dest.focus();await page.keyboard.press('Enter');
 await expect(page.locator('[data-sort-drop="simple-random:disadvantage"] [data-sort-card="srs-subgroups"]')).toBeVisible();
 await expect(page.locator('#announcer')).toContainText('Moved to Simple random sampling');
 const card=page.locator('[data-sort-card="srs-subgroups"]');
 await card.focus();await page.keyboard.press('Enter');
 await page.getByRole('button',{name:'Clear selection'}).click();
 await expect(page.locator('.sort-selection-label')).toHaveText('HOW TO SORT');
});

test('leaving before checking does not mark any of the dragged statements',async({page})=>{
 await start(page);
 await place(page,'srs-subgroups','simple-random:disadvantage');
 await page.goto('/#/home/sampling');
 expect(await state(page)).toBeNull();
 await start(page);
 await expect(page.locator('.sort-progress-count')).toHaveText('0 of 10 placed');
});

for(const width of [320,390,768,1024,1280]){
 test('two-method Sort It! is usable without page-wide horizontal scrolling at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:790});
  await start(page);
  const snapshot=async()=>page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  let dims=await snapshot();expect(dims.scroll).toBeLessThanOrEqual(dims.client+1);
  await place(page,'srs-subgroups','simple-random:disadvantage');
  dims=await snapshot();expect(dims.scroll).toBeLessThanOrEqual(dims.client+1);
  await expect(page.locator('.sort-zone-cards .sort-card')).toHaveCount(1);
 });
}

test('motion reduction removes entrance and placement transitions',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await start(page);
 await expect(page.locator('.sort-card').first()).toHaveCSS('animation-name','none');
 await expect(page.locator('.sort-drop-zone').first()).toHaveCSS('transition-duration','0s');
});
