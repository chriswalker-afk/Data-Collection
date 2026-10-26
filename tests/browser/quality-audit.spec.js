import {test,expect} from '@playwright/test';
const storageKey='sampling-arcade-progress-v1';
const state=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);

test('a corrected Match Up pair completes but cannot manufacture independent mastery',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/#/match/data');
 const first=await page.locator('[data-action="match-term"]').first().getAttribute('data-id');
 const other=await page.locator('[data-action="match-def"]:not([data-id="'+first+'"])').first().getAttribute('data-id');
 await page.locator('[data-action="match-term"][data-id="'+first+'"]').click();
 await page.locator('[data-action="match-def"][data-id="'+other+'"]').click();
 await expect(page.locator('.match-try-count')).toContainText('1 incorrect attempt');
 await page.locator('[data-action="match-term"][data-id="'+first+'"]').click();
 await page.locator('[data-action="match-def"][data-id="'+first+'"]').click();
 await expect(page.locator('.match-feedback')).toContainText('A useful correction');
 let saved=await state(page);
 expect(saved.concepts[first]).toMatchObject({attempts:2,correct:0,streak:0});
 await page.locator('[data-action="match-term"][data-id="'+other+'"]').click();
 await page.locator('[data-action="match-def"][data-id="'+other+'"]').click();
 saved=await state(page);
 expect(saved.concepts[other]).toMatchObject({attempts:1,correct:0,streak:0});
 const fresh=await page.locator('[data-action="match-term"]').first().getAttribute('data-id');
 await page.locator('[data-action="match-term"][data-id="'+fresh+'"]').click();
 await page.locator('[data-action="match-def"][data-id="'+fresh+'"]').click();
 expect((await state(page)).concepts[fresh].correct).toBe(1,'unexposed pair still earns credit');
});
test('ungraded contextual writing is recorded as practice without removing a previously mastered concept',async({page})=>{
 await page.goto('/#/reason/sampling');
 const methodIds=await page.evaluate(async()=> (await(await fetch('./content/methods.json')).json()).methods.map(m=>m.conceptId));
 await page.evaluate(({methodIds,key})=>{
  const concepts=Object.fromEntries(methodIds.map(id=>[id,{attempts:2,correct:2,streak:2}]));
  localStorage.setItem(key,JSON.stringify({version:1,answers:10,sessions:2,concepts}));
 },{methodIds,key:storageKey});
 await page.reload();
 await page.getByRole('button',{name:'Write independently'}).click();
 await page.locator('#reason-written').fill('I will select eligible units from an appropriate frame, explain how the method meets the research aim, discuss nonresponse and propose follow-up contacts.');
 await page.getByRole('button',{name:'Compare with model'}).click();
 const result=await state(page);
 expect(result.answers).toBe(11);
 expect(result.sessions).toBe(2);
 for(const id of methodIds){
  expect(result.concepts[id].correct,id).toBe(2);
  expect(result.concepts[id].streak,id).toBe(2);
 }
 await expect(page.locator('.typed-feedback')).toContainText('not been automatically marked');
 await page.goto('/#/home/sampling');
 await expect(page.locator('.mastery-explainer')).toContainText('Ungraded writing');
 await expect(page.locator('.mastery-explainer')).toContainText('not an exam grade');
});
test('a timed round with no submitted answers gives accurate completion feedback',async({page})=>{
 await page.clock.install();
 await page.goto('/#/speed/data');
 await page.locator('#speed-mode').selectOption('timed');
 await page.locator('#speed-duration').selectOption('30');
 await page.getByRole('button',{name:/Start 30-second round/}).click();
 await page.clock.fastForward(31_000);
 await expect(page.locator('.completion-title')).toHaveText('Round ended — no terms submitted.');
 await expect(page.locator('.speed-summary')).toContainText('Not yet measured');
 expect((await state(page)).answers).toBe(0);
});
test('all ten activity pages retain accessible headings, instructions and a working back route',async({page})=>{
 const games=['flashcards','match','cloze','speed','sort','identify','build','error','reason','exam'];
 for(const game of games){
  await page.goto('/#/'+game+'/sampling');
  await expect(page.locator('#view-heading')).toBeVisible();
  await expect(page.locator('.practice-guide')).toContainText('PRACTISING');
  await expect(page.locator('.practice-guide')).toContainText('WHAT TO DO');
  await expect(page.getByRole('link',{name:/Back to arcade/})).toHaveAttribute('href','#/home/sampling');
  const duplicate=await page.locator('[id]').evaluateAll(nodes=>{
    const values=nodes.map(n=>n.id).filter(Boolean);
    return values.length-new Set(values).size;
  });
  expect(duplicate,game+' must not have duplicate element ids').toBe(0);
 }
});
