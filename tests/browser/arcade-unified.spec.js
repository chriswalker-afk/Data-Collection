import {test,expect} from '@playwright/test';

const BACKEND='http://127.0.0.1:8787';
async function arena(page,query=''){
  await page.addInitScript(url=>{window.__SAMPLING_MULTIPLAYER_API__=url;},BACKEND);
  await page.goto('/multiplayer.html'+query);
  await expect(page.locator('#entry')).toBeVisible();
}
async function create(page,length='5'){
  await arena(page);
  await page.locator('#length').selectOption(length);
  await page.getByRole('button',{name:/Create room/}).click();
  await expect(page.locator('#connection')).toHaveText('Live connection',{timeout:15000});
  const code=(await page.locator('#room-id').textContent()).trim();
  expect(code).toMatch(/^\d{6}$/);
  return code;
}
async function join(page,code,name){
  await arena(page,'?room='+code);
  await expect(page.locator('#room-code')).toHaveValue(code);
  await page.locator('#nickname').fill(name);
  await page.getByRole('button',{name:/Join game/}).click();
  await expect(page.locator('#connection')).toHaveText('Live connection',{timeout:15000});
}

test('unified navigation keeps ten solo games, leads to multiplayer and previews awards honestly',async({page})=>{
  await page.goto('/#/home/sampling');
  await expect(page.locator('.game-card')).toHaveCount(10);
  await expect(page.locator('.arcade-path-card')).toHaveCount(3);
  await expect(page.locator('.site-nav [data-nav="home"]')).toHaveText('Solo');
  await page.locator('[data-action="browse-solo"]').click();
  await expect(page.locator('#games-title')).toBeFocused();
  await page.locator('.arcade-path-card.is-awards').click();
  await expect(page).toHaveURL(/\/awards\.html$/);
  await expect(page.getByRole('heading',{name:'Every mathematician has a story.'})).toBeVisible();
  await expect(page.getByText('These are previews, not yet earned or saved.')).toBeVisible();
  await expect(page.locator('.arcade-award-card')).toHaveCount(3);
  await page.getByRole('link',{name:'Multiplayer',exact:true}).click();
  await expect(page).toHaveURL(/\/multiplayer\.html$/);
  await expect(page.locator('#entry')).toBeVisible();
  await page.getByRole('link',{name:'Solo',exact:true}).click();
  await expect(page.locator('.game-card')).toHaveCount(10);
});
test('existing solo progress is never changed by visiting other modes',async({page})=>{
  await page.goto('/#/home/sampling');
  const previous=await page.evaluate(()=>{
    const key='sampling-arcade-progress-v1';
    const sample={version:1,answers:14,sessions:2,concepts:{'sampling-frame':{attempts:3,correct:2,streak:2}}};
    localStorage.setItem(key,JSON.stringify(sample));return localStorage.getItem(key);
  });
  await page.goto('/multiplayer.html');
  await page.goto('/awards.html');
  await page.goto('/#/home/sampling');
  const after=await page.evaluate(()=>localStorage.getItem('sampling-arcade-progress-v1'));
  expect(after).toBe(previous);
});
test('teacher can lock room, unlock joining, remove nickname and end session',async({page,browser,request})=>{
  const code=await create(page);
  await expect(page.locator('#player-count')).toHaveText('0 / 45');
  await expect(page.getByRole('button',{name:'Start challenge'})).toBeDisabled();
  const studentContext=await browser.newContext();
  const otherContext=await browser.newContext();
  const student=await studentContext.newPage();
  const late=await otherContext.newPage();
  try{
    await join(student,code,'Quota Quokka');
    await expect(page.locator('#player-count')).toHaveText('1 / 45');
    await expect(page.locator('#players li')).toContainText(['Quota Quokka']);
    await page.getByRole('button',{name:'Lock joining'}).click();
    await expect(page.locator('#room-lock')).toHaveText('Joining closed');
    await expect(page.getByRole('button',{name:'Unlock joining'})).toBeVisible();
    await arena(late,'?room='+code);
    await late.locator('#nickname').fill('Late Llama');
    await late.getByRole('button',{name:/Join game/}).click();
    await expect(late.locator('#notice')).toContainText(/locked/i);
    await expect(late.locator('#entry')).toBeVisible();
    await page.getByRole('button',{name:'Unlock joining'}).click();
    await expect(page.locator('#room-lock')).toHaveText('Joining open');
    await late.getByRole('button',{name:/Join game/}).click();
    await expect(late.locator('#connection')).toHaveText('Live connection',{timeout:15000});
    await expect(page.locator('#player-count')).toHaveText('2 / 45');
    const snapshot=JSON.parse(await student.evaluate(()=>sessionStorage.getItem('sampling-arcade-multiplayer-v1')));
    expect((await request.post(BACKEND+'/rooms/'+code+'/command',{
      headers:{Authorization:'Bearer '+snapshot.token},
      data:{type:'lock'}
    })).status()).toBe(400);
    page.once('dialog',dialog=>dialog.accept());
    await page.getByRole('button',{name:'Remove Late Llama from room'}).click();
    await expect(page.locator('#player-count')).toHaveText('1 / 45');
    await expect(late.locator('#notice')).toContainText(/removed/i,{timeout:15000});
    await expect(page.getByRole('button',{name:'Start challenge'})).toBeEnabled();
    await page.getByRole('button',{name:'Start challenge'}).click();
    await expect(student.locator('#stage .option-grid')).toBeVisible({timeout:15000});
    page.once('dialog',dialog=>dialog.accept());
    await page.getByRole('button',{name:'End challenge'}).click();
    await expect(student.locator('#stage h2')).toContainText('Challenge complete',{timeout:15000});
  }finally{
    await studentContext.close();await otherContext.close();
  }
});
for(const width of [320,390,768,1280]){
  test('multiplayer and awards are responsive at '+width+'px',async({page})=>{
    await page.setViewportSize({width,height:800});
    await page.goto('/multiplayer.html');
    await expect(page.locator('#entry')).toBeVisible();
    const colors=await page.locator('.multiplayer-panel').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).backgroundColor));
    expect(colors[0]).not.toBe(colors[1]);
    let overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.goto('/awards.html');
    overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
test('projector room displays shareable code and one clear classroom roster on mobile',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const code=await create(page);
  await expect(page.locator('#room-id')).toHaveText(code);
  await expect(page.locator('#share-link')).toBeVisible();
  await expect(page.locator('#copy-code')).toBeVisible();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
