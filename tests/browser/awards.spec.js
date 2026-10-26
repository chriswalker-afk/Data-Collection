import {test,expect} from '@playwright/test';

test('Trophy Cabinet shows 16 collectible creatures and usable unlocked/locked filters',async({page})=>{
  await page.goto('/awards.html');
  await expect(page.getByRole('heading',{name:'Good thinking deserves a little glory.'})).toBeVisible();
  await expect(page.locator('.trophy-card')).toHaveCount(16);
  await expect(page.locator('#cabinet-count')).toHaveText('0 / 16');
  await page.locator('[data-filter="earned"]').click();
  await expect(page.locator('.trophy-card')).toHaveCount(0);
  await expect(page.locator('#cabinet-empty')).toBeVisible();
  await page.locator('[data-filter="locked"]').click();
  await expect(page.locator('.trophy-card')).toHaveCount(16);
  await expect(page.locator('[data-filter="locked"]')).toHaveAttribute('aria-pressed','true');
});
test('one self-rated flashcard produces practice evidence but no verified mathematical trophy',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/#/flashcards/data');
  await expect(page.locator('.flashcard')).toBeVisible();
  await page.locator('.flashcard').click();
  await page.locator('[data-action="grade"][data-grade="know"]').click();
  const record=await page.evaluate(()=>JSON.parse(localStorage.getItem('sampling-arcade-awards-v1')));
  expect(record.evidence.flashcards).toHaveLength(1);
  expect(record.evidence.speed).toHaveLength(0);
  expect(record.evidence.identify).toEqual({});
  await page.goto('/awards.html');
  await expect(page.locator('#cabinet-count')).toHaveText('0 / 16');
  await expect(page.locator('[data-award-id="flashcard-firefly"] .trophy-progress-row')).toContainText('1 / 10');
});
test('export and restore preserve original Solo progress and show earned awards',async({page})=>{
  await page.goto('/awards.html');
  const initial=await page.evaluate(()=>{
    const key='sampling-arcade-progress-v1';
    const value='{"version":1,"answers":48,"sessions":4,"concepts":{}}';
    localStorage.setItem(key,value);
    return value;
  });
  const backup={
    kind:'sampling-arcade-awards-backup',version:1,
    cabinet:{version:1,evidence:{error:['case-a','case-b','case-c']},unlocked:{}}
  };
  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#cabinet-import').setInputFiles({
    name:'my-awards.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))
  });
  await expect(page.locator('#cabinet-count')).toHaveText('1 / 16');
  await expect(page.locator('[data-award-id="bias-buster"]')).toHaveClass(/is-earned/);
  await page.locator('[data-filter="earned"]').click();
  await expect(page.locator('.trophy-card')).toHaveCount(1);
  expect(await page.evaluate(()=>localStorage.getItem('sampling-arcade-progress-v1'))).toBe(initial);
  await page.locator('#cabinet-export').click();
  await expect(page.locator('#cabinet-notice')).toContainText('backup downloaded');
});
test('a malformed backup cannot change the Trophy Cabinet or previous Solo progress',async({page})=>{
  await page.goto('/awards.html');
  const progress='{"version":1,"answers":33,"sessions":2,"concepts":{}}';
  await page.evaluate(x=>localStorage.setItem('sampling-arcade-progress-v1',x),progress);
  await page.locator('#cabinet-import').setInputFiles({
    name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('not json')
  });
  await expect(page.locator('#cabinet-notice')).toContainText('not valid JSON');
  await expect(page.locator('#cabinet-count')).toHaveText('0 / 16');
  expect(await page.evaluate(()=>localStorage.getItem('sampling-arcade-progress-v1'))).toBe(progress);
});
for(const width of [320,390,768,1280]){
  test('Trophy Cabinet is legible and does not overflow at '+width+'px',async({page})=>{
    await page.setViewportSize({width,height:780});
    await page.goto('/awards.html');
    await expect(page.locator('.trophy-card')).toHaveCount(16);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.locator('[data-filter="locked"]').click();
    const after=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    expect(after).toBeLessThanOrEqual(1);
  });
}
