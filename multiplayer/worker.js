import {SCENARIOS} from './scenarios.js';
import {METHODS,ROUND_LENGTHS,cleanNickname,validRoomCode,balancedRound,scoreAnswer,publicQuestion,secureIndex} from './rules.js';

const ORIGIN='https://chriswalker-afk.github.io';
const TTL=3*60*60*1000;
const LIMIT=45;
const QUESTION_MS=20000;
const json=(body,status=200,origin=ORIGIN)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':origin,'vary':'Origin'}});
const error=(message,status=400)=>json({error:message},status);
function readToken(req){const t=req.headers.get('Authorization')||'';return /^Bearer [a-f0-9-]{36}$/.test(t)?t.slice(7):null;}
function safeRoom(code){return validRoomCode(code)?code:null;}
function chanceCode(){let s='';for(let i=0;i<6;i++)s+=String(secureIndex(10));return s;}
function visibleRoom(room,p,now){
 const q=room.status==='playing'?room.deck[room.index]:null;
 const reveal=room.status==='reveal';
 return {code:room.code,status:room.status,roundLength:room.roundLength,
   players:room.players.map(x=>({id:x.id,name:x.name,score:x.score,online:x.online,answered:room.answers.some(a=>a.id===x.id)})),
   me:p?{id:p.id,name:p.name,host:p.host}:null,
   question:q?{index:room.index+1,total:room.deck.length,...publicQuestion(q),deadline:room.deadline,serverNow:now}:null,
   reveal:reveal?{index:room.index+1,total:room.deck.length,correctMethod:room.deck[room.index].correctMethod,
     reason:room.deck[room.index].reason,contrast:room.deck[room.index].contrast,
     answers:room.answers.map(a=>({id:a.id,method:a.method,points:a.points})),
     question:publicQuestion(room.deck[room.index])}:null,
   finished:room.status==='finished'?{total:room.deck.length}:null};
}
export class GameRoom {
 constructor(ctx,env){this.ctx=ctx;this.env=env;this.room=null;this.sockets=new Map();}
 async load(){if(!this.room)this.room=await this.ctx.storage.get('room')||null;return this.room;}
 async persist(){await this.ctx.storage.put('room',this.room);}
 async create(code,roundLength){
  if(await this.load())return {error:'Room already exists'};
  if(!ROUND_LENGTHS.includes(roundLength))return {error:'Invalid round length'};
  const hostToken=crypto.randomUUID();
  this.room={code,status:'lobby',roundLength,created:Date.now(),hostToken,
   players:[],deck:[],index:0,deadline:0,answers:[]};
  await this.persist();await this.ctx.storage.setAlarm(Date.now()+TTL);
  return {code,token:hostToken};
 }
 async join(name){
  const r=await this.load();
  if(!r||r.status!=='lobby'||Date.now()>r.created+TTL)return {error:'Room is unavailable'};
  const nickname=cleanNickname(name);
  if(!nickname)return {error:'Choose a nickname of 2–20 letters or numbers'};
  if(r.players.length>=LIMIT)return {error:'This classroom is full'};
  if(r.players.some(p=>p.name.toLowerCase()===nickname.toLowerCase()))return {error:'Nickname already in use'};
  const player={id:crypto.randomUUID(),token:crypto.randomUUID(),name:nickname,score:0,online:false,host:false};
  r.players.push(player);await this.persist();
  this.broadcast();return {code:r.code,token:player.token};
 }
 authenticate(token){if(!this.room||!token)return null;
  if(token===this.room.hostToken)return {id:'host',name:'Teacher',host:true};
  return this.room.players.find(p=>p.token===token)||null;
 }
 async snapshot(token){const r=await this.load();const p=this.authenticate(token);
  if(!r||!p)return {error:'Session not found'};
  return visibleRoom(r,p,Date.now());
 }
 async handleCommand(token,command){
  const r=await this.load();const p=this.authenticate(token);
  if(!r||!p)return {error:'Session expired'};
  if(command.type==='start'&&p.host&&r.status==='lobby'){
   if(r.players.length<1)return {error:'At least one student must join'};
   r.deck=balancedRound(SCENARIOS,r.roundLength);r.index=0;r.status='playing';r.deadline=Date.now()+QUESTION_MS;r.answers=[];
  }else if(command.type==='answer'&&!p.host&&r.status==='playing'){
   if(Date.now()>r.deadline)return {error:'Time is up'};
   if(!METHODS.includes(command.method))return {error:'Invalid method'};
   if(r.answers.some(a=>a.id===p.id))return {error:'Answer already submitted'};
   const correct=r.deck[r.index].correctMethod===command.method;
   const points=scoreAnswer(correct,QUESTION_MS-(r.deadline-Date.now()),QUESTION_MS);
   r.answers.push({id:p.id,method:command.method,points});p.score+=points;
  }else if(command.type==='reveal'&&p.host&&r.status==='playing'){
   r.status='reveal';
  }else if(command.type==='next'&&p.host&&r.status==='reveal'){
   r.index+=1;r.answers=[];r.status=r.index>=r.deck.length?'finished':'playing';
   r.deadline=r.status==='playing'?Date.now()+QUESTION_MS:0;
  }else if(command.type==='close'&&p.host){r.status='finished';
  }else{return {error:'Action not available'};}
  await this.persist();this.broadcast();return {ok:true};
 }
 broadcast(){if(!this.room)return;for(const [socket,token] of this.sockets){
  try{socket.send(JSON.stringify({type:'state',data:visibleRoom(this.room,this.authenticate(token),Date.now())}));}
  catch{this.sockets.delete(socket);}
 }}
 async fetch(request){
  const url=new URL(request.url);
  const token=readToken(request);
  const r=await this.load();
  const p=this.authenticate(token);
  if(!p)return error('Session not found',401);
  if(url.pathname.endsWith('/ws')){
   if(request.headers.get('Upgrade')!=='websocket')return error('Expected WebSocket upgrade',426);
   const pair=new WebSocketPair();const client=pair[0],server=pair[1];
   server.accept();this.sockets.set(server,token);
   server.addEventListener('message',async event=>{
    try{const cmd=JSON.parse(event.data);const result=await this.handleCommand(token,cmd);if(result.error)server.send(JSON.stringify({type:'error',message:result.error}));}
    catch{server.send(JSON.stringify({type:'error',message:'Invalid message'}));}
   });
   server.addEventListener('close',()=>{this.sockets.delete(server);});
   server.addEventListener('error',()=>{this.sockets.delete(server);});
   server.send(JSON.stringify({type:'state',data:visibleRoom(r,p,Date.now())}));
   return new Response(null,{status:101,webSocket:client});
  }
  if(url.pathname.endsWith('/state'))return json(visibleRoom(r,p,Date.now()));
  if(url.pathname.endsWith('/command')&&request.method==='POST'){
   let body;try{body=await request.json();}catch{return error('Invalid request');}
   const result=await this.handleCommand(token,body);
   return result.error?error(result.error):json(result);
  }
  return error('Not found',404);
 }
 async alarm(){const r=await this.load();if(r&&Date.now()>=r.created+TTL){
   for(const ws of this.sockets.keys())try{ws.close(1000,'Room expired');}catch{}
   await this.ctx.storage.deleteAll();this.room=null;
 }else if(r)await this.ctx.storage.setAlarm(r.created+TTL);}
}
export default {
 async fetch(request,env){
  const url=new URL(request.url),origin=request.headers.get('Origin');
  if(origin&&origin!==ORIGIN)return error('Origin not allowed',403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':ORIGIN,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Authorization,Content-Type','access-control-max-age':'86400','vary':'Origin'}});
  if(url.pathname==='/health')return json({ok:true,service:'sampling-arcade-multiplayer',version:1});
  if(url.pathname==='/rooms'&&request.method==='POST'){
   let body;try{body=await request.json();}catch{return error('Invalid JSON');}
   const length=Number(body.roundLength||10);
   if(!ROUND_LENGTHS.includes(length))return error('Invalid round length');
   for(let i=0;i<10;i++){const code=chanceCode();
    const result=await env.ROOMS.getByName('room-'+code).create(code,length);
    if(result.code)return json(result,201);
   }return error('Could not allocate room',503);
  }
  const match=url.pathname.match(/^\/rooms\/(\d{6})(?:\/(join|state|command|ws))?$/);
  if(!match)return error('Not found',404);
  const [,code,action]=match,stub=env.ROOMS.getByName('room-'+code);
  if(action==='join'&&request.method==='POST'){
    let body;try{body=await request.json();}catch{return error('Invalid JSON');}
    const result=await stub.join(body.name);
    return result.error?error(result.error):json(result,201);
  }
  return stub.fetch(request);
 }
};
