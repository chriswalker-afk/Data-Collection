import {test,expect} from '@playwright/test';
const key='sampling-arcade-progress-v1';

async function start(page,topic='sampling'){
 await page.goto('/#/match/'+topic);
 await expect(page.locator('.match-board .match-tile')).toHaveCount(10);
}

test('premium Match Up shows clear two-column choices, visible progress and a selected instruction',async({page})=>{
 await page.setViewportSize({width:1250,height:850});
 await start(page);
 await expect(page.locator('.match-progress-pip')).toHaveCount(5);
 await expect(page.locator('.match-board')).toHaveAttribute('aria-labelledby','match-question-title');
 await expect(page.locator('.match-board')).toHaveAttribute('aria-busy','false');
 await expect(page.locator('.match-instruction-text')).toContainText('Choose a term or definition');
 await expect(page.locator('.match-tile-initial')).toHaveCount(10);
 const term=page.locator('[data-action="match-term"]').first();
 const id=await term.getAttribute('data-id');
 const text=await term.locator('.match-tile-text').innerText();
 await term.click();
 await expect(page.locator('[data-action="match-term"][data-id="'+id+'"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('.match-instruction-text')).toContainText('Now choose its definition');
 await expect(page.locator('.match-selected-name')).toHaveText(text);
 await expect(page.locator('.match-definitions .match-tile').first()).toBeFocused();
 await expect(page.locator('.match-try-count')).toContainText('0 incorrect attempts');
 const style=await page.locator('.match-board').evaluate(el=>({
  border:getComputedStyle(el).borderTopWidth,
  background:getComputedStyle(el).backgroundImage
 }));
 expect(style.border).toBe('1px');
 expect(style.background).toContain('gradient');
});

test('correct pair animates as a pair, then disappears and records one successful attempt',async({page})=>{
 await start(page,'data');
 const term=page.locator('[data-action="match-term"]').first();
 const id=await term.getAttribute('data-id');
 await term.click();
 await page.locator('[data-action="match-def"][data-id="'+id+'"]').click();
 const board=page.locator('.match-board');
 await expect(board).toHaveAttribute('aria-busy','true');
 await expect(board).toHaveClass(/is-confirming/);
 await expect(page.locator('.is-match-success')).toHaveCount(2);
 await expect(page.locator('.is-match-success').first()).toHaveCSS('animation-name','match-pair-celebrate');
 await expect(page.locator('[data-action="match-term"]')).toHaveCount(4);
 await expect(page.locator('[data-action="match-def"]')).toHaveCount(4);
 await expect(board).toHaveAttribute('aria-busy','false');
 await expect(page.locator('.match-progress-pip.is-complete')).toHaveCount(1);
 await expect(page.locator('.match-feedback')).toContainText('Correct pair. Well matched!');
 const progress=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
 expect(progress.answers).toBe(1);
 expect(progress.concepts[id].correct).toBe(1);
});

test('wrong choices give a gentle visual retry, retain all cards and count exactly one mistake',async({page})=>{
 await start(page);
 const first=page.locator('[data-action="match-term"]').first();
 const termId=await first.getAttribute('data-id');
 const wrong=page.locator('[data-action="match-def"]:not([data-id="'+termId+'"])').first();
 await first.click();
 await wrong.click();
 await expect(page.locator('.match-board')).toHaveClass(/is-trying/);
 await expect(page.locator('.is-match-error')).toHaveCount(2);
 await expect(page.locator('.match-board')).toHaveAttribute('aria-busy','false');
 await expect(page.locator('.match-tile')).toHaveCount(10);
 await expect(page.locator('.match-try-count')).toContainText('1 incorrect attempt');
 await expect(page.locator('.match-feedback')).toContainText('Not a match');
 const progress=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
 expect(progress.answers).toBe(1);
 expect(progress.concepts[termId].correct).toBe(0);
 await expect(page.locator('.match-progress-pip.is-complete')).toHaveCount(0);
});

test('the definition-first route and keyboard toggling work without hints or automatic matches',async({page})=>{
 await start(page);
 const def=page.locator('[data-action="match-def"]').first();
 const id=await def.getAttribute('data-id');
 await def.focus();await page.keyboard.press('Enter');
 await expect(page.locator('.match-instruction-text')).toContainText('choose its term');
 await expect(page.locator('[data-action="match-def"][data-id="'+id+'"]')).toHaveAttribute('aria-pressed','true');
 const corresponding=page.locator('[data-action="match-term"][data-id="'+id+'"]');
 await corresponding.focus();await page.keyboard.press('Space');
 await expect(page.locator('.match-progress-pip.is-complete')).toHaveCount(1);
 // Selection is toggleable: press a term once, then again to clear it.
 const next=page.locator('[data-action="match-term"]').first();
 const secondId=await next.getAttribute('data-id');
 await next.click();
 await expect(page.locator('[data-action="match-term"][data-id="'+secondId+'"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('[data-action="match-term"][data-id="'+secondId+'"]').click();
 await expect(page.locator('[data-action="match-term"][data-id="'+secondId+'"]')).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('.match-instruction-text')).toContainText('Choose a term or definition');
});

test('navigating away during an animation never awards a stale answer to another activity',async({page})=>{
 await start(page,'data');
 const id=await page.locator('[data-action="match-term"]').first().getAttribute('data-id');
 await page.locator('[data-action="match-term"][data-id="'+id+'"]').click();
 await page.locator('[data-action="match-def"][data-id="'+id+'"]').click();
 await expect(page.locator('.match-board')).toHaveAttribute('aria-busy','true');
 await page.goto('/#/flashcards/data');
 await expect(page.locator('.flashcard')).toBeVisible();
 await page.waitForTimeout(550);
 const progress=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
 expect(progress?.answers??0).toBe(0); // No record exists until a scored response.
 await page.goto('/#/match/data');
 await expect(page.locator('.match-progress-pip.is-complete')).toHaveCount(0);
});

test('reduced-motion users get instant completion with no forced animation',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await start(page);
 const id=await page.locator('[data-action="match-term"]').first().getAttribute('data-id');
 await page.locator('[data-action="match-term"][data-id="'+id+'"]').click();
 await page.locator('[data-action="match-def"][data-id="'+id+'"]').click();
 await expect(page.locator('[data-action="match-term"]')).toHaveCount(4);
 await expect(page.locator('.match-progress-pip.is-complete')).toHaveCount(1);
 const tile=page.locator('.match-tile').first();
 await expect(tile).toHaveCSS('animation-name','none');
 await expect(tile).toHaveCSS('transition-duration','0s');
});

for(const width of [320,390,768,1024,1280]){
 test('Match Up fits '+width+'px with long definitions and no horizontal scrolling',async({page})=>{
  await page.setViewportSize({width,height:780});
  await start(page,'sampling');
  const result=await page.evaluate(()=>({width:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth}));
  expect(result.scroll).toBeLessThanOrEqual(result.width+1);
  const id=await page.locator('[data-action="match-term"]').first().getAttribute('data-id');
  await page.locator('[data-action="match-term"][data-id="'+id+'"]').click();
  await expect(page.locator('.match-selected-name')).toBeVisible();
  const live=await page.evaluate(()=>({width:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth}));
  expect(live.scroll).toBeLessThanOrEqual(live.width+1);
  await page.locator('[data-action="match-def"][data-id="'+id+'"]').click();
  await expect(page.locator('.match-progress-pip.is-complete')).toHaveCount(1);
  const done=await page.evaluate(()=>({width:document.documentElement.clientWidth,
    scroll:document.documentElement.scrollWidth}));
  expect(done.scroll).toBeLessThanOrEqual(done.width+1);
 });
}
