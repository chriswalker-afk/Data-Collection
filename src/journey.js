// Pass 7: a transparent revision route, not a predictive grade or exam mark.
import {GAMES,conceptsInTopic} from './core.js';
import {progressForTopic} from './progress.js';

const GOALS=Object.freeze({
 sampling:[
  {id:'understand',label:'Understand the language',detail:'Review key definitions and the meaning of population, sample and frame.',game:'flashcards'},
  {id:'remember',label:'Retrieve without prompts',detail:'Move from recognising terms towards recalling them.',game:'cloze'},
  {id:'apply',label:'Choose and critique methods',detail:'Recognise sampling methods in context before explaining them.',game:'identify'},
  {id:'explain',label:'Write exam responses',detail:'Combine calculations, procedures and evaluation in a mixed paper.',game:'exam'}
 ],
 data:[
  {id:'understand',label:'Understand the language',detail:'Build accurate definitions of data and variables.',game:'flashcards'},
  {id:'connect',label:'Connect terms and meanings',detail:'Match data terminology to its definition.',game:'match'},
  {id:'retrieve',label:'Retrieve without prompts',detail:'Progress through missing-word practice.',game:'cloze'},
  {id:'check',label:'Check independent recall',detail:'Type definitions without relying on multiple-choice clues.',game:'speed'}
 ]
});
export function routesForTopic(topic){
 const key=topic==='sampling'?'sampling':'data';
 return GOALS[key].map(item=>({...item}));
}
function choose(game,label,reason){
 if(!GAMES.some(item=>item.id===game))throw new Error('Unknown activity '+game);
 return {game,label,reason};
}
export function recommendActivity(progress,concepts,topic,reviewCount=0){
 const scope=topic==='data'?'data':topic==='all'?'all':'sampling';
 const stats=progressForTopic(progress,concepts,scope);
 // Only actual saved exam targets justify a direct review recommendation.
 if(scope==='sampling'&&reviewCount>0)
  return choose('exam','Review your saved exam questions',
    reviewCount+' question'+(reviewCount===1?' needs':'s need')+' another attempt. Exam Lab has a targeted review option.');
 if(!stats.practiced)
  return choose('flashcards','Start with the key terms','No concepts in this topic have been practised on this device yet.');
 if(stats.practiced<Math.ceil(stats.total/2))
  return choose('match','Connect the terms','You have practised '+stats.practiced+' of '+stats.total+' terms; strengthen the connections.');
 if(stats.mastered<Math.ceil(stats.total/2))
  return choose('cloze','Try retrieving without choices','You have explored many terms; now test whether you can recall the language.');
 if(scope!=='sampling')
  return choose('speed','Check recall from memory','Apply your vocabulary knowledge in typed retrieval, with a timer only if you wish.');
 if(stats.mastered<Math.ceil(stats.total*3/4))
  return choose('identify','Choose methods in context','Move beyond vocabulary and recognise the method appropriate to a scenario.');
 return choose('exam','Bring the skills together','Try explaining and evaluating methods alongside the sampling calculations.');
}
const FOLLOW_ON=Object.freeze({
 flashcards:{game:'match',label:'Connect terms and definitions',reason:'Match the key language before moving to more independent recall.'},
 match:{game:'cloze',label:'Recall the missing words',reason:'Switch from recognising pairs to retrieving precise mathematical terms.'},
 cloze:{game:'identify',label:'Apply the vocabulary',reason:'Recognise the sampling method in a realistic situation.'},
 sort:{game:'identify',label:'Identify methods in context',reason:'Apply the advantages and limitations you have just considered.'},
 identify:{game:'build',label:'Explain how a method works',reason:'Practise the precise steps needed for a complete procedure.'},
 speed:{game:'build',label:'Apply your recalled knowledge',reason:'Put the sampling procedure into a defensible order.'},
 build:{game:'error',label:'Diagnose a flawed procedure',reason:'Use your method knowledge to spot and correct common errors.'},
 error:{game:'reason',label:'Justify your method choice',reason:'Link the procedure to a context, limitation and improvement.'},
 reason:{game:'exam',label:'Combine the exam skills',reason:'Write and review full procedures and evaluations in Exam Lab.'}
});
export function nextAfterRound(game,topic){
 if(topic==='data'||topic==='all'){
  if(game==='cloze')return choose('speed','Try typing the term from memory','Retrieval without choices provides a useful independent check.');
  if(game==='speed')return choose('cloze','Revisit the difficult definitions','Use Missing Words to practise exact terminology again.');
 }
 const next=FOLLOW_ON[game];
 return next?choose(next.game,next.label,next.reason):choose('exam','Try a mixed exam paper','Apply your skills together in an exam-style task.');
}
export const TRIAL_CHOICES=Object.freeze({
 clarity:Object.freeze(['Clear','Partly clear','Unclear']),
 challenge:Object.freeze(['Too easy','About right','Too difficult']),
 feedback:Object.freeze(['Showed what to improve','Somewhat helpful','Did not show what to improve'])
});
export function makeClassroomFeedback(values){
 const input=values&&typeof values==='object'?values:{};
 const game=GAMES.find(g=>g.id===input.activity);
 if(!game&&!['not-sure','general'].includes(input.activity))throw new Error('Choose an activity.');
 for(const [key,allowed] of Object.entries(TRIAL_CHOICES)){
  if(!allowed.includes(input[key]))throw new Error('Choose a response for '+key+'.');
 }
 const comment=String(input.comment||'').trim().slice(0,350)
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
 return [
  'Sampling Arcade | student experience feedback',
  'Shared only if you choose to give this file to a teacher.',
  'Activity: '+(game?.title|| (input.activity==='general'?'Overall website':'Not sure')),
  'Instructions: '+input.clarity,
  'Challenge: '+input.challenge,
  'Feedback: '+input.feedback,
  'One change that would help: '+(comment||'(no suggestion)'),
  'No name, student ID, class or automatic submission is included.'
 ].join('\n')+'\n';
}
