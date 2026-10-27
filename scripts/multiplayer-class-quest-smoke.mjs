import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GAME_SORT_BOARDS} from '../multiplayer/game-bank.js';

const api=(process.env.MULTIPLAYER_API||'').replace(/\/$/,'');
const revision=process.env.EXPECTED_BUILD_SHA||'';
assert.match(api,/^https:\/\/sampling-arcade-(?:class-quest-pass4-test|multiplayer-stage)\.[\w-]+\.workers\.dev$/);
assert.match(revision,/^[0-9a-f]{40}$/);
const scenes=JSON.parse(readFileSync('content/scenarios.json','utf8')).scenarios;
const concepts=JSON.parse(readFileSync('content/concepts.json','utf8')).concepts;
const sort=new Map(GAME_SORT_BOARDS.map(x=>[x.id,x]));
async function call(path,method='GET',body,token){
 const response=await fetch(api+path,{
  method,signal:AbortSignal.timeout(15000),
  headers:{...(body?{'content-type':'application/json'}:{}),
   ...(token?{Authorization:'Bearer '+token}:{})},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 return {status:response.status,data:await response.json()};
}
function expected(value,status,context){
 assert.equal(value.status,status,context+': '+JSON.stringify(value.data));return value.data;
}
const health=expected(await call('/health'),200,'health');
assert.equal(health.buildSha,revision,'This Worker is NOT the tested PR revision');
assert.ok(health.features.includes('class-quest'));
function answer(game,q){
 if(game==='which')return {method:scenes.find(x=>x.id===q.id).correctMethod};
 if(game==='speed')return {response:concepts.find(x=>x.id===q.id).label};
 if(game==='match')return {pairs:Object.fromEntries(q.terms.map(t=>[
  t.id,q.definitions.find(d=>d.text===concepts.find(x=>x.id===t.id).definition).id
 ]))};
 const board=sort.get(q.id);
 assert.ok(board,'Missing audited Sort It! board '+q.id);
 return {placements:Object.fromEntries(q.statements.map(x=>[
  x.id,board.statements.find(s=>s.id===x.id).correctDestination
 ]))};
}
async function classroom(metric,game){
 const code=expected(await call('/rooms','POST',{
  objective:'class',game,roundLength:game==='sort'||game==='match'?1:5,minutes:1,
  classMetric:metric,classAccuracy:80,classCorrect:20,
  classParticipation:80,classPerStudent:2
 }),201,'Create '+metric);
 const people=[];
 const prefix='/rooms/'+code.code;
 for(let i=0;i<3;i++){
  people.push(expected(await call(prefix+'/join','POST',
   {name:'Quest '+metric+' '+i}),201,'Join '+metric));
 }
 const action=(token,body)=>call(prefix+'/command','POST',body,token);
 const state=(token)=>call(prefix+'/state','GET',undefined,token);
 expected(await action(code.token,{type:'start'}),200,'Start '+metric);
 return {code:code.code,host:code.token,people,action,state};
}
async function complete(room,student,game){
 const current=expected(await room.state(student.token),200,'Current '+game);
 assert.equal(current.status,'playing','Quest unexpectedly ended before mathematical evidence was complete');
 const q=current.blitz.question;
 assert.ok(q?.questionKey);
 assert.doesNotMatch(JSON.stringify(q),/answerKey|correctMethod|solutions|correctTerm/);
 expected(await room.action(student.token,{
  type:'blitz-answer',questionKey:q.questionKey,...answer(game,q)
 }),200,'Answer '+game);
 const marked=expected(await room.state(student.token),200,'Marked '+game);
 assert.ok(marked.blitz.feedback.correctCount>0,'Checked answer did not count');
 return marked;
}
for(const [metric,game] of [['accuracy','which'],['correct','match'],['everyone','speed']]){
 const room=await classroom(metric,game);
 let done;
 for(const student of room.people){
  for(let n=0;n<2;n++){
   done=await complete(room,student,game);
   if(done.status==='playing')
     expected(await room.action(student.token,{type:'blitz-next'}),200,'Next '+metric);
  }
 }
 assert.equal(done.status,'finished',metric+' failed to complete');
 assert.equal(done.quest.achieved,true);
 assert.equal(done.quest.contributors,3);
 assert.equal(done.quest.totalStudents,3);
 assert.equal(done.quest.needed,3);
 assert.ok(done.players.every(p=>p.score===0),'Classroom exposed individual marks');
 expected(await room.action(room.host,{type:'ceremony-start'}),200,'Ceremony '+metric);
}
const mastery=await classroom('mastery','sort');
let result=null,completeGoal=false;
for(let cycle=0;cycle<12&&!completeGoal;cycle++){
 for(let i=0;i<3&&!completeGoal;i++){
  if(i===2&&cycle>=2)continue;
  const state=expected(await mastery.state(mastery.people[i].token),200,'Mastery progress');
  if(state.status==='finished'){completeGoal=true;break;}
  result=await complete(mastery,mastery.people[i],'sort');
  if(result.status==='finished'){completeGoal=true;break;}
  expected(await mastery.action(mastery.people[i].token,{type:'blitz-next'}),200,'Mastery advance');
 }
}
assert.equal(result?.quest?.achieved,true,'All five methods must be evidenced by two different students');
assert.equal(result.quest.methods.length,5);
assert.ok(result.quest.methods.every(m=>m.contributors>=2));
assert.equal(result.quest.contributors,3);
console.log('PASS: exact Class Quest staging revision, four goals, three contributors, five methods, private marks, server grading and ceremony.');
