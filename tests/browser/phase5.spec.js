import {test,expect} from '@playwright/test';

const EXAM_KEY='sampling-arcade-exam-v1';
const PROGRESS_KEY='sampling-arcade-progress-v1';
async function bank(page){
 return page.evaluate(async()=> (await(await fetch('./content/exam-practice.json')).json()).questions);
}
async function saved(page,key=EXAM_KEY){
 return page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
}
async function question(page,questions){
 const id=await page.locator('[data-sim-question]').getAttribute('data-sim-question');
 return questions.find(q=>q.id===id);
}
function expectedFor(q){
 if(q.type==='allocation'){
  const N=q.data.groups.reduce((sum,g)=>sum+g.size,0);
  return Object.fromEntries(q.data.groups.map(g=>[g.id,g.size*q.data.sampleSize/N]));
 }
 if(q.type==='systematic'){
  const k=q.data.populationSize/q.data.sampleSize;
  return {interval:k,final:q.data.randomStart+(q.data.sampleSize-1)*k};
 }
 return null;
}
async function answerCurrent(page,questions,{wrong=false,selfCheck=true}={}){
 const q=await question(page,questions);
 if(['allocation','systematic'].includes(q.type)){
  const key=expectedFor(q);
  for(const [id,value] of Object.entries(key))
   await page.locator('input[data-sim-num="'+id+'"]').fill(String(wrong?0:value));
  await page.getByRole('button',{name:'Check calculations'}).click();
  await expect(page.locator('.sim-feedback')).toBeVisible();
  await page.getByRole('button',{name:'Continue →'}).click();
 }else{
  await page.locator('#sim-draft').fill('My answer uses the context and carefully distinguishes probability selection from convenience.');
  await page.getByRole('button',{name:'Compare with model'}).click();
  await expect(page.locator('.sim-written-review')).toBeVisible();
  if(selfCheck){
   const inputs=page.locator('input[data-sim-point]');
   for(let i=0,n=await inputs.count();i<n;i++)await inputs.nth(i).check();
  }
  await page.getByRole('button',{name:'Save self-review and continue →'}).click();
 }
 return q;
}

test('Exam Lab appears as tenth game, restricts to sampling and offers balanced formats',async({page})=>{
 await page.goto('/#/home/data');
 await expect(page.locator('.game-card')).toHaveCount(10);
 await page.locator('.game-card').filter({hasText:'Exam Lab'}).click();
 await expect(page.locator('.activity-topic')).toHaveText('Sampling');
 await expect(page.getByRole('heading',{name:'Put it all together.'})).toBeVisible();
 for(const label of ['Start quick practice','Start mixed paper','Start full challenge'])
  await expect(page.getByRole('button',{name:label})).toBeVisible();
});

test('Quick exam covers all four sections, checks only numbers and produces printable report',async({page})=>{
 await page.goto('/#/exam/sampling');const questions=await bank(page);
 await page.getByRole('button',{name:'Start quick practice'}).click();
 let types=[];
 for(let i=0;i<4;i++){
  const q=await answerCurrent(page,questions);types.push(q.type);
 }
 expect(types.sort()).toEqual(['allocation','evaluation','procedure','systematic']);
 await expect(page.getByRole('heading',{name:'Paper complete'})).toBeVisible();
 await expect(page.locator('.sim-report-row')).toHaveCount(4);
 const p=await saved(page,PROGRESS_KEY);expect(p.answers).toBe(2);expect(p.sessions).toBe(1);
 const exam=await saved(page);expect(exam.paper.complete).toBe(true);expect(exam.reviewIds).toHaveLength(0);
 await page.evaluate(()=>{window.print=()=>{window.__printRequested=true;}});
 await page.getByRole('button',{name:'Print this report'}).click();
 expect(await page.evaluate(()=>window.__printRequested)).toBe(true);
 await page.emulateMedia({media:'print'});
 await expect(page.locator('.sim-report-row')).toHaveCount(4);
 await expect(page.locator('.site-header')).toBeHidden();
});

test('Numerical partial correctness creates a review target without double recording',async({page})=>{
 await page.goto('/#/exam/sampling');const questions=await bank(page);
 await page.getByRole('button',{name:'Start quick practice'}).click();
 let q;
 while(true){
  q=await question(page,questions);
  if(['allocation','systematic'].includes(q.type))break;
  await answerCurrent(page,questions);
 }
 const values=expectedFor(q),keys=Object.keys(values);
 for(const [id,value] of Object.entries(values))
  await page.locator('input[data-sim-num="'+id+'"]').fill(id===keys[0]?String(value):'0');
 await page.locator('input[data-sim-num="'+keys[0]+'"]').press('Tab');
 await page.getByRole('button',{name:'Check calculations'}).click();
 await expect(page.locator('.sim-feedback')).toContainText('1 of '+keys.length+' numerical parts correct');
 const stored=await saved(page);
 expect(stored.reviewIds).toContain(q.id);
 const before=(await saved(page,PROGRESS_KEY)).answers;
 await expect(page.getByRole('button',{name:'Check calculations'})).toHaveCount(0);
 expect((await saved(page,PROGRESS_KEY)).answers).toBe(before);
 await page.reload();
 await page.getByRole('button',{name:'Resume saved paper'}).click();
 await expect(page.locator('.sim-feedback')).toBeVisible();
 expect((await saved(page,PROGRESS_KEY)).answers).toBe(before);
});

