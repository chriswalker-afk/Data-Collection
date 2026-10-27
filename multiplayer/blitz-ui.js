// Pass 2 — student-facing, self-paced Blitz: one checked submission per task.
// Draft selections stay on this device. The Worker alone grades and times play.
const METHODS={
  'simple-random':'Simple random sampling',systematic:'Systematic sampling',
  stratified:'Stratified sampling',quota:'Quota sampling',opportunity:'Opportunity sampling'
};
const create=(name,cls,text)=>{
  const el=document.createElement(name);if(cls)el.className=cls;
  if(text!==undefined)el.textContent=text;return el;
};
export function createBlitzUI({button,command,refreshStage,stageKicker}){
  let activeKey=null,typed='',pairs={},placements={},pending=false;
  function keyFor(q){
    const key=q?.questionKey||null;
    if(key===activeKey)return;
    activeKey=key;typed='';pairs={};placements={};pending=false;
  }
  function hint(text){return create('p','blitz-hint',text);}
  function label(text,forId){const el=create('label','blitz-field-label',text);el.htmlFor=forId;return el;}
  function waitingAction(type,payload){
    if(pending)return;
    pending=true;refreshStage();
    void command(type,payload).finally(()=>{pending=false;refreshStage();});
  }
  function appendHeading(stage,room){
    const stats=room.blitz?.me;
    stage.append(stageKicker('BLITZ · LIVE CLASSROOM CHALLENGE'));
    const title=create('h2','blitz-heading','Think accurately. Keep moving.');
    title.tabIndex=-1;stage.append(title);
    const progress=create('div','blitz-live-summary');
    progress.append(create('span','blitz-summary-value',String(stats?.correct??0)+' correct'),
      create('span','',String(stats?.attempts??0)+' attempts'),
      create('span','',String(stats?.accuracy??0)+'% accuracy'));
    stage.append(progress);
  }
  function submitChoice(stage,room,q){
    stage.append(hint('Choose the sampling method described. Your choice is checked immediately.'));
    const grid=create('div','option-grid blitz-options');
    for(const [id,name] of Object.entries(METHODS)){
      const control=button(name,()=>waitingAction('blitz-answer',{questionKey:q.questionKey,method:id}),'method-option');
      control.disabled=pending;
      grid.append(control);
    }
    stage.append(grid);
  }
  function submitRecall(stage,q){
    stage.append(hint('Recall the correct mathematical term. Accepted precise synonyms count.'));
    const form=create('form','blitz-recall-form');
    const answer=create('input');
    answer.id='blitz-recall-answer';answer.type='text';answer.maxLength=100;
    answer.autocomplete='off';answer.spellcheck=false;answer.required=true;
    answer.value=typed;answer.disabled=pending;
    const send=button('Check answer',()=>{},'btn btn-primary');
    send.type='submit';send.disabled=pending||!typed.trim();
    answer.addEventListener('input',()=>{
      typed=answer.value;send.disabled=pending||!typed.trim();
    });
    form.addEventListener('submit',event=>{
      event.preventDefault();
      if(!typed.trim()||pending)return;
      waitingAction('blitz-answer',{questionKey:q.questionKey,response:typed.trim()});
    });
    form.append(label('Your answer','blitz-recall-answer'),answer,send);
    stage.append(form);
  }
  function selectBoard(stage,q,kind){
    const items=kind==='match'?q.terms:q.statements;
    const definitions=kind==='match'?q.definitions:q.destinations;
    const selections=kind==='match'?pairs:placements;
    stage.append(hint(kind==='match'?
      'Choose the correct definition for each term. Every definition is used once.':
      'Classify each statement under the correct method and advantage or disadvantage.'));
    const board=create('div','blitz-board');
    const counter=create('p','blitz-counter');
    const send=button('Check my board',()=>{},'btn btn-primary blitz-submit');
    function ready(){
      const all=items.every(item=>selections[item.id]);
      const distinct=kind==='sort'||new Set(Object.values(selections)).size===items.length;
      counter.textContent=items.filter(item=>selections[item.id]).length+' of '+items.length+' decisions made';
      send.disabled=pending||!all||!distinct;
    }
    for(let i=0;i<items.length;i++){
      const item=items[i],id='blitz-board-'+i;
      const card=create('div','blitz-board-row');
      const prompt=kind==='match'?item.label:item.text;
      const picker=create('select','blitz-board-select');
      picker.id=id;picker.disabled=pending;
      const placeholder=create('option','',kind==='match'?'Choose a definition':'Choose a destination');
      placeholder.value='';picker.append(placeholder);
      for(const option of definitions){
        const opt=create('option','',kind==='match'?option.text:option.label);
        opt.value=option.id;picker.append(opt);
      }
      picker.value=selections[item.id]||'';
      picker.addEventListener('change',()=>{
        if(picker.value)selections[item.id]=picker.value;
        else delete selections[item.id];
        ready();
      });
      card.append(label(prompt,id),picker);board.append(card);
    }
    send.addEventListener('click',()=>{
      if(send.disabled)return;
      waitingAction('blitz-answer',{
        questionKey:q.questionKey,
        ...(kind==='match'?{pairs:{...pairs}}:{placements:{...placements}})
      });
    });
    ready();stage.append(counter,board,send);
  }
  function renderFeedback(stage,room){
    const f=room.blitz.feedback;
    if(!f)return;
    const complete=f.correctCount===f.total;
    const headline=create('h2','blitz-feedback-heading',
      complete?'Correct — keep the streak going!':
      f.correctCount?'Good thinking — review these decisions':'Review the answer, then try another');
    stage.append(stageKicker('INSTANT MATHEMATICAL FEEDBACK'),headline);
    const tally=create('p','blitz-feedback-tally',
      f.correctCount+' of '+f.total+' decisions correct · '+f.points+' points');
    stage.append(tally);
    const review=create('div','blitz-answer-review');
    if(room.game==='which'){
      review.append(create('strong','', 'Correct method: '+(METHODS[f.correctMethod]||f.correctMethod)),
        create('p','',f.reason||''),
        create('p','',f.contrast||''));
    }else if(room.game==='speed'){
      review.append(create('strong','','Correct term: '+f.correctTerm),
        create('p','',f.reason||''));
    }else if(room.game==='match'){
      for(const solution of f.solutions||[]){
        const row=create('p','');
        row.append(create('strong','',solution.term+': '),
          document.createTextNode(solution.definition));
        review.append(row);
      }
    }else if(room.game==='sort'){
      const statements=f.reviewQuestion?.statements||[];
      const destinations=f.reviewQuestion?.destinations||[];
      for(const solution of f.solutions||[]){
        const statement=statements.find(item=>item.id===solution.id);
        const destination=destinations.find(item=>item.id===solution.correctDestination);
        review.append(create('p','', (statement?.text||'Statement')+' — '+
          (destination?.label||'Correct classification')+'. '+solution.explanation));
      }
    }
    stage.append(review);
    const next=button('Next question →',()=>waitingAction('blitz-next'), 'btn btn-primary blitz-next');
    next.disabled=pending;stage.append(next);
  }
  function render(room,isHost,stage){
    const state=room.blitz;if(!state)return;
    stage.classList.add('is-blitz');
    const timer=create('p','blitz-clock','Preparing countdown…');
    timer.id='blitz-clock';timer.setAttribute('aria-live','off');
    stage.append(timer);
    if(isHost){
      stage.append(stageKicker('BLITZ · TEACHER VIEW'));
      const heading=create('h2','', 'Your class is in full flow');
      heading.tabIndex=-1;stage.append(heading);
      stage.append(hint('Each student gets an independent question and instant private feedback. The server controls the shared deadline and final ranks.'));
      const all=state.standings||[];
      stage.append(create('p','blitz-teacher-pulse',
        all.reduce((n,s)=>n+s.correct,0)+' checked decisions correct · '+
        all.reduce((n,s)=>n+s.attempts,0)+' submissions'));
      stage.append(button('End Blitz early',()=>{
        if(confirm('End Blitz now and publish final standings for everyone?'))
          void command('close');
      },'btn btn-danger'));
      return;
    }
    appendHeading(stage,room);
    if(state.feedback){renderFeedback(stage,room);return;}
    const q=state.question;
    if(!q){
      stage.append(hint('Time is up or your challenge is updating. Final standings are being prepared.'));
      return;
    }
    const caption=create('span','blitz-question-number','QUESTION '+q.index);
    const heading=create('h3','blitz-question-heading',q.kind==='sort'?q.title:q.prompt);
    stage.append(caption,heading);
    if(q.kind==='speed')submitRecall(stage,q);
    else if(q.kind==='match')selectBoard(stage,q,'match');
    else if(q.kind==='sort')selectBoard(stage,q,'sort');
    else submitChoice(stage,room,q);
  }
  function focusFor(room){
    keyFor(room.blitz?.question);
  }
  return {render,focusFor};
}
