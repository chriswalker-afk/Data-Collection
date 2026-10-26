import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  TOPICS, GAMES, conceptsInTopic, clozeInTopic, shuffled,
  makeMatchRound, splitCloze, clozeCorrect, normalizeKeyword,
  routeFromHash, hashFor
} from '../src/core.js';
const read = name => JSON.parse(readFileSync(new URL('../content/' + name + '.json', import.meta.url),'utf8'));
const {concepts} = read('concepts');
const {cloze} = read('cloze');

test('all five games and topic filters are available', () => {
  assert.deepEqual(GAMES.map(g => g.id), ['flashcards','match','cloze','sort','identify']);
  assert.deepEqual(TOPICS.map(t => t.id), ['sampling','data','all']);
  assert.equal(conceptsInTopic(concepts, 'sampling').length, 18);
  assert.equal(conceptsInTopic(concepts, 'data').length, 8);
  assert.equal(conceptsInTopic(concepts, 'all').length, 26);
  assert.equal(clozeInTopic(cloze, concepts, 'all').length, 25);
  assert.ok(clozeInTopic(cloze, concepts, 'sampling').length > 10);
  assert.ok(clozeInTopic(cloze, concepts, 'data').length > 4);
});

test('shuffling preserves membership and does not mutate original content', () => {
  const values = [1,2,3,4,5];
  const result = shuffled(values, () => 0);
  assert.deepEqual(values, [1,2,3,4,5]);
  assert.deepEqual([...result].sort(), values);
  assert.notDeepEqual(result, values);
});

test('Match Up always has unique terms, answers, and no accidental aligned rows', () => {
  for (const topic of ['sampling','data','all']) {
    for (const value of [0, 0.2, 0.55, 0.99]) {
      const round = makeMatchRound(concepts, topic, () => value);
      assert.equal(round.terms.length, 5);
      assert.equal(round.definitions.length, 5);
      const terms = round.terms.map(x => x.id);
      const definitions = round.definitions.map(x => x.id);
      assert.equal(new Set(terms).size, 5);
      assert.deepEqual([...terms].sort(), [...definitions].sort());
      assert.ok(round.terms.every((term,i) => term.id !== round.definitions[i].id));
    }
  }
});

test('Match Up requires at least two concepts', () => {
  assert.throws(() => makeMatchRound([], 'all'));
});

test('cloze splits one blank and grades normalized keywords', () => {
  assert.deepEqual(splitCloze('before {{blank}} after'), ['before ', ' after']);
  assert.throws(() => splitCloze('no blank'));
  assert.throws(() => splitCloze('{{blank}} {{blank}}'));
  const q = cloze.find(x => x.id === 'cz-strata');
  assert.equal(clozeCorrect(q, '  STRATA '), true);
  assert.equal(clozeCorrect(q, 'samples'), false);
  assert.equal(normalizeKeyword('  Class    WIDTH  '), 'class width');
  assert.ok(cloze.some(x => x.id === 'cz-srs-repeats' && x.answer === 'ignore'));
});

test('hash routes support GitHub Pages subpaths and safe topic fallbacks', () => {
  assert.deepEqual(routeFromHash('#/flashcards/data'), {mode:'flashcards',topic:'data'});
  assert.deepEqual(routeFromHash('#/cloze/all'), {mode:'cloze',topic:'all'});
  assert.deepEqual(routeFromHash('#/home/sampling'), {mode:'home',topic:'sampling'});
  assert.deepEqual(routeFromHash('#/invalid/unknown'), {mode:'home',topic:'sampling'});
  assert.equal(hashFor('match','data'), '#/match/data');
  assert.equal(hashFor('not-a-game','oops'), '#/home/sampling');
  assert.equal(hashFor('sort','data'), '#/sort/sampling');
  assert.equal(hashFor('identify','all'), '#/identify/sampling');
  assert.deepEqual(routeFromHash('#/identify/data'), {mode:'identify',topic:'sampling'});
  assert.deepEqual(routeFromHash('#/sort/all'), {mode:'sort',topic:'sampling'});
});
