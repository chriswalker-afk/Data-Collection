// Pass 2: self-paced Blitz question scheduling and fair, server-derived standings.
// The entire answer bank stays inside the Worker. Every player sees only their
// own current task and, after marking, their own worked feedback.
import {METHODS,shuffled,secureIndex} from './rules.js';
import {GAME_CONCEPTS,GAME_ALIASES} from './game-bank.js';
import {GAME_MODES,makeGameDeck} from './modes.js';

export const BLITZ_MIN_MINUTES=1;
export const BLITZ_MAX_MINUTES=15;
export const BLITZ_MAX_ATTEMPTS=400;
export function blitzDeadlineReached(deadline,now){
  return Number.isSafeInteger(deadline)&&deadline>0&&Number.isSafeInteger(now)&&now>=deadline;
}
export function validBlitzSettings(game,length,minutes){
  return Object.hasOwn(GAME_MODES,game)&&GAME_MODES[game].lengths.includes(length)&&
    Number.isInteger(minutes)&&minutes>=BLITZ_MIN_MINUTES&&minutes<=BLITZ_MAX_MINUTES;
}
export function makeBlitzDeck(game,scenarios,randomIndex=secureIndex){
  if(!Object.hasOwn(GAME_MODES,game))throw new Error('Invalid Blitz activity');
  if(game==='which'){
    if(!Array.isArray(scenarios))throw new Error('Missing scenario bank');
    // Interleave method categories, not just a random block of one method.
    const pools=METHODS.map(method=>shuffled(scenarios.filter(q=>q.correctMethod===method),randomIndex));
    if(pools.some(pool=>pool.length===0))throw new Error('Missing audited sampling method');
    const deck=[];
    for(let row=0;pools.some(pool=>pool.length>row);row++)
      for(const pool of pools)if(pool[row])deck.push(pool[row]);
    return deck;
  }
  if(game==='speed'){
    return shuffled(GAME_CONCEPTS,randomIndex).map(item=>({
      id:item.id,kind:'speed',prompt:item.definition,
      label:item.label,explanation:item.misconception,
      aliases:GAME_ALIASES[item.id]||[]
    }));
  }
  // Existing audited full boards; each response contains 6–12 scored decisions.
  return makeGameDeck(game,Math.max(...GAME_MODES[game].lengths),scenarios,randomIndex);
}
export function newBlitzOrder(length,lastIndex=null,randomIndex=secureIndex){
  if(!Number.isInteger(length)||length<1)throw new Error('Blitz question bank is empty');
  const order=shuffled(Array.from({length},(_,i)=>i),randomIndex);
  // After exhausting the bank, don't repeat the same board immediately.
  if(length>1&&order[0]===lastIndex){
    [order[0],order[1]]=[order[1],order[0]];
  }
  return order;
}
export function initialBlitzPlayer(length,now,randomIndex=secureIndex){
  return {order:newBlitzOrder(length,null,randomIndex),cursor:0,
    attempts:0,correct:0,checked:0,questionStarted:now,feedback:null};
}
export function currentBlitzItem(room,player){
  const p=player?.blitz;
  if(!p||!Array.isArray(p.order)||!Array.isArray(room.deck))return null;
  const index=p.order[p.cursor];
  return Number.isInteger(index)&&index>=0&&index<room.deck.length?room.deck[index]:null;
}
export function advanceBlitzQuestion(player,length,now,randomIndex=secureIndex){
  const p=player.blitz;
  if(!p||!p.feedback)throw new Error('Answer the current question before continuing');
  const previous=p.order[p.cursor];
  p.cursor++;
  if(p.cursor>=p.order.length){
    p.order=newBlitzOrder(length,previous,randomIndex);
    p.cursor=0;
  }
  p.feedback=null;
  p.questionStarted=now;
}
export function blitzQuestionKey(player){
  const p=player.blitz;
  return [p.attempts,p.cursor,p.order[p.cursor]].join(':');
}
export function blitzStandings(room){
  const ranked=(room.players||[]).map(player=>{
    const progress=player.blitz||{};
    const correct=progress.correct||0,checked=progress.checked||0;
    return {id:player.id,correct,checked,attempts:progress.attempts||0,
      accuracy:checked?Math.round(100*correct/checked):0,
      score:player.score||0};
  }).sort((a,b)=>b.correct-a.correct||
      // Use exact fractions for tie-breaking; rounded display accuracy is only UI.
      (a.checked?b.correct*a.checked:0)-(b.checked?a.correct*b.checked:0)||
      b.score-a.score||a.id.localeCompare(b.id));
  // An unanswered round has no fictitious winner. Full equality shares rank.
  let lastRank=null;
  for(let i=0;i<ranked.length;i++){
    const row=ranked[i],previous=ranked[i-1];
    if(!row.correct){row.rank=null;continue;}
    const tied=previous&&row.correct===previous.correct&&
      row.correct*previous.checked===previous.correct*row.checked&&row.score===previous.score;
    row.rank=tied?lastRank:i+1;
    lastRank=row.rank;
  }
  return ranked;
}
