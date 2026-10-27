import test from 'node:test';
import assert from 'node:assert/strict';
import {SCENARIOS} from '../multiplayer/scenarios.js';
import {GAME_MODES,gradeGameAnswer} from '../multiplayer/modes.js';
import {
 validBlitzSettings,blitzDeadlineReached,makeBlitzDeck,newBlitzOrder,initialBlitzPlayer,
 advanceBlitzQuestion,currentBlitzItem,blitzQuestionKey,blitzStandings,BLITZ_MAX_ATTEMPTS
} from '../multiplayer/blitz-rules.js';
const random=()=>0;
test('Blitz accepts only audited games and bounded whole-minute limits',()=>{
 for(const [game,definition] of Object.entries(GAME_MODES))
   for(const length of definition.lengths){
     assert.equal(validBlitzSettings(game,length,1),true);
     assert.equal(validBlitzSettings(game,length,15),true);
   }
 for(const minutes of [0,0.1,1.5,16,100,NaN,Infinity,'5',null])
   assert.equal(validBlitzSettings('which',5,minutes),false);
 assert.equal(validBlitzSettings('which',4,5),false);
 assert.equal(validBlitzSettings('bogus',5,5),false);
 assert.equal(BLITZ_MAX_ATTEMPTS,400);
});
test('Blitz has a private and complete audited bank for every activity',()=>{
 for(const game of Object.keys(GAME_MODES)){
   const deck=makeBlitzDeck(game,SCENARIOS,random);
   assert.ok(deck.length>=3,game);
   assert.equal(new Set(deck.map(item=>item.id)).size,deck.length,game+' unique IDs');
   const actual=game==='which'?deck.filter(q=>q.correctMethod):deck;
   assert.equal(actual.length,deck.length);
   if(game==='which'){
     assert.equal(new Set(deck.map(q=>q.correctMethod)).size,5);
     assert.equal(deck.length,SCENARIOS.length);
   }
   if(game==='speed')assert.ok(deck.every(q=>typeof q.label==='string'));
   if(game==='sort')assert.equal(deck.length,10);
 }
});
test('new question order contains each item once and never immediately repeats previous cycle',()=>{
 const order=newBlitzOrder(20,null,random);
 assert.equal(new Set(order).size,20);
 const second=newBlitzOrder(20,order.at(-1),random);
 assert.notEqual(second[0],order.at(-1));
 assert.deepEqual([...second].sort((a,b)=>a-b),Array.from({length:20},(_,i)=>i));
});
test('each player receives independent progress, a new question after checked feedback, and immutable sequence keys',()=>{
 const deck=makeBlitzDeck('which',SCENARIOS,random);
 const first={id:'student-1',score:0,blitz:initialBlitzPlayer(deck.length,100,random)};
 const second={id:'student-2',score:0,blitz:initialBlitzPlayer(deck.length,100,random)};
 const room={deck};
 const firstItem=currentBlitzItem(room,first);
 assert.ok(firstItem?.correctMethod);
 const firstKey=blitzQuestionKey(first);
 first.blitz.attempts++;
 first.blitz.feedback={points:1000};
 advanceBlitzQuestion(first,deck.length,500,random);
 assert.equal(first.blitz.feedback,null);
 assert.equal(first.blitz.questionStarted,500);
 assert.notEqual(blitzQuestionKey(first),firstKey);
 assert.notEqual(currentBlitzItem(room,first),firstItem);
 assert.equal(second.blitz.attempts,0);
 assert.equal(second.blitz.questionStarted,100);
 assert.throws(()=>advanceBlitzQuestion(first,deck.length,600,random),/current question/);
});
test('Blitz preserves unchanged secure grading semantics for scenarios and boards',()=>{
 for(const game of Object.keys(GAME_MODES)){
   const item=makeBlitzDeck(game,SCENARIOS,random)[0];
   const payload=game==='which'?{method:item.correctMethod}:
     game==='speed'?{response:item.label}:
     game==='match'?{pairs:{...item.answerKey}}:
     {placements:Object.fromEntries(item.solutions.map(x=>[x.id,x.correctDestination]))};
   const mark=gradeGameAnswer(game,item,payload,5000,GAME_MODES[game].seconds*1000);
   assert.equal(mark.correctCount,mark.total);
   assert.ok(mark.points>=1000);
   if(game==='which')assert.equal(gradeGameAnswer(game,item,{method:'invalid'},0,20000).error!==undefined,true);
   if(game==='match')assert.equal(gradeGameAnswer(game,item,{pairs:{}},0,75000).error!==undefined,true);
 }
});
test('Blitz standings prioritise correct mathematics over speed and use exact accuracy ties',()=>{
 const makePlayer=(id,correct,checked,attempts,score)=>({id,score,
   blitz:{correct,checked,attempts}});
 const room={players:[
   makePlayer('fast',9,10,10,9900),
   makePlayer('accurate',10,10,10,10000),
   makePlayer('equal-slow',9,10,10,9000),
   makePlayer('no-answers',0,0,0,0)
 ]};
 const rows=blitzStandings(room);
 assert.deepEqual(rows.map(x=>x.id),['accurate','fast','equal-slow','no-answers']);
 assert.deepEqual(rows.map(x=>x.rank),[1,2,3,null]);
 assert.equal(rows[0].accuracy,100);
});
test('Blitz standings break equal-correct ties by actual accuracy before speed points',()=>{
 const room={players:[
   {id:'low',score:9900,blitz:{correct:9,checked:12,attempts:12}},
   {id:'high',score:9000,blitz:{correct:9,checked:10,attempts:10}},
   {id:'also-high',score:9000,blitz:{correct:9,checked:10,attempts:10}}
 ]};
 assert.deepEqual(blitzStandings(room).map(x=>[x.id,x.rank]),[
   ['also-high',1],['high',1],['low',3]
 ]);
});
test('zero-correct participants never receive invented awards ranks',()=>{
 const room={players:[{id:'a',score:0,blitz:{correct:0,checked:3,attempts:3}}]};
 assert.deepEqual(blitzStandings(room).map(x=>x.rank),[null]);
});

test('the exact shared server deadline ends Blitz without granting extra time',()=>{
 const deadline=500000;
 assert.equal(blitzDeadlineReached(deadline,deadline-1),false);
 assert.equal(blitzDeadlineReached(deadline,deadline),true);
 assert.equal(blitzDeadlineReached(deadline,deadline+1),true);
 assert.equal(blitzDeadlineReached(0,deadline),false);
 assert.equal(blitzDeadlineReached(deadline,NaN),false);
});
