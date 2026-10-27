import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {GAME_SORT_BOARDS} from '../../multiplayer/game-bank.js';

const API='http://127.0.0.1:8787';
const scenarios=JSON.parse(readFileSync(new URL('../../content/scenarios.json',import.meta.url),'utf8')).scenarios;
const concepts=JSON.parse(readFileSync(new URL('../../content/concepts.json',import.meta.url),'utf8')).concepts;
const sortBoards=new Map(GAME_SORT_BOARDS.map(b=>[b.id,b]));
const auth=token=>({Authorization:'Bearer '+token});
const route=code=>API+'/rooms/'+code;
async function create(request,metric='accuracy',overrides={}){
 const game=overrides.game||'which';
 const data={objective:'class',game,roundLength:game==='match'||game==='sort'?1:5,minutes:1,
  classMetric:metric,classAccuracy:80,classCorrect:20,
  classParticipation:80,classPerStudent:2,...overrides};
 const r=await request.post(API+'/rooms',{data});
 expect(r.status(),await r.text()).toBe(201);return r.json();
}
async function join(request,code,name){
 const r=await request.post(route(code)+'/join',{data:{name}});
 expect(r.status(),await r.text()).toBe(201);return r.json();
}
async function command(request,code,token,payload,expected=200){
 const r=await request.post(route(code)+'/command',{headers:auth(token),data:payload});
 expect(r.status(),await r.text()).toBe(expected);return r.json();
}
async function state(request,code,token){
 const r=await request.get(route(code)+'/state',{headers:auth(token)});
 expect(r.status(),await r.text()).toBe(200);return r.json();
}
function answer(game,q,wrong=false){
 if(game==='which'){
  const correct=scenarios.find(s=>s.id===q.id)?.correctMethod;
  expect(correct).toBeTruthy();
  return {method:wrong?['quota','systematic','stratified','simple-random','opportunity'].find(m=>m!==correct):correct};
 }
 if(game==='speed'){
  const term=concepts.find(c=>c.id===q.id)?.label;
  expect(term).toBeTruthy();return {response:wrong?'definitely wrong':term};
 }
 if(game==='match'){
  const pairs=Object.fromEntries(q.terms.map(term=>{
   const expected=concepts.find(c=>c.id===term.id)?.definition;
   const match=q.definitions.find(d=>d.text===expected);
   expect(match).toBeTruthy();
   return [term.id,match.id];
  }));
  if(wrong){
   const ids=Object.keys(pairs);
   [pairs[ids[0]],pairs[ids[1]]]=[pairs[ids[1]],pairs[ids[0]]];
  }
  return {pairs};
 }
 const original=sortBoards.get(q.id);
 expect(original).toBeTruthy();
 const placements=Object.fromEntries(q.statements.map(x=>{
  const source=original.statements.find(s=>s.id===x.id);
  return [x.id,source.correctDestination];
 }));
 if(wrong){
  const first=q.statements[0];
  placements[first.id]=q.destinations.find(d=>d.id!==placements[first.id]).id;
 }
 return {placements};
}
async function task(request,code,token,game='which',wrong=false){
 const before=await state(request,code,token);
 expect(before.status).toBe('playing');
 const q=before.blitz.question;
 expect(q?.questionKey).toBeTruthy();
 const a=answer(game,q,wrong);
 await command(request,code,token,{type:'blitz-answer',questionKey:q.questionKey,...a});
 return {q,after:await state(request,code,token)};
}
async function next(request,code,token){
 await command(request,code,token,{type:'blitz-next'});
}

