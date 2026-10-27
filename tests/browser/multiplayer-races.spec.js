import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

const API='http://127.0.0.1:8787';
const scenarios=JSON.parse(readFileSync(new URL('../../content/scenarios.json',import.meta.url),'utf8')).scenarios;
const concepts=JSON.parse(readFileSync(new URL('../../content/concepts.json',import.meta.url),'utf8')).concepts;
const lengths={which:5,speed:5,match:1,sort:1};
const headers=token=>({Authorization:'Bearer '+token});
const route=code=>API+'/rooms/'+code;
async function create(request,objective,options={}){
 const game=options.game||'which';
 const payload={
  objective,game,roundLength:lengths[game],minutes:options.minutes||1,
  ...(objective==='bullseye'?{
   accuracyTarget:options.accuracyTarget||80,accuracyWindow:options.accuracyWindow||5
  }:{streakTarget:options.streakTarget||3})
 };
 const r=await request.post(API+'/rooms',{data:payload});
 expect(r.status(),JSON.stringify(await r.text())).toBe(201);
 return r.json();
}
async function join(request,code,name){
 const r=await request.post(route(code)+'/join',{data:{name}});
 expect(r.status(),await r.text()).toBe(201);return r.json();
}
async function cmd(request,code,token,payload,expected=200){
 const r=await request.post(route(code)+'/command',{headers:headers(token),data:payload});
 expect(r.status(),JSON.stringify(payload)+' '+await r.text()).toBe(expected);
 return r.json();
}
async function state(request,code,token){
 const r=await request.get(route(code)+'/state',{headers:headers(token)});
 expect(r.status()).toBe(200);return r.json();
}
function answer(game,q){
 if(game==='which')return {method:scenarios.find(x=>x.id===q.id).correctMethod};
 if(game==='speed')return {response:concepts.find(x=>x.id===q.id).label};
 if(game==='match')return {pairs:Object.fromEntries(q.terms.map(t=>[
  t.id,q.definitions.find(d=>d.text===concepts.find(c=>c.id===t.id).definition).id
 ]))};
 throw new Error('Unexpected test activity');
}
async function completeTask(request,code,token,game,wrong=false){
 const before=await state(request,code,token);
 const q=before.blitz.question;
 expect(q?.questionKey).toBeTruthy();
 const input=answer(game,q);
 if(wrong&&game==='which')input.method=
   ['simple-random','stratified','systematic','quota','opportunity'].find(m=>m!==input.method);
 if(wrong&&game==='match'){
  const ids=Object.keys(input.pairs);
  const a=input.pairs[ids[0]];
  input.pairs[ids[0]]=input.pairs[ids[1]];
  input.pairs[ids[1]]=a;
 }
 await cmd(request,code,token,{type:'blitz-answer',questionKey:q.questionKey,...input});
 return {q,after:await state(request,code,token),input};
}
async function next(request,code,token){await cmd(request,code,token,{type:'blitz-next'});}

test('Bullseye requires full rolling window, counts only full tasks and names first winner',async({request,isMobile})=>{
 test.skip(isMobile,'Server-authenticated race scoring is viewport-independent.');
 const teacher=await create(request,'bullseye');
 const alice=await join(request,teacher.code,'Accuracy Ace');
 const bob=await join(request,teacher.code,'Target Tester');
 const code=teacher.code;
 await cmd(request,code,teacher.token,{type:'start'});
 const first=await state(request,code,alice.token);
 expect(first.blitz.race.objective).toBe('bullseye');
 expect(first.blitz.race.accuracyWindow).toBe(5);
 expect(first.blitz.race.target).toBe(80);
 expect(first.blitz.endAt-first.blitz.serverNow).toBeGreaterThan(55000);
 expect(first.question).toBeNull();
 expect(JSON.stringify(first.blitz.question)).not.toMatch(/answerKey|correctMethod|solutions|correctTerm/);
 for(let i=0;i<5;i++){
  const {after,q}=await completeTask(request,code,alice.token,'which',i===0);
  expect(after.blitz.me.race.windowAnswered).toBe(i+1);
  if(i<4){
   expect(after.blitz.me.race.ready).toBe(false);
   expect(after.status).toBe('playing');
   await next(request,code,alice.token);
  }else{
   expect(after.status).toBe('finished');
   expect(after.blitz.me.race.windowCorrect).toBe(4);
   expect(after.blitz.me.race.windowAccuracy).toBe(80);
   expect(after.blitz.race.finishReason).toBe('target');
   expect(after.blitz.race.winnerId).toBe(alice.id||after.me.id);
   expect(after.blitz.standings.filter(p=>p.rank===1)).toHaveLength(1);
   expect(after.blitz.feedback).toBeTruthy();
   await cmd(request,code,alice.token,{type:'blitz-answer',questionKey:q.questionKey,method:'quota'},400);
   await cmd(request,code,bob.token,{type:'blitz-next'},400);
  }
 }
 const other=await state(request,code,bob.token);
 expect(other.blitz.feedback).toBeNull();
 expect(other.blitz.race.winnerId).toBe((await state(request,code,alice.token)).me.id);
 await cmd(request,code,teacher.token,{type:'ceremony-start'});
 const ceremony=await state(request,code,teacher.token);
 expect(ceremony.status).toBe('ceremony');
 expect(JSON.stringify(ceremony.ceremony.slide)).not.toMatch(/correctMethod|answerKey/);
});

