import {test,expect} from '@playwright/test';
import {DEPENDENCIES} from '../../src/exam.js';

const progressKey='sampling-arcade-progress-v1';
async function open(page,method='simple-random'){
 await page.goto('/#/build/sampling');
 await expect(page.locator('.build-workspace')).toBeVisible();
 if(method!=='simple-random')await page.locator('#build-method').selectOption(method);
 await expect(page.locator('[data-method-id="'+method+'"]')).toBeVisible();
}
const stored=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),progressKey);
const order=page=>page.locator('.build-step-list [data-step-id]').evaluateAll(
 nodes=>nodes.map(node=>node.dataset.stepId));
const methods=page=>page.evaluate(async()=>{
 const res=await fetch('./content/methods.json');return(await res.json()).methods;
});
async function arrange(page,ids){
 for(let i=0;i<ids.length;i++){
  let current=await order(page);
  let at=current.indexOf(ids[i]);
  expect(at,'step '+ids[i]+' must exist').toBeGreaterThanOrEqual(0);
  while(at>i){
   await page.locator('.exam-step[data-step-id="'+ids[i]+'"] .exam-arrow[data-dir="-1"]').click();
   at--;
  }
 }
 await expect.poll(()=>order(page)).toEqual(ids);
}

test('premium procedure workshop keeps the five-method selector and clear native accessible controls',async({page})=>{
 await open(page);
 await expect(page.locator('#build-method option')).toHaveCount(5);
 await expect(page.locator('.build-context')).toContainText('Each possible sample');
 await expect(page.locator('.build-method-family')).toContainText('Random selection');
 await expect(page.locator('.build-step')).toHaveCount(5);
 await expect(page.locator('.build-grip')).toHaveCount(5);
 await expect(page.locator('.exam-arrow')).toHaveCount(10);
 await expect(page.locator('.build-step-copy')).toHaveCount(5);
 await expect(page.locator('.build-instructions')).toContainText('Drag a step');
 await expect(page.locator('.build-analysis')).toHaveCount(0);
 await expect(page.locator('.build-step-why')).toHaveCount(0);
 expect(await stored(page)).toBeNull();
});
test('mouse dragging really moves a step to the selected row without recording an answer',async({page})=>{
 await page.setViewportSize({width:1440,height:1800});
 await open(page);
 const before=await order(page);
 const grip=page.locator('[data-step-id="'+before[0]+'"] .build-grip');
 const target=page.locator('[data-step-id="'+before[before.length-1]+'"]');
 const start=await grip.boundingBox(),finish=await target.boundingBox();
 expect(start).toBeTruthy();expect(finish).toBeTruthy();
 await page.mouse.move(start.x+start.width/2,start.y+start.height/2);
 await page.mouse.down();
 await page.mouse.move(finish.x+Math.min(65,finish.width/3),finish.y+finish.height/2,{steps:11});
 await page.mouse.up();
 const next=await order(page);
 expect(next).toEqual([...before.slice(1),before[0]]);
 await expect(page.locator('.build-grip')).toHaveCount(5);
 expect(await stored(page)).toBeNull();
});
test('touch handle drag supports an alternative to scrolling and arrow clicks',async({page})=>{
 await page.setViewportSize({width:390,height:850});
 await open(page);
 const before=await order(page);
 // Dispatch genuine PointerEvent objects with pointerType=touch. On real touch
 // hardware pointer capture is provided by the browser; the same event flow is used.
 await page.evaluate(ids=>{
  const grip=document.querySelector('[data-step-id="'+ids[0]+'"] .build-grip');
  const target=document.querySelector('[data-step-id="'+ids[1]+'"]');
  const a=grip.getBoundingClientRect(),b=target.getBoundingClientRect();
  const start={clientX:a.x+a.width/2,clientY:a.y+a.height/2};
  const end={clientX:b.x+b.width/2,clientY:b.y+b.height/2};
  grip.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerId:111,pointerType:'touch',...start}));
  grip.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,button:0,pointerId:111,pointerType:'touch',...end}));
  grip.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,button:0,pointerId:111,pointerType:'touch',...end}));
 },before);
 await expect.poll(()=>order(page)).toEqual([before[1],before[0],...before.slice(2)]);
 expect(await stored(page)).toBeNull();
});
test('keyboard arrows work after enhancements and the mathematically valid order receives first-check credit',async({page})=>{
 await open(page);
 const m=(await methods(page))[0];
 await arrange(page,m.procedure.map(x=>x.id));
 const arrow=page.locator('.build-step-list [data-step-id="'+m.procedure[0].id+'"] [data-dir="1"]');
 await arrow.focus();await page.keyboard.press('Enter');
 await expect.poll(()=>order(page)).not.toEqual(m.procedure.map(x=>x.id));
 await page.locator('[data-step-id="'+m.procedure[0].id+'"] [data-dir="-1"]').focus();
 await page.keyboard.press('Enter');
 await expect.poll(()=>order(page)).toEqual(m.procedure.map(x=>x.id));
 expect(await stored(page)).toBeNull();
 await page.getByRole('button',{name:'Check procedure'}).click();
 await expect(page.locator('.typed-feedback')).toBeFocused();
 await expect(page.locator('.build-analysis-title')).toContainText('All required dependencies');
 await expect(page.locator('.build-analysis-count')).toContainText('4 / 4');
 await expect(page.locator('.build-step-why')).toHaveCount(5);
 const why=page.locator('.build-step-why').first();
 await why.locator('summary').click();
 await expect(why).toHaveAttribute('open','');
 await expect(why).toContainText('A complete list');
 await expect(page.locator('.build-worked-example')).toBeVisible();
 const before=await stored(page);
 expect(before.answers).toBe(1);expect(before.concepts[m.conceptId].correct).toBe(1);
 await expect(page.locator('.build-grip')).toHaveCount(0);
 await expect(page.locator('.exam-arrow:not(:disabled)')).toHaveCount(0);
});
test('opportunity sampling accepts a genuinely different valid order of independent preliminaries',async({page})=>{
 await open(page,'opportunity');
 await arrange(page,['available','criteria','recruit']);
 await page.getByRole('button',{name:'Check procedure'}).click();
 await expect(page.locator('.typed-feedback')).toContainText('Valid procedure');
 await expect(page.locator('.build-analysis-title')).toContainText('A different order');
 await expect(page.locator('.build-analysis-description')).toContainText('More than one sequence');
 const p=await stored(page);expect(p.answers).toBe(1);expect(p.concepts['opportunity-sampling'].correct).toBe(1);
});
test('wrong prerequisites are explained precisely and a corrected practice order never changes saved credit',async({page})=>{
 await open(page);
 await arrange(page,['number','frame','generate','repeats','select']);
 await page.getByRole('button',{name:'Check procedure'}).click();
 await expect(page.locator('.typed-feedback')).toHaveClass(/incorrect/);
 await expect(page.locator('.build-analysis-title')).toContainText('1 ordering dependency');
 await expect(page.locator('.build-unmet-item')).toHaveCount(1);
 await expect(page.locator('.build-unmet-item')).toContainText('Define the frame');
 await expect(page.locator('.build-unmet-item')).toContainText('Number each unit');
 await expect(page.locator('.build-step.build-needs-review')).toHaveCount(2);
 const first=await stored(page);expect(first.answers).toBe(1);
 expect(first.concepts['simple-random-sampling'].correct).toBe(0);
 await page.locator('.build-correction-toggle').click();
 await expect(page.locator('.build-correction-list .build-correction-step')).toHaveCount(5);
 const step=page.locator('[data-build-practice-step="frame"]');
 await step.locator('[data-build-practice-move="-1"]').click();
 await page.locator('.build-practice-check').click();
 await expect(page.locator('.build-practice-result')).toContainText('Valid sequence');
 await expect(page.locator('.build-practice-result')).toContainText('unscored');
 const after=await stored(page);
 expect(after.answers).toBe(1);expect(after.concepts['simple-random-sampling'].correct).toBe(0);
});
test('reveal model explains all steps and conditional edge cases without false mastery',async({page})=>{
 await open(page);
 await page.getByRole('button',{name:'Reveal model'}).click();
 await expect(page.locator('.build-analysis-title')).toContainText('Model revealed');
 await expect(page.locator('.build-analysis-description')).toContainText('does not count');
 await expect(page.locator('.build-step-why')).toHaveCount(5);
 await expect(page.locator('.exam-warning')).toContainText('Do not automatically add');
 await expect(page.locator('.build-worked-example')).toBeVisible();
 await expect(page.locator('.build-correction-toggle')).toContainText('unscored');
 const p=await stored(page);expect(p.answers).toBe(1);expect(p.concepts['simple-random-sampling'].correct).toBe(0);
});
test('all five procedures produce a clear method-by-method first-check summary',async({page})=>{
 await open(page);
 const all=await methods(page);
 for(let i=0;i<all.length;i++){
  await expect(page.locator('[data-method-id="'+all[i].id+'"]')).toBeVisible();
  await page.getByRole('button',{name:'Reveal model'}).click();
  await expect(page.locator('.build-analysis-title')).toContainText('Model revealed');
  await page.getByRole('button',{name:i===4?'Finish round →':'Next method →'}).click();
 }
 await expect(page.getByText('Round complete',{exact:true})).toBeVisible();
 await expect(page.locator('.build-summary-item')).toHaveCount(5);
 await expect(page.locator('.build-summary-item.is-revealed')).toHaveCount(5);
 await expect(page.locator('.build-summary-subtitle')).toContainText('Revealed models do not earn');
 const p=await stored(page);expect(p.answers).toBe(5);expect(p.sessions).toBe(1);
 for(const m of all)expect(p.concepts[m.conceptId].correct).toBe(0);
 await page.getByRole('button',{name:/Play another round/}).click();
 await expect(page.locator('.build-analysis')).toHaveCount(0);
 await expect(page.locator('.build-step-list .build-grip')).toHaveCount(5);
});
for(const width of [320,390,768,1024,1280]){
 test('Build the Method fits '+width+'px before and after feedback with no horizontal scrolling',async({page})=>{
  await page.setViewportSize({width,height:width<=390?780:860});
  await open(page);
  const dimensions=()=>page.evaluate(()=>({client:document.documentElement.clientWidth,
   scroll:document.documentElement.scrollWidth}));
  let dim=await dimensions();expect(dim.scroll).toBeLessThanOrEqual(dim.client+1);
  await expect(page.locator('.build-grip').first()).toBeVisible();
  await page.getByRole('button',{name:'Reveal model'}).click();
  await expect(page.locator('.build-analysis')).toBeVisible();
  dim=await dimensions();expect(dim.scroll).toBeLessThanOrEqual(dim.client+1);
  await page.locator('.build-correction-toggle').click();
  dim=await dimensions();expect(dim.scroll).toBeLessThanOrEqual(dim.client+1);
 });
}
test('reduced motion disables decorative step transitions',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await open(page);
 await expect(page.locator('.build-step').first()).toHaveCSS('transition-duration','0s');
 await page.getByRole('button',{name:'Check procedure'}).click();
 await expect(page.locator('.build-analysis')).toBeVisible();
});
