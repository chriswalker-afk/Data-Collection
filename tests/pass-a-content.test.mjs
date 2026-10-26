import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {METHOD_ORDER,makeScenarioRound} from '../src/phase2.js';
import {evidenceParts,validateIdentifyBank} from '../src/identify.js';
import {validateErrorBank,makeErrorDeck,makeReasoningDeck,
  gradeErrorDiagnosis,ERROR_ROUND_LENGTHS,REASON_ROUND_LENGTHS} from '../src/exam.js';
import {reasonDiagnosis,validateReasonBank} from '../src/reasoning.js';
import {SCENARIOS as MULTIPLAYER_SCENARIOS} from '../multiplayer/scenarios.js';

const read=name=>JSON.parse(readFileSync(new URL('../content/'+name+'.json',import.meta.url),'utf8'));
const {scenarios}=read('scenarios');
const {errors}=read('exam-errors');
const {reasoning}=read('exam-reasoning');
const levels=['foundation','develop','extend'];

test('50 distinct Which Method? cases: ten per method and seven application cases in each',()=>{
 assert.equal(scenarios.length,50);
 assert.equal(validateIdentifyBank(scenarios),true);
 assert.equal(new Set(scenarios.map(x=>x.id)).size,50);
 for(const method of METHOD_ORDER){
  const items=scenarios.filter(x=>x.correctMethod===method);
  assert.equal(items.length,10,method);
  assert.equal(items.filter(x=>x.level==='apply').length,7,method);
 }
 for(const item of scenarios){
  const evidence=evidenceParts(item);
  assert.equal(evidence.before+evidence.quote+evidence.after,item.prompt,item.id);
  assert.ok(evidence.quote.length>=15&&evidence.quote.length<item.prompt.length);
  assert.ok(item.reason.length>35&&item.contrast.length>35,item.id);
 }
 for(const n of [5,10,20]){
  const round=makeScenarioRound(scenarios,n,()=>0.72);
  assert.equal(round.length,n);
  assert.equal(new Set(round.map(x=>x.id)).size,n);
  for(const method of METHOD_ORDER)
   assert.equal(round.filter(x=>x.correctMethod===method).length,n/5);
 }
 assert.deepEqual(MULTIPLAYER_SCENARIOS.map(q=>[q.id,q.prompt,q.correctMethod,q.reason,q.contrast]),
  scenarios.map(q=>[q.id,q.prompt,q.correctMethod,q.reason,q.contrast]));
});

test('30 varied error cases: two per method per level and all three decisions checked',()=>{
 assert.equal(errors.length,30);
 assert.equal(validateErrorBank(errors),true);
 for(const level of levels)for(const method of METHOD_ORDER){
  const choices=errors.filter(q=>q.level===level&&q.methodId===method);
  assert.equal(choices.length,2,level+'/'+method);
  assert.notEqual(choices[0].context,choices[1].context);
 }
 for(const q of errors){
  const passed=gradeErrorDiagnosis(q,q.errorLine,q.repair,q.impact.answer);
  assert.equal(passed.correct,true,q.id);
  assert.equal(passed.total,undefined); // three checks, not a fake examination mark
  assert.equal(gradeErrorDiagnosis(q,q.errorLine,q.repair,
    q.impact.options.find(x=>x.id!==q.impact.answer).id).correct,false,q.id);
  assert.equal(q.lines.length,3);
  assert.equal(new Set(q.repairs.map(x=>x.text)).size,3);
  assert.equal(new Set(q.impact.options.map(x=>x.text)).size,3);
 }
 assert.deepEqual(ERROR_ROUND_LENGTHS,[5,10]);
 for(const level of levels){
  const quick=makeErrorDeck(errors,level,()=>0.4,5);
  assert.equal(new Set(quick.map(q=>q.methodId)).size,5,'Five-method balance');
  const full=makeErrorDeck(errors,level,()=>0.4,10);
  assert.equal(full.length,10);
  assert.equal(new Set(full.map(q=>q.id)).size,10);
 }
 assert.throws(()=>makeErrorDeck(errors,'foundation',Math.random,12),/length/);
});

test('30 reasoning investigations: two per method per level, 240 authored misconception explanations',()=>{
 assert.equal(reasoning.length,30);
 assert.equal(validateReasonBank(reasoning),true);
 let explained=0;
 for(const q of reasoning){
  const result=reasonDiagnosis(q,q.answers);
  assert.equal(result.complete,true,q.id);
  assert.equal(result.rows.length,4);
  explained+=Object.values(q.misconceptions).reduce((n,x)=>n+Object.keys(x).length,0);
  assert.equal(q.evidence.length,3);
  assert.equal(new Set(q.options.method).size,3);
  assert.ok(q.model.length>=100,q.id);
 }
 assert.equal(explained,240);
 for(const level of levels)for(const method of METHOD_ORDER){
  const cases=reasoning.filter(q=>q.level===level&&q.answers.method===method);
  assert.equal(cases.length,2,level+'/'+method);
  assert.notEqual(cases[0].scenario,cases[1].scenario);
 }
 assert.deepEqual(REASON_ROUND_LENGTHS,[3,5,10]);
 for(const level of levels){
  const quick=makeReasoningDeck(reasoning,level,()=>0.4,3);
  assert.equal(quick.length,3);
  assert.equal(new Set(quick.map(q=>q.answers.method)).size,3);
  const balanced=makeReasoningDeck(reasoning,level,()=>0.4,5);
  assert.equal(new Set(balanced.map(q=>q.answers.method)).size,5);
  const full=makeReasoningDeck(reasoning,level,()=>0.4,10);
  assert.equal(full.length,10);
  assert.equal(new Set(full.map(q=>q.id)).size,10);
 }
 assert.throws(()=>makeReasoningDeck(reasoning,'extend',Math.random,12),/length/);
});
