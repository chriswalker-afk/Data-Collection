import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseMatch,matchNextStep,matchStatus,MATCH_MOTION_MS} from '../src/match-up.js';

const empty={selectedTerm:null,selectedDefinition:null,resolving:null};

test('Match Up accepts either side first and never claims a match after only one selection',()=>{
 const term=chooseMatch(empty,'term','census');
 assert.deepEqual(term,{selectedTerm:'census',selectedDefinition:null,complete:false,correct:null});
 const definition=chooseMatch(empty,'definition','census');
 assert.deepEqual(definition,{selectedTerm:null,selectedDefinition:'census',complete:false,correct:null});
 assert.deepEqual(chooseMatch(term,'definition','census'),
   {selectedTerm:'census',selectedDefinition:'census',complete:true,correct:true});
 assert.deepEqual(chooseMatch(definition,'term','sample'),
   {selectedTerm:'sample',selectedDefinition:'census',complete:true,correct:false});
});

test('selected tile can be toggled off or replaced without automatically recording an attempt',()=>{
 const chosen=chooseMatch(empty,'term','a');
 assert.deepEqual(chooseMatch(chosen,'term','a'),{
  selectedTerm:null,selectedDefinition:null,complete:false,correct:null
 });
 const changed=chooseMatch(chosen,'term','b');
 assert.equal(changed.selectedTerm,'b');
 assert.equal(changed.complete,false);
 const d=chooseMatch(empty,'definition','c');
 assert.equal(chooseMatch(d,'definition','a').selectedDefinition,'a');
 assert.equal(chosen.selectedTerm,'a','pure transition does not mutate the previous state');
 assert.throws(()=>chooseMatch(empty,'invalid','a'),/Invalid/);
 assert.throws(()=>chooseMatch(empty,'term',' '),/concept ID/);
});

test('Match Up directions and mistakes are communicated without revealing the answer',()=>{
 assert.match(matchNextStep(empty),/Choose a term or definition/);
 assert.match(matchNextStep({...empty,selectedTerm:'a'}),/choose its definition/);
 assert.match(matchNextStep({...empty,selectedDefinition:'b'}),/choose its term/);
 assert.match(matchNextStep({...empty,resolving:'correct'}),/Pair found/);
 assert.match(matchNextStep({...empty,resolving:'incorrect'}),/Not quite/);
 assert.equal(matchStatus(0,5,0).headline,'0 of 5 pairs connected');
 assert.equal(matchStatus(4,5,1).remaining,'1 pair left');
 assert.equal(matchStatus(5,5,2).mistakes,'2 incorrect attempts');
 assert.equal(matchStatus(3,5,1).mistakes,'1 incorrect attempt');
 assert.ok(MATCH_MOTION_MS.correct>=300&&MATCH_MOTION_MS.correct<=550);
 assert.ok(MATCH_MOTION_MS.incorrect>=200&&MATCH_MOTION_MS.incorrect<=420);
});
