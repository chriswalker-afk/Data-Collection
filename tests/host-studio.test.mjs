import test from 'node:test';
import assert from 'node:assert/strict';
import {
 DEFAULT_DRAFT,GAMES,OBJECTIVES,FORMATS,CLASS_METRICS,
 cleanStudioDraft,presetStudioDraft,validateStudioDraft,
 legacyRoomSettings,liveRoomSettings,describeStudioDraft
} from '../multiplayer/host-studio.js';

test('every defined objective, collaboration format and class metric has a label',()=>{
 assert.deepEqual(Object.keys(OBJECTIVES),['classic','blitz','bullseye','perfect','class','mosaic']);
 assert.deepEqual(Object.keys(FORMATS),['individual','squad','relay']);
 assert.deepEqual(Object.keys(CLASS_METRICS),['accuracy','correct','mastery','everyone']);
});
test('default configuration is validated and plays on the unchanged classic Worker',()=>{
 assert.deepEqual(validateStudioDraft(DEFAULT_DRAFT),{valid:true,playable:true,errors:[]});
 assert.deepEqual(legacyRoomSettings(DEFAULT_DRAFT),{game:'which',roundLength:10,teamCount:0,goalTarget:0});
});
test('classic squad and current class goal use the existing server commands',()=>{
 const d={...DEFAULT_DRAFT,format:'squad',teamCount:3,goalTarget:80,game:'sort',length:6};
 assert.deepEqual(legacyRoomSettings(d),{game:'sort',roundLength:6,teamCount:3,goalTarget:80});
});
test('quick, balanced and stretch presets use valid lengths for all four mathematical activities',()=>{
 for(const [game,info] of Object.entries(GAMES)){
  for(const preset of ['quick','balanced','stretch']){
   const result=presetStudioDraft({...DEFAULT_DRAFT,game,length:info.lengths[0]},preset);
   assert.ok(info.lengths.includes(result.length),game+' '+preset);
   assert.equal(validateStudioDraft(result).valid,true);
  }
 }
});
test('Classic, Blitz, races, Class Quest and Class Mosaic validate their supported configurations',()=>{
 const cooperative=presetStudioDraft(DEFAULT_DRAFT,'balanced','class');
 assert.equal(validateStudioDraft(cooperative).playable,true);
 assert.match(describeStudioDraft(cooperative).availability,/Ready to host/);
 const blitz=presetStudioDraft(DEFAULT_DRAFT,'balanced','blitz');
 assert.equal(validateStudioDraft(blitz).playable,true);
 assert.deepEqual(liveRoomSettings(blitz),{game:'which',roundLength:10,
   objective:'blitz',minutes:5,teamCount:0,goalTarget:0});
 assert.throws(()=>legacyRoomSettings(blitz),/not a Classic/);
 const relay={...DEFAULT_DRAFT,format:'relay',teamCount:4};
 assert.equal(validateStudioDraft(relay).playable,false);
 assert.throws(()=>liveRoomSettings(relay),/requires the Class Mosaic/);
 const mosaic=presetStudioDraft(DEFAULT_DRAFT,'balanced','mosaic');
 assert.equal(validateStudioDraft(mosaic).playable,true);
 assert.deepEqual(liveRoomSettings(mosaic),{objective:'mosaic',game:'which',
   roundLength:5,minutes:5,teamCount:2,mosaicTiles:10,goalTarget:0});
 assert.match(describeStudioDraft(mosaic).description,/three complementary/i);
 for(const [preset,tiles] of [['quick',6],['balanced',10],['stretch',15]]){
   const d=presetStudioDraft(DEFAULT_DRAFT,preset,'mosaic');
   assert.equal(d.mosaicTiles,tiles);
   assert.equal(validateStudioDraft(d).playable,true);
 }
});
test('Bullseye preview describes rolling window, not single-question accuracy',()=>{
 const d={...DEFAULT_DRAFT,objective:'bullseye',accuracyTarget:90,accuracyWindow:12};
 const s=describeStudioDraft(d);
 assert.match(s.description,/90% accuracy over the most recent 12 fully marked tasks/);
 assert.match(s.description,/after 12 tasks/);
});
test('perfect run preview is a genuine consecutive streak',()=>{
 const s=describeStudioDraft({...DEFAULT_DRAFT,objective:'perfect',streakTarget:8});
 assert.match(s.description,/8 fully correct tasks in a row/);
 assert.match(s.description,/resets the streak/);
});
test('class goals and participation thresholds are represented individually',()=>{
 for(const classMetric of Object.keys(CLASS_METRICS)){
  const d={...DEFAULT_DRAFT,objective:'class',classMetric,classParticipation:85};
  const s=describeStudioDraft(d);
  assert.equal(validateStudioDraft(d).valid,true);
  assert.match(s.description,/85%/);
 }
});
test('malformed external values, invalid lengths and bad percentages never create a room',()=>{
 const malformed=[
  {...DEFAULT_DRAFT,version:3},
  {...DEFAULT_DRAFT,objective:'unsupported'},
  {...DEFAULT_DRAFT,game:'unknown'},
  {...DEFAULT_DRAFT,game:'match',length:20},
  {...DEFAULT_DRAFT,accuracyTarget:101},
  {...DEFAULT_DRAFT,accuracyTarget:77},
  {...DEFAULT_DRAFT,accuracyWindow:1},
  {...DEFAULT_DRAFT,minutes:0},
  {...DEFAULT_DRAFT,minutes:1000},
  {...DEFAULT_DRAFT,streakTarget:0},
  {...DEFAULT_DRAFT,teamCount:9},
  {...DEFAULT_DRAFT,goalTarget:85},
  {...DEFAULT_DRAFT,classMetric:'other'},
  {...DEFAULT_DRAFT,classParticipation:101},
  {...DEFAULT_DRAFT,questionOrder:'leak'},
  {...DEFAULT_DRAFT,showLeaderboard:'true'}
 ];
 for(const d of malformed){
  assert.equal(validateStudioDraft(d).playable,false,JSON.stringify(d));
  assert.throws(()=>legacyRoomSettings(d));
 }
});
test('legacy, corrupted and unknown saved drafts restore to safe defaults',()=>{
 for(const value of [null,undefined,{},[],{version:3},{version:1,objective:'x',format:'unknown',game:'banana',
   length:-1,teamCount:900,accuracyTarget:10,showLeaderboard:'fake'}]){
  const d=cleanStudioDraft(value);
  assert.equal(d.version,1);
  assert.equal(validateStudioDraft(d).valid,true);
 }
});
test('presets preserve the subject and participation while resetting only target fields',()=>{
 const initial={...DEFAULT_DRAFT,game:'speed',format:'squad',teamCount:4,goalTarget:90};
 const d=presetStudioDraft(initial,'stretch','blitz');
 assert.equal(d.objective,'blitz');
 assert.equal(d.minutes,10);
 assert.equal(d.game,'speed');
 assert.equal(d.teamCount,4);
 assert.equal(d.goalTarget,90);
 assert.equal(d.format,'squad');
 assert.equal(validateStudioDraft(d).valid,true);
});
test('snapshot never implies a planned objective is live',()=>{
 for(const objective of Object.keys(OBJECTIVES)){
  const d=presetStudioDraft(DEFAULT_DRAFT,'balanced',objective);
  assert.equal(describeStudioDraft(d).playable,true,objective);
 }
});

