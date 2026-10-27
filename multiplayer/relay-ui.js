/**
 * Pass 6: teacher-friendly, mobile-friendly cooperative Puzzle Relay.
 * Presentation reads only authenticated Worker snapshots. No answer keys,
 * grading rules, winner calculations or client-awarded mosaic tiles.
 */
import {createMosaicPicture} from './mosaic-art-ui.js';
import {MOSAIC_TEAM_NAMES,MOSAIC_TEAM_ICONS} from './mosaic-art.js';
import {critterPortrait} from './avatar-ui.js';

const ROLE_NAMES=['Discover','Evaluate','Improve'];
const ROLE_HINTS=[
  'Identify the method using how the people are selected.',
  'Evaluate a real strength, limitation or possible source of bias.',
  'Suggest a change that improves the sampling design.'
];
const node=(tag,text,klass)=>{
  const el=document.createElement(tag);
  if(text!==undefined)el.textContent=text;
  if(klass)el.className=klass;
  return el;
};
const nameFor=id=>MOSAIC_TEAM_NAMES[id]||'Your team';
function progress(label,current,target){
  const wrap=node('div',undefined,'mosaic-progress-group');
  const header=node('div',undefined,'mosaic-progress-heading');
  header.append(node('strong',label),node('span',current+' / '+target));
  const bar=node('progress');
  bar.max=Math.max(1,target);bar.value=Math.max(0,Math.min(current,target));
  bar.setAttribute('aria-label',label+': '+current+' of '+target);
  wrap.append(header,bar);
  return wrap;
}
function teamMembers(room,teamId){
  return (room?.players||[]).filter(p=>p.teamId===teamId);
}
function teamLobby(room,isHost,stage,button,command){
  const section=node('section',undefined,'mosaic-lobby-panel');
  section.append(node('h3','Your puzzle relay teams'));
  section.append(node('p',
    'Each team needs at least two students. Discover, Evaluate and Improve are different pieces of one puzzle. Roles rotate with each new puzzle.',
    'mosaic-help'));
  const grid=node('div',undefined,'mosaic-lobby-team-grid');
  for(const id of Object.keys(MOSAIC_TEAM_NAMES).slice(0,room.teamCount||0)){
    const members=teamMembers(room,id),ready=members.length>=2;
    const card=node('article',undefined,'mosaic-lobby-team');
    card.dataset.teamId=id;card.dataset.ready=String(ready);
    card.append(node('strong',(MOSAIC_TEAM_ICONS[id]||'✳')+' '+nameFor(id)),
      node('small',members.length+' joined · '+(ready?'Ready':'Needs '+(2-members.length)+' more')));
    const names=node('small',members.length?members.map(p=>p.name).join(' · '):'Waiting for teammates');
    card.append(names);grid.append(card);
  }
  section.append(grid);
  if(isHost){
    const ready=(room.players||[]).length>=room.teamCount*2 &&
      Object.keys(MOSAIC_TEAM_NAMES).slice(0,room.teamCount).every(id=>teamMembers(room,id).length>=2);
    const shuffle=button('Shuffle balanced teams',()=>void command('teams-shuffle'),'btn btn-quiet');
    shuffle.disabled=(room.players||[]).length<2;
    section.append(shuffle,node('p',ready?
      'Every team is ready. Lock joining if needed, then start the shared challenge.':
      'Wait until each team has at least two students before starting.','mosaic-help'));
  }else{
    const me=room.players?.find(p=>p.id===room.me?.id);
    section.append(node('p','Your team: '+nameFor(me?.teamId)+
      '. Your role will appear when the teacher starts.','mosaic-student-team'));
  }
  stage.append(section);
}
function reaction(room,tiles,newCount){
  const last=tiles.at(-1);
  if(!last)return null;
  const teammates=teamMembers(room,last.teamId);
  const strip=node('div',undefined,'mosaic-reaction');
  strip.dataset.new=String(newCount>0);
  const copy=node('div',undefined,'mosaic-reaction-copy');
  copy.append(node('strong',(MOSAIC_TEAM_ICONS[last.teamId]||'✦')+' '+nameFor(last.teamId)+
    ' unlocked '+(newCount>1?'new tiles!':'a mosaic tile!')),
    node('span','Their critters are cheering on the whole class.'));
  const portraits=node('div',undefined,'mosaic-reaction-critters');
  portraits.setAttribute('aria-label','Critters celebrating with '+nameFor(last.teamId));
  for(const p of teammates.slice(0,4)){
    const portrait=critterPortrait(p.avatar,'small');
    portrait.title=p.name;
    portraits.append(portrait);
  }
  strip.append(copy,portraits);
  return strip;
}
function pulse(m,room){
  const solved=m.teams.reduce((sum,t)=>sum+(t.round?.solved.filter(Boolean).length||0),0);
  const locked=m.teams.reduce((sum,t)=>sum+(t.round?.locked.filter(Boolean).length||0),0);
  const contributing=m.teams.filter(t=>t.tiles>0).length;
  const wrap=node('div',undefined,'mosaic-teacher-pulse');
  for(const [amount,caption,alert] of [
    [contributing+' / '+m.teams.length,'Teams with verified tiles',false],
    [String(solved),'Pieces checked in active puzzles',false],
    [String(locked),'Pieces awaiting a reset',locked>0]
  ]){
    const card=node('div',undefined,'mosaic-pulse-stat'+(alert?' is-alert':''));
    card.append(node('strong',amount),node('span',caption));
    wrap.append(card);
  }
  const helper=node('p',locked?
    locked+' role'+(locked===1?' needs':'s need')+
      ' attention. Use Reopen inside the relevant team card; this does not award credit.':
    'Teacher view: progress updates as students submit verified answers. No individual leaderboard.',
    'mosaic-host-note');
  return {wrap,helper};
}
function teamCard(room,m,team,isHost,button,action){
  const card=node('article',undefined,'mosaic-team-card');
  card.dataset.teamId=team.id;
  const heading=node('div',undefined,'mosaic-team-heading');
  heading.append(node('span',MOSAIC_TEAM_ICONS[team.id]||'✳'),
    node('strong',nameFor(team.id)));
  card.append(heading,node('p',team.tiles+' of '+team.cap+
    ' possible team tiles · '+team.memberCount+' teammates','mosaic-team-progress'));
  if(team.round){
    card.append(node('p',team.round.title,'mosaic-puzzle-name'));
    const roles=node('ul',undefined,'mosaic-role-roster');
    for(let i=0;i<ROLE_NAMES.length;i++){
      const solved=Boolean(team.round.solved[i]);
      const locked=Boolean(team.round.locked[i]);
      const status=solved?'complete':locked?'blocked':'waiting';
      const assignee=room.players?.find(p=>p.id===team.round.assignedRoles[i]);
      const line=node('li');line.dataset.status=status;
      line.append(node('strong',(solved?'✓ ':locked?'! ':'○ ')+ROLE_NAMES[i],'mosaic-role-name'),
        node('span',solved?'Checked':locked?'Needs teacher reset':
          assignee?.name||'Working'));
      if(isHost&&locked){
        const reopen=button('Reopen '+ROLE_NAMES[i],()=>void action('mosaic-reopen',
          {teamId:team.id,partIndex:i}),'btn btn-quiet');
        reopen.setAttribute('aria-label','Reopen '+ROLE_NAMES[i]+' for '+nameFor(team.id));
        line.append(reopen);
      }
      roles.append(line);
    }
    card.append(roles);
  }else{
    card.append(node('p','Team allocation complete · keep encouraging the other teams!',
      'mosaic-help'));
  }
  return card;
}
export function createRelayUI({command,button,stageKicker,refreshStage}={}){
  if(typeof command!=='function'||typeof button!=='function'||typeof stageKicker!=='function')
    throw new Error('Missing Class Mosaic UI dependencies');
  let pending=false,cooldownTimer=null;
  async function action(type,payload){
    if(pending)return;
    pending=true;
    try{await command(type,payload);}finally{pending=false;}
  }
  function render(room,isHost,stage){
    const m=room?.mosaic;
    clearTimeout(cooldownTimer);cooldownTimer=null;
    if(!m)return;
    stage.classList.add('is-class-mosaic');
    stage.append(stageKicker('PUZZLE RELAY · CLASS MOSAIC'));
    const wrap=node('section',undefined,'mosaic-shell');
    wrap.setAttribute('aria-label','Our shared sampling mosaic');
    const heading=node('h2',m.achieved?'Our picture is complete!':
      m.status==='finished'?'Our class mosaic journey':'One class. One picture. Many mathematical minds.');
    heading.tabIndex=-1;wrap.append(heading,
      node('p','Three different roles combine to unlock each illustrated tile. Every team helps reveal the same picture.','mosaic-intro'),
      progress('Verified picture tiles',m.completedTiles,m.targetTiles));

    const {figure,newlyRevealed}=createMosaicPicture({
      roomCode:room.code,targetTiles:m.targetTiles,tiles:m.mosaic,achieved:m.achieved,scope:'play'
    });
    wrap.append(figure);
    if(newlyRevealed.length&&m.status==='playing'){
      const banner=node('p',newlyRevealed.length+' new '+(newlyRevealed.length===1?'tile':'tiles')+
        ' revealed by checked mathematical work!','mosaic-unlock-banner');
      banner.setAttribute('role','status');wrap.append(banner);
    }
    const cheers=reaction(room,m.mosaic,newlyRevealed.length);
    if(cheers)wrap.append(cheers);
    if(isHost&&m.status==='playing'){
      const teacher=pulse(m,room);
      wrap.append(teacher.wrap,teacher.helper);
    }

    const teams=node('div',undefined,'mosaic-team-grid');
    teams.setAttribute('aria-label','Current mathematical roles by team');
    for(const team of m.teams)teams.append(teamCard(room,m,team,isHost,button,action));
    wrap.append(teams);

    if(!isHost){
      const me=m.me,task=me?.task,team=m.teams.find(t=>t.id===me?.teamId);
      const work=node('section',undefined,'mosaic-my-task');
      work.append(node('p','YOUR TEAM · '+nameFor(me?.teamId),'mosaic-student-team'));
      work.append(node('span','YOUR RELAY PIECE · '+(task?ROLE_NAMES[task.partIndex].toUpperCase():
        'TEAMMATE SUPPORT'),'mosaic-my-label'));
      const context=team?.round?.context;
      if(context&&m.status==='playing')work.append(node('p',context,'mosaic-scenario'));
      if(m.status==='finished'){
        work.append(node('h3',m.achieved?'Shared victory!':'Our learning counts'),
          node('p',m.achieved?'Every team contributed. Celebrate the mathematical thinking!':
            'The target was not met this time. Every earned tile remains part of our picture.'));
      }else if(task){
        const role=ROLE_NAMES[task.partIndex];
        work.append(node('div',undefined,'mosaic-coach-note'));
        const coach=work.lastElementChild;
        coach.append(node('strong',role+' · What to look for'),
          node('span',ROLE_HINTS[task.partIndex]));
        const question=node('h3',task.prompt);question.id='mosaic-question';
        work.append(question);
        const options=node('div',undefined,'mosaic-options');
        options.setAttribute('role','group');
        options.setAttribute('aria-labelledby','mosaic-question');
        for(const option of task.options){
          const control=button(option.label,()=>void action('mosaic-answer',{
            roundId:task.roundId,partIndex:task.partIndex,choiceId:option.id
          }),'mosaic-option');
          control.dataset.mosaicOption=option.id;
          control.dataset.mosaicRound=task.roundId;
          control.disabled=pending||task.remaining===0||Date.now()<task.tryAfter;
          options.append(control);
        }
        work.append(options);
        if(task.tryAfter>Date.now()&&typeof refreshStage==='function')
          cooldownTimer=setTimeout(refreshStage,task.tryAfter-Date.now()+35);
        if(task.remaining<3)work.append(node('p',task.remaining+
          ' attempt'+(task.remaining===1?'':'s')+' remaining for this piece.','mosaic-small-note'));
        if(task.remaining===0)work.append(node('p',
          'This piece is temporarily locked. Ask the teacher to reopen it; no team progress is lost.','mosaic-warning'));
      }else if(team?.tiles===team?.cap){
        work.append(node('h3','Your team has finished its tiles'),
          node('p','Your verified puzzles are complete. Support the remaining teams by talking through their reasoning.'));
      }else{
        work.append(node('h3','Your piece is complete'),
          node('p','Help your teammates explain their reasoning while the next puzzle is prepared.'));
      }
      if(me?.feedback){
        const feedback=node('p',me.feedback.correct?
          '✓ Verified! '+(me.feedback.explanation||'Your mathematical piece is solved.'):
          'Not quite. '+(me.feedback.hint||'Read the sampling scenario carefully.'),
          'mosaic-feedback'+(me.feedback.correct?' is-correct':''));
        feedback.setAttribute('role','status');
        work.append(feedback);
      }
      wrap.append(work);
    }else if(m.status==='playing'){
      const coaching=node('details',undefined,'mosaic-coach');
      coaching.append(node('summary','Optional classroom discussion prompts'));
      coaching.append(node('p','Ask pupils to identify the selection mechanism, explain where bias could occur, and propose an improvement that still fits the research aim. Avoid giving away a teammate’s assigned answer.','mosaic-help'));
      wrap.append(coaching);
      const end=button('End Class Mosaic early',()=>{
        if(window.confirm('Finish this mosaic? No unearned class victory will be awarded.'))
          void action('close');
      },'btn btn-danger');
      wrap.append(end);
    }

    if(m.status==='finished'){
      const status=node('p',m.achieved?'✦ A shared mathematical achievement — the picture is complete!':
        'Our picture is unfinished, but every revealed tile represents checked mathematical teamwork.',
        'mosaic-outcome');
      status.setAttribute('role','status');wrap.append(status);
    }
    stage.append(wrap);
  }
  return {render,renderLobby:(room,isHost,stage)=>teamLobby(room,isHost,stage,button,command)};
}
