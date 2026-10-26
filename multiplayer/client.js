const API='https://sampling-arcade-multiplayer.chris-walker-d8b.workers.dev';
const labels={'simple-random':'Simple random sampling',systematic:'Systematic sampling',stratified:'Stratified sampling',quota:'Quota sampling',opportunity:'Opportunity sampling'};
const $=id=>document.getElementById(id);
let code=null,token=null,host=false,socket=null,state=null;
const roomKey='sampling-arcade-multiplayer-v1';
function status(message){$('notice').textContent=message||'';}
function clear(node){node.replaceChildren();}
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function button(text,cb,cls='button'){const b=el('button',text,cls);b.type='button';b.onclick=cb;return b;}
async function request(path,body,auth){
 const response=await fetch(API+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(auth?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});
 const result=await response.json();if(!response.ok)throw new Error(result.error||'Connection failed');return result;
}
function save(){sessionStorage.setItem(roomKey,JSON.stringify({code,token,host}));}
function reset(){sessionStorage.removeItem(roomKey);code=null;token=null;host=false;state=null;if(socket){socket.close();socket=null;}render();}
async function startRoom(){try{status('Creating classroom…');const result=await request('/rooms',{roundLength:Number($('length').value)});({code,token}=result);host=true;save();connect();}catch(e){status(e.message);}}
async function joinRoom(){try{status('Joining…');const entered=$('room-code').value.replaceAll(' ','').trim();if(!/^\d{6}$/.test(entered))throw new Error('Enter the six-digit code');const result=await request('/rooms/'+entered+'/join',{name:$('nickname').value});({code,token}=result);host=false;save();connect();}catch(e){status(e.message);}}
async function command(type,method){try{const result=await request('/rooms/'+code+'/command',{type,...(method?{method}:{})},true);if(result.error)throw new Error(result.error);}catch(e){status(e.message);}}
function connect(){poll();}
let pollHandle=null;
async function poll(){
 if(!code||!token)return;
 try{state=await request('/rooms/'+code+'/state',null,true);render();status('');}
 catch(e){status(e.message);if(e.message==='Session not found')reset();}
 clearTimeout(pollHandle);if(code)pollHandle=setTimeout(poll,1500);
}
function render(){
 const active=Boolean(code&&state);$('entry').hidden=active;$('room').hidden=!active;
 if(!active)return;
 $('room-title').textContent=host?'Host room':'Classroom challenge';$('room-id').textContent=code;
 $('room-status').textContent=state.status==='lobby'?'Lobby · waiting for players':state.status==='playing'?'Question '+state.question.index+' of '+state.question.total:state.status==='reveal'?'Answer review':'Challenge complete';
 const players=$('players');clear(players);
 [...state.players].sort((a,b)=>b.score-a.score).forEach((p,i)=>players.append(el('li',(i+1)+'. '+p.name+' · '+p.score+' points'+(p.answered?' ✓':''))));
 const stage=$('stage');clear(stage);
 if(state.status==='lobby'){
  stage.append(el('h2',host?'Your class is joining':'You are in!'));
  stage.append(el('p',host?'Share the six-digit code. Start when everyone has arrived.':'The teacher will start the challenge.'));
  if(host)stage.append(button('Start game',()=>command('start')));
 }else if(state.status==='playing'){
  stage.append(el('p','Question '+state.question.index+' / '+state.question.total,'eyebrow'));
  stage.append(el('h2',state.question.prompt));
  const remaining=Math.max(0,Math.ceil((state.question.deadline-state.question.serverNow)/1000));
  stage.append(el('p','Time remaining at last update: '+remaining+' seconds'));
  if(!host){
   const me=state.players.find(p=>p.id===state.me.id);
   if(me?.answered)stage.append(el('p','Answer submitted. Wait for the reveal.'));
   else {const options=el('div',undefined,'option-grid');Object.entries(labels).forEach(([id,label])=>options.append(button(label,()=>command('answer',id))));stage.append(options);}
  }else stage.append(button('Reveal answer',()=>command('reveal')));
 }else if(state.status==='reveal'){
  const reveal=state.reveal;
  stage.append(el('p','Question '+reveal.index+' / '+reveal.total,'eyebrow'));
  stage.append(el('h2',labels[reveal.correctMethod]));
  stage.append(el('p',reveal.reason));
  stage.append(el('p',reveal.contrast));
  if(host)stage.append(button('Next question',()=>command('next')));
 }else{stage.append(el('h2','Well played!'));stage.append(el('p','Final leaderboard is shown below.'));}
}
$('create').addEventListener('click',startRoom);
$('join').addEventListener('click',joinRoom);
$('leave').addEventListener('click',reset);
try{const previous=JSON.parse(sessionStorage.getItem(roomKey));if(previous?.code&&previous?.token){({code,token,host}=previous);poll();}}catch{}
