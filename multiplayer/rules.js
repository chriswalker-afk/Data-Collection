// Shared pure multiplayer rules. Server decisions are authoritative.
export const METHODS = Object.freeze(['simple-random','systematic','stratified','quota','opportunity']);
export const METHOD_LABELS = Object.freeze({
  'simple-random':'Simple random sampling',systematic:'Systematic sampling',
  stratified:'Stratified sampling',quota:'Quota sampling',opportunity:'Opportunity sampling'
});
export const ROUND_LENGTHS = Object.freeze([5,10,20]);
export function validRoomCode(value){return typeof value==='string'&&/^\d{6}$/.test(value);}
export function cleanNickname(value){
  if(typeof value!=='string')return null;
  const name=value.trim().replace(/\s+/g,' ');
  if(name.length<2||name.length>20||!(/^[\p{L}\p{N} _.'-]+$/u).test(name))return null;
  return name;
}
export function secureIndex(max){
  if(!Number.isInteger(max)||max<1||max>0x100000000)throw new Error('Invalid random range');
  const bound=Math.floor(0x100000000/max)*max;
  const buffer=new Uint32Array(1);
  do{crypto.getRandomValues(buffer);}while(buffer[0]>=bound);
  return buffer[0]%max;
}
export function shuffled(items,randomIndex=secureIndex){
  const output=[...items];
  for(let i=output.length-1;i>0;i--){
    const j=randomIndex(i+1);
    [output[i],output[j]]=[output[j],output[i]];
  }
  return output;
}
export function balancedRound(scenarios,length=10,randomIndex=secureIndex){
  if(!ROUND_LENGTHS.includes(length))throw new Error('Select 5, 10 or 20 questions');
  if(!Array.isArray(scenarios))throw new Error('Missing question bank');
  const each=length/METHODS.length;
  const picked=METHODS.flatMap(method=>{
    const pool=scenarios.filter(s=>s.correctMethod===method);
    if(pool.length<each)throw new Error('Incomplete question bank for '+method);
    return shuffled(pool,randomIndex).slice(0,each);
  });
  return shuffled(picked,randomIndex);
}
export function scoreAnswer(correct,elapsedMs,durationMs){
  if(!correct)return 0;
  if(!Number.isFinite(elapsedMs)||!Number.isFinite(durationMs)||durationMs<=0)throw new Error('Invalid timer');
  const fraction=Math.max(0,1-Math.max(0,elapsedMs)/durationMs);
  return 1000+Math.round(100*fraction);
}
export function publicQuestion(item){
  return {id:item.id,prompt:item.prompt};
}

/** Only the explicit Playwright local Worker may use a high creation quota.
 * Real Workers, production domains, and localhost without that binding keep
 * exactly the original anti-abuse rate limits.
 */
export function roomCreationRateLimits(env,url){
  const hostname=new URL(url).hostname;
  const local=env?.LOCAL_TEST_MODE==='1'&&hostname==='127.0.0.1';
  return {perClient:local?500:24,global:local?3000:120};
}
