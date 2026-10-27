/**
 * Safe boundary for integrating the Pass 5 engine with the existing GameRoom
 * Durable Object. This module is also WORKER-ONLY.
 *
 * The surrounding Worker must authenticate tokens, enforce CORS/rate limits,
 * persist the mutated room with this.save(room), broadcast over the existing
 * WebSocket, and schedule the existing TTL/room-end alarms.
 */
import {initialMosaicState,relaySubmission,relayReopenRole,
  finishMosaic,mosaicSnapshot,validateRelaySetup,RELAY_TILE_GOALS}
from './relay-rules.js';

export const isMosaic=objective=>objective==='mosaic';
export function validMosaicSettings({objective,game,roundLength,minutes,teamCount,mosaicTiles}={}){
 return objective==='mosaic'&&game==='which'&&roundLength===5&&
   Number.isInteger(minutes)&&minutes>=1&&minutes<=15&&
   Number.isInteger(teamCount)&&teamCount>=2&&teamCount<=4&&
   RELAY_TILE_GOALS.includes(mosaicTiles);
}
export function startMosaic(room,now,secureRandomIndex){
 if(room.status!=='lobby'||room.objective!=='mosaic')return {error:'Puzzle Relay cannot start in this phase'};
 const settings=room.mosaicSettings;
 if(!validMosaicSettings({objective:'mosaic',game:room.game,
   roundLength:room.roundLength,...settings}))return {error:'Invalid Puzzle Relay room settings'};
 const invalid=validateRelaySetup({players:room.players,teamCount:settings.teamCount,
   targetTiles:settings.mosaicTiles,minutes:settings.minutes});
 if(invalid)return {error:invalid};
 room.mosaic=initialMosaicState({players:room.players,teamCount:settings.teamCount,
   targetTiles:settings.mosaicTiles,minutes:settings.minutes,now,
   randomIndex:secureRandomIndex});
 room.status='playing';room.deadline=room.mosaic.deadline;
 room.index=0;room.deck=[];room.answers=[];room.results=[];
 room.ceremony=null;room.feedback=null;room.finishedReason=null;
 return {ok:true};
}
/**
 * Consume a message after the worker has authenticated 'person'.
 * This return value must not be forwarded as student state: it can include a
 * mathematical explanation for the actual respondent. Broadcast sanitized
 * mosaicPublicState() instead. Caller persists room even on timeout.
 */
export function handleMosaicCommand(room,person,command,now){
 if(room.objective!=='mosaic'||!command)return {recognized:false};
 if(command.type==='mosaic-answer'){
  if(person.host)return {recognized:true,error:'Only an assigned student can answer this piece'};
  if(room.status!=='playing')return {recognized:true,error:'Puzzle Relay is not active'};
  const result=relaySubmission(room.mosaic,{participantId:person.id,
    roundId:command.roundId,partIndex:command.partIndex,
    choiceId:command.choiceId,now});
  if(room.mosaic.status==='finished'){
   room.status='finished';room.finishedReason=room.mosaic.finishReason;
   room.deadline=0;
  }
  return {recognized:true,...(result.ok?{ok:true}:{error:result.error})};
 }
 if(command.type==='mosaic-reopen'){
  if(!person.host)return {recognized:true,error:'Only a teacher can reopen a piece'};
  if(room.status!=='playing')return {recognized:true,error:'Puzzle Relay is not active'};
  const result=relayReopenRole(room.mosaic,{teamId:command.teamId,
    partIndex:command.partIndex,now});
  return {recognized:true,...(result.ok?{ok:true}:{error:result.error})};
 }
 return {recognized:false};
}
export function expireMosaicRoom(room,now){
 if(room.objective!=='mosaic'||room.status!=='playing')return false;
 if(now<room.mosaic?.deadline)return false;
 finishMosaic(room.mosaic,'time',now);
 room.status='finished';room.finishedReason='time';room.deadline=0;
 return true;
}
export function closeMosaicRoom(room,now){
 if(room.objective!=='mosaic'||room.status!=='playing')return false;
 finishMosaic(room.mosaic,'host',now);
 room.status='finished';room.finishedReason='host';room.deadline=0;
 return true;
}
export function mosaicPublicState(room,person){
 return room.objective==='mosaic'?mosaicSnapshot(room.mosaic,
   person?.host?null:person?.id):null;
}