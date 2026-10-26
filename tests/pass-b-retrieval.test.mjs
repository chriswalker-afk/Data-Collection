import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {conceptsInTopic,clozeInTopic,makeMatchRound} from '../src/core.js';
import {gradeCloze,gradeTerm} from '../src/recall.js';
import {
  CLOZE_ROUND_LENGTHS,MATCH_ROUND_LENGTHS,clozeLengthsForTopic,matchLengthsForTopic,
  makeClozeRound,validateClozeCoverage,validateRecallClues,addRecallClues,
  makeVariedSpeedDeck,makeVariedMatchRound
} from '../src/retrieval-depth.js';

const bank=name=>JSON.parse(readFileSync(new URL('../content/'+name+'.json',import.meta.url),'utf8'));
const {concepts}=bank('concepts'),{cloze}=bank('cloze'),{clues}=bank('recall-clues'),{terms}=bank('accepted-terms');
const byConcept=new Map(concepts.map(c=>[c.id,c]));
const sample=()=>0.37;

test('all 26 concepts have at least two original, checked Missing Words prompts',()=>{
  assert.equal(concepts.length,26);
  assert.equal(cloze.length,53);
  assert.equal(validateClozeCoverage(cloze,concepts),true);
  assert.equal(new Set(cloze.map(x=>x.id)).size,53);
  assert.equal(clozeInTopic(cloze,concepts,'sampling').length,37);
  assert.equal(clozeInTopic(cloze,concepts,'data').length,16);
  for(const concept of concepts){
    const questions=cloze.filter(q=>q.conceptId===concept.id);
    assert.ok(questions.length>=2,concept.id);
  }
  for(const q of cloze){
    assert.equal(q.prompt.split('{{blank}}').length,2,q.id);
    assert.equal(q.choices.length,4);
    assert.equal(gradeCloze(q.answer.toUpperCase(),q).status,'correct',q.id);
    for(const other of q.choices.filter(x=>x!==q.answer))
      assert.equal(gradeCloze(other,q).status,'wrong',q.id+': '+other);
  }
  assert.equal(cloze.find(q=>q.id==='cz-srs-all').answer,'sample');
  assert.equal(cloze.find(q=>q.id==='cz-srs-repeats').answer,'ignore');
  assert.equal(cloze.find(q=>q.id==='cz-bound-rounding').answer,'159.5');
  assert.equal(cloze.find(q=>q.id==='cz-prop-percent').answer,'20');
});

test('Missing Words focused decks prioritise varied concepts and previously unseen questions',()=>{
  assert.deepEqual(CLOZE_ROUND_LENGTHS,[10,20,'all']);
  assert.deepEqual(clozeLengthsForTopic(cloze,concepts,'data'),[10,'all']);
  assert.deepEqual(clozeLengthsForTopic(cloze,concepts,'sampling'),[10,20,'all']);
  for(const topic of ['sampling','data','all']){
    const original=JSON.stringify(cloze);
    const short=makeClozeRound(cloze,concepts,topic,10,sample);
    const replay=makeClozeRound(cloze,concepts,topic,10,sample,short.map(x=>x.id));
    const pool=clozeInTopic(cloze,concepts,topic);
    assert.equal(short.length,10,topic);
    assert.equal(new Set(short.map(x=>x.id)).size,10,topic);
    assert.equal(new Set(short.map(x=>x.conceptId)).size,Math.min(10,conceptsInTopic(concepts,topic).length));
    const overlap=replay.filter(q=>short.some(x=>x.id===q.id)).length;
    assert.equal(overlap,Math.max(0,20-pool.length),topic);
    assert.equal(makeClozeRound(cloze,concepts,topic,'all',sample).length,pool.length);
    assert.equal(JSON.stringify(cloze),original);
  }
  assert.equal(makeClozeRound(cloze,concepts,'data',20,sample).length,16);
  assert.throws(()=>makeClozeRound(cloze,concepts,'sampling',0),/Invalid/);
  const broken=structuredClone(cloze);
  broken[0].choices[0]='not a correct option';
  assert.throws(()=>validateClozeCoverage(broken,concepts),/Invalid/);
  assert.throws(()=>validateClozeCoverage(cloze.slice(0,25),concepts),/53/);
});

