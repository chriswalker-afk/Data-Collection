import {ARENA_AWARDS} from './award-catalogue.js';
import {safeAvatar} from './avatar.js';
import {teamStandings,classQuestSnapshot} from './team-rules.js';
import {blitzStandings} from './blitz-rules.js';
import {isRace,raceStandings} from './race-rules.js';
import {classQuestProgress} from './class-quest-rules.js';
// Pass 5: entirely server-derived classroom achievements and a deterministic ceremony.
// No individual achievement or point total is accepted from a browser request.
const validScore=n=>Number.isSafeInteger(n)&&n>=0;
function normalizedResults(room,id){
  // These entries are written only after successful, one-use server grading.
  return (Array.isArray(room.results)?room.results:[])
    .filter(r=>r&&r.playerId===id&&Number.isInteger(r.index)&&r.index>=0&&
      typeof r.questionId==='string'&&Number.isInteger(r.correctCount)&&
      Number.isInteger(r.total)&&r.total>=1&&
      r.correctCount>=0&&r.correctCount<=r.total&&validScore(r.points))
    .sort((a,b)=>a.index-b.index);
}
function longestFullStreak(rows){
  let current=0,best=0,previous=-2;
  for(const r of rows){
    current=r.correctCount===r.total?(r.index===previous+1?current+1:1):0;
    best=Math.max(best,current);
    previous=r.index;
  }
  return best;
}
export function roomAwards(room){
  const game=room.game||'which';
  const paced=room.objective==='blitz'||isRace(room.objective);
  const podium=room.objective==='class'?[]:paced?
    (isRace(room.objective)?raceStandings(room):blitzStandings(room))
      .filter(row=>row.rank!==null).map(row=>{
      const p=room.players.find(person=>person.id===row.id);
      return {id:p.id,name:p.name,avatar:safeAvatar(p.avatar),
        score:p.score,rank:row.rank,correct:row.correct,accuracy:row.accuracy};
    }):
    [...(room.players||[])].filter(p=>validScore(p.score)&&p.score>0)
      .sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name,'en-GB'))
      .map((p,index,arr)=>({
        id:p.id,name:p.name,avatar:safeAvatar(p.avatar),score:p.score,
        rank:index>0&&arr[index-1].score===p.score?null:index+1
      }));
  if(!paced){
    let lastRank=0;
    for(const row of podium){
      if(row.rank===null)row.rank=lastRank;
      else lastRank=row.rank;
    }
  }
  const standings=podium.filter(p=>p.rank<=3);
  const earned={};
  for(const p of room.players||[]){
    const rows=normalizedResults(room,p.id);
    const evaluated=rows.reduce((n,r)=>n+r.total,0);
    const correct=rows.reduce((n,r)=>n+r.correctCount,0);
    const methods=new Set(rows.filter(r=>r.correctCount===r.total&&r.method)
      .map(r=>r.method));
    const terms=new Set(rows.filter(r=>r.correctCount===r.total&&r.termId)
      .map(r=>r.termId));
    const full=r=>r.correctCount===r.total;
    const wrong=rows.findIndex(r=>!full(r));
    const recovered=wrong>=0&&rows.slice(wrong+1).filter(full).length>=2;
    const won=[];
    for(const award of ARENA_AWARDS){
      const qualifies={
        'sampling-fox':game==='which'&&methods.size>=3,
        'bias-buster':game==='which'&&methods.has('quota')&&methods.has('opportunity'),
        'method-maestro':game==='which'&&methods.size===5,
        'recall-raven':game==='speed'&&terms.size>=5,
        'match-mongoose':game==='match'&&rows.some(r=>r.total===6&&full(r)),
        'sorting-salamander':game==='sort'&&rows.some(r=>r.total>=8&&full(r)),
        'precision-penguin':evaluated>=5&&correct===evaluated,
        'steady-stoat':longestFullStreak(rows)>=3,
        'comeback-koala':rows.length>=3&&recovered,
        'calm-capybara':rows.length>=2&&evaluated>=12&&correct>=10&&correct/evaluated>=.8,
        'quota-quokka':game==='which'&&rows.filter(r=>r.method==='quota'&&full(r)).length>=2
      }[award.id];
      if(qualifies)won.push(award.id);
    }
    earned[p.id]=won;
  }
  return {standings,earned};
}
export function makeCeremony(room){
  const {standings,earned}=roomAwards(room);
  const players=room.players||[];
  const slides=[
    {kind:'welcome',title:'The Grand Sampling Arcade Awards',
      subtitle:'A celebration of mathematical thinking, accuracy and persistence.'}
  ];
  if(room.teamCount){
    const teamResults=teamStandings(room);
    slides.push({kind:'team-podium',title:room.objective==='class'?
      'Teams contributing together':'Our team league',
      standings:teamResults,
      subtitle:room.objective==='class'?
        'Every team added checked mathematical evidence to the one shared class achievement. No team is ranked.':
      isRace(room.objective)?
        (room.race?.winningTeamId?
          'The first student to reach the mathematical target also wins for their team.':
          'No team met the target; average checked scores show each team\'s progress.'):
        'Every team is ranked by average checked points per member, so larger groups have no scoring advantage.'});
  }
  if(room.objective==='class'){
    const goal=classQuestProgress(room);
    slides.push({kind:'class-quest',title:goal.achieved?
      'Class Quest achieved together!':'Our Class Quest journey',
      metric:goal.metric,target:goal.target,achieved:goal.achieved,
      accuracy:goal.accuracy,coverage:goal.coverage,
      contributors:goal.contributors,needed:goal.needed,totalStudents:goal.totalStudents,
      creditedCorrect:goal.creditedCorrect,correct:goal.correct,checked:goal.checked,
      everyoneMet:goal.everyoneMet,methods:goal.methods,
      subtitle:goal.achieved?
        'Every contribution counted. Together, we earned the shared mathematical achievement.':
        'We made mathematical progress. Next time, involve more classmates or refine our methods.'});
  }
  if(room.goalTarget){
    const goal=classQuestSnapshot(room);
    slides.push({kind:'class-quest',
      title:goal.achieved?'Class Quest achieved!':'Our Class Quest journey',
      target:goal.target,achieved:goal.achieved,
      accuracy:goal.accuracy,coverage:goal.coverage,
      correct:goal.correct,checked:goal.checked,
      subtitle:goal.achieved?
        'Together, we reached our mathematical accuracy and participation goals.':
        'A thoughtful class challenge takes participation and precision. See what we can improve next time.'});
  }
  if(room.objective!=='class')slides.push({kind:'podium',title:'Our classroom podium',standings,
    subtitle:isRace(room.objective)?
      (standings.length?
        'First to achieve the verified target wins; correct and partially correct attempts still count towards learning.':
        'The target was not reached this round. No winning podium position has been invented.'):
      (standings.length?(room.objective==='blitz'?
        'Blitz ranking prioritises correct decisions, then accuracy, then points.':
        'Scores reflect checked mathematics, not participation clicks.'):
        'No positive scores this round. Celebrate the learning, not an invented winner.')});
  for(const award of ARENA_AWARDS){
    const recipients=players.filter(p=>earned[p.id]?.includes(award.id))
      .map(p=>({id:p.id,name:p.name,avatar:safeAvatar(p.avatar)}));
    if(recipients.length)slides.push({
      kind:'award',award,title:award.name,recipients
    });
  }
  slides.push({kind:'finale',title:'Brilliant thinking, everyone!',
    subtitle:'Every answer is a chance to learn. Keep collecting thoughtful mathematical victories.',
    awardedCount:slides.filter(s=>s.kind==='award').length,
    recipientsCount:players.filter(p=>earned[p.id]?.length).length});
  return {slides,earned};
}
export function ceremonySnapshot(room,person){
  const c=room.ceremony;
  if(!c||!Array.isArray(c.slides))return null;
  const active=room.status==='ceremony';
  if(!active&&!c.completed)return null;
  const last=c.slides.length-1,step=Math.max(0,Math.min(last,c.step||0));
  return {step,total:c.slides.length,run:c.run||1,
    slide:active?c.slides[step]:null,completed:Boolean(c.completed)};
}
export function collectableReceipt(room,person){
  const c=room.ceremony;
  if(person.host||!c)return null;
  // The finale counts as reveal. Students can collect even if the teacher
  // closes the tab without pressing the final End button.
  if(!c.completed&&!(room.status==='ceremony'&&c.step===c.slides.length-1))return null;
  if(!room.ceremonyId||typeof room.ceremonyId!=='string')return null;
  return {
    // ID is created by the Worker, not supplied by an HTTP request.
    roomId:room.ceremonyId,
    game:room.game||'which',
    awarded:room.ceremony.earned?.[person.id]||[],
    completed:true
  };
}
