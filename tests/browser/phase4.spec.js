import {test,expect} from '@playwright/test';
const store=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('sampling-arcade-progress-v1')));
async function bank(page,file,key){return page.evaluate(async({file,key})=>(await(await fetch('./content/'+file+'.json')).json())[key],{file,key});}
test('all nine games are visible and exam skills route to sampling',async({page})=>{
 await page.goto('/#/home/data');
 await expect(page.locator('.game-card')).toHaveCount(10);
 for(const game of ['build','error','reason']){
  await page.goto('/#/'+game+'/data');
  await expect(page.locator('.activity-topic')).toHaveText('Sampling');
  await expect(page.locator('.exam-workspace')).toBeVisible();
 }
});
test('Build the Method supports keyboard movement, feedback and untouched progress version',async({page})=>{
 await page.goto('/#/build/sampling');
 const methods=await bank(page,'methods','methods');
 const first=methods[0];
 await expect(page.locator('[data-method-id="simple-random"]')).toBeVisible();
 let actual=await page.locator('[data-step-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.stepId));
 for(let i=0;i<first.procedure.length;i++){
  const id=first.procedure[i].id;
  let at=actual.indexOf(id);
  while(at>i){
   await page.locator('[data-step-id="'+id+'"] [data-dir="-1"]').focus();
   await page.keyboard.press('Enter');
   [actual[at-1],actual[at]]=[actual[at],actual[at-1]];at--;
  }
 }
 await page.getByRole('button',{name:'Check procedure'}).click();
 await expect(page.locator('.typed-feedback')).toContainText('Valid procedure');
 const p=await store(page);expect(p.version).toBe(1);expect(p.concepts[first.conceptId].correct).toBe(1);
 await page.getByRole('button',{name:'Next method →'}).click();
 await expect(page.locator('[data-method-id="systematic"]')).toBeVisible();
 await page.getByRole('button',{name:'Reveal model'}).click();
 await expect(page.locator('.exam-model-list')).toBeVisible();
 expect((await store(page)).answers).toBe(2);
});
test('Spot the Error diagnoses step, correction and consequence exactly once',async({page})=>{
 await page.goto('/#/error/sampling');const questions=await bank(page,'exam-errors','errors');
 const id=await page.locator('[data-error-id]').getAttribute('data-error-id'),q=questions.find(x=>x.id===id);
 await page.locator('input[name="error-line"][value="'+q.errorLine+'"]').check();
 await page.locator('input[name="error-repair"][value="'+q.repair+'"]').check();
 await page.locator('input[name="error-impact"][value="'+q.impact.answer+'"]').check();
 await page.getByRole('button',{name:'Check all three decisions'}).click();
 await expect(page.locator('.error-analysis')).toContainText('All three decisions correct');
 expect((await store(page)).answers).toBe(1);
 await page.getByRole('button',{name:'Next case →'}).click();
 expect((await store(page)).answers).toBe(1);
});
test('Contextual Reasoning preserves typed draft, compares model, does not grant checklist mastery',async({page})=>{
 await page.goto('/#/reason/sampling');const questions=await bank(page,'exam-reasoning','reasoning');
 const id=await page.locator('[data-reason-id]').getAttribute('data-reason-id'),q=questions.find(x=>x.id===id);
 await page.locator('#reason-written').fill('My reason is specific to the study and I can explain it.');
 for(const key of ['method','reason','limitation','improvement'])
  await page.locator('input[name="reason-'+key+'"][value="'+q.answers[key]+'"]').check();
 await expect(page.locator('#reason-written')).toHaveValue(/My reason is specific/);
 await page.getByRole('button',{name:'Review my reasoning'}).click();
 await expect(page.locator('.typed-feedback')).toContainText('4 of 4');
 await expect(page.locator('.exam-draft')).toContainText('My reason is specific');
 expect((await store(page)).concepts[q.answers.method==='simple-random'?'simple-random-sampling':q.answers.method+'-sampling'].correct).toBe(0);
});
for(const width of [320,390,1280]){
 test('Exam skills keep controls on screen at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:800});
  for(const game of ['build','error','reason']){
   await page.goto('/#/'+game+'/sampling');
   await expect(page.locator('.exam-workspace')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
  }
 });
}
