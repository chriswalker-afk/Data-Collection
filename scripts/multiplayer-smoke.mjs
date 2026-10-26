// Staging smoke test. Runs only against the configured Cloudflare Worker URL.
// No personal information is sent: generated nickname and a short-lived room.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const base=(process.env.MULTIPLAYER_API||'').replace(/\/$/,'');
if(!/^https:\/\/[-a-z0-9.]+\.workers\.dev$/.test(base))throw new Error('Expected a Cloudflare staging workers.dev URL');
const bank=JSON.parse(readFileSync(new URL('../content/scenarios.json',import.meta.url),'utf8')).scenarios;
const timeout=ms=>AbortSignal.timeout(ms);
async function request(method,path,body,token){
  const response=await fetch(base+path,{method,signal:timeout(12000),headers:{
    ...(body!==undefined?{'Content-Type':'application/json'}:{}),
    ...(token?{Authorization:'Bearer '+token}:{})
  },...(body!==undefined?{body:JSON.stringify(body)}:{})});
  const data=await response.json();
  return {status:response.status,data};
}
function expectStatus(result,status,label){
  assert.equal(result.status,status,label+' '+JSON.stringify(result.data));
  return result.data;
}
async function connectWebSocket(code,session){
  const ticket=expectStatus(await request('POST','/rooms/'+code+'/socket-ticket',{},session.token),200,'ticket');
  assert.match(ticket.ticket,/^[0-9a-f-]{36}$/);
  return new Promise((resolve,reject)=>{
    const endpoint=base.replace(/^http/,'ws')+'/rooms/'+code+'/ws?id='+
      encodeURIComponent(ticket.participantId)+'&ticket='+encodeURIComponent(ticket.ticket);
    const ws=new WebSocket(endpoint);
    const timer=setTimeout(()=>{ws.close();reject(new Error('WebSocket handshake timeout'));},12000);
    ws.onmessage=event=>{
      try{
        const update=JSON.parse(event.data);
        if(update.type!=='state')return;
        clearTimeout(timer);resolve({ws,initial:update.data,ticket});
      }catch(error){clearTimeout(timer);reject(error);}
    };
    ws.onerror=()=>{clearTimeout(timer);reject(new Error('WebSocket upgrade failed'));};
  });
}
const health=expectStatus(await request('GET','/health'),200,'health');
assert.equal(health.transport,'websocket');
const host=expectStatus(await request('POST','/rooms',{roundLength:5}),201,'create room');
assert.match(host.code,/^\d{6}$/);
const h=await connectWebSocket(host.code,host);
assert.equal(h.initial.status,'lobby');
const guest=expectStatus(await request('POST','/rooms/'+host.code+'/join',{name:'Staging Otter'}),201,'join');
expectStatus(await request('POST','/rooms/'+host.code+'/command',{type:'lock'},host.token),200,'lock joining');
const blocked=await request('POST','/rooms/'+host.code+'/join',{name:'Late Penguin'});
assert.equal(blocked.status,400);
assert.match(blocked.data.error,/locked/i);
const forbidden=await request('POST','/rooms/'+host.code+'/command',{type:'unlock'},guest.token);
assert.equal(forbidden.status,400);
expectStatus(await request('POST','/rooms/'+host.code+'/command',{type:'unlock'},host.token),200,'unlock joining');
const temporary=expectStatus(await request('POST','/rooms/'+host.code+'/join',{name:'Staging Llama'}),201,'join after unlock');
const withTemporary=expectStatus(await request('GET','/rooms/'+host.code+'/state',undefined,host.token),200,'host roster');
const llama=withTemporary.players.find(person=>person.name==='Staging Llama');
assert.ok(llama);
expectStatus(await request('POST','/rooms/'+host.code+'/command',{type:'remove',targetId:llama.id},host.token),200,'remove nickname');
const removed=await request('GET','/rooms/'+host.code+'/state',undefined,temporary.token);
assert.equal(removed.status,401);

