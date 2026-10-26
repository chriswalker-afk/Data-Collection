// Pass 7 student-facing journey and opt-in classroom trial feedback.
// No network requests, analytics, account creation or feedback persistence.
import {GAMES,hashFor} from './core.js';
import {routesForTopic,recommendActivity,TRIAL_CHOICES,makeClassroomFeedback} from './journey.js';

export function createExperienceUI(deps){
 const {element,div,span,paragraph,heading,action,link,announce}=deps;
 let feedbackOpen=false;
 const state=()=>deps.getState();
 function journeyView(){
  const {progress,data,topic,examStore}=state();
  const suggestion=recommendActivity(progress,data.concepts,topic,
    topic==='data'?0:examStore.reviewIds.length);
  const next=GAMES.find(g=>g.id===suggestion.game);
  const section=element('section',{className:'section learning-journey','aria-labelledby':'journey-title'});
  section.append(
    div('section-top',
      div('',span('eyebrow','A ROUTE THROUGH REVISION'),
        heading(2,'section-title','Not sure where to begin?',{id:'journey-title'})),
      paragraph('section-note','Choose a goal. You can change activities at any point.')),
    div('journey-suggestion',
      div('',span('eyebrow','SUGGESTED FOR THIS DEVICE'),
        heading(3,'journey-suggestion-title',suggestion.label),
        paragraph('journey-suggestion-text',suggestion.reason)),
      link('Open '+next.title,hashFor(suggestion.game,topic),'btn btn-primary journey-action'))
  );
  const steps=element('ol',{className:'journey-steps'});
  for(const [i,goal] of routesForTopic(topic).entries()){
   const step=element('li',{className:'journey-step'});
   const a=link('',hashFor(goal.game,topic),'journey-step-link');
   a.append(span('journey-step-number',String(i+1)),
     div('',heading(3,'journey-step-title',goal.label),
       paragraph('journey-step-detail',goal.detail)),
     span('journey-step-cta',GAMES.find(g=>g.id===goal.game).title+' →'));
   step.append(a);steps.append(step);
  }
  section.append(steps);
  return section;
 }
 function feedbackView(){
  const details=element('details',{className:'classroom-feedback',id:'classroom-feedback',open:feedbackOpen?true:null});
  details.append(element('summary',{id:'classroom-feedback-summary'},
    span('classroom-feedback-label','Help improve the activities'),
    span('classroom-feedback-action','Share quick classroom feedback')));
  const content=div('classroom-feedback-content',
    paragraph('','After trying an activity, answer a few questions. Nothing is sent automatically. A text file downloads only when you choose, and you decide whether to share it with your teacher.'),
    paragraph('classroom-feedback-privacy','Please do not include names, student numbers or other personal details.'));
  const form=element('form',{'data-form':'trial-feedback',className:'classroom-feedback-form'});
  const select=element('select',{name:'activity',id:'trial-activity',required:true});
  select.append(element('option',{value:'',disabled:true,selected:true},'Choose an activity'));
  for(const game of GAMES)select.append(element('option',{value:game.id},game.title));
  select.append(element('option',{value:'general'},'The website overall'),
    element('option',{value:'not-sure'},'Not sure'));
  form.append(div('classroom-feedback-activity',
    element('label',{for:'trial-activity'},'Which activity did you try?'),select));
  const prompts={
   clarity:'Were the instructions easy to understand?',
   challenge:'How challenging did the activity feel?',
   feedback:'Did the feedback help you work out what to do next?'
  };
  for(const [key,choices] of Object.entries(TRIAL_CHOICES)){
   const fieldset=element('fieldset',{className:'classroom-feedback-question'});
   fieldset.append(element('legend',{},prompts[key]));
   const options=div('classroom-feedback-options');
   for(const choice of choices)options.append(element('label',{className:'classroom-feedback-choice'},
     element('input',{type:'radio',name:key,value:choice,required:true}),span('',choice)));
   fieldset.append(options);form.append(fieldset);
  }
  form.append(element('label',{for:'trial-comment',className:'classroom-feedback-comment-label'},
     'One change that would help you learn (optional)'),
    element('textarea',{id:'trial-comment',name:'comment',rows:'3',maxlength:'350',
     placeholder:'For example, a question or instruction that was confusing.'}),
    div('classroom-feedback-actions',
     element('button',{type:'submit',className:'btn btn-primary'},'Download feedback file'),
     paragraph('classroom-feedback-note','Only share it if you want to.')),
    element('p',{'data-feedback-status':'',className:'classroom-feedback-result',role:'status','aria-live':'polite'}));
  content.append(form);details.append(content);
  return element('section',{className:'section classroom-feedback-section','aria-label':'Classroom trial feedback'},details);
 }
 function submitFeedback(form){
  const status=form.querySelector('[data-feedback-status]');
  try{
   const message=makeClassroomFeedback(Object.fromEntries(new FormData(form)));
   const url=URL.createObjectURL(new Blob([message],{type:'text/plain;charset=utf-8'}));
   const a=document.createElement('a');a.href=url;a.download='sampling-arcade-classroom-feedback.txt';
   document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
   if(status)status.textContent='Your file is downloaded. Share it with your teacher only if you choose to.';
   announce('Feedback file downloaded to this device.');
  }catch(error){
   if(status)status.textContent=error.message||'Complete the questions before downloading.';
  }
 }
 function openFeedback(){
  feedbackOpen=true;
  const {topic,mode}=state();
  if(mode!=='home')window.location.hash=hashFor('home',topic);
  else deps.render('#classroom-feedback-summary');
 }
 function isFeedbackOpen(){return feedbackOpen;}
 return {journeyView,feedbackView,submitFeedback,openFeedback,isFeedbackOpen};
}
