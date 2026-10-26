// Premium Sort It!: four placement destinations under two sampling methods.
// The existing evaluation bank supplies each statement and its mathematical explanation.
import {METHOD_LABELS} from './phase2.js';
import {evaluateSortBoard,changeSortPlacement,sortDestination,sortDestinationLabel,SORT_POLARITIES} from './sort-it.js';

export function createSortItUI(deps){
 const {mount,element,div,span,paragraph,heading,action,activityTop,roundProgress,practiceGuide,feedbackBanner}=deps;
 const get=()=>deps.getState();
 let nativeDragId=null;
 let pointerDrag=null;
 let dragGhost=null;
 let lastDropTarget=null;
 let preventFollowupClickUntil=0;
 const state=()=>get().session;
 const isSort=()=>get().mode==='sort'&&!state()?.complete;
 const evaluation=()=>evaluateSortBoard(state().items,state().placements);
 const announce=message=>deps.announce(message);
 const redraw=selector=>deps.render(selector);

 function picker(){
  const {data}=get(),session=state();
  const wrap=div('game-settings sort-pair-settings',
    div('sort-pair-setting',
      element('label',{for:'sort-set',className:'game-settings-label'},'Compare two sampling methods')));
  const select=element('select',{id:'sort-set',className:'game-select','data-control':'sort-round'});
  for(const pair of data.sortPairs){
    select.append(element('option',{value:pair.id,selected:pair.id===session.round.id},pair.label));
  }
  wrap.querySelector('.sort-pair-setting').append(select);
  wrap.append(paragraph('sort-setting-note','Each set has its own mixture of strengths and limitations. Changing the pair starts a fresh board.'));
  return wrap;
 }

 function tile(item){
  const s=state();
  const placed=s.placements[item.id]||null;
  const selected=s.selectedSortId===item.id;
  const checked=s.checked;
  const correct=placed===item.correctDestination;
  const status=checked?(correct?'correct':'incorrect'):'';
  const text=item.prompt;
  const card=action(text,'sort-select',{
    'data-sort-card':item.id,draggable:!s.revealed,disabled:s.revealed,'aria-pressed':selected,
    'aria-label':text+(placed?' — currently in '+sortDestinationLabel(placed):' — unplaced')+
      (selected?' — selected':'')+(status?' — '+(correct?'correct':'needs review'):'')
  },'sort-card'+(selected?' is-selected':'')+(status?' is-'+status:''));
  const handle=span('sort-grab','⠿');
  handle.setAttribute('aria-hidden','true');
  const label=span('sort-card-text',text);
  card.replaceChildren(handle,label);
  if(status)card.append(span('sort-card-result',correct?'✓':'↺'));
  if(s.revealed&&placed&&(!correct||s.checked)){
    const key=span('sort-card-solution','Correct: '+sortDestinationLabel(item.correctDestination));
    card.append(key);
    const explanation=span('sort-card-explanation',item.explanation);
    card.append(explanation);
  }
  return card;
 }
 function dropZone(method,polarity){
  const key=sortDestination(method,polarity);
  const s=state();
  const selected=s.selectedSortId;
  const cards=s.items.filter(item=>s.placements[item.id]===key);
  const positive=polarity==='advantage';
  const place=action(
    selected?'Place selected statement here':'Drop a statement here',
    'sort-place',{'data-sort-destination':key,
      'aria-label':'Place selected statement in '+sortDestinationLabel(key)},
    'sort-drop-button');
  const zone=element('section',{
    className:'sort-drop-zone '+(positive?'is-advantage':'is-disadvantage')+
      (selected?' has-selection':''),
    'data-sort-drop':key,'aria-label':sortDestinationLabel(key)
  });
  const titleId='sort-'+method+'-'+polarity+'-heading';
  zone.setAttribute('aria-labelledby',titleId);
  zone.append(
    div('sort-zone-head',
      heading(4,'sort-zone-name',positive?'Advantages':'Disadvantages',{id:titleId}),
      span('sort-zone-count',String(cards.length))),
    place,
    div('sort-zone-cards',...cards.map(tile))
  );
  return zone;
 }
 function methodColumn(method){
  const count=state().items.filter(item=>state().placements[item.id]?.startsWith(method+':')).length;
  const root=element('section',{className:'sort-method','data-sort-method':method});
  root.append(div('sort-method-header',
    span('sort-method-eyebrow','SAMPLING METHOD'),
    heading(3,'sort-method-title',METHOD_LABELS[method]),
    span('sort-method-count',count+' placed')
  ));
  const bins=div('sort-method-bins',
    ...SORT_POLARITIES.map(p=>dropZone(method,p))
  );
  root.append(bins);
  return root;
 }
 function view(){
  const s=state();
  const result=evaluation();
  const root=div('page activity-page sort-page');
  root.append(activityTop('sort'),picker());
  if(s.complete){root.append(deps.showCompletion('sort'));return root;}
  root.append(
    div('sort-progress-row',
      roundProgress(result.placed,result.total,'Statements placed'),
      span('sort-progress-count',result.placed+' of '+result.total+' placed')),
    practiceGuide('sort')
  );
  const selection=s.selectedSortId&&s.items.find(item=>item.id===s.selectedSortId);
  const banner=div('sort-selection-bar',
    div('sort-selection-copy',
      span('sort-selection-label',selection?'SELECTED STATEMENT':'HOW TO SORT'),
      paragraph('sort-selection-message',selection?
        selection.prompt:
        'Drag a card into a destination, or select it then choose a destination.')),
    ...(selection?[
      action('Clear selection','sort-deselect',{},'btn btn-quiet btn-small'),
      action('Return to tray','sort-return',{},'btn btn-quiet btn-small')
    ]:[])
  );
  root.append(banner);
  const trayCards=s.items.filter(item=>!s.placements[item.id]);
  const tray=element('section',{className:'sort-tray','data-sort-drop':'tray','aria-labelledby':'sort-tray-heading'});
  tray.append(
    div('sort-tray-header',
      div('sort-tray-titlegroup',
        span('sort-tray-eyebrow','MIXED STATEMENTS'),
        heading(2,'sort-tray-title','Statement bank',{id:'sort-tray-heading'})),
      span('sort-tray-count',trayCards.length+' left to place')
    ),
    paragraph('sort-tray-hint','Read each statement. Decide both the sampling method and whether it is an advantage or disadvantage.'),
    div('sort-tray-grid',
      ...(trayCards.length?trayCards.map(tile):
        [paragraph('sort-tray-empty','Every statement has been placed. You can still move cards between destinations.')]))
  );
  const board=element('section',{className:'sort-board','aria-labelledby':'sort-board-title'});
  board.append(
    div('sort-board-heading',
      div('sort-board-titlegroup',
        span('sort-board-eyebrow','FOUR DESTINATIONS'),
        heading(2,'sort-board-title','Place each statement where it belongs',{id:'sort-board-title'})),
      paragraph('sort-board-subtitle','Two methods, each with advantages and disadvantages.')),
    div('sort-method-grid',...s.round.methods.map(methodColumn))
  );
  root.append(div('sort-workspace',tray,board));
  if(s.everChecked){
    const title=s.checked?
      (result.correct===result.total?'All placements are correct.':
        result.correct+' of '+result.total+' in the right place.'):
      'Changes made — check again when ready.';
    root.append(feedbackBanner(
      s.checked&&result.correct===result.total?'correct':'review',title,[
      paragraph('','Your first-check score is '+s.firstCorrect+' of '+result.total+
        '. Corrections improve understanding, but do not change that recorded score.'),
      ...(s.checked&&result.incorrectIds.length?[
        paragraph('','Review the outlined cards. You can move them, check again, or reveal the explanations.')
      ]:[])
    ],'sort-board-feedback'));
  }
  const actions=div('sort-board-actions',
    action(s.everChecked?'Check corrections':'Check sorting','sort-check',
      {disabled:!result.ready||s.checked},
      'btn btn-primary sort-check-button'),
    ...(s.checked&&!s.revealed?[
      action('Show explanations','sort-reveal',{},'btn btn-quiet')
    ]:[]),
    ...(s.everChecked?[
      action('Finish round →','sort-finish',{},'btn btn-quiet')
    ]:[])
  );
  root.append(actions,
    paragraph('sort-scoring-note',s.everChecked?
      'Only your first complete check is used for saved progress. Moves and corrections are practice.':
      result.ready?'All statements placed. Check your sorting to see how well you understand the methods.':
      'You can change any placement before checking. Nothing is marked until you check the full board.'));
  return root;
 }
 function place(id,destination){
  if(!isSort()||state().revealed)return;
  const s=state();
  const change=changeSortPlacement(s.placements,s.items,id,destination,s.round.methods);
  if(change===s.placements)return;
  const was=s.placements[id]||null;
  if(was===destination){
    s.selectedSortId=null;
    redraw('[data-sort-card="'+id+'"]');
    announce('That statement is already here.');
    return;
  }
  s.placements=change;s.selectedSortId=null;
  s.checked=false;
  const result=evaluation();
  const description=destination===null?'the statement bank':sortDestinationLabel(destination);
  redraw('[data-sort-card="'+id+'"]');
  announce('Moved to '+description+'. '+result.placed+' of '+result.total+' placed.');
 }
 function handle(command,button){
  if(!isSort())return false;
  const s=state();
  if(command==='sort-select'){
    if(s.revealed)return true;
    const id=button.dataset.sortCard;
    if(!s.items.some(x=>x.id===id))return true;
    s.selectedSortId=s.selectedSortId===id?null:id;
    const selected=Boolean(s.selectedSortId);
    redraw(selected?'[data-action="sort-place"]':'[data-sort-card="'+id+'"]');
    announce(selected?'Statement selected. Choose an advantages or disadvantages destination.':
      'Selection cleared.');
    return true;
  }
  if(command==='sort-deselect'){
    s.selectedSortId=null;redraw('.sort-tray-title');announce('Selection cleared.');return true;
  }
  if(command==='sort-place'){
    if(!s.selectedSortId){announce('First select or drag a statement.');return true;}
    place(s.selectedSortId,button.dataset.sortDestination);
    return true;
  }
  if(command==='sort-return'){
    if(!s.selectedSortId){announce('Select a statement first.');return true;}
    place(s.selectedSortId,null);return true;
  }
  if(command==='sort-check'){
    const result=evaluation();
    if(!result.ready||s.checked)return true;
    if(!s.everChecked){
      s.everChecked=true;s.firstCorrect=result.correct;s.correct=result.correct;
      for(const item of s.items){
        deps.remember(item.conceptSubject,result.correctIds.includes(item.id));
      }
    }
    s.lastCorrect=result.correct;s.checked=true;s.selectedSortId=null;s.revealed=false;
    redraw('.sort-board-feedback');
    announce(result.correct+' of '+result.total+' placements correct. First-check credit cannot change with corrections.');
    return true;
  }
  if(command==='sort-reveal'&&s.checked){
    s.revealed=true;redraw('.sort-board-feedback');
    announce('The correct destination and mathematical explanation are now shown for each placed statement.');
    return true;
  }
  if(command==='sort-finish'&&s.everChecked){
    deps.finishRound();return true;
  }
  return false;
 }
 function clearNativeHighlight(){
  lastDropTarget?.classList.remove('is-drop-over');
  lastDropTarget=null;
 }
 function markNativeTarget(node){
  const target=node?.closest('[data-sort-drop]')||null;
  if(lastDropTarget===target)return target;
  clearNativeHighlight();
  if(target){target.classList.add('is-drop-over');lastDropTarget=target;}
  return target;
 }
 function destinationFor(node){
  const zone=node?.closest('[data-sort-drop]');
  if(!zone)return undefined;
  return zone.dataset.sortDrop==='tray'?null:zone.dataset.sortDrop;
 }
 function clearDrag(){
  dragGhost?.remove();dragGhost=null;pointerDrag=null;nativeDragId=null;clearNativeHighlight();
 }
 function setDragGhost(point,id){
  const tile=state().items.find(x=>x.id===id);
  if(!tile)return;
  dragGhost=div('sort-drag-ghost',tile.prompt);
  dragGhost.setAttribute('aria-hidden','true');
  document.body.append(dragGhost);
  moveGhost(point);
 }
 function moveGhost(event){
  if(!dragGhost)return;
  dragGhost.style.left=(event.clientX+12)+'px';
  dragGhost.style.top=(event.clientY+16)+'px';
 }
 // Native HTML drag-and-drop for mouse / laptop trackpad, with pointer-based touch handle.
 mount.addEventListener('dragstart',event=>{
  if(!isSort())return;
  const card=event.target.closest('[data-sort-card]');
  if(!card||state().revealed)return;
  nativeDragId=card.dataset.sortCard;
  event.dataTransfer?.setData('text/plain',nativeDragId);
  if(event.dataTransfer)event.dataTransfer.effectAllowed='move';
  card.classList.add('is-dragging');
 });
 mount.addEventListener('dragover',event=>{
  if(!isSort()||!nativeDragId)return;
  const target=markNativeTarget(event.target);
  if(!target)return;
  event.preventDefault();
  if(event.dataTransfer)event.dataTransfer.dropEffect='move';
 });
 mount.addEventListener('drop',event=>{
  if(!isSort()||!nativeDragId)return;
  const value=destinationFor(event.target);
  const id=nativeDragId;
  clearDrag();
  if(value===undefined)return;
  event.preventDefault();place(id,value);
 });
 mount.addEventListener('dragend',()=>clearDrag());
 mount.addEventListener('pointerdown',event=>{
  if(!isSort()||event.pointerType==='mouse'||state().revealed)return;
  const handle=event.target.closest('.sort-grab');
  const card=handle?.closest('[data-sort-card]');
  if(!card)return;
  pointerDrag={id:card.dataset.sortCard,
    startX:event.clientX,startY:event.clientY,
    pointerId:event.pointerId,active:false};
  handle.setPointerCapture?.(event.pointerId);
 });
 mount.addEventListener('pointermove',event=>{
  const drag=pointerDrag;
  if(!isSort()||!drag||drag.pointerId!==event.pointerId)return;
  if(!drag.active){
    if(Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)<10)return;
    drag.active=true;setDragGhost(event,drag.id);
  }
  event.preventDefault();
  moveGhost(event);
  markNativeTarget(document.elementFromPoint(event.clientX,event.clientY));
  if(event.clientY>window.innerHeight-64)window.scrollBy(0,22);
  else if(event.clientY<66)window.scrollBy(0,-22);
 });
 mount.addEventListener('pointerup',event=>{
  const drag=pointerDrag;
  if(!drag||drag.pointerId!==event.pointerId)return;
  const wasActive=drag.active;
  const destination=wasActive?destinationFor(document.elementFromPoint(event.clientX,event.clientY)):undefined;
  const id=drag.id;
  clearDrag();
  if(wasActive){
    preventFollowupClickUntil=performance.now()+350;
    if(destination!==undefined)place(id,destination);
    else announce('No destination selected. The statement was not moved.');
  }
 });
 mount.addEventListener('pointercancel',()=>clearDrag());
 mount.addEventListener('click',event=>{
  if(performance.now()<preventFollowupClickUntil&&event.target.closest('[data-sort-card]')){
    event.preventDefault();event.stopImmediatePropagation();preventFollowupClickUntil=0;
  }
 },true);
 return {view,handle,clearDrag};
}
