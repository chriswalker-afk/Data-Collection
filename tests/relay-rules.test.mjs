import test from 'node:test';
import assert from 'node:assert/strict';
import {RELAY_PUZZLES} from '../multiplayer/relay-bank.js';
import {
 RELAY_TILE_GOALS,RELAY_ATTEMPT_LIMIT,validateRelaySetup,initialMosaicState,
 relayTask,relaySubmission,relayReopenRole,finishMosaic,mosaicSnapshot
} from '../multiplayer/relay-rules.js';

function players(teams=2,perTeam=2){
 return Array.from({length:teams*perTeam},(_,i)=>({id:'p'+i,teamId:'t'+Math.floor(i/perTeam)}));
}
const setup=(teams=2,perTeam=2,targetTiles=6)=>({players:players(teams,perTeam),teamCount:teams,targetTiles,minutes:8,now:1000,randomIndex:max=>0});
function taskAnswer(state,team,partIndex){
 const role=team.current.parts[partIndex];
 const task=relayTask(state,role.assignedTo);
 assert.ok(task,role.assignedTo+' should have an unfinished role');
 assert.equal(task.roundId,team.current.id);
 const puzzle=RELAY_PUZZLES.find(p=>p.id===team.current.puzzleId);
 const correct=puzzle.parts[task.partIndex].correct;
 const option=task.options.find(o=>o.label===correct);
 assert.ok(option,correct);
 return {participantId:role.assignedTo,roundId:task.roundId,partIndex:task.partIndex,choiceId:option.id};
}
function completeRound(state,team,now){
 const roundId=team.current.id;
 let unlocked=0;
 for(let i=0;i<3;i++){
  const answer=taskAnswer(state,team,i);
  const result=relaySubmission(state,{...answer,now:now+i});
  assert.equal(result.ok,true);
  assert.equal(result.correct,true);
  unlocked+=Number(result.tileUnlocked);
 }
 assert.equal(unlocked,1,'Three complementary roles unlock exactly one tile');
 assert.ok(state.tiles.some(t=>t.roundId===roundId));
}

