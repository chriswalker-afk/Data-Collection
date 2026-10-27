import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {GAME_SORT_BOARDS} from '../../multiplayer/game-bank.js';

const API='http://127.0.0.1:8787';
const SCENARIOS=JSON.parse(readFileSync(new URL('../../content/scenarios.json',import.meta.url),'utf8')).scenarios;
const concepts=JSON.parse(readFileSync(new URL('../../content/concepts.json',import.meta.url),'utf8')).concepts;
const boards=Object.fromEntries(GAME_SORT_BOARDS.map(x=>[x.id,x]));
const headers=token=>({Authorization:'Bearer '+token});
const route=code=>API+'/rooms/'+code;
async function create(request,game='which',minutes=1) {
 const lengths={which:5,speed:5,match:1,sort:1};
 const res=await request.post(API+'/rooms',{data:{objective:'blitz',game,roundLength:lengths[game],minutes}});
 expect(res.status(),await res.text()).toBe(201);
 return res.json();
}
async function join(request,code,name){
 const res=await request.post(route(code)+'/join',{data:{name}});
 expect(res.status(),await res.text()).toBe(201);
 return res.json();
}
async function command(request,code,token,payload,status=200){
 const res=await request.post(route(code)+'/command',{headers:headers(token),data:payload});
 expect(res.status(),await res.text()).toBe(status);return res.json();
}
async function snapshot(request,code,token){
 const res=await request.get(route(code)+'/state',{headers:headers(token)});
 expect(res.status()).toBe(200);return res.json();
}
async function open(page){
 await page.addInitScript(url=>{window.__SAMPLING_MULTIPLAYER_API__=url;},API);
 await page.goto('/multiplayer.html');
}
const correctPayload=(game,q)=>{
 if(game==='which'){
  const method=SCENARIOS.find(s=>s.id===q.id)?.correctMethod;
  expect(method).toBeTruthy();
  return {method};
 }
 if(game==='speed'){
  const response=concepts.find(x=>x.id===q.id)?.label;
  expect(response).toBeTruthy();return {response};
 }
 if(game==='match'){
  const pairs={};
  for(const term of q.terms){
   const answer=q.definitions.find(def=>def.text===concepts.find(c=>c.id===term.id)?.definition);
   expect(answer).toBeTruthy();
   pairs[term.id]=answer.id;
  }
  return {pairs};
 }
 const source=boards[q.id];expect(source).toBeTruthy();
 return {placements:Object.fromEntries(q.statements.map(st=>{
  const original=source.statements.find(x=>x.id===st.id);
  expect(original).toBeTruthy();
  return [st.id,original.correctDestination];
 }))};
};

