import {test,expect} from '@playwright/test';

const progressKey='sampling-arcade-progress-v1';
async function ready(page,topic='sampling'){
 await page.goto('/#/flashcards/'+topic);
 await expect(page.locator('.flashcard.flash-flip-control')).toBeVisible();
}
async function noHorizontalOverflow(page,label){
 const measure=await page.evaluate(()=>({
  page:document.documentElement.scrollWidth,
  viewport:document.documentElement.clientWidth
 }));
 expect(measure.page,label).toBeLessThanOrEqual(measure.viewport+1);
}

test('the same physical card rotates to its back without re-rendering or revealing hidden details early',async({page})=>{
 await page.setViewportSize({width:1180,height:860});
 await ready(page);
 const card=page.locator('.flashcard');
 await expect(card).toHaveAttribute('aria-expanded','false');
 await expect(page.locator('.flash-face-front')).toHaveAttribute('aria-hidden','false');
 await expect(page.locator('.flash-face-back')).toHaveAttribute('aria-hidden','true');
 await expect(page.locator('.flash-grade-panel')).toBeHidden();
 await card.evaluate(el=>{el.dataset.persistent='yes'});
 await card.click();
 await expect(card).toHaveAttribute('data-persistent','yes');
 await expect(card).toHaveAttribute('aria-expanded','true');
 await expect(card).toHaveClass(/is-flipped/);
 await expect(page.locator('.flash-face-front')).toHaveAttribute('aria-hidden','true');
 await expect(page.locator('.flash-face-back')).toHaveAttribute('aria-hidden','false');
 await expect(page.locator('.flash-grade-panel')).toBeVisible();
 await expect(page.getByText('MODEL ANSWER')).toBeVisible();
 await expect(page.getByText('Watch out',{exact:true})).toBeVisible();
 await expect.poll(async()=>card.locator('.flash-flip-inner').evaluate(
   el=>getComputedStyle(el).transform)).toMatch(/^matrix3d\(-1(?:,|\b)/);
 await card.click();
 await expect(card).toHaveAttribute('aria-expanded','false');
 await expect(page.locator('.flash-grade-panel')).toBeHidden();
 await expect(page.locator('.flash-face-back')).toHaveAttribute('aria-hidden','true');
 await expect(card).toHaveAttribute('data-persistent','yes');
});

test('keyboard activation flips, self-rating shortcuts work, and only Know it records success',async({page})=>{
 await ready(page,'data');
 const card=page.locator('.flashcard');
 await card.focus();
 await page.keyboard.press('Enter');
 await expect(card).toBeFocused();
 await expect(card).toHaveAttribute('aria-expanded','true');
 await page.keyboard.press('2');
 await expect(page.locator('.flash-pace-value')).toContainText('1 to revisit');
 let saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),progressKey);
 expect(saved.answers).toBe(1);
 expect(Object.values(saved.concepts).reduce((sum,x)=>sum+x.correct,0)).toBe(0);
 await expect(card).toBeFocused();
 await page.keyboard.press('Space');
 await expect(card).toHaveAttribute('aria-expanded','true');
 await page.keyboard.press('3');
 saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),progressKey);
 expect(saved.answers).toBe(2);
 expect(Object.values(saved.concepts).reduce((sum,x)=>sum+x.correct,0)).toBe(1);
 await expect(page.locator('.flash-pace-value')).toContainText('1 confident');
 await expect(page.locator('.flash-pace-value')).toContainText('1 to revisit');
});