const pre=expectStatus(await request('GET','/rooms/'+host.code+'/state',undefined,guest.token),200,'student state');
assert.equal(pre.players.length,1);
assert.ok(!JSON.stringify(pre).includes('hostToken'));
expectStatus(await request('POST','/rooms/'+host.code+'/command',{type:'start'},host.token),200,'start');
const playing=expectStatus(await request('GET','/rooms/'+host.code+'/state',undefined,guest.token),200,'question');
assert.ok(playing.question.prompt);
assert.ok(!JSON.stringify(playing).includes('correctMethod'));
const source=bank.find(x=>x.id===playing.question.id);
assert.ok(source);
expectStatus(await request('POST','/rooms/'+host.code+'/command',{type:'answer',method:source.correctMethod},guest.token),200,'answer');
const duplicate=await request('POST','/rooms/'+host.code+'/command',{type:'answer',method:source.correctMethod},guest.token);
assert.equal(duplicate.status,400);
expectStatus(await request('POST','/rooms/'+host.code+'/command',{type:'reveal'},host.token),200,'reveal');
const after=expectStatus(await request('GET','/rooms/'+host.code+'/state',undefined,guest.token),200,'revealed state');
assert.equal(after.reveal.correctMethod,source.correctMethod);
assert.ok(after.players[0].score>=1000);
const cross=await request('GET','/rooms/'+host.code+'/state');
assert.equal(cross.status,401);
// Original Which Method? room also supports the ceremony without breaking old rooms.
expectStatus(await request('POST','/rooms/'+host.code+'/command',{type:'close'},host.token),200,'close original');
expectStatus(await request('POST','/rooms/'+host.code+'/command',{type:'ceremony-start'},host.token),200,'start Which ceremony');
let classic=expectStatus(await request('GET','/rooms/'+host.code+'/state',undefined,guest.token),200,'Which welcome');
assert.equal(classic.ceremony.slide.kind,'welcome');
assert.equal(classic.myMultiplayerAwards,null);
expectStatus(await request('POST','/rooms/'+host.code+'/command',{type:'ceremony-next'},host.token),200,'Which podium');
classic=expectStatus(await request('GET','/rooms/'+host.code+'/state',undefined,guest.token),200,'Which podium');
assert.equal(classic.ceremony.slide.kind,'podium');
assert.equal(classic.ceremony.slide.standings[0].name,'Staging Otter');
expectStatus(await request('POST','/rooms/'+host.code+'/command',{type:'ceremony-finale'},host.token),200,'Which finale');
expectStatus(await request('POST','/rooms/'+host.code+'/command',{type:'ceremony-end'},host.token),200,'Which ceremony complete');
h.ws.close(1000,'Smoke test done');
console.log('PASS: Cloudflare staging WebSocket, join lock/unlock/removal, question privacy, scoring and host permissions.');

