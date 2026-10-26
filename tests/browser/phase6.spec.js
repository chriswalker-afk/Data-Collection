import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const storageKey='sampling-arcade-exam-v1',progressKey='sampling-arcade-progress-v1';
async function bank(page){return page.evaluate(async()=>(await(await fetch('./content/exam-practice.json')).json()).questions);}
async function saved(page,key=storageKey){return page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);}
async function seed(page,id,entry={}){
 await page.goto('/#/exam/sampling');
 await page.evaluate(({storageKey,id,entry})=>{
  localStorage.setItem(storageKey,JSON.stringify({version:1,reviewIds:[],paper:{
   variant:'review',questionIds:[id],index:0,complete:false,entries:{[id]:{stage:'answer',draft:'',
     values:{},included:[],flag:false,hintsUsed:0,...entry}}}}));
 },{storageKey,id,entry});
 await page.reload();
 await page.getByRole('button',{name:'Resume saved paper'}).click();
 await expect(page.locator('[data-sim-question]')).toHaveAttribute('data-sim-question',id);
}

test('standard and full exams guarantee method critique and sampling inference',async({page})=>{
 await page.goto('/#/exam/sampling');
 const qs=await bank(page),lookup=new Map(qs.map(q=>[q.id,q]));
 for(const [label,count] of [['Start mixed paper',8],['Start full challenge',12]]){
  await page.getByRole('button',{name:label}).click();
  const ids=(await saved(page)).paper.questionIds;
  expect(ids).toHaveLength(count);
  const evals=ids.map(id=>lookup.get(id)).filter(q=>q.type==='evaluation');
  expect(evals.some(q=>q.coverageArea==='inference')).toBe(true);
  expect(evals.some(q=>q.coverageArea==='methods')).toBe(true);
  await page.getByRole('button',{name:'Back to paper choices'}).click();
  if(label!=='Start full challenge'){
   page.once('dialog',dialog=>dialog.accept());
  }
 }
});

test('the random-digit and noninteger systematic models match their scenarios',async({page})=>{
 await seed(page,'proc-random-digits',{stage:'review'});
 await expect(page.locator('.sim-written-review')).toBeVisible();
 await expect(page.locator('.sim-model-steps')).toContainText('000');
 await expect(page.locator('.sim-model-steps')).toContainText('181');
 await expect(page.locator('.sim-model-steps')).not.toContainText('Generate random integers from 1 to N');
 await expect(page.locator('.sim-written-review .typed-feedback')).toHaveAttribute('tabindex','-1');
 await expect(page.locator('input[data-sim-point]')).toHaveCount(6);
 await seed(page,'proc-systematic-fraction',{stage:'review'});
 await expect(page.locator('.sim-model-steps')).toContainText('197');
 await expect(page.locator('.sim-model-steps')).toContainText('1 or 2');
 await expect(page.locator('.sim-model-steps')).toContainText('40 distinct positions');
 await expect(page.locator('input[data-sim-point]')).toHaveCount(6);
});

test('keyboard-accessible hints preserve answers and require independent recorrection',async({page})=>{
 const qs=await (async()=>{await page.goto('/#/exam/sampling');return bank(page)})(),q=qs.find(x=>x.id==='alloc-year-groups');
 await seed(page,q.id);
 const total=q.data.groups.reduce((sum,g)=>sum+g.size,0);
 const vals=Object.fromEntries(q.data.groups.map((g,i)=>[g.id,String(g.size*q.data.sampleSize/total)]));
 await page.locator('input[data-sim-num="g0"]').fill(vals.g0);
 await page.getByRole('button',{name:'I need a hint'}).focus();
 await page.keyboard.press('Enter');
 await expect(page.locator('#sim-hints')).toBeFocused();
 await expect(page.locator('.sim-hint-list li')).toHaveCount(1);
 await expect(page.locator('input[data-sim-num="g0"]')).toHaveValue(vals.g0);
 await page.getByRole('button',{name:'Show another hint'}).click();
 await expect(page.locator('.sim-hint-list li')).toHaveCount(2);
 await page.reload();
 await page.getByRole('button',{name:'Resume saved paper'}).click();
 await expect(page.locator('.sim-hint-list li')).toHaveCount(2);
 for(const [id,val] of Object.entries(vals))await page.locator('input[data-sim-num="'+id+'"]').fill(val);
 await page.getByRole('button',{name:'Check calculations'}).click();
 await expect(page.locator('.sim-feedback')).toContainText('All calculations correct with support');
 const progress=await saved(page,progressKey),exam=await saved(page);
 expect(progress.concepts[q.conceptId].correct).toBe(0);
 expect(progress.concepts[q.conceptId].attempts).toBe(1);
 expect(exam.reviewIds).toContain(q.id);
 expect(exam.paper.entries[q.id].hintsUsed).toBe(2);
 await page.getByRole('button',{name:'Continue →'}).click();
 await expect(page.locator('.sim-report-row')).toContainText('Hints used');
 await expect(page.locator('.sim-report-row')).toContainText('Review recommended');
});

