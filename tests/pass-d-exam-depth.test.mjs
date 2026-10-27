import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PAPER_SIZES,PAPER_TYPES,PAPER_LEVELS,MAX_RECENT_QUESTIONS,paperQuestionPool,
  preferUnseenQuestions,updateRecentQuestionIds,makePaper,numericalKey,gradeNumbers,
  writtenChecklist,paperSummary,newPaper,sanitizeExamStore,emptyExamStore,reportCsv} from '../src/exam-sim.js';
const read=(file,key)=>JSON.parse(readFileSync(new URL('../content/'+file+'.json',import.meta.url),'utf8'))[key];
const questions=read('exam-practice','questions');
const methods=read('methods','methods');
const evaluations=new Map(read('evaluations','evaluations').map(e=>[e.id,e]));
const byId=new Map(questions.map(q=>[q.id,q]));
const stable=()=>.4;

test('Pass D contains 100 distinct, genuinely contextual, correctly balanced Exam Lab questions',()=>{
 assert.equal(questions.length,100);
 assert.equal(byId.size,100);
 assert.deepEqual(Object.fromEntries(PAPER_TYPES.map(type=>
  [type,questions.filter(q=>q.type===type).length])),
  {allocation:20,systematic:20,procedure:24,evaluation:36});
 for(const level of ['foundation','develop','extend']){
  for(const type of PAPER_TYPES)
   assert.ok(questions.filter(q=>q.type===type&&q.level===level).length>=6,
    'Too few '+type+' at '+level);
 }
 assert.equal(questions.filter(q=>q.coverageArea==='inference').length,21);
 assert.equal(questions.filter(q=>q.coverageArea==='methods').length,15);
 assert.equal(questions.filter(q=>q.id.startsWith('alloc-d-')).length,12);
 assert.equal(questions.filter(q=>q.id.startsWith('sys-d-')).length,12);
 assert.equal(questions.filter(q=>q.id.startsWith('proc-d-')).length,15);
 assert.equal(questions.filter(q=>q.id.startsWith('eval-d-')).length,15);
 assert.ok(questions.every(q=>q.sourceIds?.length&&q.context?.length>70&&q.task?.length>20&&q.hints?.length===2));
});

test('all twenty proportional allocation problems calculate exact whole numbers adding to n',()=>{
 for(const q of questions.filter(x=>x.type==='allocation')){
  const fields=numericalKey(q),N=q.data.groups.reduce((s,x)=>s+x.size,0);
  assert.ok(fields.length>=2&&fields.length<=4,q.id);
  assert.equal(fields.reduce((sum,f)=>sum+f.expected,0),q.data.sampleSize,q.id);
  assert.ok(fields.every(f=>f.expected===q.data.groups.find(g=>g.id===f.id).size*q.data.sampleSize/N));
  assert.equal(gradeNumbers(q,Object.fromEntries(fields.map(f=>[f.id,String(f.expected)]))).correct,true);
  assert.equal(gradeNumbers(q,Object.fromEntries(fields.map(f=>[f.id,'0']))).correct,false);
 }
 const a=byId.get('alloc-d-reef-zones');
 assert.deepEqual(numericalKey(a).map(f=>f.expected),[18,12,10,5]);
 assert.deepEqual(numericalKey(byId.get('alloc-d-study-spaces')).map(f=>f.expected),[42,28,21,14]);
});

test('every systematic task has an integer interval, random start, valid final position and correct marking',()=>{
 for(const q of questions.filter(x=>x.type==='systematic')){
  const {populationSize:N,sampleSize:n,randomStart:start}=q.data;
  const [interval,last]=numericalKey(q);
  assert.equal(interval.expected,N/n,q.id);
  assert.equal(last.expected,start+(n-1)*interval.expected,q.id);
  assert.ok(Number.isSafeInteger(interval.expected)&&start>=1&&start<=interval.expected);
  assert.ok(last.expected<=N&&last.expected>=1,q.id);
  assert.equal(gradeNumbers(q,{interval:String(interval.expected),final:String(last.expected)}).correct,true);
  assert.equal(gradeNumbers(q,{interval:String(interval.expected),final:String(N+1)}).correct,false);
 }
 assert.deepEqual(numericalKey(byId.get('sys-d-ticket-transactions')).map(f=>f.expected),[34,2445]);
});

