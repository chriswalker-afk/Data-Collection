import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEPENDENCIES,checkProcedure} from '../src/exam.js';
import {METHOD_ORDER} from '../src/phase2.js';
import {STEP_GUIDANCE,DEPENDENCY_EXPLANATIONS,moveToPosition,
 buildInsights,buildSummary,validateBuildBank} from '../src/build-method.js';

const {methods}=JSON.parse(readFileSync(new URL('../content/methods.json',import.meta.url),'utf8'));
const byId=id=>methods.find(x=>x.id===id);

test('every audited procedure has exactly one title and explanation per step',()=>{
 assert.equal(validateBuildBank(methods),true);
 assert.equal(methods.length,5);
 let totalSteps=0,totalDependencies=0;
 for(const method of methods){
  const ids=method.procedure.map(step=>step.id);
  const descriptions=STEP_GUIDANCE[method.id];
  assert.deepEqual(new Set(Object.keys(descriptions)),new Set(ids));
  for(const id of ids){
   assert.ok(descriptions[id].title.length>=10,method.id+'/'+id);
   assert.ok(descriptions[id].why.length>=40,method.id+'/'+id);
  }
  const edges=DEPENDENCIES[method.id];
  const explanations=DEPENDENCY_EXPLANATIONS[method.id];
  assert.equal(edges.length,Object.keys(explanations).length);
  for(const [before,after] of edges){
   assert.ok(explanations[before+'>'+after].length>=30,method.id+' '+before+'>'+after);
   assert.ok(ids.includes(before)&&ids.includes(after));
  }
  totalSteps+=ids.length;totalDependencies+=edges.length;
 }
 assert.equal(totalSteps,20);
 assert.equal(totalDependencies,16);
 assert.deepEqual(new Set(methods.map(m=>m.id)),new Set(METHOD_ORDER));
});

test('alternative order of opportunity sampling preliminaries is still accepted as valid',()=>{
 const method=byId('opportunity'),original=method.procedure;
 const swapped=[original[1],original[0],original[2]];
 const result=buildInsights(method,swapped);
 assert.equal(result.correct,true);
 assert.equal(result.validAlternative,true);
 assert.equal(result.passed,result.total);
 assert.equal(result.unmet.length,0);
 const canonical=buildInsights(method,original);
 assert.equal(canonical.correct,true);
 assert.equal(canonical.validAlternative,false);
});

test('mathematical prerequisite errors are named and explained rather than graded by canonical position',()=>{
 const method=byId('simple-random');
 const original=method.procedure;
 const bad=[original[1],original[0],...original.slice(2)];
 const r=buildInsights(method,bad);
 assert.equal(r.correct,false);
 assert.equal(r.total,4);
 assert.equal(r.passed,3);
 assert.deepEqual(r.unmet.map(row=>[row.before,row.after]),[['frame','number']]);
 assert.match(r.unmet[0].why,/complete frame must exist/);
 assert.equal(checkProcedure(method,bad).correct,false);
 assert.equal(buildInsights(method,original).correct,true);
});

test('proportional allocation must precede stratified random draws; random selection remains compulsory',()=>{
 const method=byId('stratified');
 const bad=[method.procedure[0],method.procedure[2],method.procedure[1],method.procedure[3]];
 const r=buildInsights(method,bad);
 assert.equal(r.correct,false);
 assert.deepEqual(r.unmet.map(row=>[row.before,row.after]),[['allocate','random']]);
 assert.match(r.unmet[0].why,/number to draw from each stratum/);
});

test('a move can target any valid position without changing the input or step identity',()=>{
 const items=byId('simple-random').procedure;
 const before=JSON.stringify(items);
 const moved=moveToPosition(items,'frame',4);
 assert.deepEqual(moved.map(s=>s.id),['number','generate','repeats','select','frame']);
 assert.strictEqual(moved[4],items[0]);
 assert.equal(JSON.stringify(items),before);
 assert.notStrictEqual(moved,items);
 assert.deepEqual(moveToPosition(items,'not-a-step',1),items);
 assert.deepEqual(moveToPosition(items,'frame',-1),items);
 assert.deepEqual(moveToPosition(items,'frame',NaN),items);
 assert.deepEqual(moveToPosition(items,'frame',items.length),items);
});

test('round summary distinguishes independent correctness, uncredited reveal and incorrect first checks',()=>{
 const result=buildSummary(methods,{
  'simple-random':{kind:'correct'},
  systematic:{kind:'wrong'},
  stratified:{kind:'revealed'},
  quota:{kind:'correct'}
 });
 assert.equal(result.length,5);
 assert.deepEqual(result.map(r=>r.kind),['correct','wrong','revealed','correct','unseen']);
 assert.match(result[0].message,/Valid independent sequence/);
 assert.match(result[2].message,/no independent credit/);
 assert.match(result[1].message,/Review/);
});

test('invalid or drifted procedure guidance is rejected, including duplicate step IDs',()=>{
 const missing=structuredClone(methods);
 missing[0].procedure.pop();
 assert.throws(()=>validateBuildBank(missing),/Incomplete step guidance/);
 const duplicate=structuredClone(methods);
 duplicate[1].procedure[1].id=duplicate[1].procedure[0].id;
 assert.throws(()=>validateBuildBank(duplicate),/Incomplete step guidance/);
 assert.throws(()=>validateBuildBank(methods.slice(0,4)),/five unique/);
});
