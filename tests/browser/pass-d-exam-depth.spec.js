import {test,expect} from '@playwright/test';
const KEY='sampling-arcade-exam-v1',PROGRESS='sampling-arcade-progress-v1';
const store=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
async function startSaved(page,id){
 await page.goto('/#/exam/sampling');
 await page.evaluate(({key,id})=>{
   localStorage.setItem(key,JSON.stringify({
     version:1,reviewIds:[],recentQuestionIds:[],
     paper:{variant:'review',difficulty:'mixed',questionIds:[id],
       index:0,complete:false,entries:{}}
   }));
 },{key:KEY,id});
 await page.reload();
 await page.getByRole('button',{name:'Resume saved paper'}).click();
 await expect(page.locator('[data-sim-question]')).toHaveAttribute('data-sim-question',id);
}
const overflow=page=>page.evaluate(()=>({
 viewport:document.documentElement.clientWidth,
 document:document.documentElement.scrollWidth
}));

test('Exam Lab displays a 100-question, four-skill curriculum and all three paper formats',async({page})=>{
 await page.goto('/#/exam/sampling');
 await expect(page.locator('.sim-variety-note')).toContainText('100 authored questions');
 await expect(page.locator('input[name="exam-difficulty"]')).toHaveCount(3);
 for(const name of ['Start quick practice','Start mixed paper','Start full challenge'])
  await expect(page.getByRole('button',{name})).toBeVisible();
 const content=await page.evaluate(async()=>(await(await fetch('./content/exam-practice.json')).json()).questions);
 expect(content).toHaveLength(100);
 expect(content.filter(q=>q.type==='allocation')).toHaveLength(20);
 expect(content.filter(q=>q.type==='systematic')).toHaveLength(20);
 expect(content.filter(q=>q.type==='procedure')).toHaveLength(24);
 expect(content.filter(q=>q.type==='evaluation')).toHaveLength(36);
});

test('unseen-first papers avoid immediate repeats even after an unfinished-paper confirmation',async({page})=>{
 await page.goto('/#/exam/sampling');
 await page.getByRole('button',{name:'Start full challenge'}).click();
 let saved=await store(page);
 const first=saved.paper.questionIds.slice();
 expect(first).toHaveLength(12);
 expect(saved.recentQuestionIds).toHaveLength(12);
 await page.getByRole('button',{name:'Back to paper choices'}).click();
 page.once('dialog',dialog=>dialog.dismiss());
 await page.getByRole('button',{name:'Start full challenge'}).click();
 saved=await store(page);
 expect(saved.paper.questionIds).toEqual(first);
 expect(saved.recentQuestionIds).toHaveLength(12);
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Start full challenge'}).click();
 saved=await store(page);
 expect(saved.paper.questionIds).toHaveLength(12);
 expect(saved.paper.questionIds.filter(id=>first.includes(id))).toHaveLength(0);
 expect(saved.recentQuestionIds.length).toBeGreaterThan(12);
 await page.reload();
 await page.getByRole('button',{name:'Resume saved paper'}).click();
 expect((await store(page)).recentQuestionIds).toEqual(saved.recentQuestionIds);
});

test('four-stratum allocation is checked exactly and worked solutions remain accessible',async({page})=>{
 await startSaved(page,'alloc-d-reef-zones');
 await expect(page.locator('.sim-number-row')).toHaveCount(4);
 const values=[18,12,10,5];
 for(let i=0;i<4;i++)await page.locator('[data-sim-num]').nth(i).fill(String(values[i]));
 await page.getByRole('button',{name:'Check calculations'}).click();
 await expect(page.locator('.sim-feedback')).toContainText('All calculations correct');
 await expect(page.locator('.sim-worked-row')).toHaveCount(4);
 await expect(page.locator('.sim-worked-list')).toContainText('18');
 await expect(page.locator('.sim-worked-list')).toContainText('12');
 const state=await store(page);
 expect(state.paper.entries['alloc-d-reef-zones'].stage).toBe('feedback');
 expect(state.reviewIds).not.toContain('alloc-d-reef-zones');
});

