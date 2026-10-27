// Public, presentation-only geometry for the verified cooperative mosaic.
// Never import the private puzzle bank, grader or answer keys into Pages.
export const MOSAIC_ARTWORKS=Object.freeze([
  Object.freeze({id:'garden',title:'The Discovery Garden',
    description:'Friendly critters explore a colourful garden of mathematical discoveries.'}),
  Object.freeze({id:'reef',title:'The Ocean Expedition',
    description:'Curious sea creatures discover patterns in a luminous coral reef.'}),
  Object.freeze({id:'stars',title:'The Constellation Quest',
    description:'A team of explorers finds connections in a star-filled sky.'})
]);
export const MOSAIC_TEAM_NAMES=Object.freeze({
  vector:'Vector Vipers',sigma:'Sigma Sparrows',
  delta:'Delta Dolphins',pi:'Pi Pythons'
});
export const MOSAIC_TEAM_ICONS=Object.freeze({
  vector:'🐍',sigma:'🐦',delta:'🐬',pi:'🥧'
});
export const MOSAIC_GOALS=Object.freeze([6,10,15]);

export function mosaicArtwork(roomCode){
  // The six-digit room code is already public to participants. No extra
  // persisted server field, request or user-controlled URL is required.
  const code=typeof roomCode==='string'&&/^\d{6}$/.test(roomCode)?roomCode:'000000';
  const index=code.split('').reduce((sum,digit)=>sum+Number(digit),0)%MOSAIC_ARTWORKS.length;
  return MOSAIC_ARTWORKS[index];
}
export function mosaicGeometry(targetTiles){
  if(!MOSAIC_GOALS.includes(targetTiles))throw new Error('Unsupported mosaic size');
  const columns=targetTiles===6?3:5;
  return {columns,rows:targetTiles/columns,targetTiles};
}
export function mosaicTilePlan(targetTiles,earnedTiles=[]){
  const {columns,rows}=mosaicGeometry(targetTiles);
  const earned=new Map();
  if(Array.isArray(earnedTiles))for(const item of earnedTiles){
    // Only verified server tile indices and team IDs control presentation.
    if(Number.isInteger(item?.index)&&item.index>=0&&item.index<targetTiles&&
      Object.hasOwn(MOSAIC_TEAM_NAMES,item.teamId)&&!earned.has(item.index))
      earned.set(item.index,item.teamId);
  }
  return Array.from({length:targetTiles},(_,index)=>{
    const col=index%columns,row=Math.floor(index/columns);
    return {index,unlocked:earned.has(index),teamId:earned.get(index)||null,
      backgroundSize:(columns*100)+'% '+(rows*100)+'%',
      backgroundPosition:(columns===1?0:100*col/(columns-1))+'% '+
        (rows===1?0:100*row/(rows-1))+'%'};
  });
}
