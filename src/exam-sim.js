// Pass 5 — mathematically checked numerical work and explicitly self-reviewed writing.
// This module is pure except for the opt-in browser-storage functions below.
import {shuffled} from './core.js';

export const PAPER_SIZES=Object.freeze({quick:4,standard:8,full:12});
export const PAPER_TYPES=Object.freeze(['allocation','systematic','procedure','evaluation']);
export const PAPER_LEVELS=Object.freeze(['confidence','mixed','stretch']);
const LEVEL_ORDER=Object.freeze({foundation:0,develop:1,extend:2});
export function paperQuestionPool(questions,difficulty='mixed'){
  if(!PAPER_LEVELS.includes(difficulty))throw new Error('Unknown level of challenge');
  return questions.filter(q=>difficulty==='mixed'||
    difficulty==='confidence'&&['foundation','develop'].includes(q.level)||
    difficulty==='stretch'&&['develop','extend'].includes(q.level));
}
export const EXAM_STORE_KEY='sampling-arcade-exam-v1';
export const MAX_TARGETS=40;
export const MAX_RECENT_QUESTIONS=60;

export function integerInput(value){
  const text=String(value??'').trim().replace(/,/g,'');
  if(!/^\+?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.0+)?$/.test(String(value??'').trim()))return null;
  const number=Number(text);
  return Number.isSafeInteger(number)&&number>=0?number:null;
}
export function allocationKey(question){
  if(question.type!=='allocation')throw new Error('Expected allocation question');
  const {sampleSize,groups}=question.data;
  if(!Number.isSafeInteger(sampleSize)||sampleSize<=0||!Array.isArray(groups)||groups.length<2)
    throw new Error('Invalid stratified task');
  const N=groups.reduce((total,g)=>{
    if(!Number.isSafeInteger(g.size)||g.size<=0||!/^g\d+$/.test(g.id))throw new Error('Invalid stratum');
    if(!Number.isSafeInteger(total+g.size))throw new Error('Population size exceeds safe-integer range');
    return total+g.size;
  },0);
  if(sampleSize>N)throw new Error('Sample cannot exceed population');
  const entries=groups.map(g=>{
    const product=g.size*sampleSize;
    if(!Number.isSafeInteger(product))throw new Error('Allocation calculation exceeds safe-integer range');
    const exact=product/N;
    if(!Number.isSafeInteger(exact))throw new Error('This numerical question needs exact whole-number allocations');
    return {id:g.id,label:g.label,population:g.size,expected:exact,working:`${g.size} / ${N} × ${sampleSize} = ${exact}`};
  });
  if(entries.reduce((a,b)=>a+b.expected,0)!==sampleSize)throw new Error('Allocation does not total n');
  return entries;
}
export function systematicKey(question){
  if(question.type!=='systematic')throw new Error('Expected systematic question');
  const {populationSize:N,sampleSize:n,randomStart:start}=question.data;
  if(![N,n,start].every(Number.isSafeInteger)||n<=0||N<n||N%n!==0)
    throw new Error('Systematic numerical task must have an exact integer interval');
  const interval=N/n;
  if(start<1||start>interval)throw new Error('Start outside the first interval');
  const final=start+(n-1)*interval;
  if(final>N)throw new Error('Invalid final position');
  return [{id:'interval',label:'Sampling interval k',expected:interval,working:`${N} / ${n} = ${interval}`},
    {id:'final',label:'Last selected position',expected:final,
    working:`${start} + (${n} - 1) × ${interval} = ${final}`}];
}
export function numericalKey(question){
  if(question.type==='allocation')return allocationKey(question);
  if(question.type==='systematic')return systematicKey(question);
  throw new Error('Written tasks cannot be automatically graded');
}
export function gradeNumbers(question,answers){
  const fields=numericalKey(question);
  const results=fields.map(f=>{
    const supplied=String(answers?.[f.id]??'');
    const number=integerInput(supplied);
    return {...f,supplied,number,valid:number!==null,correct:number===f.expected};
  });
  return {fields:results,valid:results.every(x=>x.valid),correct:results.every(x=>x.correct),
    correctParts:results.filter(x=>x.correct).length,totalParts:results.length};
}
export function procedureModelSteps(question,methods){
  if(question.type!=='procedure')throw new Error('Not a procedural question');
  const method=methods.find(x=>x.id===question.methodId);
  if(!method)throw new Error('Unknown audited method '+question.methodId);
  return question.modelSteps?.length?question.modelSteps:method.procedure;
}
export function writtenChecklist(question,methods){
  if(question.type==='evaluation')return question.checklist.map(p=>({id:p.id,text:p.text}));
  if(question.type!=='procedure')throw new Error('Not a written question');
  const method=methods.find(x=>x.id===question.methodId);
  if(!method)throw new Error('Unknown audited method '+question.methodId);
  return [...procedureModelSteps(question,methods).map(p=>({id:'step-'+p.id,text:p.text})),...(question.extraPoints||[])];
}
// New papers prefer unseen questions, then the least recently practised ones.
// Shuffling remains the tie-breaker, so repeats still vary after a pool is exhausted.
export function preferUnseenQuestions(pool,recentIds=[],random=Math.random){
  const recent=new Map([...new Set(Array.isArray(recentIds)?recentIds:[])]
    .map((id,i)=>[id,i]));
  return shuffled(pool,random).sort((a,b)=>{
    const aAge=recent.has(a.id)?recent.get(a.id):Number.POSITIVE_INFINITY;
    const bAge=recent.has(b.id)?recent.get(b.id):Number.POSITIVE_INFINITY;
    return bAge-aAge;
  });
}
export function updateRecentQuestionIds(prior,newIds){
  const ids=[...(Array.isArray(newIds)?[...newIds].reverse():[]),
    ...(Array.isArray(prior)?prior:[])];
  return [...new Set(ids.filter(id=>typeof id==='string'&&id.length<=72))]
    .slice(0,MAX_RECENT_QUESTIONS);
}
export function makePaper(questions,variant,random=Math.random,difficulty='mixed',recentIds=[]){
  const size=PAPER_SIZES[variant];
  if(!size)throw new Error('Unknown paper format');
  const count=size/PAPER_TYPES.length;
  const eligible=paperQuestionPool(questions,difficulty);
  const chosen=PAPER_TYPES.flatMap(type=>{
    const pool=preferUnseenQuestions(eligible.filter(q=>q.type===type),recentIds,random);
    if(pool.length<count)throw new Error('Insufficient '+type+' questions');
    if(type!=='evaluation'||count<2)return pool.slice(0,count);
    // Standard/full papers deliberately span both inference and method critique.
    const inference=pool.find(q=>q.coverageArea==='inference');
    const methods=pool.find(q=>q.coverageArea==='methods');
    if(!inference||!methods)throw new Error('Missing evaluation coverage groups');
    const retained=[inference,methods];
    return retained.concat(pool.filter(q=>!retained.includes(q)).slice(0,count-2));
  });
  // Gradually raise difficulty, preserving variation within each difficulty band.
  const ordered=shuffled(chosen,random).sort((a,b)=>LEVEL_ORDER[a.level]-LEVEL_ORDER[b.level]);
  return newPaper(variant,ordered.map(q=>q.id),difficulty);
}
export function makeReviewPaper(questions,reviewIds,random=Math.random){
  const byId=new Set(questions.map(q=>q.id));
  const ids=[...new Set(reviewIds)].filter(id=>byId.has(id));
  if(!ids.length)throw new Error('No saved practice targets');
  return newPaper('review',shuffled(ids,random).slice(0,12));
}
export function newPaper(variant,questionIds,difficulty='mixed'){
  if(!PAPER_LEVELS.includes(difficulty)||![...Object.keys(PAPER_SIZES),'review'].includes(variant)||!Array.isArray(questionIds)||
     questionIds.length<1||questionIds.length>12||new Set(questionIds).size!==questionIds.length)
    throw new Error('Invalid paper');
  return {variant,difficulty,questionIds:[...questionIds],index:0,entries:{},complete:false};
}
export function paperEntry(paper,id){
  return paper.entries[id]||{values:{},draft:'',improvement:'',stage:'answer',included:[],flag:false,hintsUsed:0};
}
export function changeReviewTargets(ids,id,flag){
  const next=[id,...ids.filter(x=>x!==id)].slice(0,MAX_TARGETS);
  return flag?next:ids.filter(x=>x!==id);
}
export function emptyExamStore(){return {version:1,reviewIds:[],recentQuestionIds:[],paper:null};}
const safeId=value=>typeof value==='string'&&/^[a-z][a-z0-9-]{1,70}$/.test(value);
function sanitizeEntry(value,question,methods){
  const entry={values:{},draft:'',improvement:'',stage:'answer',included:[],flag:false,hintsUsed:0};
  if(!value||typeof value!=='object'||Array.isArray(value))return entry;
  if(typeof value.draft==='string')entry.draft=value.draft.slice(0,2400);
  if(typeof value.improvement==='string')entry.improvement=value.improvement.slice(0,600);
  if(['answer','feedback','review','done'].includes(value.stage))entry.stage=value.stage;
  entry.flag=value.flag===true;
  if(Number.isSafeInteger(value.hintsUsed)&&value.hintsUsed>=0&&value.hintsUsed<=2)entry.hintsUsed=value.hintsUsed;
  if(question.type==='allocation'||question.type==='systematic'){
    const keys=new Set(numericalKey(question).map(x=>x.id));
    if(value.values&&typeof value.values==='object'&&!Array.isArray(value.values))
      for(const [key,text] of Object.entries(value.values))
        if(keys.has(key)&&typeof text==='string')entry.values[key]=text.slice(0,30);
    // Numeric exercises have a feedback stage, never a written review stage.
    if(entry.stage==='review')entry.stage='answer';
  }else{
    const allowed=new Set(writtenChecklist(question,methods).map(x=>x.id));
    if(Array.isArray(value.included))entry.included=[...new Set(value.included.filter(x=>allowed.has(x)))];
    if(entry.stage==='feedback')entry.stage='answer';
    // Reading a model without writing cannot count as checking ideas in one's own answer.
    if(!entry.draft.trim()&&['review','done'].includes(entry.stage)){
      entry.included=[];entry.flag=true;
    }
  }
  return entry;
}
export function sanitizeExamStore(value,questions,methods){
  const result=emptyExamStore();
  if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==1)return result;
  const byId=new Map(questions.map(q=>[q.id,q]));
  if(Array.isArray(value.reviewIds))result.reviewIds=[...new Set(value.reviewIds.filter(id=>safeId(id)&&byId.has(id)))].slice(0,MAX_TARGETS);
  if(Array.isArray(value.recentQuestionIds))
    result.recentQuestionIds=[...new Set(value.recentQuestionIds.filter(id=>safeId(id)&&byId.has(id)))].slice(0,MAX_RECENT_QUESTIONS);
  const p=value.paper;
  if(!p||typeof p!=='object'||Array.isArray(p)||![...Object.keys(PAPER_SIZES),'review'].includes(p.variant))return result;
  if(!Array.isArray(p.questionIds)||p.questionIds.length<1||p.questionIds.length>12||
     new Set(p.questionIds).size!==p.questionIds.length||!p.questionIds.every(id=>safeId(id)&&byId.has(id)))return result;
  if(!Number.isSafeInteger(p.index)||p.index<0||p.index>=p.questionIds.length)return result;
  const entries={};
  for(const id of p.questionIds){
    const source=p.entries&&typeof p.entries==='object'&&!Array.isArray(p.entries)?p.entries[id]:null;
    entries[id]=sanitizeEntry(source,byId.get(id),methods);
  }
  // Existing Pass 5/6 papers did not store difficulty: keep them playable as mixed papers.
  result.paper={variant:p.variant,difficulty:PAPER_LEVELS.includes(p.difficulty)?p.difficulty:'mixed',
    questionIds:[...p.questionIds],index:p.index,entries,complete:p.complete===true};
  return result;
}
export function loadExamStore(questions,methods,storage){
  try{
    const value=(storage??globalThis.localStorage).getItem(EXAM_STORE_KEY);
    return value?sanitizeExamStore(JSON.parse(value),questions,methods):emptyExamStore();
  }catch{return emptyExamStore();}
}
export function saveExamStore(store,questions,methods,storage){
  try{
    (storage??globalThis.localStorage).setItem(EXAM_STORE_KEY,JSON.stringify(sanitizeExamStore(store,questions,methods)));
    return true;
  }catch{return false;}
}
export function clearExamStore(storage){
  try{(storage??globalThis.localStorage).removeItem(EXAM_STORE_KEY);return true;}catch{return false;}
}
export function paperSummary(paper,questions,methods){
  const byId=new Map(questions.map(q=>[q.id,q]));
  let correctParts=0,possibleParts=0,fullyCorrect=0,numberQuestions=0,writtenQuestions=0,covered=0,totalChecklist=0;
  const rows=paper.questionIds.map(id=>{
    const q=byId.get(id),entry=paperEntry(paper,id);
    if(!q)throw new Error('Missing question '+id);
    if(q.type==='allocation'||q.type==='systematic'){
      const score=entry.stage==='answer'?null:gradeNumbers(q,entry.values);
      const length=numericalKey(q).length;
      numberQuestions++;possibleParts+=length;correctParts+=score?.correctParts||0;
      if(score?.correct)fullyCorrect++;
      return {id,title:q.title,type:q.type,label:score?score.correctParts+' / '+length+' parts':'Not submitted',
        needsReview:!score?.correct||entry.hintsUsed>0,draft:'',score,hintsUsed:entry.hintsUsed};
    }
    const points=writtenChecklist(q,methods),included=new Set(entry.included);
    writtenQuestions++;totalChecklist+=points.length;
    const hasDraft=Boolean(entry.draft.trim());
    covered+=hasDraft?points.filter(x=>included.has(x.id)).length:0;
    return {id,title:q.title,type:q.type,
      label:entry.stage==='answer'?'Not reviewed':
        !hasDraft?'Model studied · no written answer':entry.included.length+' / '+points.length+' self-checked points',
      needsReview:entry.stage==='answer'||!hasDraft||entry.flag||entry.included.length<points.length||entry.hintsUsed>0,
      draft:entry.draft,improvement:entry.improvement||'',score:null,hintsUsed:entry.hintsUsed};
  });
  return {rows,correctParts,possibleParts,fullyCorrect,numberQuestions,writtenQuestions,covered,totalChecklist};
}