test('Perfect Run resets on a partly correct board, then ends exactly on full streak',async({request,isMobile})=>{
 test.skip(isMobile,'HTTP scoring is not viewport-specific.');
 const teacher=await create(request,'perfect',{game:'match',streakTarget:3});
 const code=teacher.code,p=await join(request,code,'Streak Stoat');
 await cmd(request,code,teacher.token,{type:'start'});
 let result=await completeTask(request,code,p.token,'match',false);
 expect(result.after.blitz.me.race.currentStreak).toBe(1);
 await next(request,code,p.token);
 result=await completeTask(request,code,p.token,'match',true);
 expect(result.after.blitz.feedback.correctCount).toBeLessThan(6);
 expect(result.after.blitz.me.race.currentStreak).toBe(0);
 expect(result.after.blitz.me.race.bestStreak).toBe(1);
 await next(request,code,p.token);
 for(let i=1;i<=3;i++){
  result=await completeTask(request,code,p.token,'match',false);
  expect(result.after.blitz.me.race.currentStreak).toBe(i);
  if(i<3){expect(result.after.status).toBe('playing');await next(request,code,p.token);}
  else{
   expect(result.after.status).toBe('finished');
   expect(result.after.blitz.race.finishReason).toBe('target');
   expect(result.after.blitz.race.winnerId).toBe(result.after.me.id);
   expect(result.after.blitz.me.race.bestStreak).toBe(3);
  }
 }
});
test('without a target achievement there is no fictitious winner or podium',async({request,isMobile})=>{
 test.skip(isMobile,'Server result rules are viewport-independent.');
 const teacher=await create(request,'perfect'),code=teacher.code;
 const p=await join(request,code,'Learning Lynx');
 await cmd(request,code,teacher.token,{type:'start'});
 const {after}=await completeTask(request,code,p.token,'which',true);
 expect(after.blitz.me.race.currentStreak).toBe(0);
 await cmd(request,code,teacher.token,{type:'close'});
 const ended=await state(request,code,p.token);
 expect(ended.status).toBe('finished');
 expect(ended.blitz.race.finishReason).toBe('host');
 expect(ended.blitz.race.winnerId).toBeNull();
 expect(ended.blitz.standings.every(x=>x.rank===null)).toBe(true);
 await cmd(request,code,teacher.token,{type:'ceremony-start'});
 const ceremony=await state(request,code,teacher.token);
 expect(ceremony.status).toBe('ceremony');
});
test('team race is attributed to winning student team, not larger raw scores',async({request,isMobile})=>{
 test.skip(isMobile,'Team ordering is deterministic on the Worker.');
 const teacher=await create(request,'perfect'),code=teacher.code;
 await cmd(request,code,teacher.token,{type:'teams-set',count:2});
 const players=await Promise.all(['Falcon','Frog','Fox','Finch'].map(name=>join(request,code,'Race '+name)));
 await cmd(request,code,teacher.token,{type:'start'});
 const p=players[1];
 for(let i=0;i<3;i++){
  const r=await completeTask(request,code,p.token,'which');
  if(i<2)await next(request,code,p.token);
 }
 const finished=await state(request,code,teacher.token);
 expect(finished.status).toBe('finished');
 const winner=finished.players.find(x=>x.id===finished.blitz.race.winnerId);
 expect(winner).toBeTruthy();
 expect(finished.blitz.race.winningTeamId).toBe(winner.teamId);
 expect(finished.teams[0].id).toBe(winner.teamId);
 expect(finished.teams[0].rank).toBe(1);
 expect(finished.teams.filter(x=>x.rank===1)).toHaveLength(1);
});
test('race rejects invalid parameters and forged grades without granting any victory',async({request,isMobile})=>{
 test.skip(isMobile,'API input validation does not depend on a viewport.');
 for(const data of [
  {objective:'bullseye',game:'which',roundLength:5,minutes:1,accuracyTarget:79,accuracyWindow:5},
  {objective:'bullseye',game:'which',roundLength:5,minutes:1,accuracyTarget:100,accuracyWindow:4},
  {objective:'bullseye',game:'which',roundLength:5,minutes:1,accuracyTarget:101,accuracyWindow:10},
  {objective:'perfect',game:'which',roundLength:5,minutes:1,streakTarget:2},
  {objective:'perfect',game:'which',roundLength:5,minutes:1,streakTarget:21},
  {objective:'perfect',game:'which',roundLength:5,minutes:'1',streakTarget:3},
  {objective:'perfect',game:'which',roundLength:5,minutes:0,streakTarget:3}
 ]){
  const response=await request.post(API+'/rooms',{data});
  expect(response.status(),JSON.stringify(data)).toBe(400);
 }
 const teacher=await create(request,'perfect'),code=teacher.code;
 const student=await join(request,code,'Integrity Ibis');
 await cmd(request,code,student.token,{type:'start'},400);
 await cmd(request,code,teacher.token,{type:'start'});
 const before=await state(request,code,student.token);
 const q=before.blitz.question;
 await cmd(request,code,teacher.token,{
  type:'blitz-answer',questionKey:q.questionKey,...answer('which',q)
 },400);
 await cmd(request,code,student.token,{
  type:'blitz-answer',questionKey:'forged',method:'quota',winnerId:'hijacked',score:1000000
 },400);
 await cmd(request,code,student.token,{
  type:'blitz-answer',questionKey:q.questionKey,...answer('which',q),
  winnerId:'hijacked',targetReached:true,score:999999
 });
 const checked=await state(request,code,student.token);
 expect(checked.blitz.me.score).toBeLessThan(2000);
 expect(checked.blitz.me.race.currentStreak).toBe(1);
 expect(checked.blitz.race.winnerId).toBeNull();
 await cmd(request,code,student.token,{
  type:'blitz-answer',questionKey:q.questionKey,...answer('which',q)
 },400);
});
test('mobile student's Perfect Run progress and feedback survive a refresh',async({page,browser,request,isMobile})=>{
 test.skip(isMobile,'This test explicitly opens a separate mobile student browser.');
 const student=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 try{
  const init=async p=>{
   await p.addInitScript(url=>{window.__SAMPLING_MULTIPLAYER_API__=url;},API);
   await p.goto('/multiplayer.html');
  };
  await init(page);
  await page.locator('label.studio-choice').filter({
   has:page.locator('input[name="studio-objective"][value="perfect"]')
  }).click();
  await page.locator('#studio-streak-target').fill('3');
  await page.locator('#studio-minutes').fill('1');
  await expect(page.locator('#create')).toBeEnabled();
  await page.locator('#create').click();
  await expect(page.locator('#connection')).toHaveText('Live connection',{timeout:15000});
  const code=(await page.locator('#room-id').innerText()).trim();
  await init(student);
  await student.locator('#room-code').fill(code);
  await student.locator('#nickname').fill('Mobile Mongoose');
  await student.locator('#join').click();
  await expect(student.locator('#connection')).toHaveText('Live connection',{timeout:15000});
  await page.getByRole('button',{name:'Start Perfect Run'}).click();
  await expect(student.locator('#blitz-clock')).toBeVisible({timeout:15000});
  await expect(student.locator('.blitz-race-progress')).toContainText('Streak 0 of 3');
  const saved=await student.evaluate(()=>JSON.parse(sessionStorage.getItem('sampling-arcade-multiplayer-v1')));
  const q=(await state(request,code,saved.token)).blitz.question;
  const input=answer('which',q);
  const label={'simple-random':'Simple random sampling',stratified:'Stratified sampling',
   systematic:'Systematic sampling',quota:'Quota sampling',opportunity:'Opportunity sampling'}[input.method];
  await student.locator('.blitz-options .method-option').filter({hasText:label}).click();
  await expect(student.locator('.blitz-answer-review')).toBeVisible({timeout:15000});
  await expect(student.locator('.blitz-hint').filter({hasText:'Current perfect run'})).toBeVisible();
  await student.reload();
  await expect(student.locator('.blitz-answer-review')).toBeVisible({timeout:15000});
  await student.getByRole('button',{name:'Next question'}).click();
  await expect(student.locator('.blitz-question-number')).toContainText('QUESTION 2');
  expect(await student.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'End PERFECT RUN early'}).click();
  await expect(student.locator('#stage h2')).toContainText('Perfect Run complete');
 }finally{await student.close();}
});
