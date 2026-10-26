// Local mementos of awards the Worker reported for this authenticated student.
// These are separate from Solo proof and are not cryptographically verifiable after
// they leave the temporary room. No nicknames, room codes or session tokens saved.
import {ARENA_AWARDS} from './award-catalogue.js';
export const MULTIPLAYER_KEEPSAKES_KEY='sampling-arcade-multiplayer-keepsakes-v1';
const IDS=new Set(ARENA_AWARDS.map(x=>x.id));
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const GAMES=new Set(['which','speed','match','sort']);
const safeDate=s=>typeof s==='string'&&!Number.isNaN(Date.parse(s))?
  new Date(s).toISOString():new Date().toISOString();
export function sanitizeKeepsakes(value){
  const entries=Array.isArray(value?.entries)?value.entries:[];
  const seen=new Set(),result=[];
  for(const item of entries.slice(-150)){
    if(!item||!UUID.test(item.roomId)||!GAMES.has(item.game)||seen.has(item.roomId))continue;
    seen.add(item.roomId);
    const awarded=[...new Set((Array.isArray(item.awarded)?item.awarded:[])
      .filter(id=>typeof id==='string'&&IDS.has(id)))];
    if(!awarded.length)continue;
    result.push({roomId:item.roomId,game:item.game,awarded,collectedAt:safeDate(item.collectedAt)});
  }
  return {version:1,entries:result.slice(-80)};
}
export function loadKeepsakes(storage){
  try{
    const raw=(storage??globalThis.localStorage).getItem(MULTIPLAYER_KEEPSAKES_KEY);
    return sanitizeKeepsakes(raw?JSON.parse(raw):null);
  }catch{return {version:1,entries:[]};}
}
export function saveKeepsake(receipt,storage,now=new Date().toISOString()){
  if(!receipt||receipt.completed!==true||!UUID.test(receipt.roomId)||
      !GAMES.has(receipt.game)||!Array.isArray(receipt.awarded))return false;
  const awarded=[...new Set(receipt.awarded.filter(id=>IDS.has(id)))];
  // A room without a qualifying award has nothing to collect.
  if(!awarded.length)return false;
  const target=storage??globalThis.localStorage;
  const old=loadKeepsakes(target);
  if(old.entries.some(x=>x.roomId===receipt.roomId))return true;
  const next=sanitizeKeepsakes({entries:[
    ...old.entries,{roomId:receipt.roomId,game:receipt.game,awarded,collectedAt:now}
  ]});
  try{target.setItem(MULTIPLAYER_KEEPSAKES_KEY,JSON.stringify(next));return true;}
  catch{return false;}
}
export function keepsakeSummary(store){
  const clean=sanitizeKeepsakes(store),byId=new Map();
  for(const entry of clean.entries){
    for(const id of entry.awarded){
      const award=ARENA_AWARDS.find(x=>x.id===id);
      const prior=byId.get(id);
      if(award)byId.set(id,{...award,earnedCount:(prior?.earnedCount||0)+1,
        mostRecent:entry.collectedAt,game:entry.game});
    }
  }
  return [...byId.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
