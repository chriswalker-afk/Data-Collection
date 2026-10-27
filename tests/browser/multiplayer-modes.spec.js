import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const API='http://127.0.0.1:8787';
const concepts=JSON.parse(readFileSync(new URL('../../content/concepts.json',import.meta.url),'utf8')).concepts;
const evaluation=JSON.parse(readFileSync(new URL('../../content/evaluations.json',import.meta.url),'utf8')).evaluations;
const evaluations=Object.fromEntries(evaluation.map(x=>[x.id,x]));
async function open(page){await page.addInitScript(url=>window.__SAMPLING_MULTIPLAYER_API__=url,API);await page.goto('/multiplayer.html');}
async function host(page,game){
 await open(page);await page.locator('#game-mode').selectOption(game);
 await page.locator('#length').selectOption(game==='which'||game==='speed'?'5':'1');
 await page.locator('#create').click();
 await expect(page.locator('#connection')).toHaveText('Live connection',{timeout:15000});
 return (await page.locator('#room-id').innerText()).trim();
}
async function join(page,code){
 await open(page);await page.locator('#room-code').fill(code);
 await page.locator('#nickname').fill('Revision Otter');
 await page.locator('#join').click();
 await expect(page.locator('#connection')).toHaveText('Live connection',{timeout:15000});
}
const getToken=p=>p.evaluate(()=>JSON.parse(sessionStorage.getItem('sampling-arcade-multiplayer-v1')).token);
async function state(req,code,token){
 const res=await req.get(API+'/rooms/'+code+'/state',{headers:{Authorization:'Bearer '+token}});
 expect(res.status()).toBe(200);return res.json();
}
test('teacher chooses four formats with appropriate board lengths and timers',async({page})=>{
 await open(page);
 for(const [mode,options,seconds] of [
  ['which',['5','10','20'],20],['speed',['5','10','20'],25],
  ['match',['1','2','3'],75],['sort',['1','3','6','10'],90]
 ]){
  await page.locator('#game-mode').selectOption(mode);
  expect(await page.locator('#length option').evaluateAll(opts=>opts.map(o=>o.value))).toEqual(options);
  await expect(page.locator('#mode-description')).toContainText(seconds+' seconds');
 }
});
for(const mode of ['speed','match','sort']){
 test(mode+' uses a secure real Worker and a meaningful mobile board',async({page,browser,request,isMobile})=>{
  test.skip(isMobile,'New mode case already exercises explicit 320–1280px mobile/desktop viewports');
  const student=await browser.newPage({viewport:{width:390,height:844}});
  try{
   const code=await host(page,mode);
   await join(student,code);
   await page.getByRole('button',{name:'Start challenge'}).click();
   const token=await getToken(student);
   for(const width of [320,390,768,1280]){
     await student.setViewportSize({width,height:844});
     expect(await student.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth),'No overflow in '+mode+' at '+width+'px').toBeLessThanOrEqual(1);
   }
   await student.setViewportSize({width:390,height:844});
   const q=(await state(request,code,token)).question;
   expect(JSON.stringify(q)).not.toMatch(/correctDestination|correctTerm|correctMethod|answerKey|sourceId|solutions/);
   const url=API+'/rooms/'+code+'/command',headers={Authorization:'Bearer '+token};
   if(mode==='speed'){
    await expect(student.locator('#arena-speed-form')).toBeVisible();
    const concept=concepts.find(c=>c.id===q.id);expect(concept).toBeTruthy();
    await student.locator('#arena-speed-answer').fill(concept.label);
    await student.locator('#arena-speed-form button[type=submit]').click();
   }else if(mode==='match'){
    await expect(student.locator('.arena-match-columns')).toBeVisible();
    expect(q.terms).toHaveLength(6);
    expect((await request.post(url,{headers,data:{type:'answer',pairs:{}}})).status()).toBe(400);
    for(const term of q.terms){
     const def=q.definitions.find(d=>d.text===concepts.find(c=>c.id===term.id).definition);
     expect(def).toBeTruthy();
     await student.locator('.arena-term[data-id="'+term.id+'"]').click();
     await student.locator('.arena-definition[data-id="'+def.id+'"]').click();
    }
    await student.getByRole('button',{name:'Submit all pairs'}).click();
   }else{
    await expect(student.locator('.arena-sort-destinations')).toBeVisible();
    expect(q.destinations).toHaveLength(4);
    for(const item of q.statements){
     const source=evaluations[item.id],destination=source.subject+':'+source.polarity;
     await student.locator('.arena-sort-card[data-id="'+item.id+'"]').click();
     const label=q.destinations.find(d=>d.id===destination).label;
     await student.locator('.arena-sort-zone').filter({has:student.locator('h4',{hasText:label})})
      .getByRole('button',{name:'Place selected here'}).click();
    }
    await student.getByRole('button',{name:'Check my sorting'}).click();
   }
   await expect(student.locator('.answer-confirm')).toBeVisible();
   expect((await request.post(url,{headers,data:{type:'answer',response:'again'}})).status()).toBe(400);
   await student.reload();
   await expect(student.locator('.answer-confirm')).toBeVisible({timeout:15000});
   await page.getByRole('button',{name:'Reveal answer'}).click();
   await expect(student.locator(mode==='speed'?'#stage h2':'.arena-math-review')).toBeVisible();
   const shown=await state(request,code,token);
   expect(shown.reveal.answers[0].correctCount).toBe(shown.reveal.answers[0].total);
   expect(shown.reveal.answers[0].points).toBeGreaterThanOrEqual(1000);
   expect(await student.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
  }finally{await student.close();}
 });
}
test('server rejects mode spoofing, invalid room creation and unauthorized teacher controls',async({page,request})=>{
 const code=await host(page,'match');
 const joined=await (await request.post(API+'/rooms/'+code+'/join',{data:{name:'Mathematics Penguin'}})).json();
 const headers={Authorization:'Bearer '+joined.token},path=API+'/rooms/'+code+'/command';
 expect((await request.post(path,{headers,data:{type:'start'}})).status()).toBe(400);
 await page.getByRole('button',{name:'Start challenge'}).click();
 expect((await request.post(path,{headers,data:{type:'reveal'}})).status()).toBe(400);
 expect((await request.post(path,{headers,data:{
  type:'answer',game:'which',points:99999,pairs:{},deadline:Date.now()+500000
 }})).status()).toBe(400);
 expect((await request.post(API+'/rooms',{data:{game:'constructor',roundLength:5}})).status()).toBe(400);
 expect((await state(request,code,joined.token)).players[0].score).toBe(0);
});
