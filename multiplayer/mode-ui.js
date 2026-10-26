// Three accessible real-time student interfaces. The Worker remains the only grader.
// These temporary choices are per-device and never touch Solo or awards storage.
export const ARENA_MODES=Object.freeze({
  which:{label:'Which Method?',lengths:[5,10,20],seconds:20,unit:'questions'},
  speed:{label:'Speed Recall',lengths:[5,10,20],seconds:25,unit:'definitions'},
  match:{label:'Match Up',lengths:[1,2,3],seconds:75,unit:'boards'},
  sort:{label:'Sort It!',lengths:[1,3,6],seconds:90,unit:'boards'}
});
export function createModeUI({make,button,command,updateClock,actionRow,supportBox,stageKicker,summaryProgress,announce,refreshStage}){
  let key=null,selected=null;
  let pairs={},placements={},typed='';
  const append=(node,...others)=>{node.append(...others);return node;};
  function setKey(q){if(q.id===key)return;key=q.id;selected=null;pairs={};placements={};typed='';}
  const timeExpired=q=>Date.now()+(q?.serverNow? q.serverNow-Date.now():0)>=q.deadline;
  function row(label,description){
    return append(make('div',undefined,'arena-instruction'),make('strong',label),make('p',description));
  }
  function shell(room,stage){
    const q=room.question;
    setKey(q);
    stage.append(stageKicker(ARENA_MODES[room.game].label.toUpperCase()+' · '+q.index+' OF '+q.total),
      summaryProgress(q.index-1,q.total));
    const h=make('h2',q.kind==='sort'?q.title:q.prompt);h.tabIndex=-1;stage.append(h);
    const clock=make('p',undefined,'question-clock');
    clock.id='question-clock';clock.setAttribute('aria-live','off');stage.append(clock);
    updateClock();
  }
  function infoHost(room,stage){
    const ready=room.players.filter(p=>p.answered).length;
    stage.append(supportBox(ready+' of '+room.players.length+' responses submitted',
      'Results are marked securely by the server. Reveal when everyone has answered or the timer ends.'));
    const row=actionRow();
    const reveal=button('Reveal answer',()=>void command('reveal'));reveal.id='host-reveal';
    row.append(reveal,button('End challenge',()=>{if(confirm('End this challenge for everyone?'))void command('close');},'btn btn-danger'));
    stage.append(row);updateClock();
  }
  function submit(room,stage,payload,ready,caption){
    if(!ready)return;
    const b=button(caption,()=>void command('answer',payload));
    b.className='btn btn-primary arena-submit';
    stage.append(b);
  }
  function speed(room,stage,locked){
    const q=room.question;
    stage.append(row('RECALL THE TERM','Type the full mathematical term. Accepted mathematical synonyms are allowed; a spelling mistake does not earn automatic credit.'));
    const form=make('form',undefined,'arena-speed-form');
    form.id='arena-speed-form';
    const label=make('label','Your answer','arena-speed-label');label.htmlFor='arena-speed-answer';
    const input=make('input');input.id='arena-speed-answer';input.name='recall';
    input.type='text';input.maxLength=100;input.autocomplete='off';input.spellcheck=false;
    input.value=typed;input.disabled=locked;input.required=true;
    input.setAttribute('aria-describedby','arena-speed-note');
    input.addEventListener('input',()=>{typed=input.value;submitButton.disabled=!typed.trim()||locked;});
    const hint=make('p','Only one submitted answer counts. Check your spelling before sending.','arena-field-hint');
    hint.id='arena-speed-note';
    const submitButton=button('Submit term',()=>{},'btn btn-primary');
    submitButton.type='submit';submitButton.disabled=!typed.trim()||locked;
    form.addEventListener('submit',ev=>{
      ev.preventDefault();if(locked||!typed.trim())return;
      void command('answer',{response:typed.trim()});
    });
    form.append(label,input,hint,submitButton);stage.append(form);
  }
  function match(room,stage,locked){
    const q=room.question;
    const done=Object.keys(pairs).length;
    stage.append(row('CONNECT THE PAIRS','Select a term, then its definition. Repeat until all six pairs are connected. Your board is scored on your single submission.'));
    const counter=make('p',done+' of '+q.terms.length+' pairs connected','arena-board-counter');
    stage.append(counter);
    const grid=make('div',undefined,'arena-match-columns');
    const terms=make('section',undefined,'arena-match-panel'),definitions=make('section',undefined,'arena-match-panel');
    terms.append(make('h3','01 · TERMS'));definitions.append(make('h3','02 · DEFINITIONS'));
    const assigned=Object.fromEntries(Object.entries(pairs).map(([t,d])=>[d,t]));
    for(const t of q.terms){
      const isSelected=selected===t.id;
      const selectedLabel=q.definitions.find(d=>d.id===pairs[t.id]);
      const label=t.label+(selectedLabel?' · '+String.fromCharCode(65+q.definitions.indexOf(selectedLabel)):'');
      const b=button(label,()=>{
        if(locked)return;
        selected=selected===t.id?null:t.id;
        refreshStage();
        document.querySelector('.arena-term[data-id="'+CSS.escape(t.id)+'"]')?.focus({preventScroll:true});
        announce(selected?'Term selected. Now choose a definition.':'Term deselected.');
      },'arena-term'+(isSelected?' is-selected':'')+(selectedLabel?' is-paired':''));
      b.dataset.id=t.id;b.disabled=locked;b.setAttribute('aria-pressed',String(isSelected));
      b.setAttribute('aria-label',t.label+(selectedLabel?' paired with definition '+String.fromCharCode(65+q.definitions.indexOf(selectedLabel)):'')+(isSelected?' selected':''));
      terms.append(b);
    }
    q.definitions.forEach((d,i)=>{
      const linkedTerm=assigned[d.id];
      const b=button('',()=>{
        if(locked||!selected)return;
        for(const [id,definition] of Object.entries(pairs))if(definition===d.id)delete pairs[id];
        pairs[selected]=d.id;selected=null;
        refreshStage();announce('Pair connected. '+Object.keys(pairs).length+' of '+q.terms.length+' matched.');
      },'arena-definition'+(linkedTerm?' is-paired':''));
      b.dataset.id=d.id;b.disabled=locked||!selected;
      b.append(make('span',String.fromCharCode(65+i),'arena-definition-letter'),make('span',d.text));
      b.setAttribute('aria-label','Definition '+String.fromCharCode(65+i)+': '+d.text+(linkedTerm?' (paired)':''));
      definitions.append(b);
    });
    grid.append(terms,definitions);stage.append(grid);
    if(!locked){
      const clear=button('Clear my board',()=>{pairs={};selected=null;refreshStage();announce('Pairs cleared.');},'btn btn-quiet');
      clear.disabled=!done;stage.append(clear);
      submit(room,stage,{pairs:{...pairs}},done===q.terms.length,'Submit all pairs');
    }
  }
  function sort(room,stage,locked){
    const q=room.question,done=Object.keys(placements).length;
    stage.append(row('PLACE EVERY STATEMENT','Choose a statement from the bank, then place it in one of the four destinations. You can change your decisions until submitting.'));
    stage.append(make('p',done+' of '+q.statements.length+' statements placed','arena-board-counter'));
    const bank=make('section',undefined,'arena-sort-bank');
    bank.append(make('h3','YOUR STATEMENTS'));
    const bankCards=make('div',undefined,'arena-sort-bank-cards');
    for(const item of q.statements){
      const choice=q.destinations.find(d=>d.id===placements[item.id]);
      const card=button('',()=>{
        if(locked)return;
        selected=selected===item.id?null:item.id;
        refreshStage();announce(selected?'Statement selected. Choose its destination.':'Selection cleared.');
      },'arena-sort-card'+(choice?' is-placed':'')+(selected===item.id?' is-selected':''));
      card.dataset.id=item.id;card.disabled=locked;
      card.setAttribute('aria-pressed',String(selected===item.id));
      card.append(make('span',item.text),make('small',choice?choice.label:'Not yet placed'));
      bankCards.append(card);
    }
    bank.append(bankCards);stage.append(bank);
    const grid=make('div',undefined,'arena-sort-destinations');
    for(const d of q.destinations){
      const zone=make('section',undefined,'arena-sort-zone');
      zone.append(make('h4',d.label));
      const assigned=q.statements.filter(s=>placements[s.id]===d.id);
      zone.append(make('p',assigned.length+' statement'+(assigned.length===1?'':'s'),'arena-zone-count'));
      const list=make('ul');
      assigned.forEach(s=>list.append(append(make('li'),make('span',s.text))));
      zone.append(list);
      const move=button('Place selected here',()=>{
        if(!selected||locked)return;
        placements[selected]=d.id;selected=null;
        refreshStage();announce('Statement placed in '+d.label+'.');
      },'arena-zone-action');
      move.disabled=locked||!selected;zone.append(move);grid.append(zone);
    }
    stage.append(grid);
    if(!locked&&selected&&placements[selected]){
      stage.append(button('Return selected statement to bank',()=>{
        delete placements[selected];selected=null;refreshStage();announce('Statement returned to bank.');
      },'btn btn-quiet'));
    }
    if(!locked)submit(room,stage,{placements:{...placements}},done===q.statements.length,'Check my sorting');
  }
  function renderQuestion(room,isHost,pending,stage){
    const q=room.question;setKey(q);shell(room,stage);
    if(isHost){
      const preview=q.kind==='match'?'Students are matching '+q.terms.length+' mathematical terms.':
        q.kind==='sort'?'Students are sorting '+q.statements.length+' statements across four categories.':
        'Students are typing the term that fits the definition.';
      stage.append(supportBox('Students are thinking',preview));
      infoHost(room,stage);return;
    }
    const me=room.players.find(p=>p.id===room.me.id);
    if(me?.answered||pending){
      stage.append(make('p','Response submitted. Your answer is locked until teacher review.','answer-confirm'));
      return;
    }
    const locked=Date.now()+(q.serverNow-Date.now())>=q.deadline;
    if(q.kind==='speed')speed(room,stage,locked);
    else if(q.kind==='match')match(room,stage,locked);
    else if(q.kind==='sort')sort(room,stage,locked);
  }
  function renderReview(room,isHost,stage){
    const reveal=room.reveal,game=room.game;
    const q=reveal.question;
    stage.append(stageKicker(ARENA_MODES[game].label.toUpperCase()+' · '+reveal.index+' OF '+reveal.total+' · REVIEW'),
      summaryProgress(reveal.index,reveal.total));
    const h=make('h2',game==='speed'?'Answer: '+reveal.correctTerm:
      game==='match'?'The accurate pairings':'The correct classifications');
    h.tabIndex=-1;stage.append(h);
    const correct=reveal.answers.reduce((n,a)=>n+a.correctCount,0);
    const total=reveal.answers.reduce((n,a)=>n+a.total,0);
    stage.append(supportBox(correct+' of '+total+' submitted decisions correct',
      'Accuracy earns the main points. A small speed bonus is awarded for fully correct submissions.'));
    const review=make('div',undefined,'arena-math-review');
    if(game==='speed'){
      review.append(make('strong','WHY THE TERM MATTERS'),make('p',reveal.reason));
    }else if(game==='match'){
      for(const answer of reveal.solutions){
        const line=make('div',undefined,'arena-review-line');
        line.append(make('strong',answer.term),make('p',answer.definition));
        review.append(line);
      }
      review.append(make('p',reveal.reason,'arena-field-hint'));
    }else if(game==='sort'){
      for(const source of q.statements){
        const solution=reveal.solutions.find(s=>s.id===source.id);
        if(!solution)continue;
        const label=q.destinations.find(d=>d.id===solution.correctDestination)?.label||solution.correctDestination;
        const line=make('div',undefined,'arena-review-line');
        line.append(make('strong',source.text),make('p','Correct: '+label),
          make('p',solution.explanation,'arena-explanation'));
        review.append(line);
      }
    }
    stage.append(review);
    const mine=reveal.answers.find(a=>a.id===room.me.id);
    if(!isHost)stage.append(make('p',mine?
      'You earned '+mine.points+' points this question ('+mine.correctCount+' of '+mine.total+' correct).':
      'No answer was submitted for this question.','arena-my-result'));
    if(isHost)stage.append(append(actionRow(),
      button(reveal.index===reveal.total?'Finish challenge':'Next question',()=>void command('next'))));
  }
  return {renderQuestion,renderReview};
}
