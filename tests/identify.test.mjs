import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {METHOD_ORDER} from '../src/phase2.js';
import {
  SCENARIO_EVIDENCE,CHOICE_CONTRASTS,evidenceParts,contrastForChoice,
  methodPerformance,reviewScenarioDeck,validateIdentifyBank
} from '../src/identify.js';

const {scenarios}=JSON.parse(readFileSync(new URL('../content/scenarios.json',import.meta.url),'utf8'));
test('all 50 Edexcel-aligned scenarios have precise quoted evidence without changing the bank',()=>{
 const before=JSON.stringify(scenarios);
 assert.equal(scenarios.length,50);
 assert.equal(validateIdentifyBank(scenarios),true);
 assert.equal(Object.keys(SCENARIO_EVIDENCE).length,20,'Legacy evidence remains supported');
 assert.equal(scenarios.filter(q=>q.level==='apply').length,35);
 for(const method of METHOD_ORDER){
  assert.equal(scenarios.filter(q=>q.correctMethod===method).length,10);
  assert.equal(scenarios.filter(q=>q.correctMethod===method&&q.level==='apply').length,7);
 }
 for(const scenario of scenarios){
  const clue=evidenceParts(scenario);
  assert.equal(clue.before+clue.quote+clue.after,scenario.prompt);
  assert.ok(clue.quote.length>=15,scenario.id);
  assert.ok(clue.quote.length<scenario.prompt.length,scenario.id);
 }
 assert.equal(JSON.stringify(scenarios),before);
});
test('each of the five sampling methods contrasts correctly with all four alternatives',()=>{
 for(const actual of METHOD_ORDER){
  const scenario=scenarios.find(x=>x.correctMethod===actual);
  assert.ok(scenario);
  assert.equal(Object.keys(CHOICE_CONTRASTS[actual]).length,4);
  for(const chosen of METHOD_ORDER){
   const reason=contrastForChoice(scenario,chosen);
   if(chosen===actual)assert.equal(reason,scenario.contrast);
   else {
    assert.ok(reason.length>=30,actual+'/'+chosen);
    assert.notEqual(reason,scenario.reason);
    assert.ok(reason.endsWith('.'),actual+'/'+chosen);
   }
  }
 }
 assert.throws(()=>contrastForChoice(scenarios[0],'unknown'),/Invalid sampling/);
});
test('method performance shows actual per-method attempts, not an implied exam grade',()=>{
 const items=[
  scenarios.find(x=>x.id==='sr-01'),
  scenarios.find(x=>x.id==='st-02'),
  scenarios.find(x=>x.id==='st-03'),
  scenarios.find(x=>x.id==='qu-04')
 ];
 const before=JSON.stringify(items);
 const report=methodPerformance(items,{
  'sr-01':{choice:'simple-random',correct:true},
  'st-02':{choice:'quota',correct:false},
  'st-03':{choice:'stratified',correct:true}
 });
 assert.deepEqual(report.map(x=>[x.id,x.total,x.attempted,x.correct,x.missed]),
  [['simple-random',1,1,1,0],['stratified',2,2,1,1],['quota',1,0,0,0]]);
 assert.equal(JSON.stringify(items),before);
});
test('missed-case review includes the original cases once and never upgrades mastery by itself',()=>{
 const missed=new Set(['sr-01','st-03','nonexistent','sr-01']);
 const a=reviewScenarioDeck(scenarios,missed);
 assert.deepEqual(a.map(x=>x.id),['sr-01','st-03']);
 assert.strictEqual(a[0],scenarios[0]);
 assert.deepEqual(reviewScenarioDeck(scenarios,new Set()),[]);
});
test('missing or altered evidence fails loudly before confusing students',()=>{
 const mutated=scenarios.map(x=>({...x}));
 mutated[0].prompt='Changed question without evidence.';
 assert.throws(()=>validateIdentifyBank(mutated),/Evidence quotation/);
 assert.throws(()=>validateIdentifyBank(mutated.slice(0,4)),/Incomplete/);
 const duplicated=scenarios.map(x=>({...x}));
 duplicated[1].id=duplicated[0].id;
 assert.throws(()=>validateIdentifyBank(duplicated),/Repeated scenario ID/);
});
