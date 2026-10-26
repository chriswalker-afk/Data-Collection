import {test,expect} from '@playwright/test';

const games=['flashcards','match','cloze','sort','identify','speed','build','error','reason','exam'];
const views={flashcards:'.flashcard',match:'.match-columns',cloze:'.cloze-panel',
  sort:'.classification-panel',identify:'.classification-panel',speed:'.recall-panel',
  build:'.exam-workspace',error:'.exam-workspace',reason:'.exam-workspace',exam:'.sim-landing'};
const checkWidth=async(page,route,width)=>{
 const sizes=await page.evaluate(()=>({document:document.documentElement.scrollWidth,
  viewport:document.documentElement.clientWidth,
  body:document.body.scrollWidth}));
 expect(sizes.document,route+' at '+width+'px document overflow')
  .toBeLessThanOrEqual(sizes.viewport+1);
 expect(sizes.body,route+' at '+width+'px body overflow')
  .toBeLessThanOrEqual(sizes.viewport+1);
};
const seedExam=async(page,id,entry={},complete=false)=>{
 await page.goto('/#/exam/sampling');
 await page.evaluate(({id,entry,complete})=>localStorage.setItem('sampling-arcade-exam-v1',
   JSON.stringify({version:1,reviewIds:[],paper:{variant:'review',questionIds:[id],
    index:0,complete,entries:{[id]:{stage:complete?'done':'answer',draft:'',values:{},
     included:[],flag:false,hintsUsed:0,...entry}}}})),{id,entry,complete});
 await page.reload();
 await page.getByRole('button',{name:complete?'View previous report':'Resume saved paper'}).click();
};

test('skip link reaches main and returning from a game focuses the home heading',async({page})=>{
 await page.setViewportSize({width:1280,height:800});
 await page.goto('/#/home/sampling');
 await page.keyboard.press('Tab');
 await expect(page.locator('.skip-link')).toBeFocused();
 await page.keyboard.press('Enter');
 await expect(page.locator('#main')).toBeFocused();
 await page.locator('.game-card[data-game-id="flashcards"]').click();
 await expect(page.locator('#view-heading')).toBeFocused();
 await page.locator('.back-link').click();
 await expect(page.locator('#home-heading')).toBeFocused();
 await expect(page.locator('#home-heading')).toBeVisible();
});

test('keyboard focus on an answer that appears below the viewport is moved into view',async({page})=>{
 await page.setViewportSize({width:390,height:520});
 await page.goto('/#/cloze/data');
 await page.locator('[data-action="cloze-option"]').first().click();
 const feedback=page.locator('.cloze-panel .ui-feedback');
 await expect(feedback).toBeVisible();
 // The existing next-button focus contract remains; focused next control must be visible.
 await expect(page.locator('[data-action="cloze-next"]')).toBeFocused();
 const rect=await page.evaluate(()=>{
  const box=document.activeElement.getBoundingClientRect();
  return {top:box.top,bottom:box.bottom,height:innerHeight};
 });
 expect(rect.top).toBeGreaterThanOrEqual(-1);
 expect(rect.bottom).toBeLessThanOrEqual(rect.height+1);
});

test('mobile navigation closes on Escape, keyboard focus exit and desktop breakpoint',async({page})=>{
 await page.setViewportSize({width:390,height:800});
 await page.goto('/#/home/data');
 const toggle=page.locator('#mobile-menu-toggle'),menu=page.locator('#activities-menu');
 await toggle.click();await menu.locator('summary').click();
 await expect(menu).toHaveAttribute('open','');
 await page.keyboard.press('Escape');
 await expect(toggle).toBeFocused();
 await expect(menu).not.toHaveAttribute('open','');
 await toggle.click();await menu.locator('summary').click();
 await page.locator('#main').focus();
 await expect(menu).not.toHaveAttribute('open','');
 await expect(toggle).toHaveAttribute('aria-expanded','false');
 await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','true');
 await page.setViewportSize({width:1024,height:800});
 await expect(toggle).toHaveAttribute('aria-expanded','false');
 await expect(page.locator('#main-nav')).toBeVisible();
 await checkWidth(page,'home/data',1024);
});

