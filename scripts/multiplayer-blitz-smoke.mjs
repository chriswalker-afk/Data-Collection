import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GAME_SORT_BOARDS} from '../multiplayer/game-bank.js';

const api=(process.env.MULTIPLAYER_API||'').replace(/\/$/,'');
const expected=process.env.EXPECTED_BUILD_SHA||'';
assert.match(api,/^https:\/\/sampling-arcade-(?:(?:blitz-pass2|races-pass3)-test|multiplayer-stage)\.[-\w]+\.workers\.dev$/);
assert.match(expected,/^[a-f\d]{40}$/);
const concepts=JSON.parse(readFileSync('content/concepts.json','utf8')).concepts;
const scenarios=JSON.parse(readFileSync('content/scenarios.json','utf8')).scenarios;
const boards=Object.fromEntries(GAME_SORT_BOARDS.map(item=>[item.id,item]));
async function call(path,method='GET',body,token){
  const r=await fetch(api+path,{method,signal:AbortSignal.timeout(12000),
    headers:{...(body?{'Content-Type':'application/json'}:{}),
      ...(token?{Authorization:'Bearer '+token}:{})},
    ...(body?{body:JSON.stringify(body)}:{})});
  return {status:r.status,data:await r.json()};
}
const equal=(response,status,where)=>{
  assert.equal(response.status,status,where+': '+JSON.stringify(response.data));
  return response.data;
};
const health=equal(await call('/health'),200,'health');
assert.equal(health.ok,true);
assert.equal(health.buildSha,expected,'staging was not deployed from tested PR commit');
assert.ok(health.features.includes('blitz'));
function answer(game,q){
  if(game==='which')return {method:scenarios.find(s=>s.id===q.id).correctMethod};
  if(game==='speed')return {response:concepts.find(c=>c.id===q.id).label};
  if(game==='match')return {pairs:Object.fromEntries(q.terms.map(term=>{
    const definition=concepts.find(c=>c.id===term.id).definition;
    return [term.id,q.definitions.find(d=>d.text===definition).id];
  }))};
  const source=boards[q.id];
  return {placements:Object.fromEntries(q.statements.map(s=>[
    s.id,source.statements.find(x=>x.id===s.id).correctDestination
  ]))};
}
for(const game of ['which','speed','match','sort']){
  const room=equal(await call('/rooms','POST',{
    objective:'blitz',game,minutes:1,roundLength:['which','speed'].includes(game)?5:1
  }),201,'create '+game);
  const code=room.code,p='/rooms/'+code;
  const student=equal(await call(p+'/join','POST',{name:'Staging '+game}),201,'join '+game);
  const action=(token,payload)=>call(p+'/command','POST',payload,token);
  equal(await action(room.token,{type:'start'}),200,'start '+game);
  const before=equal(await call(p+'/state','GET',undefined,student.token),200,'playing '+game);
  assert.equal(before.objective,'blitz');
  const q=before.blitz.question;
  assert.ok(q?.questionKey);
  assert.ok(!/correctTerm|correctMethod|answerKey|solutions|correctDestination/.test(JSON.stringify(q)),
    'Pre-submit key leakage: '+game);
  assert.ok(before.blitz.endAt-before.blitz.serverNow<=60000);
  equal(await action(student.token,{
    type:'blitz-answer',questionKey:q.questionKey,...answer(game,q)
  }),200,'score '+game);
  const marked=equal(await call(p+'/state','GET',undefined,student.token),200,'marked '+game);
  assert.equal(marked.blitz.feedback.correctCount,marked.blitz.feedback.total);
  assert.ok(marked.blitz.me.score>=1000);
  equal(await action(student.token,{
    type:'blitz-answer',questionKey:q.questionKey,...answer(game,q)
  }),400,'no double submission '+game);
  equal(await action(student.token,{type:'blitz-next'}),200,'next '+game);
  const next=equal(await call(p+'/state','GET',undefined,student.token),200,'new task '+game);
  assert.notEqual(next.blitz.question.questionKey,q.questionKey);
  equal(await action(room.token,{type:'close'}),200,'finish '+game);
  const ended=equal(await call(p+'/state','GET',undefined,student.token),200,'results '+game);
  assert.equal(ended.status,'finished');
  assert.equal(ended.blitz.standings[0].correct,marked.blitz.me.correct);
  equal(await action(room.token,{type:'ceremony-start'}),200,'ceremony '+game);
}
console.log('PASS: exact Blitz staging revision, four audited games, secret answers, one-use grading, independent advance, scoring, finish and ceremony.');
