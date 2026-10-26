import {test,expect} from '@playwright/test';

const progressKey='sampling-arcade-progress-v1';
async function state(page){
 return page.evaluate(key=>localStorage.getItem(key),progressKey);
}
async function bankItem(page,filename,field,selector){
 const id=await page.locator(selector).getAttribute(selector==='[data-reason-id]'?'data-reason-id':'data-error-id');
 return page.evaluate(async({filename,field,id})=>{
  const result=await(await fetch('./content/'+filename+'.json')).json();
  return result[field].find(item=>item.id===id);
 },{filename,field,id});
}
test('Which Method? can draw contextual cases from all 50 across balanced 20-case rounds',async({page})=>{
 await page.goto('/#/identify/sampling');
 await page.locator('#scenario-length').selectOption('20');
 await expect(page.locator('.round-progress')).toContainText('1 / 20');
 const scenario=await page.locator('[data-item-id]').getAttribute('data-item-id');
 await expect(page.locator('.identify-choice')).toHaveCount(5);
 await expect(page.locator('.identify-evidence-mark')).toHaveCount(0);
 const data=await page.evaluate(async()=>await(await fetch('./content/scenarios.json')).json());
 expect(data.scenarios).toHaveLength(50);
 expect(data.scenarios.filter(item=>item.level==='apply')).toHaveLength(35);
 const current=data.scenarios.find(item=>item.id===scenario);
 await page.locator('[data-action="classify-option"][data-choice="'+current.correctMethod+'"]').click();
 await expect(page.locator('.identify-evidence-mark')).toHaveText(current.evidence||
  await page.evaluate(async id=>(await import('./src/identify.js')).SCENARIO_EVIDENCE[id],scenario));
 await expect(page.locator('.identify-evidence-detail')).toContainText(current.reason);
});

test('Spot the Error lets pupils choose focused 5 and complete 10-case level',async({page})=>{
 await page.goto('/#/error/sampling');
 await expect(page.locator('#case-length')).toHaveValue('5');
 await expect(page.locator('.round-progress')).toContainText('1 / 5');
 await page.locator('#case-length').selectOption('10');
 await expect(page.locator('.round-progress')).toContainText('1 / 10');
 const q=await bankItem(page,'exam-errors','errors','[data-error-id]');
 await page.locator('input[name="error-line"][value="'+q.errorLine+'"]').check();
 await page.locator('input[name="error-repair"][value="'+q.repair+'"]').check();
 await page.locator('input[name="error-impact"][value="'+q.impact.answer+'"]').check();
 await page.getByRole('button',{name:'Check all three decisions'}).click();
 await expect(page.locator('.error-analysis')).toContainText('All three decisions correct');
 const before=await state(page);
 await page.locator('#case-length').selectOption('5');
 await expect(page.locator('.round-progress')).toContainText('1 / 5');
 expect(await state(page)).toBe(before,'Changing length must not silently award extra mastery');
});

test('Contextual Reasoning offers 3/5/10 case rounds and preserves ungraded writing',async({page})=>{
 await page.goto('/#/reason/sampling');
 await expect(page.locator('#case-length')).toHaveValue('3');
 await page.locator('#case-length').selectOption('5');
 await expect(page.locator('.round-progress')).toContainText('1 / 5');
 await page.locator('#case-length').selectOption('10');
 await expect(page.locator('.round-progress')).toContainText('1 / 10');
 const q=await bankItem(page,'exam-reasoning','reasoning','[data-reason-id]');
 await expect(page.locator('.reason-fact')).toHaveCount(3);
 await page.getByRole('button',{name:'Write independently'}).click();
 await page.locator('#reason-written').fill('I would '+q.answers.method+' based on the available frame. I would check nonresponse and be cautious in generalising.');
 await page.getByRole('button',{name:'Compare with model'}).click();
 await expect(page.locator('.typed-feedback')).toContainText('not been automatically marked');
 const saved=JSON.parse(await state(page));
 expect(saved.answers).toBe(1);
 expect(Object.values(saved.concepts).every(item=>item.correct===0)).toBe(true);
 await page.locator('#case-length').selectOption('3');
 await expect(page.locator('.round-progress')).toContainText('1 / 3');
 expect(JSON.parse(await state(page)).answers).toBe(1);
});

for(const width of [320,390,1280]){
 test('expanded case-length controls and content remain within '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:820});
  for(const route of ['error','reason']){
   await page.goto('/#/'+route+'/sampling');
   await page.locator('#case-length').selectOption('10');
   const dimensions=await page.evaluate(()=>({
    actual:document.documentElement.scrollWidth,
    available:document.documentElement.clientWidth
   }));
   expect(dimensions.actual,route+' at '+width).toBeLessThanOrEqual(dimensions.available+1);
  }
 });
}