/** A teacher-readable CSV, with neither student names nor drafts unless explicitly opted in. */
export function reportCsv(paper,questions,methods,{includeDrafts=false}={}){
  const byId=new Map(questions.map(q=>[q.id,q]));
  const summary=paperSummary(paper,questions,methods);
  const columns=['Question ID','Question','Skill','Level','Assessment','Numeric correct','Numeric possible',
    'Self-checked points','Self-check total','Hint used','Revision recommended',...(includeDrafts?['Written draft','Improvement note']:[])];
  function safeCell(value){
    let cell=String(value??'');
    // CSV files are often opened by spreadsheet programs. Prevent pasted text from becoming a formula.
    if(/^\s*[=+@-]/.test(cell)||/^[\t\r\n]/.test(cell))cell="'"+cell;
    return '"'+cell.replace(/"/g,'""')+'"';
  }
  const rows=summary.rows.map(row=>{
    const q=byId.get(row.id),entry=paperEntry(paper,row.id),numerical=q.type==='allocation'||q.type==='systematic';
    const points=numerical?null:writtenChecklist(q,methods);
    return [q.id,q.title,q.type,q.level,numerical?'Numerical: automatically checked':'Written: student self-review',
      numerical?row.score?.correctParts??'':'',
      numerical?row.score?.totalParts??'':'',
      numerical?'':entry.stage==='answer'?'':entry.draft.trim()?entry.included.length:0,
      numerical?'':points.length,
      row.hintsUsed?'Yes':'No',row.needsReview?'Yes':'No',...(includeDrafts?[numerical?'':row.draft,numerical?'':row.improvement||'']:[])];
  });
  return [columns,...rows].map(row=>row.map(safeCell).join(',')).join('\r\n')+'\r\n';
}
