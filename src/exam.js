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
export function gradeErrorDiagnosis(item,line,repair,impact) {
 const base=gradeError(item,line,repair);
 const impactCorrect=impact===item.impact?.answer;
 return {...base,impactCorrect,correct:base.correct&&impactCorrect,
  identified:base.lineCorrect?1:0,repaired:base.repairCorrect?1:0,explained:impactCorrect?1:0};
}
export function validateErrorBank(errors){
 const levels=['foundation','develop','extend'];
 const methods=['simple-random','systematic','stratified','quota','opportunity'];
 if(errors.length<15)throw Error('Error bank needs at least 15 cases');
 for(const q of errors){
  if(!levels.includes(q.level)||!methods.includes(q.methodId))throw Error('Bad case level/method: '+q.id);
  if(q.lines.length<3||!Number.isInteger(q.errorLine)||q.errorLine<0||q.errorLine>=q.lines.length)throw Error('Invalid error step: '+q.id);
  if(q.repairs.length!==3||new Set(q.repairs.map(x=>x.id)).size!==3||!q.repairs.some(x=>x.id===q.repair))throw Error('Invalid corrections: '+q.id);
  const opts=q.impact?.options;
  if(!q.impact?.question||!q.impact?.explanation||opts?.length!==3||new Set(opts.map(o=>o.id)).size!==3||!opts.some(o=>o.id===q.impact.answer)||opts.some(o=>!o.text))throw Error('Invalid consequence options: '+q.id);
 }
 return true;
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
