import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SCENARIOS} from '../multiplayer/scenarios.js';
import {GAME_CONCEPTS,GAME_ALIASES,GAME_SORT_BOARDS} from '../multiplayer/game-bank.js';
import {GAME_IDS,GAME_MODES,validLength,questionTimeMs,makeGameDeck,
  safeGameQuestion,revealGameAnswer,gradeGameAnswer,normalizeRecall} from '../multiplayer/modes.js';
const sample=x=>JSON.parse(readFileSync(new URL('../content/'+x+'.json',import.meta.url),'utf8'));
const first=()=>0;
function deck(game,length){return makeGameDeck(game,length,SCENARIOS,first);}
function grade(game,q,input,time=3000){
  return gradeGameAnswer(game,q,input,time,questionTimeMs(game));
}
test('four game types expose validated lengths and meaningful per-question times',()=>{
  assert.deepEqual(GAME_IDS,['which','speed','match','sort']);
  for(const game of GAME_IDS){
    assert.ok(GAME_MODES[game].label);
    for(const n of GAME_MODES[game].lengths){
      assert.ok(validLength(game,n));
      assert.equal(deck(game,n).length,n);
    }
    assert.ok(questionTimeMs(game)>=20000);
    assert.ok(!validLength(game,99));
    assert.throws(()=>deck(game,99),/Invalid/);
  }
  assert.equal(validLength('constructor',5),false);
  assert.equal(validLength('__proto__',5),false);
});
test('Worker vocabulary exactly follows audited Solo concept and alias data',()=>{
  const source=sample('concepts').concepts.map(c=>({
    id:c.id,label:c.label,definition:c.definition,misconception:c.misconception,module:c.module
  }));
  assert.deepEqual(GAME_CONCEPTS,source);
  assert.deepEqual(GAME_ALIASES,sample('accepted-terms').terms);
});
test('Worker Sort It! boards exactly mirror Solo pair IDs, context and explanation',()=>{
  const pairs=sample('sort-pairs').pairs;
  const evals=Object.fromEntries(sample('evaluations').evaluations.map(e=>[e.id,e]));
  const expected=pairs.map(p=>({id:p.id,label:p.label,methods:p.methods,
    statements:p.evaluationIds.map(id=>{
      const e=evals[id];
      return {id,statement:p.claimOverrides?.[id]||e.claim,
        correctDestination:e.subject+':'+e.polarity,explanation:e.explanation};
    })}));
  assert.deepEqual(GAME_SORT_BOARDS,expected);
});
test('legacy Which Method? still balances all five methods and never leaks answers',()=>{
  const q=deck('which',5);
  assert.equal(new Set(q.map(x=>x.correctMethod)).size,5);
  const publicItem=safeGameQuestion('which',q[0]);
  assert.deepEqual(Object.keys(publicItem).sort(),['id','prompt']);
  const yes=grade('which',q[0],{method:q[0].correctMethod});
  const no=grade('which',q[0],{method:'not-a-method'});
  assert.ok(yes.points>=1000);
  assert.equal(no.error,'Choose one of the five sampling methods');
});
test('Speed Recall uses exact definitions and accepted synonyms, not guessing or typos',()=>{
  const q=deck('speed',20);
  assert.equal(new Set(q.map(x=>x.id)).size,20);
  for(const entry of q){
    const publicItem=safeGameQuestion('speed',entry);
    assert.ok(publicItem.prompt);
    assert.ok(!('label' in publicItem));
    assert.ok(!('aliases' in publicItem));
    const correct=grade('speed',entry,{response:entry.label});
    assert.equal(correct.correctCount,1);
    assert.ok(correct.points>=1000);
    if(entry.aliases.length)assert.equal(grade('speed',entry,{response:entry.aliases[0]}).correctCount,1);
    assert.equal(grade('speed',entry,{response:'WRONG ANSWER'}).points,0);
  }
  assert.equal(normalizeRecall('Simple-Random Sampling'),normalizeRecall('simple random sampling'));
  assert.equal(grade('speed',q[0],{response:''}).error?.includes('Type'),true);
  assert.equal(grade('speed',q[0],{response:'x'.repeat(101)}).error?.includes('100'),true);
  assert.ok(revealGameAnswer('speed',q[0]).correctTerm);
});
test('Match Up shuffles anonymous definition IDs and never exposes mappings until reveal',()=>{
  const q=deck('match',3);
  assert.equal(q.length,3);
  assert.equal(new Set(q.flatMap(board=>board.terms.map(t=>t.id))).size,18);
  for(const board of q){
    assert.equal(board.terms.length,6);assert.equal(board.definitions.length,6);
    const hidden=safeGameQuestion('match',board);
    assert.ok(!JSON.stringify(hidden).includes('answerKey'));
    assert.ok(!JSON.stringify(hidden).includes('sourceId'));
    assert.ok(hidden.definitions.every(d=>/^def-\d+$/.test(d.id)));
    const right=grade('match',board,{pairs:{...board.answerKey}});
    assert.equal(right.correctCount,6);
    assert.ok(right.points>=1000);
    const firstId=board.terms[0].id,secondId=board.terms[1].id;
    const swapped={...board.answerKey,[firstId]:board.answerKey[secondId],[secondId]:board.answerKey[firstId]};
    assert.equal(grade('match',board,{pairs:swapped}).correctCount,4);
    assert.equal(grade('match',board,{pairs:swapped}).points,667);
    const duplicate={...board.answerKey,[firstId]:board.answerKey[secondId]};
    assert.ok(grade('match',board,{pairs:duplicate}).error);
    assert.equal(revealGameAnswer('match',board).solutions.length,6);
  }
});
test('Sort It! scores full and partial first submissions; explanations remain hidden before reveal',()=>{
  const q=deck('sort',6);
  assert.equal(new Set(q.map(x=>x.id)).size,6);
  for(const board of q){
    const safe=safeGameQuestion('sort',board);
    assert.equal(safe.destinations.length,4);
    assert.ok(!JSON.stringify(safe).includes('correctDestination'));
    assert.ok(!JSON.stringify(safe).includes('explanation'));
    const truth=Object.fromEntries(board.solutions.map(s=>[s.id,s.correctDestination]));
    const full=grade('sort',board,{placements:truth});
    assert.equal(full.correctCount,board.statements.length);
    assert.ok(full.points>=1000);
    const id=board.statements[0].id;
    const other=board.destinations.find(x=>x.id!==truth[id]).id;
    const partial=grade('sort',board,{placements:{...truth,[id]:other}});
    assert.equal(partial.correctCount,board.statements.length-1);
    assert.ok(partial.points<1000);
    assert.ok(grade('sort',board,{placements:{}}).error);
    assert.equal(revealGameAnswer('sort',board).solutions.length,board.statements.length);
  }
});
test('server rejects malformed answer payloads, arbitrary keys and spoofed grading',()=>{
  const board=deck('sort',1)[0],valid=Object.fromEntries(board.solutions.map(s=>[s.id,s.correctDestination]));
  for(const attack of [
    {placements:{...valid,unexpected:'quota:advantage'}},
    {placements:[]},
    {placements:null},
    {placements:{...valid,[board.statements[0].id]:'bad:value'}}
  ])assert.ok(grade('sort',board,attack).error);
  const match=deck('match',1)[0];
  assert.ok(grade('match',match,{pairs:{...match.answerKey,unexpected:'def-0'}}).error);
  assert.ok(grade('match',match,{pairs:[]}).error);
  assert.ok(grade('speed',deck('speed',5)[0],{response:{score:999999}}).error);
});