test('Accuracy Quest needs three meaningful contributors and never reveals competing scores',async({request,isMobile})=>{
 test.skip(isMobile,'Server scoring is viewport-independent');
 const teacher=await create(request),code=teacher.code;
 const students=await Promise.all(['Aster','Birch','Cedar'].map(n=>join(request,code,'Quest '+n)));
 await command(request,code,teacher.token,{type:'start'});
 const initial=await state(request,code,teacher.token);
 expect(initial.objective).toBe('class');
 expect(initial.quest.totalStudents).toBe(3);
 expect(initial.quest.needed).toBe(3);
 expect(initial.quest.achieved).toBe(false);
 expect(initial.players.every(p=>p.score===0)).toBe(true);
 expect(initial.blitz.standings.every(p=>!Object.hasOwn(p,'score'))).toBe(true);
 for(let i=0;i<students.length;i++){
  for(let n=0;n<2;n++){
   const s=await state(request,code,students[i].token);
   expect(JSON.stringify(s.blitz.question)).not.toMatch(/answerKey|correctMethod|solutions/);
   const {after}=await task(request,code,students[i].token);
   if(i===2&&n===1){
    expect(after.status).toBe('finished');
    expect(after.quest.achieved).toBe(true);
    expect(after.quest.contributors).toBe(3);
    expect(after.quest.accuracy).toBe(100);
    expect(after.quest.coverage).toBe(100);
    expect(after.quest.finishedReason).toBe('target');
    await command(request,code,students[i].token,{type:'blitz-next'},400);
   }else{
    expect(after.quest.achieved).toBe(false);
    await next(request,code,students[i].token);
   }
  }
 }
 const done=await state(request,code,teacher.token);
 expect(done.players.every(p=>!Object.hasOwn(p,'correct')&&!Object.hasOwn(p,'accuracy'))).toBe(true);
 expect(done.blitz.standings.every(p=>!Object.hasOwn(p,'rank'))).toBe(true);
 await command(request,code,teacher.token,{type:'ceremony-start'});
 let ceremony=await state(request,code,teacher.token);
 const kinds=[];
 for(let n=0;n<ceremony.ceremony.total;n++){
  kinds.push(ceremony.ceremony.slide.kind);
  if(n<ceremony.ceremony.total-1){
   await command(request,code,teacher.token,{type:'ceremony-next'});
   ceremony=await state(request,code,teacher.token);
  }
 }
 expect(kinds).toContain('class-quest');
 expect(kinds).not.toContain('podium');
 const final=await state(request,code,students[0].token);
 expect(final.myMultiplayerAwards?.completed).toBe(true);
});
test('Knowledge Quest uses capped correct decisions and actual verified boards',async({request,isMobile})=>{
 test.skip(isMobile,'Maths backend check is not viewport-specific');
 const host=await create(request,'correct',{game:'match',classCorrect:20}),code=host.code;
 const people=await Promise.all(['Dahlia','Elm','Fern'].map(n=>join(request,code,'Quest '+n)));
 await command(request,code,host.token,{type:'start'});
 for(let i=0;i<people.length;i++){
  for(let k=0;k<2;k++){
   const {after}=await task(request,code,people[i].token,'match');
   if(i===2&&k===1){
    expect(after.status).toBe('finished');
    expect(after.quest.creditedCorrect).toBeGreaterThanOrEqual(20);
    expect(after.quest.contributors).toBe(3);
   }else await next(request,code,people[i].token);
  }
 }
});
test('Everyone Counts needs each student to finish two entirely correct tasks',async({request,isMobile})=>{
 test.skip(isMobile,'Server mathematical checks are viewport-independent');
 const host=await create(request,'everyone',{classPerStudent:2}),code=host.code;
 const people=await Promise.all(['Grove','Hazel','Iris'].map(n=>join(request,code,'Quest '+n)));
 await command(request,code,host.token,{type:'start'});
 for(let i=0;i<people.length;i++){
  for(let k=0;k<2;k++){
   const {after}=await task(request,code,people[i].token,'which',i===0&&k===0);
   if(i===2&&k===1){
    expect(after.status).toBe('playing');
    expect(after.quest.everyoneMet).toBe(2);
    expect(after.quest.goalMet).toBe(false);
   }
   await next(request,code,people[i].token);
  }
 }
 const {after:win}=await task(request,code,people[0].token,'which');
 expect(win.status).toBe('finished');
 expect(win.quest.achieved).toBe(true);
 expect(win.quest.everyoneMet).toBe(3);
});
test('Mastery uses correct method decisions from distinct students in Sort It boards',async({request,isMobile})=>{
 test.skip(isMobile,'Server mathematical checks are viewport-independent');
 const host=await create(request,'mastery',{game:'sort'}),code=host.code;
 const people=await Promise.all(['Juniper','Kestrel','Larch'].map(n=>join(request,code,'Quest '+n)));
 await command(request,code,host.token,{type:'start'});
 // Two independent learners can each cover all five methods, but the
 // third must also complete two checked tasks for class participation.
 let completed=false;
 for(let cycle=0;cycle<12&&!completed;cycle++){
  for(let i=0;i<people.length&&!completed;i++){
   if(i===2&&cycle>=2)continue;
   const current=await state(request,code,people[i].token);
   if(current.status!=='playing'){completed=true;break;}
   const {after}=await task(request,code,people[i].token,'sort');
   if(after.status==='finished'){completed=true;break;}
   await next(request,code,people[i].token);
  }
 }
 const result=await state(request,code,host.token);
 expect(result.status).toBe('finished');
 expect(result.quest.achieved).toBe(true);
 expect(result.quest.methods).toHaveLength(5);
 expect(result.quest.methods.every(m=>m.contributors>=2)).toBe(true);
 expect(result.quest.contributors).toBe(3);
});
test('Class Quest goal and starting roster cannot be manipulated through client commands',async({request,isMobile})=>{
 test.skip(isMobile,'API validation is viewport-independent');
 for(const data of [
  {classMetric:'unknown'}, {classMetric:'correct',classCorrect:21},
  {classMetric:'accuracy',classAccuracy:79},
  {classMetric:'everyone',classPerStudent:0},
  {classMetric:'mastery',classParticipation:10},
  {classMetric:'correct',minutes:16}
 ]){
  const response=await request.post(API+'/rooms',{data:{
   objective:'class',game:'which',roundLength:5,minutes:1,
   classMetric:'accuracy',classAccuracy:80,classCorrect:20,
   classParticipation:80,classPerStudent:2,...data}});
  expect(response.status(),JSON.stringify(data)).toBe(400);
 }
 const host=await create(request,'correct',{classCorrect:20}),code=host.code;
 const a=await join(request,code,'Quest Maple'),b=await join(request,code,'Quest Oak');
 await command(request,code,host.token,{type:'start'},400);
 const c=await join(request,code,'Quest Pine');
 await command(request,code,a.token,{type:'start'},400);
 await command(request,code,host.token,{type:'start'});
 const first=await state(request,code,a.token);
 const q=first.blitz.question;
 await command(request,code,host.token,{type:'blitz-answer',questionKey:q.questionKey,...answer('which',q)},400);
 await command(request,code,a.token,{type:'blitz-answer',
   questionKey:q.questionKey,...answer('which',q),
   achieved:true,score:10000000,correctCount:1000,contributors:45});
 const after=await state(request,code,a.token);
 expect(after.quest.achieved).toBe(false);
 expect(after.blitz.me.score).toBeLessThan(2000);
 await command(request,code,a.token,{type:'blitz-answer',questionKey:q.questionKey,...answer('which',q)},400);
 await command(request,code,host.token,{type:'remove',targetId:c.id||(
  await state(request,code,c.token)).me.id});
 const reduced=await state(request,code,host.token);
 expect(reduced.quest.totalStudents).toBe(3);
 expect(reduced.quest.needed).toBe(3);
 expect(reduced.quest.achieved).toBe(false);
});
test('mobile Class Quest works with teacher hosting, progress, instant feedback and reconnect',async({page,browser,request,isMobile})=>{
 test.skip(isMobile,'A separate 320px student page is used explicitly');
 const pupil=await browser.newPage({viewport:{width:320,height:812},isMobile:true,hasTouch:true});
 const init=async p=>{
  await p.addInitScript(url=>window.__SAMPLING_MULTIPLAYER_API__=url,API);
  await p.goto('/multiplayer.html');
 };
 try{
  await init(page);
  await page.locator('.studio-choice').filter({
   has:page.locator('input[name="studio-objective"][value="class"]')
  }).click();
  await page.locator('#studio-class-metric').selectOption('accuracy');
  await page.locator('#studio-minutes').fill('1');
  await expect(page.locator('#create')).toBeEnabled();
  await page.locator('#create').click();
  await expect(page.locator('#connection')).toHaveText('Live connection',{timeout:15000});
  const code=(await page.locator('#room-id').innerText()).trim();
  await join(request,code,'Quest Rose');
  await join(request,code,'Quest Sage');
  await init(pupil);
  await pupil.locator('#room-code').fill(code);
  await pupil.locator('#nickname').fill('Quest Willow');
  await pupil.locator('#join').click();
  await expect(pupil.locator('#connection')).toHaveText('Live connection',{timeout:15000});
  await page.getByRole('button',{name:'Start Class Quest'}).click();
  await expect(page.locator('#quest-shared-panel')).toBeVisible({timeout:15000});
  await expect(pupil.locator('#quest-shared-panel')).toBeVisible({timeout:15000});
  await expect(pupil.locator('.quest-track')).toHaveCount(2);
  await expect(pupil.locator('#players-heading')).toHaveText('Our class crew');
  const stored=await pupil.evaluate(()=>JSON.parse(sessionStorage.getItem('sampling-arcade-multiplayer-v1')));
  const q=(await state(request,code,stored.token)).blitz.question;
  const correct=answer('which',q);
  const labels={'simple-random':'Simple random sampling',systematic:'Systematic sampling',
   stratified:'Stratified sampling',quota:'Quota sampling',opportunity:'Opportunity sampling'};
  await pupil.locator('.blitz-options .method-option').filter({hasText:labels[correct.method]}).click();
  await expect(pupil.locator('.blitz-answer-review')).toBeVisible({timeout:15000});
  await pupil.reload();
  await expect(pupil.locator('.blitz-answer-review')).toBeVisible({timeout:15000});
  await pupil.getByRole('button',{name:'Next question'}).click();
  await expect(pupil.locator('.blitz-question-number')).toContainText('QUESTION 2');
  expect(await pupil.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'End CLASS QUEST early'}).click();
  await expect(pupil.locator('#stage h2').first()).toContainText('Our Class Quest journey');
 }finally{await pupil.close();}
});
