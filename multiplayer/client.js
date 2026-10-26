// Multiplayer networking is independent of the solo practice/progress store.
// Requests that change scores are authenticated HTTPS actions; room updates
// arrive on a hibernatable WebSocket (with slow polling only during reconnect).
const API=(window.__SAMPLING_MULTIPLAYER_API__||'https://sampling-arcade-multiplayer.chris-walker-d8b.workers.dev').replace(/\/$/,'');
const LABELS=Object.freeze({
  'simple-random':'Simple random sampling',systematic:'Systematic sampling',
  stratified:'Stratified sampling',quota:'Quota sampling',opportunity:'Opportunity sampling'
});
const STORAGE_KEY='sampling-arcade-multiplayer-v1';
const $=id=>document.getElementById(id);
let roomCode=null,token=null,isHost=false,room=null,websocket=null;
let generation=0,retryTimer=null,pollTimer=null,clockTimer=null,backoff=750;
let clockOffset=0,pendingAnswer=false;
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
  connection('');notice('');render();
}
async function createRoom(){
  try{
    notice('Creating the classroom…');
    const response=await api('/rooms',{roundLength:Number($('length').value)});
    roomCode=response.code;token=response.token;isHost=true;store();notice('');
    connect();
  }catch(e){notice(e.message);}
}
async function joinRoom(){
  try{
    const typed=$('room-code').value.replace(/\s/g,'');
    if(!/^\d{6}$/.test(typed))throw new Error('Enter the six-digit room code');
    notice('Joining the classroom…');
    const response=await api('/rooms/'+typed+'/join',{name:$('nickname').value});
    roomCode=response.code;token=response.token;isHost=false;store();notice('');
    connect();
  }catch(e){notice(e.message);}
}
function receiveState(data){
  if(!data||data.code!==roomCode)return;
  if(room?.question?.id!==data.question?.id)pendingAnswer=false;
  const previous=room?.status+'|'+(room?.question?.id||room?.reveal?.question?.id||'');
  room=data;
  if(room.question?.serverNow)clockOffset=room.question.serverNow-Date.now();
  render();
  const current=room.status+'|'+(room.question?.id||room.reveal?.question?.id||'');
  if(previous!=='undefined|'&&previous!==current){
    const announcement=room.status==='playing'?'New question '+room.question.index+' of '+room.question.total:
      room.status==='reveal'?'Answer revealed':room.status==='finished'?'Round complete':'Classroom lobby';
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
    const request={type,...(method?{method}:{}),...(targetId?{targetId}:{})};
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
  const timer=$('question-clock');
  if(!timer||!room?.question)return;
  const seconds=Math.max(0,Math.ceil((room.question.deadline-(Date.now()+clockOffset))/1000));
  timer.textContent=seconds+'s remaining';
  timer.classList.toggle('time-up',seconds===0);
  const reveal=$('host-reveal');
  if(reveal)reveal.disabled=seconds>0&&!room.players.every(p=>p.answered);
  if(seconds===0){
    for(const control of document.querySelectorAll('#stage .method-option')){
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
function render(){
  const active=Boolean(roomCode&&room);
  $('entry').hidden=active;
  $('room').hidden=!active;
  if(!active)return;

  $('room-title').textContent=isHost?'TEACHER CLASSROOM':'YOUR CLASSROOM';
  $('room-id').textContent=roomCode;
  $('room-status').textContent={
    lobby:'Lobby · waiting for players',
    playing:'Question '+room.question?.index+' of '+room.question?.total,
    reveal:'Answer review · discuss the mathematics',
    finished:'Challenge complete · final standings'
  }[room.status]||'Classroom';
  const closed=room.status!=='lobby'||room.locked;
  $('room-lock').textContent=closed?'Joining closed':'Joining open';
  $('room-lock').classList.toggle('is-locked',closed);
  $('room-meta').textContent='Which Method? · '+room.roundLength+' questions';
  $('player-count').textContent=room.players.length+' / 45';
  $('roster-help').textContent=isHost?(room.status==='lobby'?
    'You control who joins. You can remove a nickname before starting.':
    'Scores and submissions update live on every connected device.'):
    'Nicknames only. Your progress in Solo Arcade is kept separate.';

  const playerList=$('players');playerList.replaceChildren();
  const list=[...room.players].sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
  for(const player of list){
    const item=make('li');item.dataset.playerId=player.id;
    const details=make('div',undefined,'player-details');
    const name=make('span',player.name,'player-name');
    const state=make('span',
      player.answered?'Answer submitted':player.online?'Connected':'Not currently connected',
      'player-presence'+(player.answered?' is-answered':player.online?' is-online':''));
    details.append(name,state);
    item.append(details,make('span',player.score+' points','player-score'));
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
  const stage=$('stage');stage.replaceChildren();
  if(room.status==='lobby'){
    stage.append(stageKicker(isHost?'HOST CONTROL CENTRE':'YOU ARE READY'));
    const h2=make('h2',isHost?'Your classroom is ready':'You are in the arena!');
    h2.tabIndex=-1;stage.append(h2);
    stage.append(make('p',isHost?
      'Share the room code or join link, check the roster, then launch when everyone is ready.':
      'The teacher will start the round. Keep this tab open for live questions and feedback.'));
    const stats=make('div',undefined,'lobby-stat-row');
    stats.append(statusChip(room.players.length+' joined'),
      statusChip(room.roundLength+' questions'),
      statusChip('20 seconds each'));
    stage.append(stats);
    if(isHost){
      stage.append(supportBox(room.locked?'Joining is locked':'Joining is open',
        room.locked?'New participants cannot join until you unlock the lobby.':
          'New students can join using the six-digit code. Lock joining when the class is ready.'));
      const actions=actionRow();
      const start=button('Start challenge',()=>command('start'));
      start.disabled=room.players.length<1;
      const lock=button(room.locked?'Unlock joining':'Lock joining',
        ()=>command(room.locked?'unlock':'lock'),'btn btn-quiet');
      lock.id='lock-toggle';lock.setAttribute('aria-pressed',String(Boolean(room.locked)));
      actions.append(start,lock,
        button('Close classroom',()=>{if(window.confirm('End this classroom for everyone?'))void command('close');},'btn btn-danger'));
      stage.append(actions);
      if(!room.players.length)stage.append(make('p','At least one student must join before you can start.','small-note'));
    }else{
      stage.append(supportBox('Waiting for your teacher',
        'Your nickname appears in the roster. Once the challenge starts, choose the method that best fits each scenario.'));
    }
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
  }else if(room.status==='finished'){
    stage.append(stageKicker('ROUND COMPLETE'));
    const h2=make('h2','Challenge complete!');h2.tabIndex=-1;stage.append(h2);
    stage.append(make('p','Well played. Celebrate accurate thinking and discuss any tricky sampling decisions.'));
    const summary=make('div',undefined,'room-finished-summary');
    const top=list[0];
    summary.append(make('p',top?'Top score: '+top.name+' · '+top.score+' points':'Thank you for taking part.'));
    stage.append(summary);
    stage.append(make('p','Special achievement awards and the grand ceremony are planned for a later pass.','small-note'));
    if(isHost){
      const actions=actionRow();
      actions.append(button('Create another room',()=>{leave();$('length').focus();window.scrollTo({top:0,behavior:'smooth'});}));
      stage.append(actions);
    }
  }
  if(focused)stage.querySelector('[data-method="'+focused+'"]')?.focus({preventScroll:true});
  if(!clockTimer)clockTimer=setInterval(updateClock,250);
}

$('create').addEventListener('click',createRoom);
$('join-form').addEventListener('submit',event=>{event.preventDefault();void joinRoom();});
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
