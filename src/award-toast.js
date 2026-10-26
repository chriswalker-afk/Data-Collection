// Quiet, non-blocking award reveals. Keyboard focus stays in the game.
const queue=[];
let showing=false;
export function showAwardUnlock(award){
  if(!award||typeof document==='undefined')return;
  queue.push(award);
  if(!showing)next();
}
function next(){
  const award=queue.shift();
  if(!award){showing=false;return;}
  showing=true;
  const wrap=document.createElement('div');
  wrap.className='award-unlock-toast';
  wrap.setAttribute('role','status');
  wrap.setAttribute('aria-live','polite');
  wrap.setAttribute('aria-atomic','true');
  const portrait=document.createElement('span');
  portrait.className='award-unlock-portrait';
  portrait.textContent=award.emoji;
  portrait.setAttribute('aria-hidden','true');
  const text=document.createElement('div');
  const kicker=document.createElement('span');
  kicker.className='award-unlock-kicker';
  kicker.textContent='NEW AWARD UNLOCKED';
  const title=document.createElement('strong');
  title.className='award-unlock-title';
  title.textContent=award.name;
  const detail=document.createElement('span');
  detail.className='award-unlock-detail';
  detail.textContent=award.level==='verified'?
    'Earned through checked mathematical answers.':'Recognising your revision practice; not a graded result.';
  const link=document.createElement('a');
  link.href='./awards.html';
  link.textContent='See Trophy Cabinet';
  text.append(kicker,title,detail,link);
  const close=document.createElement('button');
  close.type='button';
  close.className='award-unlock-close';
  close.setAttribute('aria-label','Dismiss award notification');
  close.textContent='×';
  wrap.append(portrait,text,close);
  document.body.append(wrap);
  let finished=false;
  let timer;
  const dismiss=()=>{
    if(finished)return;
    finished=true;clearTimeout(timer);wrap.remove();next();
  };
  close.addEventListener('click',dismiss);
  timer=setTimeout(dismiss,5200);
}
