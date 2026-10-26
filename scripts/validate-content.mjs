// Node.js 20+; no external dependencies.
import {readFileSync} from 'node:fs';
import {validatePairBank} from '../src/sort-it.js';
const load = file => JSON.parse(readFileSync(new URL('../content/'+file+'.json',import.meta.url),'utf8'));
const {concepts}=load('concepts'),{sources}=load('sources'),{methods}=load('methods'),{evaluations}=load('evaluations');
const {scenarios}=load('scenarios'),{cloze}=load('cloze'),{rounds}=load('sort-rounds'),{pairs}=load('sort-pairs');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
const unique=(items,label)=>assert(new Set(items).size===items.length,'Duplicate '+label);
const ids=arr=>arr.map(x=>x.id);
const conceptsById=new Set(ids(concepts)),sourcesById=new Set(ids(sources)),methodsById=new Set(ids(methods)),evalById=new Map(evaluations.map(e=>[e.id,e]));
for(const [label,arr] of Object.entries({concepts,sources,methods,evaluations,scenarios,cloze,rounds,pairs})) unique(ids(arr),label+' ID');
const referenceSources=(entry)=>{assert(Array.isArray(entry.sourceIds)&&entry.sourceIds.length>0,'Missing source: '+entry.id);for(const id of entry.sourceIds)assert(sourcesById.has(id),'Unknown source '+id+' in '+entry.id)};
for(const c of concepts){assert(c.label&&c.definition&&c.example&&c.misconception&&c.keyPhrases?.length,'Incomplete concept: '+c.id);referenceSources(c)}
assert(methods.length===5,'Exactly five sampling methods expected');
assert(methods.filter(m=>m.family==='random').length===3,'Three random sampling methods required');
assert(methods.filter(m=>m.family==='non-random').length===2,'Two non-random sampling methods required');
for(const m of methods){assert(conceptsById.has(m.conceptId),'Unknown method concept '+m.id);assert(m.procedure?.length>=3&&m.examKeywords?.length&&m.warning,'Incomplete method '+m.id);unique(ids(m.procedure),'procedure step');referenceSources(m)}
for(const e of evaluations){assert(['census','sample',...ids(methods)].includes(e.subject),'Unknown evaluation subject: '+e.id);assert(['advantage','disadvantage'].includes(e.polarity),'Invalid polarity: '+e.id);assert(e.claim&&e.explanation,'Incomplete evaluation: '+e.id);referenceSources(e)}
for(const m of methods){assert(evaluations.some(e=>e.subject===m.id&&e.polarity==='advantage'),'Missing advantage for '+m.id);assert(evaluations.some(e=>e.subject===m.id&&e.polarity==='disadvantage'),'Missing disadvantage for '+m.id);assert(scenarios.filter(s=>s.correctMethod===m.id).length>=3,'Insufficient scenarios '+m.id)}
for(const s of scenarios){assert(methodsById.has(s.correctMethod),'Bad scenario method '+s.id);assert(s.prompt&&s.reason&&s.contrast,'Incomplete scenario '+s.id);referenceSources(s)}
for(const q of cloze){assert(conceptsById.has(q.conceptId),'Unknown cloze concept '+q.id);assert(q.prompt.split('{{blank}}').length===2,'Cloze needs exactly one blank: '+q.id);assert(q.choices.length===4&&new Set(q.choices).size===4&&q.choices.includes(q.answer),'Invalid cloze options: '+q.id);assert(q.explanation,'Missing explanation '+q.id);referenceSources(q)}
for(const round of rounds){assert(round.categories.length===2,'Sort round must have two categories: '+round.id);if(round.type==='polarity'){assert(round.evaluationIds.length>=4,'Too few sorting cards: '+round.id);const cards=round.evaluationIds.map(id=>{assert(evalById.has(id),'Unknown evaluation '+id);return evalById.get(id)});assert(cards.every(c=>c.subject===round.subject),'Cross-method ambiguous sort '+round.id);assert(cards.some(c=>c.polarity==='advantage')&&cards.some(c=>c.polarity==='disadvantage'),'Both polarities required '+round.id)}else{assert(round.type==='comparison'&&round.cards.length>=4,'Invalid comparison '+round.id);for(const c of round.cards)assert(round.categories.includes(c.answer)&&c.why&&c.prompt,'Bad comparison item '+round.id)}}
validatePairBank(pairs,evaluations);
assert(pairs.some(pair=>pair.id==='pair-srs-stratified'&&pair.evaluationIds.includes('srs-subgroups')),
 'The random-vs-stratified board must include chance underrepresentation.');
