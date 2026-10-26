import test from 'node:test';
import assert from 'node:assert/strict';
import {GAMES} from '../src/core.js';
import {completionHeading,completionCreditNote} from '../src/quality.js';

test('all ten activities have honest, nonempty completion language',()=>{
 for(const {id} of GAMES){
  const heading=completionHeading(id,{correct:1,attempted:1,independentPairs:1,mistakes:0,guidedCases:1,writtenCases:0});
  assert.ok(heading&&heading.length<110,id);
  assert.doesNotMatch(heading,/grade|perfect|A\*/i,id);
 }
});
test('zero attempts, zero successes and self-reviewed prose never receive false praise',()=>{
 assert.match(completionHeading('speed',{attempted:0,correct:0}),/no terms submitted/i);
 assert.match(completionHeading('speed',{attempted:1,correct:0}),/untimed recall/i);
 for(const game of ['cloze','sort','identify','build','error','flashcards'])
  assert.doesNotMatch(completionHeading(game,{correct:0}),/Nicely done|perfect|all correct/i);
 assert.match(completionHeading('reason',{correct:0,guidedCases:0,writtenCases:3}),/reviewed/i);
 assert.match(completionHeading('match',{mistakes:2}),/tricky/i);
 assert.match(completionHeading('match',{mistakes:0}),/first try/i);
});
test('unscored review is visibly distinguished from a standard completed round',()=>{
 for(const game of ['error','reason','speed'])
  assert.match(completionHeading(game,{reviewMode:true}),/Review complete/i);
 assert.match(completionHeading('flashcards',{isReview:true}),/Review complete/i);
});

test('every completion page explains the actual assessment contract',()=>{
 for(const {id} of GAMES){
  const note=completionCreditNote(id);
  assert.ok(note.length>=60&&note.length<190,id);
  assert.ok(/check|model|review|credit|practice|self-rating|record|answer|mastery/i.test(note),id);
 }
 assert.match(completionCreditNote('error',{reviewMode:true}),/unscored/);
 assert.match(completionCreditNote('reason',{reviewMode:true}),/unscored/);
});
