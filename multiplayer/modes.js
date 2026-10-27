// Server-authoritative Pass 4 multiplayer game modes.
// Student payloads never include a score or a correct answer.
import {METHODS,METHOD_LABELS,ROUND_LENGTHS,balancedRound,shuffled,scoreAnswer,publicQuestion} from './rules.js';
import {GAME_CONCEPTS,GAME_ALIASES,GAME_SORT_BOARDS} from './game-bank.js';
export const GAME_MODES=Object.freeze({
  which:Object.freeze({id:'which',label:'Which Method?',lengths:[5,10,20],seconds:20,
    description:'Choose the method from a real sampling scenario.'}),
  speed:Object.freeze({id:'speed',label:'Speed Recall',lengths:[5,10,20],seconds:25,
    description:'Type the mathematical term that matches each definition.'}),
  match:Object.freeze({id:'match',label:'Match Up',lengths:[1,2,3],seconds:75,
    description:'Build all six correct term–definition pairs in each board.'}),
  sort:Object.freeze({id:'sort',label:'Sort It!',lengths:[1,3,6,10],seconds:90,
    description:'Place statements under the correct method and advantage/disadvantage.'})
});
export const GAME_IDS=Object.freeze(Object.keys(GAME_MODES));
export function validLength(game,length){
  return Boolean(typeof game==='string'&&Object.hasOwn(GAME_MODES,game)&&Number.isInteger(length)&&GAME_MODES[game].lengths.includes(length));
}
export function questionTimeMs(game){return (GAME_MODES[game]?.seconds??20)*1000;}
function makeMatchBoard(terms,index,random){
  // Identity is revealed only in the private answerKey; definition IDs have no
  // relationship to source concept IDs or the original list order.
  const definitions=shuffled(terms,random).map((term,i)=>({
    id:'def-'+i,text:term.definition,sourceId:term.id
  }));
  const answerKey=Object.fromEntries(definitions.map(d=>[d.sourceId,d.id]));
  return {
    id:'match-board-'+(index+1),kind:'match',
    prompt:'Connect every mathematical term to its correct definition.',
    terms:shuffled(terms,random).map(({id,label})=>({id,label})),
    definitions:definitions.map(({id,text})=>({id,text})),
    answerKey,
    explanation:'A match is correct only when the defining mathematical meaning is preserved. Review each term and the precise words in its definition.'
  };
}
function makeSortBoard(source,random){
  const items=shuffled(source.statements,random).map(({id,statement})=>({id,text:statement}));
  return {id:source.id,kind:'sort',
    prompt:'Sort each statement by sampling method and whether it is an advantage or disadvantage.',
    title:source.label,methods:source.methods,
    statements:items,
    destinations:source.methods.flatMap(method=>[
      {id:method+':advantage',label:METHOD_LABELS[method]+' — advantage'},
      {id:method+':disadvantage',label:METHOD_LABELS[method]+' — disadvantage'}
    ]),
    solutions:source.statements.map(item=>({
      id:item.id,correctDestination:item.correctDestination,explanation:item.explanation
    }))
  };
}
export function makeGameDeck(game,length,scenarios,random){
  if(!validLength(game,length))throw new Error('Invalid game or round length');
  if(game==='which')return balancedRound(scenarios,length,random);
  if(game==='speed')return shuffled(GAME_CONCEPTS,random).slice(0,length).map(item=>({
    id:item.id,kind:'speed',prompt:item.definition,
    label:item.label,explanation:item.misconception,aliases:GAME_ALIASES[item.id]||[]
  }));
  if(game==='match'){
    const concepts=shuffled(GAME_CONCEPTS,random);
    return Array.from({length},(_,i)=>makeMatchBoard(concepts.slice(i*6,(i+1)*6),i,random));
  }
  return shuffled(GAME_SORT_BOARDS,random).slice(0,length).map(board=>makeSortBoard(board,random));
}
export function safeGameQuestion(game,item){
  if(game==='which')return publicQuestion(item);
  if(game==='speed')return {id:item.id,kind:'speed',prompt:item.prompt};
  if(game==='match')return {id:item.id,kind:'match',prompt:item.prompt,
    terms:item.terms,definitions:item.definitions};
  if(game==='sort')return {id:item.id,kind:'sort',prompt:item.prompt,title:item.title,
    methods:item.methods,destinations:item.destinations,statements:item.statements};
  throw new Error('Invalid game');
}
export function revealGameAnswer(game,item){
  if(game==='which')return {correctMethod:item.correctMethod,reason:item.reason,contrast:item.contrast};
  if(game==='speed')return {correctTerm:item.label,reason:item.explanation||'Recall the exact mathematical definition.'};
  if(game==='match'){
    return {solutions:item.terms.map(term=>({
      termId:term.id,term:term.label,
      definitionId:item.answerKey[term.id],
      definition:item.definitions.find(d=>d.id===item.answerKey[term.id])?.text
    })),reason:item.explanation};
  }
  if(game==='sort')return {solutions:item.solutions,reason:
    'Each advantage or disadvantage depends on the particular sampling method. Distinguish random selection from choosing conveniently or filling quotas.'};
  throw new Error('Invalid game');
}
export function normalizeRecall(value){
  return String(value??'').normalize('NFKC').toLocaleLowerCase('en-GB')
    .replace(/[‐‑–—-]/g,' ').replace(/[.,!?;:()'"]/g,' ')
    .replace(/\s+/g,' ').trim();
}
const RESERVED_TERMS=new Map();
for(const concept of GAME_CONCEPTS){
  for(const entry of [concept.label,...(GAME_ALIASES[concept.id]||[])]){
    const normalized=normalizeRecall(entry);
    if(RESERVED_TERMS.has(normalized)&&RESERVED_TERMS.get(normalized)!==concept.id)
      throw new Error('Ambiguous multiplayer accepted term: '+entry);
    RESERVED_TERMS.set(normalized,concept.id);
  }
}
function completeAssignment(payload,keys,allowed){
  if(!payload||typeof payload!=='object'||Array.isArray(payload))return null;
  const entries=Object.entries(payload);
  if(entries.length!==keys.length)return null;
  const keySet=new Set(keys),destinationSet=new Set(allowed);
  if(entries.some(([id,value])=>!keySet.has(id)||typeof value!=='string'||!destinationSet.has(value)))return null;
  return Object.fromEntries(entries);
}
function scoreBoard(correct,total,elapsedMs,durationMs){
  if(correct<0||correct>total||total<1)return 0;
  const base=Math.round(1000*correct/total);
  return correct===total?base+(scoreAnswer(true,elapsedMs,durationMs)-1000):base;
}
export function gradeGameAnswer(game,item,command,elapsedMs,durationMs){
  if(game==='which'){
    if(!METHODS.includes(command.method))return {error:'Choose one of the five sampling methods'};
    const correct=item.correctMethod===command.method;
    return {points:scoreAnswer(correct,elapsedMs,durationMs),
      correctCount:Number(correct),total:1,method:command.method};
  }
  if(game==='speed'){
    if(typeof command.response!=='string'||command.response.length>100)
      return {error:'Type a mathematical term (up to 100 characters)'};
    const response=normalizeRecall(command.response);
    if(!response)return {error:'Type an answer before submitting'};
    const expected=[item.label,...item.aliases].map(normalizeRecall);
    const correct=expected.includes(response)&&RESERVED_TERMS.get(response)===item.id;
    return {points:scoreAnswer(correct,elapsedMs,durationMs),correctCount:Number(correct),total:1};
  }
  if(game==='match'){
    const terms=item.terms.map(t=>t.id),defs=item.definitions.map(d=>d.id);
    const choices=completeAssignment(command.pairs,terms,defs);
    if(!choices||new Set(Object.values(choices)).size!==defs.length)
      return {error:'Connect every term to exactly one definition before submitting'};
    const correctCount=terms.filter(id=>choices[id]===item.answerKey[id]).length;
    return {points:scoreBoard(correctCount,terms.length,elapsedMs,durationMs),
      correctCount,total:terms.length};
  }
  if(game==='sort'){
    const ids=item.statements.map(x=>x.id);
    const destinations=item.destinations.map(x=>x.id);
    const placements=completeAssignment(command.placements,ids,destinations);
    if(!placements)return {error:'Place every statement in a valid category before submitting'};
    const solutions=Object.fromEntries(item.solutions.map(s=>[s.id,s.correctDestination]));
    const correctCount=ids.filter(id=>placements[id]===solutions[id]).length;
    return {points:scoreBoard(correctCount,ids.length,elapsedMs,durationMs),
      correctCount,total:ids.length};
  }
  return {error:'Unsupported game'};
}
