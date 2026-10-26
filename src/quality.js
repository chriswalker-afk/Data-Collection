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
