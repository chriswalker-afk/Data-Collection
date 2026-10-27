/**
 * Sampling Arcade — Pass 5 Puzzle Relay and Class Mosaic core.
 * PURE SERVER-SIDE STATE MACHINE. Intended to run within the existing
 * authenticated Cloudflare Durable Object, never in the Pages client.
 *
 * The three mathematical puzzle pieces are deliberately different. Each is
 * assigned to a different participant when the team has 3+ pupils; two-pupil
 * teams alternate assignments. Completing all pieces unlocks exactly one
 * shared mosaic tile. No client-submitted score, mark, tile, success flag or
 * answer key is trusted. Rooms remain governed by the existing 3-hour TTL.
 */
import {RELAY_PUZZLES} from './relay-bank.js';

export const RELAY_VERSION=1;
export const RELAY_TILE_GOALS=Object.freeze([6,10,15]);
export const RELAY_ATTEMPT_LIMIT=3;
export const RELAY_WRONG_COOLDOWN_MS=1500;
export const RELAY_TEAM_MIN=2;
export const RELAY_TEAM_MAX=4;
export const RELAY_ROOM_MAX_PLAYERS=45;
export const RELAY_PARTS=3;
const int=n=>Number.isSafeInteger(n)&&n>=0;
const fail=(error)=>({ok:false,error});
function secureRandomIndex(max){
  if(!Number.isInteger(max)||max<1||max>0x100000000)throw Error('Invalid random range');
  const bound=Math.floor(0x100000000/max)*max;
  const word=new Uint32Array(1);
  do{crypto.getRandomValues(word);}while(word[0]>=bound);
  return word[0]%max;
}
function byId(state,id){return state.teams.find(t=>t.id===id);}
function shuffle(list,randomIndex){
  const a=[...list];
  for(let i=a.length-1;i>0;i--){
    const j=randomIndex(i+1);
    if(!Number.isInteger(j)||j<0||j>i)throw Error('Invalid random number');
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
export function validateRelaySetup({players,teamCount,targetTiles,minutes}){
  if(!Array.isArray(players)||players.length>RELAY_ROOM_MAX_PLAYERS)return 'Classroom limit exceeded';
  if(!int(teamCount)||teamCount<2||teamCount>RELAY_TEAM_MAX)return 'Puzzle Relay requires 2–4 teams';
  if(!RELAY_TILE_GOALS.includes(targetTiles))return 'Choose a 6, 10 or 15-tile mosaic';
  if(!int(minutes)||minutes<1||minutes>15)return 'Choose a 1–15 minute challenge';
  if(players.length<teamCount*RELAY_TEAM_MIN)return 'Every team needs at least two students';
  const ids=players.map(p=>p?.id);
  if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length)return 'Invalid or duplicate student IDs';
  const groups=new Map();
  for(const p of players){
    if(typeof p.teamId!=='string'||!p.teamId)return 'Teams must be assigned before starting';
    groups.set(p.teamId,(groups.get(p.teamId)||0)+1);
  }
  if(groups.size!==teamCount||[...groups.values()].some(n=>n<RELAY_TEAM_MIN))
    return 'Each assigned team needs at least two students';
  return null;
}
function choices(puzzleId,partIndex,order){
  const original=RELAY_PUZZLES.find(p=>p.id===puzzleId);
  const record=original?.parts[partIndex];
  if(!record||!Array.isArray(order)||order.length!==4)throw Error('Unknown puzzle role');
  return order.map((sourceIndex,i)=>({id:'c'+i,label:record.choices[sourceIndex]}));
}
function createTeamRound(state,team,randomIndex=secureRandomIndex){
  // Remove stale private hints from the previous round before assigning new roles.
  for(const id of team.roster)delete state.privateFeedback[id];
  const puzzleId=state.deck[state.nextPuzzle++ % state.deck.length];
  const puzzle=RELAY_PUZZLES.find(x=>x.id===puzzleId);
  const memberIds=team.roster;
  // Round-robin offset ensures that students rotate roles across puzzles.
  const offset=team.roundNumber%memberIds.length;
  team.roundNumber++;
  team.current={id:team.id+':'+team.roundNumber+':'+puzzleId,puzzleId,
    title:puzzle.title,context:puzzle.context,
    parts:Array.from({length:RELAY_PARTS},(_,index)=>({
      index,assignedTo:memberIds[(index+offset)%memberIds.length],
      optionOrder:shuffle([0,1,2,3],randomIndex),
      solved:false,attempts:0,tryAfter:0,solvedBy:null
    }))};
}
export function initialMosaicState({players,teamCount,targetTiles,minutes,now,randomIndex}){
  const error=validateRelaySetup({players,teamCount,targetTiles,minutes});
  if(error)throw Error(error);
  if(!int(now))throw Error('Invalid server start time');
  if(typeof randomIndex!=='function')throw Error('Secure random index function required');
  const groups=new Map();
  for(const p of players){if(!groups.has(p.teamId))groups.set(p.teamId,[]);groups.get(p.teamId).push(p.id)}
  const teams=[...groups].map(([id,roster])=>({id,roster:[...roster],roundNumber:0,
    tiles:0,completedRoundIds:[],current:null}));
  const deck=shuffle(RELAY_PUZZLES.map(p=>p.id),randomIndex);
  // ceil cap makes contributions distributed among all teams: no team can
  // finish all 6, 10 or 15 tiles without other teams.
  const perTeamCap=Math.ceil(targetTiles/teamCount);
  const state={version:RELAY_VERSION,status:'playing',startedAt:now,
    deadline:now+minutes*60000,targetTiles,teamCount,perTeamCap,
    originalRoster:players.map(p=>({id:p.id,teamId:p.teamId})),
    deck,nextPuzzle:0,tiles:[],teams,achieved:false,endedAt:null,finishReason:null,
    privateFeedback:{}};
  for(const team of teams)createTeamRound(state,team,randomIndex);
  return state;
}
export function relayTask(state,participantId){
  if(state?.status!=='playing')return null;
  const member=state.originalRoster.find(p=>p.id===participantId);
  const team=byId(state,member?.teamId);
  if(!team||!team.current)return null;
  const own=team.current.parts.find(p=>p.assignedTo===participantId&&!p.solved);
  if(!own)return null;
  const puzzle=RELAY_PUZZLES.find(p=>p.id===team.current.puzzleId);
  return {roundId:team.current.id,partIndex:own.index,
    prompt:puzzle.parts[own.index].prompt,
    options:choices(puzzle.id,own.index,own.optionOrder),
    attempts:own.attempts,remaining:RELAY_ATTEMPT_LIMIT-own.attempts,
    tryAfter:own.tryAfter};
}
export function relaySubmission(state,{participantId,roundId,partIndex,choiceId,now}){
  if(!state||state.status!=='playing')return fail('The mosaic challenge is not active');
  if(!int(now))return fail('Invalid server time');
  if(now>=state.deadline){finishMosaic(state,'time',now);return fail('The challenge timer has ended');}
  const member=state.originalRoster.find(p=>p.id===participantId);
  if(!member)return fail('Not a participant in this mosaic');
  const team=byId(state,member.teamId),round=team?.current;
  if(!round||round.id!==roundId||!int(partIndex)||partIndex>=RELAY_PARTS)
    return fail('This puzzle has changed; refresh to continue');
  const part=round.parts[partIndex];
  if(part.assignedTo!==participantId)return fail('Another teammate has been assigned this puzzle piece');
  if(part.solved)return fail('That piece has already been solved');
  if(part.attempts>=RELAY_ATTEMPT_LIMIT)return fail('Ask your teacher to reopen this piece');
  if(now<part.tryAfter)return fail('Review the hint before another attempt');
  if(typeof choiceId!=='string'||!/^c[0-3]$/.test(choiceId))return fail('Choose one of the displayed options');
  const bank=RELAY_PUZZLES.find(p=>p.id===round.puzzleId).parts[partIndex];
  const selected=bank.choices[part.optionOrder[Number(choiceId.slice(1))]];
  part.attempts++;
  if(selected!==bank.correct){
    part.tryAfter=now+RELAY_WRONG_COOLDOWN_MS;
    const feedback={roundId,partIndex,correct:false,remaining:RELAY_ATTEMPT_LIMIT-part.attempts,
      hint:part.attempts===1?'Check the defining mathematical distinction before trying again.':
      'Read the scenario and discuss the key sampling idea with your team.',
      locked:part.attempts===RELAY_ATTEMPT_LIMIT};
    state.privateFeedback[participantId]=feedback;
    return {ok:true,...feedback,tileUnlocked:false,achieved:false};
  }
  part.solved=true;part.solvedBy=participantId;
  state.privateFeedback[participantId]={roundId,partIndex,correct:true,explanation:bank.explanation};
  let tileUnlocked=false;
  if(round.parts.every(p=>p.solved)){
    const distinct=new Set(round.parts.map(p=>p.solvedBy));
    if(distinct.size<Math.min(RELAY_PARTS,team.roster.length))throw Error('Relay must involve multiple teammates');
    if(team.tiles>=state.perTeamCap)throw Error('Team contribution cap exceeded');
    team.tiles++;
    team.completedRoundIds.push(round.id);
    const tile={index:state.tiles.length,teamId:team.id,puzzleId:round.puzzleId,
      roundId:round.id,contributors:[...distinct],earnedAt:now};
    state.tiles.push(tile);tileUnlocked=true;
    const teamCoverage=state.teams.every(t=>t.tiles>0);
    if(state.tiles.length>=state.targetTiles&&teamCoverage){
      finishMosaic(state,'target',now);
    }else if(team.tiles<state.perTeamCap){
      createTeamRound(state,team);
    }else team.current=null;
  }
  return {ok:true,correct:true,tileUnlocked,achieved:state.achieved,
    explanation:bank.explanation};
}
/** Teacher-only handler may reopen an incorrectly attempted current role.
 * Does not award a point, change a question or edit another role's evidence. */
export function relayReopenRole(state,{teamId,partIndex,now}){
  if(state?.status!=='playing'||!int(now)||now>=state.deadline)return fail('Challenge not active');
  const team=byId(state,teamId),part=team?.current?.parts?.[partIndex];
  if(!part||part.solved)return fail('Puzzle piece cannot be reopened');
  if(!int(partIndex)||partIndex>=RELAY_PARTS)return fail('Invalid piece');
  part.attempts=0;part.tryAfter=0;
  delete state.privateFeedback[part.assignedTo];
  return {ok:true};
}
export function finishMosaic(state,reason,now){
  if(!state||state.status!=='playing')return false;
  if(!['time','host','target'].includes(reason)||!int(now))throw Error('Invalid completion');
  // Never claim a win from a host action or a timeout.
  state.status='finished';state.finishReason=reason;
  state.achieved=reason==='target'&&state.tiles.length>=state.targetTiles&&
    state.teams.every(t=>t.tiles>0);
  state.endedAt=now;
  return true;
}
export function mosaicSnapshot(state,participantId=null){
  if(!state)return null;
  const member=state.originalRoster.find(p=>p.id===participantId);
  const team=byId(state,member?.teamId);
  const mine=relayTask(state,participantId);
  return {
    status:state.status,deadline:state.deadline,startedAt:state.startedAt,
    targetTiles:state.targetTiles,completedTiles:state.tiles.length,
    achieved:state.achieved,finishReason:state.finishReason,
    teams:state.teams.map(t=>({id:t.id,tiles:t.tiles,memberCount:t.roster.length,
      cap:state.perTeamCap,round:t.current?{
        id:t.current.id,title:t.current.title,context:t.current.context,
        solved:t.current.parts.map(p=>p.solved),
        assignedRoles:t.current.parts.map(p=>p.assignedTo),
        locked:t.current.parts.map(p=>!p.solved&&p.attempts>=RELAY_ATTEMPT_LIMIT)
      }:null})),
    mosaic:state.tiles.map(t=>({index:t.index,teamId:t.teamId})),
    me:member?{teamId:member.teamId,task:mine,
      feedback:state.privateFeedback[participantId]||null}:null
  };
}