import {test,expect} from '@playwright/test';
import {RELAY_PUZZLES} from '../../multiplayer/relay-bank.js';

const API='http://127.0.0.1:8787';
const auth=token=>({Authorization:'Bearer '+token});
const bank=RELAY_PUZZLES.flatMap(p=>p.parts);
async function create(request,opts={}){
  const res=await request.post(API+'/rooms',{data:{objective:'mosaic',game:'which',roundLength:5,
    minutes:3,teamCount:2,mosaicTiles:6,...opts}});
  expect(res.status(),await res.text()).toBe(201);
  return res.json();
}
async function join(request,code,name){
  const r=await request.post(`${API}/rooms/${code}/join`,{data:{name}});
  expect(r.status(),await r.text()).toBe(201);return r.json();
}
async function cmd(request,code,token,data,status=200){
  const r=await request.post(`${API}/rooms/${code}/command`,{data,headers:auth(token)});
  expect(r.status(),await r.text()).toBe(status);return r.json();
}
async function state(request,code,token){
  const r=await request.get(`${API}/rooms/${code}/state`,{headers:auth(token)});
  expect(r.status(),await r.text()).toBe(200);return r.json();
}
function correct(task){
  const piece=bank.find(p=>p.prompt===task.prompt);
  expect(piece,'Only real source bank tasks are allowed').toBeDefined();
  const choice=task.options.find(o=>o.label===piece.correct);
  expect(choice).toBeDefined();
  return {type:'mosaic-answer',roundId:task.roundId,partIndex:task.partIndex,choiceId:choice.id};
}
async function solveOne(request,code,students){
  for(const student of students){
    const snap=await state(request,code,student.token);
    if(snap.status!=='playing')return false;
    const task=snap.mosaic.me?.task;
    if(!task)continue;
    const before=snap.mosaic.completedTiles;
    await cmd(request,code,student.token,correct(task));
    return (await state(request,code,student.token)).mosaic.completedTiles>before;
  }
  throw Error('Active mosaic still has unfinished roles but none were assigned');
}
test('Class Mosaic requires valid setup, keeps roles private, and refuses forged submissions',async({request,isMobile})=>{
  test.skip(isMobile,'Worker API is independent of screen size');
  for(const data of [{teamCount:1},{mosaicTiles:7},{minutes:16},{game:'sort'},{roundLength:10}]){
    const r=await request.post(API+'/rooms',{data:{objective:'mosaic',game:'which',roundLength:5,
      minutes:3,teamCount:2,mosaicTiles:6,...data}});
    expect(r.status()).toBe(400);
  }
  const host=await create(request),code=host.code;
  const students=[];
  for(let i=0;i<4;i++)students.push(await join(request,code,'Relay '+(i+1)));
  await cmd(request,code,students[0].token,{type:'start'},400);
  await cmd(request,code,host.token,{type:'start'});
  const person=await state(request,code,students[0].token),teacher=await state(request,code,host.token);
  expect(person.objective).toBe('mosaic');
  expect(person.mosaic.me?.task).toBeTruthy();
  expect(teacher.mosaic.me).toBe(null);
  for(const snap of [person,teacher]){
    expect(JSON.stringify(snap)).not.toMatch(/"correct"\s*:\s*"(?:Simple|Systematic|Quota|Opportunity|Stratified)/);
    expect(JSON.stringify(snap)).not.toContain('hostToken');
    expect(snap.question).toBe(null);
    expect(snap.players.every(p=>p.score===0)).toBe(true);
  }
  const task=person.mosaic.me.task;
  const foreign=students[2];
  await cmd(request,code,foreign.token,correct(task),400);
  await cmd(request,code,host.token,correct(task),400);
  await cmd(request,code,students[0].token,{type:'mosaic-answer',roundId:task.roundId,
    partIndex:task.partIndex,choiceId:'c9',score:999999,tiles:99},400);
  await cmd(request,code,students[0].token,correct(task));
  const after=await state(request,code,students[0].token);
  expect(after.mosaic.completedTiles).toBe(0);
  expect(after.mosaic.me.feedback.correct).toBe(true);
  await cmd(request,code,students[0].token,correct(task),400);
  await cmd(request,code,students[0].token,{type:'remove',targetId:person.me.id},400);
  const restored=await state(request,code,students[0].token);
  expect(restored.mosaic.me.teamId).toBe(after.mosaic.me.teamId);
  expect(restored.mosaic.me.feedback.correct).toBe(true);
  await cmd(request,code,host.token,{type:'close'});
  const finished=await state(request,code,host.token);
  expect(finished.status).toBe('finished');
  expect(finished.mosaic.achieved).toBe(false);
  await cmd(request,code,host.token,{type:'ceremony-start'});
  const ceremony=await state(request,code,host.token);
  expect(ceremony.ceremony.slide.kind).toBe('welcome');
  await cmd(request,code,host.token,{type:'ceremony-next'});
  const slide=(await state(request,code,host.token)).ceremony.slide;
  expect(slide.kind).toBe('mosaic');expect(slide.achieved).toBe(false);
  expect(JSON.stringify(slide)).not.toContain('podium');
});

test('15-tile cooperative victory with a realistic 45-student classroom',async({request,page,isMobile})=>{
  test.skip(isMobile,'45-player server load runs once, independently of viewport');
  test.setTimeout(170000);
  const host=await create(request,{mosaicTiles:15,teamCount:4,minutes:10}),code=host.code;
  const responses=await Promise.all(Array.from({length:45},(_,i)=>
    request.post(`${API}/rooms/${code}/join`,{data:{name:'Relay Learner '+String(i+1).padStart(2,'0')}})));
  expect(responses.every(r=>r.status()===201)).toBe(true);
  const students=await Promise.all(responses.map(r=>r.json()));
  await cmd(request,code,host.token,{type:'start'});
  let count=0;
  for(;count<65;count++){
    const snap=await state(request,code,host.token);
    if(snap.status==='finished')break;
    await solveOne(request,code,students);
  }
  const done=await state(request,code,host.token);
  expect(done.status).toBe('finished');
  expect(done.mosaic.achieved).toBe(true);
  expect(done.mosaic.completedTiles).toBe(15);
  expect(done.mosaic.teams.every(t=>t.tiles>0)).toBe(true);
  expect(done.mosaic.mosaic).toHaveLength(15);
  expect(new Set(done.mosaic.mosaic.map(t=>t.index)).size).toBe(15);
  expect(done.players).toHaveLength(45);
  expect(done.players.every(p=>p.score===0)).toBe(true);
  // Exactly the same verified 45-player result must render at phone and
  // projector widths; the browser does not infer winners or inflate tiles.
  await page.addInitScript(({api,code,token})=>{
    window.__SAMPLING_MULTIPLAYER_API__=api;
    sessionStorage.setItem('sampling-arcade-multiplayer-v1',
      JSON.stringify({roomCode:code,token,isHost:true}));
  },{api:API,code,token:host.token});
  await page.goto('/multiplayer.html');
  await expect(page.locator('.mosaic-picture-grid')).toBeVisible({timeout:16000});
  await expect(page.locator('.mosaic-picture-tile.is-revealed')).toHaveCount(15);
  await expect(page.locator('.mosaic-team-card')).toHaveCount(4);
  await expect(page.locator('#players li')).toHaveCount(45);
  await expect(page.locator('#players')).toHaveClass(/is-crowded/);
  await expect(page.locator('.mosaic-picture')).toHaveAttribute('data-completed','true');
  for(const width of [320,390,768,1920]){
    await page.setViewportSize({width,height:920});
    const widths=await page.evaluate(()=>({
      document:document.documentElement.scrollWidth,
      viewport:window.innerWidth,
      image:document.querySelector('.mosaic-picture-grid').getBoundingClientRect().width
    }));
    expect(widths.document-widths.viewport,'Mosaic overflow at '+width+'px').toBeLessThanOrEqual(1);
    expect(widths.image,'Mosaic artwork hidden at '+width+'px').toBeGreaterThan(100);
  }
  await cmd(request,code,host.token,{type:'ceremony-start'});
  await cmd(request,code,host.token,{type:'ceremony-next'});
  const celebration=(await state(request,code,host.token)).ceremony.slide;
  expect(celebration.kind).toBe('mosaic');expect(celebration.achieved).toBe(true);
  expect(celebration.completedTiles).toBe(15);
  await expect(page.locator('.ceremony-card.is-mosaic')).toBeVisible({timeout:16000});
  await expect(page.locator('.mosaic-ceremony-tribute')).toHaveCount(4);
  await expect(page.locator('.ceremony-card .mosaic-picture-tile.is-revealed')).toHaveCount(15);
  expect(await page.locator('.mosaic-ceremony-tribute[data-earned="true"]').count()).toBe(4);
  const scene=await page.locator('.mosaic-picture').getAttribute('data-scene');
  expect(['garden','reef','stars']).toContain(scene);
});

test('Puzzle Relay works on a 320px student device and reconnects without losing role',async({page,browser,request,isMobile})=>{
  test.skip(isMobile,'Uses explicit mobile context on desktop run');
  const mobile=await browser.newContext({viewport:{width:320,height:812},isMobile:true,hasTouch:true});
  const pupil=await mobile.newPage();
  try{
    const host=await create(request),code=host.code;
    const others=[];
    for(let i=0;i<3;i++)others.push(await join(request,code,'Mobile Teammate '+(i+1)));
    await pupil.addInitScript(url=>window.__SAMPLING_MULTIPLAYER_API__=url,API);
    await pupil.goto('/multiplayer.html');
    await pupil.locator('#room-code').fill(code);
    await pupil.locator('#nickname').fill('Mobile Relay');
    await pupil.locator('#join').click();
    await expect(pupil.locator('#connection')).toHaveText('Live connection',{timeout:15000});
    await cmd(request,code,host.token,{type:'start'});
    await expect(pupil.locator('.mosaic-shell')).toBeVisible();
    await expect(pupil.locator('.mosaic-picture-grid')).toHaveAttribute('role','img');
    await expect(pupil.locator('.mosaic-picture-tile')).toHaveCount(6);
    await expect(pupil.locator('.mosaic-team-card')).toHaveCount(2);
    const token=await pupil.evaluate(()=>JSON.parse(sessionStorage.getItem('sampling-arcade-multiplayer-v1')).token);
    const first=await state(request,code,token);
    const task=first.mosaic.me.task;
    expect(task).toBeTruthy();
    const label=task.options.find(o=>o.id===correct(task).choiceId).label;
    await pupil.locator('.mosaic-option').filter({hasText:label}).click();
    await expect(pupil.locator('.mosaic-feedback')).toContainText('Verified');
    await pupil.reload();
    await expect(pupil.locator('#connection')).toHaveText('Live connection',{timeout:15000});
    const second=await state(request,code,token);
    expect(second.mosaic.me.teamId).toBe(first.mosaic.me.teamId);
    expect(second.mosaic.me.feedback.correct).toBe(true);
    expect(await pupil.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
  }finally{await mobile.close();}
});