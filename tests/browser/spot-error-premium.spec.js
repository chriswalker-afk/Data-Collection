import {test,expect} from '@playwright/test';
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('sampling-arcade-progress-v1')));
async function current(page){
 const id=await page.locator('[data-error-id]').getAttribute('data-error-id');
 return page.evaluate(async id=>(await(await fetch('./content/exam-errors.json')).json()).errors.find(q=>q.id===id),id);
}
test('all three skills are required and feedback reveals mathematical consequence only after check',async({page})=>{
 await page.goto('/#/error/sampling');const q=await current(page);
 await expect(page.getByRole('button',{name:'Check all three decisions'})).toBeDisabled();
 await page.locator('input[name="error-line"][value="'+q.errorLine+'"]').check();
 await page.locator('input[name="error-repair"][value="'+q.repair+'"]').check();
 await expect(page.getByRole('button',{name:'Check all three decisions'})).toBeDisabled();
 await expect(page.locator('.error-analysis')).toHaveCount(0);
 await page.locator('input[name="error-impact"][value="'+q.impact.answer+'"]').check();
 await page.getByRole('button',{name:'Check all three decisions'}).click();
 await expect(page.locator('.error-analysis')).toContainText('All three decisions correct');
 expect((await saved(page)).answers).toBe(1);
 await expect(page.locator('input[data-error-impact]:not(:disabled)')).toHaveCount(0);
});
test('missed consequences record no mastery; review grants no additional answers or sessions',async({page})=>{
 await page.goto('/#/error/sampling');
 for(let i=0;i<5;i++){
  const q=await current(page);
  await page.locator('input[name="error-line"][value="'+q.errorLine+'"]').check();
  await page.locator('input[name="error-repair"][value="'+q.repair+'"]').check();
  const wrong=q.impact.options.find(x=>x.id!==q.impact.answer).id;
  await page.locator('input[name="error-impact"][value="'+wrong+'"]').check();
  await page.getByRole('button',{name:'Check all three decisions'}).click();
  await expect(page.locator('.error-analysis')).toContainText('Consequence');
  await page.getByRole('button',{name:i===4?'Finish round →':'Next case →'}).click();
 }
 const original=await saved(page);
 expect(original.answers).toBe(5);
 await page.getByRole('button',{name:'Review missed cases →'}).click();
 for(let i=0;i<5;i++){
  const q=await current(page);
  await page.locator('input[name="error-line"][value="'+q.errorLine+'"]').check();
  await page.locator('input[name="error-repair"][value="'+q.repair+'"]').check();
  await page.locator('input[name="error-impact"][value="'+q.impact.answer+'"]').check();
  await page.getByRole('button',{name:'Check all three decisions'}).click();
  await page.getByRole('button',{name:i===4?'Finish round →':'Next case →'}).click();
 }
 const reviewed=await saved(page);
 expect(reviewed).toEqual(original);
 await expect(page.locator('.error-note')).toContainText('Unscored practice');
});
for(const width of [320,390,768,1024,1280])test('case file stays readable at '+width+'px and works with keyboard',async({page})=>{
 await page.setViewportSize({width,height:780});await page.goto('/#/error/sampling');
 await expect(page.locator('.error-step')).toHaveCount(3);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
 const first=page.locator('input[name="error-line"]').first();await first.focus();await page.keyboard.press('Space');
 await expect(first).toBeChecked();
 const q=await current(page);
 await page.locator('input[name="error-repair"][value="'+q.repair+'"]').check();
 await page.locator('input[name="error-impact"][value="'+q.impact.answer+'"]').check();
 await page.getByRole('button',{name:'Check all three decisions'}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
});