const concepts=JSON.parse(readFileSync(new URL('../content/concepts.json',import.meta.url),'utf8')).concepts;
const evaluations=JSON.parse(readFileSync(new URL('../content/evaluations.json',import.meta.url),'utf8')).evaluations;
const evaluationIndex=Object.fromEntries(evaluations.map(item=>[item.id,item]));
for(const game of ['speed','match','sort']){
  const length=game==='speed'?5:1;
  const room=expectStatus(await request('POST','/rooms',{roundLength:length,game}),201,'create '+game);
  const student=expectStatus(await request('POST','/rooms/'+room.code+'/join',{name:'Mode '+game}),201,'join '+game);
  const basePath='/rooms/'+room.code;
  const lobby=expectStatus(await request('GET',basePath+'/state',undefined,student.token),200,game+' lobby');
  assert.equal(lobby.game,game);
  assert.equal(lobby.questionSeconds,{speed:25,match:75,sort:90}[game]);
  const forbidden=await request('POST',basePath+'/command',{type:'start'},student.token);
  assert.equal(forbidden.status,400,'student cannot start');
  expectStatus(await request('POST',basePath+'/command',{type:'start'},room.token),200,'start '+game);
  const playing=expectStatus(await request('GET',basePath+'/state',undefined,student.token),200,game+' question');
  assert.equal(playing.question.total,length);
  for(const secret of ['correctMethod','correctDestination','correctTerm','answerKey','solutions','sourceId'])
    assert.ok(!JSON.stringify(playing).includes('"'+secret+'"'),game+' must not leak '+secret);
  let answer;
  if(game==='speed'){
    const source=concepts.find(x=>x.id===playing.question.id);
    assert.ok(source&&source.definition===playing.question.prompt);
    answer={response:source.label};
  }else if(game==='match'){
    const q=playing.question;
    assert.equal(q.terms.length,6);
    answer={pairs:Object.fromEntries(q.terms.map(term=>{
      const definition=concepts.find(c=>c.id===term.id).definition;
      const index=q.definitions.find(d=>d.text===definition);
      assert.ok(index,'audited definition present');
      return [term.id,index.id];
    }))};
    const invalid=await request('POST',basePath+'/command',{type:'answer',pairs:{}},student.token);
    assert.equal(invalid.status,400);
  }else{
    const q=playing.question;
    assert.equal(q.destinations.length,4);
    answer={placements:Object.fromEntries(q.statements.map(item=>{
      const source=evaluationIndex[item.id];assert.ok(source);
      return [item.id,source.subject+':'+source.polarity];
    }))};
  }
  expectStatus(await request('POST',basePath+'/command',{type:'answer',...answer},student.token),200,'grade '+game);
  assert.equal((await request('POST',basePath+'/command',{type:'answer',...answer},student.token)).status,400);
  expectStatus(await request('POST',basePath+'/command',{type:'reveal'},room.token),200,'reveal '+game);
  const review=expectStatus(await request('GET',basePath+'/state',undefined,student.token),200,'review '+game);
  assert.equal(review.reveal.answers[0].correctCount,review.reveal.answers[0].total);
  assert.ok(review.reveal.answers[0].points>=1000);
  if(game==='match')assert.equal(review.reveal.solutions.length,6);
  if(game==='sort')assert.equal(review.reveal.solutions.length,playing.question.statements.length);
  if(game==='speed')assert.ok(review.reveal.correctTerm);
  expectStatus(await request('POST',basePath+'/command',{type:'close'},room.token),200,'close '+game);
  assert.equal((await request('POST',basePath+'/command',{type:'ceremony-start',awards:['precision-penguin']},student.token)).status,400);
  expectStatus(await request('POST',basePath+'/command',{type:'ceremony-start'},room.token),200,'start ceremony '+game);
  let ceremonyState=expectStatus(await request('GET',basePath+'/state',undefined,student.token),200,'welcome '+game);
  assert.equal(ceremonyState.ceremony.slide.kind,'welcome');
  assert.equal(ceremonyState.myMultiplayerAwards,null);
  assert.ok(!JSON.stringify(ceremonyState.ceremony).includes('match-mongoose'));
  assert.equal((await request('POST',basePath+'/command',{type:'ceremony-next'},student.token)).status,400);
  expectStatus(await request('POST',basePath+'/command',{type:'ceremony-next'},room.token),200,'podium '+game);
  ceremonyState=expectStatus(await request('GET',basePath+'/state',undefined,student.token),200,'podium '+game);
  assert.equal(ceremonyState.ceremony.slide.kind,'podium');
  assert.equal(ceremonyState.ceremony.slide.standings[0].score,review.players[0].score);
  expectStatus(await request('POST',basePath+'/command',{type:'ceremony-prev'},room.token),200,'back to welcome');
  expectStatus(await request('POST',basePath+'/command',{type:'ceremony-finale'},room.token),200,'skip to finale '+game);
  ceremonyState=expectStatus(await request('GET',basePath+'/state',undefined,student.token),200,'finale '+game);
  assert.equal(ceremonyState.ceremony.slide.kind,'finale');
  assert.equal(ceremonyState.myMultiplayerAwards.completed,true);
  if(game==='match')assert.ok(ceremonyState.myMultiplayerAwards.awarded.includes('match-mongoose'));
  if(game==='sort')assert.ok(ceremonyState.myMultiplayerAwards.awarded.includes('sorting-salamander'));
  if(game==='speed')assert.deepEqual(ceremonyState.myMultiplayerAwards.awarded,[]);
  expectStatus(await request('POST',basePath+'/command',{type:'ceremony-end'},room.token),200,'end ceremony '+game);
  const complete=expectStatus(await request('GET',basePath+'/state',undefined,student.token),200,'completed '+game);
  assert.equal(complete.status,'finished');
  assert.equal(complete.finished.ceremonyCompleted,true);
  expectStatus(await request('POST',basePath+'/command',{type:'ceremony-start'},room.token),200,'replay '+game);
  assert.equal(expectStatus(await request('GET',basePath+'/state',undefined,student.token),200,'replayed '+game).ceremony.step,0);
}
console.log('PASS: Cloudflare Pass 5 ceremony in all four games, permissions, podium, replay and user-specific keepsakes.');

