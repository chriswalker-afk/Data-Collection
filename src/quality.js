// Shared, accurate end-of-round feedback for all ten activities.
// A round score is always formative; avoid generic praise for zero attempts,
// corrected guesses or model-assisted review.
export function completionHeading(game, session={}) {
  if(session.reviewMode || (game==='flashcards'&&session.isReview))
    return 'Review complete — keep practising independently.';
  const successes=Number.isFinite(session.correct)?session.correct:0;
  switch(game) {
    case 'flashcards':
      return successes===0?'Cards reviewed — practise retrieving them next.':
        'Flashcard round complete — build on your recall.';
    case 'match':
      return session.mistakes>0?'All pairs connected — revisit the tricky matches.':
        'All pairs connected on the first try.';
    case 'cloze':
      return successes===0?'Keep practising the key words.':'Missing Words round complete.';
    case 'sort':
      return successes===0?'Review the method differences and retry.':'Sorting round complete.';
    case 'identify':
      return successes===0?'Study the decisive clues and try again.':'Method investigation complete.';
    case 'speed':
      return !session.attempted?'Round ended — no terms submitted.':
        successes===0?'Try untimed recall to strengthen the terms.':'Recall round complete.';
    case 'build':
      return successes===0?'Review the procedural steps and try again.':'Procedure round complete.';
    case 'error':
      return successes===0?'Study the corrections and consequences.':'Error investigations complete.';
    case 'reason':
      return 'Reasoning reviewed — keep explaining your choices.';
    case 'exam':
      return 'Exam practice complete — review your working.';
    default:
      return 'Round complete.';
  }
}

export function completionCreditNote(game,session={}) {
  if(session.reviewMode&&(game==='reason'||game==='error'))
    return 'This revisit was unscored: no new answers, rounds or mastery were recorded.';
  const notes={
    flashcards:'“Know it” is a self-rating, not an independently marked answer. Revisit cards to consolidate recall.',
    match:'Only pairs connected before any mistaken pairing earn independent credit. Corrections still help you learn.',
    cloze:'Hinted answers and revealed words are practice, not independent mastery.',
    sort:'Only your first full-board check counts towards progress. Corrections are unscored.',
    identify:'Your first selection for each scenario is recorded; explanations appear afterwards.',
    speed:'Only submitted typed responses count. Correct independent answers in targeted review can also earn credit.',
    build:'Only the first unaided procedure check counts; revealing a model or correcting an order cannot earn credit.',
    error:'Only the first complete three-part diagnosis counts. Missed-case reviews are unscored.',
    reason:'Guided model choices and written self-review are practice, not independently graded mathematical answers.',
    exam:'Numerical answers are checked; written responses are model-assisted self-review, not official marks.'
  };
  return notes[game]||'Your activity results reflect practice, not a predicted examination grade.';
}
