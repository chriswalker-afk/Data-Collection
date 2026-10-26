// Pass 4: dependency-aware procedures and structured, formative exam practice.
import {shuffled} from './core.js';
export const EXAM_LEVELS = Object.freeze(['foundation','develop','extend']);
export function procedureRound(methods, methodId, random=Math.random) {
  const method=methods.find(x=>x.id===methodId);
  if(!method) throw new Error('Unknown method');
  const steps=method.procedure.map(s=>({id:s.id,text:s.text}));
  return {method,steps:shuffled(steps,random)};
}
// Only genuine dependencies are enforced. Independent preliminaries may be exchanged.
export const DEPENDENCIES=Object.freeze({
 'simple-random':[['frame','number'],['number','generate'],['generate','repeats'],['repeats','select']],
 'systematic':[['frame','interval'],['interval','start'],['start','select']],
 'stratified':[['strata','allocate'],['strata','random'],['allocate','random'],['random','combine']],
 'quota':[['groups','targets'],['targets','recruit'],['recruit','stop']],
 'opportunity':[['criteria','recruit'],['available','recruit']]
});
export function checkProcedure(method,steps) {
  const ids=steps.map(x=>typeof x==='string'?x:x.id);
  const expected=method.procedure.map(s=>s.id);
  if(ids.length!==expected.length||new Set(ids).size!==ids.length||
      expected.some(x=>!ids.includes(x))) throw new Error('Procedure does not contain all steps');
  const index=new Map(ids.map((id,i)=>[id,i]));
  const unmet=(DEPENDENCIES[method.id]||[]).filter(([a,b])=>index.get(a)>index.get(b));
  return {correct:unmet.length===0,unmet,first:unmet[0]||null};
}
export function moveStep(steps,id,direction) {
  const index=steps.findIndex(step=>step.id===id),other=index+direction;
  if(index<0||other<0||other>=steps.length)return [...steps];
  const next=[...steps];[next[index],next[other]]=[next[other],next[index]];return next;
}
export function makeErrorDeck(errors,level,random=Math.random) {
  if(!EXAM_LEVELS.includes(level))throw new Error('Invalid difficulty');
  return shuffled(errors.filter(x=>x.level===level),random);
}
export function gradeError(item,line,repair) {
  return {lineCorrect:Number(line)===item.errorLine,repairCorrect:repair===item.repair,
    correct:Number(line)===item.errorLine&&repair===item.repair};
}
export function makeReasoningDeck(items,level,random=Math.random) {
  if(!EXAM_LEVELS.includes(level))throw new Error('Invalid difficulty');
  return shuffled(items.filter(x=>x.level===level),random);
}
export function assessReasoning(item,selections) {
  const categories=['method','reason','limitation','improvement'];
  const met=categories.filter(key=>String(selections[key])===String(item.answers[key]));
  return {met,total:categories.length,complete:met.length===categories.length};
}
