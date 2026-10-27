import {test,expect} from '@playwright/test';
const progress=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('sampling-arcade-progress-v1')));
const source=async(page,name,key)=>page.evaluate(async({name,key})=>
  (await(await fetch('./content/'+name+'.json')).json())[key],{name,key});
async function startBuild(page,method='simple-random',level='mixed'){
 await page.goto('/#/build/sampling');
 await expect(page.locator('.exam-workspace[data-build-case-id]')).toBeVisible();
 if(method!=='simple-random')await page.locator('#build-method').selectOption(method);
 if(level!=='mixed')await page.locator('#build-level').selectOption(level);
 await expect(page.locator('.build-case-brief')).toBeVisible();
}
async function stepIds(page){
 return page.locator('.exam-step-list [data-step-id]').evaluateAll(nodes=>nodes.map(x=>x.dataset.stepId));
}
async function arrange(page,ids){
 for(let i=0;i<ids.length;i++){
  let order=await stepIds(page),position=order.indexOf(ids[i]);
  expect(position,ids[i]+' must be a valid step').toBeGreaterThanOrEqual(i);
  while(position>i){
   await page.locator('[data-step-id="'+ids[i]+'"] [data-dir="-1"]').click();
   position--;
  }
 }
 await expect.poll(()=>stepIds(page)).toEqual(ids);
}

test('Build the Method presents a meaningful scenario brief and student-controlled difficulty',async({page})=>{
 await startBuild(page);
 await expect(page.locator('#build-method option')).toHaveCount(5);
 await expect(page.locator('#build-level option')).toHaveCount(4);
 await expect(page.locator('#build-level')).toHaveValue('mixed');
 const all=await source(page,'build-scenarios','buildScenarios');
 expect(all).toHaveLength(15);
 const currentId=await page.locator('[data-build-case-id]').getAttribute('data-build-case-id');
 const current=all.find(x=>x.id===currentId);
 await expect(page.locator('.build-case-context')).toHaveText(current.context);
 await expect(page.locator('.build-case-task')).toHaveText(current.task);
 for(const step of current.steps){
  await expect(page.locator('.exam-step[data-step-id="'+step.id+'"] .exam-step-copy'))
    .toContainText(step.text);
 }
 await page.locator('#build-level').selectOption('develop');
 await expect(page.locator('[data-case-level]')).toHaveAttribute('data-case-level','develop');
 await expect(page.locator('.build-case-label')).toHaveText('DEVELOP CASE');
 await page.locator('#build-level').selectOption('extend');
 await expect(page.locator('[data-case-level]')).toHaveAttribute('data-case-level','extend');
 expect(await progress(page)).toBeNull('Changing the level is not a scored attempt');
});

test('case-specific model and caution remain visible with ungraded reveal',async({page})=>{
 await startBuild(page,'stratified','extend');
 const all=await source(page,'build-scenarios','buildScenarios');
 const id=await page.locator('[data-build-case-id]').getAttribute('data-build-case-id');
 const c=all.find(x=>x.id===id);
 expect(c.id).toBe('build-habitat-plots');
 await expect(page.locator('.build-case-context')).toContainText('700');
 await page.getByRole('button',{name:'Reveal model'}).click();
 await expect(page.locator('.build-analysis-title')).toContainText('Model revealed');
 const model=await page.locator('.exam-model-list li').allTextContents();
 for(const step of c.steps)expect(model.join(' ')).toContain(step.text);
 await expect(page.locator('.build-worked-example')).toContainText(c.workedExample);
 await expect(page.locator('.build-case-caution')).toContainText(c.caution);
 const saved=await progress(page);
 expect(saved.answers).toBe(1);
 expect(saved.concepts['stratified-sampling'].correct).toBe(0);
 await expect(page.locator('.build-correction-toggle')).toBeVisible();
});

test('alternative valid opportunity order earns credit, incorrect context order does not',async({page})=>{
 await startBuild(page,'opportunity','develop');
 await arrange(page,['available','criteria','recruit']);
 await page.getByRole('button',{name:'Check procedure'}).click();
 await expect(page.locator('.typed-feedback')).toContainText('Valid procedure');
 await expect(page.locator('.build-analysis-title')).toContainText('A different order');
 expect((await progress(page)).concepts['opportunity-sampling'].correct).toBe(1);

 await page.goto('/#/home/sampling');
 await startBuild(page,'simple-random','foundation');
 await arrange(page,['number','frame','generate','repeats','select']);
 await page.getByRole('button',{name:'Check procedure'}).click();
 await expect(page.locator('.build-analysis-title')).toContainText('1 ordering dependency');
 await expect(page.locator('.build-unmet-list')).toContainText('Number each unit');
 await expect(page.locator('.build-case-caution')).toBeVisible();
 const score=await progress(page);
 expect(score.answers).toBe(2);
 expect(score.concepts['simple-random-sampling'].correct).toBe(0);
});

