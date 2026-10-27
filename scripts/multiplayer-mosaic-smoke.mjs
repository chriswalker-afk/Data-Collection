import assert from 'node:assert/strict';
import {RELAY_PUZZLES} from '../multiplayer/relay-bank.js';

const API=(process.env.MULTIPLAYER_API||'http://127.0.0.1:8787').replace(/\/$/,'');
const EXPECTED=process.env.EXPECTED_BUILD_SHA;
const bank=RELAY_PUZZLES.flatMap(p=>p.parts);
const auth=token=>({Authorization:'Bearer '+token});
async function request(path,{data,token,expected=200}={}){
 const response=await fetch(API+path,{method:data===undefined?'GET':'POST',
   headers:{...(token?auth(token):{}),...(data!==undefined?{'Content-Type':'application/json'}:{})},
   ...(data!==undefined?{body:JSON.stringify(data)}:{})});
 const text=await response.text();
 assert.equal(response.status,expected,`${path}: ${response.status} ${text.slice(0,400)}`);
 try{return JSON.parse(text);}catch{throw Error(`Unexpected non-JSON response from ${path}`)}
}
function answer(task){
 const piece=bank.find(p=>p.prompt===task.prompt);
 assert.ok(piece,'assigned question must be from the private mathematical bank');
 const option=task.options.find(o=>o.label===piece.correct);
 assert.ok(option,'server-shuffled safe choices must include the correct option');
 return {type:'mosaic-answer',roundId:task.roundId,partIndex:task.partIndex,
   choiceId:option.id,score:999999,tiles:99,achieved:true};
}
async function main(){
 const health=await request('/health');
 assert.equal(health.ok,true);
 assert.ok(health.features.includes('puzzle-relay'));
 if(EXPECTED)assert.equal(health.buildSha,EXPECTED,'Staging Worker must match exact Git SHA');
 const host=await request('/rooms',{data:{objective:'mosaic',game:'which',roundLength:5,
   minutes:3,teamCount:2,mosaicTiles:6},expected:201});
 const path=`/rooms/${host.code}`;
 const students=[];
 for(let i=0;i<4;i++)students.push(await request(path+'/join',{data:{name:'Relay Staging '+(i+1)},expected:201}));
 await request(path+'/command',{token:host.token,data:{type:'start'}});
 let attempts=0;
 while(attempts++<25){
   const room=await request(path+'/state',{token:host.token});
   if(room.status==='finished')break;
   let submitted=false;
   for(const student of students){
     const state=await request(path+'/state',{token:student.token});
     const task=state.mosaic.me?.task;
     if(!task)continue;
     assert.equal(state.players.every(p=>p.score===0),true);
     assert.equal(state.question,null);
     await request(path+'/command',{token:student.token,data:answer(task)});
     submitted=true;break;
   }
   assert.ok(submitted,'every unfinished mosaic must have one assigned puzzle role');
 }
 const completed=await request(path+'/state',{token:host.token});
 assert.equal(completed.status,'finished');
 assert.equal(completed.mosaic.completedTiles,6);
 assert.equal(completed.mosaic.achieved,true);
 assert.equal(completed.mosaic.teams.every(t=>t.tiles>0),true);
 await request(path+'/command',{token:host.token,data:{type:'ceremony-start'}});
 await request(path+'/command',{token:host.token,data:{type:'ceremony-next'}});
 const ceremony=await request(path+'/state',{token:host.token});
 assert.equal(ceremony.ceremony.slide.kind,'mosaic');
 assert.equal(ceremony.ceremony.slide.achieved,true);
 assert.equal(ceremony.ceremony.slide.completedTiles,6);
 const classic=await request('/rooms',{data:{roundLength:5,game:'which'},expected:201});
 assert.ok(/^\d{6}$/.test(classic.code),'Classic rooms remain compatible');
 console.log('Exact-revision staging Class Mosaic: PASS ('+health.buildSha+') — 6 tiles, two distinct teams, private role grading, authentic class ceremony and Classic compatibility.');
}
await main();