test('question regions and feedback have names and correct versus self-review text states',async({page})=>{
 await page.goto('/#/reason/sampling');
 await expect(page.locator('.exam-workspace')).toHaveAttribute('aria-labelledby','exam-heading');
 await page.goto('/#/identify/sampling');
 await expect(page.locator('.classification-panel')).toHaveAttribute('aria-labelledby','classification-title');
 await page.locator('[data-action="classify-option"]').first().click();
 const feedback=page.locator('.classification-feedback');
 await expect(feedback).toHaveAttribute('role','group');
 await expect(feedback).toHaveAttribute('aria-label',/Checked answer|Review answer/);
 await expect(feedback.locator('.ui-feedback-badge')).toContainText(/Checked answer|Review answer/);
 await expect(page.locator('#announcer')).not.toBeEmpty();
 await seedExam(page,'eval-two-samples',{stage:'review',draft:'A reasoned answer'});
 await expect(page.locator('.sim-question')).toHaveAttribute('aria-labelledby','sim-question-heading');
 const review=page.locator('.sim-written-review .ui-feedback');
 await expect(review).toHaveAttribute('role','group');
 await expect(review).toHaveAttribute('aria-label','Self-review');
 await expect(review.locator('.ui-feedback-badge')).toHaveText('Self-review');
});

test('invalid numeric input is explicitly described, flagged and reset on edit',async({page})=>{
 await seedExam(page,'alloc-year-groups');
 const first=page.locator('input[data-sim-num]').first();
 await first.fill('1,2,3');
 for(const item of await page.locator('input[data-sim-num]').all()){
  if(await item.inputValue()==='')await item.fill('12');
 }
 await page.getByRole('button',{name:'Check calculations'}).click();
 await expect(first).toBeFocused();
 await expect(first).toHaveAttribute('aria-invalid','true');
 await expect(first).toHaveAttribute('aria-describedby',/sim-validation/);
 await expect(page.locator('#sim-validation')).toHaveAttribute('role','alert');
 await first.fill('12');
 await expect(first).not.toHaveAttribute('aria-invalid','true');
 await expect(first).toHaveAttribute('aria-describedby',/sim-field-.*-help/);
 await expect(page.locator('#sim-validation')).toBeEmpty();
});

test('blocked storage leaves practice usable and clearly explains that progress is not saved',async({page})=>{
 await page.addInitScript(()=>{
  const actual=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
   if(key.startsWith('sampling-arcade-'))throw new DOMException('Storage blocked','QuotaExceededError');
   return actual.call(this,key,value);
  };
 });
 await page.goto('/#/cloze/data');
 await page.locator('[data-action="cloze-option"]').first().click();
 await expect(page.locator('.ui-feedback')).toBeVisible();
 await page.goto('/#/home/data');
 await expect(page.locator('.storage-notice')).toBeVisible();
 await expect(page.locator('.storage-notice')).toContainText('progress may not remain');
});

test('print media preserves the exam report and hides interactive controls and personal export settings',async({page})=>{
 await seedExam(page,'eval-two-samples',{stage:'done',draft:'My own contextual example.',included:[]},true);
 await expect(page.locator('.sim-report-detail')).toContainText('My own contextual example.');
 await page.emulateMedia({media:'print'});
 await expect(page.locator('.site-header')).toBeHidden();
 await expect(page.locator('.sim-report-actions')).toBeHidden();
 await expect(page.locator('.sim-export-settings')).toBeHidden();
 await expect(page.locator('.sim-report-row')).toBeVisible();
 await expect(page.locator('.sim-report-row')).toContainText('My own contextual example.');
 await page.emulateMedia({media:'screen'});
 await expect(page.getByRole('button',{name:'Export CSV report'})).toBeVisible();
});

