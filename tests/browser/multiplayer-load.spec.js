import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const API='http://127.0.0.1:8787';
const evaluations=JSON.parse(readFileSync(new URL('../../content/evaluations.json',import.meta.url),'utf8')).evaluations;
const byId=Object.fromEntries(evaluations.map(item=>[item.id,item]));
const post=async(req,path,data,token)=>req.post(API+path,{
  ...(token?{headers:{Authorization:'Bearer '+token}}:{}),data
});
const state=async(req,code,token)=>{
  const r=await req.get(API+'/rooms/'+code+'/state',{
    headers:{Authorization:'Bearer '+token}});
  expect(r.status()).toBe(200);return r.json();
};
test('45-student room: concurrent joins, WebSocket fanout, answers, reconnects and team/class celebration',async({page,request,isMobile})=>{
  test.skip(isMobile,'Full 45-WebSocket load runs once; mobile-specific interactions have independent tests.');
  test.setTimeout(140000);
  const timings=[];
  const start=performance.now();
  const created=await post(request,'/rooms',{roundLength:1,game:'sort'});
  expect(created.status()).toBe(201);
  const host=await created.json(),code=host.code;
  const cmd=async(token,data,expected=200)=>{
    const r=await post(request,'/rooms/'+code+'/command',data,token);
    expect(r.status(),JSON.stringify(await r.json())).toBe(expected);
    return r;
  };
  await cmd(host.token,{type:'teams-set',count:4});
  await cmd(host.token,{type:'goal-set',target:80});
  const joinedAt=performance.now();
  const responses=await Promise.all(Array.from({length:45},(_,i)=>
    post(request,'/rooms/'+code+'/join',{
      name:'Load '+String(i+1).padStart(2,'0')
    })));
  timings.push({name:'45 joins',ms:Math.round(performance.now()-joinedAt)});
  expect(responses.every(r=>r.status()===201)).toBe(true);
  const students=await Promise.all(responses.map(r=>r.json()));
  expect(new Set(students.map(s=>s.token)).size).toBe(45);
  expect((await post(request,'/rooms/'+code+'/join',{name:'Student 46'})).status()).toBe(400);
  let snap=await state(request,code,host.token);
  expect(snap.players).toHaveLength(45);
  expect(snap.teams).toHaveLength(4);
  const sizes=snap.teams.map(t=>t.members);
  expect(Math.max(...sizes)-Math.min(...sizes)).toBeLessThanOrEqual(1);
  expect(snap.classQuest.target).toBe(80);
  const tickets=await Promise.all(students.map(async(s)=>{
    const r=await post(request,'/rooms/'+code+'/socket-ticket',{},s.token);
    expect(r.status()).toBe(200);return r.json();
  }));
  await page.goto('/multiplayer.html');
  const connectedAt=performance.now();
  const sockets=await page.evaluate(async({code,tickets})=>{
    window.__stressSockets={};window.__stressStates={};window.__stressMessages={};
    const timeout=ms=>new Promise((_,reject)=>setTimeout(()=>reject(new Error('WebSocket connection timeout')),ms));
    async function connect(t){
      return Promise.race([new Promise((resolve,reject)=>{
        const ws=new WebSocket('ws://127.0.0.1:8787/rooms/'+code+'/ws?id='+t.participantId+'&ticket='+t.ticket);
        window.__stressSockets[t.participantId]=ws;
        ws.onmessage=event=>{
          try{
            const msg=JSON.parse(event.data);
            if(msg.type==='state'){
              window.__stressStates[t.participantId]=msg.data;
              window.__stressMessages[t.participantId]=(window.__stressMessages[t.participantId]||0)+1;
              resolve(true);
            }
          }catch(e){reject(e)}
        };
        ws.onerror=()=>reject(new Error('WebSocket upgrade failed'));
      }),timeout(28000)]);
    }
    const results=await Promise.all(tickets.map(connect));
    return results.filter(Boolean).length;
  },{code,tickets});
  expect(sockets).toBe(45);
  timings.push({name:'45 socket handshakes',ms:Math.round(performance.now()-connectedAt)});
  try{
    await cmd(host.token,{type:'start'});
    snap=await state(request,code,host.token);
    expect(snap.question.kind).toBe('sort');
    const placements=Object.fromEntries(snap.question.statements.map(x=>{
      const from=byId[x.id];
      expect(from).toBeTruthy();
      return [x.id,from.subject+':'+from.polarity];
    }));
    const submittedAt=performance.now();
    const submitted=await Promise.all(students.map(s=>
      post(request,'/rooms/'+code+'/command',{type:'answer',placements},s.token)));
    timings.push({name:'45 concurrent graded submissions',ms:Math.round(performance.now()-submittedAt)});
    expect(submitted.every(r=>r.status()===200)).toBe(true);
    const before=await state(request,code,host.token);
    expect(before.players.filter(p=>p.answered)).toHaveLength(45);
    expect(before.classQuest.correct).toBe(0);
    expect(before.teams.every(t=>t.averageScore===0)).toBe(true);
    expect(before.players.every(p=>p.score===0)).toBe(true);
    const duplicate=await post(request,'/rooms/'+code+'/command',{type:'answer',placements},students[0].token);
    expect(duplicate.status()).toBe(400);
    await cmd(host.token,{type:'reveal'});
    const after=await state(request,code,host.token);
    expect(after.question).toBe(null);
    expect(after.reveal.answers).toHaveLength(45);
    expect(after.players.every(p=>p.score>=1000)).toBe(true);
    expect(after.teams.every(t=>t.accuracy===100)).toBe(true);
    expect(after.classQuest.correct).toBe(45*snap.question.statements.length);
    await expect.poll(async()=>page.evaluate(()=>
      Object.values(window.__stressStates).filter(s=>s?.status==='reveal').length
    ),{timeout:25000}).toBe(45);
    const reconnecting=tickets.slice(0,6).map(t=>t.participantId);
    await page.evaluate(ids=>ids.forEach(id=>window.__stressSockets[id].close(1000,'Reconnecting')),reconnecting);
    const newTickets=await Promise.all(students.slice(0,6).map(async student=>{
      const r=await post(request,'/rooms/'+code+'/socket-ticket',{},student.token);
      expect(r.status()).toBe(200);return r.json();
    }));
    const reconnected=await page.evaluate(async({code,tickets})=>{
      let count=0;
      for(const t of tickets){
        await new Promise((resolve,reject)=>{
          const ws=new WebSocket('ws://127.0.0.1:8787/rooms/'+code+'/ws?id='+t.participantId+'&ticket='+t.ticket);
          window.__stressSockets[t.participantId]=ws;
          const timeout=setTimeout(()=>reject(new Error('Reconnect timeout')),12000);
          ws.onmessage=ev=>{
            const update=JSON.parse(ev.data);
            if(update.type==='state'){
              window.__stressStates[t.participantId]=update.data;
              clearTimeout(timeout);count++;resolve();
            }
          };
          ws.onerror=()=>{clearTimeout(timeout);reject(new Error('Reconnect failed'));};
        });
      }
      return count;
    },{code,tickets:newTickets});
    expect(reconnected).toBe(6);
    await cmd(host.token,{type:'next'});
    const finished=await state(request,code,host.token);
    expect(finished.status).toBe('finished');
    expect(finished.classQuest.achieved).toBe(true);
    expect(finished.teams.every(t=>t.questComplete)).toBe(true);
    await cmd(host.token,{type:'ceremony-start'});
    let ceremony=await state(request,code,host.token);
    expect(ceremony.ceremony.slide.kind).toBe('welcome');
    await cmd(host.token,{type:'ceremony-next'});
    ceremony=await state(request,code,host.token);
    expect(ceremony.ceremony.slide.kind).toBe('team-podium');
    expect(ceremony.ceremony.slide.standings).toHaveLength(4);
    await cmd(host.token,{type:'ceremony-next'});
    ceremony=await state(request,code,host.token);
    expect(ceremony.ceremony.slide.kind).toBe('class-quest');
    expect(ceremony.ceremony.slide.achieved).toBe(true);
    const seen=await page.evaluate(()=>Object.values(window.__stressMessages));
    expect(seen).toHaveLength(45);
    expect(Math.min(...seen)).toBeGreaterThanOrEqual(3);
    timings.push({name:'whole stress scenario',ms:Math.round(performance.now()-start)});
    console.log('Pass 6 synthetic classroom stress: '+JSON.stringify(timings));
    await test.info().attach('synthetic-classroom-load',{
      body:Buffer.from(JSON.stringify({studentCount:45,webSockets:45,allCorrect:true,timings},null,2)),
      contentType:'application/json'
    });
  }finally{
    await page.evaluate(()=>Object.values(window.__stressSockets||{}).forEach(ws=>{
      if(ws.readyState<2)ws.close(1000,'Load test complete');
    }));
  }
});
