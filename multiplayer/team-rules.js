// Pass 6: privacy-conscious, server-derived team and collaborative class metrics.
// Pure functions: no browser-controlled marks, nicknames, or achievements.
export const TEAM_DEFINITIONS=Object.freeze([
  {id:'vector',name:'Vector Vipers',icon:'🐍'},
  {id:'sigma',name:'Sigma Sparrows',icon:'🐦'},
  {id:'delta',name:'Delta Dolphins',icon:'🐬'},
  {id:'pi',name:'Pi Pythons',icon:'🥧'}
].map(x=>Object.freeze(x)));
export const TEAM_COUNTS=Object.freeze([0,2,3,4]);
export const CLASS_TARGETS=Object.freeze([0,70,80,90]);
export const TEAM_QUEST_TARGET=75;
const safeInt=n=>Number.isSafeInteger(n)&&n>=0;
const ratio=(n,d)=>d>0?Math.round(n/d*100):0;
export function teamById(id){return TEAM_DEFINITIONS.find(x=>x.id===id)||null;}
export function validTeamCount(count){return TEAM_COUNTS.includes(count);}
export function validClassTarget(target){return CLASS_TARGETS.includes(target);}
export function balanceTeams(players,count){
  if(!validTeamCount(count))throw new Error('Choose 2, 3 or 4 teams, or switch teams off');
  return players.map((person,i)=>({...person,teamId:count?TEAM_DEFINITIONS[i%count].id:null}));
}
export function nextTeamId(players,count){
  if(!count)return null;
  if(!validTeamCount(count))throw new Error('Invalid team count');
  let best=0,min=Infinity;
  for(let i=0;i<count;i++){
    const size=players.filter(p=>p.teamId===TEAM_DEFINITIONS[i].id).length;
    if(size<min){min=size;best=i;}
  }
  return TEAM_DEFINITIONS[best].id;
}
export function checkedEvidence(room,{includeCurrent=true}={}){
  const index=Number.isInteger(room.index)?room.index:0;
  return (Array.isArray(room.results)?room.results:[]).filter(entry=>
    entry&&typeof entry.playerId==='string'&&Number.isInteger(entry.index)&&entry.index>=0&&
    (includeCurrent||entry.index<index)&&
    safeInt(entry.correctCount)&&safeInt(entry.total)&&entry.total>=1&&
    entry.correctCount<=entry.total&&safeInt(entry.points));
}
function playerStats(room,players,entries,threshold){
  const ids=new Set(players.map(p=>p.id));
  const rows=entries.filter(e=>ids.has(e.playerId));
  const submitted=rows.length;
  const correct=rows.reduce((n,e)=>n+e.correctCount,0);
  const checked=rows.reduce((n,e)=>n+e.total,0);
  // Timed Blitz has no fixed number of scheduled questions per player.
  // For Blitz, coverage is the proportion of members who contributed at least
  // one checked answer, not submissions divided by an arbitrary deck size.
  const blitz=room.objective==='blitz';
  const opportunities=blitz?players.length:players.length*(room.deck?.length||room.roundLength||0);
  const contributed=blitz?new Set(rows.map(r=>r.playerId)).size:submitted;
  const minResponses=Math.ceil(opportunities*.75);
  const coverage=ratio(contributed,opportunities);
  const accuracy=ratio(correct,checked);
  const ready=opportunities>0&&contributed>=minResponses&&checked>=5&&!blitz;
  return {submitted,opportunities,correct,checked,coverage,accuracy,
    ready,achieved:ready&&accuracy>=threshold};
}
export function teamStandings(room,includeCurrent=true){
  const count=validTeamCount(room.teamCount)?room.teamCount:0;
  if(!count)return [];
  const entries=checkedEvidence(room,{includeCurrent});
  const results=TEAM_DEFINITIONS.slice(0,count).map(info=>{
    const members=(room.players||[]).filter(p=>p.teamId===info.id);
    const ids=new Set(members.map(p=>p.id));
    const totalScore=includeCurrent?
      members.reduce((n,p)=>n+(safeInt(p.score)?p.score:0),0):
      entries.filter(e=>ids.has(e.playerId)).reduce((n,e)=>n+e.points,0);
    const averageScore=members.length?Math.round(totalScore/members.length):0;
    const progress=playerStats(room,members,entries,TEAM_QUEST_TARGET);
    return {...info,members:members.length,totalScore,averageScore,
      correct:progress.correct,checked:progress.checked,submitted:progress.submitted,
      opportunities:progress.opportunities,coverage:progress.coverage,
      accuracy:progress.accuracy,
      questComplete:room.status==='finished'||room.status==='ceremony'?
        progress.achieved:false};
  });
  const isBlitz=room.objective==='blitz';
  // For Blitz, normalize correct decisions by team size before the speed-based
  // point tiebreaker. A larger team cannot dominate by volume alone.
  const comparison=(a,b)=>isBlitz?
    (b.correct*Math.max(1,a.members)-a.correct*Math.max(1,b.members))||
      b.accuracy-a.accuracy||b.averageScore-a.averageScore:
    b.averageScore-a.averageScore;
  results.sort((a,b)=>comparison(a,b)||a.id.localeCompare(b.id));
  let lastRank=0;
  for(let i=0;i<results.length;i++){
    const row=results[i],prev=results[i-1];
    if(!(isBlitz?row.correct:row.averageScore))row.rank=null;
    else if(i&&comparison(row,prev)===0)row.rank=lastRank;
    else{lastRank=i+1;row.rank=lastRank;}
  }
  return results;
}
export function classQuestSnapshot(room){
  const target=validClassTarget(room.goalTarget)?room.goalTarget:0;
  if(!target)return null;
  const includeCurrent=room.status!=='playing';
  const progress=playerStats(room,room.players||[],checkedEvidence(room,{includeCurrent}),target);
  const finished=room.status==='finished'||room.status==='ceremony';
  return {...progress,target,finished,achieved:finished&&progress.achieved,
    // The live question's correctness is never part of this public snapshot.
    pendingReview:room.status==='playing'};
}
export function classroomFeedbackSnapshot(room){
  if(room.status!=='reveal'&&room.status!=='finished')return null;
  return room.feedback?.index===room.index?{
    text:room.feedback.text,index:room.feedback.index
  }:null;
}
export function cleanTeacherFeedback(value){
  if(typeof value!=='string')return null;
  const normalized=value.normalize('NFKC').replace(/[\x00-\x1f\x7f]/g,' ')
    .replace(/\s+/g,' ').trim();
  return normalized.length>=3&&normalized.length<=160?normalized:null;
}
export function questionPulse(room){
  if(room.status!=='reveal')return null;
  const answers=Array.isArray(room.answers)?room.answers:[];
  const responseCount=answers.length;
  const decisions=answers.reduce((n,a)=>n+(safeInt(a.total)?a.total:0),0);
  const correct=answers.reduce((n,a)=>n+(safeInt(a.correctCount)?a.correctCount:0),0);
  return {responses:responseCount,players:(room.players||[]).length,
    decisions,correct,accuracy:ratio(correct,decisions)};
}
