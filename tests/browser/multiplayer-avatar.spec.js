import {test,expect} from '@playwright/test';
const API='http://127.0.0.1:8787';
test('teacher sees real chosen critter on every device, including podium',async({browser,page})=>{
  await page.addInitScript(api=>window.__SAMPLING_MULTIPLAYER_API__=api,API);
  await page.goto('/multiplayer.html');
  await page.locator('#length').selectOption('5');
  await page.getByRole('button',{name:/Create room/}).click();
  await expect(page.locator('#connection')).toHaveText('Live connection',{timeout:15000});
  const code=(await page.locator('#room-id').innerText()).trim();
  const studentContext=await browser.newContext();
  const student=await studentContext.newPage();
  try{
    await student.addInitScript(api=>window.__SAMPLING_MULTIPLAYER_API__=api,API);
    await student.goto('/critter-lab/index.html');
    await expect(student.locator('#critter-picture svg')).toHaveCount(3);
    await student.getByRole('button',{name:'Cat head'}).click();
    await student.getByRole('button',{name:'Grape purple head colour'}).click();
    await student.goto('/multiplayer.html?room='+code);
    await student.locator('#nickname').fill('Critter Test');
    await student.getByRole('button',{name:/Join game/}).click();
    await expect(student.locator('#connection')).toHaveText('Live connection',{timeout:15000});
    await expect(page.locator('#players .critter-portrait')).toHaveCount(1);
    await expect(page.locator('#players .critter-portrait')).toHaveAttribute('aria-label',/cat head, penguin body, frog legs/);
    const payload=await student.evaluate(()=>JSON.parse(localStorage.getItem('critter-lab.avatar.v1')));
    expect(payload.colours.head).toBe('grape-purple');
    expect(await page.locator('#players .critter-portrait img').count()).toBe(3);
    const [head,body,legs]=await page.evaluate(()=>{
       const row=document.querySelector('#players .critter-portrait');
       return [row.children[2].src,row.children[1].src,row.children[0].src];
    });
    expect(head).toContain('data:image/svg+xml');
    expect(body).toContain('/assets/bodies/penguin.svg');
    expect(legs).toContain('/assets/legs/frog.svg');
  }finally{await studentContext.close();}
});