test('context-specific procedural models are complete, cover five methods and stay unscored',()=>{
 const cases=questions.filter(q=>q.id.startsWith('proc-d-'));
 assert.equal(cases.length,15);
 for(const method of methods)assert.equal(cases.filter(q=>q.methodId===method.id).length,3);
 for(const q of cases){
  const checklist=writtenChecklist(q,methods);
  assert.equal(checklist.length,q.modelSteps.length+q.extraPoints.length);
  assert.ok(q.modelSteps.length>=4&&new Set(q.modelSteps.map(s=>s.id)).size===q.modelSteps.length);
  assert.ok(q.focus&&q.note&&q.warning&&q.extraPoints[0].text);
  assert.ok(checklist.every(p=>p.text.length>35));
  const paper=newPaper('review',[q.id]);
  const report=paperSummary(paper,questions,methods);
  assert.equal(report.numberQuestions,0);
  assert.equal(report.correctParts,0);
 }
 assert.match(byId.get('proc-d-random-tables').modelSteps.map(s=>s.text).join(' '),/000.*241.*999.*repeated/);
 assert.match(byId.get('proc-d-conveyor-cycle').focus,/quality|poor/);
});

test('all evaluation questions cite defined principles and distinguish methods from inference',()=>{
 for(const q of questions.filter(q=>q.type==='evaluation')){
  assert.ok(['methods','inference'].includes(q.coverageArea));
  assert.ok(q.checklist.length>=3&&q.model.length>100);
  assert.ok(q.sourceEvaluationIds?.every(id=>evaluations.has(id)),q.id);
  if(q.id.startsWith('eval-d-'))assert.ok(q.checklist.every(p=>p.text.length>35));
  if(q.id.startsWith('eval-d-'))assert.ok(q.examinerFocus?.length>50);
 }
 const noninteger=byId.get('eval-d-noninteger-515');
 assert.ok(noninteger.model.includes('507'));
 const rounding=byId.get('eval-d-strat-rounding');
 assert.ok(rounding.model.includes('79')&&rounding.model.includes('78'));
});

test('unseen-first papers avoid previously practised questions when eligible pool is sufficient',()=>{
 const original=JSON.stringify(questions);
 for(const level of PAPER_LEVELS){
  const initial=makePaper(questions,'full',stable,level);
  const history=updateRecentQuestionIds([],initial.questionIds);
  const second=makePaper(questions,'full',stable,level,history);
  assert.equal(initial.questionIds.length,12);
  assert.equal(second.questionIds.length,12);
  assert.equal(second.questionIds.filter(id=>history.includes(id)).length,0,level);
  for(const paper of [initial,second]){
   assert.equal(new Set(paper.questionIds).size,12);
   for(const type of PAPER_TYPES)
    assert.equal(paper.questionIds.filter(id=>byId.get(id).type===type).length,3);
   const evals=paper.questionIds.map(id=>byId.get(id)).filter(q=>q.type==='evaluation');
   assert.ok(evals.some(q=>q.coverageArea==='inference')&&evals.some(q=>q.coverageArea==='methods'));
   const rank={foundation:0,develop:1,extend:2};
   const ranks=paper.questionIds.map(id=>rank[byId.get(id).level]);
   assert.deepEqual(ranks,[...ranks].sort());
  }
  if(level==='confidence')assert.ok(second.questionIds.every(id=>byId.get(id).level!=='extend'));
  if(level==='stretch')assert.ok(second.questionIds.every(id=>byId.get(id).level!=='foundation'));
 }
 assert.equal(JSON.stringify(questions),original);
});

