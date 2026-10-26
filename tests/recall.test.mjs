import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 CLOZE_LEVELS, SPEED_MODES, SPEED_DURATIONS, normalizeAnswer, oneTypoAway,
 acceptedForConcept, validateTermBank, gradeTyped, gradeTerm, gradeCloze,
 speedDeck, secondsRemaining, formatClock
} from '../src/recall.js';
import {emptyProgress,recordAnswer,recordSession,progressForTopic} from '../src/progress.js';
const read = name => JSON.parse(readFileSync(new URL('../content/'+name+'.json',import.meta.url),'utf8'));
const {concepts}=read('concepts');
const {terms}=read('accepted-terms');
const {cloze}=read('cloze');
const byId = new Map(concepts.map(c=>[c.id,c]));

test('accepted term bank has no cross-concept ambiguity or unknown IDs',()=>{
 const owners=validateTermBank(concepts,terms);
 assert.ok(owners.size>=concepts.length);
 assert.equal(owners.get('convenience sampling'),'opportunity-sampling');
 assert.equal(owners.get('categorical data'),'qualitative-data');
 assert.equal(owners.get('stratum'),'stratum');
 assert.equal(owners.has('strata'),false,'Plural of stratum is not the same answer');
 assert.throws(()=>validateTermBank(concepts,{unknown:['term']}),/Unknown accepted-term concept/);
 assert.throws(()=>validateTermBank(concepts,{'stratum':['population']}),/Ambiguous alias/);
 assert.throws(()=>validateTermBank(concepts,{'sample':'one'}),/Expected alias list/);
});
test('term grading accepts only exact mathematical equivalents, case and punctuation differences',()=>{
 const cases=[
   ['opportunity-sampling','convenience sampling'],
   ['simple-random-sampling','simple random sample'],
   ['stratified-sampling','stratified'],
   ['quota-sampling','quota'],
   ['qualitative-data','categorical data'],
   ['class-midpoint','class mark'],
   ['class-width','width of a class'],
   ['systematic-sampling','SYSTEMATIC-SAMPLING'],
   ['population','Population!'],
 ];
 for (const [id,input] of cases){
   const grade=gradeTerm(input,byId.get(id),terms,concepts);
   assert.equal(grade.status,'correct',id+' '+input);
 }
 assert.equal(gradeTerm('strata',byId.get('stratum'),terms,concepts).status,'wrong');
 assert.equal(gradeTerm('quota sampling',byId.get('stratified-sampling'),terms,concepts).status,'wrong');
 assert.equal(gradeTerm('quantitative data',byId.get('qualitative-data'),terms,concepts).status,'wrong');
 assert.equal(gradeTerm('random sampling',byId.get('simple-random-sampling'),terms,concepts).status,'wrong');
 assert.equal(normalizeAnswer('  CLASS--MIDPOINT!! '),'class midpoint');
});
test('typos get a single correction opportunity, never automatic credit',()=>{
 assert.equal(oneTypoAway('populaton','population'),true);
 assert.equal(oneTypoAway('populaiton','population'),true,'Adjacent transposition');
 assert.equal(oneTypoAway('population','population'),false);
 assert.equal(oneTypoAway('quota','quato'),false,'Short terms are not automatically fuzzy');
 assert.equal(oneTypoAway('qualitative','quantitative'),false);
 assert.equal(gradeTerm('populaton',byId.get('population'),terms,concepts).status,'typo');
 assert.equal(gradeTerm('sample',byId.get('sample'),terms,concepts).status,'correct');
 assert.equal(gradeTerm('census',byId.get('sample'),terms,concepts).status,'wrong');
 assert.equal(gradeTerm('',byId.get('population'),terms,concepts).status,'empty');
 assert.equal(gradeTyped('stratifed',['stratified']).status,'typo');
 assert.equal(gradeTyped('quota',['stratified']).status,'wrong');
});
test('cloze independent checking matches the audited missing word exactly',()=>{
 assert.equal(cloze.length,25);
 for(const question of cloze){
   assert.equal(gradeCloze('  '+question.answer.toUpperCase()+'  ',question).status,'correct',question.id);
   assert.equal(gradeCloze(question.choices.find(c=>c!==question.answer),question).status,'wrong',question.id);
 }
 const q=cloze.find(c=>c.answer==='population');
 assert.equal(gradeCloze('populaton',q).status,'typo');
});
test('recall modes, time limits, and speed deck support all topics without duplicates',()=>{
 assert.deepEqual(CLOZE_LEVELS.map(x=>x.id),['choices','guided','independent']);
 assert.deepEqual(SPEED_MODES,['untimed','timed']);
 assert.deepEqual(SPEED_DURATIONS,[30,60,90]);
 for(const topic of ['sampling','data','all']){
   const deck=speedDeck(concepts,topic,()=>0.3);
   assert.equal(deck.length,topic==='data'?8:10);
   assert.equal(new Set(deck.map(c=>c.id)).size,deck.length);
   const long=speedDeck(concepts,topic,()=>0.7,Number.POSITIVE_INFINITY);
   assert.equal(long.length,topic==='sampling'?18:topic==='data'?8:26);
 }
 assert.throws(()=>speedDeck([], 'all'),/No concepts/);
 assert.equal(secondsRemaining(60001),61);
 assert.equal(secondsRemaining(59999),60);
 assert.equal(secondsRemaining(-1),0);
 assert.equal(formatClock(90000),'01:30');
 assert.equal(formatClock(59999),'01:00');
 assert.equal(formatClock(0),'00:00');
});
test('typed answers reuse the unchanged Pass 1 local progress schema',()=>{
 const old=emptyProgress();
 const next=recordSession(recordAnswer(recordAnswer(old,'population',true),'population',true));
 assert.deepEqual(Object.keys(next).sort(),['answers','concepts','sessions','version']);
 assert.equal(next.version,1);
 assert.equal(next.concepts.population.correct,2);
 assert.equal(progressForTopic(next,concepts,'sampling').mastered,1);
 const nearMiss=gradeTerm('populaton',byId.get('population'),terms,concepts);
 assert.equal(nearMiss.status,'typo');
 // The UI must NOT call recordAnswer on a typo prompt. Only a final submission records an attempt.
 assert.equal(next.answers,2);
});
