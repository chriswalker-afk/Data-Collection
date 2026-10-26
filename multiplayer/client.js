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
  room=data;
  if(room.question?.serverNow)clockOffset=room.question.serverNow-Date.now();
  render();
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
    ws.onclose=()=>{
      if(version!==generation)return;
      websocket=null;scheduleReconnect(version);
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
async function command(type,method){
  if(!token)return;
  try{
    const request={type,...(method?{method}:{})};
    if(type==='answer')pendingAnswer=true;
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
}
function render(){
  const active=Boolean(roomCode&&room);
  $('entry').hidden=active;
  $('room').hidden=!active;
  if(!active)return;
  $('room-title').textContent=isHost?'Classroom host':'Joined as '+room.me.name;
  $('room-id').textContent=roomCode;
  $('room-status').textContent={
    lobby:'Lobby · waiting for students',playing:'Question '+room.question?.index+' of '+room.question?.total,
    reveal:'Question review',finished:'Challenge finished'
  }[room.status]||'Classroom';
  const playerList=$('players');playerList.replaceChildren();
  [...room.players].sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name)).forEach((player,index)=>{
    const suffix=(player.answered?' · answered':'')+(player.online?' · online':'');
    playerList.append(make('li',(index+1)+'. '+player.name+' · '+player.score+' points'+suffix));
  });
  const focused=document.activeElement?.dataset?.method;
  const stage=$('stage');stage.replaceChildren();
  if(room.status==='lobby'){
    stage.append(make('h2',isHost?'Your classroom is ready':'You are in!'));
    stage.append(make('p',isHost?'Share the room code with the class and start when everyone has joined.':'The teacher will start the challenge.'));
    if(isHost)stage.append(button('Start challenge',()=>command('start')));
  }else if(room.status==='playing'&&room.question){
    stage.append(make('p','Question '+room.question.index+' / '+room.question.total,'eyebrow'));
    stage.append(make('h2',room.question.prompt));
    const timer=make('p','','question-clock');timer.id='question-clock';stage.append(timer);
    updateClock();
    if(isHost){
      stage.append(make('p','Reveal the solution after everyone answers or the time has elapsed.'));
      stage.append(button('Reveal answer',()=>command('reveal')));
      stage.append(button('End challenge',()=>{if(window.confirm('End this game for everyone?'))void command('close');},'btn btn-quiet'));
    }else{
      const mine=room.players.find(p=>p.id===room.me.id);
      if(mine?.answered||pendingAnswer)stage.append(make('p','Answer submitted. Wait for the teacher to reveal the method.','answer-confirm'));
      else{
        const grid=make('div',undefined,'option-grid');
        for(const [method,label] of Object.entries(LABELS)){
          const option=button(label,()=>command('answer',method),'btn btn-quiet method-option');
          option.dataset.method=method;grid.append(option);
        }
        stage.append(grid);
      }
    }
  }else if(room.status==='reveal'&&room.reveal){
    const revealed=room.reveal;
    stage.append(make('p','Question '+revealed.index+' / '+revealed.total,'eyebrow'));
    stage.append(make('h2','Answer: '+LABELS[revealed.correctMethod]));
    stage.append(make('p',revealed.reason));
    stage.append(make('p',revealed.contrast));
    if(isHost)stage.append(button('Next question',()=>command('next')));
  }else if(room.status==='finished'){
    stage.append(make('h2','Challenge complete!'));
    stage.append(make('p','Well played. Check the final standings and discuss any tricky sampling methods.'));
    stage.append(make('p','The full awards ceremony is planned for Pass 5.','small-note'));
  }
  if(focused)stage.querySelector('[data-method="'+focused+'"]')?.focus({preventScroll:true});
  if(!clockTimer)clockTimer=setInterval(updateClock,250);
}
$('create').addEventListener('click',createRoom);
$('join').addEventListener('click',joinRoom);
$('leave').addEventListener('click',leave);
$('copy-code').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(roomCode);notice('Room code copied');}
  catch{notice('Room code: '+roomCode);}
});
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
