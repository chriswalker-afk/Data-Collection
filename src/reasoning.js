// Premium Contextual Reasoning: audited case logic; no automated marking of prose.
import {shuffled} from './core.js';
import {METHOD_LABELS} from './phase2.js';
import {assessReasoning} from './exam.js';

export const REASON_DIMENSIONS=Object.freeze([
  Object.freeze({key:'method',label:'Method',title:'Choose a defensible method',prompt:'Which approach best matches the purpose and available sampling frame?',selfCheck:'I named a method and described how the units would be selected.'}),
  Object.freeze({key:'reason',label:'Justification',title:'Connect it to this investigation',prompt:'Which explanation uses the actual numbers, frame or study constraints?',selfCheck:'I used a detail from this investigation to justify the design.'}),
  Object.freeze({key:'limitation',label:'Limitation',title:'Evaluate what might go wrong',prompt:'Which limitation could genuinely affect the conclusions of this study?',selfCheck:'I identified a real limitation and explained its possible effect.'}),
  Object.freeze({key:'improvement',label:'Improvement',title:'Make the design more defensible',prompt:'Which practical improvement addresses the limitation without claiming more than the evidence supports?',selfCheck:'I suggested a change that addresses the limitation.'})
]);
const fieldKeys=REASON_DIMENSIONS.map(d=>d.key);
export function reasonValue(item,field,index){
  return field==='method'?item.options.method[index]:String(index);
}
export function modelValue(item,field){
  return String(item.answers[field]);
}
export function labelForReasonChoice(item,field,value){
  const choices=item.options[field];
  if(field==='method')return METHOD_LABELS[value]||value;
  return choices[Number(value)]||'';
}
export function buildReasonChoices(item,random=Math.random){
  const layout={};
  for(const field of fieldKeys){
    const keys=item.options[field].map((_,index)=>reasonValue(item,field,index));
    layout[field]=shuffled(keys,random);
  }
  return layout;
}

export function createReasonRound(items,{reviewMode=false,track='guided',random=Math.random}={}){
  if(!['guided','independent'].includes(track))throw Error('Unknown reasoning mode');
  return {
    items,index:0,correct:0,complete:false,answered:false,reviewMode,track,stage:0,
    selections:{},draft:'',selfChecks:{},flagReview:false,reviewTargets:[],
    guidedCases:0,writtenCases:0,matchedPoints:0,
    optionOrders:Object.fromEntries(items.map(item=>[item.id,buildReasonChoices(item,random)]))
  };
}
export function reasonDiagnosis(item,selections){
  const model=assessReasoning(item,selections);
  return {...model,rows:REASON_DIMENSIONS.map(field=>{
    const chosen=String(selections[field.key]??'');
    const matched=chosen===modelValue(item,field.key);
    return {
      key:field.key,label:field.label,correct:matched,
      chosenText:labelForReasonChoice(item,field.key,chosen),
      modelText:labelForReasonChoice(item,field.key,modelValue(item,field.key)),
      why:matched?item.coaching[field.key]:item.misconceptions[field.key][chosen],
      coaching:item.coaching[field.key]
    };
  })};
}
export function shouldReviewReason(item,track,selections,selfChecks={},flag=false){
  if(flag)return true;
  if(track==='guided'&&!assessReasoning(item,selections).complete)return true;
  const checked=Object.keys(selfChecks);
  return checked.length>0&&REASON_DIMENSIONS.some(x=>!selfChecks[x.key]);
}
export function validateReasonBank(items){
  if(!Array.isArray(items)||items.length<9)throw Error('Too few reasoning investigations');
  const ids=new Set();
  for(const q of items){
    if(ids.has(q.id)||!q.id)throw Error('Duplicate or missing reasoning case ID');
    ids.add(q.id);
    if(!['foundation','develop','extend'].includes(q.level)||!q.scenario||!q.priority||!q.model||!q.tradeoff)throw Error('Incomplete reasoning case: '+q.id);
    if(!Array.isArray(q.evidence)||q.evidence.length<2||q.evidence.some(x=>!x.label||!x.text))throw Error('Missing case evidence: '+q.id);
    for(const field of fieldKeys){
      const options=q.options?.[field];
      if(!Array.isArray(options)||options.length!==3||new Set(options).size!==3)throw Error('Invalid reasoning choices: '+q.id+'/'+field);
      const correct=modelValue(q,field);
      const keys=options.map((_,i)=>reasonValue(q,field,i));
      if(new Set(keys).size!==3||!keys.includes(correct))throw Error('Invalid reasoning key: '+q.id+'/'+field);
      if(typeof q.coaching?.[field]!=='string'||q.coaching[field].length<25)throw Error('Incomplete reasoning coaching: '+q.id+'/'+field);
      const explanations=q.misconceptions?.[field];
      if(!explanations||keys.filter(x=>x!==correct).some(k=>typeof explanations[k]!=='string'||explanations[k].length<25))throw Error('Missing misconception feedback: '+q.id+'/'+field);
      if(Object.keys(explanations).some(k=>!keys.includes(k)||k===correct))throw Error('Stale misconception key: '+q.id+'/'+field);
    }
  }
  return true;
}
