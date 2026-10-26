import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makePairSortRound,validatePairBank,sortDestination,
  sortDestinationLabel,changeSortPlacement,evaluateSortBoard} from '../src/sort-it.js';
const file=name=>JSON.parse(readFileSync(new URL('../content/'+name+'.json',import.meta.url),'utf8'));
const {pairs}=file('sort-pairs'),{evaluations}=file('evaluations');
const byId=new Map(evaluations.map(e=>[e.id,e]));

test('every pair presents two sampling methods and four destinations with balanced audited claims',()=>{
 assert.equal(pairs.length,10);
 assert.equal(validatePairBank(pairs,evaluations),true);
 const covered=new Set();
 for(const pair of pairs){
  assert.equal(pair.methods.length,2);
  assert.ok(pair.evaluationIds.length>=8,'plenty of statements on '+pair.id);
  const round=makePairSortRound(pairs,evaluations,pair.id,()=>.4);
  assert.equal(round.items.length,pair.evaluationIds.length);
  assert.deepEqual(new Set(round.items.map(item=>item.id)),new Set(pair.evaluationIds));
  for(const method of pair.methods){
   covered.add(method);
   for(const polarity of ['advantage','disadvantage']){
    assert.ok(round.items.filter(x=>x.correctDestination===method+':'+polarity).length>=2,
      pair.id+' '+method+' '+polarity);
   }
  }
  for(const card of round.items){
   const audited=byId.get(card.id);
   assert.equal(card.explanation,audited.explanation);
   assert.equal(card.conceptSubject,audited.subject);
   assert.equal(card.polarity,audited.polarity);
   assert.equal(card.correctDestination,audited.subject+':'+audited.polarity);
  }
 }
 assert.equal(covered.size,5);
});

test('small subgroups are a disadvantage of simple random sampling, not stratified',()=>{
 const round=makePairSortRound(pairs,evaluations,'pair-srs-stratified',()=>.5);
 const item=round.items.find(x=>x.id==='srs-subgroups');
 assert.equal(item.prompt,'Small subgroups may be underrepresented by chance.');
 assert.equal(item.correctDestination,'simple-random:disadvantage');
 assert.match(item.explanation,/No fixed subgroup proportions/);
 assert.equal(sortDestinationLabel(item.correctDestination),'Simple random sampling — disadvantages');
});

test('placements support moving cards, returning them and ignoring invalid destinations',()=>{
 const round=makePairSortRound(pairs,evaluations,'pair-systematic-quota',()=>.4);
 const card=round.items[0],wrong=round.round.methods.find(m=>m!==card.conceptSubject);
 const before={};
 const placed=changeSortPlacement(before,round.items,card.id,sortDestination(wrong,'advantage'),round.round.methods);
 assert.deepEqual(before,{});
 assert.notEqual(placed,before);
 const result=evaluateSortBoard(round.items,placed);
 assert.equal(result.placed,1);
 assert.equal(result.ready,false);
 const corrected=changeSortPlacement(placed,round.items,card.id,card.correctDestination,round.round.methods);
 assert.equal(evaluateSortBoard(round.items,corrected).correct,1);
 const back=changeSortPlacement(corrected,round.items,card.id,null,round.round.methods);
 assert.equal(evaluateSortBoard(round.items,back).placed,0);
 assert.strictEqual(changeSortPlacement(placed,round.items,'does-not-exist','systematic:advantage',round.round.methods),placed);
 assert.strictEqual(changeSortPlacement(placed,round.items,card.id,'outside:advantage',round.round.methods),placed);
 assert.throws(()=>sortDestination('quota','neutral'),/Invalid/);
});
test('complete board is scored by unique card IDs with no mutation',()=>{
 const round=makePairSortRound(pairs,evaluations,'pair-srs-stratified',()=>.42);
 const placements=Object.fromEntries(round.items.map(item=>[item.id,item.correctDestination]));
 const before=JSON.stringify(placements);
 const perfect=evaluateSortBoard(round.items,placements);
 assert.equal(perfect.ready,true);
 assert.equal(perfect.correct,round.items.length);
 assert.equal(perfect.incorrectIds.length,0);
 const wrongItem=round.items[0];
 const wrongPolarity=wrongItem.polarity==='advantage'?'disadvantage':'advantage';
 const alternate={...placements,[wrongItem.id]:sortDestination(wrongItem.conceptSubject,wrongPolarity)};
 const result=evaluateSortBoard(round.items,alternate);
 assert.equal(result.correct,round.items.length-1);
 assert.deepEqual(result.incorrectIds,[wrongItem.id]);
 assert.equal(result.placed,round.items.length);
 assert.equal(JSON.stringify(placements),before);
});
test('invalid or unbalanced configurations are rejected before presenting students with ambiguous targets',()=>{
 assert.throws(()=>makePairSortRound(pairs,evaluations,'missing'),/Unknown/);
 const copy=structuredClone(pairs);
 copy[0].methods=['simple-random','simple-random'];
 assert.throws(()=>validatePairBank(copy,evaluations),/two distinct/);
 const missing=structuredClone(pairs);missing[0].evaluationIds.push('not-real');
 assert.throws(()=>validatePairBank(missing,evaluations),/outside its pair/);
 const duplicate=structuredClone(pairs);duplicate[0].evaluationIds[1]=duplicate[0].evaluationIds[0];
 assert.throws(()=>validatePairBank(duplicate,evaluations),/unique statements/);
 const weak=structuredClone(pairs);weak[0].evaluationIds=weak[0].evaluationIds.filter(id=>id!=='strata-random');
 assert.throws(()=>validatePairBank(weak,evaluations),/Each destination needs two statements/);
});
