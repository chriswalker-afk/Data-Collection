import {test,expect} from '@playwright/test';
test('diagnose home startup', async ({page})=>{
  page.on('console',msg=>{if(msg.type()==='error')console.log('STARTUP CONSOLE ERROR:',msg.text())});
  page.on('pageerror',err=>console.log('STARTUP PAGE ERROR:',err.stack||err.message));
  await page.goto('/#/home/sampling');
  await page.waitForTimeout(700);
  console.log('STARTUP BODY:',(await page.locator('#app').innerText()).slice(0,1200));
  await expect(page.getByRole('heading',{name:'Learn the language.'})).toBeVisible();
});
