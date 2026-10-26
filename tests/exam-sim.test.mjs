import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {PAPER_TYPES,PAPER_SIZES,integerInput,allocationKey,systematicKey,numericalKey,gradeNumbers,writtenChecklist,
makePaper,makeReviewPaper,newPaper,paperSummary,changeReviewTargets,emptyExamStore,sanitizeExamStore,
loadExamStore,saveExamStore,clearExamStore,EXAM_STORE_KEY} from '../src/exam-sim.js';
const read=(f,key)=>JSON.parse(readFileSync(new URL('../content/'+f+'.json',import.meta.url),'utf8'))[key];
const questions=read('exam-practice','questions'),methods=read('methods','methods');
test('authored bank has a balanced range, valid calculations and contextual checklists',()=>{
 assert.equal(questions.length,46);
 assert.deepEqual([...new Set(questions.map(x=>x.id))].length,46);
 for(const type of PAPER_TYPES)assert.ok(questions.filter(x=>x.type===type).length>=8);
 for(const q of questions){
  if(PAPER_TYPES.slice(0,2).includes(q.type)){
   const fields=numericalKey(q);assert.ok(fields.length>=2);
   const response=Object.fromEntries(fields.map(x=>[x.id,String(x.expected)]));
   const grade=gradeNumbers(q,response);assert.equal(grade.correct,true,q.id);
   assert.equal(gradeNumbers(q,Object.fromEntries(fields.map(x=>[x.id,'0']))).correct,false,q.id);
  }else assert.ok(writtenChecklist(q,methods).length>=3,q.id);
 }
});
test('exact allocations preserve sample size; systematic final position is valid',()=>{
 for(const q of questions){
  if(q.type==='allocation')assert.equal(allocationKey(q).reduce((sum,x)=>sum+x.expected,0),q.data.sampleSize);
  if(q.type==='systematic'){
   const key=systematicKey(q);
   assert.equal(key[0].expected,q.data.populationSize/q.data.sampleSize);
   assert.ok(key[1].expected<=q.data.populationSize);
   assert.ok(q.data.randomStart>=1&&q.data.randomStart<=key[0].expected);
  }
 }
});
test('input normalisation accepts equivalent nonnegative whole numbers, rejects ambiguity',()=>{
 for(const [input,want] of [[' 020 ',20],['20.0',20],['1,200',1200],['+20',20],['-1',null],['2.5',null],['20x',null],['',null],['2e1',null],['Infinity',null]]) assert.equal(integerInput(input),want);
});
test('no universal rounding rule is invented for non-integer systematic intervals',()=>{
 assert.throws(()=>systematicKey({type:'systematic',data:{populationSize:197,sampleSize:40,randomStart:1}}),/exact integer interval/);
 assert.throws(()=>allocationKey({type:'allocation',data:{sampleSize:55,groups:[{id:'g0',size:205},{id:'g1',size:190},{id:'g2',size:155}]}}),/whole-number allocations/);
});
test('paper building is balanced, immutable, and produces distinct items',()=>{
 for(const [variant,size] of Object.entries(PAPER_SIZES)){
  const paper=makePaper(questions,variant,()=>0.2);
  assert.equal(paper.questionIds.length,size);
  assert.equal(new Set(paper.questionIds).size,size);
  for(const type of PAPER_TYPES)assert.equal(paper.questionIds.filter(id=>questions.find(q=>q.id===id).type===type).length,size/4);
 }
});
test('targeted practice includes only unique saved misses and allows clearing',()=>{
 const ids=[questions[0].id,questions[0].id,questions[1].id];
 assert.equal(makeReviewPaper(questions,ids,()=>0).questionIds.length,2);
 assert.throws(()=>makeReviewPaper(questions,[],()=>0),/No saved/);
 const newer=changeReviewTargets([],questions[0].id,true);
 assert.deepEqual(newer,[questions[0].id]);
 assert.deepEqual(changeReviewTargets(newer,questions[0].id,false),[]);
});
test('written points are reviewed but never automatically marked',()=>{
 const q=questions.find(x=>x.type==='procedure'),m=methods.find(x=>x.id===q.methodId);
 const points=writtenChecklist(q,methods);assert.ok(points.some(p=>p.text===m.procedure[0].text));
 const paper=newPaper('review',[q.id]);paper.entries[q.id]={stage:'done',included:[points[0].id],draft:'My own reasoning',values:{},flag:true};
 const summary=paperSummary(paper,questions,methods);
 assert.equal(summary.numberQuestions,0);assert.equal(summary.writtenQuestions,1);assert.equal(summary.correctParts,0);
 assert.equal(summary.covered,1);assert.equal(summary.rows[0].needsReview,true);
});
test('corrupt/legacy stores recover; invalid IDs and enormous text are dropped',()=>{
 assert.deepEqual(sanitizeExamStore({version:0,reviewIds:['bad']},questions,methods),emptyExamStore());
 const id=questions.find(x=>x.type==='procedure').id;
 const source={version:1,reviewIds:['missing',id,id],paper:{variant:'review',questionIds:[id],index:0,
   entries:{[id]:{stage:'review',draft:'x'.repeat(9999),included:['bogus'],flag:true}}}};
 const good=sanitizeExamStore(source,questions,methods);
 assert.deepEqual(good.reviewIds,[id]);assert.equal(good.paper.entries[id].draft.length,2400);
 assert.deepEqual(good.paper.entries[id].included,[]);
 assert.equal(sanitizeExamStore({version:1,paper:{variant:'full',questionIds:['__proto__'],index:0}},questions,methods).paper,null);
});
test('resume persists drafts, positions and answers without touching the original progress store',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>{map.set(k,v)},removeItem:k=>map.delete(k)};
 const text=questions.find(x=>x.type==='evaluation'),num=questions.find(x=>x.type==='allocation');
 const paper=newPaper('review',[text.id,num.id]);paper.entries[text.id]={stage:'review',draft:'Work about bias',included:[],values:{},flag:false};
 paper.index=1;
 const store={version:1,reviewIds:[text.id],paper};
 assert.equal(saveExamStore(store,questions,methods,storage),true);
 assert.ok(map.has(EXAM_STORE_KEY));assert.equal(loadExamStore(questions,methods,storage).paper.index,1);
 assert.equal(loadExamStore(questions,methods,storage).paper.entries[text.id].draft,'Work about bias');
 storage.setItem(EXAM_STORE_KEY,'{corrupt');assert.deepEqual(loadExamStore(questions,methods,storage),emptyExamStore());
 assert.equal(clearExamStore(storage),true);
});
