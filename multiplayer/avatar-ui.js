// Safe cosmetic critter pictures for roster, leaderboard and ceremony.
// Assets are fetched from the same origin, never from a user's URL.
import {safeAvatar} from './avatar.js';
const PALETTES={"sunset-orange":{"primary":"#fb8156","light":"#ffb088","dark":"#c95b4b","belly":"#fff0de","accent":"#f8c66b","spot":"#dd6a53","blush":"#f7a8a0"},"honey-yellow":{"primary":"#f6c45a","light":"#ffe49a","dark":"#c98e3f","belly":"#fff4db","accent":"#ec9f50","spot":"#d6a34d","blush":"#f6a7a0"},"leaf-green":{"primary":"#83c16f","light":"#b5e49a","dark":"#488e65","belly":"#eaf6d9","accent":"#f8c763","spot":"#61a663","blush":"#f4aaa4"},"ocean-teal":{"primary":"#47b4c6","light":"#8ddce5","dark":"#2f819e","belly":"#def5f3","accent":"#f7c56f","spot":"#3d9eb0","blush":"#f4a7ae"},"grape-purple":{"primary":"#a785d5","light":"#d4b8ee","dark":"#7555ad","belly":"#f2e8fb","accent":"#f0c277","spot":"#8c6cc0","blush":"#f2a5bd"},"blossom-pink":{"primary":"#ee82ad","light":"#ffb7d0","dark":"#b75483","belly":"#fff0ed","accent":"#f5c56e","spot":"#d76a9b","blush":"#f0a2ac"}};
const DEFAULTS={"fox":{"primary":"#f47d48","light":"#ffaf73","dark":"#c65a3e","belly":"#fff0dc","accent":"#f7ce72","spot":"#e66537","blush":"#f49a89"},"frog":{"primary":"#8ac84c","light":"#b4e46f","dark":"#4d9c59","belly":"#d9f29a","accent":"#f3bd5e","spot":"#64ad46","blush":"#f6a080"},"panda":{"primary":"#fff2de","light":"#fffaf0","dark":"#344153","belly":"#fff7e9","accent":"#79b978","spot":"#344153","blush":"#f4a4a0"},"owl":{"primary":"#bd855c","light":"#e5b889","dark":"#875e50","belly":"#fff0d7","accent":"#ffc15e","spot":"#a5765e","blush":"#eaa18d"},"rabbit":{"primary":"#fff1dc","light":"#fffaf0","dark":"#e9b9b4","belly":"#fffaf0","accent":"#ee96af","spot":"#dda5cf","blush":"#f1a4ac"},"cat":{"primary":"#e9964a","light":"#ffbd6b","dark":"#b95e3f","belly":"#fff1d8","accent":"#eebd68","spot":"#c9733d","blush":"#f5a49c"},"penguin":{"primary":"#34425a","light":"#66748b","dark":"#263348","belly":"#fff1da","accent":"#f4b652","spot":"#46566c","blush":"#edabb0"},"dino":{"primary":"#46abc1","light":"#7bd0d3","dark":"#2d7d96","belly":"#c8ebe2","accent":"#f5c25f","spot":"#398caa","blush":"#ef9d95"},"bear":{"primary":"#a86f52","light":"#c9946d","dark":"#784b3e","belly":"#f5dcc0","accent":"#eec17e","spot":"#8d5a45","blush":"#f19d94"},"flamingo":{"primary":"#ef7ba6","light":"#ffb2c7","dark":"#b54b74","belly":"#ffe0e2","accent":"#ffcd6f","spot":"#d86695","blush":"#f7a1aa"},"duck":{"primary":"#f7c85d","light":"#ffe78b","dark":"#d69b39","belly":"#fff1cf","accent":"#f1ad48","spot":"#dfa73f","blush":"#f6a99e"}};
const PARTS=new Map();
function partPath(kind,id){return new URL('../critter-lab/assets/'+kind+'/'+id+'.svg',import.meta.url).href;}
async function svgFor(kind,id,palette){
  const key=kind+'/'+id+'/'+palette;
  if(PARTS.has(key))return PARTS.get(key);
  const promise=(async()=>{
    if(palette==='original')return partPath(kind,id);
    const response=await fetch(partPath(kind,id));
    if(!response.ok)throw new Error('Critter SVG unavailable');
    const xml=await response.text();
    const document=new DOMParser().parseFromString(xml,'image/svg+xml');
    const svg=document.documentElement;
    if(svg.namespaceURI!=='http://www.w3.org/2000/svg'||svg.getAttribute('data-part-id')!==id||svg.getAttribute('data-critter-part')!==kind)throw new Error('Invalid critter SVG');
    const paletteSlots=PALETTES[palette];
    if(!paletteSlots)throw new Error('Unknown palette');
    svg.querySelectorAll('[data-color-slot]').forEach(node=>{
      const slot=node.getAttribute('data-color-slot');
      if(Object.hasOwn(paletteSlots,slot))node.setAttribute('fill',paletteSlots[slot]);
    });
    svg.querySelectorAll('[data-stroke-slot]').forEach(node=>{
      const slot=node.getAttribute('data-stroke-slot');
      if(Object.hasOwn(paletteSlots,slot))node.setAttribute('stroke',paletteSlots[slot]);
    });
    // The source SVG is our static, vetted repository art; never include user markup.
    const encoded=new XMLSerializer().serializeToString(svg);
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(encoded);
  })();
  PARTS.set(key,promise);
  return promise;
}
export function critterPortrait(value,scale='small'){
  const avatar=safeAvatar(value);
  const element=document.createElement('span');
  element.className='critter-portrait critter-portrait--'+scale;
  element.setAttribute('role','img');
  element.setAttribute('aria-label',avatar.head+' head, '+avatar.body+' body, '+avatar.legs+' legs');
  const order=[['legs',avatar.legs,'legs'],['bodies',avatar.body,'body'],['heads',avatar.head,'head']];
  for(const [kind,id,colourKey] of order){
    const img=document.createElement('img');img.alt='';img.decoding='async';
    img.src=partPath(kind,id);img.className='critter-portrait-layer';
    element.append(img);
    if(avatar.colours[colourKey]!=='original'){
      void svgFor(kind,id,avatar.colours[colourKey]).then(url=>{
        if(img.isConnected)img.src=url;
      }).catch(()=>{/* Keep natural artwork if a tint cannot be rendered */});
    }
  }
  return element;
}
