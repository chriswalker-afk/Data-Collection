import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultAvatar,validAvatar,safeAvatar,HEADS,BODIES,LEGS,PALETTES} from '../multiplayer/avatar.js';
import {roomAwards,makeCeremony} from '../multiplayer/ceremony-rules.js';
test('the full 20-part, seven-colour catalogue is finite and allowlisted',()=>{
 assert.equal(HEADS.length,8);assert.equal(BODIES.length,6);assert.equal(LEGS.length,6);assert.equal(PALETTES.length,7);
 for(const head of HEADS)for(const body of BODIES)for(const legs of LEGS){
   const avatar={version:1,head,body,legs,colours:{head:'original',body:'original',legs:'original'}};
   assert.equal(validAvatar(avatar),true);
   for(const palette of PALETTES){
     const tinted={...avatar,colours:{head:palette,body:palette,legs:palette}};
     assert.equal(validAvatar(tinted),true);
   }
 }
});
test('invalid, hostile and legacy choices fall back safely',()=>{
 for(const invalid of [null,undefined,'svg',{},[],{...defaultAvatar(),head:'<script>'},
  {...defaultAvatar(),colours:{head:'original',body:'external',legs:'original'}},
  {...defaultAvatar(),extra:'user input'}]){
    assert.equal(validAvatar(invalid),false);
    assert.deepEqual(safeAvatar(invalid),defaultAvatar());
 }
});
test('mathematical podium uses unchanged scores and preserves cosmetic selections',()=>{
 const a={...defaultAvatar(),head:'cat',colours:{head:'grape-purple',body:'original',legs:'original'}};
 const room={game:'which',players:[{id:'a',name:'First',score:600,avatar:a},
 {id:'b',name:'Second',score:600},{id:'c',name:'Third',score:100}],
 results:[],teamCount:0,goalTarget:0};
 const podium=roomAwards(room).standings;
 assert.deepEqual(podium.map(p=>p.rank),[1,1,3]);
 assert.deepEqual(podium[0].avatar,a);
 assert.deepEqual(podium[1].avatar,defaultAvatar());
 const ceremony=makeCeremony(room);
 assert.deepEqual(ceremony.slides.find(s=>s.kind==='podium').standings.map(p=>p.score),[600,600,100]);
 assert.equal(ceremony.slides[0].kind,'welcome');
});
