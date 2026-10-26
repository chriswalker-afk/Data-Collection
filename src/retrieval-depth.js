// Pass B: varied retrieval prompts and manageable round sizes.
// All assessment and local progress are still handled by the original game engines.
import {clozeInTopic,conceptsInTopic,makeMatchRound,shuffled} from './core.js';
import {speedDeck} from './recall.js';

export const CLOZE_ROUND_LENGTHS=Object.freeze([10,20,'all']);
export const MATCH_ROUND_LENGTHS=Object.freeze([5,7,10]);

export function validateClozeCoverage(questions,concepts){
  if(!Array.isArray(questions)||questions.length<53)throw Error('Missing Words needs 53 audited prompts');
  const ids=new Set(),conceptIds=new Set(concepts.map(c=>c.id));
  for(const q of questions){
    if(!q.id||ids.has(q.id))throw Error('Duplicate or missing Missing Words ID');
    ids.add(q.id);
    if(!conceptIds.has(q.conceptId)||typeof q.prompt!=='string'||
      q.prompt.split('{{blank}}').length!==2||!q.explanation?.trim()||
      !Array.isArray(q.choices)||q.choices.length!==4||
      new Set(q.choices).size!==4||!q.choices.includes(q.answer)||
      !Array.isArray(q.sourceIds)||!q.sourceIds.length)
      throw Error('Invalid Missing Words prompt: '+q.id);
  }
  for(const c of concepts)
    if(questions.filter(q=>q.conceptId===c.id).length<2)
      throw Error('Missing Words needs two prompts for '+c.id);
  return true;
}

export function validateRecallClues(concepts,clues){
  if(!Array.isArray(clues)||clues.length!==concepts.length*2)
    throw Error('Two alternative clues are required for each concept');
  const ids=new Set(),byConcept=new Map(concepts.map(c=>[c.id,c])),usedText=new Set();
  for(const clue of clues){
    if(!clue?.id||ids.has(clue.id)||!byConcept.has(clue.conceptId))
      throw Error('Invalid or duplicate recall clue ID');
    ids.add(clue.id);
    const concept=byConcept.get(clue.conceptId);
    const text=clue.text?.trim();
    if(!text||text.length<65||text===concept.definition||
      text.toLocaleLowerCase('en-GB').includes(concept.label.toLocaleLowerCase('en-GB'))||
      usedText.has(text.toLocaleLowerCase('en-GB'))||
      !Array.isArray(clue.sourceIds)||!clue.sourceIds.length)
      throw Error('Recall clue is incomplete, repetitive or leaks the answer: '+clue.id);
    usedText.add(text.toLocaleLowerCase('en-GB'));
  }
  for(const concept of concepts)
    if(clues.filter(clue=>clue.conceptId===concept.id).length!==2)
      throw Error('Recall clue coverage missing for '+concept.id);
  return true;
}

export function clozeLengthsForTopic(questions,concepts,topic){
  const total=clozeInTopic(questions,concepts,topic).length;
  return [10,...(total>20?[20]:[]),'all'];
}

// Prioritise unseen question IDs, and spread short rounds across concepts.
// Never mutate the content bank or the previous round's ID set.
function balancedTake(items,n,random,already=[]){
  const buckets=new Map();
  for(const q of shuffled(items,random)){
    if(!buckets.has(q.conceptId))buckets.set(q.conceptId,[]);
    buckets.get(q.conceptId).push(q);
  }
  const usage=new Map();
  for(const q of already)usage.set(q.conceptId,(usage.get(q.conceptId)||0)+1);
  const result=[];
  while(result.length<n){
    const available=[...buckets.keys()].filter(k=>buckets.get(k).length>0);
    if(!available.length)break;
    const lowest=Math.min(...available.map(k=>usage.get(k)||0));
    const key=shuffled(available.filter(k=>(usage.get(k)||0)===lowest),random)[0];
    result.push(buckets.get(key).shift());
    usage.set(key,(usage.get(key)||0)+1);
  }
  return result;
}

export function makeClozeRound(questions,concepts,topic,count=10,random=Math.random,recentIds=[]){
  if(!CLOZE_ROUND_LENGTHS.includes(count))throw Error('Invalid Missing Words round length');
  const pool=clozeInTopic(questions,concepts,topic);
  if(!pool.length)throw Error('No Missing Words for this topic');
  const target=count==='all'?pool.length:Math.min(count,pool.length);
  const recent=new Set(recentIds);
  const fresh=pool.filter(q=>!recent.has(q.id));
  const preferred=balancedTake(fresh,target,random);
  const older=preferred.length<target
    ?balancedTake(pool.filter(q=>recent.has(q.id)),target-preferred.length,random,preferred):[];
  return [...preferred,...older];
}

export function matchLengthsForTopic(concepts,topic){
  const total=conceptsInTopic(concepts,topic).length;
  return [...new Set(MATCH_ROUND_LENGTHS.map(n=>Math.min(n,total)).filter(n=>n>=2))];
}

// Picking a clue never changes the mathematical answer, which stays concept.label.
// Return an updated map rather than mutating supplied preferences.
export function addRecallClues(items,clues,random=Math.random,previousClues=new Map()){
  const next=new Map(previousClues);
  const result=items.map(concept=>{
    const choices=[{id:concept.id+':original',text:concept.definition},
      ...clues.filter(x=>x.conceptId===concept.id).map(x=>({id:x.id,text:x.text}))];
    if(choices.length<2)throw Error('No alternative retrieval clues for '+concept.id);
    const recent=next.get(concept.id);
    const pool=choices.filter(x=>x.id!==recent);
    const selected=shuffled(pool.length?pool:choices,random)[0];
    next.set(concept.id,selected.id);
    return {...concept,recallPrompt:selected.text,recallClueId:selected.id,
      recallClueCount:choices.length};
  });
  return {items:result,lastClues:next};
}

export function makeVariedSpeedDeck(concepts,clues,topic,random=Math.random,
  count=10,previousClues=new Map()){
  return addRecallClues(speedDeck(concepts,topic,random,count),clues,random,previousClues);
}

export function makeVariedMatchRound(concepts,clues,topic,random=Math.random,
  count=5,recentIds=[],previousClues=new Map()){
  if(!matchLengthsForTopic(concepts,topic).includes(count))
    throw Error('Invalid Match Up round length');
  const plain=makeMatchRound(concepts,topic,random,count,recentIds);
  const varied=addRecallClues(plain.terms,clues,random,previousClues);
  const converted=varied.items.map(item=>({...item,definition:item.recallPrompt}));
  const byId=new Map(converted.map(item=>[item.id,item]));
  return {terms:converted,definitions:plain.definitions.map(x=>byId.get(x.id)),
    lastClues:varied.lastClues};
}
