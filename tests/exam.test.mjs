import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {procedureRound,checkProcedure,moveStep,makeErrorDeck,gradeError,makeReasoningDeck,assessReasoning} from '../src/exam.js';
const load=(f,key)=>JSON.parse(readFileSync(new URL('../content/'+f+'.json',import.meta.url),'utf8'))[key];
const methods=load('methods','methods'),errors=load('exam-errors','errors'),reasoning=load('exam-reasoning','reasoning');
test('all five procedures accept the audited original ordering',()=>{
 for(const m of methods)assert.equal(checkProcedure(m,m.procedure).correct,true,m.id);
});
test('reject every genuinely reversed prerequisite',()=>{
 for(const m of methods)for(const [a,b] of ({
 'simple-random':[['frame','number'],['number','generate'],['generate','repeats'],['repeats','select']],
 systematic:[['frame','interval'],['interval','start'],['start','select']],
 stratified:[['strata','allocate'],['allocate','random'],['random','combine']],
 quota:[['groups','targets'],['targets','recruit'],['recruit','stop']],
 opportunity:[['criteria','recruit'],['available','recruit']]
 })[m.id]){
  const copy=m.procedure.map(x=>({...x}));const i=copy.findIndex(x=>x.id===a),j=copy.findIndex(x=>x.id===b);
  [copy[i],copy[j]]=[copy[j],copy[i]];assert.equal(checkProcedure(m,copy).correct,false,m.id+': '+a+'/'+b);
 }
});
test('independent opportunity preliminaries may be swapped',()=>{
 const m=methods.find(x=>x.id==='opportunity');
 assert.equal(checkProcedure(m,[m.procedure[1],m.procedure[0],m.procedure[2]]).correct,true);
});
test('moves are immutable and boundaries safe',()=>{
 const m=methods[0],first=m.procedure;
 assert.deepEqual(moveStep(first,first[0].id,-1),first);
 assert.equal(moveStep(first,first[0].id,1)[0].id,first[1].id);
 assert.equal(first[0].id,'frame');
});
test('questions are real shuffled method steps and respect all method IDs',()=>{
 for(const m of methods){
  const round=procedureRound(methods,m.id,()=>0);
  assert.equal(round.steps.length,m.procedure.length);
  assert.deepEqual(new Set(round.steps.map(s=>s.id)),new Set(m.procedure.map(s=>s.id)));
 }
});
test('error bank has progressive levels, unambiguous keyed line and correction',()=>{
 assert.equal(errors.length,15);
 for(const q of errors){
  assert.ok(q.lines.length>=3);
  assert.ok(q.errorLine>=0&&q.errorLine<q.lines.length);
  assert.ok(q.repairs.some(x=>x.id===q.repair));
  assert.ok(methods.some(m=>m.id===q.methodId));
  assert.equal(gradeError(q,q.errorLine,q.repair).correct,true);
  assert.equal(gradeError(q,(q.errorLine+1)%q.lines.length,q.repair).correct,false);
  assert.equal(gradeError(q,q.errorLine,'wrong').correct,false);
 }
 assert.equal(makeErrorDeck(errors,'foundation').length,5);
 assert.equal(makeErrorDeck(errors,'extend').length,5);
});
test('reasoning checklist checks meaningful dimensions; no scoring of prose',()=>{
 assert.equal(reasoning.length,9);
 for(const q of reasoning){
  assert.ok(q.model&&q.tradeoff&&q.priority);
  for(const key of ['method','reason','limitation','improvement'])assert.ok(
    q.options[key].some((x,i)=>key==='method'?x===q.answers[key]:i===q.answers[key]));
  const full=assessReasoning(q,q.answers);assert.equal(full.total,4);assert.equal(full.met.length,4);
  const wrong=assessReasoning(q,{});assert.equal(wrong.met.length,0);
 }
 assert.equal(makeReasoningDeck(reasoning,'develop').length,3);
});
