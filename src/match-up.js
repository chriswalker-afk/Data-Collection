// Match Up interaction rules. No scoring or persistence side-effects.
export const MATCH_MOTION_MS=Object.freeze({correct:420,incorrect:310,settle:240});

export function chooseMatch(current,side,id){
  if(side!=='term'&&side!=='definition')throw new Error('Invalid Match Up side');
  if(typeof id!=='string'||!id.trim())throw new Error('A match selection needs a concept ID');
  const selectedTerm=side==='term'
    ? (current.selectedTerm===id?null:id)
    : current.selectedTerm??null;
  const selectedDefinition=side==='definition'
    ? (current.selectedDefinition===id?null:id)
    : current.selectedDefinition??null;
  const complete=selectedTerm!==null&&selectedDefinition!==null;
  return {selectedTerm,selectedDefinition,complete,
    correct:complete?selectedTerm===selectedDefinition:null};
}

export function matchNextStep(state){
  if(state.resolving==='correct')return 'Pair found! Locking it in.';
  if(state.resolving==='incorrect')return 'Not quite. Compare the defining details.';
  if(state.selectedTerm)return 'Term selected. Now choose its definition.';
  if(state.selectedDefinition)return 'Definition selected. Now choose its term.';
  return 'Choose a term or definition, then find its match.';
}

export function matchStatus(count,total,mistakes){
  const remaining=Math.max(0,total-count);
  return {
    headline:count+' of '+total+' pairs connected',
    remaining:remaining+' '+(remaining===1?'pair':'pairs')+' left',
    mistakes:mistakes+' incorrect '+(mistakes===1?'attempt':'attempts')
  };
}
