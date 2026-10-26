// Build the Method: explanatory information around the audited dependency-aware checker.
// This module does not own scoring, progression or saved progress.
import {METHOD_ORDER,METHOD_LABELS} from './phase2.js';
import {checkProcedure,DEPENDENCIES} from './exam.js';

export const STEP_GUIDANCE=Object.freeze({
 'simple-random':Object.freeze({
  frame:{title:'Define the frame',why:'A complete list of eligible units gives every possible sample the same chance of being selected.'},
  number:{title:'Number each unit',why:'Unique labels from 1 to N let a randomly generated number identify one unit unambiguously.'},
  generate:{title:'Draw random numbers',why:'Generate numbers uniformly from 1 to N so the selection is made by chance, rather than researcher preference.'},
  repeats:{title:'Ignore repeats',why:'Discard repeats so the sample contains n different units, not repeated observations of the same unit.'},
  select:{title:'Take the sample',why:'Use the accepted distinct labels to identify the actual units included in the sample.'}
 }),
 systematic:Object.freeze({
  frame:{title:'Prepare an ordered frame',why:'The numbered list establishes the positions used for systematic selection.'},
  interval:{title:'Find the interval',why:'When N/n is an integer, k = N/n gives the number of list positions between selections.'},
  start:{title:'Choose a random start',why:'Starting randomly among positions 1 to k avoids fixing one particular starting position.'},
  select:{title:'Take every kth unit',why:'After the random start, selecting at the regular interval completes the systematic sample.'}
 }),
 stratified:Object.freeze({
  strata:{title:'Define the strata',why:'Relevant mutually exclusive groups allow the design to reflect important population differences.'},
  allocate:{title:'Calculate group shares',why:'For proportional sampling, determine how many units to take from each stratum; whole-number allocations must total n.'},
  random:{title:'Draw within each stratum',why:'Select the specified number randomly from each group; this is what distinguishes stratified sampling from quota sampling.'},
  combine:{title:'Combine the groups',why:'The separate random selections together make one complete sample.'}
 }),
 quota:Object.freeze({
  groups:{title:'Define the groups',why:'Choose the relevant characteristics that the subgroup targets will describe.'},
  targets:{title:'Set the quotas',why:'Specify how many respondents are needed from each group before recruitment begins.'},
  recruit:{title:'Recruit available people',why:'Approach eligible people non-randomly and assign them to the appropriate group until targets are met.'},
  stop:{title:'Close filled quotas',why:'Stop including new people from each completed group so its target is not exceeded.'}
 }),
 opportunity:Object.freeze({
  criteria:{title:'Define eligibility',why:'Know which people are eligible to provide relevant responses.'},
  available:{title:'Approach people nearby',why:'Recruit people who are accessible at the chosen place and time, without a random selection process.'},
  recruit:{title:'Collect the responses',why:'Accept responses from available eligible volunteers until the required sample size is reached.'}
 })
});

export const DEPENDENCY_EXPLANATIONS=Object.freeze({
 'simple-random':Object.freeze({
  'frame>number':'The complete frame must exist before each eligible unit can be assigned its own label.',
  'number>generate':'The labels and the range 1 to N must be defined before using the random-number generator.',
  'generate>repeats':'Only after drawing numbers can you reject repeated values.',
  'repeats>select':'Resolve repeats before treating n distinct labels as n selected people or objects.'
 }),
 systematic:Object.freeze({
  'frame>interval':'The population size N and intended sample size n are needed to calculate a suitable interval.',
  'interval>start':'The interval determines the allowed random-start positions.',
  'start>select':'The randomly selected starting position is used before the subsequent regular selections.'
 }),
 stratified:Object.freeze({
  'strata>allocate':'You must define the groups before assigning the correct sample allocation to each.',
  'strata>random':'Random selection within each stratum requires the strata to be established first.',
  'allocate>random':'The number to draw from each stratum should be known before random selection there.',
  'random>combine':'Combine the selected units only after drawing them separately within their strata.'
 }),
 quota:Object.freeze({
  'groups>targets':'Subgroup targets cannot be assigned meaningfully until the relevant groups are defined.',
  'targets>recruit':'Know the group quotas before recruiting people to fill them.',
  'recruit>stop':'The target can be marked complete once enough eligible responses have been recruited.'
 }),
 opportunity:Object.freeze({
  'criteria>recruit':'Check eligibility before including respondents in the final sample.',
  'available>recruit':'The accessible participants must be approached before their responses can be collected.'
 })
});

export function validateBuildBank(methods){
 if(!Array.isArray(methods)||methods.length!==METHOD_ORDER.length||
   new Set(methods.map(m=>m.id)).size!==METHOD_ORDER.length){
  throw new Error('Build the Method requires five unique sampling methods');
 }
 for(const method of methods){
  if(!METHOD_ORDER.includes(method.id))throw new Error('Unknown sampling method');
  const steps=method.procedure||[];
  const titles=STEP_GUIDANCE[method.id];
  const reasons=DEPENDENCY_EXPLANATIONS[method.id];
  const deps=DEPENDENCIES[method.id]||[];
  if(!steps.length||new Set(steps.map(x=>x.id)).size!==steps.length||
    Object.keys(titles).length!==steps.length)throw new Error('Incomplete step guidance: '+method.id);
  for(const step of steps){
   if(!titles[step.id]?.title||!titles[step.id]?.why||!step.text){
    throw new Error('Missing purpose for '+method.id+'/'+step.id);
   }
  }
  const keys=deps.map(([a,b])=>a+'>'+b);
  if(new Set(keys).size!==keys.length||Object.keys(reasons).length!==keys.length||
    keys.some(key=>!reasons[key]||reasons[key].length<30)){
    throw new Error('Missing dependency explanation: '+method.id);
  }
  if(!checkProcedure(method,steps).correct)throw new Error('Audited method procedure is inconsistent: '+method.id);
 }
 return true;
}

export function moveToPosition(steps,id,to){
 const from=steps.findIndex(step=>step.id===id);
 if(from<0||!Number.isInteger(to)||to<0||to>=steps.length)return [...steps];
 const result=[...steps];
 result.splice(to,0,...result.splice(from,1));
 return result;
}

export function buildInsights(method,steps){
 const result=checkProcedure(method,steps);
 const currentIds=steps.map(step=>typeof step==='string'?step:step.id);
 const modelIds=method.procedure.map(step=>step.id);
 const deps=DEPENDENCIES[method.id]||[];
 const titles=STEP_GUIDANCE[method.id];
 const reasons=DEPENDENCY_EXPLANATIONS[method.id];
 return {
  correct:result.correct,
  passed:deps.length-result.unmet.length,
  total:deps.length,
  validAlternative:result.correct&&currentIds.some((id,index)=>id!==modelIds[index]),
  unmet:result.unmet.map(([before,after])=>({
   before,after,
   beforeTitle:titles[before].title,
   afterTitle:titles[after].title,
   why:reasons[before+'>'+after]
  }))
 };
}

export function buildSummary(methods,outcomes){
 return methods.map(method=>{
  const state=outcomes[method.id]||{kind:'unseen'};
  const kind=['correct','wrong','revealed'].includes(state.kind)?state.kind:'unseen';
  return {
   id:method.id,label:METHOD_LABELS[method.id],kind,
   message:kind==='correct'?'Valid independent sequence':
     kind==='wrong'?'Review the prerequisite relationships':
     kind==='revealed'?'Model revealed · no independent credit':'Not attempted'
  };
 });
}
