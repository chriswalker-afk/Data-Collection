import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  STORAGE_KEY, emptyProgress, sanitizeProgress, loadProgress,
  saveProgress, clearProgress, recordAnswer, recordPractice, recordSession, progressForTopic
} from '../src/progress.js';
const {concepts} = JSON.parse(readFileSync(new URL('../content/concepts.json',import.meta.url),'utf8'));
const memoryStorage = () => {
  const map = new Map();
  return {
    getItem: k => map.get(k) ?? null,
    setItem: (k,v) => map.set(k,v),
    removeItem: k => map.delete(k)
  };
};
test('correct answers and consecutive recall build topic-specific mastery', () => {
  const initial = emptyProgress();
  const first = recordAnswer(initial, 'population', true);
  const second = recordAnswer(first, 'population', true);
  assert.equal(initial.answers, 0, 'recordAnswer must be immutable');
  assert.equal(first.concepts.population.correct, 1);
  assert.deepEqual(second.concepts.population, {attempts:2,correct:2,streak:2});
  const stats = progressForTopic(second, concepts, 'sampling');
  assert.equal(stats.mastered,1);
  assert.equal(stats.practiced,1);
  assert.equal(progressForTopic(second, concepts, 'data').mastered, 0);
  const missed = recordAnswer(second,'population',false);
  assert.equal(missed.concepts.population.streak,0);
  assert.equal(progressForTopic(missed,concepts,'sampling').mastered,0);
});
test('sessions and answers persist locally and can be reset', () => {
  const storage = memoryStorage();
  const state = recordSession(recordAnswer(emptyProgress(),'qualitative-data',true));
  assert.equal(saveProgress(state,storage),true);
  assert.equal(loadProgress(storage).answers,1);
  assert.equal(loadProgress(storage).sessions,1);
  assert.ok(storage.getItem(STORAGE_KEY));
  assert.equal(clearProgress(storage),true);
  assert.deepEqual(loadProgress(storage),emptyProgress());
});
test('invalid, corrupt or unavailable browser storage never crashes', () => {
  const storage = memoryStorage();
  storage.setItem(STORAGE_KEY,'invalid json');
  assert.deepEqual(loadProgress(storage),emptyProgress());
  const blocked = {
    getItem: () => { throw new Error('Blocked'); },
    setItem: () => { throw new Error('Blocked'); },
    removeItem: () => { throw new Error('Blocked'); }
  };
  assert.deepEqual(loadProgress(blocked),emptyProgress());
  assert.equal(saveProgress(emptyProgress(),blocked),false);
  assert.equal(clearProgress(blocked),false);
});
test('progress sanitation discards invalid and unrecognised entries', () => {
  const p = sanitizeProgress({
    version:1, answers:4, sessions:1, concepts:{
      'population':{ attempts:3, correct:99, streak:99 },
      'invalid key!':{ attempts:3, correct:3, streak:3 },
      'sample':{ attempts:-10, correct:3, streak:2 }
    }
  });
  assert.deepEqual(p.concepts.population,{attempts:3,correct:3,streak:3});
  assert.equal(p.concepts['invalid key!'],undefined);
  assert.deepEqual(p.concepts.sample,{attempts:0,correct:0,streak:0});
  assert.deepEqual(sanitizeProgress({version:3,concepts:{}}),emptyProgress());
  assert.throws(()=>recordAnswer(emptyProgress(),'BAD KEY!',true));
});

test('ungraded writing counts exposure without incorrectly cancelling earned mastery',()=>{
 const one=recordAnswer(emptyProgress(),'population',true);
 const mastered=recordAnswer(one,'population',true);
 const practiced=recordPractice(mastered,'population');
 assert.deepEqual(mastered.concepts.population,{attempts:2,correct:2,streak:2},'input remains immutable');
 assert.deepEqual(practiced.concepts.population,{attempts:3,correct:2,streak:2});
 assert.equal(practiced.answers,mastered.answers+1);
 assert.equal(practiced.sessions,mastered.sessions);
 assert.equal(progressForTopic(practiced,concepts,'sampling').mastered,1);
 const newConcept=recordPractice(emptyProgress(),'sample');
 assert.deepEqual(newConcept.concepts.sample,{attempts:1,correct:0,streak:0});
 assert.equal(progressForTopic(newConcept,concepts,'sampling').mastered,0);
 // Genuine wrong answers must still break the independent streak.
 const wrong=recordAnswer(practiced,'population',false);
 assert.equal(wrong.concepts.population.streak,0);
 assert.equal(progressForTopic(wrong,concepts,'sampling').mastered,0);
 assert.throws(()=>recordPractice(emptyProgress(),'NOT VALID'),/Invalid concept/);
});