const sr=methods.find(m=>m.id==='simple-random');
assert(sr.procedure.some(p=>/ignore repeated/i.test(p.text)),'Simple random must say ignore repeats');
assert(sr.conditionalProcedure.some(p=>/outside/i.test(p.text)),'Unrestricted digit-source edge case required');
const st=methods.find(m=>m.id==='stratified');assert(st.procedure.some(p=>/randomly/i.test(p.text)&&/repeats/i.test(p.text)),'Stratified random selection and repeats required');
const sy=methods.find(m=>m.id==='systematic');assert(sy.conditionalProcedure.some(p=>/not an integer/i.test(p.condition)),'Systematic non-integer caveat required');
assert(concepts.find(c=>c.id==='simple-random-sampling').definition.includes('every possible group'),'SRS definition must concern whole samples');
const {errors}=load('exam-errors'),{reasoning}=load('exam-reasoning');
unique(ids(errors),'exam error');unique(ids(reasoning),'exam reasoning');
for(const q of errors){
 assert(['foundation','develop','extend'].includes(q.level)&&methodsById.has(q.methodId),'Invalid error level or method: '+q.id);
 assert(q.lines.length>=3&&Number.isInteger(q.errorLine)&&q.errorLine>=0&&q.errorLine<q.lines.length,'Invalid error line: '+q.id);
 assert(q.repairs.length===3&&q.repairs.some(x=>x.id===q.repair)&&q.explanation,'Invalid repair: '+q.id);
 assert(q.impact?.options?.length===3&&q.impact.options.some(o=>o.id===q.impact.answer)&&q.impact.explanation,'Invalid consequence: '+q.id);
}
for(const q of reasoning){
 assert(['foundation','develop','extend'].includes(q.level)&&q.scenario&&q.priority&&q.model&&q.tradeoff,'Invalid scenario: '+q.id);
 for(const key of ['method','reason','limitation','improvement']){
  assert(q.options[key]?.length>=3,'Invalid options: '+q.id+'/'+key);
  assert(key==='method'?methodsById.has(q.answers[key])&&q.options[key].includes(q.answers[key]):
    Number.isInteger(q.answers[key])&&q.answers[key]>=0&&q.answers[key]<q.options[key].length,'Invalid key: '+q.id+'/'+key);
 }
}
assert(errors.length>=15&&reasoning.length>=9,'Incomplete exam skills bank');

const {questions:examQuestions}=load('exam-practice');
unique(ids(examQuestions),'exam practice');
assert(examQuestions.length>=46,'Insufficient mixed exam questions');
assert(examQuestions.filter(q=>q.type==='evaluation'&&q.coverageArea==='inference').length>=8,'Too little inference/census practice');
assert(examQuestions.filter(q=>q.type==='evaluation'&&q.coverageArea==='methods').length>=8,'Too little method comparison practice');
for(const type of ['allocation','systematic','procedure','evaluation'])
 assert(examQuestions.filter(q=>q.type===type).length>=8,'Unbalanced exam bank: '+type);
