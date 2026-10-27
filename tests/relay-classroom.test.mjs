import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RELAY_PUZZLES} from '../multiplayer/relay-bank.js';
import {initialMosaicState,relayTask,relaySubmission,mosaicSnapshot}
from '../multiplayer/relay-rules.js';
function population(count,teams){return Array.from({length:count},(_,i)=>({id:'student-'+i,teamId:'team-'+(i%teams)}));}
function answerOne(state,team,role,now){
 const id=team.current.parts[role].assignedTo;
 const task=relayTask(state,id);
 const correct=RELAY_PUZZLES.find(p=>p.id===team.current.puzzleId)
   .parts[task.partIndex].correct;
 const opt=task.options.find(o=>o.label===correct);
 return relaySubmission(state,{participantId:id,roundId:task.roundId,
  partIndex:task.partIndex,choiceId:opt.id,now});
}
test('45-player classroom with four teams can finish the entire 15-tile mosaic',()=>{
 const teamCount=4;
 const players=population(45,teamCount);
 const state=initialMosaicState({players,teamCount,targetTiles:15,minutes:15,
  now:1_000_000,randomIndex:max=>0});
 assert.equal(state.originalRoster.length,45);
 assert.deepEqual(state.teams.map(t=>t.roster.length),[12,11,11,11]);
 let timestamp=1_000_100;
 let pieces=0;
 while(state.status==='playing'){
  const available=state.teams.find(t=>t.current);
  assert.ok(available,'Available team for remaining tiles');
  for(let role=0;role<3;role++){
   const result=answerOne(state,available,role,timestamp++);
   pieces++;
   assert.equal(result.ok,true);
  }
 }
 assert.equal(state.achieved,true);
 assert.equal(state.tiles.length,15);
 assert.equal(pieces,45);
 assert.ok(state.teams.every(t=>t.tiles>=3&&t.tiles<=4));
 const first=mosaicSnapshot(state,'student-0');
 assert.equal(first.mosaic.length,15);
 assert.equal(first.achieved,true);
});
test('all 45 player snapshots contain only the assigned mathematical piece',()=>{
 const players=population(45,3);
 const state=initialMosaicState({players,teamCount:3,targetTiles:10,minutes:15,
  now:1_000_000,randomIndex:max=>0});
 for(const p of players){
  const snapshot=mosaicSnapshot(state,p.id);
  assert.equal(snapshot.me.teamId,p.teamId);
  const str=JSON.stringify(snapshot);
  assert.doesNotMatch(str,/"optionOrder"|"answerKey"|"correctDestination"|"correctMethod"|"solutions"/);
  assert.ok(snapshot.me.task===null||snapshot.me.task.options.length===4);
 }
});
test('Pages UI never imports the Worker-only grading bank or adapter',()=>{
 const code=readFileSync(new URL('../multiplayer/relay-ui.js',import.meta.url),'utf8');
 assert.doesNotMatch(code,/from\s*['"].*relay-(?:bank|rules|adapter)/);
 assert.doesNotMatch(code,/import\s*\(/);
 assert.ok(code.includes('aria-label'));
 assert.ok(code.includes('refreshStage'));
});