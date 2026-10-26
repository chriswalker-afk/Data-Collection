import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  METHOD_ORDER, ROUND_LENGTHS, SORT_LABELS, METHOD_LABELS,
  categoryLabel, conceptIdForSubject, makeSortRound, makeScenarioRound
} from '../src/phase2.js';

const file = name => JSON.parse(readFileSync(new URL('../content/' + name + '.json', import.meta.url), 'utf8'));
const {evaluations} = file('evaluations');
const {rounds} = file('sort-rounds');
const {methods} = file('methods');
const {scenarios} = file('scenarios');
const {concepts} = file('concepts');

test('Pass 2 references the audited bank with complete method and sorting labels', () => {
  assert.equal(METHOD_ORDER.length,5);
  assert.equal(rounds.length,9);
  assert.equal(evaluations.length,36);
  assert.equal(scenarios.length,50);
  assert.ok(rounds.every(round => SORT_LABELS[round.id]));
  assert.ok(METHOD_ORDER.every(method => METHOD_LABELS[method]));
  assert.equal(categoryLabel('advantage'), 'Advantage');
  assert.equal(categoryLabel('disadvantage'), 'Disadvantage');
  assert.equal(categoryLabel('quota'), 'Quota sampling');
});

test('Sort It! uses exactly the original scoped claims and answer keys', () => {
  const bank = new Map(evaluations.map(item => [item.id,item]));
  const used = new Set();
  for (const round of rounds.filter(item => item.type === 'polarity')) {
    const original = round.evaluationIds;
    const made = makeSortRound(rounds, evaluations, round.id, () => 0.3);
    assert.equal(made.items.length, original.length);
    assert.deepEqual([...made.items.map(item => item.id)].sort(), [...original].sort());
    const polarities = new Set();
    for (const item of made.items) {
      const source = bank.get(item.id);
      assert.equal(item.prompt, source.claim);
      assert.equal(item.explanation, source.explanation);
      assert.equal(item.correctCategory, source.polarity);
      assert.equal(item.conceptSubject, round.subject);
      polarities.add(item.correctCategory);
      assert.equal(used.has(item.id), false, 'No duplicate evaluation across rounds');
      used.add(item.id);
    }
    assert.deepEqual([...polarities].sort(), ['advantage','disadvantage']);
  }
  assert.equal(used.size, evaluations.length);
});

test('both comparison rounds have distinct answers and explicit explanations', () => {
  for (const round of rounds.filter(item => item.type === 'comparison')) {
    const original = round.cards;
    const made = makeSortRound(rounds, evaluations, round.id, () => 0.9);
    assert.equal(made.items.length, original.length);
    assert.equal(new Set(made.items.map(item => item.id)).size, original.length);
    assert.deepEqual(
      [...made.items.map(item => item.prompt)].sort(),
      [...original.map(item => item.prompt)].sort()
    );
    assert.deepEqual(new Set(made.items.map(item => item.correctCategory)), new Set(round.categories));
    assert.ok(made.items.every(item => item.explanation && item.conceptSubject === item.correctCategory));
  }
  assert.throws(()=>makeSortRound(rounds,evaluations,'unrecognised-set'),/Unknown sorting round/);
  assert.throws(()=>makeSortRound([{id:'bad',type:'polarity',subject:'census',evaluationIds:['missing']}],evaluations,'bad'),/Missing or mismatched evaluation/);
});

test('scenario rounds are balanced, non-repeating and do not mutate original data', () => {
  const before = JSON.stringify(scenarios);
  for(const length of ROUND_LENGTHS) {
    for(const seed of [0,0.2,0.77,0.99]) {
      const result = makeScenarioRound(scenarios,length,()=>seed);
      assert.equal(result.length,length);
      assert.equal(new Set(result.map(item=>item.id)).size,length);
      for(const method of METHOD_ORDER) {
        assert.equal(result.filter(item=>item.correctMethod===method).length,length/5);
      }
      assert.ok(result.every(item=>scenarios.some(source=>source.id===item.id && source.prompt===item.prompt)));
    }
  }
  assert.equal(JSON.stringify(scenarios),before);
  assert.throws(()=>makeScenarioRound(scenarios,4),/length must be/);
  assert.throws(()=>makeScenarioRound(scenarios,15),/length must be/);
  assert.throws(()=>makeScenarioRound(scenarios.slice(0,3),5),/Too few scenarios/);
});

test('evaluation and scenario results use existing concept IDs for shared progress', () => {
  const ids = new Set(concepts.map(item=>item.id));
  const subjects = [...new Set(evaluations.map(item=>item.subject))];
  for (const subject of subjects) assert.ok(ids.has(conceptIdForSubject(subject,methods)));
  for (const scenario of scenarios) assert.ok(ids.has(conceptIdForSubject(scenario.correctMethod,methods)));
  assert.equal(conceptIdForSubject('simple-random',methods),'simple-random-sampling');
  assert.equal(conceptIdForSubject('quota',methods),'quota-sampling');
  assert.equal(conceptIdForSubject('census',methods),'census');
  assert.throws(()=>conceptIdForSubject('unknown',methods),/Unknown sampling method/);
});
