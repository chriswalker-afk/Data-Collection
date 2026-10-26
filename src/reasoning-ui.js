// Student-facing Contextual Reasoning workshop.
// The authored response is never auto-marked, and model alignment never gives mastery credit.
import {
 REASON_DIMENSIONS,createReasonRound,reasonDiagnosis,labelForReasonChoice,shouldReviewReason
} from './reasoning.js';

const dimensions=REASON_DIMENSIONS.map(item=>item.key);
const n=(amount)=>String(amount);
export function createReasoningUI({
 element,div,span,paragraph,heading,action,activityTop,examLevelPicker,roundProgress,
 practiceGuide,feedbackBanner,showCompletion,getState,setSession,render,announce,
 remember,finishRound,conceptIdForSubject
}){
 const state=()=>getState().session;
 const question=()=>state().items[state().index];
 const node=(tag,className,contents)=>element(tag,{className},contents);
 const optionLabel=(q,part,value)=>labelForReasonChoice(q,part,value);
 function evidenceView(q){
  const box=element('section',{className:'reason-evidence','aria-label':'Key information from the investigation'});
  box.append(span('reason-eyebrow','READ THE CASE'),
    paragraph('reason-scenario',q.scenario),
    div('reason-focus',span('reason-focus-mark','Priority'),
      span('',q.priority)));
  const facts=div('reason-facts');
  for(const fact of q.evidence)facts.append(div('reason-fact',span('reason-fact-label',fact.label),paragraph('',fact.text)));
  box.append(facts);
  return box;
 }
 function pathPicker(s){
  return div('reason-paths',
   div('reason-path-intro',span('reason-eyebrow','YOUR APPROACH'),
     heading(3,'reason-path-title','Choose how to reason'),
     paragraph('reason-path-help','Write from memory, or build a four-part argument before comparing with a model. Neither path automatically marks your writing.')),
   div('reason-path-buttons',
    action('Write independently','reason-track',{'data-track':'independent','aria-pressed':s.track==='independent'},
      'reason-path-option'+(s.track==='independent'?' is-active':'')),
    action('Build with guidance','reason-track',{'data-track':'guided','aria-pressed':s.track==='guided'},
      'reason-path-option'+(s.track==='guided'?' is-active':''))));
 }
 function stepper(s){
  const strip=element('nav',{className:'reason-stepper','aria-label':'Reasoning builder steps'});
  for(let i=0;i<=REASON_DIMENSIONS.length;i++){
   const title=i===4?'Write':REASON_DIMENSIONS[i].label;
   const visited=i<=s.stage;
   strip.append(element('button',{
    type:'button',className:'reason-step-pill'+(i===s.stage?' is-current':''),
    'data-action':'reason-jump','data-step':String(i),
    'aria-current':i===s.stage?'step':null,disabled:!visited
   },span('reason-step-pill-index',String(i+1)),span('',title)));
  }
  return strip;
 }
 function essayInput(s,{required}){
  const field=div('reason-writing-area',
   element('label',{for:'reason-written',className:'reason-writing-label'},
    required?'Write your own explanation before seeing the model':'Now put your four choices into your own words (recommended)'),
   paragraph('reason-writing-tip',required
    ?'Explain which method you would use, why it fits, one risk and a practical improvement. Your writing will be self-reviewed, not automatically graded.'
    :'The choices are planning prompts. Try turning them into a connected explanation rather than copying four fragments. Writing is optional in guided mode.'));
  const draft=element('textarea',{
   id:'reason-written',rows:'6',maxlength:'2000',placeholder:'I would use … because …\nOne possible limitation is …\nTo reduce this risk, I would …',
   'aria-describedby':'reason-writing-limit'
  });
  draft.value=s.draft;
  field.append(draft,paragraph('reason-writing-limit','Maximum 2,000 characters. Your writing is only held for this round; copy it before leaving if you wish.').cloneNode(true));
  field.lastChild.id='reason-writing-limit';
  return field;
 }
 function guidedStage(s,q){
  const area=div('reason-guided');
  area.append(stepper(s));
  if(s.stage<REASON_DIMENSIONS.length){
   const dimension=REASON_DIMENSIONS[s.stage],key=dimension.key;
   const questionArea=element('section',{className:'reason-stage','aria-labelledby':'reason-stage-heading'});
   questionArea.append(span('reason-eyebrow','DECISION '+String(s.stage+1)+' OF 4'),
    heading(3,'reason-stage-title',dimension.title,{id:'reason-stage-heading',tabindex:'-1'}),
    paragraph('reason-stage-intro',dimension.prompt));
   const field=element('fieldset',{className:'reason-choice-field'});
   field.append(element('legend',{className:'sr-only'},dimension.title));
   const values=s.optionOrders[q.id][key];
   for(const [index,value] of values.entries()){
    const checked=String(s.selections[key])===String(value);
    field.append(element('label',{className:'reason-choice'+(checked?' is-selected':'')},
      element('input',{type:'radio',name:'reason-'+key,value,'data-reason-field':key,checked}),
      span('reason-choice-letter',String.fromCharCode(65+index)),
      span('reason-choice-copy',optionLabel(q,key,value))));
   }
   questionArea.append(field);
   area.append(questionArea,div('reason-step-actions',
    ...(s.stage>0?[action('← Previous decision','reason-back',{},'btn btn-quiet')]:[]),
    action('Continue →','reason-forward',{disabled:s.selections[key]===undefined},'btn btn-primary')));
  }else{
   const write=div('reason-stage',
    span('reason-eyebrow','FINAL STAGE · EXPRESS YOUR THINKING'),
    heading(3,'reason-stage-title','Build a connected response',{id:'reason-stage-heading',tabindex:'-1'}),
    paragraph('reason-stage-intro','Your selections form a useful plan. A high-quality exam response must also explain the links between them.'));
   const chain=element('ol',{className:'reason-argument'});
   for(const dimension of REASON_DIMENSIONS)
    chain.append(element('li',{},
      span('reason-argument-label',dimension.label),
      paragraph('reason-argument-copy',optionLabel(q,dimension.key,s.selections[dimension.key]))));
   write.append(chain,essayInput(s,{required:false}));
   area.append(write,div('reason-step-actions',
    action('← Edit decisions','reason-back',{},'btn btn-quiet'),
    action('Review my reasoning','reason-check',{},'btn btn-primary')));
  }
  return area;
 }
 function independentStage(s){
  return div('reason-independent',
   div('reason-stage',span('reason-eyebrow','INDEPENDENT EXAM PRACTICE'),
    heading(3,'reason-stage-title','Make the case for your method',{id:'reason-stage-heading',tabindex:'-1'}),
    paragraph('reason-stage-intro','Answer as though this were a short exam question. Do not just name a method: use the context, identify a consequence and propose an improvement.')),
   div('reason-prompt-grid',...REASON_DIMENSIONS.map((part,i)=>
    div('reason-prompt-chip',span('',String(i+1).padStart(2,'0')),span('',part.label)))),
   essayInput(s,{required:true}),
   div('reason-step-actions',action('Compare with model','reason-check',{disabled:!s.draft.trim()},'btn btn-primary')));
 }
 function modelReview(s,q){
  const independent=s.track==='independent';
  const analysis=element('section',{className:'reason-feedback-start','aria-labelledby':'reason-review-heading',tabindex:'-1'});
  analysis.append(span('reason-eyebrow','AFTER YOUR ANSWER · LEARN FROM THE MODEL'),
   heading(3,'reason-review-title','Review your reasoning',{id:'reason-review-heading'}),
   feedbackBanner('review',independent?'Your written response is ready to self-review':
     reasonDiagnosis(q,s.selections).met.length+' of 4 model choices matched',[
     paragraph('',independent
      ?'Your writing has not been automatically marked. Compare the ideas and check only those you genuinely included.'
      :'This is an alignment check of four selected model points, not an examination mark or an assessment of your writing. No mastery credit is awarded.')
    ]));
  if(!independent){
   const diagnose=reasonDiagnosis(q,s.selections);
   const grid=div('reason-diagnosis-list');
   for(const row of diagnose.rows){
    const card=element('section',{className:'reason-diagnosis-card '+(row.correct?'is-correct':'needs-review')});
    card.append(div('reason-diagnosis-header',
      span('reason-diagnosis-name',row.label),
      span('reason-diagnosis-status',row.correct?'✓ Aligned':'↺ Revisit')),
      paragraph('reason-diagnosis-choice','Your choice: '+row.chosenText),
      paragraph('reason-diagnosis-why',row.why));
    if(!row.correct)card.append(paragraph('reason-diagnosis-model','Model choice: '+row.modelText),
     paragraph('reason-diagnosis-coach',row.coaching));
    grid.append(card);
   }
   analysis.append(grid);
  }
  const comparison=div('reason-comparison');
  const own=div('reason-comparison-card',
   span('reason-eyebrow','YOUR WORDS'),
   heading(4,'reason-comparison-heading','Your written explanation'),
   paragraph('exam-draft reason-saved-draft',s.draft.trim()||'No written explanation this time. Use the model as a worked example, then try writing your own answer next round.'));
  const model=div('reason-comparison-card reason-model-card',
   span('reason-eyebrow','ONE DEFENSIBLE MODEL'),
   heading(4,'reason-comparison-heading','Mathematically justified answer'),
   paragraph('exam-model reason-model-text',q.model));
  comparison.append(own,model);
  analysis.append(comparison,
   div('reason-tradeoff',span('reason-eyebrow','THINK BEYOND THIS MODEL'),
     paragraph('',q.tradeoff)));
  const checklist=element('fieldset',{className:'reason-self-review'});
  checklist.append(element('legend',{className:'reason-self-title'},'Self-check your written explanation'),
   paragraph('reason-self-help','Tick only what you actually wrote. These are reflective checks, not automatically awarded marks.'));
  for(const part of REASON_DIMENSIONS){
   checklist.append(element('label',{className:'reason-self-option'},
    element('input',{type:'checkbox','data-reason-self':part.key,checked:Boolean(s.selfChecks[part.key])}),
    span('',part.selfCheck)));
  }
  const count=Object.values(s.selfChecks).filter(Boolean).length;
  checklist.append(element('p',{className:'reason-self-count',id:'reason-self-count','aria-live':'polite'},
    count+' of 4 writing points you recognised in your own answer'));
  analysis.append(checklist,
   action(s.flagReview?'✓ Saved for review':'↺ Revisit this investigation','reason-flag',
    {'aria-pressed':s.flagReview},'reason-flag'),
   paragraph('reason-review-fineprint','You may return to difficult cases in an unscored review round. Using the model or a checklist never awards independent mastery.'),
   div('reason-step-actions',action(s.index===s.items.length-1?'Finish round →':'Next investigation →','reason-next',{},'btn btn-primary')));
  return analysis;
 }
 function view(){
  const {session:s}=getState();
  const root=div('page activity-page reason-page');
  root.append(activityTop('reason'));
  if(!s.reviewMode)root.append(examLevelPicker());
  if(s.complete){root.append(showCompletion('reason'));return root;}
  const q=question();
  root.append(roundProgress(s.index+1,s.items.length,(s.reviewMode?'Review investigation ':'Investigation ')+(s.index+1)+' of '+s.items.length),
   practiceGuide('reason'));
  const panel=element('section',{className:'exam-workspace reason-workspace','data-reason-id':q.id,'aria-labelledby':'exam-heading'});
  panel.append(div('reason-workspace-head',div('',span('eyebrow',s.reviewMode?'QUESTION · UNSCORED EXPLANATION REVIEW':'QUESTION · MATHEMATICAL REASONING'),
    heading(2,'exam-heading','Investigate. Justify. Evaluate.',{id:'exam-heading',tabindex:'-1'})),
    span('reason-level',q.level==='foundation'?'Build confidence':q.level==='develop'?'Develop reasoning':'Stretch & critique')),
    evidenceView(q));
  if(!s.answered)panel.append(pathPicker(s),s.track==='guided'?guidedStage(s,q):independentStage(s));
  else panel.append(modelReview(s,q));
  root.append(panel);
  return root;
 }
 function summaryView(){
  const s=state();
  return div('reason-round-summary',
   div('reason-summary-grid',
    div('reason-summary-stat',span('reason-summary-number',n(s.guidedCases)),span('','Guided cases')),
    div('reason-summary-stat',span('reason-summary-number',n(s.writtenCases)),span('','Independent responses')),
    div('reason-summary-stat',span('reason-summary-number',s.guidedCases?n(s.matchedPoints)+' / '+n(s.guidedCases*4):'—',span('','Model choices aligned'))),
   paragraph('reason-summary-explainer','Multiple-choice alignment is not an exam grade. Your written reasoning remains unmarked, and model review does not award mastery.'),
   ...(s.reviewMode?[paragraph('reason-summary-explainer','This revisit was unscored; your original progress has not changed.')]:[]),
   ...(!s.reviewMode&&s.reviewTargets.length?[action('Review '+s.reviewTargets.length+' flagged investigation'+(s.reviewTargets.length===1?'':'s')+' →','reason-review',{},'btn btn-quiet')]:[]));
 }
 function handle(command,button){
  const s=state();
  if(command==='reason-review'&&s.complete&&!s.reviewMode&&s.reviewTargets.length){
   const {data}=getState();
   const items=s.reviewTargets.map(id=>data.reasoning.find(item=>item.id===id)).filter(Boolean);
   setSession(createReasonRound(items,{reviewMode:true,track:s.track}));
   render('#exam-heading');announce('Unscored reasoning review ready.');return;
  }
  if(s.complete||!command.startsWith('reason-'))return;
  if(command==='reason-track'&&!s.answered){
   const next=button.dataset.track;
   if(!['guided','independent'].includes(next))return;
   s.track=next;
   render('[data-action="reason-track"][aria-pressed="true"]');
   announce(next==='guided'?'Guided reasoning builder selected.':'Independent writing selected.');
   return;
  }
  if(s.answered){
   if(command==='reason-flag'){
    s.flagReview=!s.flagReview;render('[data-action="reason-flag"]');announce(s.flagReview?'Flagged for review.':'Review flag cleared.');return;
   }
   if(command==='reason-next'){
    const q=question();
    if(!s.reviewMode&&shouldReviewReason(q,s.track,s.selections,s.selfChecks,s.flagReview)&&!s.reviewTargets.includes(q.id))s.reviewTargets.push(q.id);
    if(s.index===s.items.length-1){finishRound();return;}
    s.index++;s.answered=false;s.stage=0;s.selections={};s.draft='';s.selfChecks={};s.flagReview=false;
    render('#exam-heading');announce('Next investigation ready.');return;
   }
   return;
  }
  if(command==='reason-jump'&&s.track==='guided'){
   const step=Number(button.dataset.step);
   if(Number.isInteger(step)&&step>=0&&step<=s.stage&&step<=4){
    s.stage=step;render('#reason-stage-heading');
   }
   return;
  }
  if(command==='reason-forward'&&s.track==='guided'&&s.stage<4){
   const part=REASON_DIMENSIONS[s.stage].key;
   if(s.selections[part]===undefined)return;
   s.stage++;render('#reason-stage-heading');announce('Next reasoning decision.');return;
  }
  if(command==='reason-back'&&s.track==='guided'&&s.stage>0){
   s.stage--;render('#reason-stage-heading');return;
  }
  if(command==='reason-check'){
   const guided=s.track==='guided';
   if(guided&&(s.stage!==4||dimensions.some(key=>s.selections[key]===undefined)))return;
   if(!guided&&!s.draft.trim())return;
   const q=question();
   s.answered=true;
   if(guided){
    const result=reasonDiagnosis(q,s.selections);
    s.guidedCases++;s.matchedPoints+=result.met.length;
    if(result.complete)s.correct++;
   }else s.writtenCases++;
   // As before, selections and self-reflections are not independent mastery evidence.
   // Never write any progress during an unscored revisit.
   if(!s.reviewMode){
    const {data}=getState();
    remember(conceptIdForSubject(q.answers.method,data.methods),false);
   }
   render('.reason-feedback-start');
   announce(guided?'Guided answers reviewed; your writing is not graded.':'Model available for self-review.');return;
  }
 }
 function onChange(target){
  const s=state();
  if(!s||s.complete)return false;
  if(!s.answered&&target.matches('input[data-reason-field]')){
   if(s.track!=='guided'||s.stage>3)return false;
   const key=target.dataset.reasonField;
   if(key!==REASON_DIMENSIONS[s.stage].key)return false;
   s.selections[key]=target.value;
   render('input[name="reason-'+key+'"]:checked');
   return true;
  }
  if(s.answered&&target.matches('input[data-reason-self]')){
   const key=target.dataset.reasonSelf;
   if(!dimensions.includes(key))return false;
   s.selfChecks[key]=target.checked;
   const count=dimensions.filter(name=>s.selfChecks[name]).length;
   const node=document.getElementById('reason-self-count');
   if(node)node.textContent=count+' of 4 writing points you recognised in your own answer';
   return true;
  }
  return false;
 }
 function onInput(target){
  const s=state();
  if(!s||s.complete||s.answered||target.id!=='reason-written')return false;
  s.draft=target.value.slice(0,2000);
  const button=document.querySelector('[data-action="reason-check"]');
  if(button&&s.track==='independent')button.disabled=!s.draft.trim();
  return true;
 }
 return {view,handle,onChange,onInput,summaryView};
}
