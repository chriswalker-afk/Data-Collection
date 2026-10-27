import test from 'node:test';
import assert from 'node:assert/strict';
import {validMosaicSettings,startMosaic,handleMosaicCommand,
  expireMosaicRoom,closeMosaicRoom,mosaicPublicState}
from '../multiplayer/relay-adapter.js';
import {RELAY_PUZZLES} from '../multiplayer/relay-bank.js';
const players=[0,1,2,3].map(i=>({id:'p'+i,name:'Pupil '+i,teamId:i<2?'vector':'sigma'}));
const setup=()=>({status:'lobby',objective:'mosaic',game:'which',roundLength:5,
  teamCount:2,players:structuredClone(players),mosaicSettings:{teamCount:2,mosaicTiles:6,minutes:5},
  results:[{bad:'old'}],answers:[{bad:'old'}],ceremony:{old:true}});
const host={id:'host',host:true};
const student={id:'p0',host:false};
test('settings enforce dedicated cooperative format, safety clock and tiles',()=>{
 const d={objective:'mosaic',game:'which',roundLength:5,teamCount:2,mosaicTiles:6,minutes:5};
 assert.equal(validMosaicSettings(d),true);
 for(const bad of [{objective:'blitz'},{game:'speed'},{roundLength:10},
  {teamCount:0},{teamCount:5},{minutes:0},{minutes:16},{mosaicTiles:14}])
  assert.equal(validMosaicSettings({...d,...bad}),false,JSON.stringify(bad));
});
test('start initializes safe collaboration and stops legacy deck scoring',()=>{
 const room=setup();
 assert.deepEqual(startMosaic(room,1000,max=>0),{ok:true});
 assert.equal(room.status,'playing');
 assert.equal(room.mosaic.targetTiles,6);
 assert.equal(room.deadline,301000);
 assert.deepEqual(room.results,[]);assert.deepEqual(room.answers,[]);
 assert.deepEqual(room.deck,[]);assert.equal(room.ceremony,null);
 const h=mosaicPublicState(room,host);
 const s=mosaicPublicState(room,student);
 assert.equal(h.me,null);
 assert.equal(h.teams.length,2);
 assert.equal(s.me.teamId,'vector');
 assert.ok(s.me.task);
 assert.ok(!Object.hasOwn(s.me.task,'correct'));
});
test('host cannot impersonate a student; client cannot reopen a piece',()=>{
 const room=setup();startMosaic(room,1000,max=>0);
 const q=mosaicPublicState(room,student).me.task;
 assert.match(handleMosaicCommand(room,host,{type:'mosaic-answer',roundId:q.roundId,
  partIndex:q.partIndex,choiceId:'c0'},1100).error,/assigned student/);
 assert.match(handleMosaicCommand(room,student,{type:'mosaic-reopen',teamId:'vector',partIndex:0},1100).error,/teacher/);
 assert.deepEqual(handleMosaicCommand(room,student,{type:'noop'},1100),{recognized:false});
});
test('authenticated user receives only own feedback; forged score fields are ignored',()=>{
 const room=setup();startMosaic(room,1000,max=>0);
 const q=mosaicPublicState(room,student).me.task;
 const bank=RELAY_PUZZLES.find(p=>p.id===room.mosaic.teams[0].current.puzzleId);
 const option=q.options.find(x=>x.label===bank.parts[q.partIndex].correct);
 const result=handleMosaicCommand(room,student,{type:'mosaic-answer',roundId:q.roundId,
  partIndex:q.partIndex,choiceId:option.id,score:999999,tiles:99,achieved:true},1100);
 assert.equal(result.ok,true);
 assert.equal(room.mosaic.tiles.length,0);
 const mine=mosaicPublicState(room,student);
 assert.equal(mine.me.feedback.correct,true);
 const other=mosaicPublicState(room,{id:'p1',host:false});
 assert.equal(other.me?.feedback||null,null);
});
test('server timeout and teacher stop preserve earned work without invented win',()=>{
 const room=setup();startMosaic(room,1000,max=>0);
 assert.equal(expireMosaicRoom(room,2000),false);
 assert.equal(expireMosaicRoom(room,301000),true);
 assert.equal(room.mosaic.achieved,false);
 assert.equal(room.status,'finished');
 assert.equal(expireMosaicRoom(room,400000),false);
 const another=setup();startMosaic(another,1000,max=>0);
 assert.equal(closeMosaicRoom(another,1200),true);
 assert.equal(another.mosaic.finishReason,'host');assert.equal(another.mosaic.achieved,false);
});