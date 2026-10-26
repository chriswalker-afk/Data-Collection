import test from 'node:test';
import assert from 'node:assert/strict';
import {speedClockPercent,speedRoundSummary,speedReviewDeck,SPEED_CAUTION_MS} from '../src/speed-ui.js';

const noAttempts={attempted:0,correct:0,skipped:0,reviewIds:new Set()};
test('clock percentage always stays within valid bounds',()=>{
 assert.equal(speedClockPercent(30_000,30),100);
 assert.equal(speedClockPercent(15_000,30),50);
 assert.equal(speedClockPercent(-1,30),0);
 assert.equal(speedClockPercent(40_000,30),100);
 assert.equal(speedClockPercent(Number.NaN,30),0);
 assert.equal(speedClockPercent(15_000,0),0);
 assert.equal(SPEED_CAUTION_MS,10_000);
});
test('correct, wrong and skipped attempts have accurate transparent summaries',()=>{
 const s=speedRoundSummary({attempted:7,correct:4,skipped:2,reviewIds:new Set(['a','b','c'])});
 assert.deepEqual({attempted:s.attempted,correct:s.correct,incorrect:s.incorrect,skipped:s.skipped,accuracy:s.accuracy,reviewCount:s.reviewCount},
   {attempted:7,correct:4,incorrect:1,skipped:2,accuracy:57,reviewCount:3});
 assert.match(s.takeaway,/Review the terms/);
 assert.equal(speedRoundSummary(noAttempts).accuracy,null);
 assert.equal(speedRoundSummary(noAttempts).accuracyLabel,'Not yet measured');
 assert.match(speedRoundSummary(noAttempts).takeaway,/untimed/);
 assert.equal(speedRoundSummary({...noAttempts,attempted:3,correct:3}).accuracy,100);
 assert.equal(speedRoundSummary({...noAttempts,attempted:3,correct:3}).reviewCount,0);
});
test('targeted review deck includes only missed IDs, once, and never inserts new concepts',()=>{
 const concepts=[{id:'a'},{id:'b'},{id:'c'}];
 assert.deepEqual(speedReviewDeck(concepts,new Set(['c','a','z','a'])).map(x=>x.id),['a','c']);
 assert.deepEqual(speedReviewDeck(concepts,new Set()).map(x=>x.id),[]);
 assert.deepEqual(speedReviewDeck(concepts,['b']).map(x=>x.id),['b']);
});
