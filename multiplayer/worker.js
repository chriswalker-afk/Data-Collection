import {DurableObject} from 'cloudflare:workers';
import {SCENARIOS} from './scenarios.js';
import {METHODS,ROUND_LENGTHS,cleanNickname,balancedRound,scoreAnswer,publicQuestion,secureIndex} from './rules.js';

// A separate, short-lived classroom service; no student identities or logins.
const LIVE_ORIGIN='https://chriswalker-afk.github.io';
const LOCAL_ORIGINS=new Set(['http://127.0.0.1:4173','http://localhost:4173']);
const ROOM_TTL_MS=3*60*60*1000;
const QUESTION_MS=20_000;
const MAX_PLAYERS=45;
const MAX_BODY_BYTES=2048;
const TICKET_LIFETIME_MS=30_000;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ALLOW_METHODS='GET, POST, OPTIONS';

function safeMatch(a,b){
  if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length||a.length===0)return false;
  return crypto.subtle.timingSafeEqual(new TextEncoder().encode(a),new TextEncoder().encode(b));
}
function authorizedToken(request){
  const header=request.headers.get('authorization')||'';
  const token=header.startsWith('Bearer ')?header.slice(7):'';
  return UUID.test(token)?token:null;
}
function headers(request){
  const origin=request.headers.get('Origin');
  return {'content-type':'application/json; charset=utf-8','cache-control':'no-store',
    'access-control-allow-origin':origin&&LOCAL_ORIGINS.has(origin)?origin:LIVE_ORIGIN,
    'vary':'Origin'};
}
function json(request,data,status=200){return new Response(JSON.stringify(data),{status,headers:headers(request)});}
function fail(request,message,status=400){return json(request,{error:message},status);}
function validateOrigin(request){
  const origin=request.headers.get('Origin');
  return !origin||origin===LIVE_ORIGIN||LOCAL_ORIGINS.has(origin);
}
function pickCode(){let code='';for(let i=0;i<6;i++)code+=String(secureIndex(10));return code;}
async function fingerprint(request){
  const address=request.headers.get('CF-Connecting-IP')||'local-testing';
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(address));
  return Array.from(new Uint8Array(bytes).slice(0,12),v=>v.toString(16).padStart(2,'0')).join('');
}
async function smallJSON(request){
  const length=Number(request.headers.get('content-length'));
  if(Number.isFinite(length)&&length>MAX_BODY_BYTES)throw new Error('Request too large');
  if(!request.body)throw new Error('Missing request body');
  const reader=request.body.getReader();const parts=[];let size=0;
  try{
    for(;;){
      const {done,value}=await reader.read();if(done)break;
      size+=value.byteLength;
      if(size>MAX_BODY_BYTES)throw new Error('Request too large');
      parts.push(value);
    }
  }finally{reader.releaseLock();}
  const buffer=new Uint8Array(size);let index=0;
  for(const part of parts){buffer.set(part,index);index+=part.byteLength;}
  const parsed=JSON.parse(new TextDecoder().decode(buffer));
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Expected a JSON object');
  return parsed;
}
function publicState(room,participant,now,connections){
  const question=room.status==='playing'?room.deck[room.index]:null;
  const revealed=room.status==='reveal'?room.deck[room.index]:null;
  return {
    code:room.code,status:room.status,roundLength:room.roundLength,
    players:room.players.map(p=>({
      id:p.id,name:p.name,score:p.score,online:connections.has(p.id),
      answered:room.answers.some(a=>a.id===p.id)
    })),
    me:{id:participant.id,name:participant.name,host:participant.host===true},
    question:question?{index:room.index+1,total:room.deck.length,
      ...publicQuestion(question),deadline:room.deadline,serverNow:now}:null,
    reveal:revealed?{index:room.index+1,total:room.deck.length,
      question:publicQuestion(revealed),correctMethod:revealed.correctMethod,
      reason:revealed.reason,contrast:revealed.contrast,
      answers:room.answers.map(a=>({id:a.id,method:a.method,points:a.points}))}:null,
    finished:room.status==='finished'?{total:room.deck.length}:null
  };
}
export class GameRoom extends DurableObject{
  room(){const value=this.ctx.storage.kv.get('room');return value&&Date.now()<=value.created+ROOM_TTL_MS?value:null;}
  save(room){this.ctx.storage.kv.put('room',room);}
  // The same DO class is also used for tiny per-origin rate-limiter instances.
  // Per-IP names are hashed, with no raw IP written to storage.
  async allowRate(name,max,windowMs){
    const now=Date.now();const key='rate:'+name;
    const previous=this.ctx.storage.kv.get(key);
    const newWindow=!previous||now>=previous.until;
    const next=newWindow?{until:now+windowMs,count:1}:{until:previous.until,count:previous.count+1};
    if(next.count>max)return false;
    this.ctx.storage.kv.put(key,next);
    // Limiter-only objects clean up their hashed network keys after the window.
    // Room objects keep their independent three-hour room-expiry alarm.
    if(newWindow&&!this.ctx.storage.kv.get('room'))
      await this.ctx.storage.setAlarm(next.until+2000);
    return true;
  }
  async create(code,roundLength){
    if(this.room()||this.ctx.storage.kv.get('room'))return {error:'Room code already in use'};
    if(!ROUND_LENGTHS.includes(roundLength))return {error:'Invalid round length'};
    const room={code,status:'lobby',created:Date.now(),roundLength,
      hostToken:crypto.randomUUID(),players:[],deck:[],index:0,deadline:0,answers:[]};
    this.save(room);
    await this.ctx.storage.setAlarm(room.created+ROOM_TTL_MS);
    return {code,token:room.hostToken};
  }
  authenticate(token,room=this.room()){
    if(!room||!token||!UUID.test(token))return null;
    if(safeMatch(token,room.hostToken))return {id:'host',name:'Teacher',host:true};
    return room.players.find(p=>safeMatch(token,p.token))||null;
  }
  currentConnections(){
    const ids=new Set();
    for(const socket of this.ctx.getWebSockets()){
      const p=socket.deserializeAttachment();
      if(p&&p.id)ids.add(p.id);
    }
    return ids;
  }
  snapshot(token){
    const room=this.room(),person=this.authenticate(token,room);
    return !person?{error:'Session not found'}:publicState(room,person,Date.now(),this.currentConnections());
  }
  async join(name,clientKey){
    if(!await this.allowRate('join:'+String(clientKey).slice(0,24),75,60_000))return {error:'Too many join attempts; try again shortly',status:429};
    // Re-read after the awaited limiter so simultaneous joins never overwrite
    // one another's participants from an earlier room snapshot.
    const room=this.room();
    if(!room||room.status!=='lobby')return {error:'This classroom is unavailable'};
    const nickname=cleanNickname(name);
    if(!nickname)return {error:'Choose a nickname of 2–20 letters or numbers'};
    if(room.players.length>=MAX_PLAYERS)return {error:'This classroom is full'};
    if(room.players.some(p=>p.name.toLocaleLowerCase('en-GB')===nickname.toLocaleLowerCase('en-GB')))
      return {error:'Nickname already in use'};
    const person={id:crypto.randomUUID(),token:crypto.randomUUID(),name:nickname,score:0};
    room.players.push(person);this.save(room);this.broadcast();
    return {code:room.code,token:person.token};
  }
  async socketTicket(token){
    const room=this.room(),person=this.authenticate(token,room);
    if(!person)return {error:'Session not found',status:401};
    if(!await this.allowRate('ticket:'+person.id,18,60_000))return {error:'Reconnect limit reached; try again shortly',status:429};
    const ticket=crypto.randomUUID();
    this.ctx.storage.kv.put('ticket:'+person.id,{ticket,expires:Date.now()+TICKET_LIFETIME_MS});
    return {participantId:person.id,ticket,expiresInSeconds:30};
  }
  applyCommand(token,command){
    const room=this.room(),person=this.authenticate(token,room);
    if(!person)return {error:'Session not found',status:401};
    if(!command||typeof command.type!=='string')return {error:'Invalid action'};
    if(command.type==='start'&&person.host&&room.status==='lobby'){
      if(room.players.length===0)return {error:'At least one student must join'};
      room.deck=balancedRound(SCENARIOS,room.roundLength);room.index=0;room.answers=[];
      room.status='playing';room.deadline=Date.now()+QUESTION_MS;
    }else if(command.type==='answer'&&!person.host&&room.status==='playing'){
      if(!METHODS.includes(command.method))return {error:'Choose one of the five sampling methods'};
      if(Date.now()>=room.deadline)return {error:'Time is up'};
      if(room.answers.some(a=>a.id===person.id))return {error:'Answer already submitted'};
      const correct=room.deck[room.index].correctMethod===command.method;
      const points=scoreAnswer(correct,QUESTION_MS-(room.deadline-Date.now()),QUESTION_MS);
      room.answers.push({id:person.id,method:command.method,points});
      const player=room.players.find(p=>p.id===person.id);player.score+=points;
    }else if(command.type==='reveal'&&person.host&&room.status==='playing'){
      if(Date.now()<room.deadline&&room.answers.length<room.players.length)
        return {error:'Wait until everyone has answered or the timer finishes'};
      room.status='reveal';
    }else if(command.type==='next'&&person.host&&room.status==='reveal'){
      room.index+=1;room.answers=[];
      room.status=room.index>=room.deck.length?'finished':'playing';
      room.deadline=room.status==='playing'?Date.now()+QUESTION_MS:0;
    }else if(command.type==='close'&&person.host&&room.status!=='finished'){
      room.status='finished';room.deadline=0;
    }else{return {error:'Action not available'};}
    this.save(room);this.broadcast();return {ok:true};
  }
  broadcast(){
    const room=this.room();if(!room)return;
    const online=this.currentConnections();const now=Date.now();
    for(const ws of this.ctx.getWebSockets()){
      const data=ws.deserializeAttachment()||{};
      const person=data.id==='host'?{id:'host',name:'Teacher',host:true}:room.players.find(p=>p.id===data.id);
      if(person){try{ws.send(JSON.stringify({type:'state',data:publicState(room,person,now,online)}));}catch{ /* client reconnects */ }}
    }
  }
  async fetch(request){
    const room=this.room();
    if(!room)return fail(request,'Room expired or unavailable',404);
    if(request.headers.get('Upgrade')!=='websocket')return fail(request,'WebSocket upgrade required',426);
    const url=new URL(request.url);
    const id=url.searchParams.get('id'),ticket=url.searchParams.get('ticket');
    if(!id||!ticket||!UUID.test(ticket))return fail(request,'Invalid connection ticket',401);
    const stored=this.ctx.storage.kv.get('ticket:'+id);
    if(!stored||stored.expires<Date.now()||!safeMatch(ticket,stored.ticket))
      return fail(request,'Expired or invalid connection ticket',401);
    const person=id==='host'?{id:'host',host:true}:room.players.find(p=>p.id===id);
    if(!person)return fail(request,'Participant not found',401);
    this.ctx.storage.kv.delete('ticket:'+id); // single-use handshake credential
    for(const old of this.ctx.getWebSockets()){
      const attached=old.deserializeAttachment()||{};
      if(attached.id===id)try{old.close(4001,'Session reconnected');}catch{}
    }
    const pair=new WebSocketPair(),client=pair[0],server=pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({id});
    const snapshot=publicState(room,person,Date.now(),this.currentConnections());
    server.send(JSON.stringify({type:'state',data:snapshot}));
    this.broadcast();
    return new Response(null,{status:101,webSocket:client});
  }
  webSocketMessage(ws,message){
    if(message==='ping')ws.send(JSON.stringify({type:'pong'}));
    else ws.close(1008,'Use authenticated HTTP actions');
  }
  webSocketClose(){this.broadcast();}
  webSocketError(){this.broadcast();}
  async alarm(){
    const room=this.ctx.storage.kv.get('room');
    if(room&&Date.now()<room.created+ROOM_TTL_MS){
      await this.ctx.storage.setAlarm(room.created+ROOM_TTL_MS);return;
    }
    for(const ws of this.ctx.getWebSockets())try{ws.close(1000,'Classroom expired');}catch{}
    await this.ctx.storage.deleteAll();
  }
}
export default {
  async fetch(request,env){
    if(!validateOrigin(request))return fail(request,'Origin not allowed',403);
    if(request.method==='OPTIONS'){
      const h=headers(request);
      h['access-control-allow-methods']=ALLOW_METHODS;
      h['access-control-allow-headers']='Content-Type, Authorization';
      h['access-control-max-age']='600';
      return new Response(null,{status:204,headers:h});
    }
    const url=new URL(request.url);
    if(url.pathname==='/health'&&request.method==='GET')
      return json(request,{ok:true,service:'sampling-arcade-multiplayer',version:2,transport:'websocket'});
    if(url.pathname==='/rooms'&&request.method==='POST'){
      let body;try{body=await smallJSON(request);}catch(e){return fail(request,e.message==='Request too large'?e.message:'Invalid JSON',e.message==='Request too large'?413:400);}
      const roundLength=Number(body.roundLength);
      if(!ROUND_LENGTHS.includes(roundLength))return fail(request,'Choose 5, 10 or 20 questions');
      const key=await fingerprint(request);
      const limiter=env.ROOMS.getByName('limiter:rooms:'+key);
      if(!await limiter.allowRate('create',12,5*60_000))return fail(request,'Room creation limit reached; try again later',429);
      const global=env.ROOMS.getByName('limiter:global');
      if(!await global.allowRate('create',120,60_000))return fail(request,'Classroom service is busy',429);
      for(let attempt=0;attempt<10;attempt++){
        const code=pickCode();
        const result=await env.ROOMS.getByName('room-'+code).create(code,roundLength);
        if(result.code)return json(request,result,201);
      }
      return fail(request,'Could not allocate a room',503);
    }
    const matched=url.pathname.match(/^\/rooms\/(\d{6})\/(join|state|command|socket-ticket|ws)$/);
    if(!matched)return fail(request,'Not found',404);
    const [,code,operation]=matched;
    const stub=env.ROOMS.getByName('room-'+code);
    if(operation==='ws'&&request.method==='GET')return stub.fetch(request);
    if(operation==='join'&&request.method==='POST'){
      let body;try{body=await smallJSON(request);}catch{return fail(request,'Invalid JSON');}
      const result=await stub.join(body.name,await fingerprint(request));
      return result.error?fail(request,result.error,result.status||400):json(request,result,201);
    }
    const token=authorizedToken(request);
    if(!token)return fail(request,'Authentication required',401);
    if(operation==='state'&&request.method==='GET'){
      const result=await stub.snapshot(token);
      return result.error?fail(request,result.error,401):json(request,result);
    }
    if(operation==='socket-ticket'&&request.method==='POST'){
      const result=await stub.socketTicket(token);
      return result.error?fail(request,result.error,result.status||400):json(request,result);
    }
    if(operation==='command'&&request.method==='POST'){
      let body;try{body=await smallJSON(request);}catch{return fail(request,'Invalid JSON');}
      const result=await stub.applyCommand(token,body);
      return result.error?fail(request,result.error,result.status||400):json(request,result);
    }
    return fail(request,'Not found',404);
  }
};