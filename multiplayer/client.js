import {createHostStudio} from './host-studio-ui.js';
import {createBlitzUI} from './blitz-ui.js';
import {ARENA_MODES,createModeUI} from './mode-ui.js';
import {createCeremonyUI} from './ceremony-ui.js';
import {createTeamUI} from './team-ui.js';
import {saveKeepsake} from './keepsakes.js';
import {safeAvatar,validAvatar,AVATAR_STORAGE_KEY} from './avatar.js';
import {critterPortrait} from './avatar-ui.js';
// Multiplayer networking is independent of the solo practice/progress store.
// Requests that change scores are authenticated HTTPS actions; room updates
// arrive on a hibernatable WebSocket (with slow polling only during reconnect).
const API=(window.__SAMPLING_MULTIPLAYER_API__||'https://sampling-arcade-multiplayer.chris-walker-d8b.workers.dev').replace(/\/$/,'');
const LABELS=Object.freeze({
  'simple-random':'Simple random sampling',systematic:'Systematic sampling',
  stratified:'Stratified sampling',quota:'Quota sampling',opportunity:'Opportunity sampling'
});
const STORAGE_KEY='sampling-arcade-multiplayer-v1';
const gameMode=()=>$('game-mode').value;
const modeName=game=>ARENA_MODES[game||'which']?.label||'Which Method?';
const PACE_NAMES=Object.freeze({blitz:'Blitz',bullseye:'Bullseye',perfect:'Perfect Run'});
const isPaced=objective=>Object.hasOwn(PACE_NAMES,objective);
const isRace=objective=>objective==='bullseye'||objective==='perfect';
const $=id=>document.getElementById(id);
let roomCode=null,token=null,isHost=false,room=null,websocket=null;
let generation=0,retryTimer=null,pollTimer=null,clockTimer=null,backoff=750;
let clockOffset=0,pendingAnswer=false,avatarUpdateInFlight=null;
// A one-frame score celebration is based only on the previous visible server score.
const displayedScores=new Map();
let displayedRoomCode=null;
const make=(tag,text,className)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;};
function button(label,callback,className='btn btn-primary'){
  const el=make('button',label,className);el.type='button';el.onclick=callback;return el;
}
function notice(message){$('notice').textContent=message||'';}
function connection(message){$('connection').textContent=message||'';}
async function api(path,body,requiresToken=false){
  const hasBody=body!==undefined;
  const response=await fetch(API+path,{
    method:hasBody?'POST':'GET',cache:'no-store',
    headers:{...(hasBody?{'Content-Type':'application/json'}:{}),
      ...(requiresToken?{Authorization:'Bearer '+token}:{})},
    ...(hasBody?{body:JSON.stringify(body)}:{})
  });
  let result;try{result=await response.json();}catch{throw new Error('Unable to reach the classroom service');}
  if(!response.ok)throw new Error(result.error||'Classroom request failed');
  return result;
}
function savedCritter(){
  try{return safeAvatar(JSON.parse(localStorage.getItem(AVATAR_STORAGE_KEY)));}catch{return safeAvatar(null);}
}
function store(){sessionStorage.setItem(STORAGE_KEY,JSON.stringify({roomCode,token,isHost}));}
function stopConnections(){
  generation+=1;
  clearTimeout(retryTimer);clearInterval(pollTimer);clearInterval(clockTimer);
  retryTimer=pollTimer=clockTimer=null;
  if(websocket){const previous=websocket;websocket=null;previous.onclose=null;previous.close();}
}
function leave(){
  stopConnections();sessionStorage.removeItem(STORAGE_KEY);
  roomCode=null;token=null;isHost=false;room=null;pendingAnswer=false;
  displayedScores.clear();displayedRoomCode=null;
  connection('');notice('');render();
}
async function createRoom(){
  try{
    // Only validated Classic, Blitz, Bullseye and Perfect Run settings reach
    // the Worker. Puzzle Relay and Class Quest remain previews.
    const settings=hostStudio.liveSettings();
    notice('Creating the classroom…');
    const response=await api('/rooms',{
      roundLength:settings.roundLength,game:settings.game,
      objective:settings.objective,minutes:settings.minutes,
      ...(settings.objective==='bullseye'?{
        accuracyTarget:settings.accuracyTarget,accuracyWindow:settings.accuracyWindow
      }:{}),
      ...(settings.objective==='perfect'?{streakTarget:settings.streakTarget}:{})
    });
    roomCode=response.code;token=response.token;isHost=true;store();
    const setupWarnings=[];
    // These are the existing authenticated lobby commands, not new gameplay.
    if(settings.teamCount){
      try{await api('/rooms/'+roomCode+'/command',{type:'teams-set',count:settings.teamCount},true);}
      catch{setupWarnings.push('Team setup could not be applied. Set teams in the lobby before starting.');}
    }
    if(settings.goalTarget){
      try{await api('/rooms/'+roomCode+'/command',{type:'goal-set',target:settings.goalTarget},true);}
      catch{setupWarnings.push('Class goal could not be applied. Set it in the lobby before starting.');}
    }
    notice(setupWarnings.join(' '));connect();
  }catch(e){notice(e.message);}
}
async function joinRoom(){
  try{
    const typed=$('room-code').value.replace(/\s/g,'');
    if(!/^\d{6}$/.test(typed))throw new Error('Enter the six-digit room code');
    notice('Joining the classroom…');
    const response=await api('/rooms/'+typed+'/join',{name:$('nickname').value,avatar:savedCritter()});
    roomCode=response.code;token=response.token;isHost=false;store();notice('');
    connect();
  }catch(e){notice(e.message);}
}
function receiveState(data){
  if(!data||data.code!==roomCode)return;
  if(room?.question?.id!==data.question?.id)pendingAnswer=false;
  const previous=room?.status+'|'+(room?.question?.id||room?.reveal?.question?.id||'')+
    '|'+(room?.ceremony?.run||0)+'|'+(room?.ceremony?.step??'-');
  room=data;
  // On returning from the standalone creator, resynchronise an authenticated
  // student's saved choice while the room is still in the lobby.
  if(!isHost && room.status==='lobby'){
    const mine=room.players?.find(p=>p.id===room.me?.id);
    const local=savedCritter();
    if(mine && JSON.stringify(safeAvatar(mine.avatar))!==JSON.stringify(local) &&
      (!avatarUpdateInFlight || avatarUpdateInFlight!==JSON.stringify(local))){
      avatarUpdateInFlight=JSON.stringify(local);
      void command('avatar-set',{avatar:local}).finally(()=>{avatarUpdateInFlight=null;});
    }
  }
  if(data.myMultiplayerAwards?.completed&&data.myMultiplayerAwards.awarded?.length){
    saveKeepsake(data.myMultiplayerAwards);
  }
  if(room.question?.serverNow||room.blitz?.serverNow)
    clockOffset=(room.question?.serverNow||room.blitz?.serverNow)-Date.now();
  render();
  const current=room.status+'|'+(room.question?.id||room.reveal?.question?.id||'')+
    '|'+(room.ceremony?.run||0)+'|'+(room.ceremony?.step??'-');
  if(previous!=='undefined|'&&previous!==current){
    const announcement=room.status==='playing'?
      (isPaced(room.objective)?PACE_NAMES[room.objective]+' is live':
        'New question '+room.question.index+' of '+room.question.total):
      room.status==='reveal'?'Answer revealed':
      room.status==='ceremony'?'Awards ceremony reveal '+(room.ceremony.step+1)+' of '+room.ceremony.total:
      room.status==='finished'?'Round complete':'Classroom lobby';
    $('game-announcer').textContent=announcement;
  }
}
async function refresh(){
  if(!token||!roomCode)return;
  try{
    receiveState(await api('/rooms/'+roomCode+'/state',undefined,true));
  }catch(e){
    if(/Session not found|Room expired|unavailable/i.test(e.message)){
      leave();notice('That room has ended. You can create or join another.');
    }else{connection('Reconnecting…');}
  }
}
function scheduleReconnect(version){
  if(version!==generation||!token)return;
  connection('Reconnecting…');
  if(!pollTimer){
    void refresh();
    pollTimer=setInterval(()=>{void refresh();},15000);
  }
  clearTimeout(retryTimer);
  retryTimer=setTimeout(()=>{void connectSocket(version);},backoff);
  backoff=Math.min(16000,Math.round(backoff*1.8));
}
async function connectSocket(version){
  if(version!==generation||!token)return;
  try{
    const {participantId,ticket}=await api('/rooms/'+roomCode+'/socket-ticket',{},true);
    if(version!==generation)return;
    const wsURL=API.replace(/^http/,'ws')+'/rooms/'+roomCode+'/ws?id='+
      encodeURIComponent(participantId)+'&ticket='+encodeURIComponent(ticket);
    const ws=new WebSocket(wsURL);websocket=ws;
    ws.onopen=()=>{
      if(version!==generation)return;
      backoff=750;connection('Live connection');
      if(pollTimer){clearInterval(pollTimer);pollTimer=null;}
    };
    ws.onmessage=event=>{
      if(version!==generation)return;
      try{const msg=JSON.parse(event.data);if(msg.type==='state')receiveState(msg.data);}
      catch{ /* malformed messages are ignored rather than displayed */ }
    };
    ws.onerror=()=>{if(version===generation)connection('Connection interrupted');};
    ws.onclose=event=>{
      if(version!==generation)return;
      websocket=null;
      if(event.code===4003){leave();notice('Your teacher removed this nickname from the room.');return;}
      if(event.code===1000){void refresh();return;}
      scheduleReconnect(version);
    };
  }catch(e){
    if(version!==generation)return;
    if(/Session not found|Room expired/i.test(e.message)){
      leave();notice('The room has expired. Please join another.');
      return;
    }
    scheduleReconnect(version);
  }
}
function connect(){
  stopConnections();const version=generation;
  backoff=750;connection('Connecting…');
  void refresh();
  void connectSocket(version);
}
async function command(type,method,targetId){
  if(!token)return;
  try{
    const request={type,...(method?typeof method==='string'?{method}:{...method}:{}),...(targetId?{targetId}:{})};
    if(type==='answer'){pendingAnswer=true;render();}
    await api('/rooms/'+roomCode+'/command',request,true);
    // Socket push is authoritative; HTTP refresh protects against a lost push.
    if(websocket?.readyState!==WebSocket.OPEN)await refresh();
  }catch(e){
    if(type==='answer')pendingAnswer=false;
    notice(e.message);render();
  }
}
function updateClock(){
  if(isPaced(room?.objective)&&room.status==='playing'){
    const blitzTimer=$('blitz-clock');
    const remaining=Math.max(0,room.blitz.endAt-(Date.now()+clockOffset));
    const seconds=Math.ceil(remaining/1000);
    if(blitzTimer){
      const minutes=Math.floor(seconds/60),rest=String(seconds%60).padStart(2,'0');
      blitzTimer.textContent=minutes+':'+rest+' remaining';
      blitzTimer.classList.toggle('time-up',seconds===0);
    }
    if(seconds===0){
      for(const control of document.querySelectorAll(
        '#stage .blitz-options button,#stage .blitz-recall-form input,#stage .blitz-recall-form button,#stage .blitz-board-select,#stage .blitz-submit,#stage .blitz-next')){
        control.disabled=true;
      }
    }
    return;
  }
  const timer=$('question-clock');
  if(!timer||!room?.question)return;
  const seconds=Math.max(0,Math.ceil((room.question.deadline-(Date.now()+clockOffset))/1000));
  timer.textContent=seconds+'s remaining';
  timer.classList.toggle('time-up',seconds===0);
  const reveal=$('host-reveal');
  if(reveal)reveal.disabled=seconds>0&&!room.players.every(p=>p.answered);
  if(seconds===0){
    for(const control of document.querySelectorAll('#stage .method-option, #stage .arena-term, #stage .arena-definition, #stage .arena-sort-card, #stage .arena-zone-action, #stage .arena-submit, #stage #arena-speed-form input, #stage #arena-speed-form button')){
      control.disabled=true;
    }
  }
}
function actionRow(){
  const row=make('div',undefined,'host-action-row');
  return row;
}
function statusChip(text){
  return make('span',text);
}
function stageKicker(text){
  return make('span',text,'stage-kicker');
}
function supportBox(title,description){
  const block=make('div',undefined,'stage-support');
  block.append(make('strong',title),make('p',description));
  return block;
}
function summaryProgress(index,total){
  const track=make('div',undefined,'question-progress-track');
  track.setAttribute('role','progressbar');track.setAttribute('aria-valuenow',String(index));
  track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax',String(total));
  track.setAttribute('aria-label','Questions completed');
  const fill=make('div',undefined,'question-progress-fill');
  fill.style.width=(100*index/total)+'%';track.append(fill);
  return track;
}
const modeUI=createModeUI({
  make,button,command,updateClock,actionRow,supportBox,stageKicker,
  summaryProgress,announce:message=>{$('game-announcer').textContent=message;},
  refreshStage:()=>render()
});
const ceremonyUI=createCeremonyUI({make,button,actionRow,command,stageKicker});
const teamUI=createTeamUI({make,button,command,stageKicker});
const blitzUI=createBlitzUI({button,command,refreshStage:()=>render(),stageKicker});
function render(){
  const active=Boolean(roomCode&&room);
  $('entry').hidden=active;
  $('room').hidden=!active;
  if(!active)return;
  $('room').classList.toggle('is-ceremony',room.status==='ceremony');
  $('room').classList.toggle('is-blitz',isPaced(room.objective));
  $('room').dataset.phase=room.status;
  if(displayedRoomCode!==roomCode){displayedScores.clear();displayedRoomCode=roomCode;}

  $('room-title').textContent=isHost?'TEACHER CLASSROOM':'YOUR CLASSROOM';
  $('room-id').textContent=roomCode;
  $('room-status').textContent={
    lobby:'Lobby · waiting for players',
    playing:isPaced(room.objective)?
      PACE_NAMES[room.objective]+' · independent questions':
      'Question '+room.question?.index+' of '+room.question?.total,
    reveal:'Answer review · discuss the mathematics',
    finished:'Challenge complete · final standings',
    ceremony:'Grand Awards Ceremony · reveal '+(room.ceremony?.step+1)+' of '+room.ceremony?.total
  }[room.status]||'Classroom';
  const closed=room.status!=='lobby'||room.locked;
  $('room-lock').textContent=closed?'Joining closed':'Joining open';
  $('room-lock').classList.toggle('is-locked',closed);
  $('room-meta').textContent=isPaced(room.objective)?
    PACE_NAMES[room.objective]+' · '+room.blitz?.minutes+' minutes · '+modeName(room.game):
    modeName(room.game)+' · '+room.roundLength+' '+(ARENA_MODES[room.game||'which']?.unit||'questions');
  $('player-count').textContent=room.players.length+' / 45';
  teamUI.sidebar(room,$('class-pulse'));
  $('players-heading').textContent=room.status==='lobby'?'Classroom roster':'Live leaderboard';
  $('roster-help').textContent=isPaced(room.objective)&&room.status!=='lobby'?
    (isRace(room.objective)?
      'First to reach the mathematical target wins. A correct board must be fully correct.':
      'Blitz ranks the most correct decisions first, then checked accuracy and points.'):
    isHost?(room.status==='lobby'?
      'You control who joins. You can remove a nickname before starting.':
      'Scores and submissions update live on every connected device.'):
      'Nicknames only. Your progress in Solo Arcade is kept separate.';

  const playerList=$('players');playerList.replaceChildren();
  playerList.classList.toggle('is-crowded',room.players.length>24);
  const blitzRank=new Map((room.blitz?.standings||[]).map((x,i)=>[x.id,i]));
  const raceProgress=new Map((room.blitz?.standings||[]).map(x=>[x.id,x]));
  const list=[...room.players].sort((a,b)=>isPaced(room.objective)?
    (blitzRank.get(a.id)??999)-(blitzRank.get(b.id)??999)||a.name.localeCompare(b.name):
    b.score-a.score||a.name.localeCompare(b.name));
  for(const [index,player] of list.entries()){
    const item=make('li');item.dataset.playerId=player.id;
    item.classList.toggle('is-local-player',!isHost&&player.id===room.me?.id);
    item.classList.toggle('is-offline',!player.online);
    item.style.setProperty('--critter-delay',(-210*(index%7))+'ms');
    const previousScore=displayedScores.get(player.id);
    if(previousScore!==undefined&&player.score>previousScore &&
      (room.status==='reveal'||room.status==='finished')){
      item.classList.add('is-score-rise');
    }
    displayedScores.set(player.id,player.score);
    const details=make('div',undefined,'player-details');
    const name=make('span',player.name,'player-name');
    const state=make('span',
      isPaced(room.objective)&&room.status!=='lobby'?
        (player.online?'Playing independently':'Not currently connected'):
        player.answered?'Answer submitted':player.online?'Connected':'Not currently connected',
      'player-presence'+(player.answered?' is-answered':player.online?' is-online':''));
    details.append(name,state);
    if(room.teamCount&&player.teamId){
      const team=room.teams?.find(x=>x.id===player.teamId);
      if(team)details.append(make('span',team.icon+' '+team.name,'player-team-label'));
    }
    const ranking=raceProgress.get(player.id);
    const scoreLabel=isRace(room.objective)&&room.status!=='lobby'?
      (room.objective==='bullseye'?
        (ranking?.windowAnswered||0)+' / '+room.blitz.race.accuracyWindow+
        ' marked · '+(ranking?.windowAccuracy||0)+'%':
        'Streak '+(ranking?.currentStreak||0)+' / '+room.blitz.race.streakTarget):
      (room.objective==='blitz'&&room.status!=='lobby'?
        player.correct+' correct · '+player.accuracy+'%':
        player.score+' points');
    item.append(critterPortrait(player.avatar),details,make('span',scoreLabel,'player-score'));
    item.querySelector('.player-score').setAttribute('aria-label',scoreLabel);
    if(isHost&&room.status==='lobby'){
      const remove=button('Remove',()=>{
        if(window.confirm('Remove '+player.name+' from this room?'))void command('remove',undefined,player.id);
      },'player-remove');
      remove.setAttribute('aria-label','Remove '+player.name+' from room');
      item.append(remove);
    }
    playerList.append(item);
  }

  const focused=document.activeElement?.dataset?.method;
  const activeInput=document.activeElement?.id==='arena-speed-answer';
  const cursor=activeInput?document.activeElement.selectionStart:null;
  const activeFeedback=document.activeElement?.id==='teacher-feedback-text';
  const feedbackCursor=activeFeedback?document.activeElement.selectionStart:null;
  const stage=$('stage');stage.replaceChildren();
  stage.classList.toggle('is-blitz',isPaced(room.objective));
  if(isPaced(room.objective))blitzUI.focusFor(room);
  if(room.status==='lobby'){
    stage.append(stageKicker(isHost?'HOST CONTROL CENTRE':'YOU ARE READY'));
    const h2=make('h2',isHost?'Your classroom is ready':'You are in the arena!');
    h2.tabIndex=-1;stage.append(h2);
    stage.append(make('p',isHost?
      'Share the room code or join link, check the roster, then launch when everyone is ready.':
      'The teacher will start the round. Keep this tab open for live questions and feedback.'));
    const stats=make('div',undefined,'lobby-stat-row');
    stats.append(statusChip(room.players.length+' joined'),
      ...(isPaced(room.objective)?[
        statusChip(room.blitz.minutes+' minute safety limit'),
        statusChip(isRace(room.objective)?
          (room.objective==='bullseye'?
            room.blitz.race.target+'% accuracy over '+room.blitz.race.accuracyWindow+' tasks':
            room.blitz.race.target+' correct tasks in a row'):
          'Independent question progress')
      ]:[
        statusChip(room.roundLength+' '+(ARENA_MODES[room.game||'which']?.unit||'questions')),
        statusChip((room.questionSeconds||20)+' seconds each')
      ]));
    stage.append(make('p',modeName(room.game)+' · '+(ARENA_MODES[room.game||'which']?.label==='Speed Recall'?'Type exact mathematical terms.':ARENA_MODES[room.game||'which']?.label==='Match Up'?'Pair terms with precise definitions.':ARENA_MODES[room.game||'which']?.label==='Sort It!'?'Sort advantages and disadvantages across two methods.':'Identify the sampling method from its context.'),'arena-mode-intro'));
    stage.append(stats);
    if(isHost){
      stage.append(supportBox(room.locked?'Joining is locked':'Joining is open',
        room.locked?'New participants cannot join until you unlock the lobby.':
          'New students can join using the six-digit code. Lock joining when the class is ready.'));
      const actions=actionRow();
      const start=button(isPaced(room.objective)?
        'Start '+PACE_NAMES[room.objective]:'Start challenge',()=>command('start'));
      start.disabled=room.players.length<1||(room.teamCount>room.players.length);
      const lock=button(room.locked?'Unlock joining':'Lock joining',
        ()=>command(room.locked?'unlock':'lock'),'btn btn-quiet');
      lock.id='lock-toggle';lock.setAttribute('aria-pressed',String(Boolean(room.locked)));
      actions.append(start,lock,
        button('Close classroom',()=>{if(window.confirm('End this classroom for everyone?'))void command('close');},'btn btn-danger'));
      stage.append(actions);
      if(!room.players.length)stage.append(make('p','At least one student must join before you can start.','small-note'));
      else if(room.teamCount>room.players.length)
        stage.append(make('p','Each team needs at least one participant before the challenge can start.','small-note'));
    }else{
      stage.append(supportBox('Waiting for your teacher',
        'Your nickname appears in the roster. The teacher will start the selected challenge; read each instruction carefully.'));
      const me=room.players.find(person=>person.id===room.me?.id);
      if(me){
        const card=make('section',undefined,'lobby-my-critter');
        const text=make('div',undefined,'lobby-my-critter-copy');
        text.append(make('span','YOUR CRITTER · READY TO PLAY','lobby-my-critter-kicker'),
          make('strong',me.name,'lobby-my-critter-name'),
          make('p','Your unique mascot will cheer you on through the challenge.','lobby-my-critter-note'));
        const customise=make('a','Edit my critter ↗','lobby-my-critter-edit');
        customise.href='./critter-lab/index.html?room='+roomCode;
        text.append(customise);
        card.append(critterPortrait(me.avatar,'medium'),text);
        stage.append(card);
      }
    }
    teamUI.setup(room,isHost,stage);
  }else if(room.status==='playing'&&isPaced(room.objective)){
    blitzUI.render(room,isHost,stage);
    updateClock();
  }else if(room.status==='playing'&&room.question&&room.game!=='which'){
    modeUI.renderQuestion(room,isHost,pendingAnswer,stage);
  }else if(room.status==='playing'&&room.question){
    stage.append(stageKicker('QUESTION '+room.question.index+' OF '+room.question.total));
    stage.append(summaryProgress(room.question.index-1,room.question.total));
    const heading=make('h2',room.question.prompt);heading.tabIndex=-1;stage.append(heading);
    const timer=make('p','','question-clock');timer.id='question-clock';
    timer.setAttribute('aria-live','off');stage.append(timer);
    updateClock();
    if(isHost){
      const ready=room.players.filter(p=>p.answered).length;
      stage.append(supportBox(ready+' of '+room.players.length+' responses submitted',
        'You can reveal the answer when everyone has responded or the 20-second timer expires.'));
      const actions=actionRow();
      const reveal=button('Reveal answer',()=>command('reveal'));
      reveal.id='host-reveal';
      actions.append(reveal,
        button('End challenge',()=>{if(window.confirm('End the challenge for everyone?'))void command('close');},'btn btn-danger'));
      stage.append(actions);
      updateClock();
    }else{
      const me=room.players.find(p=>p.id===room.me.id);
      if(me?.answered||pendingAnswer){
        stage.append(make('p','Answer submitted. Wait for the mathematical explanation.','answer-confirm'));
      }else{
        stage.append(make('p','Select one sampling method. You have one attempt.'));
        const grid=make('div',undefined,'option-grid');
        for(const [method,label] of Object.entries(LABELS)){
          const option=button(label,()=>command('answer',method),'method-option');
          option.dataset.method=method;grid.append(option);
        }
        stage.append(grid);
        updateClock();
      }
    }
  }else if(room.status==='reveal'&&room.reveal&&room.game!=='which'){
    modeUI.renderReview(room,isHost,stage);
  }else if(room.status==='reveal'&&room.reveal){
    const reveal=room.reveal;
    stage.append(stageKicker('QUESTION '+reveal.index+' OF '+reveal.total+' · ANSWER REVIEW'));
    stage.append(summaryProgress(reveal.index,reveal.total));
    const h2=make('h2','Answer: '+LABELS[reveal.correctMethod]);
    h2.tabIndex=-1;stage.append(h2);
    const correct=reveal.answers.filter(a=>a.method===reveal.correctMethod).length;
    stage.append(supportBox(correct+' of '+reveal.answers.length+' submitted answers correct',
      'The method depends on how participants are selected, not simply what the final sample looks like.'));
    const review=make('div',undefined,'answer-review');
    review.append(make('strong','WHY THIS METHOD FITS'),make('p',reveal.reason));
    review.append(make('strong','DISTINGUISH IT FROM OTHER METHODS'),make('p',reveal.contrast));
    stage.append(review);
    if(isHost){
      const actions=actionRow();
      actions.append(button(reveal.index===reveal.total?'Finish challenge':'Next question',()=>command('next')));
      stage.append(actions);
    }
  }else if(room.status==='ceremony'&&room.ceremony?.slide){
    ceremonyUI.render(room,isHost,stage);
  }else if(room.status==='finished'){
    stage.append(stageKicker('ROUND COMPLETE'));
    const race=room.blitz?.race;
    const winner=race?.winnerId?room.players.find(p=>p.id===race.winnerId):null;
    const targetWon=isRace(room.objective)&&race?.finishReason==='target'&&winner;
    const name=PACE_NAMES[room.objective]||'Challenge';
    const h2=make('h2',isRace(room.objective)?
      (targetWon?'Target achieved!':name+' complete!'):
      (room.objective==='blitz'?'Blitz complete!':'Challenge complete!'));
    h2.tabIndex=-1;stage.append(h2);
    stage.append(make('p',isRace(room.objective)?
      (targetWon?'First to reach the target: '+winner.name+'. Excellent mathematical precision!':
        'The safety countdown or teacher ended the challenge before a target was met. No winner has been invented.'):
      (room.objective==='blitz'?
        'Blitz is ranked by correct decisions first, then accuracy and checked points.':
        'Well played. Celebrate accurate thinking and discuss any tricky sampling decisions.')));
    const summary=make('div',undefined,'room-finished-summary');
    const top=list[0];
    summary.append(make('p',targetWon?
      (room.objective==='bullseye'?
        winner.name+' reached '+race.target+'% accuracy across '+race.accuracyWindow+' marked tasks.':
        winner.name+' completed '+race.target+' fully correct tasks consecutively.'):
      (room.objective==='blitz'&&top?
        'Leading result: '+top.name+' · '+top.correct+' correct · '+top.accuracy+'% accuracy':
        (!isRace(room.objective)&&top?
          'Top score: '+top.name+' · '+top.score+' points':'Every checked response counts towards learning.'))));
    stage.append(summary);
    if(isRace(room.objective)&&!isHost&&room.blitz?.feedback){
      blitzUI.renderResultFeedback(room,stage);
    }
    stage.append(make('p',room.finished?.ceremonyCompleted?
      'The ceremony is complete. Open My Awards to see your saved Multiplayer keepsakes.':
      'The teacher can now present the Grand Awards Ceremony, with a podium and mathematical character trophies.','small-note'));
    if(!isHost&&room.finished?.ceremonyCompleted)stage.append(make('a','See My Awards','ceremony-awards-link'));
    if(!isHost&&room.finished?.ceremonyCompleted){
      const link=stage.querySelector('.ceremony-awards-link');link.href='./awards.html';
    }
    if(isHost){
      const actions=actionRow();
      const ceremony=button(room.finished?.ceremonyCompleted?'Replay awards ceremony':'Start awards ceremony',
        ()=>void command('ceremony-start'));
      ceremony.id='ceremony-start';
      ceremony.disabled=!room.finished?.ceremonyAvailable;
      actions.append(ceremony,
        button('Create another room',()=>{leave();$('length').focus();window.scrollTo({top:0,behavior:'smooth'});}));

      stage.append(actions);
    }
  }
  teamUI.review(room,isHost,stage);
  teamUI.finished(room,stage);
  if(focused)stage.querySelector('[data-method="'+focused+'"]')?.focus({preventScroll:true});
  if(activeFeedback){
    const input=stage.querySelector('#teacher-feedback-text');
    if(input){input.focus({preventScroll:true});input.setSelectionRange(feedbackCursor,feedbackCursor);}
  }
  if(activeInput){const input=stage.querySelector('#arena-speed-answer');if(input&&!input.disabled){input.focus({preventScroll:true});input.setSelectionRange(cursor,cursor);}}
  if(!clockTimer)clockTimer=setInterval(updateClock,250);
}

