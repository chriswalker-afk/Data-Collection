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
h.ws.close(1000,'Smoke test done');
console.log('PASS: Cloudflare staging real room, WebSocket, join, question privacy, score, reveal and host permissions.');
