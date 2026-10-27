import {test,expect} from '@playwright/test';
import {RELAY_PUZZLES} from '../../multiplayer/relay-bank.js';

const API='http://127.0.0.1:8787';
const bank=RELAY_PUZZLES.flatMap(p=>p.parts);
const headers=token=>({Authorization:'Bearer '+token});
const roomUrl=code=>API+'/rooms/'+code;
const teamNames={vector:'Vector Vipers',sigma:'Sigma Sparrows',
  delta:'Delta Dolphins',pi:'Pi Pythons'};
async function send(request,code,token,body,status=200){
  const result=await request.post(roomUrl(code)+'/command',{headers:headers(token),data:body});
  expect(result.status(),await result.text()).toBe(status);
  return result.json();
}
async function join(request,code,name){
  const result=await request.post(roomUrl(code)+'/join',{data:{name}});
  expect(result.status(),await result.text()).toBe(201);
  return result.json();
}
async function state(request,code,token){
  const r=await request.get(roomUrl(code)+'/state',{headers:headers(token)});
  expect(r.status()).toBe(200);
  return r.json();
}
function correct(task){
  const part=bank.find(p=>p.prompt===task.prompt);
  expect(part).toBeDefined();
  const option=task.options.find(o=>o.label===part.correct);
  expect(option).toBeDefined();
  return {type:'mosaic-answer',roundId:task.roundId,
    partIndex:task.partIndex,choiceId:option.id};
}
async function open(page){
  await page.addInitScript(api=>window.__SAMPLING_MULTIPLAYER_API__=api,API);
  await page.goto('/multiplayer.html');
}
async function attachHost(page,code,token){
  await page.addInitScript(({api,code,token})=>{
    window.__SAMPLING_MULTIPLAYER_API__=api;
    sessionStorage.setItem('sampling-arcade-multiplayer-v1',
      JSON.stringify({roomCode:code,token,isHost:true}));
  },{api:API,code,token});
  await page.goto('/multiplayer.html');
  await expect(page.locator('#connection')).toHaveText('Live connection',{timeout:16000});
}
test('live host and 320px pupil share one picture; a checked tile triggers a team/critter celebration',async({page,browser,request,isMobile})=>{
  test.skip(isMobile,'Uses its own 320px touch-enabled student page');
  test.setTimeout(90000);
  await open(page);
  await page.locator('.studio-choice').filter({
    has:page.locator('input[name="studio-format"][value="relay"]')
  }).click();
  await page.locator('#studio-mosaic-tiles').selectOption('6');
  await page.locator('#create').click();
  await expect(page.locator('#room')).toBeVisible({timeout:16000});
  const code=(await page.locator('#room-id').innerText()).trim();
  await expect(page.getByRole('button',{name:'Start Class Mosaic'})).toBeDisabled();
  const others=[];
  for(let i=0;i<3;i++)others.push(await join(request,code,'Mural '+(i+1)));
  const mobile=await browser.newContext({viewport:{width:320,height:812},isMobile:true,hasTouch:true});
  const pupil=await mobile.newPage();
  try{
    await open(pupil);
    await pupil.locator('#room-code').fill(code);
    await pupil.locator('#nickname').fill('Mural 4');
    await pupil.locator('#join').click();
    await expect(pupil.locator('#connection')).toHaveText('Live connection',{timeout:16000});
    await expect(page.locator('.mosaic-lobby-team')).toHaveCount(2);
    await expect(page.locator('.mosaic-lobby-team[data-ready="true"]')).toHaveCount(2);
    await expect(page.getByRole('button',{name:'Start Class Mosaic'})).toBeEnabled();
    await page.getByRole('button',{name:'Start Class Mosaic'}).click();
    await expect(pupil.locator('.mosaic-picture-grid')).toBeVisible({timeout:15000});
    await expect(page.locator('.mosaic-picture-grid')).toBeVisible();
    const scene=await page.locator('.mosaic-picture').getAttribute('data-scene');
    expect(['garden','reef','stars']).toContain(scene);
    await expect(pupil.locator('.mosaic-picture')).toHaveAttribute('data-scene',scene);
    await expect(page.locator('.mosaic-picture-tile.is-locked')).toHaveCount(6);
    await expect(page.locator('.mosaic-picture-tile.is-revealed')).toHaveCount(0);
    await expect(pupil.locator('.mosaic-options')).toHaveAttribute('aria-labelledby','mosaic-question');
    await expect(pupil.locator('.mosaic-picture-grid')).toHaveAttribute('role','img');
    await expect(page.locator('.mosaic-teacher-pulse')).toBeVisible();

    const pupilToken=await pupil.evaluate(()=>
      JSON.parse(sessionStorage.getItem('sampling-arcade-multiplayer-v1')).token);
    const before=await state(request,code,pupilToken);
    const task=before.mosaic.me.task;
    expect(task).toBeTruthy();
    const option=task.options.find(x=>x.id===correct(task).choiceId);
    await pupil.locator('.mosaic-option').filter({hasText:option.label}).click();
    await expect(pupil.locator('.mosaic-feedback')).toContainText('Verified');
    expect((await state(request,code,pupilToken)).mosaic.completedTiles).toBe(0);
    await pupil.reload();
    await expect(pupil.locator('.mosaic-feedback')).toContainText('Verified',{timeout:15000});
    await expect(pupil.locator('.mosaic-picture')).toHaveAttribute('data-scene',scene);

    const students=[...others,{token:pupilToken}];
    for(let tries=0;tries<12;tries++){
      const current=await state(request,code,students[0].token);
      if(current.mosaic.completedTiles>0)break;
      let submitted=false;
      for(const person of students){
        const snapshot=await state(request,code,person.token);
        const available=snapshot.mosaic.me?.task;
        if(available){
          await send(request,code,person.token,correct(available));
          submitted=true;break;
        }
      }
      expect(submitted).toBe(true);
    }
    await expect(page.locator('.mosaic-picture-tile.is-revealed')).toHaveCount(1,{timeout:15000});
    await expect(pupil.locator('.mosaic-picture-tile.is-revealed')).toHaveCount(1,{timeout:15000});
    await expect(page.locator('.mosaic-reaction .critter-portrait').first()).toBeVisible();
    await expect(page.locator('.mosaic-reaction')).toContainText('unlocked');
    const art=await page.locator('.mosaic-piece-image').first().evaluate(el=>
      getComputedStyle(el).backgroundImage);
    expect(art).toContain('mosaic-');
    const mobileWidth=await pupil.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    expect(mobileWidth,'Phone horizontal overflow').toBeLessThanOrEqual(1);
    await page.setViewportSize({width:1920,height:1080});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({path:'test-results/ui-pass3-mosaic-projector.png'});
    await pupil.screenshot({path:'test-results/ui-pass3-mosaic-phone.png'});
  }finally{await mobile.close();}
});
test('teacher can safely reopen a blocked role; reduced motion disables reveal and critter animations',async({page,request,isMobile})=>{
  test.skip(isMobile,'Worker role lock and projector controls are viewport-independent');
  test.setTimeout(90000);
  const created=await request.post(API+'/rooms',{data:{objective:'mosaic',game:'which',
    roundLength:5,minutes:3,teamCount:2,mosaicTiles:6}});
  expect(created.status(),await created.text()).toBe(201);
  const host=await created.json(),code=host.code;
  const students=[];
  for(let i=0;i<4;i++)students.push(await join(request,code,'Coach '+(i+1)));
  await send(request,code,host.token,{type:'start'});
  await attachHost(page,code,host.token);
  await expect(page.locator('.mosaic-picture-grid')).toBeVisible();
  const current=await state(request,code,students[0].token);
  const task=current.mosaic.me.task;
  const right=correct(task).choiceId;
  const wrong=task.options.find(x=>x.id!==right).id;
  for(let i=0;i<3;i++){
    await send(request,code,students[0].token,{type:'mosaic-answer',
      roundId:task.roundId,partIndex:task.partIndex,choiceId:wrong});
    if(i<2)await new Promise(resolve=>setTimeout(resolve,1620));
  }
  const blocked=await state(request,code,students[0].token);
  expect(blocked.mosaic.me.task.remaining).toBe(0);
  expect(blocked.mosaic.completedTiles).toBe(0);
  await expect(page.locator('.mosaic-pulse-stat.is-alert')).toBeVisible({timeout:15000});
  const team=blocked.mosaic.me.teamId;
  const role=['Discover','Evaluate','Improve'][task.partIndex];
  const reset=page.getByRole('button',{name:'Reopen '+role+' for '+teamNames[team]});
  await expect(reset).toBeVisible();
  await reset.click();
  await expect.poll(async()=>
    (await state(request,code,students[0].token)).mosaic.me.task.remaining
  ).toBe(3);
  const after=await state(request,code,host.token);
  expect(after.mosaic.completedTiles).toBe(0);
  expect(after.players.every(p=>p.score===0)).toBe(true);

  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>{
    const tile=document.querySelector('.mosaic-picture-tile');
    tile.classList.add('is-revealed','is-fresh');
    tile.classList.remove('is-locked');
  });
  const noAnimation=await page.locator('.mosaic-piece-image').first().evaluate(el=>
    getComputedStyle(el).animationName);
  expect(noAnimation).toBe('none');
  await page.emulateMedia({reducedMotion:'no-preference'});
  const animation=await page.locator('.mosaic-piece-image').first().evaluate(el=>
    getComputedStyle(el).animationName);
  expect(animation).toContain('mosaic-unveil');
  await send(request,code,host.token,{type:'close'});
  await expect(page.locator('#room-status')).toContainText('shared result');
});