for(const q of examQuestions){
 assert(['allocation','systematic','procedure','evaluation'].includes(q.type),'Unsupported exam type: '+q.id);
 assert(['foundation','develop','extend'].includes(q.level)&&q.title&&q.context&&q.task,'Incomplete exam prompt: '+q.id);
 assert(methodsById.has(q.methodId),'Unknown exam method: '+q.id);
 assert(Array.isArray(q.hints)&&q.hints.length===2&&q.hints.every(h=>typeof h==='string'&&h.length>=30&&h.length<=350),'Invalid staged hints '+q.id);
 referenceSources(q);
 if(q.type==='allocation'){
  assert(conceptsById.has(q.conceptId)&&q.conceptId==='proportional-allocation','Allocation concept missing '+q.id);
  const {sampleSize,groups}=q.data||{};
  assert(Number.isSafeInteger(sampleSize)&&sampleSize>0&&groups?.length>=2,'Invalid allocation: '+q.id);
  unique(ids(groups),'group ID for '+q.id);
  const N=groups.reduce((total,g)=>{
   assert(g.label&&Number.isSafeInteger(g.size)&&g.size>0,'Invalid group size '+q.id);
   assert(Number.isSafeInteger(total+g.size),'Unsafe total population '+q.id);
   assert(Number.isSafeInteger(g.size*sampleSize),'Unsafe allocation product '+q.id);
   return total+g.size;
  },0);
  assert(sampleSize<=N&&groups.every(g=>Number.isInteger(g.size*sampleSize/N)),'Non-integer numerical allocation '+q.id);
  assert(groups.reduce((total,g)=>total+g.size*sampleSize/N,0)===sampleSize,'Allocation total wrong '+q.id);
 }else if(q.type==='systematic'){
  assert(q.conceptId==='sampling-interval'&&conceptsById.has(q.conceptId),'Systematic concept missing '+q.id);
  const {populationSize:N,sampleSize:n,randomStart:start}=q.data||{};
  assert([N,n,start].every(Number.isSafeInteger)&&n>0&&N>=n&&N%n===0&&start>=1&&start<=N/n,'Invalid interval '+q.id);
  assert(start+(n-1)*(N/n)<=N,'Systematic end outside frame '+q.id);
 }else if(q.type==='procedure'){
  assert(q.focus&&q.note&&Array.isArray(q.extraPoints)&&q.extraPoints.length>0,'Incomplete procedure rationale '+q.id);
  unique(ids(q.extraPoints),'procedure extra point '+q.id);
  for(const p of q.extraPoints)assert(p.text,'Missing procedure point '+q.id);
  if(q.modelSteps){
   assert(q.modelSteps.length>=4&&q.warning,'Incomplete context-specific procedure '+q.id);
   unique(ids(q.modelSteps),'context-specific procedure steps '+q.id);
   assert(q.modelSteps.every(p=>p.text&&p.text.length>=15),'Missing contextual model step '+q.id);
  }
 }else{
  assert(q.model&&q.checklist?.length>=3&&q.sourceEvaluationIds?.length>0,'Incomplete evaluation '+q.id);
  assert(['inference','methods'].includes(q.coverageArea),'Unclassified evaluation '+q.id);
  unique(ids(q.checklist),'evaluation point '+q.id);
  for(const p of q.checklist)assert(p.text,'Missing evaluation point '+q.id);
  for(const id of q.sourceEvaluationIds)assert(evalById.has(id),'Unknown evaluation source: '+q.id+'/'+id);
 }
}

const specialModels=new Map(examQuestions.filter(q=>q.modelSteps).map(q=>[q.id,q.modelSteps.map(s=>s.text).join(' ')]));
assert(/000/.test(specialModels.get('proc-random-digits')||'')&&/181/.test(specialModels.get('proc-random-digits')||''),'Digit table model does not reject invalid labels');
assert(/197/.test(specialModels.get('proc-systematic-fraction')||'')&&/40/.test(specialModels.get('proc-systematic-fraction')||''),'Noninteger systematic model fails required size');
console.log('PASS: exam practice includes '+examQuestions.length+' tasks with contextual models, two-stage hints and inference coverage.');
console.log('PASS: '+concepts.length+' concepts, '+methods.length+' methods, '+evaluations.length+' evaluations, '+scenarios.length+' scenarios, '+cloze.length+' cloze, '+rounds.length+' legacy sorting references and '+pairs.length+' two-method boards; all references/answer keys valid.');
