import {test,expect} from '@playwright/test';
import {SCENARIO_EVIDENCE,CHOICE_CONTRASTS} from '../../src/identify.js';
const progressKey='sampling-arcade-progress-v1';
async function current(page){
 const id=await page.locator('[data-item-id]').getAttribute('data-item-id');
 const scenario=await page.evaluate(async id=>{
  const {scenarios}=await (await fetch('./content/scenarios.json')).json();
  return scenarios.find(s=>s.id===id);
 },id);
 return scenario;
}
const stored=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),progressKey);
async function open(page,length=10){
 await page.goto('/#/identify/sampling');
 await expect(page.locator('.identify-panel')).toBeVisible();
 if(length!==10)await page.locator('#scenario-length').selectOption(String(length));
}

test('five methods use readable premium answer tiles without revealing the clue before checking',async({page})=>{
 await open(page);
 await expect(page.locator('.identify-choice')).toHaveCount(5);
 await expect(page.locator('.identify-choice-letter')).toHaveText(['A','B','C','D','E']);
 await expect(page.locator('.identify-scenario')).toBeVisible();
 await expect(page.locator('.identify-evidence-mark')).toHaveCount(0);
 await expect(page.locator('.identify-evidence-detail')).toHaveCount(0);
 await expect(page.locator('.identify-settings-note')).toContainText('Five methods');
 await expect(page.locator('.identify-choice').first()).toHaveAttribute('aria-pressed','false');
 expect(await stored(page)).toBeNull();
});

test('correct answer highlights the exact evidence and retains the original checked explanation',async({page})=>{
 await open(page);
 const item=await current(page);
 await page.locator('[data-action="classify-option"][data-choice="'+item.correctMethod+'"]').click();
 await expect(page.locator('.classification-feedback')).toBeFocused();
 await expect(page.locator('.identify-evidence-mark')).toHaveText(SCENARIO_EVIDENCE[item.id]);
 await expect(page.locator('.identify-evidence-detail')).toContainText(item.reason);
 await expect(page.locator('.feedback-contrast')).toHaveText(item.contrast);
 await expect(page.locator('.identify-why-not')).toHaveCount(0);
 await expect(page.locator('.classification-choice:disabled')).toHaveCount(5);
 expect((await stored(page)).answers).toBe(1);
});

test('incorrect answer explains why the specifically chosen plausible alternative is wrong',async({page})=>{
 await open(page);
 const item=await current(page);
 const wrong=Object.keys(CHOICE_CONTRASTS[item.correctMethod])[0];
 await page.locator('[data-action="classify-option"][data-choice="'+wrong+'"]').click();
 await expect(page.locator('.feedback-heading')).toContainText('Not quite');
 await expect(page.locator('.identify-why-not')).toContainText('WHY NOT '+wrong.replaceAll('-',' ').toUpperCase().split(' ')[0].toUpperCase());
 await expect(page.locator('.identify-targeted-contrast')).toHaveText(CHOICE_CONTRASTS[item.correctMethod][wrong]);
 await expect(page.locator('.identify-evidence-mark')).toHaveText(SCENARIO_EVIDENCE[item.id]);
 await expect(page.locator('.feedback-contrast')).toHaveText(item.contrast);
 await expect(page.locator('[data-choice="'+item.correctMethod+'"]')).toHaveClass(/is-correct/);
 const progress=await stored(page);
 expect(progress.answers).toBe(1);
 expect(progress.concepts[Object.keys(progress.concepts)[0]].correct).toBe(0);
 // A disabled duplicate click is not a second attempt.
 await page.locator('.classification-choice:disabled').first().evaluate(el=>el.click());
 expect((await stored(page)).answers).toBe(1);
});

