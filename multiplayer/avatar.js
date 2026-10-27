// Shared, allowlisted Critter Lab choices. No user-supplied SVG is ever stored.
export const HEADS=Object.freeze(['fox','frog','panda','owl','rabbit','cat','penguin','dino']);
export const BODIES=Object.freeze(['penguin','dino','bear','cat','flamingo','owl']);
export const LEGS=Object.freeze(['frog','duck','rabbit','cat','flamingo','dino']);
export const PALETTES=Object.freeze(['original','sunset-orange','honey-yellow','leaf-green','ocean-teal','grape-purple','blossom-pink']);
export const AVATAR_STORAGE_KEY='critter-lab.avatar.v1';
export function defaultAvatar(){return {version:1,head:'fox',body:'penguin',legs:'frog',colours:{head:'original',body:'original',legs:'original'}};}
export function validAvatar(value){
  return value && typeof value==='object' && !Array.isArray(value) && value.version===1 &&
    HEADS.includes(value.head) && BODIES.includes(value.body) && LEGS.includes(value.legs) &&
    value.colours && typeof value.colours==='object' && !Array.isArray(value.colours) &&
    ['head','body','legs'].every(k=>typeof value.colours[k]==='string' && PALETTES.includes(value.colours[k])) &&
    Object.keys(value).length===5 && Object.keys(value.colours).length===3;
}
export function safeAvatar(value){return validAvatar(value)?{
  version:1,head:value.head,body:value.body,legs:value.legs,
  colours:{head:value.colours.head,body:value.colours.body,legs:value.colours.legs}
}:defaultAvatar();}
