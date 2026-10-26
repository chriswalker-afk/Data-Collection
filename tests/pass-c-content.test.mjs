import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEPENDENCIES,checkProcedure} from '../src/exam.js';
import {METHOD_ORDER} from '../src/phase2.js';
import {buildInsights,validateBuildBank} from '../src/build-method.js';
import {BUILD_SCENARIO_LEVELS,validateBuildScenarios,makeBuildScenarioDeck} from '../src/build-context.js';
import {validatePairBank,makePairSortRound,evaluateSortBoard} from '../src/sort-it.js';
const get=name=>JSON.parse(readFileSync(new URL('../content/'+name+'.json',import.meta.url),'utf8'));
const {methods}=get('methods'),{buildScenarios:cases}=get('build-scenarios'),
  {evaluations}=get('evaluations'),{pairs}=get('sort-pairs');
const byId=new Map(methods.map(x=>[x.id,x])),byEval=new Map(evaluations.map(x=>[x.id,x]));
const random=()=>.37;

test('every sampling method has three mathematically defensible contextual investigations',()=>{
 assert.equal(validateBuildBank(methods),true);
 assert.equal(validateBuildScenarios(methods,cases),true);
 assert.deepEqual(BUILD_SCENARIO_LEVELS,['mixed','foundation','develop','extend']);
 assert.equal(cases.length,15);
 assert.equal(new Set(cases.map(c=>c.id)).size,15);
 for(const id of METHOD_ORDER){
  const selected=cases.filter(c=>c.methodId===id);
  assert.equal(selected.length,3,id);
  assert.deepEqual(new Set(selected.map(c=>c.level)),new Set(['foundation','develop','extend']));
  for(const c of selected){
   const original=byId.get(id);
   assert.deepEqual(new Set(c.steps.map(x=>x.id)),new Set(original.procedure.map(x=>x.id)));
   assert.equal(checkProcedure({...original,procedure:c.steps},c.steps).correct,true,c.id);
   const inverted=[...c.steps].reverse();
   assert.equal(checkProcedure({...original,procedure:c.steps},inverted).correct,false,c.id);
   assert.ok(c.sourceIds.length>=1);
   assert.ok(c.context.length>90&&c.caution.length>70);
  }
 }
});

test('contextual systematic intervals produce exactly the requested number of positions',()=>{
 const scenarios=cases.filter(c=>c.methodId==='systematic');
 assert.equal(scenarios.length,3);
 for(const c of scenarios){
  const {N,n,k,start}=c.quantities;
  assert.equal(N%n,0,c.id);
  assert.equal(k,N/n,c.id);
  const positions=Array.from({length:n},(_,i)=>start+i*k);
  assert.equal(positions.length,n);
  assert.equal(new Set(positions).size,n);
  assert.equal(positions[0],start);
  assert.ok(positions.every(p=>p>=1&&p<=N));
  assert.equal(positions[n-1],start+(n-1)*k);
 }
 assert.deepEqual(cases.find(c=>c.id==='build-bottle-batch').quantities,{N:480,n:40,k:12,start:7});
 const invalid=structuredClone(cases);
 invalid.find(c=>c.id==='build-bottle-batch').quantities.k=13;
 assert.throws(()=>validateBuildScenarios(methods,invalid),/systematic interval/);
});

test('proportional stratified counts are mathematically coherent and selection stays random',()=>{
 for(const c of cases.filter(c=>c.methodId==='stratified')){
  const {N,n,strata}=c.quantities;
  assert.equal(strata.reduce((sum,x)=>sum+x.size,0),N);
  assert.equal(strata.reduce((sum,x)=>sum+x.allocation,0),n);
  assert.ok(strata.every(group=>Math.abs(group.allocation-n*group.size/N)<=1));
  assert.ok(c.steps.find(s=>s.id==='random').text.includes('Randomly')||
    c.steps.find(s=>s.id==='random').text.includes('random'));
 }
 const unusual=cases.find(c=>c.id==='build-habitat-plots');
 assert.deepEqual(unusual.quantities.strata.map(x=>x.allocation),[28,19,13]);
 const invalid=structuredClone(cases);
 invalid.find(c=>c.id==='build-habitat-plots').quantities.strata[0].allocation++;
 assert.throws(()=>validateBuildScenarios(methods,invalid),/allocation/);
});

