// Which Method? — explanation-led scenario interpretation.
// The audited scenario JSON remains the only source of mathematical answers.
// Decisive quotations are shown only AFTER a student submits an answer.
import {METHOD_ORDER,METHOD_LABELS} from './phase2.js';

export const SCENARIO_EVIDENCE=Object.freeze({
 'sr-01':'A generator picks 30 distinct integers',
 'sr-02':'uses an unbiased random selection tool',
 'sr-03':'Ten are drawn without replacement',
 'sr-04':'a random-digit table is read',
 'sys-01':'randomly starts at position 4 and then selects 4, 14, 24',
 'sys-02':'then inspects every 25th item',
 'sys-03':'starting number from 1 to 10 and then chooses every 10th record',
 'sys-04':'randomly chooses a start from positions 1 to 8 and then takes every 10th record thereafter',
 'st-01':'at random from separate registers',
 'st-02':'randomly draws names within each department',
 'st-03':'random-number selection from the full roster in each group',
 'st-04':'using separate random-number lists matching visitor proportions',
 'qu-01':'stop asking in each group once 25 have agreed',
 'qu-02':'staff recruit volunteers until each target is reached',
 'qu-03':'recruit willing pupils they encounter until each target is reached',
 'qu-04':'refuse further responses from a filled group',
 'op-01':'first 20 eligible people leaving the library at lunchtime',
 'op-02':'asks willing people seated near the canteen entrance',
 'op-03':'first 30 customers willing to answer questions',
 'op-04':'whoever happens to be at the bus stop at 7:30 a.m.'
});

// A contrasting explanation for each incorrect choice, grounded in the
// actual selection mechanism rather than in the demographic group sampled.
export const CHOICE_CONTRASTS=Object.freeze({
 'simple-random':Object.freeze({
  systematic:'There is no regular interval through an ordered list: individuals are chosen by independent random draws.',
  stratified:'No separate strata are formed and randomly sampled in prescribed group proportions.',
  quota:'There are no fixed subgroup recruitment targets: participants are selected at random.',
  opportunity:'Selection is by an impartial random procedure, not because individuals are nearby or available.'
 }),
 systematic:Object.freeze({
  'simple-random':'A random start is followed by a fixed interval; this does not make every possible sample equally likely.',
  stratified:'There are no separate random selections within proportional population strata.',
  quota:'The chosen positions follow a regular list interval, not non-random recruitment to group targets.',
  opportunity:'An ordered list and a fixed selection interval determine the sample, not convenience or availability.'
 }),
 stratified:Object.freeze({
  'simple-random':'The population is divided into strata first, and random draws are made separately within each group.',
  systematic:'Separate random draws in strata are used, rather than a single regular interval along one list.',
  quota:'The group proportions are planned, but individuals are randomly drawn within each stratum—not approached conveniently.',
  opportunity:'The sample comes from random selection within defined strata rather than whoever is available.'
 }),
 quota:Object.freeze({
  'simple-random':'Group targets are filled by non-random recruitment; there is no equal-probability random draw.',
  systematic:'Interviewers fill group targets rather than following a random start and a fixed list interval.',
  stratified:'Setting group totals alone is insufficient for stratified sampling: individuals inside the quotas are not randomly drawn.',
  opportunity:'People may be conveniently approached, but explicit group targets and stopping rules control recruitment.'
 }),
 opportunity:Object.freeze({
  'simple-random':'People are included because they are available, not by random-number selection from a complete list.',
  systematic:'No ordered list, random starting position and fixed interval govern who is chosen.',
  stratified:'No defined strata are sampled randomly and proportionally.',
  quota:'There are no required subgroup totals; availability alone determines who can be included.'
 })
});

export function evidenceParts(scenario){
 const phrase=SCENARIO_EVIDENCE[scenario.id];
 if(!phrase)throw new Error('Missing Which Method? evidence for '+scenario.id);
 const index=scenario.prompt.indexOf(phrase);
 if(index<0)throw new Error('Evidence quotation not present in '+scenario.id);
 return Object.freeze({
  before:scenario.prompt.slice(0,index),
  quote:phrase,
  after:scenario.prompt.slice(index+phrase.length)
 });
}
export function contrastForChoice(scenario,chosen){
 if(!METHOD_ORDER.includes(chosen))throw new Error('Invalid sampling method choice');
 if(chosen===scenario.correctMethod)return scenario.contrast;
 return CHOICE_CONTRASTS[scenario.correctMethod]?.[chosen]||'Compare the exact method used to select individuals.';
}
export function methodPerformance(items,responses){
 return METHOD_ORDER.map(method=>{
  const relevant=items.filter(item=>item.correctMethod===method);
  const attempted=relevant.filter(item=>Boolean(responses[item.id]));
  const correct=attempted.filter(item=>responses[item.id].correct===true).length;
  return {id:method,label:METHOD_LABELS[method],total:relevant.length,
    attempted:attempted.length,correct,missed:attempted.length-correct};
 }).filter(row=>row.total>0);
}
export function reviewScenarioDeck(items,missedIds){
 const ids=new Set(missedIds||[]);
 return items.filter(item=>ids.has(item.id));
}
export function validateIdentifyBank(scenarios){
 if(!Array.isArray(scenarios)||scenarios.length<20)throw new Error('Incomplete Which Method? scenario bank');
 if(new Set(scenarios.map(x=>x.id)).size!==scenarios.length)throw new Error('Repeated scenario ID');
 for(const item of scenarios){
  if(!METHOD_ORDER.includes(item.correctMethod)||!['recognise','apply'].includes(item.level)||
    !item.reason?.trim()||!item.contrast?.trim()){
   throw new Error('Incomplete or invalid Which Method? question '+item.id);
  }
  evidenceParts(item);
  for(const method of METHOD_ORDER){
   if(method===item.correctMethod)continue;
   if(!CHOICE_CONTRASTS[item.correctMethod]?.[method]?.trim()){
    throw new Error('Missing contrast for '+item.correctMethod+' versus '+method);
   }
  }
 }
 if(METHOD_ORDER.some(id=>scenarios.filter(x=>x.correctMethod===id).length<4)){
  throw new Error('Every method requires four scenario examples');
 }
 if(Object.keys(SCENARIO_EVIDENCE).some(id=>!scenarios.some(x=>x.id===id))){
  throw new Error('Unused evidence quotation');
 }
 return true;
}