test('skipped and Nearly cards can be reviewed in a new, optional short deck',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await ready(page,'data');
 const n=await page.locator('.round-controls .round-caption').last().innerText();
 const total=Number(n.match(/\/ (\d+)/)?.[1]);
 expect(total).toBeGreaterThan(3);
 const first=await page.locator('.flash-front').innerText();
 await page.locator('.flashcard').click();
 await page.getByRole('button',{name:'Nearly',exact:true}).click();
 for(let i=1;i<total;i++)await page.getByRole('button',{name:'Skip for now'}).click();
 await expect(page.locator('.completion-title')).toBeVisible();
 await expect(page.locator('.flash-review-note')).toContainText(total+' cards');
 await expect(page.getByRole('button',{name:new RegExp('Review '+total+' tricky cards')})).toBeVisible();
 let saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),progressKey);
 expect(saved.answers).toBe(1);
 expect(saved.sessions).toBe(1);
 await page.getByRole('button',{name:new RegExp('Review '+total+' tricky cards')}).click();
 await expect(page.locator('.flash-deck-label')).toHaveText('REVIEW DECK');
 await expect(page.locator('.flash-front')).toHaveText(first);
 await expect(page.locator('.flashcard')).toHaveAttribute('aria-expanded','false');
 saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),progressKey);
 expect(saved.answers).toBe(1,'revisiting must not award automatic mastery');
});

test('reversing the card swaps the prompt and answer while keeping a true two-sided view',async({page})=>{
 await ready(page);
 await page.getByRole('button',{name:/Term → definition/}).click();
 await expect(page.getByRole('button',{name:/Definition → term/})).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.practice-guide')).toContainText('recall the term, flip the card');
 const definition=await page.locator('.flash-front').innerText();
 expect(definition.length).toBeGreaterThan(18);
 await page.locator('.flashcard').click();
 await expect(page.locator('.flash-face-back')).toHaveAttribute('aria-hidden','false');
 await expect(page.locator('.answer-main')).toBeVisible();
 const term=await page.locator('.answer-main').innerText();
 expect(term.length).toBeLessThan(definition.length);
});

test('no early grading and the card remains accessible to screen readers',async({page})=>{
 await ready(page);
 await expect(page.locator('[data-action="grade"]')).toHaveCount(3);
 await expect(page.locator('.flash-grade-panel')).toBeHidden();
 await expect(page.locator('.flashcard')).toHaveAttribute('aria-label',/Prompt: /);
 await expect(page.locator('.flashcard')).toHaveAttribute('aria-expanded','false');
 await page.locator('.flashcard').click();
 await expect(page.locator('.flashcard')).toHaveAttribute('aria-label',/Answer: /);
 await expect(page.locator('.flashcard')).toHaveAttribute('aria-expanded','true');
 await expect(page.locator('#announcer')).toContainText('Answer:');
 await expect(page.locator('.flash-grade-panel')).toBeVisible();
 await expect(page.locator('[data-action="grade"][aria-keyshortcuts="1"]')).toHaveText('Again');
 await expect(page.locator('[data-action="grade"][aria-keyshortcuts="2"]')).toHaveText('Nearly');
 await expect(page.locator('[data-action="grade"][aria-keyshortcuts="3"]')).toContainText('Know it');
});

for(const width of [320,390,768,1280]){
 test('premium front and back remain readable at '+width+'px, with no horizontal overflow',async({page})=>{
  await page.setViewportSize({width,height:740});
  await ready(page);
  const card=page.locator('.flashcard');
  await expect(card).toBeVisible();
  await noHorizontalOverflow(page,'front '+width);
  const size1=await card.boundingBox();
  await card.click();
  await expect(page.locator('.flash-detail-copy')).toHaveCount(2);
  await expect(page.locator('.flash-face-back')).toHaveAttribute('aria-hidden','false');
  await expect(page.locator('.flash-grade-panel')).toBeVisible();
  await noHorizontalOverflow(page,'back '+width);
  const size2=await card.boundingBox();
  expect(Math.abs(size1.height-size2.height)).toBeLessThanOrEqual(1);
  await expect(page.locator('.flash-detail-copy').first()).not.toBeEmpty();
 });
}

test('reduced motion still flips sides instantly without animating the card',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await ready(page);
 await page.locator('.flashcard').click();
 await expect(page.locator('.flash-flip-inner')).toHaveCSS('transition-duration','0s');
 await expect(page.locator('.flash-deck-stage')).toHaveCSS('animation-name','none');
 await expect(page.locator('.flash-face-back')).toHaveAttribute('aria-hidden','false');
 await page.locator('.flashcard').click();
 await expect(page.locator('.flash-face-front')).toHaveAttribute('aria-hidden','false');
});