test('quota group totals and opportunity recruitment are genuinely non-random',()=>{
 for(const c of cases.filter(c=>c.methodId==='quota')){
  assert.equal(c.quantities.quotas.reduce((sum,q)=>sum+q.target,0),c.quantities.n);
  assert.match(c.steps.find(x=>x.id==='recruit').text,/without (?:a )?random|non-randomly/i);
 }
 for(const c of cases.filter(c=>c.methodId==='opportunity')){
  assert.equal(c.quantities.quotas,undefined,'No group quotas for opportunity sampling');
  assert.match(c.caution,/differ|cannot|absent|no chance|little/i);
 }
 const bad=structuredClone(cases);
 bad.find(x=>x.id==='build-city-travel').quantities.quotas[0].target=44;
 assert.throws(()=>validateBuildScenarios(methods,bad),/Quota targets/);
});

test('varied-case rounds avoid immediate repeats without changing method IDs or scoring',()=>{
 const old=JSON.stringify(cases),oldMethods=JSON.stringify(methods);
 const a=makeBuildScenarioDeck(methods,cases,'quota','mixed',random);
 assert.deepEqual(a.items.map(x=>x.method.id),['quota','simple-random','systematic','stratified','opportunity']);
 assert.equal(a.items.length,5);
 const b=makeBuildScenarioDeck(methods,cases,'quota','mixed',random,a.recentCases);
 for(const item of a.items){
  const replay=b.items.find(x=>x.method.id===item.method.id);
  assert.notEqual(replay.scenario.id,item.scenario.id);
  assert.equal(item.method.conceptId,byId.get(item.method.id).conceptId);
  assert.equal(item.scenario.methodId,item.method.id);
  assert.equal(item.checked,false);
  assert.equal(item.correct,false);
  assert.equal(item.steps.length,byId.get(item.method.id).procedure.length);
  assert.equal(checkProcedure(item.method,item.scenario.steps).correct,true);
  assert.equal(buildInsights(item.method,item.scenario.steps).correct,true);
 }
 assert.equal(JSON.stringify(cases),old);
 assert.equal(JSON.stringify(methods),oldMethods);
 assert.equal(a.recentCases.get('quota'),a.items[0].scenario.id);
 for(const level of ['foundation','develop','extend']){
  const deck=makeBuildScenarioDeck(methods,cases,'simple-random',level,random);
  assert.ok(deck.items.every(x=>x.scenario.level===level));
 }
 assert.throws(()=>makeBuildScenarioDeck(methods,cases,'invalid'),/Unknown first/);
 assert.throws(()=>makeBuildScenarioDeck(methods,cases,'quota','hard'),/Unknown case level/);
});

test('all ten unique two-method comparisons are covered, balanced and correctly explained',()=>{
 assert.equal(evaluations.length,46);
 assert.equal(pairs.length,10);
 assert.equal(validatePairBank(pairs,evaluations),true);
 const combinations=new Set(),allUsed=new Set();
 for(const pair of pairs){
  combinations.add(pair.methods.slice().sort().join('|'));
  assert.ok(pair.evaluationIds.length>=8&&pair.evaluationIds.length<=12);
  const round=makePairSortRound(pairs,evaluations,pair.id,random);
  assert.equal(round.items.length,pair.evaluationIds.length);
  for(const card of round.items){
   assert.equal(card.correctDestination,card.conceptSubject+':'+card.polarity);
   assert.equal(card.explanation,byEval.get(card.id).explanation);
   assert.ok(pair.methods.includes(card.conceptSubject));
   allUsed.add(card.id);
  }
  for(const id of pair.methods)for(const polarity of ['advantage','disadvantage']){
   assert.ok(round.items.filter(c=>c.correctDestination===id+':'+polarity).length>=2,
     pair.id+' '+id+'/'+polarity);
  }
  const placed=Object.fromEntries(round.items.map(x=>[x.id,x.correctDestination]));
  assert.equal(evaluateSortBoard(round.items,placed).correct,round.items.length);
 }
 assert.equal(combinations.size,10);
 for(let i=0;i<METHOD_ORDER.length;i++)for(let j=i+1;j<METHOD_ORDER.length;j++)
   assert.ok(combinations.has([METHOD_ORDER[i],METHOD_ORDER[j]].sort().join('|')));
 assert.ok(evaluations.every(item=>allUsed.has(item.id)||['census','sample'].includes(item.subject)),
   'Every sampling-method evaluation should be used by at least one comparison');
 const duplicate=structuredClone(pairs);
 duplicate[9].methods=[...pairs[8].methods];
 assert.throws(()=>validatePairBank(duplicate,evaluations),/outside its pair|Repeated Sort It!/);
 assert.throws(()=>validatePairBank(pairs.slice(0,9),evaluations),/all ten/);
});
