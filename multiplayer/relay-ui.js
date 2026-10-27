/**
 * Pass 5 student/teacher Class Mosaic presentation.
 * SAFE FOR PAGES: imports no puzzle bank, correct answers, scores or grader.
 * The room.mosaic state must be the sanitized per-participant Worker snapshot.
 */
const ROLE_NAMES=['Discover','Evaluate','Improve'];
const TEAM_ICONS={vector:'🐍',sigma:'🐦',delta:'🐬',pi:'🥧'};
const TEAM_NAMES={vector:'Vector Vipers',sigma:'Sigma Sparrows',delta:'Delta Dolphins',pi:'Pi Pythons'};
const node=(tag,text,klass)=>{
 const el=document.createElement(tag);
 if(text!==undefined)el.textContent=text;
 if(klass)el.className=klass;
 return el;
};
function progress(label,current,target){
 const wrap=node('div',undefined,'mosaic-progress-group');
 const header=node('div',undefined,'mosaic-progress-heading');
 header.append(node('strong',label),node('span',current+' / '+target));
 const p=node('progress');p.max=Math.max(1,target);p.value=Math.max(0,Math.min(current,target));
 p.setAttribute('aria-label',label+': '+current+' of '+target);
 wrap.append(header,p);return wrap;
}
export function createRelayUI({command,button,stageKicker,refreshStage}={}){
 if(typeof command!=='function'||typeof button!=='function'||typeof stageKicker!=='function')
   throw Error('Missing Class Mosaic UI dependencies');
 let pending=false,cooldownTimer=null;
 const action=async(type,payload)=>{
  if(pending)return;
  pending=true;
  try{await command(type,payload)}finally{pending=false;}
 };
 function render(room,isHost,stage){
  const m=room?.mosaic;
  clearTimeout(cooldownTimer);cooldownTimer=null;
  if(!m)return;
  stage.classList.add('is-class-mosaic');
  stage.append(stageKicker('PUZZLE RELAY · CLASS MOSAIC'));
  const wrap=node('section',undefined,'mosaic-shell');
  wrap.setAttribute('aria-label','Our shared sampling mosaic');
  const h=node('h2',m.achieved?'Our mosaic is complete!':
    m.status==='finished'?'Our mosaic journey':'One class. Many mathematical minds.');
  h.tabIndex=-1;
  wrap.append(h,node('p','Every team solves three complementary pieces. Each solved puzzle unlocks one tile in our shared classroom mosaic.','mosaic-intro'));
  wrap.append(progress('Class mosaic tiles',m.completedTiles,m.targetTiles));
  const tileGrid=node('div',undefined,'mosaic-grid');
  tileGrid.style.setProperty('--mosaic-columns',String(m.targetTiles===6?3:5));
  tileGrid.setAttribute('role','group');
  tileGrid.setAttribute('aria-label',m.completedTiles+' of '+m.targetTiles+' mosaic tiles unlocked');
  for(let i=0;i<m.targetTiles;i++){
   const won=m.mosaic.find(t=>t.index===i);
   const tile=node('span',won?'✦':'◇','mosaic-tile'+(won?' is-revealed':''));
   tile.dataset.index=String(i);
   tile.style.setProperty('--tile-pattern',String(i%5));
   if(won)tile.dataset.teamId=won.teamId;
   tile.setAttribute('aria-label',won?'Unlocked tile '+(i+1):'Locked tile '+(i+1));
   tileGrid.append(tile);
  }
  wrap.append(tileGrid);
  const teams=node('div',undefined,'mosaic-team-grid');
  for(const team of m.teams){
   const card=node('article',undefined,'mosaic-team-card');
   const heading=node('div',undefined,'mosaic-team-heading');
   heading.append(node('span',TEAM_ICONS[team.id]||'✳'),
     node('strong',TEAM_NAMES[team.id]||'Team '+team.id));
   card.append(heading,node('p',team.tiles+' of '+team.cap+' possible team tiles','mosaic-team-progress'));
   if(team.round)card.append(node('p',team.round.title,'mosaic-puzzle-name'));
   const partRow=node('div',undefined,'mosaic-part-row');
   if(team.round){
    for(const [i,solved] of team.round.solved.entries()){
     const part=node('span',(solved?'✓ ':'○ ')+ROLE_NAMES[i],
       'mosaic-part'+(solved?' is-solved':''));
     part.setAttribute('aria-label',ROLE_NAMES[i]+' piece '+(solved?'solved':'not yet solved'));
     partRow.append(part);
    }
   }else partRow.append(node('span','Contribution complete · help another team!'));
   card.append(partRow);
   if(isHost&&team.round?.locked){
    team.round.locked.forEach((locked,index)=>{
     if(locked){
      const control=button('Reopen '+ROLE_NAMES[index],()=>void action('mosaic-reopen',
        {teamId:team.id,partIndex:index}),'btn btn-quiet');
      control.disabled=pending;card.append(control);
     }
    });
   }
   teams.append(card);
  }
  wrap.append(teams);
  if(!isHost){
   const me=m.me;
   const task=me?.task;
   const work=node('section',undefined,'mosaic-my-task');
   work.append(node('span','YOUR RELAY PIECE · '+(task?ROLE_NAMES[task.partIndex].toUpperCase():'TEAMMATE SUPPORT'),
     'mosaic-my-label'));
   const context=m.teams.find(t=>t.id===me?.teamId)?.round?.context;
   if(context&&m.status==='playing')work.append(node('p',context,'mosaic-scenario'));
   if(m.status==='finished'){
    work.append(node('h3',m.achieved?'Shared victory!':'Our learning counts'),
      node('p',m.achieved?'Every team contributed. Celebrate the careful mathematical thinking!':
        'The target was not met this time. You still helped build our collective mosaic.'));
   }else if(task){
    work.append(node('h3',task.prompt));
    const fieldset=node('div',undefined,'mosaic-options');
    fieldset.setAttribute('role','group');
    fieldset.setAttribute('aria-label','Choose one mathematical answer');
    for(const option of task.options){
     const control=button(option.label,()=>void action('mosaic-answer',{
       roundId:task.roundId,partIndex:task.partIndex,choiceId:option.id
     }),'mosaic-option');
     control.disabled=pending||task.remaining===0||Date.now()<task.tryAfter;
     fieldset.append(control);
    }
    work.append(fieldset);
    if(task.tryAfter>Date.now()&&typeof refreshStage==='function')
      cooldownTimer=setTimeout(refreshStage,task.tryAfter-Date.now()+30);
    if(task.remaining<3)work.append(node('p',task.remaining+' attempts remaining for this piece.','mosaic-small-note'));
    if(task.remaining===0)work.append(node('p','This piece needs a teacher reset. Your team progress is preserved.','mosaic-warning'));
   }else{
    work.append(node('h3','Your piece is complete'),node('p','Help your teammates explain their reasoning while the next puzzle is prepared.'));
   }
   if(me?.feedback){
    const feedback=node('p',me.feedback.correct?
      '✓ Verified! '+(me.feedback.explanation||'Your mathematical piece is solved.'):
      'Not yet. '+(me.feedback.hint||'Read the sampling description carefully.'),
      'mosaic-feedback'+(me.feedback.correct?' is-correct':''));
    feedback.setAttribute('role','status');work.append(feedback);
   }
   wrap.append(work);
  }else if(m.status==='playing'){
   wrap.append(node('p','Teacher view: each student sees only their own assigned mathematical piece. When three different roles are solved, the team earns one mosaic tile.','mosaic-host-note'));
   const end=button('End Class Mosaic early',()=>{
    if(window.confirm('Finish this mosaic? No unearned class win will be awarded.'))
      void action('close');
   },'btn btn-danger');wrap.append(end);
  }
  if(m.status==='finished'){
   const status=node('p',m.achieved?'✦ A shared mathematical achievement!':
     'The mosaic is complete for today. Every earned tile remains part of our story.',
     'mosaic-outcome');status.setAttribute('role','status');wrap.append(status);
  }
  stage.append(wrap);
 }
 return {render};
}