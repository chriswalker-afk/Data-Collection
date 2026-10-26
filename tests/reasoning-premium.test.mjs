import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 REASON_DIMENSIONS,buildReasonChoices,createReasonRound,reasonDiagnosis,
 shouldReviewReason,validateReasonBank,reasonValue
} from '../src/reasoning.js';
import {assessReasoning} from '../src/exam.js';

const bank=JSON.parse(readFileSync(new URL('../content/exam-reasoning.json',import.meta.url),'utf8')).reasoning;
const keys=REASON_DIMENSIONS.map(x=>x.key);

test('every level and method has authored pedagogical feedback, with 72 misconception explanations',()=>{
 assert.equal(validateReasonBank(bank),true);
 assert.deepEqual(new Set(bank.map(q=>q.level)),new Set(['foundation','develop','extend']));
 assert.deepEqual(new Set(bank.map(q=>q.answers.method)),
  new Set(['simple-random','systematic','stratified','quota','opportunity']));
 assert.equal(bank.reduce((n,q)=>n+Object.values(q.misconceptions).reduce((m,part)=>m+Object.keys(part).length,0),0),72);
});
test('shuffling preserves keyed answers and does not rely on index zero',()=>{
 for(const q of bank){
  for(const random of [()=>0,()=>0.99,()=>0.32]){
   const presentation=buildReasonChoices(q,random);
   for(const key of keys){
    const expected=q.options[key].map((_,i)=>reasonValue(q,key,i));
    assert.deepEqual(new Set(presentation[key]),new Set(expected));
    assert.equal(presentation[key].length,3);
   }
  }
  assert.notDeepEqual(buildReasonChoices(q,()=>0).reason,buildReasonChoices(q,()=>0.99).reason);
 }
});
test('each case checks four model points independently and explains every distractor',()=>{
 for(const q of bank){
  const best=reasonDiagnosis(q,q.answers);
  assert.equal(best.complete,true,q.id);
  assert.equal(best.met.length,4);
  assert.equal(assessReasoning(q,q.answers).total,4);
  for(const dimension of REASON_DIMENSIONS){
   const key=dimension.key;
   const options=q.options[key].map((_,i)=>reasonValue(q,key,i));
   for(const value of options){
    const choices={...q.answers,[key]:value};
    const checked=reasonDiagnosis(q,choices);
    const row=checked.rows.find(x=>x.key===key);
    const expected=String(value)===String(q.answers[key]);
    assert.equal(row.correct,expected,q.id+': '+key+': '+value);
    assert.ok(row.why.length>=25);
    assert.equal(checked.complete,expected,q.id+': '+key+': '+value);
    if(!expected)assert.notEqual(row.chosenText,row.modelText);
   }
  }
 }
});
test('invalid or missing mathematical feedback is blocked',()=>{
 const invalid=structuredClone(bank);
 invalid[0].misconceptions.reason['1']='';
 assert.throws(()=>validateReasonBank(invalid),/Missing misconception feedback/);
 const invalid2=structuredClone(bank);
 invalid2[1].answers.method='unrecognised-method';
 assert.throws(()=>validateReasonBank(invalid2),/Invalid reasoning key|Stale misconception key/);
 const invalid3=structuredClone(bank);
 invalid3[0].evidence=[];
 assert.throws(()=>validateReasonBank(invalid3),/Missing case evidence/);
});
test('case round stores stable options, never implicitly marks prose, supports two routes',()=>{
 const session=createReasonRound(bank.slice(0,3),{track:'independent',random:()=>0.3});
 assert.equal(session.answered,false);assert.equal(session.complete,false);
 assert.equal(session.writtenCases,0);assert.equal(session.matchedPoints,0);
 assert.equal(session.reviewMode,false);assert.deepEqual(session.selfChecks,{});
 assert.equal(session.optionOrders[bank[0].id].reason.length,3);
 assert.throws(()=>createReasonRound(bank,{track:'automatic'}),/Unknown reasoning mode/);
});
test('targeted revisits distinguish wrong guided choices, voluntary flags and self-assessment',()=>{
 const q=bank[0];
 assert.equal(shouldReviewReason(q,'guided',q.answers,{}),false);
 assert.equal(shouldReviewReason(q,'guided',{...q.answers,reason:2},{}),true);
 assert.equal(shouldReviewReason(q,'independent',{},{}),false);
 assert.equal(shouldReviewReason(q,'independent',{},{method:true}),true);
 assert.equal(shouldReviewReason(q,'independent',{}, {},true),true);
 assert.equal(shouldReviewReason(q,'independent',{},Object.fromEntries(keys.map(x=>[x,true]))),false);
});
test('key mathematical examples preserve proportional allocation, periodicity and sampling frame coverage',()=>{
 const by=id=>bank.find(q=>q.id===id);
 assert.match(by('cr-01').model,/30 and 20/);
 assert.match(by('cr-02').model,/200\/20=10/);
 assert.match(by('cr-06').options.limitation[0],/whole-number/i);
 assert.match(by('cr-07').coaching.limitation,/cycle positions/);
 assert.match(by('cr-08').coaching.limitation,/zero chance/);
 assert.match(by('cr-09').model,/cannot reliably estimate/i);
});
