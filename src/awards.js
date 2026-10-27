// Pass 3: a separate, versioned, local-only award ledger.
// Every verified event is emitted only after the corresponding game has checked it.
// Flashcard confidence and independent writing are labelled as practice, not marks.
export const AWARDS_KEY = 'sampling-arcade-awards-v1';
export const AWARD_METHODS = Object.freeze(['simple-random','systematic','stratified','quota','opportunity']);
const METHOD_AWARDS = Object.freeze([
  ['random-raccoon','Random Raccoon','🦝','simple-random'],
  ['systematic-squirrel','Systematic Squirrel','🐿️','systematic'],
  ['stratified-stoat','Stratified Stoat','🦡','stratified'],
  ['quota-quokka','Quota Quokka','🐨','quota'],
  ['opportunity-otter','Opportunity Otter','🦦','opportunity']
]);
const defs = [
  {id:'sampling-fox',name:'The Sampling Fox',emoji:'🦊',level:'verified',group:'Sampling detectives',
    description:'Recognise every sampling method accurately in at least two different scenarios each.',
    hint:'Identify two different scenarios correctly for every one of the five methods.'},
  ...METHOD_AWARDS.map(([id,name,emoji,method])=>({
    id,name,emoji,method,level:'verified',group:'Sampling detectives',
    description:'Recognise three different '+({
      'simple-random':'simple random','systematic':'systematic','stratified':'stratified',
      quota:'quota',opportunity:'opportunity'
    })[method]+' sampling scenarios without help.',
    hint:'Answer three different Which Method? scenarios correctly.'
  })),
  {id:'bias-buster',name:'Bias Buster',emoji:'🦸',level:'verified',group:'Reasoning & repair',
    description:'Complete three different three-part error diagnoses correctly on the first check.',
    hint:'Find the flawed step, its repair and its consequence in three Spot the Error cases.'},
  {id:'precision-penguin',name:'Precision Penguin',emoji:'🐧',level:'verified',group:'Recall specialists',
    description:'Achieve a perfect ten-out-of-ten untimed Speed Recall round.',
    hint:'Type ten correct terms in one full untimed round, without skips or review mode.'},
  {id:'recall-raven',name:'Recall Raven',emoji:'🐦‍⬛',level:'verified',group:'Recall specialists',
    description:'Correctly retrieve 20 different terms by typing from memory.',
    hint:'Type the correct answer for 20 distinct Speed Recall concepts.'},
  {id:'flashcard-firefly',name:'Flashcard Firefly',emoji:'✨',level:'self-rated',group:'Practice & reflection',
    description:'Self-rate confident recall on ten different flashcards.',
    hint:'Reveal and self-rate “Know it” on ten different cards. This is self-reported confidence, not verified accuracy.'},
  {id:'match-mongoose',name:'Match-Up Mongoose',emoji:'🦦',level:'verified',group:'Pattern masters',
    description:'Complete a Match Up round with every pair correct at the first attempt.',
    hint:'Match at least five pairs without an incorrect pairing.'},
  {id:'word-weasel',name:'Word Weasel',emoji:'🦫',level:'verified',group:'Recall specialists',
    description:'Complete an independent Missing Words round with every typed answer correct.',
    hint:'Use Type from memory and get at least eight answers right with no hints.'},
  {id:'sorting-salamander',name:'Sorting Salamander',emoji:'🦎',level:'verified',group:'Pattern masters',
    description:'Place every statement correctly on the very first full-board Sort It! check.',
    hint:'Make at least eight accurate placements before your first check.'},
  {id:'procedure-panda',name:'Procedure Panda',emoji:'🐼',level:'verified',group:'Reasoning & repair',
    description:'Build all five sampling procedures correctly on their first checks.',
    hint:'Arrange all five Build the Method procedures correctly without revealing a model.'},
  {id:'calculation-capybara',name:'Calculation Capybara',emoji:'🦫',level:'verified',group:'Reasoning & repair',
    description:'Solve three different numerical Exam Lab questions completely without hints.',
    hint:'Earn full automatic numerical credit on three different questions. Written self-reviews do not count.'},
  {id:'reasoning-robin',name:'Reasoning Robin',emoji:'🐦',level:'self-rated',group:'Practice & reflection',
    description:'Write and review three substantial independent explanations in different cases.',
    hint:'Draft at least 120 characters of your own reasoning in each of three different cases. This rewards writing effort, not mathematical correctness.'},
  {id:'curious-cat',name:'Curious Cat',emoji:'🐈',level:'verified',group:'Sampling detectives',
    description:'Identify your first sampling method correctly without help.',
    hint:'Answer one Which Method? scenario correctly on its first attempt.'},
  {id:'method-mouse',name:'Method Mouse',emoji:'🐭',level:'verified',group:'Sampling detectives',
    description:'Recognise all five sampling methods in at least one distinct scenario each.',
    hint:'Make one verified identification for each of the five sampling methods.'},
  {id:'scenario-seal',name:'Scenario Seal',emoji:'🦭',level:'verified',group:'Sampling detectives',
    description:'Correctly identify sampling methods in 15 different scenarios.',
    hint:'Build up 15 unique, first-attempt, unassisted Which Method? identifications.'},
  {id:'vocabulary-viper',name:'Vocabulary Viper',emoji:'🐍',level:'verified',group:'Recall specialists',
    description:'Type five different mathematical terms correctly from memory.',
    hint:'Retrieve five distinct terms in Speed Recall without hints or review mode.'},
  {id:'flashcard-fawn',name:'Flashcard Fawn',emoji:'🦌',level:'self-rated',group:'Practice & reflection',
    description:'Self-rate confident recall on five different flashcards.',
    hint:'Reveal and rate Know it on five distinct cards. This is confidence, not checked accuracy.'},
  {id:'error-eagle',name:'Error Eagle',emoji:'🦅',level:'verified',group:'Reasoning & repair',
    description:'Diagnose six different three-part sampling errors correctly on the first check.',
    hint:'Identify the flaw, repair and consequence across six distinct Spot the Error cases.'},
  {id:'number-narwhal',name:'Number Narwhal',emoji:'🐋',level:'verified',group:'Reasoning & repair',
    description:'Solve six different numerical Exam Lab questions for full automatic credit.',
    hint:'Earn full checked numerical credit in six unique questions, without hints or model reveals.'},
  {id:'arcade-alpaca',name:'Arcade Alpaca',emoji:'🦙',level:'verified',group:'Pattern masters',
    description:'Complete perfect, unassisted rounds in three different recall or procedure games.',
    hint:'Earn qualifying full rounds in any three of Match Up, Sort It!, Missing Words, Speed Recall and Build the Method.'},
  {id:'pentathlon-peacock',name:'Pentathlon Peacock',emoji:'🦚',level:'verified',group:'Pattern masters',
    description:'Master all five kinds of qualifying perfect rounds.',
    hint:'Earn a full, eligible round in Match Up, Sort It!, Missing Words, Speed Recall and Build the Method.'},
  {id:'reflection-rabbit',name:'Reflection Rabbit',emoji:'🐇',level:'self-rated',group:'Practice & reflection',
    description:'Write five substantial, independent explanations in different reasoning cases.',
    hint:'Write at least 120 characters independently in five different cases. Writing effort is not auto-graded.'}
];
export const AWARDS = Object.freeze(defs.map(d=>Object.freeze(d)));
export const AWARD_GROUPS = Object.freeze([...new Set(AWARDS.map(a=>a.group))]);
const LIST_FIELDS = Object.freeze(['flashcards','match','cloze','sort','speed','build','error','exam','reason','rounds']);
const KEY = /^[a-z0-9-]{1,80}$/;
const isObject = x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const cleanId = x=>typeof x==='string'&&KEY.test(x);
const unique = (input, allowed)=>Array.isArray(input)?
  [...new Set(input.filter(x=>cleanId(x)&&(!allowed||allowed.includes(x))))].slice(0,250):[];
