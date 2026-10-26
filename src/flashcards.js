// Flashcards view-model only. Grading and mastery still flow through progress.js.
// This module never reads storage or modifies the original concept/question bank.
export const FLASH_RATINGS=Object.freeze(['again','nearly','know']);

export function makeFlashSession(items,{reversed=false,isReview=false}={}){
  if(!Array.isArray(items)||items.length<1)throw new Error('A flashcard deck needs at least one card.');
  return {
    items:[...items],index:0,revealed:false,reversed:!!reversed,
    correct:0,complete:false,isReview:!!isReview,
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
  const face=session.reversed?card.definition:card.label;
  const answer=session.reversed?card.label:card.definition;
  if(!session.revealed)
    return prefix+'Prompt: '+face+'. Activate the card to reveal the answer.';
  return prefix+'Answer: '+answer+'. Example: '+card.example+
    '. Watch out: '+card.misconception+'. Activate the card to show the prompt again.';
}
