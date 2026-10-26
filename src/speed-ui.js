// Small, pure helpers for Speed Recall presentation and targeted retrieval.
// All scoring, data and persistence remain owned by the existing recall engine.
export const SPEED_CAUTION_MS=10000;

export function speedClockPercent(remainingMs,seconds){
  const total=Math.max(0,Number(seconds)*1000);
  if(!Number.isFinite(total)||total===0)return 0;
  const remaining=Number.isFinite(remainingMs)?remainingMs:0;
  return Math.max(0,Math.min(100,remaining/total*100));
}

export function speedRoundSummary(session){
  const attempted=Math.max(0,session.attempted||0);
  const correct=Math.max(0,Math.min(attempted,session.correct||0));
  const skipped=Math.max(0,Math.min(attempted-correct,session.skipped||0));
  const incorrect=attempted-correct-skipped;
  const accuracy=attempted?Math.round(100*correct/attempted):null;
  const reviewCount=session.reviewIds instanceof Set?session.reviewIds.size:0;
  return {attempted,correct,skipped,incorrect,accuracy,reviewCount,
    accuracyLabel:accuracy===null?'Not yet measured':accuracy+'%',
    takeaway:!attempted?'No answers submitted yet. Try an untimed round to build recall.':
      reviewCount?'Review the terms that were missed, then try recalling them without looking.':
      'All submitted terms were recalled correctly. Try applying them in a sampling scenario.'};
}

export function speedReviewDeck(concepts,reviewIds){
  const ids=reviewIds instanceof Set?reviewIds:new Set(reviewIds||[]);
  return concepts.filter(item=>ids.has(item.id));
}
