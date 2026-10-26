import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

const BACKEND='http://127.0.0.1:8787';
const SCENARIOS=JSON.parse(readFileSync(new URL('../../content/scenarios.json',import.meta.url),'utf8')).scenarios;
async function openGame(page){
  await page.addInitScript(url=>{window.__SAMPLING_MULTIPLAYER_API__=url;},BACKEND);
  await page.goto('/multiplayer.html');
  await expect(page.getByRole('heading',{name:/Learn together/})).toBeVisible();
}
async function createRoom(page,length=5){
  await openGame(page);
  await page.locator('#length').selectOption(String(length));
  await page.getByRole('button',{name:'Create room'}).click();
  await expect(page.locator('#room')).toBeVisible({timeout:12000});
  await expect(page.locator('#connection')).toHaveText('Live connection',{timeout:12000});
  const code=(await page.locator('#room-id').textContent()).trim();
  expect(code).toMatch(/^\d{6}$/);
  return code;
}
async function joinRoom(page,code,name){
  await openGame(page);
  await page.locator('#room-code').fill(code);
  await page.locator('#nickname').fill(name);
  await page.getByRole('button',{name:'Join game'}).click();
  await expect(page.locator('#room')).toBeVisible({timeout:12000});
  await expect(page.locator('#connection')).toHaveText('Live connection',{timeout:12000});
}
async function answerQuestion(student,host,correct=true){
  await expect(student.locator('#stage .option-grid')).toBeVisible({timeout:12000});
  const prompt=await student.locator('#stage h2').textContent();
  const scenario=SCENARIOS.find(item=>item.prompt===prompt);
  expect(scenario,'Live question should be audited content').toBeTruthy();
  const method=correct?scenario.correctMethod:
    ['simple-random','systematic','stratified','quota','opportunity'].find(x=>x!==scenario.correctMethod);
  await student.locator('[data-method="'+method+'"]').click();
  await expect(student.locator('.answer-confirm')).toBeVisible({timeout:12000});
  await host.getByRole('button',{name:'Reveal answer'}).click();
  await expect(student.locator('#stage h2')).toHaveText('Answer: '+({
    'simple-random':'Simple random sampling',systematic:'Systematic sampling',
    stratified:'Stratified sampling',quota:'Quota sampling',opportunity:'Opportunity sampling'
  })[scenario.correctMethod],{timeout:12000});
}
test('real two-device class plays every round, verifies scores, and restores after refresh',async({page,browser})=>{
  const studentContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const student=await studentContext.newPage();
  try{
    const code=await createRoom(page,5);
    await joinRoom(student,code,'Study Fox');
    await expect(page.locator('#players li')).toContainText(['Study Fox']);
    await page.getByRole('button',{name:'Start challenge'}).click();
    await expect(student.locator('#stage .option-grid')).toBeVisible({timeout:12000});
    await answerQuestion(student,page,false); // correct answers, not speed, decide the podium
    expect(await student.locator('#players li').first().textContent()).toContain('0 points');
    await page.getByRole('button',{name:'Next question'}).click();
    await answerQuestion(student,page,true);
    const before=(await student.locator('#players li').first().textContent());
    expect(before).toMatch(/1\d{3} points/);
    await student.reload();
    await expect(student.locator('#connection')).toHaveText('Live connection',{timeout:12000});
    await expect(student.locator('#players li').first()).toContainText('Study Fox');
    await expect(student.locator('#stage h2')).toContainText('Answer:');
    for(let i=2;i<5;i++){
      await page.getByRole('button',{name:'Next question'}).click();
      await answerQuestion(student,page,true);
    }
    await page.getByRole('button',{name:'Next question'}).click();
    await expect(page.locator('#stage h2')).toContainText('Challenge complete',{timeout:12000});
    await expect(student.locator('#stage h2')).toContainText('Challenge complete',{timeout:12000});
    await expect(student.locator('#players li').first()).toContainText('Study Fox');
    const overflow=await student.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  }finally{await studentContext.close();}
});
test('server rejects impersonation, invalid origins and premature reveals',async({page,request})=>{
  const code=await createRoom(page,5);
  const base=BACKEND+'/rooms/'+code;
  expect((await request.get(base+'/state')).status()).toBe(401);
  expect((await request.post(base+'/join',{data:{name:'x'}})).status()).toBe(400);
  expect((await request.post(base+'/join',{data:{name:'Other Fox'},headers:{Origin:'https://other.invalid'}})).status()).toBe(403);
  const saved=JSON.parse(await page.evaluate(()=>sessionStorage.getItem('sampling-arcade-multiplayer-v1')));
  expect((await request.post(base+'/command',{headers:{Authorization:'Bearer '+saved.token},data:{type:'start'}})).status()).toBe(400);
  const joined=await (await request.post(base+'/join',{data:{name:'Guest Otter'}})).json();
  const guest={Authorization:'Bearer '+joined.token};
  expect((await request.post(base+'/command',{headers:guest,data:{type:'start'}})).status()).toBe(400);
  await page.getByRole('button',{name:'Start challenge'}).click();
  await expect(page.locator('#stage .question-clock')).toBeVisible({timeout:12000});
  expect((await request.post(base+'/command',{headers:{Authorization:'Bearer '+saved.token},data:{type:'reveal'}})).status()).toBe(400);
  const state=await (await request.get(base+'/state',{headers:guest})).json();
  expect(state.question.prompt).toBeTruthy();
  expect(JSON.stringify(state)).not.toContain('correctMethod');
  expect(JSON.stringify(state)).not.toContain('hostToken');
  expect((await request.post(base+'/command',{headers:guest,data:{type:'answer',method:'invalid'}})).status()).toBe(400);
  await request.post(base+'/command',{headers:guest,data:{type:'answer',method:'quota'}});
  expect((await request.post(base+'/command',{headers:guest,data:{type:'answer',method:'quota'}})).status()).toBe(400);
  await expect(page.locator('#players li')).toContainText(['Guest Otter']);
  const upgrade=await request.get(base+'/ws?id=host&ticket=123456');
  expect(upgrade.status()).toBe(401);
});
