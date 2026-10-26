import {test,expect} from '@playwright/test';

const groups=[
  ['recall',['flashcards','match','cloze','speed']],
  ['apply',['sort','identify']],
  ['explain',['build','error','reason']],
  ['exam',['exam']]
];
async function bodyFitsViewport(page,width){
 const measurements=await page.evaluate(()=>({
   scrollWidth:document.documentElement.scrollWidth,
   clientWidth:document.documentElement.clientWidth,
   headerWidth:document.querySelector('.site-header').scrollWidth
 }));
 expect(measurements.scrollWidth,'Document should not scroll horizontally at '+width+'px')
   .toBeLessThanOrEqual(width+1);
 expect(measurements.headerWidth,'Header should not scroll horizontally at '+width+'px')
   .toBeLessThanOrEqual(width+1);
}

test('compact desktop header exposes primary routes and every game through three grouped menus',async({page})=>{
 await page.setViewportSize({width:1280,height:830});
 await page.goto('/#/home/sampling');
 await expect(page.locator('.site-nav')).toBeVisible();
 await expect(page.locator('.mobile-menu-toggle')).toBeHidden();
 await expect(page.locator('.site-nav > a')).toHaveCount(3);
 await expect(page.locator('#activities-menu > summary')).toContainText('Activities');
 await expect(page.locator('#activities-menu')).not.toHaveAttribute('open','');
 await page.locator('#activities-menu > summary').click();
 await expect(page.locator('#activities-menu')).toHaveAttribute('open','');
 await expect(page.locator('.nav-group')).toHaveCount(3);
 await expect(page.locator('.nav-group > a')).toHaveCount(9);
 for(const game of groups.slice(0,3).flatMap(x=>x[1]))
  await expect(page.locator('.nav-group > a[data-nav="'+game+'"]')).toBeVisible();
 await bodyFitsViewport(page,1280);
 const navigation=await page.locator('.site-nav').evaluate(el=>({width:el.clientWidth,scrollWidth:el.scrollWidth}));
 // No horizontal header scrolling. The dropdown is allowed to extend beyond its compact nav.
 await expect(page.locator('.site-header')).toHaveCSS('overflow-x','visible');
 expect(navigation.width).toBeGreaterThan(200);
});

