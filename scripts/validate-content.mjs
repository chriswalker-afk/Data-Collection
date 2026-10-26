// Node.js 20+; no external dependencies.
import {readFileSync} from 'node:fs';
const load = file => JSON.parse(readFileSync(new URL('../content/'+file+'.json',import.meta.url),'utf8'));
const {concepts}=load('concepts'),{sources}=load('sources'),{methods}=load('methods'),{evaluations}=load('evaluations');
const {scenarios}=load('scenarios'),{cloze}=load('cloze'),{rounds}=load('sort-rounds');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
const unique=(items,label)=>assert(new Set(items).size===items.length,'Duplicate '+label);
const ids=arr=>arr.map(x=>x.id);
const conceptsById=new Set(ids(concepts)),sourcesById=new Set(ids(sources)),methodsById=new Set(ids(methods)),evalById=new Map(evaluations.map(e=>[e.id,e]));
for(const [label,arr] of Object.entries({concepts,sources,methods,evaluations,scenarios,cloze,rounds})) unique(ids(arr),label+' ID');
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
console.log('PASS: '+concepts.length+' concepts, '+methods.length+' methods, '+evaluations.length+' evaluations, '+scenarios.length+' scenarios, '+cloze.length+' cloze, '+rounds.length+' sort rounds; all references/answer keys valid.');
