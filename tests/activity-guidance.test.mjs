import test from 'node:test';
import assert from 'node:assert/strict';
import {GAMES} from '../src/core.js';
import {ACTIVITY_GUIDANCE,guideForActivity} from '../src/activity-guidance.js';

test('all ten games have concise two-part instructions with no scoring logic',()=>{
 assert.equal(Object.keys(ACTIVITY_GUIDANCE).length,GAMES.length);
 for(const game of GAMES){
  const guide=guideForActivity(game.id);
  assert.equal(typeof guide.practice,'string');
  assert.equal(typeof guide.task,'string');
  assert.ok(guide.practice.length>=30&&guide.practice.length<155,game.id);
  assert.ok(guide.task.length>=35&&guide.task.length<220,game.id);
 }
 assert.throws(()=>guideForActivity('does-not-exist'),/Unknown activity/);
});
test('recall instructions adapt to help, without claiming assisted mastery',()=>{
 assert.match(guideForActivity('flashcards',{reversed:true}).task,/Read the definition, recall the term/);
 assert.match(guideForActivity('cloze',{level:'choices'}).task,/Choose the word/);
 assert.match(guideForActivity('cloze',{level:'guided'}).task,/practice, not mastery/);
 assert.match(guideForActivity('cloze',{level:'independent'}).task,/without a word bank/);
 assert.match(guideForActivity('sort').task,/advantages or disadvantages/);
 assert.match(guideForActivity('sort').task,/Check the full board/);
 assert.match(guideForActivity('speed',{timed:true}).task,/timer pauses/);
});
test('Exam Lab distinguishes automatically checked numbers from written self-review',()=>{
 for(const kind of ['allocation','systematic']){
  const guide=guideForActivity('exam',{questionType:kind});
  assert.match(guide.task,/Calculate/);
  assert.doesNotMatch(guide.task,/automatically marked/);
 }
 for(const kind of ['procedure','evaluation']){
  const guide=guideForActivity('exam',{questionType:kind});
  assert.match(guide.task,/self-review/);
  assert.match(guide.task,/not automatically marked/);
 }
 assert.match(guideForActivity('reason').task,/not automatic grading/);
 assert.deepEqual(guideForActivity('exam'),ACTIVITY_GUIDANCE.exam);
});