test('Blitz room enforces server timer, immutable responses and private feedback',async({request,isMobile})=>{
 test.skip(isMobile,'Server protocol is identical for mobile and desktop.');
 const host=await create(request,'which',1),code=host.code;
 const a=await join(request,code,'Blitz Fox'),b=await join(request,code,'Blitz Otter');
 const pre=await snapshot(request,code,a.token);
 expect(pre.objective).toBe('blitz');
 expect(pre.blitz.question).toBeNull();
 await command(request,code,b.token,{type:'start'},400);
 await command(request,code,host.token,{type:'start'});
 const now=await snapshot(request,code,a.token);
 const other=await snapshot(request,code,b.token);
 const viewer=await snapshot(request,code,host.token);
 expect(now.status).toBe('playing');
 expect(now.question).toBeNull();
 expect(viewer.blitz.question).toBeNull();
 expect(now.blitz.question.index).toBe(1);
 expect(now.blitz.endAt-now.blitz.serverNow).toBeGreaterThan(55000);
 expect(now.blitz.endAt-now.blitz.serverNow).toBeLessThanOrEqual(60000);
 expect(JSON.stringify(now.blitz.question)).not.toMatch(/correctMethod|answerKey|solutions|contrast/);
 expect(JSON.stringify(other)).not.toContain('Correct method:');
 const q=now.blitz.question,answer=correctPayload('which',q);
 await command(request,code,a.token,{type:'blitz-answer',questionKey:q.questionKey,...answer});
 const marked=await snapshot(request,code,a.token);
 expect(marked.blitz.me.correct).toBe(1);
 expect(marked.blitz.feedback.correctCount).toBe(1);
 expect(marked.blitz.feedback.correctMethod).toBe(answer.method);
 expect(marked.blitz.question).toBeNull();
 const unseen=await snapshot(request,code,b.token);
 expect(unseen.blitz.feedback).toBeNull();
 expect(unseen.blitz.me.correct).toBe(0);
 await command(request,code,a.token,{type:'blitz-answer',questionKey:q.questionKey,...answer},400);
 await command(request,code,b.token,{type:'blitz-next'},400);
 await command(request,code,a.token,{type:'blitz-next'});
 const advanced=await snapshot(request,code,a.token);
 expect(advanced.blitz.question.questionKey).not.toBe(q.questionKey);
 expect(advanced.blitz.question.id).not.toBe(q.id);
 expect(advanced.blitz.me.attempts).toBe(1);
 await command(request,code,a.token,{type:'blitz-answer',questionKey:q.questionKey,...answer},400);
 await command(request,code,b.token,{type:'reveal'},400);
 await command(request,code,host.token,{type:'reveal'},400);
 await command(request,code,host.token,{type:'close'});
 const done=await snapshot(request,code,a.token);
 expect(done.status).toBe('finished');
 expect(done.blitz.standings.find(s=>s.id===a.token)).toBeUndefined();
 expect(done.blitz.standings[0].correct).toBe(1);
 await command(request,code,host.token,{type:'ceremony-start'});
 const ceremony=await snapshot(request,code,host.token);
 expect(ceremony.status).toBe('ceremony');
 await command(request,code,host.token,{type:'ceremony-finale'});
 await command(request,code,host.token,{type:'ceremony-end'});
 const receipt=await snapshot(request,code,a.token);
 expect(receipt.myMultiplayerAwards?.completed).toBe(true);
});

test('all four Blitz activities grade audited content without exposing answer keys',async({request,isMobile})=>{
 test.skip(isMobile,'Server-only grading coverage is not viewport-specific.');
 for(const game of ['which','speed','match','sort']){
  const host=await create(request,game),code=host.code;
  const student=await join(request,code,'Blitz '+game);
  await command(request,code,host.token,{type:'start'});
  let state=await snapshot(request,code,student.token);
  expect(state.objective).toBe('blitz');
  const q=state.blitz.question;
  expect(JSON.stringify(q)).not.toMatch(/correctTerm|correctMethod|correctDestination|answerKey|solutions|sourceId/);
  await command(request,code,student.token,{
   type:'blitz-answer',questionKey:q.questionKey,...correctPayload(game,q)
  });
  state=await snapshot(request,code,student.token);
  expect(state.blitz.feedback.correctCount).toBe(state.blitz.feedback.total);
  expect(state.blitz.me.correct).toBe(state.blitz.feedback.total);
  expect(state.blitz.me.score).toBeGreaterThanOrEqual(1000);
  await command(request,code,student.token,{type:'blitz-next'});
  const next=await snapshot(request,code,student.token);
  expect(next.blitz.question?.questionKey).not.toBe(q.questionKey);
  await command(request,code,host.token,{type:'close'});
 }
});

