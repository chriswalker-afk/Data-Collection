// DOM-only rendering and interaction for Pass 5; math and persistence live in exam-sim.js.
import {PAPER_SIZES,PAPER_TYPES,PAPER_LEVELS,makePaper,makeReviewPaper,numericalKey,gradeNumbers,
 writtenChecklist,procedureModelSteps,paperEntry,changeReviewTargets,paperSummary,reportCsv} from './exam-sim.js';
import {METHOD_LABELS} from './phase2.js';

export function createExamSimulationUI(deps){
 let exportDrafts=false;
 let paperDifficulty='mixed';
 const {element,div,span,paragraph,heading,action,link,icon,activityTop,roundProgress}=deps;
 const get=()=>deps.getState();
 const currentQuestion=()=>{
   const {data,session}=get();
   return data.examQuestions.find(q=>q.id===session.questionIds[session.index]);
 };
 const ensureEntry=()=>{
   const {session}=get(),id=session.questionIds[session.index];
   if(!session.entries[id])session.entries[id]=paperEntry(session,id);
   return session.entries[id];
 };
 const persist=()=>deps.persist();
 const show=focus=>deps.render(focus);
 const numberTask=q=>q.type==='allocation'||q.type==='systematic';
 const nextGame=q=>q.type==='allocation'?'#/build/sampling':
   q.type==='systematic'?'#/build/sampling':
   q.type==='procedure'?'#/build/sampling':'#/reason/sampling';

 function launchView(){
  const {examState}=get(),saved=examState.paper;
  const page=div('page activity-page sim-page');page.append(activityTop('exam'));
  const hero=div('sim-landing',
   span('eyebrow','EXAM PRACTICE / SAMPLING'),
   heading(2,'sim-landing-title','Put it all together.'),
   paragraph('sim-lead','Mix proportional allocations, systematic sampling calculations, full procedures and method evaluation in one paper.'),
   paragraph('sim-honesty','Calculations are checked automatically. Written explanations are compared with a model and self-reviewed — not graded by a computer.'));
  const levels=element('fieldset',{className:'sim-level-picker'});
  levels.append(element('legend',{},'Choose your starting level'));
  const levelDescriptions=[
    ['confidence','Build confidence','Foundation and developing examples'],
    ['mixed','Mixed progression','All three levels, easier questions first'],
    ['stretch','Stretch','Developing and more demanding examples']
  ];
  for(const [value,labelText,description] of levelDescriptions){
    levels.append(element('label',{className:'sim-level-choice'},
      element('input',{type:'radio',name:'exam-difficulty',value,
        'data-sim-difficulty':'',checked:paperDifficulty===value}),
      element('span',{},element('strong',{},labelText),element('small',{},description))));
  }
  hero.append(levels);
  const choices=div('sim-paper-choices');
  for(const [variant,count] of Object.entries(PAPER_SIZES)){
   const descriptions={quick:'A focused four-question check.',standard:'Two questions from each skill area.',full:'Three questions from each skill area.'};
   const card=div('sim-choice',
     span('sim-choice-count',count+' QUESTIONS'),
     heading(3,'sim-choice-title',({quick:'Quick practice',standard:'Mixed paper',full:'Full challenge'})[variant]),
     paragraph('',descriptions[variant]),
     action('Start '+({quick:'quick practice',standard:'mixed paper',full:'full challenge'})[variant],'sim-start',
       {'data-variant':variant},'btn btn-primary'));
   choices.append(card);
  }
  hero.append(choices);
  const resume=div('sim-resume');
  if(saved){
   resume.append(heading(3,'sim-panel-heading',saved.complete?'Your last completed paper':'Your saved paper'),
     paragraph('',saved.complete?'Reopen your report or start a new paper.':
       'Continue from question '+(saved.index+1)+' of '+saved.questionIds.length+'. Written drafts and answers stay on this browser.'),
     div('sim-inline-actions',
       action(saved.complete?'View previous report':'Resume saved paper','sim-resume',{},'btn btn-quiet'),
       action('Clear this paper','sim-clear-paper',{},'text-button')));
  }else resume.append(heading(3,'sim-panel-heading','Your answers stay on this device'),
   paragraph('','Leaving a paper saves your place and any draft writing in this browser. Nothing is uploaded or submitted to a teacher.'));
  const targets=div('sim-target-panel',
   heading(3,'sim-panel-heading','Practise what needs work'),
   paragraph('',examState.reviewIds.length?examState.reviewIds.length+' practice target'+(examState.reviewIds.length===1?'':'s')+' saved from previous answers.':
     'Incorrect calculations and incomplete self-reviews will appear here automatically.'));
  if(examState.reviewIds.length){
   targets.append(div('sim-inline-actions',
    action('Practise saved targets','sim-review',{},'btn btn-primary'),
    action('Clear practice targets','sim-clear-targets',{},'text-button')));
   const tags=div('sim-target-tags');
   for(const id of examState.reviewIds.slice(0,5)){
    const q=get().data.examQuestions.find(x=>x.id===id);
    if(q)tags.append(span('sim-target-tag',q.title+' · '+q.level));
   }
   targets.append(tags);
  }
  page.append(hero,div('sim-landing-bottom',resume,targets));return page;
 }

 function hintsView(question,entry){
  const wrap=element('div',{className:'sim-hints',id:'sim-hints',tabindex:'-1','aria-live':'polite'});
  if(entry.hintsUsed){
   const list=element('ol',{className:'sim-hint-list'});
   question.hints.slice(0,entry.hintsUsed).forEach(hint=>list.append(element('li',{},hint)));
   wrap.append(heading(4,'sim-hint-heading','Help to get started'),list,
    paragraph('sim-help','Hints are useful practice, but a supported numerical answer will not count as independent mastery.'));
  }
  if(entry.hintsUsed<question.hints.length)
   wrap.append(action(entry.hintsUsed?'Show another hint':'I need a hint','sim-hint',{},'btn btn-quiet sim-hint-button'));
  return wrap;
 }
 function numberInputs(question,entry){
  const fields=numericalKey(question);
  const form=element('form',{'data-form':'sim-numeric',className:'sim-numeric-form'});
  if(question.type==='allocation'){
   const N=question.data.groups.reduce((a,g)=>a+g.size,0);
   form.append(paragraph('sim-data-line','Population: '+N+' · Required sample: '+question.data.sampleSize));
  }else{
   form.append(paragraph('sim-data-line','N = '+question.data.populationSize+' · n = '+question.data.sampleSize+
    ' · random start = '+question.data.randomStart));
  }
  const rows=div('sim-number-rows');
  for(const field of fields){
   const group=div('sim-number-row'),id='sim-field-'+field.id;
   const extra=question.type==='allocation'?'Population in group: '+field.population:'Enter a whole number.';
   const input=element('input',{id,name:field.id,type:'text',inputmode:'numeric',maxlength:'30',
    className:'sim-number-input','data-sim-num':field.id,value:entry.values[field.id]??'',
    autocomplete:'off',required:true,'aria-describedby':id+'-help'});
   group.append(element('label',{for:id,className:'sim-field-label'},field.label),
    paragraph('sim-field-help',extra),element('span',{id:id+'-help',className:'sr-only'},'Enter a nonnegative whole number'),
    input);
   rows.append(group);
  }
  form.append(rows,hintsView(question,entry),element('div',{className:'sim-validation','aria-live':'polite'}));
  form.append(div('sim-form-actions',
    element('button',{type:'submit',className:'btn btn-primary'},'Check calculations'),
    action('Reveal worked solution','sim-reveal',{},'btn btn-quiet')));
  return form;
 }
 function numericFeedback(question,entry){
  const marked=gradeNumbers(question,entry.values),wrap=div('sim-feedback');
  const assisted=marked.correct&&entry.hintsUsed>0;
  const overall=div('inline-feedback typed-feedback'+(marked.correct?' correct':' incorrect'),
    icon(marked.correct?'✓':'!'),
    div('',heading(3,'feedback-heading',assisted?'All calculations correct with support.':marked.correct?'All calculations correct.':
      'Compare each step with the worked solution.'),
      paragraph('',marked.correctParts+' of '+marked.totalParts+' numerical parts correct.'+(assisted?' You used a hint, so this remains a practice target.':''))));
  overall.setAttribute('tabindex','-1');wrap.append(overall);
  const list=element('ol',{className:'sim-worked-list'});
  for(const row of marked.fields){
   list.append(element('li',{className:'sim-worked-row'},
     span('sim-worked-status',row.correct?'✓ Correct':'↺ Review'),
     div('',heading(4,'sim-worked-title',row.label),
       paragraph('',row.working),paragraph('','Expected answer: '+row.expected+
         (row.supplied?' · Your answer: '+row.supplied:' · No answer entered')))));
  }
  wrap.append(heading(3,'sim-panel-heading','Worked calculation'),list,paragraph('sim-help',question.examAdvice),
    div('next-row',action('Continue →','sim-next',{},'btn btn-primary')));
  return wrap;
 }
 function writtenForm(q,entry){
  const area=element('textarea',{id:'sim-draft',rows:'7',maxlength:'2400',className:'sim-draft-input',
    placeholder:'State your method, apply it to the numbers or people in this question, then justify or evaluate it.'});
  area.value=entry.draft||'';
  return div('sim-written-work',
    element('label',{for:'sim-draft',className:'typed-label'},'Your written response'),
    paragraph('sim-help','Draft as you would in an examination. Your writing is saved locally so you can leave and resume this paper.'),
    area,hintsView(q,entry),div('sim-form-actions',
     action('Compare with model','sim-model',{},'btn btn-primary'),
     action('Reveal model without writing','sim-skip',{},'btn btn-quiet')));
 }
 function writtenReview(q,entry){
  const {data}=get(),wrap=div('sim-written-review');
  wrap.append(div('inline-feedback typed-feedback',icon('✓'),div('',
   heading(3,'feedback-heading','Self-review your explanation'),
   paragraph('','Compare your writing with this model, then tick only points genuinely covered. These ticks are not marks from Pearson or from an automated examiner.'))));
  wrap.querySelector('.typed-feedback')?.setAttribute('tabindex','-1');
  if(q.type==='procedure'){
   const method=data.methods.find(m=>m.id===q.methodId),steps=element('ol',{className:'sim-model-steps'});
   procedureModelSteps(q,data.methods).forEach(s=>steps.append(element('li',{},s.text)));
   wrap.append(heading(3,'sim-panel-heading','Model method: '+METHOD_LABELS[q.methodId]),steps,
     paragraph('sim-model-extra',q.focus),paragraph('sim-help',q.note),
     paragraph('sim-help','Important distinction: '+(q.warning||method.warning)));
   for(const cond of (q.modelSteps?[]:(method.conditionalProcedure||[]))){
    wrap.append(paragraph('sim-conditional','When '+cond.condition.charAt(0).toLowerCase()+cond.condition.slice(1)+': '+cond.text));
   }
  }else{
   wrap.append(heading(3,'sim-panel-heading','One defensible model answer'),paragraph('sim-model-text',q.model));
   const related=q.sourceEvaluationIds?.map(id=>data.evaluations.find(item=>item.id===id)).filter(Boolean)||[];
   if(related.length)wrap.append(paragraph('sim-related','Related audited principles: '+
     related.map(e=>e.claim).join(' · ')));
  }
  if(entry.draft)wrap.append(div('sim-draft-compare',
    heading(4,'sim-panel-heading','Your answer'),paragraph('sim-preserved-text',entry.draft)));
  const check=element('fieldset',{className:'sim-checklist'});
  check.append(element('legend',{},'Which important ideas did you include?'));
  for(const p of writtenChecklist(q,data.methods)){
   const input=element('input',{type:'checkbox','data-sim-point':p.id,
     checked:entry.included.includes(p.id)});
   check.append(element('label',{className:'sim-check-row'},input,span('',p.text)));
  }
  check.append(element('label',{className:'sim-check-row sim-flag'},
    element('input',{type:'checkbox','data-sim-flag':'',checked:entry.flag}),
    span('','Flag this question for more practice, even if I covered every point.')));
  wrap.append(check,
   element('p',{id:'sim-check-count',className:'sim-check-count','aria-live':'polite'},
    entry.included.length+' of '+writtenChecklist(q,data.methods).length+' ideas ticked (self-review, not a mark).'),
   paragraph('sim-help','Unticked points and hints add practice targets. Writing is never automatically credited as mastered.'),
    div('next-row',action('Save self-review and continue →','sim-next',{},'btn btn-primary')));
  return wrap;
 }
 function questionView(){
  const {data,session}=get();const q=currentQuestion(),entry=ensureEntry();
  const page=div('page activity-page sim-page');page.append(activityTop('exam'));
  page.append(div('round-controls',roundProgress(session.index+1,session.questionIds.length,
    'Question '+(session.index+1)+' of '+session.questionIds.length),
    span('quiet-tag',numberTask(q)?'Numerical · auto-checked':'Written · self-reviewed')));
  const workspace=element('section',{className:'sim-question','data-sim-question':q.id});
  workspace.append(span('eyebrow',(q.type==='allocation'?'STRATIFIED ALLOCATION':
     q.type==='systematic'?'SYSTEMATIC SAMPLING':q.type==='procedure'?'EXPLAIN THE METHOD':'EVALUATE THE METHOD')+
     ' / '+q.level.toUpperCase()),
   heading(2,'sim-question-title',q.title,{id:'sim-question-heading',tabindex:'-1'}),
   paragraph('sim-context',q.context),paragraph('sim-task',q.task));
  if(numberTask(q))workspace.append(entry.stage==='answer'?numberInputs(q,entry):numericFeedback(q,entry));
  else workspace.append(entry.stage==='answer'?writtenForm(q,entry):writtenReview(q,entry));
  page.append(workspace,
    div('sim-paper-bottom',paragraph('sim-help','Paper is saved on this browser. You can return later without losing your place.'),
    action('Back to paper choices','sim-menu',{},'text-button')));
  return page;
 }
 function reportView(){
  const {data,session,examState}=get(),stats=paperSummary(session,data.examQuestions,data.methods);
  const page=div('page activity-page sim-page sim-report');
  page.append(activityTop('exam'));
  const head=div('sim-report-head',
   span('eyebrow','YOUR PERSONAL PRACTICE REPORT'),
   heading(2,'completion-title','Paper complete',{tabindex:'-1'}),
   paragraph('sim-help','Formative practice, not an official Edexcel result. Your work stays on this device.'),
   paragraph('sim-help','Paper level: '+({confidence:'Build confidence',mixed:'Mixed progression',stretch:'Stretch'})[session.difficulty||'mixed']+'. Questions progress from easier to harder.'));
  const grid=div('sim-report-metrics',
    div('sim-metric',span('sim-metric-value',stats.correctParts+' / '+stats.possibleParts),
      span('sim-metric-label','Automatically checked numerical parts')),
    div('sim-metric',span('sim-metric-value',stats.covered+' / '+stats.totalChecklist),
      span('sim-metric-label','Written points you self-checked')),
    div('sim-metric',span('sim-metric-value',String(examState.reviewIds.length)),
      span('sim-metric-label','Saved practice targets')));
  head.append(grid);page.append(head);
  const section=element('section',{className:'sim-report-detail'});
  section.append(heading(3,'sim-panel-heading','Question-by-question record'));
  for(const row of stats.rows){
   const q=data.examQuestions.find(x=>x.id===row.id);
   const card=div('sim-report-row',
     div('sim-report-row-head',heading(4,'sim-report-question',q.title),
       span('quiet-tag',row.needsReview?'Review recommended':'Reviewed')),
     paragraph('',q.context),paragraph('sim-report-result',row.label));
   if(row.score){
    for(const field of row.score.fields)card.append(paragraph('sim-report-key',
      field.label+': '+(field.supplied||'(blank)')+' → '+field.expected+' ('+field.working+')'));
   }
   if(row.draft)card.append(paragraph('sim-preserved-text','Your writing: '+row.draft));
   if(row.hintsUsed)card.append(paragraph('sim-help','Hints used: try this question independently in a later practice paper.'));
   if(!numberTask(q))card.append(paragraph('sim-help','Written answer was self-reviewed, not automatically assessed.'));
   if(row.needsReview)card.append(link('Targeted revision: '+(q.type==='evaluation'?'Contextual Reasoning':'Build the Method'),
     nextGame(q),'sim-revision-link'));
   section.append(card);
  }
  page.append(section);
  const exportSettings=div('sim-export-settings',
   heading(3,'sim-panel-heading','Share a summary with your teacher'),
   paragraph('sim-help','Download a CSV report to share yourself. No student name or cloud upload. Written drafts are excluded unless you opt in; self-reviews are not examination marks.'),
   element('label',{className:'sim-export-choice'},
    element('input',{id:'sim-export-drafts',type:'checkbox',checked:exportDrafts}),
    span('','Include my written draft answers in the CSV (optional)')));
  page.append(exportSettings,div('sim-report-actions',
    action('Print this report','sim-print',{},'btn btn-primary'),
    action('Export CSV report','sim-export',{},'btn btn-quiet'),
    action('Back to paper choices','sim-menu',{},'btn btn-quiet'),
    ...(examState.reviewIds.length?[action('Practise saved targets','sim-review',{},'btn btn-quiet')]:[])));
  return page;
 }
 function view(){
  const {session}=get();
  if(session?.ready)return launchView();
  if(session?.complete)return reportView();
  return questionView();
 }
 function begin(variant){
  const {data,examState}=get();let paper;
  if(variant==='review'){
   if(!examState.reviewIds.length)return;
   paper=makeReviewPaper(data.examQuestions,examState.reviewIds);
  }else paper=makePaper(data.examQuestions,variant,Math.random,paperDifficulty);
  if(examState.paper&&!examState.paper.complete&&!window.confirm(
    'Replace your unfinished paper? Saved draft writing in that paper will be cleared.'))return;
  exportDrafts=false;deps.beginPaper(paper);persist();show('#sim-question-heading');deps.announce('Paper started.');
 }
 function submit(form){
  const {session,examState}=get(),q=currentQuestion(),entry=ensureEntry();
  if(session?.ready||session?.complete||!numberTask(q)||entry.stage!=='answer')return;
  for(const input of form.querySelectorAll('input[data-sim-num]'))entry.values[input.dataset.simNum]=input.value;
  const result=gradeNumbers(q,entry.values);
  if(!result.valid){
   const missing=result.fields.find(x=>!x.valid);
   const input=form.querySelector('[data-sim-num="'+missing.id+'"]');
   const error=form.querySelector('.sim-validation');
   error.textContent='Enter a nonnegative whole number for '+missing.label+'.';
   error.setAttribute('role','alert');input?.focus();return;
  }
  entry.stage='feedback';
  const independent=result.correct&&entry.hintsUsed===0;
  examState.reviewIds=changeReviewTargets(examState.reviewIds,q.id,!independent);
  deps.recordNumerical(q.conceptId,independent);
  persist();show('.sim-feedback .typed-feedback');
  deps.announce(result.correct?(independent?'Calculations correct.':'Correct with hints; practise independently next.'):'Worked solutions are available.');
 }
 function handle(command,button){
  if(command==='sim-start'){begin(button.dataset.variant);return;}
  if(command==='sim-review'){begin('review');return;}
  if(command==='sim-resume'){
   const paper=get().examState.paper;if(!paper)return;
   deps.beginPaper(paper);show(paper.complete?'.completion-title':'#sim-question-heading');return;
  }
  if(command==='sim-clear-paper'){
   if(!window.confirm('Clear your saved paper and its draft writing? Your practice targets will remain.'))return;
   get().examState.paper=null;persist();deps.beginReady();show('#view-heading');return;
  }
  if(command==='sim-clear-targets'){
   if(!window.confirm('Clear every saved exam-practice target on this browser?'))return;
   get().examState.reviewIds=[];persist();show('#view-heading');return;
  }
  if(command==='sim-menu'){exportDrafts=false;deps.beginReady();show('#view-heading');return;}
  if(command==='sim-print'){if(get().session?.complete)window.print();return;}
  if(command==='sim-export'&&get().session?.complete){
   const {session,data}=get();
   try{
    const csv='\uFEFF'+reportCsv(session,data.examQuestions,data.methods,{includeDrafts:exportDrafts});
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='sampling-arcade-exam-report.csv';
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
    deps.announce('CSV report downloaded to this device.');
   }catch(error){
    console.error('Exam report export failed:',error);
    deps.announce('Unable to export this report.');
   }
   return;
  }
  const {session,examState}=get();
  if(session?.ready||session?.complete)return;
  const q=currentQuestion(),entry=ensureEntry();
  if(command==='sim-hint'&&entry.stage==='answer'&&entry.hintsUsed<q.hints.length){
   entry.hintsUsed++;persist();show('#sim-hints');
   deps.announce('Hint '+entry.hintsUsed+' of '+q.hints.length+' shown.');return;
  }
  if(command==='sim-reveal'&&numberTask(q)&&entry.stage==='answer'){
   entry.stage='feedback';
   examState.reviewIds=changeReviewTargets(examState.reviewIds,q.id,true);
   deps.recordNumerical(q.conceptId,false);
   persist();show('.sim-feedback .typed-feedback');deps.announce('Worked solution revealed.');return;
  }
  if((command==='sim-model'||command==='sim-skip')&&!numberTask(q)&&entry.stage==='answer'){
   entry.draft=(document.getElementById('sim-draft')?.value||'').slice(0,2400);
   if(command==='sim-model'&&!entry.draft.trim()){
    const area=document.getElementById('sim-draft');area?.focus();
    deps.announce('Write your answer first or choose reveal model.');return;
   }
   entry.stage='review';persist();show('.sim-written-review .typed-feedback');
   deps.announce('Compare your response with the model and self-review checklist.');return;
  }
  if(command==='sim-next'){
   if(numberTask(q)&&entry.stage!=='feedback')return;
   if(!numberTask(q)&&entry.stage!=='review')return;
   if(!numberTask(q)){
    const total=writtenChecklist(q,get().data.methods).length;
    const needsReview=entry.flag||entry.included.length<total||entry.hintsUsed>0;
    examState.reviewIds=changeReviewTargets(examState.reviewIds,q.id,needsReview);
   }
   entry.stage='done';
   if(session.index===session.questionIds.length-1){
    deps.finish();persist();return;
   }
   session.index++;persist();show('#sim-question-heading');
   deps.announce('Next examination question.');return;
  }
 }
 function onInput(input){
  const {session}=get();
  if(session?.ready||session?.complete||!session?.questionIds)return;
  const q=currentQuestion(),entry=ensureEntry();
  if(entry.stage!=='answer')return;
  if(input.id==='sim-draft'&&!numberTask(q))entry.draft=input.value.slice(0,2400);
  else if(input.matches('input[data-sim-num]')&&numberTask(q))entry.values[input.dataset.simNum]=input.value.slice(0,30);
  else return;
  persist();
 }
 function onChange(control){
  const {session}=get();
  if(control.matches('[data-sim-difficulty]')&&session?.ready){
   if(PAPER_LEVELS.includes(control.value))paperDifficulty=control.value;
   return;
  }
  if(control.matches('#sim-export-drafts')&&session?.complete){
   exportDrafts=control.checked;return;
  }
  if(session?.ready||session?.complete||!session?.questionIds)return;
  const q=currentQuestion(),entry=ensureEntry();
  if(numberTask(q)||entry.stage!=='review')return;
  if(control.matches('input[data-sim-point]')){
   const id=control.dataset.simPoint,allowed=writtenChecklist(q,get().data.methods).some(x=>x.id===id);
   if(!allowed)return;
   entry.included=control.checked?[...new Set([...entry.included,id])]:entry.included.filter(x=>x!==id);
  }else if(control.matches('input[data-sim-flag]'))entry.flag=control.checked;
  else return;
  if(control.matches('input[data-sim-point]')){
   const counter=document.getElementById('sim-check-count');
   if(counter)counter.textContent=entry.included.length+' of '+writtenChecklist(q,get().data.methods).length+' ideas ticked (self-review, not a mark).';
  }
  persist();
 }
 return {view,handle,submit,onInput,onChange};
}