test('activity dropdown closes on Escape, outside click and route selection; active section remains clear',async({page})=>{
 await page.setViewportSize({width:1280,height:830});
 await page.goto('/#/home/sampling');
 const menu=page.locator('#activities-menu'),summary=menu.locator('summary');
 await summary.focus();
 await page.keyboard.press('Enter');
 await expect(menu).toHaveAttribute('open','');
 await page.keyboard.press('Escape');
 await expect(menu).not.toHaveAttribute('open','');
 await expect(summary).toBeFocused();
 await summary.click();
 await page.locator('.hero-title').click();
 await expect(menu).not.toHaveAttribute('open','');
 await summary.click();
 await page.locator('.nav-group > a[data-nav="error"]').click();
 await expect(page).toHaveURL(/#\/error\/sampling$/);
 await expect(menu).not.toHaveAttribute('open','');
 await expect(menu).toHaveClass(/is-current/);
 await summary.click();
 await expect(page.locator('.nav-group > a[data-nav="error"]')).toHaveAttribute('aria-current','page');
 await page.locator('.site-nav > a[data-nav="exam"]').click();
 await expect(menu).not.toHaveClass(/is-current/);
 await expect(page).toHaveURL(/#\/exam\/sampling$/);
});

test('homepage has ten distinct, high-contrast cards in four meaningful learning stages',async({page})=>{
 await page.setViewportSize({width:1280,height:830});
 await page.goto('/#/home/sampling');
 await expect(page.locator('.activity-stage')).toHaveCount(4);
 await expect(page.locator('.game-card')).toHaveCount(10);
 for(const [stage,ids] of groups){
  const section=page.locator('.activity-stage-'+stage);
  await expect(section.locator('.game-card')).toHaveCount(ids.length);
  for(const id of ids)
   await expect(section.locator('.game-card[data-game-id="'+id+'"]')).toHaveAttribute('href',new RegExp('#/'+id+'/sampling$'));
 }
 const contrast=await page.locator('.activity-stage').evaluateAll(stages=>stages.map(stage=>{
  const card=stage.querySelector('.game-card');
  return {stage:getComputedStyle(stage).backgroundColor,card:getComputedStyle(card).backgroundColor,
    border:getComputedStyle(card).borderTopWidth,shadow:getComputedStyle(card).boxShadow};
 }));
 expect(new Set(contrast.map(x=>x.stage)).size).toBe(4);
 for(const item of contrast){
  expect(item.card).not.toBe(item.stage);
  expect(item.border).toBe('1px');
  expect(item.shadow).not.toBe('none');
 }
 const heroHeight=await page.locator('.hero').evaluate(el=>el.getBoundingClientRect().height);
 expect(heroHeight).toBeLessThan(335);
 await expect(page.locator('.learning-journey')).toBeVisible();
 await expect(page.locator('.progress-panel')).toHaveCount(1);
});

test('data topic labels the sampling-only stages and every card still opens its existing route',async({page})=>{
 await page.setViewportSize({width:1280,height:830});
 await page.goto('/#/home/data');
 await expect(page.locator('.activity-stage-recall .game-card')).toHaveCount(4);
 await expect(page.locator('.activity-stage-apply .stage-scope')).toContainText('switches to Sampling');
 await expect(page.locator('.activity-stage-explain .stage-scope')).toContainText('switches to Sampling');
 await page.locator('.activity-stage-apply .game-card[data-game-id="identify"]').click();
 await expect(page).toHaveURL(/#\/identify\/sampling$/);
 await page.locator('.site-nav > a[data-nav="home"]').click();
 await expect(page).toHaveURL(/#\/home\/sampling$/);
 await expect(page.locator('.game-card')).toHaveCount(10);
});

test('My Progress jumps from any activity to the existing topic progress panel and focuses it',async({page})=>{
 await page.setViewportSize({width:1280,height:830});
 await page.goto('/#/cloze/data');
 await expect(page.locator('[data-progress-nav]')).toHaveAttribute('href','#/home/data');
 await page.locator('[data-progress-nav]').click();
 await expect(page).toHaveURL(/#\/home\/data$/);
 await expect(page.locator('#progress-title')).toBeFocused();
 await expect(page.locator('.progress-panel')).toBeVisible();
 await page.locator('[data-progress-nav]').click();
 await expect(page.locator('#progress-title')).toBeFocused();
 await expect(page.locator('.game-card')).toHaveCount(10);
});

test('mobile Menu button supports keyboard, nested Activities and Escape without overflow',async({page})=>{
 await page.setViewportSize({width:390,height:780});
 await page.goto('/#/home/data');
 const toggle=page.locator('#mobile-menu-toggle');
 await expect(toggle).toBeVisible();
 await expect(toggle).toHaveAttribute('aria-expanded','false');
 await expect(page.locator('#main-nav')).toBeHidden();
 await toggle.focus();
 await page.keyboard.press('Enter');
 await expect(toggle).toHaveAttribute('aria-expanded','true');
 await expect(page.locator('#main-nav')).toBeVisible();
 await page.locator('#activities-menu > summary').click();
 await expect(page.locator('.nav-group > a')).toHaveCount(9);
 await expect(page.locator('.nav-group > a[data-nav="flashcards"]')).toBeVisible();
 await bodyFitsViewport(page,390);
 await page.keyboard.press('Escape');
 await expect(toggle).toBeFocused();
 await expect(toggle).toHaveAttribute('aria-expanded','false');
 await toggle.click();
 await page.locator('#activities-menu > summary').click();
 await page.locator('.nav-group > a[data-nav="speed"]').click();
 await expect(page).toHaveURL(/#\/speed\/data$/);
 await expect(toggle).toHaveAttribute('aria-expanded','false');
 await expect(page.locator('#main-nav')).toBeHidden();
});

test('mobile My Progress closes navigation while keeping the current topic',async({page})=>{
 await page.setViewportSize({width:320,height:780});
 await page.goto('/#/cloze/data');
 await page.locator('#mobile-menu-toggle').click();
 await page.locator('[data-progress-nav]').click();
 await expect(page).toHaveURL(/#\/home\/data$/);
 await expect(page.locator('#progress-title')).toBeFocused();
 await expect(page.locator('#main-nav')).toBeHidden();
 await bodyFitsViewport(page,320);
});

for(const width of [320,390,768,1024,1280]){
 test('UI Pass 1 home and navigation fit '+width+'px without side scrolling',async({page})=>{
  await page.setViewportSize({width,height:830});
  await page.goto('/#/home/sampling');
  await expect(page.locator('.activity-stage')).toHaveCount(4);
  await bodyFitsViewport(page,width);
  if(width<=760){
   await page.locator('#mobile-menu-toggle').click();
   await page.locator('#activities-menu > summary').click();
   await expect(page.locator('.activities-panel')).toBeVisible();
  }else{
   await page.locator('#activities-menu > summary').click();
  }
  await bodyFitsViewport(page,width);
  await page.goto('/#/home/data');
  await bodyFitsViewport(page,width);
  await page.goto('/#/exam/sampling');
  await bodyFitsViewport(page,width);
 });
}
