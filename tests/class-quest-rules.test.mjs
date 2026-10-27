import test from 'node:test';
import assert from 'node:assert/strict';
import {METHODS} from '../multiplayer/rules.js';
import {
 QUEST_METRICS,QUEST_MIN_PLAYERS,QUEST_MAX_CORRECT_CREDIT,
 validClassQuestSettings,initialClassQuest,questMethodEvidence,classQuestProgress,
 classQuestStandings
} from '../multiplayer/class-quest-rules.js';

const settings=(metric='accuracy',other={})=>({
 objective:'class',game:'which',roundLength:5,minutes:5,
 classMetric:metric,classAccuracy:80,classCorrect:20,
 classParticipation:80,classPerStudent:2,...other
});
const players=n=>Array.from({length:n},(_,i)=>({id:'p'+i,score:0,blitz:{attempts:0}}));
function room(metric='accuracy',n=5,other={}){
 const group=players(n),config=settings(metric,other);
 return {objective:'class',status:'playing',game:config.game,players:group,
  results:[],quest:initialClassQuest(config,group)};
}
function check(r,id,correct=1,total=1,methods=[]){
 const p=r.players.find(p=>p.id===id);
 if(p)p.blitz.attempts++;
 r.results.push({playerId:id,index:r.results.length,questionId:'question-'+r.results.length,
  correctCount:correct,total,points:correct*1000,methods});
 return classQuestProgress(r);
}
test('all four goals and teacher targets are strictly server-validated',()=>{
 assert.deepEqual(QUEST_METRICS,['accuracy','correct','mastery','everyone']);
 for(const metric of QUEST_METRICS){
  assert.equal(validClassQuestSettings(settings(metric)),true);
 }
 for(const bad of [
  {classMetric:'unknown'},{classAccuracy:79},{classAccuracy:105},
  {classCorrect:19},{classCorrect:301},{classCorrect:77},
  {classParticipation:45},{classParticipation:101},{classPerStudent:0},
  {classPerStudent:11},{minutes:0},{minutes:16},{minutes:'5'},
  {game:'bogus'},{roundLength:2}
 ])assert.equal(validClassQuestSettings(settings('correct',bad)),false,JSON.stringify(bad));
});
test('Class Quest cannot start with one, two, duplicate or empty identities',()=>{
 for(const members of [[],players(1),players(2),
  [{id:'a'},{id:'a'},{id:'b'}]])assert.throws(()=>initialClassQuest(settings(),members),/at least three/);
 assert.equal(QUEST_MIN_PLAYERS,3);
 assert.deepEqual(initialClassQuest(settings(),players(4)).rosterIds,['p0','p1','p2','p3']);
});
test('ungraded or single-task participation never completes a collective target',()=>{
 const r=room('accuracy',5);
 check(r,'p0',1);check(r,'p1',1);check(r,'p2',1);check(r,'p3',1);
 let s=classQuestProgress(r);
 assert.equal(s.accuracy,100);
 assert.equal(s.contributors,0);
 assert.equal(s.ready,false);
 assert.equal(s.goalMet,false);
 assert.equal(s.needed,4);
 for(const id of ['p0','p1','p2'])check(r,id,1);
 s=classQuestProgress(r);
 assert.equal(s.contributors,3);
 assert.equal(s.goalMet,false);
 assert.equal(s.coverage,60);
 check(r,'p3',1);
 s=classQuestProgress(r);
 assert.equal(s.contributors,4);
 assert.equal(s.goalMet,true);
 assert.equal(s.achieved,false,'Only the Worker can write the finished achievement');
 r.quest.achieved=true;r.quest.finishReason='target';
 assert.equal(classQuestProgress(r).achieved,true);
});
test('Accuracy Quest gives every respondent equal weight and compares unrounded values',()=>{
 const r=room('accuracy',3,{classAccuracy:80,classParticipation:100});
 // One strong student submits many decisions; their volume cannot mask
 // two weaker students. Each must complete two tasks.
 for(let j=0;j<10;j++)check(r,'p0',1);
 for(let j=0;j<2;j++)check(r,'p1',1);
 for(let j=0;j<2;j++)check(r,'p2',0);
 let p=classQuestProgress(r);
 assert.equal(p.accuracy,67);
 assert.equal(p.contributors,3);
 assert.equal(p.goalMet,false);
 for(let j=0;j<8;j++)check(r,'p2',1);
 p=classQuestProgress(r);
 assert.equal(p.accuracy,93);
 assert.equal(p.goalMet,true);
});
test('Knowledge Quest credits at most 20 correct decisions per student',()=>{
 const r=room('correct',3,{classCorrect:40,classParticipation:100});
 for(let j=0;j<100;j++)check(r,'p0',1);
 check(r,'p1',1);check(r,'p1',1);
 check(r,'p2',1);check(r,'p2',1);
 let p=classQuestProgress(r);
 assert.equal(p.correct,104);
 assert.equal(p.creditedCorrect,24);
 assert.equal(p.goalMet,false);
 assert.equal(QUEST_MAX_CORRECT_CREDIT,20);
 for(let j=0;j<16;j++)check(r,'p1',1);
 p=classQuestProgress(r);
 assert.equal(p.creditedCorrect,40);
 assert.equal(p.goalMet,true);
});
test('Mastery requires correct evidence for every method from two distinct students',()=>{
 const r=room('mastery',3,{classParticipation:100});
 for(const method of METHODS){
  check(r,'p0',1,1,[method]);
  check(r,'p0',1,1,[method]); // repeating from p0 cannot meet a method
 }
 for(const method of METHODS)check(r,'p1',1,1,[method]);
 check(r,'p2',1);check(r,'p2',1);
 let p=classQuestProgress(r);
 assert.equal(p.goalMet,false);
 assert.equal(p.methods.every(m=>m.contributors>=2),true);
 assert.equal(p.contributors,3);
 // p0/p1 already cover all methods, and p2 has meaningful work.
 // Goal should be met; the repeated p0 evidence was never double-counted.
 assert.equal(p.goalMet,true);
 const other=room('mastery',3,{classParticipation:100});
 for(let i=0;i<2;i++){
  check(other,'p0',1,1,METHODS.slice(0,4));
  check(other,'p1',1,1,METHODS.slice(0,4));
  check(other,'p2',1,1,METHODS.slice(0,4));
 }
 p=classQuestProgress(other);
 assert.equal(p.methods.at(-1).contributors,0);
 assert.equal(p.goalMet,false);
 check(other,'p0',1,1,[METHODS.at(-1)]);
 assert.equal(classQuestProgress(other).goalMet,false);
 check(other,'p1',1,1,[METHODS.at(-1)]);
 assert.equal(classQuestProgress(other).goalMet,true);
});
test('Everyone Counts counts distinct students with fully correct tasks',()=>{
 const r=room('everyone',5,{classPerStudent:3,classParticipation:80});
 for(const id of ['p0','p1','p2','p3']){
  for(let i=0;i<3;i++)check(r,id,i===0&&id==='p0'?0:1);
 }
 let p=classQuestProgress(r);
 assert.equal(p.everyoneMet,3);
 assert.equal(p.goalMet,false);
 check(r,'p0',1);
 p=classQuestProgress(r);
 assert.equal(p.everyoneMet,4);
 assert.equal(p.goalMet,true);
});
test('frozen starting roster cannot shrink participation targets after leaving',()=>{
 const r=room('accuracy',5,{classParticipation:80});
 for(const id of ['p0','p1','p2']){check(r,id);check(r,id);}
 assert.equal(classQuestProgress(r).needed,4);
 r.players=r.players.filter(p=>p.id!=='p3'&&p.id!=='p4');
 assert.equal(classQuestProgress(r).totalStudents,5);
 assert.equal(classQuestProgress(r).coverage,60);
 assert.equal(classQuestProgress(r).goalMet,false);
});
test('method mastery evidence comes from checked audited answers in every game',()=>{
 for(const method of METHODS){
  const item={correctMethod:method};
  assert.deepEqual(questMethodEvidence('which',item,{method},{correctCount:1,total:1}),[method]);
  assert.deepEqual(questMethodEvidence('which',item,{method:'quota'},{correctCount:0,total:1}),[]);
  assert.deepEqual(questMethodEvidence('speed',{id:method+'-sampling'},{response:'ok'},{correctCount:1,total:1}),[method]);
 }
 const item={answerKey:{'simple-random-sampling':'def0','quota-sampling':'def1'}};
 assert.deepEqual(questMethodEvidence('match',item,{
  pairs:{'simple-random-sampling':'def0','quota-sampling':'wrong'}
 },{correctCount:1,total:2}),['simple-random']);
 const sort={solutions:[
  {id:'one',correctDestination:'stratified:advantage'},
  {id:'two',correctDestination:'opportunity:disadvantage'}
 ]};
 assert.deepEqual(questMethodEvidence('sort',sort,{
  placements:{one:'stratified:advantage',two:'quota:disadvantage'}
 },{correctCount:1,total:2}),['stratified']);
});
test('Class Quest shows no ranked students, only checked contribution status',()=>{
 const r=room('everyone',3);
 check(r,'p0',1);check(r,'p0',1);
 const s=classQuestStandings(r);
 assert.equal(s.find(p=>p.id==='p0').contributed,true);
 assert.ok(s.every(p=>!Object.hasOwn(p,'rank')&&!Object.hasOwn(p,'score')));
});
