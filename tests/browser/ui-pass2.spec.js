import {test,expect} from '@playwright/test';

const routes=['flashcards','match','cloze','sort','identify','speed','build','error','reason','exam'];
async function checkGuide(page,id){
 const guide=page.locator('.practice-guide');
 await expect(guide).toBeVisible();
 await expect(guide.locator('.practice-guide-label')).toHaveText(['PRACTISING','WHAT TO DO']);
 await expect(guide.locator('.practice-guide-copy')).toHaveCount(2);
 await expect(guide.locator('.practice-guide-copy').first()).not.toBeEmpty();
 await expect(guide.locator('.practice-guide-copy').last()).not.toBeEmpty();
 if(id==='exam'){
  await expect(page.locator('.sim-landing')).toBeVisible();
 }else if(id==='match'){
  await expect(page.locator('.question-preamble')).toContainText('QUESTION');
 }else if(id==='flashcards'){
  await expect(page.locator('.flash-overline')).toContainText('QUESTION');
 }else{
  const panel=page.locator('.cloze-panel,.classification-panel,.recall-panel,.exam-workspace').first();
  await expect(panel).toBeVisible();
  await expect(panel.locator('.eyebrow')).toContainText('QUESTION');
 }
}

test('all ten activities share a purpose/task/question journey without modifying their routes',async({page})=>{
 await page.setViewportSize({width:1280,height:840});
 for(const id of routes){
  await page.goto('/#/'+id+'/sampling');
  await expect(page.locator('.activity-title')).toBeVisible();
  await checkGuide(page,id);
 }
 await expect(page.locator('link[href="./styles/activity-ui.css"]')).toHaveCount(1);
});

test('selecting help level changes the visible instructions, not the student's progress',async({page})=>{
 await page.goto('/#/cloze/data');
 await expect(page.locator('.practice-guide')).toContainText('Choose the word');
 await page.locator('#cloze-level').selectOption('guided');
 await expect(page.locator('.practice-guide')).toContainText('hinted answer is practice, not mastery');
 await page.locator('#cloze-level').selectOption('independent');
 await expect(page.locator('.practice-guide')).toContainText('without a word bank');
 expect(await page.evaluate(()=>localStorage.getItem('sampling-arcade-progress-v1'))).toBeNull();
 await page.goto('/#/flashcards/data');
 await expect(page.locator('.practice-guide')).toContainText('full answer before revealing');
 await page.getByRole('button',{name:/Term → definition/}).click();
 await expect(page.locator('.practice-guide')).toContainText('Name the mathematical term');
});

test('checked answer feedback shares status, useful explanation and visible focus',async({page})=>{
 await page.goto('/#/cloze/data');
 const id=await page.locator('[data-question-id]').getAttribute('data-question-id');
 const item=await page.evaluate(async id=>(await(await fetch('./content/cloze.json')).json()).cloze.find(q=>q.id===id),id);
 const wrong=item.choices.find(x=>x!==item.answer);
 await page.getByRole('button',{name:wrong,exact:true}).click();
 const feedback=page.locator('.cloze-panel .ui-feedback');
 await expect(feedback).toHaveClass(/incorrect/);
 await expect(feedback).toHaveAttribute('tabindex','-1');
 await expect(feedback.locator('.ui-feedback-badge')).toHaveText('Review answer');
 await expect(feedback).toContainText(item.explanation);
 const background=await feedback.evaluate(el=>getComputedStyle(el).backgroundColor);
 expect(background).not.toBe('rgb(255, 255, 255)');
 await page.getByRole('button',{name:/Next question/}).click();
});

test('written reasoning stays visually labelled as self-review even with all four model choices correct',async({page})=>{
 await page.goto('/#/reason/sampling');
 const id=await page.locator('[data-reason-id]').getAttribute('data-reason-id');
 const q=await page.evaluate(async id=>(await(await fetch('./content/exam-reasoning.json')).json()).reasoning.find(q=>q.id===id),id);
 await page.locator('#reason-written').fill('My own contextual explanation.');
 for(const key of ['method','reason','limitation','improvement'])
  await page.locator('input[name="reason-'+key+'"][value="'+q.answers[key]+'"]').check();
 await page.getByRole('button',{name:'Review my reasoning'}).click();
 const feedback=page.locator('.exam-workspace .ui-feedback');
 await expect(feedback).toHaveClass(/review/);
 await expect(feedback).not.toHaveClass(/\bcorrect\b/);
 await expect(feedback.locator('.ui-feedback-badge')).toHaveText('Self-review');
 await expect(feedback).toContainText('not an official Edexcel mark scheme');
 await expect(page.locator('.exam-draft')).toContainText('My own contextual explanation.');
 const progress=await page.evaluate(()=>JSON.parse(localStorage.getItem('sampling-arcade-progress-v1')));
 expect(progress.version).toBe(1);
});

test('Exam Lab numerical and written question views share wording without losing the honest marking distinction',async({page})=>{
 await page.goto('/#/exam/sampling');
 await expect(page.locator('.practice-guide')).toContainText('Combine sampling calculations');
 await page.evaluate(()=>{
  localStorage.setItem('sampling-arcade-exam-v1',JSON.stringify({version:1,reviewIds:[],paper:{
   variant:'review',questionIds:['eval-two-samples'],index:0,complete:false,
   entries:{'eval-two-samples':{stage:'answer',draft:'My own words',included:[],flag:false,hintsUsed:0,values:{}}}
  }}));
 });
 await page.reload();
 await page.getByRole('button',{name:'Resume saved paper'}).click();
 await expect(page.locator('.practice-guide')).toContainText('not automatically marked');
 await expect(page.locator('.sim-question>.eyebrow')).toContainText('QUESTION');
 await page.getByRole('button',{name:'Compare with model'}).click();
 const feedback=page.locator('.sim-written-review .ui-feedback');
 await expect(feedback).toHaveClass(/review/);
 await expect(feedback).toContainText('not marks from Pearson');
 await expect(page.locator('#sim-draft')).toHaveCount(0);
 await expect(page.locator('.sim-preserved-text')).toContainText('My own words');
});

for(const width of [320,390,768,1280]){
 test('shared activity layout stays usable at '+width+'px in selected activities',async({page})=>{
  await page.setViewportSize({width,height:790});
  for(const id of ['flashcards','match','cloze','identify','build','reason','exam']){
   await page.goto('/#/'+id+'/sampling');
   await expect(page.locator('.practice-guide')).toBeVisible();
   const sizes=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,
     clientWidth:document.documentElement.clientWidth}));
   expect(sizes.scrollWidth,id+' at '+width).toBeLessThanOrEqual(sizes.clientWidth+1);
  }
 });
}
