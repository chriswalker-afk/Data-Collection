// Pass 1: versioned teacher-facing draft contract. No self-paced modes are sent
// to the Worker until their server-authoritative engines are implemented.
export const STUDIO_STORAGE_KEY = 'sampling-arcade-host-studio-v1';
export const OBJECTIVES = Object.freeze({
  classic: {label:'Classic Challenge',short:'Teacher-paced questions',availability:'live'},
  blitz: {label:'Blitz',short:'Most correct before the clock ends',availability:'live'},
  bullseye: {label:'Bullseye',short:'Reach a rolling accuracy target',availability:'live'},
  perfect: {label:'Perfect Run',short:'Build a consecutive-correct streak',availability:'live'},
  class: {label:'Class Quest',short:'A shared mathematical target',availability:'live'}
});
export const FORMATS = Object.freeze({
  individual:{label:'Free-for-All',description:'Everyone answers on their own screen.'},
  squad:{label:'Squad League',description:'Players answer individually and contribute to balanced teams.'},
  relay:{label:'Puzzle Relay',description:'Teammates receive different parts of a challenge (planned).'}
});
export const GAMES = Object.freeze({
  which:{label:'Which Method?',lengths:[5,10,20],unit:'questions',seconds:20},
  speed:{label:'Speed Recall',lengths:[5,10,20],unit:'definitions',seconds:25},
  match:{label:'Match Up',lengths:[1,2,3],unit:'boards',seconds:75},
  sort:{label:'Sort It!',lengths:[1,3,6,10],unit:'boards',seconds:90}
});
export const CLASS_METRICS = Object.freeze({
  accuracy:{label:'Accuracy Quest',description:'Reach a class accuracy target with enough participation.'},
  correct:{label:'Knowledge Quest',description:'Collect a class total of correct answers.'},
  mastery:{label:'Mastery Quest',description:'Show strong understanding across all five sampling methods.'},
  everyone:{label:'Everyone Counts',description:'A high proportion of players each make a useful contribution.'}
});
export const DEFAULT_DRAFT = Object.freeze({
  version:1,objective:'classic',format:'individual',preset:'balanced',
  game:'which',length:10,teamCount:2,goalTarget:0,
  minutes:5,accuracyTarget:80,accuracyWindow:10,streakTarget:5,
  classMetric:'accuracy',classAccuracy:80,classCorrect:150,
  classParticipation:80,classPerStudent:5,
  difficulty:'mixed',questionOrder:'varied',showLeaderboard:true
});
const includes = (values,value)=>values.includes(value);
export function cleanStudioDraft(raw) {
  const valid=raw&&typeof raw==='object'&&!Array.isArray(raw)&&raw.version===1?raw:{};
  const cleaned={...DEFAULT_DRAFT};
  for(const id of ['objective','format','game','preset','classMetric','difficulty','questionOrder']){
    if(typeof valid[id]==='string')cleaned[id]=valid[id];
  }
  for(const id of ['length','teamCount','goalTarget','minutes','accuracyTarget','accuracyWindow',
    'streakTarget','classAccuracy','classCorrect','classParticipation','classPerStudent']){
    if(Number.isInteger(valid[id]))cleaned[id]=valid[id];
  }
  if(typeof valid.showLeaderboard==='boolean')cleaned.showLeaderboard=valid.showLeaderboard;
  // Never restore malformed/outdated values as a live room configuration.
  if(!Object.hasOwn(OBJECTIVES,cleaned.objective))cleaned.objective='classic';
  if(!Object.hasOwn(FORMATS,cleaned.format))cleaned.format='individual';
  if(!Object.hasOwn(GAMES,cleaned.game))cleaned.game='which';
  if(!['quick','balanced','stretch'].includes(cleaned.preset))cleaned.preset='balanced';
  if(!Object.hasOwn(CLASS_METRICS,cleaned.classMetric))cleaned.classMetric='accuracy';
  if(!['core','mixed','advanced'].includes(cleaned.difficulty))cleaned.difficulty='mixed';
  if(!['varied','same'].includes(cleaned.questionOrder))cleaned.questionOrder='varied';
  if(!GAMES[cleaned.game].lengths.includes(cleaned.length))
    cleaned.length=GAMES[cleaned.game].lengths[Math.min(1,GAMES[cleaned.game].lengths.length-1)];
  for(const [id,min,max,step] of [
    ['teamCount',2,4,1],['minutes',1,15,1],['accuracyTarget',60,100,5],
    ['accuracyWindow',5,20,1],['streakTarget',3,20,1],
    ['classAccuracy',60,100,5],['classCorrect',20,300,5],
    ['classParticipation',50,100,5],['classPerStudent',1,10,1]]){
    if(cleaned[id]<min||cleaned[id]>max||(cleaned[id]-min)%step!==0)
      cleaned[id]=DEFAULT_DRAFT[id];
  }
  if(![0,70,80,90].includes(cleaned.goalTarget))cleaned.goalTarget=0;
  return cleaned;
}
export function presetStudioDraft(raw,preset='balanced',objective=raw?.objective||'classic') {
  const draft=cleanStudioDraft(raw);
  if(!includes(['quick','balanced','stretch'],preset)||!Object.hasOwn(OBJECTIVES,objective))
    throw new Error('Unknown challenge preset');
  const index=['quick','balanced','stretch'].indexOf(preset);
  const lengths=GAMES[draft.game].lengths;
  return {
    ...draft,objective,preset,
    length:lengths[Math.min(index,lengths.length-1)],
    minutes:[3,5,10][index],
    accuracyTarget:[70,80,90][index],
    accuracyWindow:[5,10,15][index],
    streakTarget:[3,5,10][index],
    classAccuracy:[75,80,90][index],
    classCorrect:[60,150,250][index],
    classParticipation:[70,80,90][index],
    classPerStudent:[3,5,8][index]
  };
}
const integerIn=(draft,key,min,max,step=1)=>Number.isInteger(draft[key]) &&
  draft[key]>=min&&draft[key]<=max&&(draft[key]-min)%step===0;