test('Blitz cannot activate proposed difficulty or hidden leaderboard modifiers',()=>{
 const base=presetStudioDraft(DEFAULT_DRAFT,'balanced','blitz');
 for(const change of [{difficulty:'advanced'},{questionOrder:'same'},{showLeaderboard:false}]){
  const preview={...base,...change};
  assert.equal(validateStudioDraft(preview).playable,false);
  assert.throws(()=>liveRoomSettings(preview),/preview/);
 }
});
test('Blitz squad retains balanced team count and ignores Classic-only class goal',()=>{
 const base=presetStudioDraft({...DEFAULT_DRAFT,format:'squad',teamCount:4,goalTarget:90,
   game:'speed',length:20},'stretch','blitz');
 assert.deepEqual(liveRoomSettings(base),{game:'speed',roundLength:20,
   objective:'blitz',minutes:10,teamCount:4,goalTarget:0});
});

test('Bullseye and Perfect Run publish only validated server-side targets',()=>{
 const accuracy=presetStudioDraft(DEFAULT_DRAFT,'balanced','bullseye');
 assert.equal(validateStudioDraft(accuracy).playable,true);
 assert.deepEqual(liveRoomSettings(accuracy),{
  game:'which',roundLength:10,objective:'bullseye',minutes:5,
  accuracyTarget:80,accuracyWindow:10,teamCount:0,goalTarget:0
 });
 const streak=presetStudioDraft({...DEFAULT_DRAFT,format:'squad',teamCount:3},'stretch','perfect');
 assert.equal(validateStudioDraft(streak).playable,true);
 assert.deepEqual(liveRoomSettings(streak),{
  game:'which',roundLength:20,objective:'perfect',minutes:10,
  streakTarget:10,teamCount:3,goalTarget:0
 });
 for(const d of [accuracy,streak])assert.throws(()=>legacyRoomSettings(d),/not a Classic/);
});
test('race advanced preview modifiers cannot affect the live Worker',()=>{
 for(const objective of ['bullseye','perfect']){
  const base=presetStudioDraft(DEFAULT_DRAFT,'balanced',objective);
  for(const bad of [{difficulty:'advanced'},{questionOrder:'same'},{showLeaderboard:false}]){
   assert.equal(validateStudioDraft({...base,...bad}).playable,false);
   assert.throws(()=>liveRoomSettings({...base,...bad}),/preview/);
  }
 }
});

test('Class Quest settings are live only when validated and cannot enable planned modifiers',()=>{
 for(const metric of Object.keys(CLASS_METRICS)){
  const d={...DEFAULT_DRAFT,objective:'class',classMetric:metric,format:'squad',teamCount:3};
  assert.equal(validateStudioDraft(d).playable,true);
  assert.deepEqual(liveRoomSettings(d),{game:'which',roundLength:10,
   objective:'class',minutes:5,teamCount:3,goalTarget:0,
   classMetric:metric,classAccuracy:80,classCorrect:150,
   classParticipation:80,classPerStudent:5});
  for(const change of [{showLeaderboard:false},{difficulty:'advanced'},{questionOrder:'same'}]){
   assert.equal(validateStudioDraft({...d,...change}).playable,false);
  }
 }
});

test('Class Mosaic rejects unverified or incompatible configuration',()=>{
 const base=presetStudioDraft(DEFAULT_DRAFT,'balanced','mosaic');
 for(const invalid of [
   {mosaicTiles:7},{mosaicTiles:0},{minutes:0},{minutes:16},
   {format:'squad'},{showLeaderboard:true},{game:'sort'},
   {length:10},{difficulty:'advanced'},{questionOrder:'same'},
   {goalTarget:80},{teamCount:1},{teamCount:5}
 ]){
   const d={...base,...invalid};
   assert.equal(validateStudioDraft(d).playable,false,JSON.stringify(invalid));
   assert.throws(()=>liveRoomSettings(d));
 }
 const corrupted=cleanStudioDraft({...base,mosaicTiles:500});
 assert.equal(corrupted.mosaicTiles,10);
 assert.equal(validateStudioDraft(corrupted).playable,true);
});
