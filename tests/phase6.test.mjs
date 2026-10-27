import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {integerInput,allocationKey,systematicKey,makePaper,newPaper,procedureModelSteps,
 writtenChecklist,paperEntry,paperSummary,reportCsv,sanitizeExamStore,gradeNumbers} from '../src/exam-sim.js';

const read=(file,key)=>JSON.parse(readFileSync(new URL('../content/'+file+'.json',import.meta.url),'utf8'))[key];
const questions=read('exam-practice','questions'),methods=read('methods','methods');
const byId=new Map(questions.map(q=>[q.id,q]));
const evaluated=questions.filter(q=>q.type==='evaluation');

test('sampling coverage has 100 distinct questions and both method and inference cases',()=>{
 assert.equal(questions.length,100);
 assert.equal(new Set(questions.map(q=>q.id)).size,100);
 assert.ok(evaluated.filter(q=>q.coverageArea==='inference').length>=8);
 assert.ok(evaluated.filter(q=>q.coverageArea==='methods').length>=8);
 for(const q of questions){
  assert.equal(q.hints.length,2,q.id);
  assert.ok(q.hints.every(h=>h.length>29),q.id);
 }
});

test('all standard/full papers deliberately contain an inference and a method critique',()=>{
 for(const variant of ['standard','full']){
  for(const seed of [0,0.2,0.49,0.76,0.999]){
   const paper=makePaper(questions,variant,()=>seed);
   const evals=paper.questionIds.map(id=>byId.get(id)).filter(q=>q.type==='evaluation');
   assert.ok(evals.some(q=>q.coverageArea==='inference'),variant+'/'+seed);
   assert.ok(evals.some(q=>q.coverageArea==='methods'),variant+'/'+seed);
   assert.equal(evals.length,variant==='standard'?2:3);
  }
 }
 const quick=makePaper(questions,'quick',()=>0);
 assert.equal(quick.questionIds.length,4);
});

test('unrestricted random digits and fractional interval use truthful context models and checklists',()=>{
 for(const id of ['proc-random-digits','proc-systematic-fraction']){
  const q=byId.get(id);
  const steps=procedureModelSteps(q,methods);
  assert.deepEqual(steps,q.modelSteps);
  assert.equal(writtenChecklist(q,methods).length,steps.length+q.extraPoints.length);
  assert.ok(writtenChecklist(q,methods).every(p=>p.id&&p.text));
 }
 const digit=procedureModelSteps(byId.get('proc-random-digits'),methods).map(x=>x.text).join(' ');
 assert.match(digit,/000/);assert.match(digit,/181/);assert.match(digit,/repeated|already accepted/i);
 assert.doesNotMatch(digit,/Generate random integers from 1 to N/);
 const fraction=procedureModelSteps(byId.get('proc-systematic-fraction'),methods).map(x=>x.text).join(' ');
 assert.match(fraction,/197/);assert.match(fraction,/40/);assert.match(fraction,/1 or 2/);
 assert.match(fraction,/final position/i);
 assert.deepEqual(procedureModelSteps(byId.get('proc-systematic-1'),methods),
  methods.find(m=>m.id==='systematic').procedure);
});

test('thousands separators must be correctly grouped and inputs must be safe whole numbers',()=>{
 for(const [input,expected] of [['1,200',1200],['12,345,678',12345678],['+1,200.00',1200],
  ['1,2,3',null],['12,34',null],[',123',null],['10,00',null],['2e3',null],
  ['0.1',null],['-1',null],['9007199254740992',null],[' 020 ',20]]){
  assert.equal(integerInput(input),expected,input);
 }
});

test('numerical engine rejects unsafe totals and products even when inputs are safe integers',()=>{
 assert.throws(()=>allocationKey({type:'allocation',data:{sampleSize:1,groups:[
  {id:'g0',label:'A',size:Number.MAX_SAFE_INTEGER},{id:'g1',label:'B',size:1}
 ]}}),/safe-integer/);
 assert.throws(()=>allocationKey({type:'allocation',data:{sampleSize:1_000_000_000,groups:[
  {id:'g0',label:'A',size:1_000_000_000_000},{id:'g1',label:'B',size:1_000_000_000_000}
 ]}}),/safe-integer/);
 assert.throws(()=>systematicKey({type:'systematic',data:{populationSize:197,sampleSize:40,randomStart:1}}),/exact integer/);
});

test('hints are persisted and do not confer independent mastery through paper summary',()=>{
 const q=byId.get('alloc-year-groups');
 const fields=allocationKey(q);
 const values=Object.fromEntries(fields.map(f=>[f.id,String(f.expected)]));
 const paper=newPaper('review',[q.id]);
 paper.entries[q.id]={stage:'done',draft:'',values,included:[],flag:false,hintsUsed:1};
 assert.equal(gradeNumbers(q,values).correct,true);
 const row=paperSummary(paper,questions,methods).rows[0];
 assert.equal(row.score.correct,true);assert.equal(row.hintsUsed,1);assert.equal(row.needsReview,true);
 const saved=sanitizeExamStore({version:1,reviewIds:[q.id],paper},questions,methods);
 assert.equal(saved.paper.entries[q.id].hintsUsed,1);
 const corrupt=sanitizeExamStore({version:1,reviewIds:[],paper:{
  ...paper,entries:{[q.id]:{...paper.entries[q.id],hintsUsed:999}}
 }},questions,methods);
 assert.equal(corrupt.paper.entries[q.id].hintsUsed,0);
 assert.equal(paperEntry(newPaper('review',[q.id]),q.id).hintsUsed,0);
});

test('teacher CSV is privacy-first and protects against spreadsheet formula injection',()=>{
 const q=byId.get('eval-two-samples'),paper=newPaper('review',[q.id]);
 const malicious='=HYPERLINK("https://example.invalid","Open")\nline two';
 paper.entries[q.id]={stage:'done',draft:malicious,values:{},flag:true,hintsUsed:2,included:['point-1']};
 const defaultCsv=reportCsv(paper,questions,methods);
 assert.match(defaultCsv,/Numeric correct/);
 assert.match(defaultCsv,/student self-review/);
 assert.doesNotMatch(defaultCsv,/HYPERLINK/);
 assert.doesNotMatch(defaultCsv,/Written draft/);
 const opted=reportCsv(paper,questions,methods,{includeDrafts:true});
 assert.match(opted,/Written draft/);
 assert.match(opted,/'=HYPERLINK\(""https:\/\/example.invalid""/);
 assert.match(opted,/line two/);
 assert.match(opted,/Yes/);
 assert.ok(opted.split('\r\n').length>2);
});
