// Pass C: context-rich Build the Method decks. The audited dependency
// checker remains the single source of correctness and grading rules.
import {shuffled} from './core.js';
import {DEPENDENCIES,checkProcedure} from './exam.js';
import {METHOD_ORDER} from './phase2.js';

export const BUILD_SCENARIO_LEVELS=Object.freeze(['mixed','foundation','develop','extend']);
const LEVELS=BUILD_SCENARIO_LEVELS.slice(1);
const isPositiveInteger=value=>Number.isSafeInteger(value)&&value>0;

function validateNumerics(scenario){
 const q=scenario.quantities;
 if(!q||!isPositiveInteger(q.n))throw Error('Invalid case sample size: '+scenario.id);
 if(['simple-random','systematic','stratified'].includes(scenario.methodId)){
   if(!isPositiveInteger(q.N)||q.n>q.N)
     throw Error('Invalid population/sample sizes: '+scenario.id);
 }
 if(scenario.methodId==='systematic'){
   if(!isPositiveInteger(q.k)||q.k!==q.N/q.n||
     !isPositiveInteger(q.start)||q.start>q.k||
     q.start+(q.n-1)*q.k>q.N)
     throw Error('Inconsistent systematic interval/start: '+scenario.id);
 }
 if(scenario.methodId==='stratified'){
   if(!Array.isArray(q.strata)||q.strata.length<2||
     q.strata.some(x=>!x.name||!isPositiveInteger(x.size)||!isPositiveInteger(x.allocation)||
       Math.abs(x.allocation-q.n*x.size/q.N)>1)||
     q.strata.reduce((a,x)=>a+x.size,0)!==q.N||
     q.strata.reduce((a,x)=>a+x.allocation,0)!==q.n)
     throw Error('Incorrect proportional allocation: '+scenario.id);
 }
 if(scenario.methodId==='quota'){
   if(!Array.isArray(q.quotas)||q.quotas.length<2||
     q.quotas.some(x=>!x.name||!isPositiveInteger(x.target))||
     q.quotas.reduce((a,x)=>a+x.target,0)!==q.n)
     throw Error('Quota targets do not sum to the sample size: '+scenario.id);
 }
 if(scenario.methodId==='opportunity'&&('N'in q||'strata'in q||'quotas'in q))
   throw Error('Opportunity sampling must not imply random-frame or fixed-group quotas: '+scenario.id);
}

export function validateBuildScenarios(methods,scenarios){
 if(!Array.isArray(methods)||methods.length!==5||
   !Array.isArray(scenarios)||scenarios.length!==15)
   throw Error('Pass C requires 15 scenarios across five methods');
 const byMethod=new Map(methods.map(m=>[m.id,m]));
 if(byMethod.size!==5||METHOD_ORDER.some(id=>!byMethod.has(id)))
   throw Error('Missing sampling method in contextual bank');
 const ids=new Set(),titles=new Set(),texts=new Set();
 for(const s of scenarios){
   const method=byMethod.get(s.methodId);
   if(!s.id||ids.has(s.id)||!method||!LEVELS.includes(s.level)||
     !s.title||titles.has(s.title)||s.title.length<12||
     typeof s.context!=='string'||s.context.length<90||
     typeof s.task!=='string'||s.task.length<30||
     typeof s.workedExample!=='string'||s.workedExample.length<75||
     typeof s.caution!=='string'||s.caution.length<70||
     !Array.isArray(s.sourceIds)||!s.sourceIds.length)
     throw Error('Incomplete or duplicated Build the Method case: '+s.id);
   ids.add(s.id);titles.add(s.title);
   const originalIds=method.procedure.map(step=>step.id);
   if(!Array.isArray(s.steps)||s.steps.length!==originalIds.length||
     new Set(s.steps.map(step=>step.id)).size!==originalIds.length||
     s.steps.some(step=>!originalIds.includes(step.id)||
       typeof step.text!=='string'||step.text.trim().length<33||
       texts.has(step.text.trim().toLowerCase())||
       method.procedure.some(original=>original.text===step.text)))
     throw Error('Incomplete contextual procedure step: '+s.id);
   s.steps.forEach(step=>texts.add(step.text.trim().toLowerCase()));
   if(!checkProcedure({...method,procedure:s.steps},s.steps).correct)
     throw Error('Contextual model violates required dependencies: '+s.id);
   if(DEPENDENCIES[s.methodId].some(([a,b])=>!s.steps.some(x=>x.id===a)||!s.steps.some(x=>x.id===b)))
     throw Error('Missing prerequisite from case: '+s.id);
   validateNumerics(s);
 }
 for(const id of METHOD_ORDER)for(const level of LEVELS){
   if(scenarios.filter(s=>s.methodId===id&&s.level===level).length!==1)
     throw Error('A method/difficulty lacks one contextual investigation: '+id+'/'+level);
 }
 return true;
}

export function makeBuildScenarioDeck(methods,scenarios,firstMethod='simple-random',
 level='mixed',random=Math.random,previous=new Map()){
 if(!BUILD_SCENARIO_LEVELS.includes(level))throw Error('Unknown case level');
 const methodIndex=new Map(methods.map(x=>[x.id,x]));
 if(!methodIndex.has(firstMethod))throw Error('Unknown first method');
 const previousIds=previous instanceof Map?new Map(previous):new Map(previous||[]);
 const ordered=[firstMethod,...METHOD_ORDER.filter(id=>id!==firstMethod)];
 const items=ordered.map(id=>{
   const method=methodIndex.get(id);
   if(!method)throw Error('Missing required method '+id);
   const pool=scenarios.filter(s=>s.methodId===id&&(level==='mixed'||s.level===level));
   if(!pool.length)throw Error('No contextual case for '+id+'/'+level);
   const fresh=pool.filter(x=>x.id!==previousIds.get(id));
   const selected=shuffled(fresh.length?fresh:pool,random)[0];
   previousIds.set(id,selected.id);
   const contextualMethod={...method,
     definitionFocus:selected.context,
     procedure:selected.steps.map(step=>({...step})),
     workedExample:selected.workedExample};
   return {method:contextualMethod,scenario:selected,
     steps:shuffled(contextualMethod.procedure,random),
     checked:false,correct:false};
 });
 return {items,recentCases:previousIds};
}
