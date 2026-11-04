// Run against staging after the updated Worker is deployed, then production.
// Validates the exact CORS response browsers use before authenticated actions.
const url=(process.env.MULTIPLAYER_API||'').replace(/\/$/,'');
if(!/^https:\/\/[-a-z0-9.]+\.workers\.dev$/.test(url)){
  throw new Error('Supply an HTTPS Cloudflare Worker URL as MULTIPLAYER_API');
}
const allowed=[
  'https://chriswalker-afk.github.io',
  'https://sampling.mrwalkermaths.com'
];
async function check(origin,shouldAllow){
  const response=await fetch(url+'/health',{
    method:'OPTIONS',
    headers:{
      Origin:origin,
      'Access-Control-Request-Method':'POST',
      'Access-Control-Request-Headers':'Content-Type, Authorization'
    },
    signal:AbortSignal.timeout(20000)
  });
  const reflected=response.headers.get('access-control-allow-origin');
  if(shouldAllow){
    if(response.status!==204||reflected!==origin){
      throw new Error('CORS rejected '+origin+': HTTP '+response.status+', ACAO '+reflected);
    }
    const methods=response.headers.get('access-control-allow-methods')||'';
    if(!methods.includes('POST'))throw new Error('CORS preflight lost POST permission');
  }else if(response.status!==403||reflected===origin){
    throw new Error('CORS did not reject unknown origin '+origin+': HTTP '+response.status);
  }
}
for(const origin of allowed)await check(origin,true);
await check('https://untrusted.example',false);
const health=await fetch(url+'/health',{headers:{Origin:allowed[1]},signal:AbortSignal.timeout(20000)});
if(!health.ok||health.headers.get('access-control-allow-origin')!==allowed[1]){
  throw new Error('New-domain GET /health did not pass CORS');
}
const data=await health.json();
if(data.ok!==true)throw new Error('Multiplayer health check failed');
console.log('PASS: Legacy + sampling.mrwalkermaths.com CORS, unknown-origin rejection, and service health');
