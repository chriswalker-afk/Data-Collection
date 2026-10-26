import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makePaper,PAPER_LEVELS,PAPER_TYPES,PAPER_SIZES,makeReviewPaper,emptyExamStore,
  sanitizeExamStore,loadExamStore,saveExamStore,EXAM_STORE_KEY} from '../src/exam-sim.js';
const content=JSON.parse(readFileSync(new URL('../content/exam-practice.json',import.meta.url),'utf8')).questions;
const byId=new Map(content.map(q=>[q.id,q]));
const rank={foundation:0,develop:1,extend:2};
test('every paper size can be generated at all three student-selected levels',()=>{
 assert.deepEqual(PAPER_LEVELS,['confidence','mixed','stretch']);
 for(const [variant,size] of Object.entries(PAPER_SIZES)){
  for(const difficulty of PAPER_LEVELS){
   for(const seed of [0.01,.2,.71,.99]){
    const paper=makePaper(content,variant,()=>seed,difficulty);
    assert.equal(paper.questionIds.length,size,variant+'/'+difficulty);
    assert.equal(new Set(paper.questionIds).size,size);
    assert.equal(paper.difficulty,difficulty);
    const types=paper.questionIds.map(id=>byId.get(id).type);
    for(const type of PAPER_TYPES)assert.equal(types.filter(t=>t===type).length,size/4);
    const levels=paper.questionIds.map(id=>byId.get(id).level);
    assert.deepEqual(levels,[...levels].sort((a,b)=>rank[a]-rank[b]),variant+'/'+difficulty);
    if(difficulty==='confidence')assert.ok(levels.every(level=>level!=='extend'));
    if(difficulty==='stretch')assert.ok(levels.every(level=>level!=='foundation'));
   }
  }
 }
});
test('standard/full exam papers maintain inference and method critiques within each level',()=>{
 for(const variant of ['standard','full'])for(const difficulty of PAPER_LEVELS){
  const paper=makePaper(content,variant,()=>.37,difficulty);
  const evaluations=paper.questionIds.map(id=>byId.get(id)).filter(q=>q.type==='evaluation');
  assert.ok(evaluations.some(q=>q.coverageArea==='inference'),variant+'/'+difficulty);
  assert.ok(evaluations.some(q=>q.coverageArea==='methods'),variant+'/'+difficulty);
 }
});
test('invalid levels are rejected rather than secretly changing question difficulty',()=>{
 assert.throws(()=>makePaper(content,'quick',()=>0,'expert'),/Unknown level/);
 assert.throws(()=>makePaper(content,'unknown',()=>0,'mixed'),/Unknown paper/);
});
test('old saved papers retain answers, self-review drafts and positions with mixed-level fallback',()=>{
 const q=content.find(q=>q.type==='evaluation');
 const p={variant:'review',questionIds:[q.id],index:0,complete:false,
  entries:{[q.id]:{stage:'review',draft:'My answer is preserved',included:['point-1'],flag:true,hintsUsed:1}}};
 const restored=sanitizeExamStore({version:1,reviewIds:[q.id],paper:p},content,[]);
 assert.equal(restored.paper.difficulty,'mixed');
 assert.equal(restored.paper.entries[q.id].draft,'My answer is preserved');
 assert.deepEqual(restored.paper.entries[q.id].included,['point-1']);
 assert.equal(restored.paper.entries[q.id].hintsUsed,1);
 for(const difficulty of PAPER_LEVELS){
  const paper=makePaper(content,'quick',()=>.15,difficulty);
  const saved=sanitizeExamStore({version:1,reviewIds:[],paper},content,[]);
  assert.equal(saved.paper.difficulty,difficulty);
  assert.deepEqual(saved.paper.questionIds,paper.questionIds);
 }
 const map=new Map();
 const storage={getItem:key=>map.get(key)||null,setItem:(key,v)=>map.set(key,v),removeItem:key=>map.delete(key)};
 assert.equal(saveExamStore(restored,content,[],storage),true);
 assert.equal(loadExamStore(content,[],storage).paper.entries[q.id].draft,'My answer is preserved');
 assert.ok(map.has(EXAM_STORE_KEY));
});
