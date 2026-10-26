import test from 'node:test';
import assert from 'node:assert/strict';
import {balancedRound,cleanNickname,scoreAnswer,validRoomCode} from '../multiplayer/rules.js';
import {SCENARIOS} from '../multiplayer/scenarios.js';
test('every length has a balanced set of mathematically audited scenarios',()=>{
 for(const length of [5,10,20]){
  const round=balancedRound(SCENARIOS,length,(max)=>max-1);
  assert.equal(round.length,length);
  assert.equal(new Set(round.map(item=>item.id)).size,length);
  for(const method of ['simple-random','systematic','stratified','quota','opportunity'])
   assert.equal(round.filter(q=>q.correctMethod===method).length,length/5);
 }
});
test('safe nicknames and room codes',()=>{
 assert.equal(cleanNickname('<script>'),null);
 assert.equal(cleanNickname('  Maths   Star '),'Maths Star');
 assert.equal(cleanNickname('A'),null);
 assert.equal(validRoomCode('024167'),true);
 assert.equal(validRoomCode('123'),false);
 assert.equal(validRoomCode('1234567'),false);
});
test('accuracy dominates speed and no points on wrong answers',()=>{
 assert.equal(scoreAnswer(false,0,20000),0);
 assert.equal(scoreAnswer(true,20000,20000),1000);
 assert.equal(scoreAnswer(true,0,20000),1100);
});
test('questions retain reviewed reasons and contrasts',()=>{
 for(const s of SCENARIOS){assert.ok(s.prompt&&s.reason&&s.contrast);assert.ok(s.correctMethod);}
});