const dateValue = x=>typeof x==='string'&&x.length<=35&&!Number.isNaN(Date.parse(x))?
  new Date(x).toISOString():null;
export function emptyAwards(){
  return {version:1,evidence:{identify:{},...Object.fromEntries(LIST_FIELDS.map(field=>[field,[]]))},unlocked:{}};
}
function evidenceProgress(state,award){
  const e=state.evidence, n=field=>(e[field]||[]).length;
  const countFor=method=>Object.values(e.identify).filter(x=>x===method).length;
  if(award.id==='sampling-fox')return [AWARD_METHODS.filter(m=>countFor(m)>=2).length,5];
  if(award.id==='curious-cat')return [Math.min(1,Object.keys(e.identify).length),1];
  if(award.id==='method-mouse')return [AWARD_METHODS.filter(m=>countFor(m)>=1).length,5];
  if(award.id==='scenario-seal')return [Math.min(15,Object.keys(e.identify).length),15];
  if(award.method)return [Math.min(3,countFor(award.method)),3];
  const rules={
    'bias-buster':[Math.min(3,n('error')),3],
    'precision-penguin':[Number(e.rounds.includes('speed')),1],
    'recall-raven':[Math.min(20,n('speed')),20],
    'flashcard-firefly':[Math.min(10,n('flashcards')),10],
    'match-mongoose':[Number(e.rounds.includes('match')),1],
    'word-weasel':[Number(e.rounds.includes('cloze')),1],
    'sorting-salamander':[Number(e.rounds.includes('sort')),1],
    'procedure-panda':[Number(e.rounds.includes('build')),1],
    'calculation-capybara':[Math.min(3,n('exam')),3],
    'reasoning-robin':[Math.min(3,n('reason')),3],
    'vocabulary-viper':[Math.min(5,n('speed')),5],
    'flashcard-fawn':[Math.min(5,n('flashcards')),5],
    'error-eagle':[Math.min(6,n('error')),6],
    'number-narwhal':[Math.min(6,n('exam')),6],
    'arcade-alpaca':[Math.min(3,n('rounds')),3],
    'pentathlon-peacock':[Math.min(5,n('rounds')),5],
    'reflection-rabbit':[Math.min(5,n('reason')),5]
  };
  return rules[award.id]||[0,1];
}
export function awardStatus(state,id){
  const award=AWARDS.find(x=>x.id===id);
  if(!award)return null;
  const [current,target]=evidenceProgress(sanitizeAwards(state),award);
  return {award,current,target,earned:current>=target,
    unlockedAt:state?.unlocked?.[id]??null};
}
export function sanitizeAwards(value,now=new Date().toISOString()){
  const out=emptyAwards();
  if(!isObject(value)||value.version!==1||!isObject(value.evidence))return out;
  const e=value.evidence;
  if(isObject(e.identify)){
    for(const [id,method] of Object.entries(e.identify).slice(0,100)){
      if(cleanId(id)&&AWARD_METHODS.includes(method))out.evidence.identify[id]=method;
    }
  }
  for(const field of LIST_FIELDS){
    out.evidence[field]=unique(e[field],field==='rounds'?['match','cloze','sort','speed','build']:null);
  }
  for(const award of AWARDS){
    const [current,target]=evidenceProgress(out,award);
    if(current<target)continue;
    const old=dateValue(value.unlocked?.[award.id]);
    out.unlocked[award.id]=old||now;
  }
  return out;
}
export function loadAwards(storage){
  try{
    const raw=(storage??globalThis.localStorage).getItem(AWARDS_KEY);
    return raw?sanitizeAwards(JSON.parse(raw)):emptyAwards();
  }catch{return emptyAwards();}
}
export function saveAwards(state,storage){
  try{
    (storage??globalThis.localStorage).setItem(AWARDS_KEY,JSON.stringify(sanitizeAwards(state)));
    return true;
  }catch{return false;}
}
export function clearAwards(storage){
  try{(storage??globalThis.localStorage).removeItem(AWARDS_KEY);return true;}
  catch{return false;}
}
function recordAnswer(e,event){
  if(event.correct!==true||event.review===true||event.assisted===true||!cleanId(event.id))return false;
  if(event.game==='identify'){
    if(!AWARD_METHODS.includes(event.method))return false;
    if(e.identify[event.id])return false;
    e.identify[event.id]=event.method;
    return true;
  }
  if(event.game==='flashcards'){
    if(event.selfRated!==true)return false;
    if(!e.flashcards.includes(event.id))e.flashcards.push(event.id);
    return true;
  }
  if(event.game==='reason')return false;
  const field=({match:'match',speed:'speed',cloze:'cloze',sort:'sort',build:'build',
    error:'error',exam:'exam'})[event.game];
  if(!field||event.verified!==true)return false;
  if(event.game==='cloze'&&event.level!=='independent')return false;
  if(!e[field].includes(event.id))e[field].push(event.id);
  return true;
}
function recordRound(e,event){
  if(event.review===true||event.verified!==true)return false;
  const {game,total,correct,attempted,mistakes}=event;
  const integer=x=>Number.isInteger(x)&&x>=0;
  if(!integer(total)||!integer(correct)||correct!==total)return false;
  let qualifies=false;
  if(game==='match')qualifies=total>=5&&mistakes===0&&attempted===total;
  if(game==='sort')qualifies=total>=8&&event.firstCheck===true;
  if(game==='cloze')qualifies=total>=8&&event.level==='independent';
  if(game==='build')qualifies=total===5&&event.firstCheck===true;
  if(game==='speed')qualifies=total===10&&attempted===10&&event.speedMode==='untimed';
  if(!qualifies)return false;
  if(!e.rounds.includes(game))e.rounds.push(game);
  return true;
}
function recordWriting(e,event){
  if(event.game!=='reason'||event.review===true||event.independent!==true||
     !cleanId(event.id)||!Number.isInteger(event.writtenLength)||event.writtenLength<120)return false;
  if(!e.reason.includes(event.id))e.reason.push(event.id);
  return true;
}
export function applyAwardEvent(value,event,now=new Date().toISOString()){
  const before=sanitizeAwards(value,now);
  if(!isObject(event))return {state:before,newlyUnlocked:[]};
  const state=sanitizeAwards(before,now);
  const changed=event.kind==='answer'?recordAnswer(state.evidence,event):
    event.kind==='round'?recordRound(state.evidence,event):
      event.kind==='writing'?recordWriting(state.evidence,event):false;
  if(!changed)return {state:before,newlyUnlocked:[]};
  const newlyUnlocked=[];
  for(const award of AWARDS){
    const [current,target]=evidenceProgress(state,award);
    if(current>=target&&!state.unlocked[award.id]){
      state.unlocked[award.id]=dateValue(now)||new Date().toISOString();
      newlyUnlocked.push(award);
    }
  }
  return {state,newlyUnlocked};
}
export function earnedAwards(state){
  const clean=sanitizeAwards(state);
  return AWARDS.filter(award=>Boolean(clean.unlocked[award.id]));
}
export function exportAwardBackup(value,now=new Date().toISOString()){
  return JSON.stringify({kind:'sampling-arcade-awards-backup',version:1,exportedAt:now,
    cabinet:sanitizeAwards(value,now)},null,2);
}
export function restoreAwardBackup(text,previous=emptyAwards()){
  if(typeof text!=='string'||text.length>100000)throw new Error('This awards file is too large or invalid.');
  let parsed;
  try{parsed=JSON.parse(text);}catch{throw new Error('The awards file is not valid JSON.');}
  if(!isObject(parsed)||parsed.kind!=='sampling-arcade-awards-backup'||
     parsed.version!==1||!isObject(parsed.cabinet)||parsed.cabinet.version!==1||
     !isObject(parsed.cabinet.evidence))throw new Error('This is not a supported Sampling Arcade awards backup.');
  const left=sanitizeAwards(previous),right=sanitizeAwards(parsed.cabinet);
  const combined=emptyAwards();
  combined.evidence.identify={...left.evidence.identify,...right.evidence.identify};
  for(const field of LIST_FIELDS)combined.evidence[field]=unique([
    ...left.evidence[field],...right.evidence[field]],field==='rounds'?['match','cloze','sort','speed','build']:null);
  for(const award of AWARDS){
    const first=[left.unlocked[award.id],right.unlocked[award.id]].filter(Boolean).sort()[0];
    if(first)combined.unlocked[award.id]=first;
  }
  return sanitizeAwards(combined);
}
