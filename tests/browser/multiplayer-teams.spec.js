import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const API='http://127.0.0.1:8787';
const scenarioBank=JSON.parse(readFileSync(new URL('../../content/scenarios.json',import.meta.url),'utf8')).scenarios;
async function open(page){
  await page.addInitScript(url=>{window.__SAMPLING_MULTIPLAYER_API__=url},API);
  await page.goto('/multiplayer.html');
}
async function join(page,code,nickname){
  await open(page);
  await page.locator('#room-code').fill(code);
  await page.locator('#nickname').fill(nickname);
  await page.locator('#join').click();
  await expect(page.locator('#connection')).toHaveText('Live connection',{timeout:15000});
}
const getToken=page=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('sampling-arcade-multiplayer-v1')).token);
const getState=async(request,code,token)=>{
  const res=await request.get(API+'/rooms/'+code+'/state',{headers:{Authorization:'Bearer '+token}});
  expect(res.status()).toBe(200);return res.json();
};
test('teacher creates balanced optional teams and a meaningful class quest, shares feedback after reveal',async({page,browser,request,isMobile})=>{
  test.skip(isMobile,'This test covers explicit 320px, 390px and desktop student viewports.');
  const students=[];
  try{
    await open(page);
    await page.locator('#game-mode').selectOption('which');
    await page.locator('#length').selectOption('5');
    await page.locator('#create').click();
    await expect(page.locator('#connection')).toHaveText('Live connection',{timeout:15000});
    const code=(await page.locator('#room-id').innerText()).trim();
    const host=await getToken(page);
    await expect(page.locator('#team-count')).toBeVisible();
    await page.locator('#team-count').selectOption('3');
    await page.getByRole('button',{name:'Apply format'}).click();
    await expect.poll(async()=> (await getState(request,code,host)).teamCount).toBe(3);
    await page.locator('#goal-target').selectOption('80');
    await page.locator('#goal-apply').click();
    await expect.poll(async()=> (await getState(request,code,host)).goalTarget).toBe(80);
    for(let i=0;i<3;i++){
      const p=await browser.newPage({viewport:{width:i===0?320:i===1?390:768,height:820},
        isMobile:true,hasTouch:true});
      students.push(p);await join(p,code,'Team Player '+(i+1));
      await expect(p.locator('.team-lobby-note').first()).toContainText('Your team');
      expect(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    }
    const lobby=await getState(request,code,host);
    expect(lobby.teams).toHaveLength(3);
    expect(lobby.teams.map(t=>t.members)).toEqual([1,1,1]);
    expect(new Set(lobby.players.map(p=>p.teamId)).size).toBe(3);
    await expect(page.locator('#class-pulse .team-score-card')).toHaveCount(3);
    await page.locator('#teams-shuffle').click();
    await expect.poll(async()=> (await getState(request,code,host)).teams.length).toBe(3);
    await page.getByRole('button',{name:'Start challenge'}).click();
    await expect(students[0].locator('#stage .option-grid')).toBeVisible();
    const question=(await getState(request,code,host)).question;
    const answer=scenarioBank.find(x=>x.id===question.id).correctMethod;
    for(const p of students){
      await p.locator('[data-method="'+answer+'"]').click();
      await expect(p.locator('.answer-confirm')).toBeVisible();
    }
    // Accepted submissions are not publicly graded until the teacher reveals.
    const awaiting=await getState(request,code,host);
    expect(awaiting.classQuest.correct).toBe(0);
    expect(awaiting.players.every(x=>x.score===0)).toBe(true);
    await page.getByRole('button',{name:'Reveal answer'}).click();
    await expect(page.locator('details.teacher-feedback-tools')).toBeVisible();
    await expect(students[0].locator('#class-pulse')).toContainText('100% accuracy');
    const review=await getState(request,code,host);
    expect(review.questionPulse).toMatchObject({responses:3,players:3,decisions:3,correct:3,accuracy:100});
    await page.locator('details.teacher-feedback-tools summary').click();
    await page.locator('#teacher-feedback-text').fill('The selection rule matters more than how balanced the final sample looks.');
    await page.locator('#teacher-feedback-send').click();
    for(const p of students)await expect(p.locator('.teacher-feedback-note'))
      .toContainText('The selection rule matters');
    const token=await getToken(students[0]);
    const unauthorized=await request.post(API+'/rooms/'+code+'/command',{
      headers:{Authorization:'Bearer '+token},
      data:{type:'feedback-post',text:'Fake teacher message'}
    });
    expect(unauthorized.status()).toBe(400);
    const spoofTeams=await request.post(API+'/rooms/'+code+'/command',{
      headers:{Authorization:'Bearer '+token},data:{type:'teams-set',count:0}
    });
    expect(spoofTeams.status()).toBe(400);
    await students[0].reload();
    await expect(students[0].locator('#connection')).toHaveText('Live connection',{timeout:15000});
    await expect(students[0].locator('.teacher-feedback-note')).toContainText('The selection rule');
    await page.getByRole('button',{name:'Next question'}).click();
    await expect(students[0].locator('#stage .option-grid')).toBeVisible();
    await expect(students[0].locator('.teacher-feedback-note')).toHaveCount(0);
  }finally{await Promise.all(students.map(p=>p.close()));}
});
