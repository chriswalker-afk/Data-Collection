// Sort It! — curated two-method boards, each with an advantage and a disadvantage destination.
// Student attempts are scored only on their first full-board check in the interface.
import {shuffled} from './core.js';
import {METHOD_LABELS,METHOD_ORDER} from './phase2.js';

export const SORT_POLARITIES=Object.freeze(['advantage','disadvantage']);
export function sortDestination(method,polarity){
 if(!METHOD_ORDER.includes(method)||!SORT_POLARITIES.includes(polarity)){
  throw new Error('Invalid Sort It! destination');
 }
 return method+':'+polarity;
}
export function sortDestinationLabel(destination){
 const [method,polarity]=String(destination).split(':');
 if(!METHOD_ORDER.includes(method)||!SORT_POLARITIES.includes(polarity))return '';
 return METHOD_LABELS[method]+' — '+(polarity==='advantage'?'advantages':'disadvantages');
}
export function validatePairBank(pairs,evaluations){
 if(!Array.isArray(pairs)||pairs.length!==10)throw new Error('Pass C needs all ten Sort It! comparisons');
 const index=new Map(evaluations.map(e=>[e.id,e]));
 const pairIds=new Set();
 const seenMethods=new Set();
 const seenCombinations=new Set();
 for(const pair of pairs){
  if(!pair.id||pairIds.has(pair.id)||!pair.label)throw new Error('Invalid or repeated Sort It! pair');
  pairIds.add(pair.id);
  if(!Array.isArray(pair.methods)||pair.methods.length!==2||
     new Set(pair.methods).size!==2||pair.methods.some(id=>!METHOD_ORDER.includes(id))){
    throw new Error('Each Sort It! pair requires two distinct sampling methods: '+pair.id);
  }
  pair.methods.forEach(id=>seenMethods.add(id));
  const combination=pair.methods.slice().sort().join('|');
  if(seenCombinations.has(combination))throw new Error('Repeated Sort It! method combination: '+combination);
  seenCombinations.add(combination);
  if(!Array.isArray(pair.evaluationIds)||pair.evaluationIds.length<8||
    new Set(pair.evaluationIds).size!==pair.evaluationIds.length){
    throw new Error('Sort It! needs at least eight unique statements: '+pair.id);
  }
  for(const key of pair.evaluationIds){
    const card=index.get(key);
    if(!card||!pair.methods.includes(card.subject)||!SORT_POLARITIES.includes(card.polarity)){
      throw new Error('Sort It! statement outside its pair: '+pair.id+'/'+key);
    }
    if(!card.claim||!card.explanation)throw new Error('Incomplete Sort It! statement: '+key);
  }
  for(const [key,value] of Object.entries(pair.claimOverrides||{})){
    if(!pair.evaluationIds.includes(key)||typeof value!=='string'||value.trim().length<20){
      throw new Error('Invalid contextual Sort It! statement '+pair.id+'/'+key);
    }
  }
  const statements=pair.evaluationIds.map(id=>index.get(id));
  for(const method of pair.methods){
    for(const polarity of SORT_POLARITIES){
      if(statements.filter(x=>x.subject===method&&x.polarity===polarity).length<2){
        throw new Error('Each destination needs two statements: '+pair.id+'/'+method+'/'+polarity);
      }
    }
  }
  // Paired cards must not be literally identical, even if they came from distinct source IDs.
  const claims=statements.map(item=>(pair.claimOverrides?.[item.id]||item.claim).trim().toLowerCase());
  if(new Set(claims).size!==claims.length)throw new Error('Duplicate Sort It! statement: '+pair.id);
 }
 if(METHOD_ORDER.some(id=>!seenMethods.has(id)))throw new Error('A sampling method is missing from Sort It! pairs');
 for(let i=0;i<METHOD_ORDER.length;i++)for(let j=i+1;j<METHOD_ORDER.length;j++){
   const combination=[METHOD_ORDER[i],METHOD_ORDER[j]].sort().join('|');
   if(!seenCombinations.has(combination))
     throw new Error('Missing Sort It! method combination: '+combination);
 }
 return true;
}

export function makePairSortRound(pairs,evaluations,id,random=Math.random){
 const pair=pairs.find(item=>item.id===id);
 if(!pair)throw new Error('Unknown Sort It! pair: '+id);
 validatePairBank(pairs,evaluations);
 const index=new Map(evaluations.map(e=>[e.id,e]));
 const items=pair.evaluationIds.map(key=>{
  const evalItem=index.get(key);
  return {
   id:key,
   prompt:pair.claimOverrides?.[key]||evalItem.claim,
   explanation:evalItem.explanation,
   conceptSubject:evalItem.subject,
   polarity:evalItem.polarity,
   correctDestination:sortDestination(evalItem.subject,evalItem.polarity)
  };
 });
 return {round:pair,items:shuffled(items,random)};
}

export function evaluateSortBoard(items,placements){
 let correct=0,placed=0;
 const correctIds=[],incorrectIds=[],unplacedIds=[];
 for(const item of items){
  const actual=placements[item.id];
  if(!actual){unplacedIds.push(item.id);continue}
  placed++;
  if(actual===item.correctDestination){correct++;correctIds.push(item.id)}
  else incorrectIds.push(item.id);
 }
 return {total:items.length,placed,correct,correctIds,incorrectIds,unplacedIds,
   ready:placed===items.length};
}
export function changeSortPlacement(placements,items,id,destination,methods){
 if(!items.some(x=>x.id===id))return placements;
 if(destination!==null){
  const valid=methods.flatMap(method=>SORT_POLARITIES.map(polarity=>sortDestination(method,polarity)));
  if(!valid.includes(destination))return placements;
 }
 const next={...placements};
 if(destination===null)delete next[id];else next[id]=destination;
 return next;
}
