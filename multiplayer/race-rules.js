// Arena 2.0 Pass 3: checked-task objectives built on the independent Blitz engine.
// A fully correct question or board is ONE successful task. A partly correct
// Match Up / Sort It board earns partial points, but not a successful task.
// All counters, windows, deadlines and winners are derived only by the Worker.

import {validBlitzSettings} from './blitz-rules.js';

export const RACE_OBJECTIVES=Object.freeze(['bullseye','perfect']);
export const isRace=objective=>RACE_OBJECTIVES.includes(objective);
export const isPaced=objective=>objective==='blitz'||isRace(objective);
export const RACE_MAX_ATTEMPTS=400;

export function validRaceSettings({objective,game,roundLength,minutes,accuracyTarget,accuracyWindow,streakTarget}={}){
  if(!isRace(objective)||!validBlitzSettings(game,roundLength,minutes))return false;
  if(objective==='bullseye')return Number.isInteger(accuracyTarget)&&
    accuracyTarget>=60&&accuracyTarget<=100&&accuracyTarget%5===0&&
    Number.isInteger(accuracyWindow)&&accuracyWindow>=5&&accuracyWindow<=20;
  return Number.isInteger(streakTarget)&&streakTarget>=3&&streakTarget<=20;
}
export function initialRaceProgress(){
  return {history:[],successes:0,currentStreak:0,bestStreak:0,
    targetReached:false,reachedAt:null,reachedAttempt:null};
}
export function raceTaskProgress(progress,objective,settings){
  if(!isRace(objective)||!progress)throw new Error('Unknown race objective');
  const attempts=Number.isInteger(progress.attempts)?progress.attempts:0;
  const race=progress.race||initialRaceProgress();
  const window=objective==='bullseye'?settings.accuracyWindow:0;
  const history=objective==='bullseye'?race.history.slice(-window):[];
  const successes=history.reduce((n,x)=>n+Number(x===true),0);
  const ready=objective==='bullseye'&&history.length===window;
  // Multiply before comparing so a rounded 79.6% never becomes an 80% win.
  const reached=objective==='bullseye'?
    ready&&successes*100>=settings.accuracyTarget*window:
    race.currentStreak>=settings.streakTarget;
  return {attempts,successes:race.successes,
    currentStreak:race.currentStreak,bestStreak:race.bestStreak,
    windowCorrect:successes,windowAnswered:history.length,windowSize:window,
    windowAccuracy:history.length?Math.round(100*successes/history.length):0,
    ready:objective==='bullseye'?ready:true,
    target:objective==='bullseye'?settings.accuracyTarget:settings.streakTarget,
    achieved:Boolean(race.targetReached),reachedAt:race.reachedAt,
    reachedAttempt:race.reachedAttempt,
    reached};
}
export function recordRaceTask(progress,objective,settings,graded,now){
  if(!progress||!isRace(objective)||!Number.isSafeInteger(now)||now<0)
    throw new Error('Invalid race progress');
  if(!graded||!Number.isInteger(graded.correctCount)||!Number.isInteger(graded.total)||
    graded.total<1||graded.correctCount<0||graded.correctCount>graded.total)
    throw new Error('Only verified mathematical grades can update a race');
  if(!progress.race)progress.race=initialRaceProgress();
  const race=progress.race;
  if(race.targetReached)throw new Error('Target is already complete');
  if(progress.attempts>RACE_MAX_ATTEMPTS)
    throw new Error('Race attempt limit exceeded');
  const fullyCorrect=graded.correctCount===graded.total;
  race.successes+=Number(fullyCorrect);
  race.currentStreak=fullyCorrect?race.currentStreak+1:0;
  race.bestStreak=Math.max(race.bestStreak,race.currentStreak);
  if(objective==='bullseye'){
    race.history.push(fullyCorrect);
    if(race.history.length>settings.accuracyWindow)race.history.shift();
  }
  const state=raceTaskProgress(progress,objective,settings);
  if(state.reached){
    race.targetReached=true;
    race.reachedAt=now;
    race.reachedAttempt=progress.attempts;
  }
  return {fullyCorrect,won:state.reached,progress:raceTaskProgress(progress,objective,settings)};
}
export function raceStandings(room){
  if(!isRace(room?.objective))return [];
  const goal=room.race||{};
  const rows=(room.players||[]).map(p=>{
    const progress=p.blitz||{};
    const r=raceTaskProgress(progress,room.objective,goal);
    return {id:p.id,score:p.score||0,correct:progress.correct||0,
      checked:progress.checked||0,attempts:progress.attempts||0,
      accuracy:progress.checked?Math.round(100*progress.correct/progress.checked):0,
      ...r};
  });
  const metric=r=>room.objective==='bullseye'?
    r.windowAnswered?100*r.windowCorrect/r.windowAnswered:0:r.bestStreak;
  rows.sort((a,b)=>
    Number(b.achieved)-Number(a.achieved)||
    (a.achieved? (a.reachedAt-b.reachedAt||a.reachedAttempt-b.reachedAttempt):0)||
    metric(b)-metric(a)||
    b.successes-a.successes||
    b.correct-a.correct||
    b.score-a.score||
    a.id.localeCompare(b.id));
  for(const row of rows)row.rank=room.race?.winnerId===row.id?1:null;
  return rows;
}