const hostStudio=createHostStudio(document.querySelector('.host-entry'));
$('create').addEventListener('click',createRoom);
$('join-form').addEventListener('submit',event=>{event.preventDefault();void joinRoom();});
// Preserve a typed room code when visiting the optional, locally saved Critter Lab.
$('critter-customise')?.addEventListener('click',()=>{
  const typed=$('room-code').value.replace(/\s/g,'');
  $('critter-customise').href='./critter-lab/index.html'+(/^\d{6}$/.test(typed)?'?room='+typed:'');
});
$('leave').addEventListener('click',async()=>{
  if(!roomCode||!token){leave();return;}
  if(isHost&&room.status!=='finished'&&!window.confirm('Close this classroom for everyone?'))return;
  try{await api('/rooms/'+roomCode+'/command',{type:isHost?'close':'leave'},true);}catch{
    // Local exit is still possible if the connection has already expired.
  }
  leave();
});
$('copy-code').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(roomCode);notice('Room code copied');}
  catch{notice('Room code: '+roomCode);}
});
$('share-link').addEventListener('click',async()=>{
  if(!roomCode)return;
  const destination=new URL('./multiplayer.html?room='+roomCode,window.location.href).href;
  try{await navigator.clipboard.writeText(destination);notice('Student join link copied');}
  catch{notice('Join link: '+destination);}
});
$('project').addEventListener('click',async()=>{
  try{
    if(document.fullscreenElement)await document.exitFullscreen();
    else if($('room').requestFullscreen)await $('room').requestFullscreen();
    else notice('Full-screen presentation is not supported in this browser.');
  }catch{notice('Full-screen presentation is not available here.');}
});
document.addEventListener('fullscreenchange',()=>{
  $('project').textContent=document.fullscreenElement?'Exit full screen':'Present';
});
const requestedRoom=new URL(window.location.href).searchParams.get('room');
if(requestedRoom&&/^\d{6}$/.test(requestedRoom))$('room-code').value=requestedRoom;
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&token&&websocket?.readyState!==WebSocket.OPEN){
    clearTimeout(retryTimer);void connectSocket(generation);
  }
});
try{
  const previous=JSON.parse(sessionStorage.getItem(STORAGE_KEY));
  if(previous&&/^\d{6}$/.test(previous.roomCode)&&
    /^[a-f0-9-]{36}$/.test(previous.token)){
    ({roomCode,token,isHost}=previous);connect();
  }
}catch{sessionStorage.removeItem(STORAGE_KEY);}
