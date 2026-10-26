import test from 'node:test';import assert from 'node:assert/strict';
import {routesForTopic,recommendActivity,nextAfterRound,makeClassroomFeedback,TRIAL_CHOICES} from '../src/journey.js';
import {GAMES} from '../src/core.js';
import {emptyProgress,recordAnswer} from '../src/progress.js';
const sample=[{id:'a',module:'sampling'},{id:'b',module:'sampling'},{id:'c',module:'sampling'},{id:'d',module:'sampling'}];
const data=[{id:'e',module:'data'},{id:'f',module:'data'}];
test('topic-specific journey never recommends sampling-only games for data',()=>{
 for(const topic of ['data','all']){
  const routes=routesForTopic(topic);assert.equal(routes.length,4);
  for(const step of routes)assert.ok(!['sort','identify','build','error','reason','exam'].includes(step.game));
 }
 assert.equal(routesForTopic('sampling').length,4);
 for(const step of routesForTopic('sampling'))assert.ok(GAMES.some(g=>g.id===step.game));
});
test('new and returning students receive grounded next-step suggestions',()=>{
 const concepts=[...sample,...data],empty=emptyProgress();
 assert.equal(recommendActivity(empty,concepts,'sampling').game,'flashcards');
 assert.equal(recommendActivity(empty,concepts,'data').game,'flashcards');
 assert.equal(recommendActivity(empty,concepts,'sampling',2).game,'exam');
 let p=recordAnswer(empty,'a',true);
 assert.equal(recommendActivity(p,concepts,'sampling').game,'match');
 for(const id of ['b','c','d'])p=recordAnswer(p,id,true);
 assert.equal(recommendActivity(p,concepts,'sampling').game,'cloze');
 for(const id of ['a','b','c','d'])p=recordAnswer(p,id,true);
 assert.equal(recommendActivity(p,concepts,'sampling').game,'exam');
 assert.equal(recommendActivity(p,concepts,'data').game,'flashcards');
});
test('completions have relevant next activities with data-safe fallbacks',()=>{
 for(const game of GAMES.filter(g=>g.id!=='exam')){
  const next=nextAfterRound(game.id,'sampling');
  assert.ok(GAMES.some(g=>g.id===next.game));
  assert.ok(next.label&&next.reason);
 }
 assert.equal(nextAfterRound('cloze','data').game,'speed');
 assert.equal(nextAfterRound('speed','data').game,'cloze');
 assert.equal(nextAfterRound('identify','sampling').game,'build');
});
test('feedback is opt-in, bounded and contains no auto-generated identifiers',()=>{
 const values={activity:'exam',clarity:'Partly clear',challenge:'About right',
 feedback:'Somewhat helpful',comment:'Please show the unit conversion more clearly.'};
 const message=makeClassroomFeedback(values);
 assert.match(message,/Exam Lab/);
 assert.match(message,/Partly clear/);
 assert.match(message,/unit conversion/);
 assert.doesNotMatch(message,/student number|IP address|timestamp|collected automatically/i);
 const huge=makeClassroomFeedback({...values,comment:'x'.repeat(1000)});
 assert.ok(huge.length<800);assert.ok(huge.includes('x'.repeat(350)));
 assert.throws(()=>makeClassroomFeedback({...values,clarity:'Wrong'}),/clarity/);
 assert.throws(()=>makeClassroomFeedback({...values,activity:'unknown'}),/Choose an activity/);
 for(const [key,options] of Object.entries(TRIAL_CHOICES))assert.equal(options.length,3,key);
});