const teamwork=expectStatus(await request('POST','/rooms',{roundLength:1,game:'sort'}),201,'create classroom teamwork');
const path='/rooms/'+teamwork.code;
expectStatus(await request('POST',path+'/command',{type:'teams-set',count:3},teamwork.token),200,'enable 3 teams');
expectStatus(await request('POST',path+'/command',{type:'goal-set',target:80},teamwork.token),200,'set 80% class goal');
const teamStudents=await Promise.all(Array.from({length:6},(_,i)=>
  request('POST',path+'/join',{name:'Team '+String(i+1)},undefined)));
const sessions=teamStudents.map((r,i)=>expectStatus(r,201,'team join '+i));
const teamLobby=expectStatus(await request('GET',path+'/state',undefined,teamwork.token),200,'lobby teams');
assert.equal(teamLobby.players.length,6);
assert.equal(teamLobby.teamCount,3);
assert.equal(teamLobby.goalTarget,80);
assert.ok(teamLobby.teams.every(t=>t.members===2));
const badTeam=await request('POST',path+'/command',{type:'teams-set',count:4},sessions[0].token);
assert.equal(badTeam.status,400);
expectStatus(await request('POST',path+'/command',{type:'teams-shuffle'},teamwork.token),200,'shuffle teams');
const shuffledTeam=expectStatus(await request('GET',path+'/state',undefined,sessions[0].token),200,'updated team');
assert.ok(shuffledTeam.players.every(p=>p.teamId));
expectStatus(await request('POST',path+'/command',{type:'start'},teamwork.token),200,'team game starts');
const teamQuestion=expectStatus(await request('GET',path+'/state',undefined,sessions[0].token),200,'team question');
const placements=Object.fromEntries(teamQuestion.question.statements.map(item=>{
  const source=evaluationIndex[item.id];assert.ok(source,'existing Solo evaluation');
  return [item.id,source.subject+':'+source.polarity];
}));
const teamAnswers=await Promise.all(sessions.map(session=>
  request('POST',path+'/command',{type:'answer',placements},session.token)));
teamAnswers.forEach((result,i)=>expectStatus(result,200,'team answer '+i));
const unrevealedTeam=expectStatus(await request('GET',path+'/state',undefined,sessions[0].token),200,'unrevealed class');
assert.ok(unrevealedTeam.players.every(p=>p.score===0),'checked results are hidden until teacher reveals');
assert.equal(unrevealedTeam.classQuest.correct,0);
assert.ok(unrevealedTeam.teams.every(t=>t.averageScore===0));
assert.equal((await request('POST',path+'/command',{type:'feedback-post',text:'Spoofed'},sessions[0].token)).status,400);
expectStatus(await request('POST',path+'/command',{type:'reveal'},teamwork.token),200,'team review');
expectStatus(await request('POST',path+'/command',{
  type:'feedback-post',text:'Check the reason each statement belongs in its correct column.'
},teamwork.token),200,'teacher reasoning');
const teamReview=expectStatus(await request('GET',path+'/state',undefined,sessions[0].token),200,'team feedback received');
assert.match(teamReview.teacherFeedback.text,/Check the reason/);
assert.equal(teamReview.questionPulse.responses,6);
assert.equal(teamReview.classQuest.accuracy,100);
assert.ok(teamReview.teams.every(t=>t.accuracy===100));
assert.equal((await request('POST',path+'/command',{type:'teams-set',count:0},teamwork.token)).status,400);
expectStatus(await request('POST',path+'/command',{type:'next'},teamwork.token),200,'team game finished');
const teamEnd=expectStatus(await request('GET',path+'/state',undefined,teamwork.token),200,'class quest final');
assert.equal(teamEnd.classQuest.achieved,true);
assert.ok(teamEnd.teams.every(t=>t.questComplete));
expectStatus(await request('POST',path+'/command',{type:'ceremony-start'},teamwork.token),200,'team ceremony');
expectStatus(await request('POST',path+'/command',{type:'ceremony-next'},teamwork.token),200,'team podium reveal');
const teamCeremony=expectStatus(await request('GET',path+'/state',undefined,sessions[1].token),200,'team podium state');
assert.equal(teamCeremony.ceremony.slide.kind,'team-podium');
assert.equal(teamCeremony.ceremony.slide.standings.length,3);
expectStatus(await request('POST',path+'/command',{type:'ceremony-next'},teamwork.token),200,'class quest reveal');
assert.equal(expectStatus(await request('GET',path+'/state',undefined,sessions[0].token),200,'class goal slide').ceremony.slide.achieved,true);
console.log('PASS: Pass 6 teacher-only teams, balanced six-player setup, hidden scores, class quest, feedback and ceremony.');