test('model-only written review cannot earn points and creates a retained practice target',async({page})=>{
 await startSaved(page,'eval-d-app-only');
 await expect(page.locator('#sim-draft')).toBeVisible();
 const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key))?.answers??0,PROGRESS);
 await page.getByRole('button',{name:'Reveal model without writing'}).click();
 await expect(page.locator('.sim-written-review')).toContainText('Model study');
 await expect(page.locator('input[data-sim-point]')).toHaveCount(3);
 await expect(page.locator('input[data-sim-point]:disabled')).toHaveCount(3);
 await expect(page.locator('#sim-check-count')).toContainText('0 of 3');
 await expect(page.locator('.sim-focus-tip')).toBeVisible();
 await page.locator('.sim-focus-tip summary').click();
 await expect(page.locator('.sim-focus-tip')).toContainText('response count');
 await page.locator('#sim-improvement').fill('Next time: identify non-app users who have zero chance to respond.');
 expect((await store(page)).paper.entries['eval-d-app-only'].improvement).toContain('non-app users');
 await page.reload();
 await page.getByRole('button',{name:'Resume saved paper'}).click();
 await expect(page.locator('#sim-improvement')).toContainText('non-app users');
 await page.getByRole('button',{name:'Save self-review and continue →'}).click();
 await expect(page.locator('.sim-report')).toBeVisible();
 await expect(page.locator('.sim-report-result')).toContainText('Model studied · no written answer');
 await expect(page.locator('.sim-improvement-report')).toContainText('non-app users');
 expect((await store(page)).reviewIds).toContain('eval-d-app-only');
 expect((await store(page)).paper.entries['eval-d-app-only'].included).toEqual([]);
 const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key))?.answers??0,PROGRESS);
 expect(after).toBe(before);
});

test('students can self-check written answers, save a next step, and resume without losing either',async({page})=>{
 await startSaved(page,'eval-d-machine-cycle');
 const studentAnswer='The interval is 640 divided by 80, so 8. This matches the eight-setting cycle; a random start can repeatedly select the same machine setting.';
 await page.locator('#sim-draft').fill(studentAnswer);
 await page.getByRole('button',{name:'Compare with model'}).click();
 await page.locator('input[data-sim-point]').first().check();
 await page.locator('#sim-improvement').fill('I would explicitly suggest simple random sampling across the complete list.');
 await page.reload();
 await page.getByRole('button',{name:'Resume saved paper'}).click();
 await expect(page.locator('input[data-sim-point]').first()).toBeChecked();
 await expect(page.locator('#sim-improvement')).toContainText('simple random sampling');
 await expect(page.locator('.sim-preserved-text')).toContainText('640 divided by 80');
 await page.getByRole('button',{name:'Save self-review and continue →'}).click();
 await expect(page.locator('.sim-report-result')).toContainText('1 / 3 self-checked');
 expect((await store(page)).reviewIds).toContain('eval-d-machine-cycle');
});

test('constrained random digit model explains out-of-range labels and duplicate rejection',async({page})=>{
 await startSaved(page,'proc-d-random-tables');
 await page.getByRole('button',{name:'Reveal model without writing'}).click();
 await expect(page.locator('.sim-model-steps')).toContainText('001 to 240');
 await expect(page.locator('.sim-model-steps')).toContainText('241 to 999');
 await expect(page.locator('.sim-model-steps')).toContainText('repeated');
 await expect(page.locator('input[data-sim-point]:disabled')).toHaveCount(6);
});

for(const width of [320,390,768,1280]){
 test('Pass D extended calculations and written feedback fit '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:800});
  await startSaved(page,'alloc-d-reef-zones');
  let dim=await overflow(page);
  expect(dim.document,'allocation entry').toBeLessThanOrEqual(dim.viewport+1);
  await page.getByRole('button',{name:'Reveal worked solution'}).click();
  dim=await overflow(page);
  expect(dim.document,'allocation model').toBeLessThanOrEqual(dim.viewport+1);
  await startSaved(page,'eval-d-app-only');
  await page.getByRole('button',{name:'Reveal model without writing'}).click();
  await page.locator('.sim-focus-tip summary').click();
  await page.locator('#sim-improvement').fill('One new improvement to remember.');
  dim=await overflow(page);
  expect(dim.document,'model and improvement').toBeLessThanOrEqual(dim.viewport+1);
 });
}
