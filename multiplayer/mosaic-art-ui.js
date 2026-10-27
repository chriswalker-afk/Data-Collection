// Shared, accessible artwork for live relay play and the cooperative ceremony.
// This module contains NO puzzle answer or grading data.
import {mosaicArtwork,mosaicGeometry,mosaicTilePlan} from './mosaic-art.js';

const seen=new Map();
const element=(tag,className,text)=>{
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=text;
  return node;
};
export function createMosaicPicture({roomCode,targetTiles,tiles,achieved=false,scope='play'}){
  const scene=mosaicArtwork(roomCode),geometry=mosaicGeometry(targetTiles);
  const plan=mosaicTilePlan(targetTiles,tiles);
  const earned=new Set(plan.filter(tile=>tile.unlocked).map(tile=>tile.index));
  const identity=roomCode+':'+scope;
  const prior=seen.get(identity);
  const newlyRevealed=prior?plan.filter(tile=>tile.unlocked&&!prior.has(tile.index)):[];
  seen.set(identity,earned);
  // Keep the bounded per-tab celebration memory independent of room storage.
  if(seen.size>12)seen.delete(seen.keys().next().value);

  const figure=element('figure','mosaic-picture');
  figure.dataset.scene=scene.id;
  figure.dataset.completed=String(achieved);
  const board=element('div','mosaic-picture-grid');
  board.style.setProperty('--mosaic-columns',String(geometry.columns));
  board.style.setProperty('--mosaic-rows',String(geometry.rows));
  board.setAttribute('role','img');
  board.setAttribute('aria-label',scene.title+'. '+earned.size+' of '+targetTiles+
    ' illustrated tiles revealed'+(achieved?'. Complete.':'.'));
  for(const tile of plan){
    const square=element('span','mosaic-picture-tile'+
      (tile.unlocked?' is-revealed':' is-locked')+
      (newlyRevealed.some(next=>next.index===tile.index)?' is-fresh':''));
    square.dataset.index=String(tile.index);
    if(tile.teamId)square.dataset.teamId=tile.teamId;
    square.setAttribute('aria-hidden','true');
    const image=element('span','mosaic-piece-image');
    image.style.backgroundSize=tile.backgroundSize;
    image.style.backgroundPosition=tile.backgroundPosition;
    square.append(image);
    if(!tile.unlocked)square.append(element('span','mosaic-piece-lock',String(tile.index+1).padStart(2,'0')));
    board.append(square);
  }
  const caption=element('figcaption','mosaic-picture-caption');
  caption.append(element('strong',null,scene.title),element('span',null,scene.description));
  figure.append(board,caption);
  return {figure,newlyRevealed,scene};
}
