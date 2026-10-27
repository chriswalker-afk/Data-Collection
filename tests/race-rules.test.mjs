import test from 'node:test';
import assert from 'node:assert/strict';
import {
 isRace,isPaced,validRaceSettings,initialRaceProgress,
 raceTaskProgress,recordRaceTask,raceStandings
} from '../multiplayer/race-rules.js';

const settings=(objective,more={})=>({
  objective,game:'which',roundLength:5,minutes:5,
  accuracyTarget:80,accuracyWindow:5,streakTarget:3,...more
});
function initial(){return {attempts:0,race:initialRaceProgress()};}
function submit(progress,objective,config,correctCount=1,total=1,now=1000){
  progress.attempts++;
  return recordRaceTask(progress,objective,config,{correctCount,total},now);
}
test('only Bullseye/Perfect Run are races, while Classic and Blitz retain their semantics',()=>{
 assert.deepEqual(['classic','blitz','bullseye','perfect','class'].map(isRace),
   [false,false,true,true,false]);
 assert.deepEqual(['classic','blitz','bullseye','perfect','class'].map(isPaced),
   [false,true,true,true,false]);
});
test('race settings are strictly validated on the Worker',()=>{
 assert.equal(validRaceSettings(settings('bullseye')),true);
 assert.equal(validRaceSettings(settings('perfect')),true);
 for(const invalid of [
   settings('class'),settings('blitz'),settings('bullseye',{accuracyTarget:77}),
   settings('bullseye',{accuracyTarget:101}),settings('bullseye',{accuracyWindow:4}),
   settings('bullseye',{accuracyWindow:21}),settings('bullseye',{accuracyWindow:'10'}),
   settings('perfect',{streakTarget:2}),settings('perfect',{streakTarget:21}),
   settings('perfect',{streakTarget:'5'}),
   settings('perfect',{minutes:0}),settings('perfect',{minutes:16}),
   settings('bullseye',{game:'missing'}),settings('perfect',{roundLength:100})
 ])assert.equal(validRaceSettings(invalid),false,JSON.stringify(invalid));
});
test('Bullseye requires the full rolling window; 100% early is never a win',()=>{
 const p=initial(),s=settings('bullseye',{accuracyTarget:80,accuracyWindow:5});
 for(let i=0;i<4;i++){
  const result=submit(p,'bullseye',s,1,1,1000+i);
  assert.equal(result.won,false);
  assert.equal(result.progress.ready,false);
 }
 const last=submit(p,'bullseye',s,0,1,1005);
 assert.equal(last.won,true); // 4/5 = 80%
 assert.equal(last.progress.windowCorrect,4);
 assert.equal(last.progress.windowAnswered,5);
 assert.equal(last.progress.windowAccuracy,80);
 assert.equal(p.race.reachedAttempt,5);
 assert.equal(p.race.reachedAt,1005);
});
test('rolling accuracy removes oldest task and never counts all-time accuracy',()=>{
 const p=initial(),s=settings('bullseye',{accuracyTarget:80,accuracyWindow:5});
 for(const value of [false,true,true,true,false]){
  const result=submit(p,'bullseye',s,Number(value));
  assert.equal(result.won,false); // 3 of 5
 }
 const result=submit(p,'bullseye',s,1);
 assert.equal(result.won,true); // oldest false falls out -> 4 of 5
 assert.deepEqual(p.race.history,[true,true,true,false,true]);
 assert.equal(p.race.history.length,5);
 assert.equal(result.progress.windowCorrect,4);
 assert.equal(result.progress.successes,4);
});
test('exact fractional comparison prevents rounded-up false wins',()=>{
 const p=initial(),s=settings('bullseye',{accuracyWindow:20,accuracyTarget:85});
 for(let i=0;i<20;i++){
  const result=submit(p,'bullseye',s,i<16?1:0);
  assert.equal(result.won,false);
 }
 assert.equal(raceTaskProgress(p,'bullseye',s).windowAccuracy,80);
 assert.equal(submit(p,'bullseye',s,1).won,false); // 16/20
 assert.equal(submit(p,'bullseye',s,1).won,false); // 16/20
 assert.equal(submit(p,'bullseye',s,1).won,false); // 16/20
 assert.equal(submit(p,'bullseye',s,1).won,false); // 16/20
 // A 5th new success drops one of the initial correct entries: still 16.
 assert.equal(submit(p,'bullseye',s,1).won,false);
});
test('Perfect Run resets fully on wrong or partially correct boards',()=>{
 const p=initial(),s=settings('perfect',{streakTarget:3});
 assert.equal(submit(p,'perfect',s,6,6).won,false);
 assert.equal(submit(p,'perfect',s,11,12).won,false);
 assert.equal(p.race.currentStreak,0);
 assert.equal(p.race.bestStreak,1);
 assert.equal(submit(p,'perfect',s,6,6).won,false);
 assert.equal(submit(p,'perfect',s,1,1).won,false);
 const result=submit(p,'perfect',s,12,12);
 assert.equal(result.won,true);
 assert.equal(result.progress.currentStreak,3);
 assert.equal(result.progress.bestStreak,3);
 assert.equal(p.race.reachedAttempt,5);
});
test('partly correct board earns points separately but does not count as successful race task',()=>{
 const p=initial(),s=settings('bullseye');
 const r=submit(p,'bullseye',s,5,6);
 assert.equal(r.fullyCorrect,false);
 assert.equal(p.race.successes,0);
 assert.equal(p.race.history[0],false);
});
test('unverified, malformed and impossible grades cannot update a race',()=>{
 const p=initial(),s=settings('perfect');
 for(const grade of [{correctCount:2,total:1},{correctCount:-1,total:1},
   {correctCount:0,total:0},{correctCount:1.4,total:2},
   {correctCount:1,total:Infinity},{}]){
  assert.throws(()=>recordRaceTask(p,'perfect',s,grade,1200),/verified/);
 }
 assert.equal(p.race.successes,0);
});
test('after a verified win the same player cannot produce a second one',()=>{
 const p=initial(),s=settings('perfect');
 for(let i=0;i<3;i++)submit(p,'perfect',s);
 assert.throws(()=>recordRaceTask(p,'perfect',s,{correctCount:1,total:1},4000),/already complete/);
});
test('race standing names only the server winner; timeouts never invent ranks',()=>{
 const goal={accuracyTarget:80,accuracyWindow:5,winnerId:null};
 const a={id:'a',score:1000,blitz:{...initial(),correct:5,checked:6}};
 const b={id:'b',score:5000,blitz:{...initial(),correct:8,checked:10}};
 const room={objective:'bullseye',race:goal,players:[a,b]};
 assert.equal(raceStandings(room).every(r=>r.rank===null),true);
 goal.winnerId='a';a.blitz.race.targetReached=true;a.blitz.race.reachedAt=1234;
 assert.equal(raceStandings(room).find(r=>r.id==='a').rank,1);
 assert.equal(raceStandings(room).find(r=>r.id==='b').rank,null);
});
test('simultaneous scoring still gives the stored first winner a unique rank',()=>{
 const goal={streakTarget:3,winnerId:'first'};
 const mk=(id,ms)=>({id,score:3200,blitz:{
  attempts:3,correct:3,checked:3,race:{...initialRaceProgress(),
    successes:3,currentStreak:3,bestStreak:3,targetReached:true,reachedAt:ms}
 }});
 const room={objective:'perfect',race:goal,players:[mk('second',1000),mk('first',1000)]};
 const rows=raceStandings(room);
 assert.deepEqual(rows.map(x=>x.rank),[1,null]);
 assert.equal(rows[0].id,'first');
});
