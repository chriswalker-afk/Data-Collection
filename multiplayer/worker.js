import {DurableObject} from 'cloudflare:workers';
import {SCENARIOS} from './scenarios.js';
import {ROUND_LENGTHS,cleanNickname,secureIndex} from './rules.js';
import {GAME_MODES,validLength,questionTimeMs,makeGameDeck,safeGameQuestion,revealGameAnswer,gradeGameAnswer} from './modes.js';
import {makeCeremony,ceremonySnapshot,collectableReceipt} from './ceremony-rules.js';
import {
  TEAM_DEFINITIONS,TEAM_COUNTS,CLASS_TARGETS,balanceTeams,nextTeamId,
  teamStandings,classQuestSnapshot,classroomFeedbackSnapshot,cleanTeacherFeedback,questionPulse
} from './team-rules.js';

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
function preparedView(room){
  const visible=room.status==='playing'?
    (room.results||[]).filter(r=>r.index<room.index):room.results||[];
  const visibleScores=new Map();
  for(const result of visible)
    visibleScores.set(result.playerId,(visibleScores.get(result.playerId)||0)+result.points);
  return {
    visibleScores,answered:new Set(room.answers.map(a=>a.id)),
    teams:teamStandings(room,room.status!=='playing'),
    classQuest:classQuestSnapshot(room),
    teacherFeedback:classroomFeedbackSnapshot(room),
    questionPulse:questionPulse(room)
  };
}
function publicState(room,participant,now,connections,prepared=preparedView(room)){
  const game=room.game||'which'; // Pass 1/2 rooms remain compatible.
  const question=room.status==='playing'?room.deck[room.index]:null;
  const revealed=room.status==='reveal'?room.deck[room.index]:null;
  return {
    code:room.code,status:room.status,game,roundLength:room.roundLength,
    teamCount:room.teamCount||0,goalTarget:room.goalTarget||0,
    teams:prepared.teams,classQuest:prepared.classQuest,
    teacherFeedback:prepared.teacherFeedback,questionPulse:prepared.questionPulse,
    questionSeconds:questionTimeMs(game)/1000,locked:Boolean(room.locked),
    players:room.players.map(p=>({
      id:p.id,name:p.name,score:prepared.visibleScores.get(p.id)||0,
      teamId:p.teamId||null,online:connections.has(p.id),
      answered:prepared.answered.has(p.id)
    })),
    me:{id:participant.id,name:participant.name,host:participant.host===true},
    question:question?{index:room.index+1,total:room.deck.length,
      ...safeGameQuestion(game,question),deadline:room.deadline,serverNow:now}:null,
    reveal:revealed?{index:room.index+1,total:room.deck.length,
      question:safeGameQuestion(game,revealed),
      ...revealGameAnswer(game,revealed),
      answers:room.answers.map(a=>({
        id:a.id,points:a.points,correctCount:a.correctCount,total:a.total,
        ...(game==='which'?{method:a.method}:{})
      }))}:null,
    finished:room.status==='finished'?{total:room.deck.length,
      ceremonyAvailable:room.players.length>0,ceremonyCompleted:Boolean(room.ceremony?.completed)}:null,
    ceremony:ceremonySnapshot(room,participant),
    myMultiplayerAwards:collectableReceipt(room,participant)
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
  async create(code,roundLength,game='which'){
    if(this.room()||this.ctx.storage.kv.get('room'))return {error:'Room code already in use'};
    if(!validLength(game,roundLength))return {error:'Invalid game or round length'};
    const room={code,status:'lobby',created:Date.now(),game,roundLength,locked:false,
      hostToken:crypto.randomUUID(),ceremonyId:crypto.randomUUID(),players:[],deck:[],index:0,deadline:0,answers:[],results:[],ceremony:null,teamCount:0,goalTarget:0,feedback:null,feedbackUpdates:0};
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
    if(room.locked)return {error:'This classroom is locked. Ask the teacher to reopen joining'};
    const nickname=cleanNickname(name);
    if(!nickname)return {error:'Choose a nickname of 2–20 letters or numbers'};
    if(room.players.length>=MAX_PLAYERS)return {error:'This classroom is full'};
    if(room.players.some(p=>p.name.toLocaleLowerCase('en-GB')===nickname.toLocaleLowerCase('en-GB')))
      return {error:'Nickname already in use'};
    const person={id:crypto.randomUUID(),token:crypto.randomUUID(),name:nickname,score:0,
      teamId:nextTeamId(room.players,room.teamCount||0)};
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
    if(command.type==='lock'&&person.host&&room.status==='lobby'){
      room.locked=true;
    }else if(command.type==='unlock'&&person.host&&room.status==='lobby'){
      room.locked=false;
    }else if(command.type==='remove'&&person.host&&room.status!=='finished'&&room.status!=='ceremony'){
      if(typeof command.targetId!=='string'||!UUID.test(command.targetId))return {error:'Invalid participant'};
      const index=room.players.findIndex(p=>p.id===command.targetId);
      if(index<0)return {error:'Participant not found'};
      room.players.splice(index,1);
      room.answers=room.answers.filter(a=>a.id!==command.targetId);
      room.results=(room.results||[]).filter(a=>a.playerId!==command.targetId);
      if(room.status==='lobby'&&(room.teamCount||0))
        room.players=balanceTeams(room.players,room.teamCount);
      for(const ws of this.ctx.getWebSockets()){
        if(ws.deserializeAttachment()?.id===command.targetId){try{ws.close(4003,'Removed by host');}catch{}}
      }
    }else if(command.type==='leave'&&!person.host){
      room.players=room.players.filter(p=>p.id!==person.id);
      room.answers=room.answers.filter(a=>a.id!==person.id);
      room.results=(room.results||[]).filter(a=>a.playerId!==person.id);
      if(room.status==='lobby'&&(room.teamCount||0))
        room.players=balanceTeams(room.players,room.teamCount);
      for(const ws of this.ctx.getWebSockets()){
        if(ws.deserializeAttachment()?.id===person.id){try{ws.close(4000,'Left classroom');}catch{}}
      }
    }else if(command.type==='teams-set'&&person.host&&room.status==='lobby'){
      if(!Number.isInteger(command.count)||!TEAM_COUNTS.includes(command.count))
        return {error:'Choose Solo or 2–4 teams'};
      room.teamCount=command.count;
      room.players=balanceTeams(room.players,room.teamCount);
    }else if(command.type==='teams-shuffle'&&person.host&&room.status==='lobby'&&(room.teamCount||0)){
      const shuffled=[...room.players];
      for(let i=shuffled.length-1;i>0;i--){
        const j=secureIndex(i+1);
        [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];
      }
      const assignment=new Map(balanceTeams(shuffled,room.teamCount).map(p=>[p.id,p.teamId]));
      room.players=room.players.map(p=>({...p,teamId:assignment.get(p.id)}));
    }else if(command.type==='goal-set'&&person.host&&room.status==='lobby'){
      if(!Number.isInteger(command.target)||!CLASS_TARGETS.includes(command.target))
        return {error:'Choose no class goal or 70%, 80%, 90%'};
      room.goalTarget=command.target;
    }else if(command.type==='start'&&person.host&&room.status==='lobby'){
      if(room.players.length===0)return {error:'At least one student must join'};
      if((room.teamCount||0)>room.players.length)
        return {error:'Each team needs at least one student before starting'};
      room.deck=makeGameDeck(room.game||'which',room.roundLength,SCENARIOS);room.index=0;room.answers=[];
      room.results=[];room.ceremony=null;room.feedback=null;room.feedbackUpdates=0;
      room.status='playing';room.deadline=Date.now()+questionTimeMs(room.game||'which');
    }else if(command.type==='answer'&&!person.host&&room.status==='playing'){
      if(Date.now()>=room.deadline)return {error:'Time is up'};
      if(room.answers.some(a=>a.id===person.id))return {error:'Answer already submitted'};
      const game=room.game||'which',duration=questionTimeMs(game);
      const elapsed=Math.max(0,Math.min(duration,duration-(room.deadline-Date.now())));
      const graded=gradeGameAnswer(game,room.deck[room.index],command,elapsed,duration);
      if(graded.error)return {error:graded.error};
      room.answers.push({id:person.id,...graded});
      // Verified, immutable evidence of the first accepted submission only.
      // Never record client-supplied grades, achievements, deadlines or nicknames.
      if(!Array.isArray(room.results))room.results=[];
      const question=room.deck[room.index];
      room.results.push({
        playerId:person.id,index:room.index,questionId:question.id,
        correctCount:graded.correctCount,total:graded.total,points:graded.points,
        ...(game==='which'&&graded.correctCount===graded.total?{method:question.correctMethod}:{}),
        ...(game==='speed'&&graded.correctCount===graded.total?{termId:question.id}:{})
      });
      const player=room.players.find(p=>p.id===person.id);
      player.score+=graded.points;
    }else if(command.type==='reveal'&&person.host&&room.status==='playing'){
      if(Date.now()<room.deadline&&room.answers.length<room.players.length)
        return {error:'Wait until everyone has answered or the timer finishes'};
      room.status='reveal';room.feedback=null;room.feedbackUpdates=0;
    }else if(command.type==='next'&&person.host&&room.status==='reveal'){
      room.index+=1;room.answers=[];room.feedback=null;room.feedbackUpdates=0;
      room.status=room.index>=room.deck.length?'finished':'playing';
      room.deadline=room.status==='playing'?Date.now()+questionTimeMs(room.game||'which'):0;
    }else if(command.type==='feedback-post'&&person.host&&room.status==='reveal'){
      if(room.feedbackUpdates>=3)return {error:'Three feedback updates is the maximum for this question'};
      const text=cleanTeacherFeedback(command.text);
      if(!text)return {error:'Feedback must be 3–160 readable characters'};
      room.feedback={index:room.index,text};
      room.feedbackUpdates++;
    }else if(command.type==='ceremony-start'&&person.host&&room.status==='finished'){
      if(!room.players.length)return {error:'No participants to celebrate'};
      const prepared=room.ceremony||makeCeremony(room);
      room.ceremony={...prepared,step:0,run:(room.ceremony?.run||0)+1,completed:false};
      room.status='ceremony';room.deadline=0;
    }else if(command.type==='ceremony-next'&&person.host&&room.status==='ceremony'){
      if(room.ceremony.step>=room.ceremony.slides.length-1)return {error:'Already at the finale'};
      room.ceremony.step++;
    }else if(command.type==='ceremony-prev'&&person.host&&room.status==='ceremony'){
      if(room.ceremony.step<=0)return {error:'Already at the beginning'};
      room.ceremony.step--;
    }else if(command.type==='ceremony-finale'&&person.host&&room.status==='ceremony'){
      room.ceremony.step=room.ceremony.slides.length-1;
    }else if(command.type==='ceremony-end'&&person.host&&room.status==='ceremony'){
      room.ceremony.completed=true;room.status='finished';
    }else if(command.type==='close'&&person.host&&room.status!=='finished'){
      if(room.status==='ceremony'&&room.ceremony)room.ceremony.completed=true;
      room.status='finished';room.deadline=0;
    }else{return {error:'Action not available'};}
    this.save(room);this.broadcast();return {ok:true};
  }
  broadcast(){
    const room=this.room();if(!room)return;
    const online=this.currentConnections();const now=Date.now();
    const prepared=preparedView(room);
    for(const ws of this.ctx.getWebSockets()){
      const data=ws.deserializeAttachment()||{};
      const person=data.id==='host'?{id:'host',name:'Teacher',host:true}:room.players.find(p=>p.id===data.id);
      if(person){try{ws.send(JSON.stringify({type:'state',data:publicState(room,person,now,online,prepared)}));}catch{ /* client reconnects */ }}
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
      return json(request,{ok:true,service:'sampling-arcade-multiplayer',version:6,transport:'websocket',features:['teams','class-goals','teacher-feedback','ceremony'],games:Object.keys(GAME_MODES)});
    if(url.pathname==='/rooms'&&request.method==='POST'){
      let body;try{body=await smallJSON(request);}catch(e){return fail(request,e.message==='Request too large'?e.message:'Invalid JSON',e.message==='Request too large'?413:400);}
      const roundLength=Number(body.roundLength),game=body.game===undefined?'which':body.game;
      if(!validLength(game,roundLength))return fail(request,'Choose a valid game and round length');
      const key=await fingerprint(request);
      const limiter=env.ROOMS.getByName('limiter:rooms:'+key);
      if(!await limiter.allowRate('create',24,5*60_000))return fail(request,'Room creation limit reached; try again later',429);
      const global=env.ROOMS.getByName('limiter:global');
      if(!await global.allowRate('create',120,60_000))return fail(request,'Classroom service is busy',429);
      for(let attempt=0;attempt<10;attempt++){
        const code=pickCode();
        const result=await env.ROOMS.getByName('room-'+code).create(code,roundLength,game);
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