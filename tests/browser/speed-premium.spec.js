import {test,expect} from '@playwright/test';

const storageKey='sampling-arcade-progress-v1';
async function start(page,topic='data'){
 await page.goto('/#/speed/'+topic);
 await expect(page.locator('#speed-answer')).toBeVisible();
}
async function concept(page){
 const id=await page.locator('[data-concept-id]').getAttribute('data-concept-id');
 return page.evaluate(async id=>{
  const payload=await (await fetch('./content/concepts.json')).json();
  return payload.concepts.find(item=>item.id===id);
 },id);
}
async function progress(page){
 return page.evaluate(k=>JSON.parse(localStorage.getItem(k)),storageKey);
}

test('untimed recall has a focused definition and linked accessible typed input',async({page})=>{
 await start(page);
 await expect(page.locator('.speed-recall-panel')).toBeVisible();
 await expect(page.locator('.speed-question-number')).toHaveText('1 / 8');
 await expect(page.locator('#speed-answer')).toHaveAttribute('aria-describedby',/speed-definition/);
 await expect(page.locator('#speed-definition')).toBeVisible();
 await expect(page.locator('.speed-settings-note')).toContainText('at your own pace');
 await expect(page.locator('.clock-badge')).toHaveCount(0);
});

test('correct retrieval shows a mathematical example and Enter advances to another focused term',async({page})=>{
 await start(page);
 const first=await concept(page);
 await page.locator('#speed-answer').fill(first.label);
 await page.locator('#speed-answer').press('Enter');
 await expect(page.locator('.speed-recall-panel')).toHaveAttribute('data-recall-state','correct');
 await expect(page.locator('.speed-model-example')).toContainText(first.example);
 await expect(page.locator('.speed-model-caution')).toContainText(first.misconception);
 await expect(page.locator('.typed-feedback')).toBeFocused();
 await page.keyboard.press('Enter');
 await expect(page.locator('#speed-answer')).toBeFocused();
 await expect(page.locator('[data-concept-id]')).not.toHaveAttribute('data-concept-id',first.id);
 expect((await progress(page)).answers).toBe(1);
});

test('incorrect or skipped recall offers an optional targeted review without awarding unearned mastery',async({page})=>{
 await start(page);
 const first=await concept(page);
 await page.locator('#speed-answer').fill('not a mathematical term');
 await page.locator('#speed-answer').press('Enter');
 await expect(page.locator('.speed-recall-panel')).toHaveAttribute('data-recall-state','wrong');
 await expect(page.locator('.speed-written-attempt')).toContainText('not a mathematical term');
 await expect(page.locator('.speed-feedback')).toContainText(first.label);
 await page.getByRole('button',{name:'Next definition →'}).click();
 for(let i=1;i<8;i++){
  const item=await concept(page);
  await page.locator('#speed-answer').fill(item.label);
  await page.locator('#speed-answer').press('Enter');
  await page.getByRole('button',{name:i===7?'Finish round →':'Next definition →'}).click();
 }
 await expect(page.locator('.speed-summary')).toBeVisible();
 await expect(page.locator('.speed-summary')).toContainText('88%');
 await expect(page.getByRole('button',{name:'Review 1 tricky term →'})).toBeVisible();
 const before=await progress(page);
 expect(before.answers).toBe(8);
 expect(before.concepts[first.id].correct).toBe(0);
 await page.getByRole('button',{name:'Review 1 tricky term →'}).click();
 await expect(page.locator('.speed-review-context')).toBeVisible();
 await expect(page.locator('#speed-answer')).toBeFocused();
 await expect(page.locator('[data-concept-id]')).toHaveAttribute('data-concept-id',first.id);
 await expect(page.locator('.speed-question-number')).toHaveText('1 / 1');
 await page.locator('#speed-answer').fill(first.label);
 await page.locator('#speed-answer').press('Enter');
 await page.getByRole('button',{name:'Finish round →'}).click();
 const after=await progress(page);
 expect(after.answers).toBe(9);
 expect(after.concepts[first.id].correct).toBe(1);
 expect(after.sessions).toBe(2);
});

test('perfect independent recall does not offer a spurious review deck',async({page})=>{
 await start(page);
 for(let i=0;i<8;i++){
  const item=await concept(page);
  await page.locator('#speed-answer').fill(item.label);
  await page.locator('#speed-answer').press('Enter');
  await page.getByRole('button',{name:i===7?'Finish round →':'Next definition →'}).click();
 }
 await expect(page.locator('.speed-summary')).toContainText('100%');
 await expect(page.locator('[data-action="speed-review"]')).toHaveCount(0);
});

