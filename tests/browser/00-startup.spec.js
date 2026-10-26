import {test,expect} from '@playwright/test';
test('all audited banks bootstrap the original homepage and Exam Lab',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/#/home/sampling');
  await expect(page.getByRole('heading',{name:'Learn the language.'})).toBeVisible();
  await expect(page.locator('.game-card')).toHaveCount(10);
  await page.getByRole('link',{name:'Exam Lab',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Put it all together.'})).toBeVisible();
  expect(errors).toEqual([]);
});
