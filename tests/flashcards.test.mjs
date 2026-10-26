import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  makeFlashDeck,flashFaces,makeFlashSession,rateFlashSession,skipFlashSession,
  makeFlashReviewSession,flashCardLabel
} from '../src/flashcards.js';

const cards=[
 {id:'a',label:'Sampling frame',definition:'List of potential participants',example:'A register',misconception:'Not the entire target population'},
 {id:'b',label:'Census',definition:'Every member of a population',example:'A complete enumeration',misconception:'A census is not a sample'},
 {id:'c',label:'Simple random sample',definition:'Equal chance for every possible subset',example:'Number generator',misconception:'Not opportunity sampling'}
];

test('a fresh flashcard session copies the deck and starts with no saved ratings',()=>{
 const deck=makeFlashSession(cards);
 assert.equal(deck.index,0);
 assert.equal(deck.revealed,false);
 assert.deepEqual(deck.ratings,{again:0,nearly:0,know:0});
 assert.equal(deck.skipped,0);
 assert.equal(deck.isReview,false);
 assert.equal(deck.items.length,3);
 assert.notEqual(deck.items,cards);
 assert.throws(()=>makeFlashSession([]),/at least one/);
});

test('Know it counts as confident recall; other ratings are tracked for review',()=>{
 const start=makeFlashSession(cards);
 assert.throws(()=>rateFlashSession(start,'know'),/Reveal the card/);
 assert.throws(()=>rateFlashSession({...start,revealed:true},'excellent'),/Unknown recall rating/);
 const known=rateFlashSession({...start,revealed:true},'know');
 assert.equal(known.correct,1);
 assert.deepEqual(known.revisitIds,[]);
 assert.deepEqual(known.ratings,{again:0,nearly:0,know:1});
 const nearly=rateFlashSession({...known,index:1,revealed:true},'nearly');
 assert.equal(nearly.correct,1);
 assert.deepEqual(nearly.revisitIds,['b']);
 assert.equal(nearly.ratings.nearly,1);
 const again=rateFlashSession({...nearly,index:2,revealed:true},'again');
 assert.equal(again.ratings.again,1);
 assert.deepEqual(again.revisitIds,['b','c']);
 assert.equal(start.correct,0,'pure operations must not mutate previous state');
});

test('skipping does not count a correct answer or increment any attempted rating',()=>{
 const start=makeFlashSession(cards);
 const next=skipFlashSession(start);
 assert.equal(next.correct,0);
 assert.equal(next.skipped,1);
 assert.deepEqual(next.ratings,{again:0,nearly:0,know:0});
 assert.deepEqual(next.revisitIds,['a']);
 assert.equal(start.skipped,0);
});

test('a focused review deck retains direction and only includes marked cards in source order',()=>{
 const start=makeFlashSession(cards,{reversed:true});
 const partial={...start,complete:true,revisitIds:['c','a'],correct:1};
 const review=makeFlashReviewSession(partial);
 assert.deepEqual(review.items.map(item=>item.id),['a','c']);
 assert.equal(review.isReview,true);
 assert.equal(review.reversed,true);
 assert.equal(review.complete,false);
 assert.equal(review.revealed,false);
 assert.deepEqual(review.revisitIds,[]);
 assert.equal(review.correct,0);
 assert.throws(()=>makeFlashReviewSession(start),/No cards/);
});

test('a flashcard names the visible side without exposing its answer before flipping',()=>{
 const start=makeFlashSession(cards);
 const front=flashCardLabel(start,cards[0]);
 assert.match(front,/Card 1 of 3/);
 assert.match(front,/Prompt: Sampling frame/);
 assert.doesNotMatch(front,/A register/);
 const flipped=flashCardLabel({...start,revealed:true},cards[0]);
 assert.match(flipped,/Answer: List of potential participants/);
 assert.match(flipped,/Watch out:/);
 const reversed=makeFlashSession(cards,{reversed:true});
 assert.match(flashCardLabel(reversed,cards[0]),/Prompt: List of potential participants/);
 assert.match(flashCardLabel({...reversed,revealed:true},cards[0]),/Answer: Sampling frame/);
});

test('evaluation cards cover every sampling method, census and sample in both polarities',()=>{
 const concepts=JSON.parse(readFileSync(new URL('../content/concepts.json',import.meta.url),'utf8')).concepts;
 const evaluations=JSON.parse(readFileSync(new URL('../content/evaluations.json',import.meta.url),'utf8')).evaluations;
 const sampling=makeFlashDeck(concepts,evaluations,'sampling');
 const mixed=makeFlashDeck(concepts,evaluations,'all');
 const data=makeFlashDeck(concepts,evaluations,'data');
 const evaluationCards=sampling.filter(card=>card.kind==='evaluation');
 assert.equal(evaluationCards.length,14);
 assert.equal(sampling.length,32);
 assert.equal(data.length,8);
 assert.equal(mixed.length,40);
 assert.equal(new Set(mixed.map(item=>item.id)).size,40);
 for(const subject of ['simple-random','systematic','stratified','quota','opportunity','census','sample']){
   for(const polarity of ['advantage','disadvantage']){
     const card=evaluationCards.find(item=>item.subject===subject&&item.polarity===polarity);
     assert.ok(card,subject+' '+polarity);
     const expected=evaluations.filter(e=>e.subject===subject&&e.polarity===polarity);
     assert.deepEqual(card.points,expected.map(({claim,explanation})=>({claim,explanation})));
     assert.ok(card.points.every(point=>point.claim&&point.explanation));
   }
 }
 assert.ok(mixed.filter(c=>c.kind==='term').every(c=>c.example&&c.misconception));
 assert.throws(()=>makeFlashDeck(concepts,[], 'sampling'),/Missing evaluation points/);
});
test('reverse mode leaves advantage/disadvantage prompts unchanged and accessible',()=>{
 const evaluations=JSON.parse(readFileSync(new URL('../content/evaluations.json',import.meta.url),'utf8')).evaluations;
 const card=makeFlashDeck(cards,evaluations,'sampling').find(x=>x.id==='flash-eval-simple-random-disadvantage');
 const normal=makeFlashSession([card]);
 const reversed=makeFlashSession([card],{reversed:true});
 assert.deepEqual(flashFaces(normal,card),flashFaces(reversed,card));
 assert.match(flashCardLabel(reversed,card),/Prompt: Disadvantages of simple random sampling/);
 reversed.revealed=true;
 assert.match(flashCardLabel(reversed,card),/Small subgroups may be underrepresented/);
 assert.match(flashCardLabel(reversed,card),/No fixed subgroup proportions/);
 assert.equal(flashFaces(makeFlashSession(cards,{reversed:true}),cards[0]).prompt,cards[0].definition);
});
test('all-card review session preserves source order and review intention',()=>{
 const session=makeFlashSession(cards,{isReview:true,reviewType:'all',reversed:true});
 assert.deepEqual(session.items.map(item=>item.id),cards.map(item=>item.id));
 assert.equal(session.reviewType,'all');
 assert.equal(session.isReview,true);
 assert.equal(session.reversed,true);
});