test('least recently practised questions are preferred after all options have been seen',()=>{
 const pool=questions.filter(q=>q.type==='allocation'&&q.level==='foundation').slice(0,3);
 const recent=[pool[0].id,pool[1].id,pool[2].id];
 assert.deepEqual(preferUnseenQuestions(pool,recent,stable).map(x=>x.id),
  [pool[2].id,pool[1].id,pool[0].id]);
 const unvisited=questions.find(q=>q.type==='allocation'&&!recent.includes(q.id));
 const mixed=preferUnseenQuestions([...pool,unvisited],recent,stable);
 assert.equal(mixed[0].id,unvisited.id);
 assert.equal(paperQuestionPool(questions,'mixed').length,100);
 assert.ok(paperQuestionPool(questions,'confidence').length<100);
});

test('recent-question history is bounded, deduplicated and optional in the legacy store',()=>{
 const all=questions.map(x=>x.id);
 const saved=updateRecentQuestionIds(all.slice(0,55),all.slice(55,67));
 assert.equal(saved.length,MAX_RECENT_QUESTIONS);
 assert.equal(new Set(saved).size,saved.length);
 const restored=sanitizeExamStore({version:1,reviewIds:[],paper:null,
  recentQuestionIds:['bogus',all[0],all[0],...all]},questions,methods);
 assert.equal(restored.recentQuestionIds.length,MAX_RECENT_QUESTIONS);
 assert.equal(restored.recentQuestionIds[0],all[0]);
 assert.equal(sanitizeExamStore({version:1,paper:null},questions,methods).recentQuestionIds.length,0);
 assert.equal(emptyExamStore().recentQuestionIds.length,0);
});

test('model-only written study can never claim checklist coverage, even after restoring an old save',()=>{
 const q=byId.get('eval-d-two-school-samples');
 const saved={version:1,reviewIds:[],paper:{variant:'review',difficulty:'mixed',questionIds:[q.id],
   index:0,complete:true,entries:{[q.id]:{stage:'done',draft:'',included:['point-1','point-2','point-3'],
     flag:false,improvement:'Next time I would identify the population first.'}}}};
 const clean=sanitizeExamStore(saved,questions,methods);
 const entry=clean.paper.entries[q.id];
 assert.deepEqual(entry.included,[]);
 assert.equal(entry.flag,true);
 const row=paperSummary(clean.paper,questions,methods).rows[0];
 assert.equal(row.label,'Model studied · no written answer');
 assert.equal(row.needsReview,true);
 assert.equal(paperSummary(clean.paper,questions,methods).covered,0);
 assert.match(row.improvement,/population/);
});

test('improvement notes preserve student writing and export only after explicit opt-in',()=>{
 const q=byId.get('eval-d-app-only'),p=newPaper('review',[q.id]);
 p.entries[q.id]={stage:'done',values:{},draft:'A written answer',included:['point-1'],flag:true,
   improvement:'=SUM(1,2) — Remember who is excluded.',hintsUsed:1};
 const restored=sanitizeExamStore({version:1,reviewIds:[q.id],paper:p},questions,methods);
 assert.equal(restored.paper.entries[q.id].improvement,p.entries[q.id].improvement);
 const safe=reportCsv(restored.paper,questions,methods);
 const opted=reportCsv(restored.paper,questions,methods,{includeDrafts:true});
 assert.ok(!safe.includes('SUM(1,2)')&&!safe.includes('A written answer'));
 assert.ok(opted.includes('Improvement note')&&opted.includes("'=SUM(1,2)"));
 const long=structuredClone(p);
 long.entries[q.id].improvement='X'.repeat(900);
 assert.equal(sanitizeExamStore({version:1,paper:long},questions,methods).paper.entries[q.id].improvement.length,600);
});