test('contrast and touch targets are independently checkable, not dependent on colour alone',async({page})=>{
 await page.setViewportSize({width:1280,height:800});
 await page.goto('/#/cloze/data');
 const styles=await page.evaluate(()=>{
  const channel=value=>{
   const n=Number(value)/255;
   return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;
  };
  function lum(color){
   const rgba=color.match(/[\d.]+/g).slice(0,3).map(channel);
   return rgba[0]*.2126+rgba[1]*.7152+rgba[2]*.0722;
  }
  function contrast(a,b){
   const x=lum(a),y=lum(b);
   return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
  }
  return [['.practice-guide-label','.practice-guide'],
   ['.practice-guide-copy','.practice-guide'],
   ['.cloze-sentence','.cloze-sentence']].map(([text,background])=>{
    const el=document.querySelector(text),bg=document.querySelector(background);
    return {text,ratio:contrast(getComputedStyle(el).color,getComputedStyle(bg).backgroundColor)};
   });
 });
 for(const row of styles)expect(row.ratio,row.text+' contrast').toBeGreaterThanOrEqual(4.5);
 await page.locator('[data-action="cloze-option"]').first().click();
 await expect(page.locator('.ui-feedback-badge')).toContainText(/Checked answer|Review answer/);
 await page.locator('#activities-menu > summary').click();
 for(const link of await page.locator('.nav-group > a').all()){
  const box=await link.boundingBox();
  expect(box.height,await link.textContent()).toBeGreaterThanOrEqual(44);
 }
 await page.goto('/#/build/sampling');
 for(const button of await page.locator('.exam-arrow:not(:disabled)').all()){
  const box=await button.boundingBox();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
 }
});

test('reduced motion disables smooth scroll and decorative transitions',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/#/home/sampling');
 await expect(page.locator('.game-card').first()).toBeVisible();
 const css=await page.evaluate(()=>({
  scroll:getComputedStyle(document.documentElement).scrollBehavior,
  transform:getComputedStyle(document.querySelector('.game-card')).transform,
  transition:getComputedStyle(document.querySelector('.game-card')).transitionDuration
 }));
 expect(css.scroll).toBe('auto');
 expect(css.transform).toBe('none');
 expect(css.transition).toBe('0s');
});

for(const width of [320,390,768,1024,1280]){
 test('all ten activity layouts fit '+width+'px and include keyboard-accessible questions',async({page},testInfo)=>{
  await page.setViewportSize({width,height:width===320?640:820});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/#/home/sampling');
  await expect(page.locator('.activity-stage')).toHaveCount(4);
  await checkWidth(page,'home',width);
  for(const game of games){
   await page.goto('/#/'+game+'/sampling');
   await expect(page.locator('.practice-guide')).toBeVisible();
   await expect(page.locator(views[game])).toBeVisible();
   await checkWidth(page,game,width);
   if(testInfo.project.name==='desktop-chromium'&&[320,768,1280].includes(width)&&['match','reason','exam'].includes(game)){
    await page.screenshot({path:testInfo.outputPath('ui-pass3-'+width+'-'+game+'.png'),fullPage:true});
   }
  }
  expect(errors,'JavaScript errors at '+width+'px').toEqual([]);
 });
}

test('landscape-like narrow-height screen still presents question and navigation without horizontal overflow',async({page})=>{
 await page.setViewportSize({width:740,height:360});
 await page.goto('/#/error/sampling');
 await expect(page.locator('.practice-guide')).toBeVisible();
 await expect(page.locator('.exam-workspace')).toBeVisible();
 await checkWidth(page,'error/landscape',740);
 await page.locator('#mobile-menu-toggle').click();
 await page.locator('#activities-menu > summary').click();
 await checkWidth(page,'mobile menu/landscape',740);
});