export function validateStudioDraft(draft) {
  const errors=[];
  if(!draft||typeof draft!=='object'||Array.isArray(draft)||draft.version!==1)
    return {valid:false,playable:false,errors:['Invalid studio draft version.']};
  if(!Object.hasOwn(OBJECTIVES,draft.objective))errors.push('Choose a recognised challenge objective.');
  if(!Object.hasOwn(FORMATS,draft.format))errors.push('Choose a recognised participation format.');
  if(!Object.hasOwn(GAMES,draft.game))errors.push('Choose a supported mathematical activity.');
  else if(!GAMES[draft.game].lengths.includes(draft.length))
    errors.push('Choose a valid round length for this activity.');
  if(!includes(['quick','balanced','stretch'],draft.preset))
    errors.push('Choose a recognised preset.');
  if(!integerIn(draft,'teamCount',2,4))errors.push('Choose 2, 3 or 4 balanced teams.');
  if(!includes([0,70,80,90],draft.goalTarget))
    errors.push('Choose an available classic class-goal target.');
  if(!integerIn(draft,'minutes',1,15))errors.push('Set a time between 1 and 15 minutes.');
  if(!integerIn(draft,'accuracyTarget',60,100,5))errors.push('Set a valid Bullseye percentage.');
  if(!integerIn(draft,'accuracyWindow',5,20))errors.push('Set a rolling window of 5–20 answers.');
  if(!integerIn(draft,'streakTarget',3,20))errors.push('Set a streak of 3–20 answers.');
  if(!Object.hasOwn(CLASS_METRICS,draft.classMetric))
    errors.push('Choose a recognised class metric.');
  if(!integerIn(draft,'classAccuracy',60,100,5))
    errors.push('Set a valid class accuracy percentage.');
  if(!integerIn(draft,'classCorrect',20,300,5))
    errors.push('Set a class goal between 20 and 300 answers, in steps of 5.');
  if(!integerIn(draft,'classParticipation',50,100,5))
    errors.push('Set class participation between 50% and 100%.');
  if(!integerIn(draft,'classPerStudent',1,10))
    errors.push('Set a per-student target between 1 and 10.');
  if(!includes(['core','mixed','advanced'],draft.difficulty))
    errors.push('Choose a recognised difficulty.');
  if(!includes(['varied','same'],draft.questionOrder))
    errors.push('Choose a recognised question distribution.');
  if(typeof draft.showLeaderboard!=='boolean')
    errors.push('Choose whether the leaderboard is visible.');
  const valid=errors.length===0;
  const paced=['blitz','bullseye','perfect','class'].includes(draft.objective);
  const playable=valid&&(draft.objective==='classic'||paced)&&draft.format!=='relay'&&
    (!paced||(draft.difficulty==='mixed'&&
      draft.questionOrder==='varied'&&draft.showLeaderboard===true));
  return {valid,playable,errors};
}
export function legacyRoomSettings(draft) {
  const check=validateStudioDraft(draft);
  if(!check.valid)throw new Error(check.errors[0]);
  if(!check.playable||draft.objective!=='classic')
    throw new Error('This challenge is not a Classic room.');
  return {game:draft.game,roundLength:draft.length,
    teamCount:draft.format==='squad'?draft.teamCount:0,goalTarget:draft.goalTarget};
}
export function liveRoomSettings(draft){
  const check=validateStudioDraft(draft);
  if(!check.valid)throw new Error(check.errors[0]);
  if(!check.playable)throw new Error(
    'This challenge is a preview or has planned settings not supported by this engine.');
  if(draft.objective==='classic')
    return {...legacyRoomSettings(draft),objective:'classic',minutes:0};
  return {
    game:draft.game,roundLength:draft.length,
    objective:draft.objective,minutes:draft.minutes,
    teamCount:draft.format==='squad'?draft.teamCount:0,
    goalTarget:0,
    ...(draft.objective==='bullseye'?{
      accuracyTarget:draft.accuracyTarget,accuracyWindow:draft.accuracyWindow
    }:{}),
    ...(draft.objective==='perfect'?{streakTarget:draft.streakTarget}:{}),
    ...(draft.objective==='class'?{
      classMetric:draft.classMetric,classAccuracy:draft.classAccuracy,
      classCorrect:draft.classCorrect,classParticipation:draft.classParticipation,
      classPerStudent:draft.classPerStudent
    }:{})
  };
}
export function describeStudioDraft(draft) {
  const check=validateStudioDraft(draft);
  if(!check.valid)return {title:'Check your settings',description:check.errors[0],availability:'Invalid settings',playable:false};
  const objective=OBJECTIVES[draft.objective].label,format=FORMATS[draft.format].label;
  const game=GAMES[draft.game].label;
  let outcome;
  switch(draft.objective){
    case 'classic':
      outcome=`${draft.length} ${GAMES[draft.game].unit}; ${GAMES[draft.game].seconds} seconds each, with teacher-led answer reveals.`;
      break;
    case 'blitz':
      outcome=`Answer as many questions as possible in ${draft.minutes} minutes; accuracy before speed.`;
      break;
    case 'bullseye':
      outcome=`First to reach ${draft.accuracyTarget}% accuracy over the most recent ${draft.accuracyWindow} fully marked tasks (after ${draft.accuracyWindow} tasks). Safety limit: ${draft.minutes} minutes.`;
      break;
    case 'perfect':
      outcome=`First to complete ${draft.streakTarget} fully correct tasks in a row; an incorrect or partially correct task resets the streak. Safety limit: ${draft.minutes} minutes.`;
      break;
    default:
      outcome=draft.classMetric==='accuracy'?
        `Aim for ${draft.classAccuracy}% mean student accuracy; at least ${draft.classParticipation}% must complete two checked tasks. Safety limit: ${draft.minutes} minutes.`:
        draft.classMetric==='correct'?
        `Collect ${draft.classCorrect} credited correct decisions (maximum 20 per student), with at least ${draft.classParticipation}% completing two checked tasks. Safety limit: ${draft.minutes} minutes.`:
        draft.classMetric==='mastery'?
        `Demonstrate all five sampling methods with two different students contributing correct evidence per method; at least ${draft.classParticipation}% must complete two tasks. Safety limit: ${draft.minutes} minutes.`:
        `At least ${draft.classParticipation}% of students each complete ${draft.classPerStudent} entirely correct tasks and at least two checked tasks. Safety limit: ${draft.minutes} minutes.`;
  }
  if(draft.objective==='class')outcome+=' At least three students are needed to start. Everybody shares the result.';
  if(draft.format==='squad')outcome+=` ${draft.teamCount} balanced teams.`;
  if(draft.format==='relay')outcome+=' Different parts of a task appear on teammates\' screens.';
  if(draft.objective==='classic'&&draft.goalTarget)
    outcome+=` Optional existing class goal: ${draft.goalTarget}% accuracy.`;
  const availability=check.playable?'Ready to host now':
    draft.format==='relay'?'Preview only — Puzzle Relay needs the distributed-question engine (Pass 5).':
    draft.objective==='blitz'?'Preview only — advanced modifiers require a later engine.':
    ['bullseye','perfect','blitz','class'].includes(draft.objective)?
      'Preview only — advanced difficulty and leaderboard modifiers require a later engine.':
      'Preview only — additional objectives require future engines.';
  return {title:`${objective} · ${format}`,description:`${game}. ${outcome}`,
    availability,playable:check.playable};
}
