// Premium Build the Method: accessible reorder interactions and explanatory layers.
// The existing app.js remains responsible for correctness, first-check credit,
// saved progress, method sequencing and the Show model action.
import {checkProcedure} from './exam.js';
import {STEP_GUIDANCE,buildInsights,buildSummary,validateBuildBank} from './build-method.js';

const mount=document.getElementById('app');
const announcer=document.getElementById('announcer');
const methods=new Map();
const attempts=new Map();
let pointerDrag=null;
let ghost=null;
let dropRow=null;
let lastRoute=location.hash;

const isBuild=()=>location.hash.startsWith('#/build/');
const elem=(tag,className='',text='')=>{
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(text)node.textContent=text;
 return node;
};
const say=message=>{
 if(!announcer)return;
 announcer.textContent='';
 requestAnimationFrame(()=>{if(isBuild())announcer.textContent=message;});
};
const panel=()=>mount.querySelector('.exam-workspace[data-method-id]');
const orderFrom=(container)=>[...container.querySelectorAll('.exam-step[data-step-id]')].map(
 node=>node.dataset.stepId);
const methodFor=(root=panel())=>root?methods.get(root.dataset.methodId):null;

function enhanceSettings(page){
 const picker=page.querySelector('#build-method');
 const settings=picker?.closest('.game-settings');
 if(!settings||settings.dataset.buildEnhanced)return;
 settings.dataset.buildEnhanced='true';
 settings.classList.add('build-settings');
 settings.append(elem('p','build-settings-explainer',
  'Start with any method. You will construct all five procedures in one round.'));
}
function enhancePreamble(root,method){
 root.classList.add('build-workspace');
 const description=root.querySelector('.exam-help');
 if(description){
  description.textContent=
   'Drag a step using its handle, or use the up/down buttons with a mouse, touch or keyboard. Any sequence meeting the required dependencies is accepted.';
  description.classList.add('build-instructions');
 }
 const list=root.querySelector('.exam-step-list');
 if(!list)return;
 list.classList.add('build-step-list');
 list.setAttribute('aria-label','Put the sampling procedure steps in a valid order');
 const context=elem('div','build-context');
 const text=elem('div','build-context-copy');
 text.append(elem('span','build-context-kicker','WHAT THIS METHOD DOES'),
   elem('p','build-context-description',method.definitionFocus));
 const chip=elem('span','build-method-family',
  method.family==='random'?'Random selection method':'Non-random selection method');
 context.append(text,chip);
 root.insertBefore(context,list);
 const heading=elem('div','build-arrange-head');
 const headings=elem('div','build-arrange-heading');
 headings.append(elem('span','build-context-kicker','YOUR TASK'),
   elem('h3','build-arrange-title','Arrange the '+method.procedure.length+' steps'));
 heading.append(headings,elem('p','build-arrange-tip','Order matters where one step depends on another.'));
 root.insertBefore(heading,list);
}
function enhanceStep(root,node,method,index,checked){
 const id=node.dataset.stepId;
 const hint=STEP_GUIDANCE[method.id]?.[id];
 if(!hint)return;
 node.classList.add('build-step');
 node.dataset.buildPosition=String(index+1);
 node.id='build-'+method.id+'-'+id;
 const number=node.querySelector('.exam-step-number');
 if(number)number.setAttribute('aria-label','Position '+(index+1));
 if(!checked){
  const grip=elem('button','build-grip','⠿');
  grip.type='button';
  grip.dataset.buildGrip=id;
  grip.setAttribute('aria-label','Drag '+hint.title+', currently step '+(index+1));
  grip.setAttribute('title','Drag to a different position');
  node.insertBefore(grip,node.firstChild);
 }
 const copy=node.querySelector('.exam-step-copy');
 if(copy){
  copy.classList.add('build-step-copy');
  const title=elem('span','build-step-title',hint.title);
  copy.prepend(title);
 }
 const controls=node.querySelectorAll('.exam-arrow');
 if(controls.length===2){
  controls[0].setAttribute('title','Move step '+(index+1)+' up');
  controls[1].setAttribute('title','Move step '+(index+1)+' down');
 }
 if(checked)node.classList.add('is-checked');
}
function outcomeFor(method,root){
 const observed=attempts.get(method.id);
 if(observed)return observed;
 // Graceful fallback if the optional enhancer loaded after an answer.
 const passed=root.querySelector('.typed-feedback.correct')!==null;
 const order=orderFrom(root);
 return {kind:passed?'correct':'wrong',order,insights:buildInsights(method,order)};
}
function appendCheckedFeedback(root,method){
 const record=outcomeFor(method,root);
 const insight=record.insights;
 const original=root.querySelector('.typed-feedback');
 const content=elem('section','build-analysis');
 content.setAttribute('aria-label','Procedure ordering explanation');
 const top=elem('div','build-analysis-top');
 const label=elem('div','build-analysis-top-copy');
 label.append(elem('span','build-context-kicker','UNDERSTAND YOUR CHECK'));
 let heading,description;
 if(record.kind==='revealed'){
  heading='Model revealed for practice';
  description='Revealing the answer does not count as independent procedural mastery. Compare the steps below, then try them from memory.';
 }else if(insight.correct){
  heading=insight.validAlternative?'A different order — still valid':'All required dependencies satisfied';
  description=insight.validAlternative?
   'Your order differs from the example model, but every compulsory prerequisite is respected. More than one sequence can be correct.':
   'Every prerequisite appears before the step that depends on it. The sequence is accepted.';
 }else{
  heading=insight.unmet.length+' ordering '+(insight.unmet.length===1?'dependency':'dependencies')+' to revisit';
  description='These are the precise prerequisite relationships your first submitted sequence did not satisfy.';
 }
 label.append(elem('h3','build-analysis-title',heading));
 top.append(label);
 if(record.kind!=='revealed'){
  const badge=elem('span','build-analysis-count',insight.passed+' / '+insight.total+' links satisfied');
  top.append(badge);
 }
 content.append(top,elem('p','build-analysis-description',description));
 if(record.kind==='wrong'&&insight.unmet.length){
  const list=elem('ol','build-unmet-list');
  for(const requirement of insight.unmet){
   const item=elem('li','build-unmet-item');
   item.append(elem('strong','build-unmet-pair',
    '“'+requirement.beforeTitle+'” must precede “'+requirement.afterTitle+'”.'),
     elem('p','build-unmet-reason',requirement.why));
   list.append(item);
  }
  content.append(list);
 }
 const placement=root.querySelector('.exam-model-heading');
 if(placement)root.insertBefore(content,placement);
 else original?.after(content);
 const erroneous=new Set(insight.unmet.flatMap(row=>[row.before,row.after]));
 for(const row of root.querySelectorAll('.exam-step[data-step-id]')){
  if(record.kind==='wrong'&&erroneous.has(row.dataset.stepId)){
   row.classList.add('build-needs-review');
   const flag=elem('span','build-step-flag','Review the dependency below');
   row.append(flag);
  }
 }
 const model=root.querySelector('.exam-model-list');
 if(model){
  model.classList.add('build-model-list');
  method.procedure.forEach((step,index)=>{
   const row=model.children[index];
   if(!row)return;
   const details=elem('details','build-step-why');
   details.append(elem('summary','build-step-why-summary','Why this step matters'));
   details.append(elem('p','build-step-why-text',STEP_GUIDANCE[method.id][step.id].why));
   row.append(details);
  });
 }
 const block=elem('details','build-worked-example');
 block.append(elem('summary','build-worked-summary','See a contextual worked example'),
  elem('p','build-worked-text',method.workedExample));
 // The source condition already begins "If" or "When". Present it as a
 // genuine conditional instruction, never a blanket rule for every sample.
 for(const note of root.querySelectorAll('.exam-help')){
  const text=note.textContent.trim();
  if(/^Only if if /i.test(text)){
   note.textContent='If '+text.slice('Only if if '.length);
   note.classList.add('build-conditional-note');
  }else if(/^Only if when /i.test(text)){
   note.textContent='When '+text.slice('Only if when '.length);
   note.classList.add('build-conditional-note');
  }
 }
 const caution=root.querySelector('.exam-warning');
 if(caution)caution.before(block);
 else model?.after(block);
 if(record.kind==='wrong'||record.kind==='revealed'){
  root.querySelector('.next-row')?.before(correctionPractice(root,method,record.order));
 }
}
function correctionPractice(root,method,stepIds){
 const group=elem('details','build-correction');
 group.append(elem('summary','build-correction-toggle','Try correcting the sequence · unscored practice'));
 const body=elem('div','build-correction-body');
 body.append(elem('p','build-correction-description',
  'Rearrange the steps again, then check your revised sequence. This practice does not record extra answers or change your first-check score.'));
 const list=elem('ol','build-correction-list');
 for(const [index,id] of stepIds.entries()){
  const source=method.procedure.find(item=>item.id===id);
  if(!source)continue;
  const row=elem('li','build-correction-step');
  row.dataset.buildPracticeStep=id;
  const label=elem('span','build-correction-text',source.text);
  const controls=elem('div','build-correction-controls');
  for(const [direction,icon] of [[-1,'↑'],[1,'↓']]){
   const button=elem('button','build-practice-arrow',icon);
   button.type='button';button.dataset.buildPracticeMove=String(direction);
   button.setAttribute('aria-label','Move correction step '+(index+1)+(direction===-1?' up':' down'));
   button.disabled=direction===-1?index===0:index===stepIds.length-1;
   controls.append(button);
  }
  row.append(label,controls);list.append(row);
 }
 body.append(list);
 const check=elem('button','btn btn-primary build-practice-check','Check corrected sequence');
 check.type='button';
 check.dataset.buildPracticeCheck='true';
 const result=elem('div','build-practice-result');
 result.setAttribute('role','status');result.setAttribute('aria-live','polite');
 body.append(check,result);
 group.append(body);
 return group;
}
function updatePracticeList(group){
 const rows=[...group.querySelectorAll('.build-correction-step')];
 rows.forEach((row,index)=>{
  row.querySelectorAll('.build-practice-arrow').forEach(btn=>{
   const dir=Number(btn.dataset.buildPracticeMove);
   btn.disabled=dir<0?index===0:index===rows.length-1;
   btn.setAttribute('aria-label','Move correction step '+(index+1)+(dir<0?' up':' down'));
  });
 });
 const result=group.querySelector('.build-practice-result');
 if(result)result.replaceChildren();
}
function enhanceCompletion(page){
 const completion=page.querySelector('.completed-screen');
 if(!completion||completion.dataset.buildEnhanced||methods.size!==5)return;
 completion.dataset.buildEnhanced='true';
 const summary=elem('section','build-round-summary');
 summary.setAttribute('aria-labelledby','build-round-summary-title');
 summary.append(elem('span','build-context-kicker','YOUR PROCEDURE CHECK'),
   elem('h3','build-round-summary-title','What to revisit before an exam'));
 summary.querySelector('.build-round-summary-title').id='build-round-summary-title';
 summary.append(elem('p','build-summary-subtitle',
  'Results below show the first completed check of each method. Revealed models do not earn independent credit.'));
 const list=elem('div','build-summary-list');
 // In the current five-method round every method is presented once.
 const ordered=[...attempts.keys()].map(id=>methods.get(id)).filter(Boolean);
 const rest=[...methods.values()].filter(m=>!ordered.some(row=>row.id===m.id));
 const outcome=Object.fromEntries(attempts);
 for(const row of buildSummary([...ordered,...rest],outcome)){
  const item=elem('div','build-summary-item is-'+row.kind);
  const tag=elem('span','build-summary-symbol',
   row.kind==='correct'?'✓':row.kind==='revealed'?'↗':'!');
  tag.setAttribute('aria-hidden','true');
  const details=elem('div','build-summary-item-copy');
  details.append(elem('strong','build-summary-item-name',row.label),
    elem('span','build-summary-item-status',row.message));
  item.append(tag,details);list.append(item);
 }
 summary.append(list);
 const next=completion.querySelector('.completion-next');
 if(next)next.before(summary);else completion.append(summary);
}
function enhance(){
 if(!isBuild()||!methods.size)return;
 const page=mount.querySelector('.activity-page');
 if(!page)return;
 page.classList.add('build-page');
 enhanceSettings(page);
 const root=panel();
 if(!root){enhanceCompletion(page);return;}
 if(root.dataset.buildEnhanced)return;
 const method=methodFor(root);
 if(!method)return;
 root.dataset.buildEnhanced='true';
 const checked=root.querySelector('.exam-model-list')!==null;
 enhancePreamble(root,method);
 [...root.querySelectorAll('.exam-step[data-step-id]')].forEach((node,index)=>
  enhanceStep(root,node,method,index,checked));
 if(checked)appendCheckedFeedback(root,method);
}
function clearHighlight(){
 dropRow?.classList.remove('is-drop-target');
 dropRow=null;
}
function cleanDrag(){
 if(pointerDrag?.capturer?.hasPointerCapture?.(pointerDrag.pointerId)){
  pointerDrag.capturer.releasePointerCapture(pointerDrag.pointerId);
 }
 pointerDrag?.source?.classList.remove('is-being-dragged');
 ghost?.remove();ghost=null;pointerDrag=null;clearHighlight();
}
function dropIndex(x,y){
 const list=panel()?.querySelector('.build-step-list');
 if(!list)return null;
 const rows=[...list.querySelectorAll('.exam-step[data-step-id]')];
 const rect=list.getBoundingClientRect();
 // When a long list auto-scrolls, its final card moves upwards while the
 // pointer stays near the bottom of the viewport. Accept that bottom region
 // as a request to put the dragged step last, rather than silently cancelling.
 if(x<rect.left-15||x>rect.right+15)return null;
 if(y<rect.top-45||y>rect.bottom+Math.min(220,window.innerHeight*.22))return null;
 if(y<=rect.top)return rows.length?0:null;
 if(y>=rect.bottom)return rows.length?rows.length-1:null;
 const hovered=document.elementFromPoint(x,y)?.closest('.exam-step[data-step-id]');
 if(hovered&&rows.includes(hovered))return rows.indexOf(hovered);
 let best=0,distance=Infinity;
 rows.forEach((row,index)=>{
  const box=row.getBoundingClientRect();
  const d=Math.abs(y-(box.top+box.bottom)/2);
  if(d<distance){best=index;distance=d;}
 });
 return rows.length?best:null;
}
function highlightIndex(index){
 const rows=[...panel()?.querySelectorAll('.build-step-list .exam-step')||[]];
 const next=Number.isInteger(index)?rows[index]:null;
 if(dropRow===next)return;
 clearHighlight();
 if(next){next.classList.add('is-drop-target');dropRow=next;}
}
function moveStepByArrows(id,targetIndex){
 const root=panel();
 if(!root||root.querySelector('.exam-model-list'))return;
 let ids=orderFrom(root);
 let index=ids.indexOf(id);
 if(index<0||targetIndex<0||targetIndex>=ids.length||index===targetIndex)return;
 const dir=index<targetIndex?1:-1;
 while(index!==targetIndex){
  const button=panel()?.querySelector(
   '.exam-step[data-step-id="'+id+'"] [data-action="build-move"][data-dir="'+dir+'"]');
  if(!button||button.disabled)break;
  button.click();index+=dir;
 }
 const actual=orderFrom(panel());
 const method=methodFor();
 const title=STEP_GUIDANCE[method.id][id].title;
 say(title+' moved to position '+(actual.indexOf(id)+1)+' of '+actual.length+'.');
}
function onPointerDown(event){
 if(!isBuild()||event.button!==0||!methods.size||panel()?.querySelector('.exam-model-list'))return;
 const grip=event.target.closest('.build-grip');
 const source=event.target.closest('.build-step[data-step-id]');
 if(!source)return;
 const touch=event.pointerType==='touch'||event.pointerType==='pen';
 if(touch&&!grip)return;
 if(!grip&&event.target.closest('button'))return;
 const capturer=grip||source;
 pointerDrag={source,id:source.dataset.stepId,pointerId:event.pointerId,capturer,
  originX:event.clientX,originY:event.clientY,active:false};
 try{capturer.setPointerCapture(event.pointerId)}catch{/* Pointer capture can be unavailable in older browsers. */}
}
function onPointerMove(event){
 const drag=pointerDrag;
 if(!drag||drag.pointerId!==event.pointerId||!isBuild())return;
 if(!drag.active){
  if(Math.hypot(event.clientX-drag.originX,event.clientY-drag.originY)<9)return;
  drag.active=true;
  drag.source.classList.add('is-being-dragged');
  const method=methodFor();
  ghost=elem('div','build-drag-ghost',STEP_GUIDANCE[method.id][drag.id].title);
  ghost.setAttribute('aria-hidden','true');
  document.body.append(ghost);
 }
 event.preventDefault();
 if(ghost){
  ghost.style.left=(event.clientX+14)+'px';
  ghost.style.top=(event.clientY+13)+'px';
 }
 highlightIndex(dropIndex(event.clientX,event.clientY));
 const listBox=panel()?.querySelector('.build-step-list')?.getBoundingClientRect();
 if(event.clientY>window.innerHeight-52&&listBox?.bottom>window.innerHeight-15){
  window.scrollBy(0,18);
 }else if(event.clientY<65&&listBox?.top<65){
  window.scrollBy(0,-18);
 }
}
function onPointerUp(event){
 const drag=pointerDrag;
 if(!drag||drag.pointerId!==event.pointerId)return;
 const target=drag.active?dropIndex(event.clientX,event.clientY):null;
 const id=drag.id,active=drag.active;
 cleanDrag();
 if(active){
  if(target!==null)moveStepByArrows(id,target);
  else say('No new position selected. The step order is unchanged.');
 }
}
mount.addEventListener('pointerdown',onPointerDown);
mount.addEventListener('pointermove',onPointerMove);
mount.addEventListener('pointerup',onPointerUp);
mount.addEventListener('pointercancel',()=>cleanDrag());
// Capture the first check before app.js grades or replaces the method view.
// The original answer checker remains the only source of saved progress.
mount.addEventListener('click',event=>{
 if(!isBuild()||!methods.size)return;
 const button=event.target.closest('button');
 if(!button||button.disabled)return;
 const root=panel(),method=methodFor(root);
 const command=button.dataset.action;
 if(command==='restart'){attempts.clear();cleanDrag();return;}
 if((command==='build-check'||command==='build-reveal')&&method&&!root?.querySelector('.exam-model-list')){
  const order=orderFrom(root);
  const insights=buildInsights(method,order);
  attempts.set(method.id,{kind:command==='build-reveal'?'revealed':
    insights.correct?'correct':'wrong',order,insights});
 }
 if(button.dataset.buildPracticeMove!==undefined){
  event.stopPropagation();
  const group=button.closest('.build-correction');
  const row=button.closest('.build-correction-step');
  const list=row?.parentElement;
  const rows=[...list?.children||[]];
  const i=rows.indexOf(row),dir=Number(button.dataset.buildPracticeMove);
  if(i<0||i+dir<0||i+dir>=rows.length)return;
  if(dir<0)list.insertBefore(row,rows[i-1]);
  else list.insertBefore(rows[i+1],row);
  updatePracticeList(group);
  row.querySelector('.build-practice-arrow:not(:disabled)')?.focus({preventScroll:true});
  say('Practice step moved to position '+(i+dir+1)+'. No score was recorded.');
 }
 if(button.dataset.buildPracticeCheck!==undefined){
  event.stopPropagation();
  const group=button.closest('.build-correction');
  const ids=[...group.querySelectorAll('[data-build-practice-step]')].map(
   node=>node.dataset.buildPracticeStep);
  const result=buildInsights(method,ids);
  const output=group.querySelector('.build-practice-result');
  output.replaceChildren();
  output.className='build-practice-result '+(result.correct?'is-correct':'is-incorrect');
  output.append(elem('strong','',result.correct?
   'Valid sequence — all compulsory dependencies are met.':
   result.unmet.length+' prerequisite '+(result.unmet.length===1?'relationship still needs':'relationships still need')+' attention.'));
  if(!result.correct){
   const list=elem('ul','');
   for(const problem of result.unmet)list.append(elem('li','',
     problem.beforeTitle+' before '+problem.afterTitle+'. '+problem.why));
   output.append(list);
  }
  output.append(elem('p','','This correction is unscored; it does not alter your first-check result.'));
 }
},true);
mount.addEventListener('change',event=>{
 if(isBuild()&&event.target.matches('#build-method')){attempts.clear();cleanDrag();}
},true);
window.addEventListener('hashchange',()=>{
 const now=location.hash;
 if(now!==lastRoute){
  if(lastRoute.startsWith('#/build/')||now.startsWith('#/build/')){
   attempts.clear();cleanDrag();
  }
  lastRoute=now;
 }
 queueMicrotask(enhance);
});
const observer=new MutationObserver(enhance);
observer.observe(mount,{childList:true,subtree:true});
async function init(){
 try{
  const result=await fetch(new URL('../content/methods.json',import.meta.url));
  if(!result.ok)throw new Error('Sampling method data unavailable');
  const {methods:bank}=await result.json();
  validateBuildBank(bank);
  for(const method of bank)methods.set(method.id,method);
  enhance();
 }catch(error){
  console.warn('Optional Build the Method guidance unavailable:',error);
  // Original arrow-based activity and scoring stay available.
 }
}
init();