test('timed start is explicit, timer uses a visual progress strip and pauses during review',async({page})=>{
 await page.clock.install();
 await page.goto('/#/speed/data');
 await page.locator('#speed-mode').selectOption('timed');
 await page.locator('#speed-duration').selectOption('30');
 await expect(page.locator('.speed-ready-clock-number')).toHaveText('00:30');
 await expect(page.locator('[data-clock]')).toHaveCount(0);
 expect(await progress(page)).toBeNull();
 await page.getByRole('button',{name:/Start 30-second round/}).click();
 await expect(page.locator('.speed-clock-fill')).toBeVisible();
 await page.clock.fastForward(4_000);
 await expect(page.locator('.speed-clock-fill')).not.toHaveAttribute('style','width: 100%;');
 const item=await concept(page);
 await page.locator('#speed-answer').fill(item.label);
 await page.locator('#speed-answer').press('Enter');
 await expect(page.locator('.speed-clock-state')).toHaveText('Paused for feedback');
 const before=await page.locator('[data-clock]').innerText();
 await page.clock.fastForward(35_000);
 await expect(page.locator('[data-clock]')).toHaveText(before);
 await page.getByRole('button',{name:'Next definition →'}).click();
 await expect(page.locator('.speed-clock-state')).toHaveText('Timer running');
});

test('timed expiry does not score an unsubmitted answer and shows a useful summary',async({page})=>{
 await page.clock.install();
 await page.goto('/#/speed/data');
 await page.locator('#speed-mode').selectOption('timed');
 await page.locator('#speed-duration').selectOption('30');
 await page.getByRole('button',{name:/Start 30-second round/}).click();
 await page.locator('#speed-answer').fill('unfinished answer');
 await page.clock.fastForward(31_000);
 await expect(page.getByText('Round complete',{exact:true})).toBeVisible();
 await expect(page.locator('.speed-summary')).toContainText('Not yet measured');
 expect((await progress(page)).answers).toBe(0);
 await expect(page.locator('[data-action="speed-review"]')).toHaveCount(0);
});

test('retrying a likely typo earns nothing until a correctly spelled term is submitted',async({page})=>{
 await start(page);
 const item=await concept(page);
 await page.locator('#speed-answer').fill(item.label.slice(0,-1));
 await page.locator('#speed-answer').press('Enter');
 await expect(page.locator('#speed-typo-note')).toBeVisible();
 await expect(page.locator('#speed-answer')).toHaveAttribute('aria-describedby',/speed-typo-note/);
 expect((await progress(page))?.answers??0).toBe(0);
 await page.locator('#speed-answer').fill(item.label);
 await page.locator('#speed-answer').press('Enter');
 expect((await progress(page)).answers).toBe(1);
});

test('review mode has an explicit way back to the original practice type',async({page})=>{
 await start(page);
 await page.getByRole('button',{name:'Skip and reveal'}).click();
 await page.getByRole('button',{name:'Next definition →'}).click();
 for(let i=1;i<8;i++){
  await page.getByRole('button',{name:'Skip and reveal'}).click();
  await page.getByRole('button',{name:i===7?'Finish round →':'Next definition →'}).click();
 }
 await page.locator('[data-action="speed-review"]').click();
 await expect(page.locator('.speed-review-context')).toBeVisible();
 await page.getByRole('button',{name:'Back to standard practice'}).click();
 await expect(page.locator('#speed-mode')).toHaveValue('untimed');
 await expect(page.locator('.speed-review-context')).toHaveCount(0);
});

for(const width of [320,390,768,1024,1280]){
 test('Speed Recall remains in the viewport at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:780});
  await start(page,'sampling');
  await page.locator('#speed-answer').fill('A very long answer with spaces');
  const dimensions=await page.evaluate(()=>({
   client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client+1);
  await page.locator('#speed-answer').press('Enter');
  await expect(page.locator('.speed-feedback')).toBeVisible();
  const after=await page.evaluate(()=>({
   client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth
  }));
  expect(after.scroll).toBeLessThanOrEqual(after.client+1);
 });
}
test('reduced motion removes the card entrance and timer transitions',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await start(page);
 await expect(page.locator('.speed-recall-panel')).toHaveCSS('animation-name','none');
 await page.locator('#speed-mode').selectOption('timed');
 await page.getByRole('button',{name:/Start 60-second round/}).click();
 await expect(page.locator('.speed-clock-fill')).toHaveCSS('transition-duration','0s');
});