test('five-case round includes every method and completion offers an ungraded review of missed case studies',async({page})=>{
 await open(page,5);
 const seen=new Set();
 let missedId;
 for(let i=0;i<5;i++){
  const item=await current(page);
  seen.add(item.correctMethod);
  const chosen=i===0?Object.keys(CHOICE_CONTRASTS[item.correctMethod])[0]:item.correctMethod;
  if(i===0)missedId=item.id;
  await page.locator('[data-action="classify-option"][data-choice="'+chosen+'"]').click();
  await page.locator('[data-action="classify-next"]').click();
 }
 expect(seen.size).toBe(5);
 await expect(page.getByText('Round complete',{exact:true})).toBeVisible();
 await expect(page.locator('.completion-score')).toContainText('4 of 5');
 await expect(page.locator('.identify-summary-row')).toHaveCount(5);
 await expect(page.locator('.identify-summary-caption')).toContainText('not examination grades');
 await expect(page.locator('.identify-review-toggle')).toContainText('Study 1 missed case');
 const before=await stored(page);
 expect(before.answers).toBe(5);
 expect(before.sessions).toBe(1);
 await page.locator('.identify-review-toggle').click();
 await expect(page.locator('.identify-review-case')).toHaveCount(1);
 await expect(page.locator('.identify-review-key')).toContainText(SCENARIO_EVIDENCE[missedId]);
 expect((await stored(page)).answers).toBe(5);
 await page.getByRole('button',{name:/Play another round/}).click();
 await expect(page.locator('.identify-summary')).toHaveCount(0);
 await expect(page.locator('.identify-choice')).toHaveCount(5);
});

test('perfect 5-case round shows a positive learning recommendation without an invented review list',async({page})=>{
 await open(page,5);
 for(let i=0;i<5;i++){
  const item=await current(page);
  await page.locator('[data-action="classify-option"][data-choice="'+item.correctMethod+'"]').click();
  await page.locator('[data-action="classify-next"]').click();
 }
 await expect(page.locator('.identify-summary-perfect')).toContainText('All five methods');
 await expect(page.locator('.identify-review-toggle')).toHaveCount(0);
 const values=await page.locator('.identify-summary-result').allTextContents();
 expect(values).toEqual(['1 / 1','1 / 1','1 / 1','1 / 1','1 / 1']);
});

test('10- and 20-question modes preserve choice balance and the unchanged selection controls',async({page})=>{
 await open(page);
 for(const length of [10,20]){
  await page.locator('#scenario-length').selectOption(String(length));
  await expect(page.locator('.identify-panel')).toBeVisible();
  await expect(page.locator('.identify-choice')).toHaveCount(5);
  await expect(page.locator('.round-progress')).toContainText('1 / '+length);
  await expect(page.locator('.identify-evidence-mark')).toHaveCount(0);
 }
 expect(await stored(page)).toBeNull();
});

test('keyboard answer and focus remain usable after the overlay improves the card',async({page})=>{
 await open(page);
 await page.locator('.identify-choice').first().focus();
 await page.keyboard.press('Enter');
 await expect(page.locator('.classification-feedback')).toBeFocused();
 await page.keyboard.press('Tab');
 await expect(page.locator('[data-action="classify-next"]')).toBeFocused();
 await page.keyboard.press('Enter');
 await expect(page.locator('.identify-choice:not(:disabled)')).toHaveCount(5);
 await expect(page.locator('.identify-evidence-mark')).toHaveCount(0);
});

for(const width of [320,390,768,1024,1280]){
 test('Which Method? fits '+width+'px and keeps feedback readable',async({page})=>{
  await page.setViewportSize({width,height:790});
  await open(page);
  const dimensions=async()=>page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  let size=await dimensions();
  expect(size.scroll).toBeLessThanOrEqual(size.client+1);
  const item=await current(page);
  await page.locator('[data-action="classify-option"][data-choice="'+item.correctMethod+'"]').click();
  await expect(page.locator('.identify-evidence-detail')).toBeVisible();
  size=await dimensions();
  expect(size.scroll).toBeLessThanOrEqual(size.client+1);
 });
}
test('reduced motion removes decorative entrance and option lift transitions',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await open(page);
 await expect(page.locator('.identify-panel')).toHaveCSS('animation-name','none');
 await expect(page.locator('.identify-choice').first()).toHaveCSS('transition-duration','0s');
});
