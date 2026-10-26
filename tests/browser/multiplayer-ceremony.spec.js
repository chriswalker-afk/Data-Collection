import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const API='http://127.0.0.1:8787';
const CONCEPTS=JSON.parse(readFileSync(new URL('../../content/concepts.json',import.meta.url),'utf8')).concepts;
const SCENARIOS=JSON.parse(readFileSync(new URL('../../content/scenarios.json',import.meta.url),'utf8')).scenarios;
const EVALUATIONS=JSON.parse(readFileSync(new URL('../../content/evaluations.json',import.meta.url),'utf8')).evaluations;
const EVALS=Object.fromEntries(EVALUATIONS.map(x=>[x.id,x]));
async function open(page){
  await page.addInitScript(x=>{window.__SAMPLING_MULTIPLAYER_API__=x;},API);
  await page.goto('/multiplayer.html');
}
async function host(page,game,length){
  await open(page);
  await page.locator('#game-mode').selectOption(game);
  await page.locator('#length').selectOption(String(length));
  await page.locator('#create').click();
  await expect(page.locator('#connection')).toHaveText('Live connection',{timeout:15000});
  return (await page.locator('#room-id').innerText()).trim();
}
async function join(page,code,name='Ceremony Fox'){
  await open(page);
  await page.locator('#room-code').fill(code);
  await page.locator('#nickname').fill(name);
  await page.locator('#join').click();
  await expect(page.locator('#connection')).toHaveText('Live connection',{timeout:15000});
}
const token=page=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('sampling-arcade-multiplayer-v1')).token);
const route=code=>API+'/rooms/'+code;
async function state(request,code,secret){
  const res=await request.get(route(code)+'/state',{headers:{Authorization:'Bearer '+secret}});
  expect(res.status()).toBe(200);return res.json();
}
async function command(request,code,secret,action,codeExpected=200){
  const res=await request.post(route(code)+'/command',{
    headers:{Authorization:'Bearer '+secret},data:action});
  expect(res.status(),JSON.stringify(await res.clone().json())).toBe(codeExpected);
  return res.json();
}
test('teacher leads fully synchronized Match Up ceremony, podium and locally saved keepsakes',async({page,browser,request})=>{
  const student=await browser.newPage({viewport:{width:390,height:844}});
  try{
    const code=await host(page,'match',1);
    await join(student,code);
    const secret=await token(student);
    await page.getByRole('button',{name:'Start challenge'}).click();
    await expect(student.locator('.arena-match-columns')).toBeVisible();
    const q=(await state(request,code,secret)).question;
    const pairs=Object.fromEntries(q.terms.map(term=>{
      const def=CONCEPTS.find(x=>x.id===term.id).definition;
      return [term.id,q.definitions.find(d=>d.text===def).id];
    }));
    await command(request,code,secret,{type:'answer',pairs});
    await expect(student.locator('.answer-confirm')).toBeVisible();
    await page.getByRole('button',{name:'Reveal answer'}).click();
    await page.getByRole('button',{name:'Finish challenge'}).click();
    await expect(page.locator('#stage h2')).toHaveText('Challenge complete!');
    await expect(student.locator('#stage h2')).toHaveText('Challenge complete!');
    const pre=await state(request,code,secret);
    expect(pre.ceremony).toBe(null);
    expect(pre.myMultiplayerAwards).toBe(null);
    await page.getByRole('button',{name:'Start awards ceremony'}).click();
    await expect(page.locator('.ceremony-card.is-welcome')).toBeVisible();
    await expect(student.locator('.ceremony-card.is-welcome')).toBeVisible();
    const welcome=await state(request,code,secret);
    expect(JSON.stringify(welcome.ceremony)).not.toContain('match-mongoose');
    await page.getByRole('button',{name:'Next reveal'}).click();
    await expect(student.locator('.ceremony-card.is-podium')).toBeVisible();
    await expect(student.locator('.ceremony-podium-step.is-gold')).toContainText('Ceremony Fox');
    await student.reload();
    await expect(student.locator('.ceremony-card.is-podium')).toBeVisible({timeout:15000});
    await page.getByRole('button',{name:'Previous reveal'}).click();
    await expect(student.locator('.ceremony-card.is-welcome')).toBeVisible();
    await page.getByRole('button',{name:'Next reveal'}).click();
    await page.getByRole('button',{name:'Skip to finale'}).click();
    await expect(student.locator('.ceremony-card.is-finale')).toBeVisible();
    const record=await student.evaluate(()=>JSON.parse(localStorage.getItem('sampling-arcade-multiplayer-keepsakes-v1')));
    expect(record.entries).toHaveLength(1);
    expect(record.entries[0].awarded).toContain('match-mongoose');
    expect(record.entries[0].awarded).toContain('precision-penguin');
    expect(JSON.stringify(record)).not.toContain('Ceremony Fox');
    await page.getByRole('button',{name:'Finish ceremony'}).click();
    await expect(student.locator('#stage h2')).toHaveText('Challenge complete!');
    await page.getByRole('button',{name:'Replay awards ceremony'}).click();
    await expect(student.locator('.ceremony-card.is-welcome')).toBeVisible();
    await page.getByRole('button',{name:'Skip to finale'}).click();
    expect((await student.evaluate(()=>JSON.parse(localStorage.getItem('sampling-arcade-multiplayer-keepsakes-v1')))).entries).toHaveLength(1);
    await student.goto('/awards.html');
    await expect(student.locator('#keepsake-count')).toHaveText('2 / 11');
    await expect(student.locator('[data-keepsake-id="match-mongoose"]')).toBeVisible();
    await expect(student.locator('#cabinet-count')).toHaveText('0 / 16');
  }finally{await student.close();}
});
test('students cannot choose podiums, launch or advance ceremony or mint awards from errors',async({page,request})=>{
  const code=await host(page,'which',5);
  const joined=await (await request.post(route(code)+'/join',{data:{name:'Only Errors'}})).json();
  const secret=joined.token;
  expect((await request.post(route(code)+'/command',{headers:{Authorization:'Bearer '+secret},
    data:{type:'ceremony-start',awards:['precision-penguin'],score:100000}})).status()).toBe(400);
  await page.getByRole('button',{name:'Start challenge'}).click();
  const q=(await state(request,code,secret)).question;
  const scenario=SCENARIOS.find(s=>s.id===q.id);
  const wrong=['quota','opportunity','systematic','stratified','simple-random']
    .find(m=>m!==scenario.correctMethod);
  await command(request,code,secret,{type:'answer',method:wrong,points:999999,awards:['sampling-fox']});
  const scored=await state(request,code,secret);
  expect(scored.players[0].score).toBe(0);
  expect((await request.post(route(code)+'/command',{headers:{Authorization:'Bearer '+secret},
    data:{type:'ceremony-start'}})).status()).toBe(400);
  await page.getByRole('button',{name:'End challenge'}).click();
  expect((await request.post(route(code)+'/command',{headers:{Authorization:'Bearer '+secret},
    data:{type:'ceremony-start'}})).status()).toBe(400);
  const teacher=await token(page);
  await command(request,code,teacher,{type:'ceremony-start'});
  expect((await request.post(route(code)+'/command',{headers:{Authorization:'Bearer '+secret},
    data:{type:'ceremony-next'}})).status()).toBe(400);
  await page.getByRole('button',{name:'Next reveal'}).click();
  const stateNow=await state(request,code,secret);
  expect(stateNow.ceremony.slide.kind).toBe('podium');
  expect(stateNow.ceremony.slide.standings).toEqual([]);
  await page.getByRole('button',{name:'Next reveal'}).click();
  const final=await state(request,code,secret);
  expect(final.ceremony.slide.kind).toBe('finale');
  expect(final.myMultiplayerAwards.awarded).toEqual([]);
});
test('full Sort It! awards ceremony fits 320px and preserves Solo progress',async({page,browser,request})=>{
  const student=await browser.newPage({viewport:{width:320,height:780}});
  try{
    const code=await host(page,'sort',1);
    await join(student,code,'Sorting Stoat');
    await page.getByRole('button',{name:'Start challenge'}).click();
    const secret=await token(student);
    const q=(await state(request,code,secret)).question;
    const placements=Object.fromEntries(q.statements.map(x=>{
      const evidence=EVALS[x.id];return [x.id,evidence.subject+':'+evidence.polarity];
    }));
    await student.evaluate(()=>localStorage.setItem('sampling-arcade-progress-v1','{"version":1,"answers":99}'));
    await command(request,code,secret,{type:'answer',placements});
    await page.getByRole('button',{name:'Reveal answer'}).click();
    await page.getByRole('button',{name:'Finish challenge'}).click();
    await page.getByRole('button',{name:'Start awards ceremony'}).click();
    for(const width of [320,390,768,1280]){
      await student.setViewportSize({width,height:840});
      await expect(student.locator('.ceremony-card')).toBeVisible();
      expect(await student.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    }
    await page.getByRole('button',{name:'Skip to finale'}).click();
    await expect(student.locator('.ceremony-card.is-finale')).toBeVisible();
    const keep=await student.evaluate(()=>JSON.parse(localStorage.getItem('sampling-arcade-multiplayer-keepsakes-v1')));
    expect(keep.entries[0].awarded).toContain('sorting-salamander');
    expect(await student.evaluate(()=>localStorage.getItem('sampling-arcade-progress-v1')))
      .toBe('{"version":1,"answers":99}');
  }finally{await student.close();}
});
