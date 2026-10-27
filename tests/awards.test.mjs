import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  AWARDS,AWARDS_KEY,emptyAwards,sanitizeAwards,applyAwardEvent,awardStatus,
  earnedAwards,saveAwards,loadAwards,exportAwardBackup,restoreAwardBackup,clearAwards
} from '../src/awards.js';

const date='2026-10-26T10:00:00.000Z';
function award(state,event){return applyAwardEvent(state,event,date);}
function verify(game,id,extra={}){
  return {kind:'answer',game,id,verified:true,correct:true,review:false,assisted:false,...extra};
}
function fill(state,game,prefix,n,extra={}){
  for(let i=0;i<n;i++)state=award(state,verify(game,prefix+'-'+i,extra)).state;
  return state;
}
test('catalogue has 26 unique collectible IDs and labelled verification classes',()=>{
  assert.equal(AWARDS.length,26);
  assert.equal(new Set(AWARDS.map(a=>a.id)).size,16);
  assert.equal(AWARDS.filter(a=>a.level==='self-rated').length,4);
  assert.ok(AWARDS.every(a=>a.name&&a.emoji&&a.description&&a.hint));
});
test('the fox requires 2 distinct verified scenarios for all five methods',()=>{
  let state=emptyAwards();let final;
  for(const method of ['simple-random','systematic','stratified','quota','opportunity']){
    for(let i=0;i<2;i++)final=award(state,verify('identify',method+'-'+i,{method})),state=final.state;
  }
  assert.ok(final.newlyUnlocked.some(x=>x.id==='sampling-fox'));
  assert.equal(awardStatus(state,'sampling-fox').current,5);
  assert.ok(!earnedAwards(state).some(x=>x.id==='quota-quokka'));
  // A duplicate scenario cannot fill a method quota, even with a new method label.
  const again=award(state,verify('identify','quota-0',{method:'quota'}));
  assert.equal(Object.keys(again.state.evidence.identify).length,10);
  assert.deepEqual(again.newlyUnlocked,[]);
  state=award(state,verify('identify','quota-2',{method:'quota'})).state;
  assert.ok(earnedAwards(state).some(x=>x.id==='quota-quokka'));
});
test('hints, corrections, unscored reviews and wrong guesses cannot earn checked awards',()=>{
  let s=emptyAwards();
  for(const e of [
    verify('speed','term-1',{assisted:true}),
    verify('speed','term-2',{review:true}),
    verify('error','case-1',{correct:false}),
    verify('cloze','cz-1',{level:'guided'}),
    verify('flashcards','population'), // missing explicit self-rating
    verify('identify','scenario-x',{method:'unknown'})
  ])s=award(s,e).state;
  assert.deepEqual(s.evidence.speed,[]);
  assert.deepEqual(s.evidence.cloze,[]);
  assert.deepEqual(s.evidence.flashcards,[]);
  assert.deepEqual(Object.keys(s.evidence.identify),[]);
});
test('self ratings never masquerade as independently graded results',()=>{
  let s=emptyAwards();
  for(let i=0;i<10;i++)s=award(s,{...verify('flashcards','concept-'+i),
    verified:false,selfRated:true}).state;
  assert.ok(earnedAwards(s).some(x=>x.id==='flashcard-firefly'));
  assert.equal(awardStatus(s,'recall-raven').current,0);
  assert.equal(awardStatus(s,'sampling-fox').current,0);
});
test('independent typed recall, distinct errors and numerical answers have separate evidence',()=>{
  let s=fill(emptyAwards(),'speed','term',20);
  s=fill(s,'error','case',3);
  s=fill(s,'exam','num',3);
  assert.ok(earnedAwards(s).some(x=>x.id==='recall-raven'));
  assert.ok(earnedAwards(s).some(x=>x.id==='bias-buster'));
  assert.ok(earnedAwards(s).some(x=>x.id==='calculation-capybara'));
  assert.equal(s.evidence.reason.length,0);
});
test('only complete independent first-check rounds earn one-round trophies',()=>{
  let s=emptyAwards();
  const rounds=[
    {game:'match',total:8,correct:8,attempted:8,mistakes:0},
    {game:'sort',total:10,correct:10,firstCheck:true},
    {game:'cloze',total:10,correct:10,level:'independent'},
    {game:'build',total:5,correct:5,firstCheck:true},
    {game:'speed',total:10,correct:10,attempted:10,speedMode:'untimed'}
  ];
  for(const e of rounds){
    const negative=award(s,{kind:'round',verified:true,...e,correct:e.correct-1});
    assert.equal(negative.newlyUnlocked.length,0);
    const blocked=award(s,{kind:'round',verified:true,...e,review:true});
    assert.equal(blocked.newlyUnlocked.length,0);
    const good=award(s,{kind:'round',verified:true,...e});
    assert.ok(good.newlyUnlocked.some(x=>x.id===({match:'match-mongoose',sort:'sorting-salamander',cloze:'word-weasel',build:'procedure-panda',speed:'precision-penguin'})[e.game]),e.game);
    s=good.state;
  }
  assert.equal(s.evidence.rounds.length,5);
  const repeat=award(s,{kind:'round',verified:true,...rounds[0]});
  assert.deepEqual(repeat.newlyUnlocked,[]);
});
test('a written-effort award is distinctly self-rated and needs three different substantive drafts',()=>{
  let s=emptyAwards();
  for(let i=0;i<3;i++){
    s=award(s,{kind:'writing',game:'reason',id:'reason-'+i,independent:true,
      review:false,writtenLength:119}).state;
  }
  assert.equal(s.evidence.reason.length,0);
  for(let i=0;i<3;i++){
    s=award(s,{kind:'writing',game:'reason',id:'reason-'+i,independent:true,
      review:false,writtenLength:160}).state;
  }
  assert.ok(earnedAwards(s).some(x=>x.id==='reasoning-robin'));
  assert.equal(awardStatus(s,'bias-buster').current,0);
});
test('malformed or forged unlock records without supporting evidence are discarded',()=>{
  const crafted={version:1,evidence:{identify:{'case-0':'quota'},speed:['safe',null,'BAD!', 'safe']},
    unlocked:{'sampling-fox':'2020-01-01','bias-buster':'2020-01-01'}};
  const clean=sanitizeAwards(crafted);
  assert.equal(Object.keys(clean.unlocked).length,0);
  assert.deepEqual(clean.evidence.speed,['safe']);
  assert.equal(Object.keys(clean.evidence.identify).length,1);
  assert.equal(sanitizeAwards({version:8}).version,1);
});
test('export and restore merge valid proof without changing Solo progress',()=>{
  const storage=new Map([['sampling-arcade-progress-v1','{"version":1,"answers":77}']]);
  const adapter={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
  let initial=fill(emptyAwards(),'error','err',3);
  assert.equal(saveAwards(initial,adapter),true);
  assert.ok(storage.has(AWARDS_KEY));
  const json=exportAwardBackup(initial,date);
  const imported=restoreAwardBackup(json,fill(emptyAwards(),'exam','num',3));
  assert.equal(earnedAwards(imported).length,2);
  assert.equal(saveAwards(imported,adapter),true);
  assert.equal(loadAwards(adapter).unlocked['bias-buster'],date);
  assert.equal(storage.get('sampling-arcade-progress-v1'),'{"version":1,"answers":77}');
  assert.equal(clearAwards(adapter),true);
  assert.equal(storage.get('sampling-arcade-progress-v1'),'{"version":1,"answers":77}');
});
test('invalid backups do not erase stored awards',()=>{
  const before=fill(emptyAwards(),'error','err',3);
  for(const bad of ['{not json','{}','{"kind":"unknown","version":1,"cabinet":{}}',
    '{"kind":"sampling-arcade-awards-backup","version":20,"cabinet":{}}']){
    assert.throws(()=>restoreAwardBackup(bad,before),Error);
  }
  assert.ok(before.unlocked['bias-buster']);
});

test('new milestones unlock from verified distinct evidence and preserve legacy backups',()=>{
  let s=emptyAwards();
  const answer=(game,id,extra={})=>({kind:'answer',game,id,verified:true,correct:true,review:false,assisted:false,...extra});
  s=applyAwardEvent(s,answer('identify','first',{method:'quota'}),date).state;
  assert.ok(earnedAwards(s).some(x=>x.id==='curious-cat'));
  for(const method of ['simple-random','systematic','stratified','opportunity'])
    s=applyAwardEvent(s,answer('identify',method,{method}),date).state;
  assert.ok(earnedAwards(s).some(x=>x.id==='method-mouse'));
  for(let i=0;i<10;i++)s=applyAwardEvent(s,answer('identify','scenario-'+i,{method:'quota'}),date).state;
  assert.ok(earnedAwards(s).some(x=>x.id==='scenario-seal'));
  for(let i=0;i<6;i++){
    s=applyAwardEvent(s,answer('speed','typed-'+i),date).state;
    s=applyAwardEvent(s,answer('error','error-'+i),date).state;
    s=applyAwardEvent(s,answer('exam','calculation-'+i),date).state;
    if(i<5){
      s=applyAwardEvent(s,answer('flashcards','flash-'+i,{verified:false,selfRated:true}),date).state;
      s=applyAwardEvent(s,{kind:'writing',game:'reason',id:'reflection-'+i,independent:true,writtenLength:120},date).state;
    }
  }
  for(const id of ['vocabulary-viper','error-eagle','number-narwhal','flashcard-fawn','reflection-rabbit'])
    assert.ok(earnedAwards(s).some(x=>x.id===id),id);
  const old=s.unlocked['bias-buster'];
  delete s.unlocked['error-eagle'];
  const restored=restoreAwardBackup(exportAwardBackup(s,date));
  assert.ok(restored.unlocked['error-eagle']);
  assert.equal(restored.unlocked['bias-buster'],old);
});
test('three and five eligible round types unlock increasing multi-game trophies',()=>{
  let s=emptyAwards();
  const rounds=[
    {game:'match',total:8,correct:8,attempted:8,mistakes:0},
    {game:'sort',total:10,correct:10,firstCheck:true},
    {game:'cloze',total:10,correct:10,level:'independent'},
    {game:'build',total:5,correct:5,firstCheck:true},
    {game:'speed',total:10,correct:10,attempted:10,speedMode:'untimed'}
  ];
  for(let i=0;i<rounds.length;i++){
    s=applyAwardEvent(s,{kind:'round',verified:true,...rounds[i]},date).state;
    if(i===2)assert.ok(s.unlocked['arcade-alpaca']);
  }
  assert.ok(s.unlocked['pentathlon-peacock']);
});
