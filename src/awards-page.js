import {
  AWARDS,AWARDS_KEY,AWARD_GROUPS,awardStatus,earnedAwards,
  loadAwards,saveAwards,clearAwards,exportAwardBackup,restoreAwardBackup
} from './awards.js';
import {ARENA_AWARDS} from '../multiplayer/award-catalogue.js';
import {MULTIPLAYER_KEEPSAKES_KEY,keepsakeSummary,loadKeepsakes} from '../multiplayer/keepsakes.js';

const root=document.getElementById('cabinet-grid');
const filters=document.getElementById('cabinet-filters');
const live=document.getElementById('cabinet-notice');
const input=document.getElementById('cabinet-import');
const count=document.getElementById('cabinet-count');
const progress=document.getElementById('cabinet-progress');
const empty=document.getElementById('cabinet-empty');
let cabinet=loadAwards();
let filter='all';

function node(tag,cls,text){
  const e=document.createElement(tag);
  if(cls)e.className=cls;
  if(text!==undefined)e.textContent=text;
  return e;
}
function say(message){live.textContent=message;}
function card(award){
  const status=awardStatus(cabinet,award.id);
  const isEarned=status.earned;
  const article=node('article','trophy-card'+(isEarned?' is-earned':' is-locked'));
  article.setAttribute('data-award-id',award.id);
  const head=node('div','trophy-head');
  const portrait=node('div','trophy-portrait',award.emoji);
  portrait.setAttribute('aria-hidden','true');
  const caption=node('div','trophy-caption');
  caption.append(node('span','trophy-serial',award.group),
    node('span','trophy-state',isEarned?'✦ COLLECTED':'◇ NOT YET EARNED'));
  head.append(portrait,caption);
  const title=node('h3','trophy-title',award.name);
  const description=node('p','trophy-description',award.description);
  const stamp=node('p','trophy-evidence',award.level==='verified'?
    'Checked in a Solo Arcade activity':'Self-rated or written practice · Not auto-graded');
  const footer=node('div','trophy-bottom');
  const meta=node('div','trophy-progress-row');
  meta.append(node('strong','',isEarned?'Award unlocked':'Your progress'),
    node('span','',status.current+' / '+status.target));
  const bar=node('progress','trophy-meter');
  bar.value=status.current;bar.max=status.target;
  bar.setAttribute('aria-label',award.name+': '+status.current+' of '+status.target);
  const how=node('p','trophy-hint',isEarned?
    'Collected '+new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).
      format(new Date(status.unlockedAt||Date.now())):award.hint);
  footer.append(meta,bar,how);
  article.append(head,title,description,stamp,footer);
  return article;
}
function renderKeepsakes(){
  const summary=keepsakeSummary(loadKeepsakes());
  const count=document.getElementById('keepsake-count');
  count.textContent=summary.length+' / '+ARENA_AWARDS.length;
  const root=document.getElementById('keepsake-grid'),empty=document.getElementById('keepsake-empty');
  const content=document.createDocumentFragment();
  for(const award of summary){
    const tile=node('article','keepsake-tile');
    tile.dataset.keepsakeId=award.id;
    const portrait=node('span','keepsake-portrait',award.emoji);
    portrait.setAttribute('aria-hidden','true');
    const details=node('div','keepsake-details');
    details.append(node('span','keepsake-state','✦ FROM MULTIPLAYER'),
      node('h3','keepsake-name',award.name),
      node('p','keepsake-reason',award.detail),
      node('p','keepsake-when','Collected '+award.earnedCount+
        (award.earnedCount===1?' time':' times')+' · Most recent '+new Date(award.mostRecent)
          .toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})));
    tile.append(portrait,details);content.append(tile);
  }
  root.replaceChildren(content);empty.hidden=summary.length>0;
}
function render(){
  renderKeepsakes();
  cabinet=loadAwards();
  const achieved=earnedAwards(cabinet).length;
  count.textContent=achieved+' / '+AWARDS.length;
  progress.value=achieved;
  progress.max=AWARDS.length;
  progress.setAttribute('aria-label',achieved+' of '+AWARDS.length+' awards collected');
  document.getElementById('cabinet-remaining').textContent=
    achieved===AWARDS.length?'Every collectible found!':(AWARDS.length-achieved)+' still to discover';
  for(const button of filters.querySelectorAll('[data-filter]')){
    const selected=button.dataset.filter===filter;
    button.setAttribute('aria-pressed',String(selected));
    button.textContent=button.dataset.label+' ('+(button.dataset.filter==='all'?AWARDS.length:
      button.dataset.filter==='earned'?achieved:AWARDS.length-achieved)+')';
  }
  const visible=AWARDS.filter(x=>filter==='all'||(filter==='earned'?
    Boolean(cabinet.unlocked[x.id]):!cabinet.unlocked[x.id]));
  const fragment=document.createDocumentFragment();
  for(const group of AWARD_GROUPS){
    const subset=visible.filter(x=>x.group===group);
    if(!subset.length)continue;
    const section=node('section','trophy-group');
    const heading=node('h2','trophy-group-title',group);
    section.append(heading);
    const grid=node('div','trophy-grid');
    for(const award of subset)grid.append(card(award));
    section.append(grid);fragment.append(section);
  }
  root.replaceChildren(fragment);
  empty.hidden=visible.length!==0;
  if(!visible.length)empty.textContent=filter==='earned'?
    'No awards collected yet. Choose an activity and let the mathematics do the talking.':
    'You have collected every available award. Brilliant persistence!';
}
filters.addEventListener('click',event=>{
  const button=event.target.closest('button[data-filter]');
  if(!button)return;
  filter=button.dataset.filter;render();
});
document.getElementById('cabinet-export').addEventListener('click',()=>{
  try{
    const json=exportAwardBackup(cabinet);
    const url=URL.createObjectURL(new Blob([json],{type:'application/json;charset=utf-8'}));
    const anchor=node('a');
    anchor.href=url;anchor.download='sampling-arcade-awards-'+new Date().toISOString().slice(0,10)+'.json';
    document.body.append(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
    say('Awards backup downloaded. It contains no student name or Solo progress.');
  }catch{say('Unable to export the awards on this device.');}
});
document.getElementById('cabinet-import-button').addEventListener('click',()=>input.click());
input.addEventListener('change',async()=>{
  const file=input.files?.[0];input.value='';
  if(!file)return;
  if(file.size>100000){say('That file is too large to be an awards backup.');return;}
  try{
    const next=restoreAwardBackup(await file.text(),cabinet);
    if(!confirm('Merge awards from this backup with this browser’s cabinet? Your Solo progress and exam writing will not change.'))return;
    if(!saveAwards(next))throw new Error('Saving is unavailable on this device.');
    render();say('Awards restored and merged. Solo progress was not changed.');
  }catch(error){say('Import not completed: '+error.message);}
});
document.getElementById('cabinet-clear').addEventListener('click',()=>{
  if(!confirm('Clear only your collected awards on this browser? Your Solo progress and exam writing will remain unchanged. This cannot be undone unless you have an awards backup.'))return;
  if(!clearAwards()){say('Local storage could not be cleared.');return;}
  render();say('This browser’s Trophy Cabinet is now empty. Other Solo progress remains saved.');
});
document.getElementById('keepsake-reset').addEventListener('click',()=>{
  if(!confirm('Clear the Multiplayer keepsakes on this browser? This cannot be undone. Solo awards, progress and exam writing will stay unchanged.'))return;
  try{localStorage.removeItem(MULTIPLAYER_KEEPSAKES_KEY);renderKeepsakes();
    say('Multiplayer keepsakes cleared. Solo trophies and progress were not changed.');
  }catch{say('Unable to clear Multiplayer keepsakes on this device.');}
});
window.addEventListener('storage',event=>{
  if(event.key===AWARDS_KEY)render();
  if(event.key===MULTIPLAYER_KEEPSAKES_KEY)renderKeepsakes();
});
render();
