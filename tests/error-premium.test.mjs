import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gradeErrorDiagnosis,validateErrorBank} from '../src/exam.js';
const questions=JSON.parse(readFileSync(new URL('../content/exam-errors.json',import.meta.url),'utf8')).errors;
test('15 coherent cases span five methods and three levels',()=>{
 assert.equal(validateErrorBank(questions),true);
 assert.deepEqual(new Set(questions.map(q=>q.level)),new Set(['foundation','develop','extend']));
 assert.deepEqual(new Set(questions.map(q=>q.methodId)),new Set(['simple-random','systematic','stratified','quota','opportunity']));
});
test('each of the three skills is graded independently and all required for mastery',()=>{
 for(const q of questions){
  const yes=gradeErrorDiagnosis(q,q.errorLine,q.repair,q.impact.answer);
  assert.equal(yes.correct,true,q.id);
  assert.equal(yes.identified+yes.repaired+yes.explained,3);
  assert.equal(gradeErrorDiagnosis(q,(q.errorLine+1)%q.lines.length,q.repair,q.impact.answer).correct,false);
  assert.equal(gradeErrorDiagnosis(q,q.errorLine,q.repairs.find(x=>x.id!==q.repair).id,q.impact.answer).correct,false);
  assert.equal(gradeErrorDiagnosis(q,q.errorLine,q.repair,q.impact.options.find(x=>x.id!==q.impact.answer).id).correct,false);
 }
});
test('reject invalid consequence answer banks',()=>{
 const broken=structuredClone(questions);broken[0].impact.answer='missing';
 assert.throws(()=>validateErrorBank(broken),/Invalid consequence/);
});
test('non-integer systematic and whole-number allocation cases have a single flawed step',()=>{
 const k=questions.find(q=>q.id==='er-11');
 assert.match(k.lines[1],/random start of 1/);assert.match(k.lines[k.errorLine],/universal/);
 const alloc=questions.find(q=>q.id==='er-13');
 assert.match(alloc.lines[1],/totalling 55/);assert.match(alloc.lines[2],/21, 19 and 16/);
});