test('two mathematically distinct alternative recall descriptions exist for every concept',()=>{
  assert.equal(clues.length,52);
  assert.equal(validateRecallClues(concepts,clues),true);
  assert.equal(new Set(clues.map(x=>x.id)).size,52);
  for(const c of concepts){
    const selections=clues.filter(q=>q.conceptId===c.id);
    assert.equal(selections.length,2);
    assert.ok(selections.every(q=>q.text.length>65));
    assert.ok(selections.every(q=>!q.text.toLowerCase().includes(c.label.toLowerCase())));
    assert.equal(new Set([c.definition,...selections.map(q=>q.text)]).size,3);
  }
  const missing=structuredClone(clues).slice(0,51);
  assert.throws(()=>validateRecallClues(concepts,missing),/Two alternative/);
  const leaking=structuredClone(clues);
  leaking[0].text='This definition gives away the correct answer, which is Population.';
  assert.throws(()=>validateRecallClues(concepts,leaking),/leaks the answer/);
});

test('Speed Recall varies clues across consecutive decks without changing accepted answers',()=>{
  const first=makeVariedSpeedDeck(concepts,clues,'data',sample,10,new Map());
  assert.equal(first.items.length,8);
  const second=makeVariedSpeedDeck(concepts,clues,'data',sample,10,first.lastClues);
  assert.deepEqual(new Set(first.items.map(x=>x.id)),new Set(second.items.map(x=>x.id)));
  for(const c of first.items){
    const alternative=second.items.find(x=>x.id===c.id);
    assert.notEqual(c.recallClueId,alternative.recallClueId);
    assert.notEqual(c.recallPrompt,alternative.recallPrompt);
    assert.equal(c.definition,byConcept.get(c.id).definition);
    assert.equal(alternative.label,byConcept.get(c.id).label);
    assert.equal(gradeTerm(c.label,c,terms,concepts).status,'correct');
    assert.equal(gradeTerm('not a relevant mathematical term',c,terms,concepts).status,'wrong');
  }
  const one=addRecallClues([concepts[0]],clues,sample,new Map());
  const again=addRecallClues([concepts[0]],clues,sample,one.lastClues);
  assert.notEqual(one.items[0].recallPrompt,again.items[0].recallPrompt);
  assert.equal(one.items[0].id,concepts[0].id);
  assert.throws(()=>addRecallClues([concepts[0]],[],sample),/No alternative/);
  assert.equal(makeVariedSpeedDeck(concepts,clues,'sampling',sample,Infinity).items.length,18);
});

test('Match Up sizes are flexible, prompts vary and review does not expose matching keys',()=>{
  assert.deepEqual(MATCH_ROUND_LENGTHS,[5,7,10]);
  assert.deepEqual(matchLengthsForTopic(concepts,'sampling'),[5,7,10]);
  assert.deepEqual(matchLengthsForTopic(concepts,'data'),[5,7,8]);
  assert.deepEqual(matchLengthsForTopic(concepts,'all'),[5,7,10]);
  for(const topic of ['sampling','data','all']){
    for(const count of matchLengthsForTopic(concepts,topic)){
      const original=JSON.stringify(concepts);
      const round=makeVariedMatchRound(concepts,clues,topic,sample,count);
      assert.equal(round.terms.length,count);
      assert.equal(round.definitions.length,count);
      assert.equal(new Set(round.terms.map(c=>c.id)).size,count);
      assert.deepEqual(new Set(round.definitions.map(c=>c.id)),new Set(round.terms.map(c=>c.id)));
      assert.ok(round.terms.every((c,i)=>c.id!==round.definitions[i].id));
      for(const def of round.definitions){
        const same=round.terms.find(x=>x.id===def.id);
        assert.equal(def.definition,same.definition,'Matching clue is keyed only to concept ID');
        assert.equal(def.label,byConcept.get(def.id).label);
      }
      assert.equal(JSON.stringify(concepts),original);
    }
  }
  const first=makeVariedMatchRound(concepts,clues,'sampling',sample,5);
  const replay=makeVariedMatchRound(concepts,clues,'sampling',sample,5,
    first.terms.map(x=>x.id),first.lastClues);
  assert.equal(replay.terms.filter(x=>first.terms.some(y=>y.id===x.id)).length,0);
  const baseline=makeMatchRound(concepts,'data',sample);
  assert.equal(baseline.terms.length,5,'Legacy default remains compatible');
  assert.throws(()=>makeVariedMatchRound(concepts,clues,'sampling',sample,9),/Invalid/);
});