test('bank has 16 unique contexts and 48 independently graded mathematical parts',()=>{
 assert.equal(RELAY_PUZZLES.length,16);
 assert.equal(new Set(RELAY_PUZZLES.map(p=>p.id)).size,16);
 const labels=new Set();
 for(const p of RELAY_PUZZLES){
  assert.ok(p.title&&p.context&&p.parts.length===3);
  for(const part of p.parts){
   assert.equal(part.choices.length,4);
   assert.equal(new Set(part.choices).size,4);
   assert.equal(part.correct,part.choices[0]);
   assert.ok(part.explanation.length>25);
   labels.add(part.prompt);
  }
 }
 assert.equal(labels.size,48);
});
test('room settings demand 2–4 balanced teams of at least 2 unique students',()=>{
 for(const n of [2,3,4])assert.equal(validateRelaySetup({...setup(n,2,6)}),null);
 for(const targetTiles of RELAY_TILE_GOALS)assert.equal(validateRelaySetup({...setup(3,2,targetTiles)}),null);
 for(const bad of [
  {teamCount:1},{teamCount:5},{targetTiles:7},{minutes:0},{minutes:16},
  {players:players(2,1)},{players:players(1,3)},{players:[{id:'a',teamId:'t0'},{id:'a',teamId:'t0'},{id:'b',teamId:'t1'},{id:'c',teamId:'t1'}]}
 ])assert.equal(typeof validateRelaySetup({...setup(),...bad}),'string',JSON.stringify(bad));
});
test('each player receives one private role, not the answer key or other teammate questions',()=>{
 const state=initialMosaicState(setup(2,3));
 const team=state.teams[0];
 const assigned=team.current.parts.map(p=>p.assignedTo);
 assert.equal(new Set(assigned).size,3);
 for(const id of assigned){
  const q=relayTask(state,id);
  assert.ok(q&&q.options.length===4);
  assert.ok(!Object.hasOwn(q,'correct'));
  assert.ok(!Object.hasOwn(q,'explanation'));
  assert.doesNotMatch(JSON.stringify(q),/correctDestination|answerKey|solution|correctMethod/);
  const snap=mosaicSnapshot(state,id);
  assert.ok(snap.me.task);
  assert.equal(snap.me.teamId,team.id);
 }
 assert.equal(mosaicSnapshot(state,'outsider').me,null);
});
test('shuffling prevents the answer from always being at c0',()=>{
 const positions=new Set();
 for(let p=0;p<RELAY_PUZZLES.length;p++){
  let sequence=0;
  const state=initialMosaicState({...setup(),randomIndex:max=>(sequence++ % max)});
  // Select each puzzle by moving the bank into the first position of the deck.
  state.deck=[RELAY_PUZZLES[p].id];
  state.teams[0].current.puzzleId=RELAY_PUZZLES[p].id;
  for(let i=0;i<3;i++){
   for(const part of state.teams[0].current.parts)part.solved=part.index!==i;
   const role=state.teams[0].current.parts[i];
   const q=relayTask(state,role.assignedTo);
   assert.equal(q.partIndex,i);
   const correct=RELAY_PUZZLES[p].parts[i].correct;
   positions.add(q.options.find(o=>o.label===correct).id);
  }
 }
 assert.ok(positions.size>=2,'Correct answer locations must vary');
});
test('student cannot score for a different team member, stale round or invalid choice',()=>{
 const state=initialMosaicState(setup());
 const team=state.teams[0],ans=taskAnswer(state,team,0);
 assert.equal(relaySubmission(state,{...ans,participantId:'p100',now:1100}).ok,false);
 assert.equal(relaySubmission(state,{...ans,participantId:team.current.parts[1].assignedTo,now:1100}).ok,false);
 assert.equal(relaySubmission(state,{...ans,roundId:'stale',now:1100}).ok,false);
 assert.equal(relaySubmission(state,{...ans,choiceId:'c99',now:1100}).ok,false);
 assert.equal(relaySubmission(state,{...ans,now:1100}).ok,true);
 assert.equal(relaySubmission(state,{...ans,now:1101}).ok,false);
 assert.equal(state.tiles.length,0);
});
test('wrong responses have a cooldown and limited attempts, teacher can reopen without awarding a tile',()=>{
 const state=initialMosaicState(setup());
 const team=state.teams[0],ans=taskAnswer(state,team,0);
 const wrong=relayTask(state,ans.participantId).options.find(o=>o.id!==ans.choiceId).id;
 let now=1100;
 for(let i=0;i<RELAY_ATTEMPT_LIMIT;i++){
  const r=relaySubmission(state,{...ans,choiceId:wrong,now});
  assert.equal(r.ok,true);assert.equal(r.correct,false);
  assert.equal(relaySubmission(state,{...ans,choiceId:wrong,now:now+10}).ok,false);
  now+=1600;
 }
 assert.equal(state.tiles.length,0);
 assert.equal(relaySubmission(state,{...ans,now}).ok,false);
 assert.equal(relayReopenRole(state,{teamId:team.id,partIndex:0,now:now+100}).ok,true);
 assert.equal(relaySubmission(state,{...ans,now:now+110}).correct,true);
 assert.equal(state.tiles.length,0);
});
test('full 6-tile class mosaic requires both teams and all puzzle roles',()=>{
 const state=initialMosaicState(setup(2,2,6));
 let now=1200;
 for(let i=0;i<6;i++){
  const team=state.teams[i%2];
  completeRound(state,team,now);now+=20;
 }
 assert.equal(state.status,'finished');
 assert.equal(state.achieved,true);
 assert.equal(state.finishReason,'target');
 assert.equal(state.tiles.length,6);
 assert.deepEqual(state.teams.map(t=>t.tiles),[3,3]);
 assert.ok(state.tiles.every(t=>new Set(t.contributors).size===2));
 const snap=mosaicSnapshot(state,'p0');
 assert.equal(snap.completedTiles,6);assert.equal(snap.targetTiles,6);
 assert.equal(snap.achieved,true);
 assert.equal(snap.mosaic.length,6);
 assert.equal(snap.me.task,null);
});
test('a fast team cannot dominate: cap forces participation from all teams',()=>{
 const state=initialMosaicState(setup(3,2,10));
 const [a,b,c]=state.teams;
 let now=1300;
 for(let i=0;i<4;i++){completeRound(state,a,now);now+=10;}
 assert.equal(a.tiles,4);assert.equal(a.current,null);
 assert.equal(state.achieved,false);
 for(let i=0;i<4;i++){completeRound(state,b,now);now+=10;}
 assert.equal(state.tiles.length,8);assert.equal(state.status,'playing');
 for(let i=0;i<2;i++){completeRound(state,c,now);now+=10;}
 assert.equal(state.tiles.length,10);assert.equal(state.achieved,true);
 assert.deepEqual(state.teams.map(t=>t.tiles),[4,4,2]);
});
test('timeout and host closing preserve earned tiles but NEVER invent success',()=>{
 const timed=initialMosaicState(setup());
 completeRound(timed,timed.teams[0],1200);
 const current=taskAnswer(timed,timed.teams[1],0);
 const invalid=relaySubmission(timed,{...current,now:timed.deadline+1});
 assert.equal(invalid.ok,false);
 assert.equal(timed.status,'finished');assert.equal(timed.finishReason,'time');
 assert.equal(timed.achieved,false);assert.equal(timed.tiles.length,1);
 const closed=initialMosaicState(setup());
 assert.equal(finishMosaic(closed,'host',2000),true);
 assert.equal(closed.achieved,false);
 assert.equal(finishMosaic(closed,'target',2001),false);
});
test('JSON persistence and repeated snapshots are safe for Durable Object reconnects',()=>{
 const state=initialMosaicState(setup(2,3));
 completeRound(state,state.teams[0],1300);
 const restored=JSON.parse(JSON.stringify(state));
 assert.deepEqual(mosaicSnapshot(restored,'p0'),mosaicSnapshot(state,'p0'));
 assert.ok(relayTask(restored,restored.teams[0].roster[0]));
});