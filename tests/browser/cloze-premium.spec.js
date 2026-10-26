import {test,expect} from '@playwright/test';
const key='sampling-arcade-progress-v1';
async function current(page){
 const id=await page.locator('[data-question-id]').getAttribute('data-question-id');
 return page.evaluate(async id=>{const data=await (await fetch('./content/cloze.json')).json();return data.cloze.find(q=>q.id===id);},id);
}
test('three readable stages maintain the original selector and default',async({page})=>{
 await page.goto('/#/cloze/data');
 await expect(page.locator('#cloze-level')).toHaveValue('choices');
 await expect(page.locator('.cloze-stage')).toHaveCount(3);
 await expect(page.locator('.cloze-stage.is-current')).toContainText('Recognise');
 await expect(page.locator('.cloze-choice')).toHaveCount(4);
});
test('independent typed answer previews inside the sentence without grading on keystroke',async({page})=>{
 await page.goto('/#/cloze/data');
 await page.locator('#cloze-level').selectOption('independent');
 const item=await current(page);
 await page.locator('#cloze-answer').fill(item.answer);
 await expect(page.locator('.cloze-blank')).toHaveText(item.answer);
 await expect(page.locator('.cloze-blank')).toHaveClass(/is-preview/);
 expect(await page.evaluate(k=>localStorage.getItem(k),key)).toBeNull();
 await page.locator('#cloze-answer').press('Enter');
 await expect(page.locator('.cloze-panel')).toHaveAttribute('data-answer-state','correct');
 await expect(page.locator('.typed-feedback')).toBeFocused();
 expect((await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key)).answers).toBe(1);
});
test('hinted recall is visibly separate from mastery and never credited as correct',async({page})=>{
 await page.goto('/#/cloze/data');
 await page.locator('#cloze-level').selectOption('guided');
 const item=await current(page);
 await page.getByRole('button',{name:'Show first-letter hint'}).click();
 await expect(page.locator('#cloze-answer')).toHaveAttribute('aria-describedby',/cloze-hint-text/);
 await page.locator('#cloze-answer').fill(item.answer);
 await page.locator('#cloze-answer').press('Enter');
 await expect(page.locator('.cloze-panel')).toHaveAttribute('data-answer-state','assisted');
 await expect(page.locator('.cloze-feedback')).toContainText('Checked with a hint');
 const progress=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
 expect(progress.answers).toBe(1);
 expect(progress.concepts[item.conceptId].correct).toBe(0);
});
test('recognition records one response and highlights the correct word',async({page})=>{
 await page.goto('/#/cloze/sampling');
 const item=await current(page);
 const wrong=item.choices.find(w=>w!==item.answer);
 await page.locator('[data-action="cloze-option"][data-choice="'+wrong+'"]').click();
 await expect(page.locator('.cloze-choice.is-correct')).toHaveCount(1);
 await expect(page.locator('.cloze-choice.is-incorrect')).toHaveCount(1);
 await expect(page.locator('[data-action="cloze-next"]')).toBeFocused();
 await expect(page.locator('.cloze-reason')).toHaveText(item.explanation);
 expect((await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key)).answers).toBe(1);
});
for(const width of [320,390,768,1024,1280]){
 test('premium Missing Words fits '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:780});
  await page.goto('/#/cloze/sampling');
  await expect(page.locator('.cloze-level-track')).toBeVisible();
  await page.locator('#cloze-level').selectOption('guided');
  await page.locator('#cloze-answer').fill('A long typed mathematical answer');
  const dims=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  expect(dims.scroll).toBeLessThanOrEqual(dims.client+1);
 });
}
test('reduced-motion removes transition effects',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/#/cloze/sampling');
 await expect(page.locator('.cloze-choice').first()).toHaveCSS('transition-duration','0s');
});
