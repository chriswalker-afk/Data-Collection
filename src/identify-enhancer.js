// Which Method? premium presentation layer.
// A progressive enhancement of the existing, tested scenario renderer.
// Its answer buttons still call the original marker and local progress engine.
import {METHOD_LABELS,METHOD_ORDER} from './phase2.js';
import {evidenceParts,contrastForChoice,methodPerformance,reviewScenarioDeck} from './identify.js';

const mount=document.getElementById('app');
const responses=new Map();
const bank=new Map();
let previousRoute=location.hash;
let observing=false;

function el(tag,cls='',text=''){
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text)node.textContent=text;
 return node;
}
const isIdentify=()=>location.hash.startsWith('#/identify/');
const displayName=id=>METHOD_LABELS[id]||id;
const record=(id,chosen)=>{
 const entry=bank.get(id);
 if(entry&&!responses.has(id)){
  responses.set(id,{choice:chosen,correct:chosen===entry.correctMethod});
 }
};
function enhanceSettings(){
 const chooser=mount.querySelector('#scenario-length');
 if(!chooser)return;
 const settings=chooser.closest('.game-settings');
 if(!settings||settings.dataset.identifyEnhanced)return;
 settings.dataset.identifyEnhanced='true';
 settings.classList.add('identify-settings');
 const note=el('p','identify-settings-note',
  'Five methods in every round. Look for the selection rule, not just who is surveyed.');
 settings.append(note);
}
function scenarioText(node,scenario,answered){
 if(!answered)return;
 const parts=evidenceParts(scenario);
 const mark=el('mark','identify-evidence-mark',parts.quote);
 mark.setAttribute('data-key-evidence','');
 node.replaceChildren(parts.before,mark,parts.after);
}
function enhanceOptions(panel,scenario,answered){
 const choices=panel.querySelector('.classification-options');
 if(!choices)return;
 choices.classList.add('identify-options');
 choices.setAttribute('aria-label','Choose the sampling method used in this scenario');
 const all=[...choices.querySelectorAll('.classification-choice')];
 for(const [index,button] of all.entries()){
  const id=button.dataset.choice;
  const label=displayName(id);
  const right=answered&&scenario.correctMethod===id;
  const wrong=answered&&button.classList.contains('is-incorrect');
  button.classList.add('identify-choice');
  if(answered&&!right&&!wrong)button.classList.add('is-muted');
  const letter=el('span','identify-choice-letter',String.fromCharCode(65+index));
  letter.setAttribute('aria-hidden','true');
  const name=el('span','identify-choice-label',label);
  const check=el('span','identify-choice-check',right?'✓':wrong?'×':'');
  check.setAttribute('aria-hidden','true');
  button.replaceChildren(letter,name,check);
  button.setAttribute('aria-label',label+
    (right?', correct answer':wrong?', your incorrect answer':''));
 }
}
function createEvidenceDetail(scenario){
 const parts=evidenceParts(scenario);
 const section=el('div','identify-evidence-detail');
 section.append(el('span','identify-feedback-kicker','DECISIVE EVIDENCE'),
  el('p','identify-evidence-quote','“'+parts.quote+'”'),
  el('p','identify-evidence-why',scenario.reason));
 return section;
}
function enhanceFeedback(panel,scenario){
 const feedback=panel.querySelector('.classification-feedback');
 if(!feedback||feedback.dataset.identifyEnhanced)return;
 feedback.dataset.identifyEnhanced='true';
 feedback.classList.add('identify-feedback');
 const chosen=[...panel.querySelectorAll('.classification-choice')].find(button=>
  button.getAttribute('aria-pressed')==='true')?.dataset.choice;
 const correct=chosen===scenario.correctMethod;
 const detail=createEvidenceDetail(scenario);
 const description=el('p','identify-result-description',
  correct?'You recognised the selection rule. Notice exactly which phrase makes it decisive.':
    'Compare your choice with the actual method of selecting individuals.');
 const feedbackBody=feedback.querySelector('.ui-feedback-body')||feedback;
 feedbackBody.insertBefore(description,feedbackBody.querySelector('.feedback-heading')?.nextSibling||feedbackBody.firstChild);
 // Preserve the original feedback paragraph and original audited contrast.
 const originalContrast=feedback.querySelector('.feedback-contrast');
 if(originalContrast){
  originalContrast.classList.add('identify-original-contrast');
  originalContrast.before(detail);
 }
 else feedback.append(detail);
 if(!correct&&chosen&&METHOD_ORDER.includes(chosen)){
  const whyNot=el('div','identify-why-not');
  whyNot.append(el('span','identify-feedback-kicker','WHY NOT '+displayName(chosen).toUpperCase()+'?'),
    el('p','identify-targeted-contrast',contrastForChoice(scenario,chosen)));
  if(originalContrast)originalContrast.before(whyNot);
  else feedback.append(whyNot);
 }
 if(originalContrast){
  originalContrast.before(el('span','identify-feedback-kicker identify-other-kicker','ANOTHER USEFUL DISTINCTION'));
 }
}
function enhanceQuestion(panel){
 if(panel.dataset.identifyEnhanced)return;
 panel.dataset.identifyEnhanced='true';
 panel.classList.add('identify-panel');
 const scenario=bank.get(panel.dataset.itemId);
 if(!scenario)return;
 const answered=Boolean(panel.querySelector('.classification-choice:disabled'));
 panel.dataset.identifyState=answered?'answered':'question';
 panel.dataset.identifyMethod=scenario.correctMethod;
 const eyebrow=panel.querySelector(':scope > .eyebrow');
 if(eyebrow)eyebrow.textContent='CASE STUDY · SELECTION METHOD';
 const title=panel.querySelector('.classification-title');
 if(title)title.textContent='Which sampling method was used?';
 const statement=panel.querySelector('.classification-statement');
 if(statement){
  statement.classList.add('identify-scenario');
  statement.id='identify-scenario-text';
  scenarioText(statement,scenario,answered);
 }
 const note=panel.querySelector('.choose-note');
 if(note){
  note.classList.add('identify-choice-note');
  note.textContent=answered?'The decisive wording is highlighted above. Compare the methods below.':
    'Think about the rule for choosing individuals, then make your selection.';
 }
 enhanceOptions(panel,scenario,answered);
 if(answered)enhanceFeedback(panel,scenario);
}
function resultCard(scenario,chosen){
 const part=evidenceParts(scenario);
 const item=el('article','identify-review-case');
 item.append(el('p','identify-review-title',displayName(scenario.correctMethod)),
  el('p','identify-review-prompt',scenario.prompt),
  el('p','identify-review-key','Key phrase: “'+part.quote+'”'),
  el('p','identify-review-why',scenario.reason),
  el('p','identify-review-trap','Why '+displayName(chosen)+' was not correct: '+contrastForChoice(scenario,chosen)));
 return item;
}
function enhanceCompletion(){
 const completed=mount.querySelector('.completed-screen');
 if(!completed||completed.dataset.identifyEnhanced||responses.size===0)return;
 completed.dataset.identifyEnhanced='true';
 const items=[...responses.keys()].map(id=>bank.get(id)).filter(Boolean);
 const scored=Object.fromEntries(responses);
 const rows=methodPerformance(items,scored);
 const missed=reviewScenarioDeck(items,new Set([...responses].filter(([,entry])=>!entry.correct).map(([id])=>id)));
 const summary=el('section','identify-summary');
 summary.setAttribute('aria-labelledby','identify-summary-title');
 summary.append(el('span','identify-summary-eyebrow','YOUR RETRIEVAL SNAPSHOT'),
  el('h3','identify-summary-title','How did you recognise each method?'));
 summary.querySelector('.identify-summary-title').id='identify-summary-title';
 summary.append(el('p','identify-summary-caption',
  'First-attempt accuracy by sampling method. These are practice results, not examination grades.'));
 const grid=el('div','identify-summary-grid');
 for(const row of rows){
  const line=el('div','identify-summary-row');
  const head=el('div','identify-summary-row-head');
  head.append(el('span','identify-summary-label',row.label),
    el('span','identify-summary-result',row.correct+' / '+row.total));
  const meter=el('div','identify-summary-meter');
  meter.setAttribute('role','meter');
  meter.setAttribute('aria-label',row.label+': '+row.correct+' out of '+row.total+' correct');
  meter.setAttribute('aria-valuemin','0');meter.setAttribute('aria-valuemax',String(row.total));
  meter.setAttribute('aria-valuenow',String(row.correct));
  const fill=el('span','identify-summary-fill');
  fill.style.width=(100*row.correct/row.total)+'%';
  meter.append(fill);
  line.append(head,meter);grid.append(line);
 }
 summary.append(grid);
 if(missed.length){
  const details=el('details','identify-review');
  details.append(el('summary','identify-review-toggle',
    'Study '+missed.length+' missed case'+(missed.length===1?'':'s')+' and their decisive clues'));
  const review=el('div','identify-review-list');
  for(const scenario of missed)review.append(resultCard(scenario,scored[scenario.id].choice));
  details.append(review);
  summary.append(details);
 }else{
  summary.append(el('p','identify-summary-perfect',
    'All five methods were recognised correctly in this round. Try explaining the method differences aloud.'));
 }
 const next=completed.querySelector('.completion-next');
 if(next)completed.insertBefore(summary,next);
 else completed.append(summary);
}
function enhance(){
 if(!isIdentify()||!bank.size)return;
 enhanceSettings();
 const panel=mount.querySelector('.classification-panel');
 if(panel)enhanceQuestion(panel);
 enhanceCompletion();
}
function resetResults(){responses.clear();}
mount.addEventListener('click',event=>{
 if(!isIdentify())return;
 const button=event.target.closest('button[data-action]');
 if(!button||button.disabled)return;
 if(button.dataset.action==='classify-option'){
  const panel=button.closest('[data-item-id]');
  if(panel)record(panel.dataset.itemId,button.dataset.choice);
 }else if(button.dataset.action==='restart'){
  resetResults();
 }
},true);
mount.addEventListener('change',event=>{
 if(isIdentify()&&event.target.matches('#scenario-length'))resetResults();
},true);
window.addEventListener('hashchange',()=>{
 if(location.hash!==previousRoute){
  if(!previousRoute.startsWith('#/identify/')||!isIdentify())resetResults();
  previousRoute=location.hash;
 }
 queueMicrotask(enhance);
});
function observe(){
 if(observing)return;
 observing=true;
 const observer=new MutationObserver(()=>enhance());
 observer.observe(mount,{childList:true,subtree:true});
 enhance();
}
async function start(){
 observe();
 try{
  const url=new URL('../content/scenarios.json',import.meta.url);
  const response=await fetch(url);
  if(!response.ok)throw new Error('Unable to load Which Method? scenario evidence.');
  const payload=await response.json();
  for(const scenario of payload.scenarios)bank.set(scenario.id,scenario);
  enhance();
 }catch(error){
  // The original activity remains fully functional if its optional explanation
  // layer cannot load. Do not add duplicate error UI or disturb saved progress.
  console.warn('Optional Which Method? guidance unavailable:',error);
 }
}
start();
