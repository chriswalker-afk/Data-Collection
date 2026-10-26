// UI Pass 2: student-facing activity guidance only.
// Keep mathematics, scoring, saved progress and teacher assessment claims elsewhere.
export const ACTIVITY_GUIDANCE=Object.freeze({
  flashcards:Object.freeze({
    practice:'Recall precise mathematical terms and definitions.',
    task:'Try the answer, flip the card to check, then rate your recall. Again and Nearly cards can be revisited.'}),
  match:Object.freeze({
    practice:'Connect the correct mathematical term to its definition.',
    task:'Select a term or definition, then its partner. Correct pairs briefly light up before disappearing.'}),
  cloze:Object.freeze({
    practice:'Retrieve the precise mathematical language used in definitions.',
    task:'Complete the missing word in the definition.'}),
  sort:Object.freeze({
    practice:'Compare the strengths and limitations of two sampling methods.',
    task:'Drag each statement to the correct method’s advantages or disadvantages. You can also select a card and choose its destination. Check the full board, then correct any mistakes.'}),
  identify:Object.freeze({
    practice:'Recognise a sampling method from how participants or items are selected.',
    task:'Read how the sample was selected, then choose the method. After checking, study the decisive clue and the contrasting alternatives.'}),
  speed:Object.freeze({
    practice:'Recall the exact mathematical term from its definition.',
    task:'Type the term that matches the definition, then check your answer.'}),
  build:Object.freeze({
    practice:'Sequence a defensible sampling procedure and justify its steps.',
    task:'Drag steps or use the arrow buttons to make a valid sequence. Check the prerequisites, then review why each step matters. Different valid orders are accepted.'}),
  error:Object.freeze({
    practice:'Locate, repair and explain flawed sampling investigations.',
    task:'Select the numbered error, choose a defensible correction, then diagnose its consequence. All three decisions are checked together; missed cases can be revisited without new mastery credit.'}),
  reason:Object.freeze({
    practice:'Justify a method in context, recognise a limitation and suggest an improvement.',
    task:'Choose the four elements of a defensible explanation. Your optional writing is for reflection, not automatic grading.'}),
  exam:Object.freeze({
    practice:'Combine sampling calculations, method descriptions and evaluation.',
    task:'Answer independently where possible, then use the worked model to review your answer.'})
});
export function guideForActivity(id,options={}){
  const original=ACTIVITY_GUIDANCE[id];
  if(!original)throw new Error('Unknown activity '+id);
  const result={...original};
  if(id==='flashcards'&&options.reversed===true)
    result.task='Read the definition, recall the term, flip the card to check, then rate your recall.';
  if(id==='cloze'){
    const level=options.level||'choices';
    result.task=level==='choices'
      ? 'Choose the word that completes the definition.'
      :level==='guided'
        ? 'Type the missing word. You may reveal its first letter; a hinted answer is practice, not mastery.'
        :'Type the exact missing word without a word bank or hints.';
  }
  if(id==='speed'&&options.timed===true)
    result.task='Type the term before the timer runs out. The timer pauses while feedback is shown or the tab is hidden.';
  if(id==='exam'){
    if(options.questionType==='allocation'||options.questionType==='systematic')
      result.task='Calculate each requested whole-number answer. Check your calculations and study the worked steps.';
    if(options.questionType==='procedure'||options.questionType==='evaluation')
      result.task='Write a contextual response first, then compare with the model and self-review the ideas you included. Your writing is not automatically marked.';
  }
  return result;
}
