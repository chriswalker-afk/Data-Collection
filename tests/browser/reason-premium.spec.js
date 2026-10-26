import {test,expect} from '@playwright/test';
const progress=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('sampling-arcade-progress-v1')));
const parts=['method','reason','limitation','improvement'];
async function current(page){
 const id=await page.locator('[data-reason-id]').getAttribute('data-reason-id');
 return page.evaluate(async id=>(await(await fetch('./content/exam-reasoning.json')).json()).reasoning.find(q=>q.id===id),id);
}
async function guided(page,q,{wrongMethod=false,draft=''}={}){
 for(const key of parts){
  const value=wrongMethod&&key==='method'?q.options.method.find(x=>x!==q.answers.method):q.answers[key];
  await page.locator('input[name="reason-'+key+'"][value="'+value+'"]').check();
  await page.getByRole('button',{name:'Continue →'}).click();
 }
 if(draft)await page.locator('#reason-written').fill(draft);
 await page.getByRole('button',{name:'Review my reasoning'}).click();
}
async function independent(page,text){
 await page.getByRole('button',{name:'Write independently'}).click();
 await page.locator('#reason-written').fill(text);
 await page.getByRole('button',{name:'Compare with model'}).click();
}
test('guided reasoning reveals only one decision at a time, with no premature model answers',async({page})=>{
 await page.goto('/#/reason/sampling');const q=await current(page);
 await expect(page.locator('.reason-fact')).toHaveCount(3);
 await expect(page.locator('.reason-choice')).toHaveCount(3);
 await expect(page.locator('.reason-feedback-start')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Continue →'})).toBeDisabled();
 await page.locator('input[name="reason-method"][value="'+q.answers.method+'"]').check();
 await page.getByRole('button',{name:'Continue →'}).click();
 await expect(page.locator('input[name="reason-method"]')).toHaveCount(0);
 await expect(page.locator('input[name="reason-reason"]')).toHaveCount(3);
 await expect(page.locator('.reason-model-text')).toHaveCount(0);
 await page.getByRole('button',{name:'← Previous decision'}).click();
 await expect(page.locator('input[name="reason-method"][value="'+q.answers.method+'"]')).toBeChecked();
 await page.getByRole('button',{name:'Continue →'}).click();
 for(const key of ['reason','limitation','improvement']){
  await page.locator('input[name="reason-'+key+'"][value="'+q.answers[key]+'"]').check();
  await page.getByRole('button',{name:'Continue →'}).click();
 }
 const studentText='I would choose a method because of the frame, then explain nonresponse and follow-up.';
 await page.locator('#reason-written').fill(studentText);
 await page.getByRole('button',{name:'← Edit decisions'}).click();
 await expect(page.locator('input[name="reason-improvement"][value="'+q.answers.improvement+'"]')).toBeChecked();
 await page.getByRole('button',{name:'Continue →'}).click();
 await expect(page.locator('#reason-written')).toHaveValue(studentText);
 await page.getByRole('button',{name:'Review my reasoning'}).click();
 await expect(page.locator('.typed-feedback')).toContainText('4 of 4 model choices matched');
 await expect(page.locator('.reason-diagnosis-card')).toHaveCount(4);
 await expect(page.locator('.reason-saved-draft')).toContainText(studentText);
 expect((await progress(page)).answers).toBe(1);
});
test('wrong guided choice gets specific mathematical feedback but never mastery credit',async({page})=>{
 await page.goto('/#/reason/sampling');const q=await current(page);
 await guided(page,q,{wrongMethod:true});
 const selected=q.options.method.find(x=>x!==q.answers.method);
 await expect(page.locator('.typed-feedback')).toContainText('3 of 4 model choices matched');
 await expect(page.locator('.reason-diagnosis-card.needs-review')).toHaveCount(1);
 await expect(page.locator('.reason-diagnosis-card.needs-review')).toContainText(q.misconceptions.method[selected]);
 const state=await progress(page);
 expect(state.answers).toBe(1);
 expect(Object.values(state.concepts)[0].correct).toBe(0);
 expect(Object.values(state.concepts)[0].streak).toBe(0);
});
test('independent writing has no invented grade, and self-reflection stays unscored',async({page})=>{
 await page.goto('/#/reason/sampling');
 await page.getByRole('button',{name:'Write independently'}).click();
 await expect(page.getByRole('button',{name:'Compare with model'})).toBeDisabled();
 const message='I would use a suitable method from the available frame. I would consider nonresponse and adjust my contact strategy.';
 await page.locator('#reason-written').fill(message);
 await page.getByRole('button',{name:'Build with guidance'}).click();
 await page.getByRole('button',{name:'Write independently'}).click();
 await expect(page.locator('#reason-written')).toHaveValue(message);
 await page.getByRole('button',{name:'Compare with model'}).click();
 await expect(page.locator('.typed-feedback')).toContainText('Your written response is ready to self-review');
 await expect(page.locator('.typed-feedback')).toContainText('has not been automatically marked');
 await expect(page.locator('.reason-saved-draft')).toContainText(message);
 await expect(page.locator('.reason-diagnosis-card')).toHaveCount(0);
 await expect(page.locator('input[data-reason-self]')).toHaveCount(4);
 await page.locator('input[data-reason-self="method"]').check();
 await page.locator('input[data-reason-self="limitation"]').check();
 await expect(page.locator('#reason-self-count')).toContainText('2 of 4');
 expect((await progress(page)).answers).toBe(1);
 expect(Object.values((await progress(page)).concepts)[0].correct).toBe(0);
});
test('flagged guided misconception produces unscored review and never duplicates saved progress',async({page})=>{
 await page.goto('/#/reason/sampling');
 for(let i=0;i<3;i++){
  const q=await current(page);
  if(i===0)await guided(page,q,{wrongMethod:true});
  else await independent(page,'I choose a method considering frame, sample targets, possible bias, and a practical improvement.');
  await page.getByRole('button',{name:i===2?'Finish round →':'Next investigation →'}).click();
 }
 await expect(page.getByText('Round complete',{exact:true})).toBeVisible();
 await expect(page.locator('.reason-summary-stat')).toHaveCount(3);
 const saved=await progress(page);
 expect(saved.answers).toBe(3);expect(saved.sessions).toBe(1);
 await page.getByRole('button',{name:'Review 1 flagged investigation →'}).click();
 await expect(page.locator('.reason-workspace')).toContainText('UNSCORED');
 await independent(page,'I have revised this method choice, its contextual justification, limitation and improvement.');
 await page.getByRole('button',{name:'Finish round →'}).click();
 await expect(page.locator('.reason-round-summary')).toContainText('revisit was unscored');
 expect(await progress(page)).toEqual(saved);
});
test('reasoning round difficulty change resets the case without overwriting saved progress',async({page})=>{
 await page.goto('/#/reason/sampling');
 const initial=await current(page);expect(initial.level).toBe('foundation');
 await page.locator('#exam-level').selectOption('extend');
 const later=await current(page);
 expect(later.level).toBe('extend');
 await expect(page.locator('input[name="reason-method"]')).toHaveCount(3);
 expect(await progress(page)).toBe(null);
});
test('native keyboard radios, focus and mobile layouts remain navigable at five widths',async({page})=>{
 for(const width of [320,390,768,1024,1280]){
  await page.setViewportSize({width,height:900});await page.goto('/#/reason/sampling');await page.reload();
  const q=await current(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
  const choice=page.locator('input[name="reason-method"]').first();await choice.focus();await page.keyboard.press('Space');
  await expect(choice).toBeChecked();
  await expect(page.getByRole('button',{name:'Continue →'})).toBeEnabled();
  await page.locator('input[name="reason-method"][value="'+q.answers.method+'"]').check();
  await page.getByRole('button',{name:'Continue →'}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
  await page.getByRole('button',{name:'Write independently'}).click();
  await page.locator('#reason-written').fill('I can explain the selection and limitation clearly.');
  await page.getByRole('button',{name:'Compare with model'}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
 }
});