test('draft writing and live self-review count survive a hint and screen changes',async({page})=>{
 await seed(page,'eval-two-samples');
 const draft='I would not generalise the sample means; the two random selections could contain different pupils.';
 await page.locator('#sim-draft').fill(draft);
 await page.getByRole('button',{name:'I need a hint'}).click();
 await expect(page.locator('#sim-draft')).toHaveValue(draft);
 await page.getByRole('button',{name:'Compare with model'}).click();
 await expect(page.locator('.sim-written-review .typed-feedback')).toBeFocused();
 await expect(page.locator('#sim-check-count')).toContainText('0 of 3');
 await page.locator('input[data-sim-point]').first().check();
 await expect(page.locator('#sim-check-count')).toContainText('1 of 3');
 await page.reload();
 await page.getByRole('button',{name:'Resume saved paper'}).click();
 await expect(page.locator('input[data-sim-point]').first()).toBeChecked();
 await expect(page.locator('#sim-check-count')).toContainText('1 of 3');
 await expect(page.locator('.sim-preserved-text')).toContainText(draft);
 await page.locator('input[data-sim-point]').nth(1).check();
 await page.locator('input[data-sim-point]').nth(2).check();
 await page.getByRole('button',{name:'Save self-review and continue →'}).click();
 expect((await saved(page)).reviewIds).toContain('eval-two-samples');
 expect((await saved(page,progressKey))?.answers||0).toBe(0);
});

test('CSV export excludes drafts by default and includes them only after opt-in',async({page})=>{
 const draft='=SUM(1,2) This draft is deliberately formula-like.';
 await seed(page,'eval-two-samples',{stage:'review',draft,included:['point-1']});
 await page.getByRole('button',{name:'Save self-review and continue →'}).click();
 await expect(page.getByRole('heading',{name:'Paper complete'})).toBeVisible();
 await expect(page.getByRole('checkbox',{name:/Include my written draft answers/})).not.toBeChecked();
 const [without]=await Promise.all([
  page.waitForEvent('download'),page.getByRole('button',{name:'Export CSV report'}).click()
 ]);
 expect(without.suggestedFilename()).toBe('sampling-arcade-exam-report.csv');
 const basic=await readFile(await without.path(),'utf8');
 expect(basic).toContain('student self-review');
 expect(basic).not.toContain('SUM(1,2)');
 expect(basic).not.toContain('Written draft');
 await page.getByRole('checkbox',{name:/Include my written draft answers/}).check();
 const [withDraft]=await Promise.all([
  page.waitForEvent('download'),page.getByRole('button',{name:'Export CSV report'}).click()
 ]);
 const included=await readFile(await withDraft.path(),'utf8');
 expect(included).toContain('Written draft');
 expect(included).toContain("'=SUM(1,2)");
 expect(included).not.toContain('Student name');
 await page.getByRole('button',{name:'Back to paper choices'}).click();
 await page.getByRole('button',{name:'View previous report'}).click();
 await expect(page.getByRole('checkbox',{name:/Include my written draft answers/})).not.toBeChecked();
});

for(const width of [320,390,1280]){
 test('Pass 6 hints, models and export layout fit '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:800});
  await seed(page,'eval-two-samples');
  await page.getByRole('button',{name:'I need a hint'}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
  await page.getByRole('button',{name:'Reveal model without writing'}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
  await page.getByRole('button',{name:'Save self-review and continue →'}).click();
  await expect(page.locator('.sim-export-settings')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
 });
}
