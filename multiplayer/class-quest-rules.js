// Arena 2.0 Pass 4: cooperative, server-verified Class Quest.
// All figures are derived from already-graded Worker entries; no client submits
// a "contributed", "won" or "mastered" flag. The initial roster is frozen at
// the start so leaving/removing classmates cannot lower the participation bar.
import {METHODS,METHOD_LABELS} from './rules.js';
import {validBlitzSettings} from './blitz-rules.js';

export const QUEST_METRICS=Object.freeze(['accuracy','correct','mastery','everyone']);
export const QUEST_MIN_PLAYERS=3;
export const QUEST_MIN_TASKS=2;
export const QUEST_MAX_CORRECT_CREDIT=20;
export const QUEST_METHOD_CONTRIBUTORS=2;
const methodTerms=Object.freeze(Object.fromEntries(METHODS.map(id=>[id+'-sampling',id])));
const pct=(n,d)=>d?Math.round(100*n/d):0;
export const isClassQuest=objective=>objective==='class';

export function validClassQuestSettings({objective,game,roundLength,minutes,classMetric,
  classAccuracy,classCorrect,classParticipation,classPerStudent}={}){
  return objective==='class'&&validBlitzSettings(game,roundLength,minutes)&&
    QUEST_METRICS.includes(classMetric)&&
    Number.isInteger(classAccuracy)&&classAccuracy>=60&&classAccuracy<=100&&classAccuracy%5===0&&
    Number.isInteger(classCorrect)&&classCorrect>=20&&classCorrect<=300&&classCorrect%5===0&&
    Number.isInteger(classParticipation)&&classParticipation>=50&&classParticipation<=100&&classParticipation%5===0&&
    Number.isInteger(classPerStudent)&&classPerStudent>=1&&classPerStudent<=10;
}
export function initialClassQuest(settings,players){
  if(!validClassQuestSettings({objective:'class',...settings}))
    throw new Error('Invalid Class Quest settings');
  if(!Array.isArray(players)||players.length<QUEST_MIN_PLAYERS||players.length>45||
    players.some(p=>typeof p?.id!=='string')||
    new Set(players.map(p=>p.id)).size!==players.length)
    throw new Error('Class Quest needs at least three distinct students');
  return {
    metric:settings.classMetric,accuracyTarget:settings.classAccuracy,
    correctTarget:settings.classCorrect,participationTarget:settings.classParticipation,
    perStudentTarget:settings.classPerStudent,
    rosterIds:players.map(p=>p.id),rosterTotal:players.length,
    achieved:false,finishReason:null,endedAt:null
  };
}
// Only Worker-checked individual decisions count. A correct sort statement
// contributes method evidence even if other statements on its board are wrong.
export function questMethodEvidence(game,item,submitted,graded){
  if(!graded||!Number.isInteger(graded.correctCount)||graded.correctCount<1)return [];
  const ids=new Set();
  if(game==='which'&&graded.correctCount===graded.total&&METHODS.includes(item?.correctMethod))
    ids.add(item.correctMethod);
  if(game==='speed'&&graded.correctCount===graded.total&&methodTerms[item?.id])
    ids.add(methodTerms[item.id]);
  if(game==='match'&&submitted?.pairs&&item?.answerKey){
    for(const [term,dest] of Object.entries(item.answerKey)){
      if(methodTerms[term]&&submitted.pairs[term]===dest)ids.add(methodTerms[term]);
    }
  }
  if(game==='sort'&&submitted?.placements&&Array.isArray(item?.solutions)){
    for(const entry of item.solutions){
      const method=entry.correctDestination?.split(':')[0];
      if(METHODS.includes(method)&&submitted.placements[entry.id]===entry.correctDestination)
        ids.add(method);
    }
  }
  return [...ids];
}
function verified(entry){
  return entry&&typeof entry.playerId==='string'&&
    Number.isInteger(entry.correctCount)&&Number.isInteger(entry.total)&&entry.total>=1&&
    entry.correctCount>=0&&entry.correctCount<=entry.total&&
    Number.isInteger(entry.index)&&entry.index>=0&&
    Array.isArray(entry.methods||[])&&
    (entry.methods||[]).every(method=>METHODS.includes(method));
}
export function classQuestProgress(room){
  const quest=room?.quest;
  if(room?.objective!=='class'||!quest)return null;
  // Only the frozen original roster is allowed to satisfy the goal. Deleted
  // players and their removed results cannot count as active participants.
  const active=new Set((room.players||[]).map(p=>p.id));
  const roster=quest.rosterIds.filter(id=>active.has(id));
  const rows=(Array.isArray(room.results)?room.results:[]).filter(row=>
    verified(row)&&active.has(row.playerId)&&roster.includes(row.playerId));
  const byPlayer=new Map(roster.map(id=>[id,[]]));
  for(const row of rows)byPlayer.get(row.playerId).push(row);
  const memberStats=roster.map(id=>{
    const records=byPlayer.get(id);
    const correct=records.reduce((s,r)=>s+r.correctCount,0);
    const checked=records.reduce((s,r)=>s+r.total,0);
    return {id,tasks:records.length,correct,checked,
      fullyCorrect:records.filter(r=>r.correctCount===r.total).length,
      qualified:records.length>=QUEST_MIN_TASKS};
  });
  const contributors=memberStats.filter(x=>x.qualified).length;
  const needed=Math.max(QUEST_MIN_PLAYERS,Math.ceil(quest.rosterTotal*quest.participationTarget/100));
  const creditedCorrect=memberStats.reduce((s,p)=>s+Math.min(QUEST_MAX_CORRECT_CREDIT,p.correct),0);
  const correct=memberStats.reduce((s,p)=>s+p.correct,0);
  const checked=memberStats.reduce((s,p)=>s+p.checked,0);
  // Equal student weight rather than allowing someone doing 100 boards to
  // swamp classmates completing a few. Never round to decide a win.
  const participants=memberStats.filter(p=>p.checked>0);
  const mean=participants.length?
    participants.reduce((s,p)=>s+p.correct/p.checked,0)/participants.length:0;
  const coverage=pct(contributors,quest.rosterTotal);
  const methodCounts=METHODS.map(id=>({
    id,label:METHOD_LABELS[id],
    contributors:new Set(rows.filter(r=>r.methods?.includes(id)).map(r=>r.playerId)).size,
    needed:QUEST_METHOD_CONTRIBUTORS
  }));
  const everyoneMet=memberStats.filter(p=>
    p.qualified&&p.fullyCorrect>=quest.perStudentTarget).length;
  const ready=contributors>=needed&&checked>=5;
  const metricMet={
    accuracy:mean*100+1e-10>=quest.accuracyTarget,
    correct:creditedCorrect>=quest.correctTarget,
    mastery:methodCounts.every(m=>m.contributors>=QUEST_METHOD_CONTRIBUTORS),
    everyone:everyoneMet>=needed
  }[quest.metric]||false;
  const achieved=quest.achieved===true&&quest.finishReason==='target';
  return {
    metric:quest.metric,
    target:{
      accuracy:quest.accuracyTarget,correct:quest.correctTarget,
      participation:quest.participationTarget,perStudent:quest.perStudentTarget
    },
    totalStudents:quest.rosterTotal,contributors,needed,coverage,
    correct,checked,creditedCorrect,accuracy:pct(Math.round(mean*1000000),1000000),
    everyoneMet,methods:methodCounts,
    minTasks:QUEST_MIN_TASKS,maxCorrectCredit:QUEST_MAX_CORRECT_CREDIT,
    ready,goalMet:ready&&metricMet,achieved,
    finishedReason:quest.finishReason||null,endedAt:quest.endedAt||null
  };
}
export function classQuestStandings(room){
  if(room?.objective!=='class')return [];
  const participants=new Set(room.quest?.rosterIds||[]);
  return (room.players||[]).filter(p=>participants.has(p.id))
    .map(p=>({id:p.id,tasks:p.blitz?.attempts||0,
      contributed:(p.blitz?.attempts||0)>=QUEST_MIN_TASKS}))
    .sort((a,b)=>a.id.localeCompare(b.id));
}
