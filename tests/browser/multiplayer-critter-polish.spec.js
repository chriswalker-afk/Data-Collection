import {test,expect} from '@playwright/test';

// The actual Wrangler Durable Object and bundled SVG artwork are used here.
const API='http://127.0.0.1:8787';
async function host(page){
  await page.addInitScript(endpoint=>{window.__SAMPLING_MULTIPLAYER_API__=endpoint;},API);
  await page.goto('/multiplayer.html');
  await page.locator('#length').selectOption('5');
  await page.locator('#create').click();
  await expect(page.locator('#connection')).toHaveText('Live connection',{timeout:15000});
  return (await page.locator('#room-id').textContent()).trim();
}
async function studentJoin(page,code,nickname){
  await page.addInitScript(endpoint=>{window.__SAMPLING_MULTIPLAYER_API__=endpoint;},API);
  await page.goto('/multiplayer.html?room='+code);
  await page.locator('#nickname').fill(nickname);
  await page.locator('#join').click();
  await expect(page.locator('#connection')).toHaveText('Live connection',{timeout:15000});
}
const overflow=page=>page.evaluate(()=>({
  viewport:innerWidth,doc:document.documentElement.scrollWidth,
  roster:document.querySelector('#players')?.scrollWidth,
  available:document.querySelector('#players')?.clientWidth
}));

// A separate Wrangler process prevents 45-player load from sharing local rate limits
// with unrelated browser regression tests, while keeping the full-suite gate intact.
test.describe('Isolated Critter Lab visual audit',()=>{
  test.skip(process.env.CRITTER_VISUAL_AUDIT!=='1','Runs as a dedicated 45-player CI smoke job');
  test('lobby critter personality is calm, locally recognizable and reduced-motion safe',async({page,browser,isMobile})=>{
  test.skip(isMobile,'Explicit mobile layout is covered in the 45-player test.');
  const code=await host(page);
  const student=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try{
    await studentJoin(student,code,'Quiet Quokka');
    await expect(student.locator('#players li.is-local-player')).toHaveCount(1);
    await expect(student.locator('.lobby-my-critter .critter-portrait')).toBeVisible();
    await expect(student.getByRole('link',{name:/Edit my critter/}))
      .toHaveAttribute('href','./critter-lab/index.html?room='+code);
    await expect(page.locator('#players .critter-portrait')).toHaveCount(1);
    await expect(student.locator('#room')).toHaveAttribute('data-phase','lobby');

    await student.emulateMedia({reducedMotion:'no-preference'});
    await expect.poll(()=>student.locator('#players .critter-portrait').evaluate(
      el=>getComputedStyle(el).animationName)).toContain('critter-idle');

    await student.emulateMedia({reducedMotion:'reduce'});
    expect(await student.locator('#players .critter-portrait').evaluate(
      el=>getComputedStyle(el).animationName)).toBe('none');

    await student.emulateMedia({reducedMotion:'no-preference'});
    await page.getByRole('button',{name:'Start challenge'}).click();
    await expect(student.locator('#room')).toHaveAttribute('data-phase','playing');
    await expect(student.locator('.lobby-my-critter')).toHaveCount(0);
    expect(await student.locator('#players .critter-portrait').evaluate(
      el=>getComputedStyle(el).animationName)).toBe('none');
  }finally{await student.close();}
});

test('45 critters fit phone and projector widths, and every student joins the finale',async({page,request,isMobile})=>{
  test.skip(isMobile,'Tests 320, 390, 768 and 1920px widths explicitly on one browser.');
  test.setTimeout(90000);
  const code=await host(page);
  const joined=await Promise.all(Array.from({length:45},(_,i)=>
    request.post(API+'/rooms/'+code+'/join',{
      data:{name:'Critter '+String(i+1).padStart(2,'0')}
    })));
  expect(joined.every(r=>r.status()===201),JSON.stringify(joined.map(x=>x.status()))).toBe(true);
  await expect(page.locator('#players li')).toHaveCount(45,{timeout:20000});
  await expect(page.locator('#players')).toHaveClass(/is-crowded/);
  for(const width of [320,390,768,1920]){
    await page.setViewportSize({width,height:850});
    const bounds=await overflow(page);
    expect(bounds.doc-bounds.viewport,'document overflow at '+width+'px').toBeLessThanOrEqual(1);
    expect(bounds.roster-bounds.available,'roster overflow at '+width+'px').toBeLessThanOrEqual(1);
  }
  const token=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('sampling-arcade-multiplayer-v1')).token);
  const closed=await request.post(API+'/rooms/'+code+'/command',{
    headers:{Authorization:'Bearer '+token},data:{type:'close'}
  });
  expect(closed.status()).toBe(200);
  await expect(page.locator('#stage h2')).toHaveText('Challenge complete!');
  await page.getByRole('button',{name:'Start awards ceremony'}).click();
  await page.getByRole('button',{name:'Skip to finale'}).click();
  const photo=page.locator('.ceremony-class-gallery');
  await expect(photo.locator('li')).toHaveCount(45,{timeout:15000});
  await expect(photo.locator('.critter-portrait')).toHaveCount(45);
  expect(await photo.locator('strong').allTextContents()).toEqual(
    Array.from({length:45},(_,i)=>'Critter '+String(i+1).padStart(2,'0'))
  );
  for(const width of [320,390,768,1920]){
    await page.setViewportSize({width,height:900});
    await expect(page.locator('.ceremony-card.is-finale')).toBeVisible();
    const bounds=await overflow(page);
    expect(bounds.doc-bounds.viewport,'finale overflow at '+width+'px').toBeLessThanOrEqual(1);
    if(width===320 || width===1920){
      await page.screenshot({path:'test-results/ui-pass3-critter-finale-'+width+'.png'});
    }
  }
});

});