test('Written drafts and checklist survive reload without automatic mastery awards',async({page})=>{
 await page.goto('/#/exam/sampling');const questions=await bank(page);
 await page.getByRole('button',{name:'Start quick practice'}).click();
 let q;
 while(true){
  q=await question(page,questions);
  if(['procedure','evaluation'].includes(q.type))break;
  await page.getByRole('button',{name:'Reveal worked solution'}).click();
  await page.getByRole('button',{name:'Continue →'}).click();
 }
 const before=(await saved(page,PROGRESS_KEY))?.answers||0;
 const draft='I would check the frame, justify the selection and explain possible bias.';
 await page.locator('#sim-draft').fill(draft);
 await page.reload();
 await page.getByRole('button',{name:'Resume saved paper'}).click();
 await expect(page.locator('#sim-draft')).toHaveValue(draft);
 await page.getByRole('button',{name:'Compare with model'}).click();
 const first=page.locator('input[data-sim-point]').first();
 await first.check();
 await page.reload();
 await page.getByRole('button',{name:'Resume saved paper'}).click();
 await expect(page.locator('input[data-sim-point]').first()).toBeChecked();
 await page.getByRole('button',{name:'Save self-review and continue →'}).click();
 expect((await saved(page,PROGRESS_KEY))?.answers||0).toBe(before);
 expect((await saved(page)).reviewIds).toContain(q.id);
});

test('Malformed numeric input is not submitted and original progress is preserved',async({page})=>{
 await page.goto('/#/home/sampling');
 await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({version:1,answers:7,sessions:2,
  concepts:{population:{attempts:2,correct:2,streak:2}}})),PROGRESS_KEY);
 await page.goto('/#/exam/sampling');const questions=await bank(page);
 await page.getByRole('button',{name:'Start quick practice'}).click();
 let q;
 while(true){
  q=await question(page,questions);if(['allocation','systematic'].includes(q.type))break;
  await answerCurrent(page,questions);
 }
 const names=Object.keys(expectedFor(q));
 for(const id of names)await page.locator('input[data-sim-num="'+id+'"]').fill('10');
 await page.locator('input[data-sim-num="'+names[0]+'"]').fill('10.5');
 await page.getByRole('button',{name:'Check calculations'}).click();
 await expect(page.locator('.sim-validation')).toContainText('whole number');
 expect((await saved(page,PROGRESS_KEY)).answers).toBe(7);
 const valid=expectedFor(q);
 for(const [id,n] of Object.entries(valid))await page.locator('input[data-sim-num="'+id+'"]').fill(String(n));
 await page.locator('input[data-sim-num="'+names[0]+'"]').press('Enter');
 await expect(page.locator('.sim-feedback')).toContainText('All calculations correct');
 const progress=await saved(page,PROGRESS_KEY);
 expect(progress.answers).toBe(8);expect(progress.concepts.population.streak).toBe(2);
});

test('Practice targets form a targeted paper and disappear once corrected',async({page})=>{
 await page.goto('/#/exam/sampling');const qs=await bank(page);
 await page.getByRole('button',{name:'Start quick practice'}).click();
 let missed=null;
 for(let i=0;i<4;i++){
  const q=await question(page,qs);
  if(!missed&&['allocation','systematic'].includes(q.type)){
   missed=q.id;await answerCurrent(page,qs,{wrong:true});
  }else await answerCurrent(page,qs);
 }
 const stored=await saved(page);expect(stored.reviewIds).toEqual([missed]);
 await page.getByRole('button',{name:'Practise saved targets'}).click();
 await expect(page.locator('[data-sim-question]')).toHaveAttribute('data-sim-question',missed);
 await answerCurrent(page,qs);
 await expect(page.getByRole('heading',{name:'Paper complete'})).toBeVisible();
 expect((await saved(page)).reviewIds).toHaveLength(0);
});

test('Corrupt exam storage recovers safely and clear paper protects drafts',async({page})=>{
 await page.goto('/#/exam/sampling');
 await page.evaluate(key=>localStorage.setItem(key,'{broken'),EXAM_KEY);
 await page.reload();
 await expect(page.getByRole('heading',{name:'Put it all together.'})).toBeVisible();
 await page.getByRole('button',{name:'Start quick practice'}).click();
 const q=await page.locator('[data-sim-question]').getAttribute('data-sim-question');
 expect(q).toBeTruthy();
 await page.getByRole('button',{name:'Back to paper choices'}).click();
 page.once('dialog',dialog=>dialog.dismiss());
 await page.getByRole('button',{name:'Clear this paper'}).click();
 expect((await saved(page)).paper).not.toBeNull();
 page.once('dialog',dialog=>dialog.accept());
 await page.getByRole('button',{name:'Clear this paper'}).click();
 expect((await saved(page)).paper).toBeNull();
});

for(const width of [320,390,1280]){
 test('Exam Lab stays inside '+width+'px viewport through model and feedback',async({page})=>{
  await page.setViewportSize({width,height:800});
  await page.goto('/#/exam/sampling');
  await expect(page.locator('.sim-landing')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
  const qs=await bank(page);
  await page.getByRole('button',{name:'Start quick practice'}).click();
  for(let i=0;i<4;i++){
   const q=await question(page,qs);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
   if(['allocation','systematic'].includes(q.type)){
    await page.getByRole('button',{name:'Reveal worked solution'}).click();
    await expect(page.locator('.sim-worked-row')).toHaveCount(Object.keys(expectedFor(q)).length);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    await page.getByRole('button',{name:'Continue →'}).click();
   }else{
    await page.getByRole('button',{name:'Reveal model without writing'}).click();
    await expect(page.locator('input[data-sim-point]').first()).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
    await page.getByRole('button',{name:'Save self-review and continue →'}).click();
   }
  }
  await expect(page.locator('.sim-report')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
 });
}
