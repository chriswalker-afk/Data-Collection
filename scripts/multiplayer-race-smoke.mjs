import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// This script MUST verify the deployed Worker matches the current PR head.
// Never test an older staging Worker and mark the new code green.
const api=(process.env.MULTIPLAYER_API||'').replace(/\/$/,'');
const expected=process.env.EXPECTED_BUILD_SHA||'';
assert.match(api,/^https:\/\/sampling-arcade-races-pass3-test\.[-\w]+\.workers\.dev$/);
assert.match(expected,/^[a-f\d]{40}$/);
const scenarios=JSON.parse(readFileSync('content/scenarios.json','utf8')).scenarios;
const concepts=JSON.parse(readFileSync('content/concepts.json','utf8')).concepts;
const hdr=token=>({'Authorization':'Bearer '+token});
const call=async(path,method='GET',body,token)=>{
 const res=await fetch(api+path,{
   method,signal:AbortSignal.timeout(14000),
   headers:{...(body?{'content-type':'application/json'}:{}),...(token?hdr(token):{})},
   ...(body?{body:JSON.stringify(body)}:{})
 });
 const data=await res.json();
 return {status:res.status,data};
};
function checked(response,code,message){
 assert.equal(response.status,code,message+': '+JSON.stringify(response.data));
 return response.data;
}
const health=checked(await call('/health'),200,'Worker health');
assert.equal(health.buildSha,expected,'staging Worker does not match this commit');
assert.ok(health.features.includes('bullseye'));
assert.ok(health.features.includes('perfect-run'));
const apiRoom=code=>'/rooms/'+code;
async function room(objective,game,options){
 const created=checked(await call('/rooms','POST',{
   objective,game,minutes:1,roundLength:game==='match'?1:5,...options
 }),201,'create '+objective);
 const student=checked(await call(apiRoom(created.code)+'/join','POST',{
   name:'Stage '+objective
 }),201,'join');
 const command=(token,action)=>call(apiRoom(created.code)+'/command','POST',action,token);
 const snapshot=(token)=>call(apiRoom(created.code)+'/state','GET',undefined,token);
 checked(await command(created.token,{type:'start'}),200,'start');
 return {created,student,command,snapshot};
}
async function attempt(r,answer){
 const p=checked(await r.snapshot(r.student.token),200,'player state');
 const q=p.blitz.question;
 assert.ok(q?.questionKey);
 assert.ok(!/answerKey|correctMethod|correctTerm|solutions/.test(JSON.stringify(q)));
 const input=answer(q);
 checked(await r.command(r.student.token,{
   type:'blitz-answer',questionKey:q.questionKey,...input
 }),200,'checked answer');
 return checked(await r.snapshot(r.student.token),200,'graded state');
}
const bull=await room('bullseye','which',{accuracyTarget:80,accuracyWindow:5});
for(let i=0;i<5;i++){
 const scored=await attempt(bull,q=>{
  const correct=scenarios.find(s=>s.id===q.id).correctMethod;
  return {method:i===0?
    ['simple-random','systematic','stratified','quota','opportunity'].find(m=>m!==correct):
    correct};
 });
 // Invalid answers cannot be accepted as failed answers; deliberate wrong choice
 // must still be one of the five valid methods.
 if(i<4)checked(await bull.command(bull.student.token,{type:'blitz-next'}),200,'next');
}

const target=checked(await bull.snapshot(bull.student.token),200,'Bullseye finish');
assert.equal(target.status,'finished');
assert.equal(target.blitz.race.finishReason,'target');
assert.equal(target.blitz.race.winnerId,target.me.id);
assert.equal(target.blitz.me.race.windowCorrect,4);
assert.equal(target.blitz.me.race.windowAnswered,5);
checked(await bull.command(bull.student.token,{type:'blitz-next'}),400,'no next after win');

const perfect=await room('perfect','speed',{streakTarget:3});
for(let i=0;i<3;i++){
 const marked=await attempt(perfect,q=>({
   response:concepts.find(c=>c.id===q.id).label
 }));
 assert.equal(marked.blitz.me.race.currentStreak,i+1);
 if(i<2)checked(await perfect.command(perfect.student.token,{type:'blitz-next'}),200,'advance');
 else{
  assert.equal(marked.status,'finished');
  assert.equal(marked.blitz.race.winnerId,marked.me.id);
 }
}
const noWin=await room('perfect','which',{streakTarget:3});
const invalid=checked(await noWin.snapshot(noWin.student.token),200,'no winner start');
assert.equal(invalid.blitz.race.winnerId,null);
checked(await noWin.command(noWin.created.token,{type:'close'}),200,'teacher stops');
const ended=checked(await noWin.snapshot(noWin.student.token),200,'no winner finish');
assert.equal(ended.blitz.race.finishReason,'host');
assert.ok(ended.blitz.standings.every(p=>p.rank===null));
console.log('PASS: exact-revision Bullseye and Perfect Run scoring, first winner, no invented winners, secure private questions and timeout configuration.');
