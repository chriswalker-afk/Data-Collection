// Presentation-only states for Missing Words. Never changes answer grading.
export function clozePresentation(level,session,answer){
  const done=Boolean(session.answered);
  const outcome=!done?'pending':session.status==='assisted'?'assisted':
    session.status==='correct'?'correct':
    session.status==='skipped'?'incorrect':
    level==='choices'&&session.choice===answer?'correct':'incorrect';
  const preview=!done&&level!=='choices'&&Boolean(session.draft?.trim());
  return {outcome,preview,display:done?answer:preview?session.draft:'________'};
}