test('teacher can launch Blitz from Host Studio; independent student play survives refresh',async({page,browser,request,isMobile})=>{
 test.skip(isMobile,'This case already uses separate 390px student viewport.');
 const student=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 try{
  await open(page);
  await page.locator('label.studio-choice').filter({
   has:page.locator('input[name="studio-objective"][value="blitz"]')
  }).click();
  await page.locator('#studio-minutes').fill('1');
  await page.locator('#game-mode').selectOption('which');
  await expect(page.locator('#create')).toBeEnabled();
  await page.locator('#create').click();
  await expect(page.locator('#connection')).toHaveText('Live connection',{timeout:15000});
  const code=(await page.locator('#room-id').innerText()).trim();
  await open(student);
  await student.locator('#room-code').fill(code);
  await student.locator('#nickname').fill('Blitz Penguin');
  await student.locator('#join').click();
  await expect(student.locator('#connection')).toHaveText('Live connection',{timeout:15000});
  await page.getByRole('button',{name:'Start Blitz'}).click();
  await expect(student.locator('#blitz-clock')).toBeVisible({timeout:15000});
  await expect(page.locator('#blitz-clock')).toBeVisible({timeout:15000});
  const saved=await student.evaluate(()=>JSON.parse(sessionStorage.getItem('sampling-arcade-multiplayer-v1')));
  const q=(await snapshot(request,code,saved.token)).blitz.question;
  const payload=correctPayload('which',q);
  await student.locator('.blitz-options .method-option').filter({hasText:
   {'simple-random':'Simple random sampling',systematic:'Systematic sampling',
   stratified:'Stratified sampling',quota:'Quota sampling',opportunity:'Opportunity sampling'}[payload.method]
  }).click();
  await expect(student.locator('.blitz-answer-review')).toBeVisible({timeout:15000});
  await expect(student.locator('.blitz-feedback-tally')).toContainText('1 of 1 decisions correct');
  await expect(student.locator('.blitz-live-summary')).toContainText('1 correct');
  await student.reload();
  await expect(student.locator('.blitz-answer-review')).toBeVisible({timeout:15000});
  await student.getByRole('button',{name:'Next question'}).click();
  await expect(student.locator('.blitz-question-number')).toContainText('QUESTION 2');
  expect(await student.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
  const refreshed=await snapshot(request,code,saved.token);
  expect(refreshed.blitz.me.attempts).toBe(1);
  expect(refreshed.blitz.question.questionKey).not.toBe(q.questionKey);
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'End Blitz early'}).click();
  await expect(page.locator('#stage h2')).toContainText('Blitz complete');
  await expect(student.locator('#stage h2')).toContainText('Blitz complete');
 }finally{await student.close();}
});

test('Blitz rejects forged scores, invalid durations and unauthorised commands',async({request,isMobile})=>{
 test.skip(isMobile,'HTTP authorisation is viewport-independent.');
 for(const payload of [
  {objective:'blitz',game:'which',roundLength:5,minutes:0},
  {objective:'blitz',game:'which',roundLength:5,minutes:16},
  {objective:'blitz',game:'which',roundLength:5,minutes:'5'},
  {objective:'blitz',game:'which',roundLength:5,minutes:1.5},
  {objective:'bullseye',game:'which',roundLength:5},
  {objective:'classic',game:'which',roundLength:5,minutes:1}
 ]){
  const rejected=await request.post(API+'/rooms',{data:payload});
  expect(rejected.status(),JSON.stringify(payload)).toBe(400);
 }
 const host=await create(request),code=host.code,student=await join(request,code,'Secure Blitz');
 await command(request,code,host.token,{type:'start'});
 const q=(await snapshot(request,code,student.token)).blitz.question;
 await command(request,code,host.token,{type:'blitz-answer',questionKey:q.questionKey,...correctPayload('which',q)},400);
 await command(request,code,student.token,{type:'teams-set',count:2},400);
 await command(request,code,student.token,{type:'blitz-answer',questionKey:'stale',method:'quota',points:999999},400);
 await command(request,code,student.token,{type:'blitz-answer',questionKey:q.questionKey,...correctPayload('which',q),points:999999});
 const actual=await snapshot(request,code,student.token);
 expect(actual.blitz.me.score).toBeLessThan(2000);
 await command(request,code,host.token,{type:'close'});
 await command(request,code,student.token,{type:'blitz-next'},400);
});

test('server-derived Blitz team averages and no fictional Class Quest victory',async({request,isMobile})=>{
 test.skip(isMobile,'Server team scoring is viewport-independent.');
 const host=await create(request,'which',1),code=host.code;
 await command(request,code,host.token,{type:'teams-set',count:2});
 const players=await Promise.all(['Amber','Birch','Clover','Delta'].map(n=>join(request,code,'Blitz '+n)));
 await command(request,code,host.token,{type:'start'});
 for(const player of players.slice(0,3)){
  const s=await snapshot(request,code,player.token),q=s.blitz.question;
  await command(request,code,player.token,{type:'blitz-answer',
   questionKey:q.questionKey,...correctPayload('which',q)});
 }
 const current=await snapshot(request,code,host.token);
 expect(current.teamCount).toBe(2);
 expect(current.teams).toHaveLength(2);
 expect(current.teams.reduce((n,t)=>n+t.checked,0)).toBe(3);
 expect(current.teams.reduce((n,t)=>n+t.correct,0)).toBe(3);
 expect(current.classQuest).toBeNull();
 expect(current.teams.every(t=>t.coverage<=100)).toBe(true);
 await command(request,code,host.token,{type:'close'});
});