test('varied investigations change on replay without changing the five-method journey',async({page})=>{
 await startBuild(page);
 const first=await page.locator('[data-build-case-id]').getAttribute('data-build-case-id');
 const seen=new Set();
 for(let i=0;i<5;i++){
  const method=await page.locator('[data-method-id]').getAttribute('data-method-id');
  seen.add(method);
  await page.getByRole('button',{name:'Reveal model'}).click();
  await expect(page.locator('.build-case-caution')).toBeVisible();
  await page.getByRole('button',{name:i===4?'Finish round →':'Next method →'}).click();
 }
 expect(seen.size).toBe(5);
 await expect(page.locator('.build-round-summary .build-summary-item')).toHaveCount(5);
 const before=await progress(page);
 expect(before.answers).toBe(5);
 expect(Object.values(before.concepts).every(s=>s.correct===0)).toBe(true);
 await page.getByRole('button',{name:/Play another round/}).click();
 await expect(page.locator('.exam-workspace')).toBeVisible();
 const another=await page.locator('[data-build-case-id]').getAttribute('data-build-case-id');
 expect(another).not.toBe(first);
 expect((await progress(page)).answers).toBe(5,'Starting a new round cannot give extra credit');
});

test('every missing Sort It! comparison is available and sets four balanced destinations',async({page})=>{
 await page.goto('/#/sort/sampling');
 const pairs=await source(page,'sort-pairs','pairs');
 const evaluations=await source(page,'evaluations','evaluations');
 expect(pairs).toHaveLength(10);
 await expect(page.locator('#sort-set option')).toHaveCount(10);
 for(const id of ['pair-srs-systematic','pair-srs-quota','pair-systematic-stratified','pair-stratified-opportunity']){
  const pair=pairs.find(x=>x.id===id);
  await page.locator('#sort-set').selectOption(id);
  await expect(page.locator('.sort-method')).toHaveCount(2);
  await expect(page.locator('.sort-drop-zone')).toHaveCount(4);
  await expect(page.locator('.sort-tray [data-sort-card]')).toHaveCount(pair.evaluationIds.length);
  for(const method of pair.methods)for(const polarity of ['advantage','disadvantage']){
   const count=pair.evaluationIds.map(x=>evaluations.find(e=>e.id===x))
      .filter(x=>x.subject===method&&x.polarity===polarity).length;
   expect(count,id+'/'+method+'/'+polarity).toBeGreaterThanOrEqual(2);
   await expect(page.locator('[data-sort-drop="'+method+':'+polarity+'"]')).toBeVisible();
  }
  await expect(page.locator('[data-action="sort-check"]')).toBeDisabled();
 }
 expect(await progress(page)).toBeNull('Switching comparison boards does not earn credit');
});

test('new systematic-versus-stratified board checks complete placement exactly once',async({page})=>{
 await page.goto('/#/sort/sampling');
 const id='pair-systematic-stratified';
 await page.locator('#sort-set').selectOption(id);
 const pairs=await source(page,'sort-pairs','pairs');
 const evaluations=await source(page,'evaluations','evaluations');
 const pair=pairs.find(x=>x.id===id);
 const mistaken=pair.evaluationIds.find(x=>evaluations.find(q=>q.id===x).subject==='systematic');
 for(const key of pair.evaluationIds){
  const item=evaluations.find(q=>q.id===key);
  const polarity=key===mistaken?(item.polarity==='advantage'?'disadvantage':'advantage'):item.polarity;
  await page.locator('[data-sort-card="'+key+'"]').click();
  await page.locator('[data-action="sort-place"][data-sort-destination="'+item.subject+':'+polarity+'"]').click();
 }
 await page.locator('[data-action="sort-check"]').click();
 await expect(page.locator('.sort-board-feedback')).toContainText('11 of 12 in the right place');
 const first=await progress(page);
 expect(first.answers).toBe(12);
 await page.locator('[data-sort-card="'+mistaken+'"]').click();
 const item=evaluations.find(x=>x.id===mistaken);
 await page.locator('[data-action="sort-place"][data-sort-destination="'+item.subject+':'+item.polarity+'"]').click();
 await page.locator('[data-action="sort-check"]').click();
 await expect(page.locator('.sort-board-feedback')).toContainText('first-check score is 11 of 12');
 expect((await progress(page)).answers).toBe(12,'Second check is unscored');
});

for(const width of [320,390,768,1280]){
 test('contextual Build and full twelve-card Sort board fit '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:820});
  await startBuild(page,'stratified','extend');
  for(const route of ['build','sort']){
   if(route==='sort'){
    await page.goto('/#/sort/sampling');
    await page.locator('#sort-set').selectOption('pair-stratified-opportunity');
    await expect(page.locator('.sort-tray [data-sort-card]')).toHaveCount(12);
   }else await expect(page.locator('.build-case-brief')).toBeVisible();
   const values=await page.evaluate(()=>({
    available:document.documentElement.clientWidth,
    actual:document.documentElement.scrollWidth
   }));
   expect(values.actual,route+' at '+width).toBeLessThanOrEqual(values.available+1);
  }
 });
}
