import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ARENA_AWARDS} from '../multiplayer/award-catalogue.js';
import {roomAwards,makeCeremony,ceremonySnapshot,collectableReceipt}
  from '../multiplayer/ceremony-rules.js';
import {saveKeepsake,loadKeepsakes,keepsakeSummary,sanitizeKeepsakes,
  MULTIPLAYER_KEEPSAKES_KEY} from '../multiplayer/keepsakes.js';

const alice='11111111-1111-4111-8111-111111111111';
const bob='22222222-2222-4222-8222-222222222222';
const carol='33333333-3333-4333-8333-333333333333';
const roomId='44444444-4444-4444-8444-444444444444';
const player=(id,name,score)=>({id,name,score});
const record=(playerId,index,correctCount,total=1,extras={})=>({
  playerId,index,questionId:'question-'+index,correctCount,total,points:correctCount?1000:0,...extras
});
const room=(game,players,results=[])=>({
  game,players,results,ceremonyId:roomId,status:'finished',code:'123456'
});
test('11 unique mathematical character awards have meaningful names and conditions',()=>{
 assert.equal(ARENA_AWARDS.length,11);
 assert.equal(new Set(ARENA_AWARDS.map(x=>x.id)).size,11);
 assert.ok(ARENA_AWARDS.every(a=>a.emoji&&a.name&&a.detail));
});
test('podium is based on server points; tied winners share first place',()=>{
 const r=room('which',[player(alice,'Alice',2500),player(bob,'Bob',2500),
   player(carol,'Carol',1000),player('dddddddd-dddd-4ddd-8ddd-dddddddddddd','Derek',0)]);
 const result=roomAwards(r);
 assert.deepEqual(result.standings.map(x=>x.rank),[1,1,3]);
 assert.deepEqual(result.standings.map(x=>x.name),['Alice','Bob','Carol']);
 assert.ok(result.standings.every(x=>x.score>0));
 assert.equal(roomAwards(room('which',[player(alice,'Alice',0)])).standings.length,0);
});
test('Which Method? earns awards for distinct correct methods and never mere attempts',()=>{
 const r=room('which',[player(alice,'Alice',5000),player(bob,'Bob',0)],[
  ...['simple-random','systematic','stratified','quota','opportunity'].map(
    (method,i)=>record(alice,i,1,1,{method})),
  record(bob,0,0),record(bob,1,0)
 ]);
 const awards=roomAwards(r).earned;
 assert.ok(awards[alice].includes('sampling-fox'));
 assert.ok(awards[alice].includes('method-maestro'));
 assert.ok(awards[alice].includes('bias-buster'));
 assert.ok(awards[alice].includes('precision-penguin'));
 assert.equal(awards[bob].length,0);
});
test('award conditions distinguish full verified boards, partial boards, recall and sustained work',()=>{
 const match=room('match',[player(alice,'Alice',2200)],[
  record(alice,0,6,6),record(alice,1,5,6)
 ]);
 assert.ok(roomAwards(match).earned[alice].includes('match-mongoose'));
 assert.ok(!roomAwards(match).earned[alice].includes('precision-penguin'));
 assert.ok(roomAwards(match).earned[alice].includes('calm-capybara')); // 11 of 12 decisions
 const sort=room('sort',[player(alice,'Alice',1200)],[record(alice,0,9,9)]);
 assert.ok(roomAwards(sort).earned[alice].includes('sorting-salamander'));
 assert.ok(roomAwards(sort).earned[alice].includes('precision-penguin'));
 const speed=room('speed',[player(alice,'Alice',5200)],Array.from({length:5},(_,i)=>
  record(alice,i,1,1,{termId:'term-'+i})));
 assert.ok(roomAwards(speed).earned[alice].includes('recall-raven'));
 assert.ok(roomAwards(speed).earned[alice].includes('steady-stoat'));
});
test('comeback requires an error followed by two fully correct questions',()=>{
 const r=room('speed',[player(alice,'Alice',2000)],[
  record(alice,0,0),record(alice,1,1),record(alice,2,1)
 ]);
 assert.ok(roomAwards(r).earned[alice].includes('comeback-koala'));
 r.results.pop();
 assert.ok(!roomAwards(r).earned[alice].includes('comeback-koala'));
});
test('missing or invalid/forged ungraded evidence cannot create an achievement',()=>{
 const r=room('match',[player(alice,'Alice',99999)],[]);
 assert.equal(roomAwards(r).earned[alice].length,0);
 r.results=[record(alice,0,0,6,{points:0}),{playerId:alice,index:1,questionId:'q',
   correctCount:999,total:6,points:1000}];
 assert.equal(roomAwards(r).earned[alice].length,0);
});
test('ceremony reveals only the current slide and no future award recipients',()=>{
 const r=room('sort',[player(alice,'Alice',1100),player(bob,'Bob',0)],[record(alice,0,10,10)]);
 const prepared=makeCeremony(r);
 assert.equal(prepared.slides[0].kind,'welcome');
 assert.equal(prepared.slides[1].kind,'podium');
 assert.equal(prepared.slides.at(-1).kind,'finale');
 assert.ok(prepared.slides.some(x=>x.kind==='award'&&x.award.id==='sorting-salamander'));
 assert.ok(!prepared.slides.some(x=>x.kind==='award'&&x.recipients.some(p=>p.id===bob)));
 r.ceremony={...prepared,step:0,run:2,completed:false};
 r.status='ceremony';
 const welcome=ceremonySnapshot(r,{id:alice,host:false});
 assert.equal(welcome.slide.kind,'welcome');
 assert.equal(welcome.total,prepared.slides.length);
 assert.ok(!JSON.stringify(welcome).includes('sorting-salamander'));
 assert.equal(collectableReceipt(r,{id:alice,host:false}),null);
 r.ceremony.step=r.ceremony.slides.length-1;
 assert.deepEqual(collectableReceipt(r,{id:alice,host:false}).awarded,
   prepared.earned[alice]);
 assert.equal(collectableReceipt(r,{id:'host',host:true}),null);
 r.status='finished';r.ceremony.completed=true;
 assert.equal(ceremonySnapshot(r,{id:bob,host:false}).slide,null);
 assert.equal(collectableReceipt(r,{id:bob,host:false}).awarded.length,0);
});
test('local keepsakes are separate, deduplicated, small and nickname-free',()=>{
 const storage=new Map([['sampling-arcade-progress-v1','untouched'],
   ['sampling-arcade-awards-v1','solo trophies']]);
 const adapter={getItem:key=>storage.get(key)??null,
  setItem:(key,value)=>storage.set(key,value)};
 const receipt={roomId,game:'match',completed:true,awarded:['match-mongoose','precision-penguin']};
 assert.equal(saveKeepsake(receipt,adapter,'2026-10-26T00:00:00Z'),true);
 assert.equal(saveKeepsake(receipt,adapter),true);
 const data=loadKeepsakes(adapter);
 assert.equal(data.entries.length,1);
 assert.equal(keepsakeSummary(data).length,2);
 assert.ok(!JSON.stringify(data).includes('Alice'));
 assert.equal(storage.get('sampling-arcade-progress-v1'),'untouched');
 assert.equal(storage.get('sampling-arcade-awards-v1'),'solo trophies');
 assert.ok(storage.has(MULTIPLAYER_KEEPSAKES_KEY));
 assert.equal(saveKeepsake({...receipt,roomId:'not-uuid'},adapter),false);
 assert.equal(saveKeepsake({...receipt,completed:false},adapter),false);
 assert.equal(sanitizeKeepsakes({entries:[{roomId,game:'which',awarded:['invented-award'],
  collectedAt:'tomorrow'}]}).entries.length,0);
});
