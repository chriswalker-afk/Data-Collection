// Flashcards view-model only. Grading and mastery still flow through progress.js.
// This module never reads storage or modifies the original concept/question bank.

/* Evaluation cards share the audited Sort It!/Exam Lab statements. Keeping these
   out of concepts.json preserves term-only Match Up, Speed Recall and cloze. */
const EVALUATION_SUBJECTS=Object.freeze([
  ['census','a census'],['sample','a sample'],
  ['simple-random','simple random sampling'],['systematic','systematic sampling'],
  ['stratified','stratified sampling'],['quota','quota sampling'],
  ['opportunity','opportunity sampling']
]);
const POLARITIES=Object.freeze(['advantage','disadvantage']);

export function makeFlashDeck(concepts,evaluations,topic){
  const terms=(topic==='all'?concepts:concepts.filter(card=>card.module===topic))
    .map(card=>({...card,kind:'term'}));
  if(topic==='data')return terms;
  const cards=[];
  for(const [subject,name] of EVALUATION_SUBJECTS){
    for(const polarity of POLARITIES){
      const points=evaluations.filter(item=>item.subject===subject&&item.polarity===polarity)
        .map(({claim,explanation})=>({claim,explanation}));
      if(!points.length)throw new Error('Missing evaluation points for '+subject+'/'+polarity);
      cards.push({
        id:'flash-eval-'+subject+'-'+polarity,
        label:(polarity==='advantage'?'Advantages':'Disadvantages')+' of '+name,
        module:'sampling',kind:'evaluation',polarity,subject,points,
        definition:points.map(point=>point.claim).join(' ')
      });
    }
  }
  return [...terms,...cards];
}

// Evaluation cards always ask students to retrieve the relevant strengths or
// limitations; reversing term-definition cards does not reverse these prompts.
export function flashFaces(session,card){
  const reverse=session.reversed&&card.kind!=='evaluation';
  return {
    prompt:reverse?card.definition:card.label,
    answer:reverse?card.label:card.definition
  };
}

export const FLASH_RATINGS=Object.freeze(['again','nearly','know']);

export function makeFlashSession(items,{reversed=false,isReview=false,reviewType=null}={}){
  if(!Array.isArray(items)||items.length<1)throw new Error('A flashcard deck needs at least one card.');
  return {
    items:[...items],index:0,revealed:false,reversed:!!reversed,
    correct:0,complete:false,isReview:!!isReview,reviewType,
    ratings:{again:0,nearly:0,know:0},skipped:0,revisitIds:[]
  };
}

function assertCurrent(session){
  if(!session||session.complete||!session.items?.[session.index])
    throw new Error('No active flashcard');
}
function addRevisit(session){
  const id=session.items[session.index].id;
  return session.revisitIds.includes(id)?[...session.revisitIds]:[...session.revisitIds,id];
}

export function rateFlashSession(session,grade){
  assertCurrent(session);
  if(!session.revealed)throw new Error('Reveal the card before rating recall');
  if(!FLASH_RATINGS.includes(grade))throw new Error('Unknown recall rating');
  return {
    ...session,correct:session.correct+(grade==='know'?1:0),
    ratings:{...session.ratings,[grade]:session.ratings[grade]+1},
    revisitIds:grade==='know'?[...session.revisitIds]:addRevisit(session)
  };
}

export function skipFlashSession(session){
  assertCurrent(session);
  return {...session,skipped:session.skipped+1,revisitIds:addRevisit(session)};
}

export function makeFlashReviewSession(session){
  const wanted=new Set(session?.revisitIds||[]);
  const review=session.items.filter(item=>wanted.has(item.id));
  if(!review.length)throw new Error('No cards are marked for review');
  return makeFlashSession(review,{reversed:session.reversed,isReview:true});
}

export function flashCardLabel(session,card){
  assertCurrent(session);
  const prefix='Card '+(session.index+1)+' of '+session.items.length+'. ';
  const {prompt,answer}=flashFaces(session,card);
  if(!session.revealed)
    return prefix+'Prompt: '+prompt+'. Activate the card to reveal the answer.';
  if(card.kind==='evaluation')
    return prefix+'Answer: '+card.points.map(point=>point.claim+' '+point.explanation).join(' ')+
      '. Activate the card to show the prompt again.';
  return prefix+'Answer: '+answer+'. Example: '+card.example+
    '. Watch out: '+card.misconception+'. Activate the card to show the prompt again.';
}
