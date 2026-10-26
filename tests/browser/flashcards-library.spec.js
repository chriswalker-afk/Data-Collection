import {test,expect} from '@playwright/test';

async function ready(page,topic='sampling'){
 await page.goto('/#/flashcards/'+topic);
 await expect(page.locator('.flashcard')).toBeVisible();
}
test('browse all cards by type, search and reveal without affecting saved progress',async({page})=>{
 await ready(page);
 const saved=await page.evaluate(()=>localStorage.getItem('sampling-arcade-progress-v1'));
 await page.getByRole('button',{name:'Browse all 32 cards'}).click();
 await expect(page.getByRole('heading',{name:'Browse all 32 cards'})).toBeVisible();
 await expect(page.locator('.flash-library-card')).toHaveCount(32);
 await expect(page.locator('.flash-browser-count')).toHaveText('32 of 32 cards showing');
 await expect(page.locator('.flash-library-card:visible')).toHaveCount(32);
 await page.locator('#flash-library-filter').selectOption('disadvantage');
 await expect(page.locator('.flash-browser-count')).toHaveText('7 of 32 cards showing');
 await page.locator('#flash-library-search').fill('Small subgroups may be underrepresented by chance');
 await expect(page.locator('.flash-library-card:visible')).toHaveCount(1);
 const card=page.locator('.flash-library-card:visible');
 await expect(card).toContainText('Disadvantages of simple random sampling');
 await card.locator('summary').click();
 await expect(card).toContainText('Small subgroups may be underrepresented by chance.');
 await expect(card).toContainText('No fixed subgroup proportions are guaranteed');
 await page.locator('#flash-library-search').fill('not a sampling term');
 await expect(page.locator('.flash-library-card:visible')).toHaveCount(0);
 await expect(page.locator('.flash-browser-empty')).toBeVisible();
 await page.locator('#flash-library-search').fill('');
 await page.locator('#flash-library-filter').selectOption('all');
 await page.getByRole('button',{name:'Reveal all answers'}).click();
 await expect(page.locator('.flash-library-card[open]')).toHaveCount(32);
 await page.getByRole('button',{name:'Hide all answers'}).click();
 await expect(page.locator('.flash-library-card[open]')).toHaveCount(0);
 expect(await page.evaluate(()=>localStorage.getItem('sampling-arcade-progress-v1'))).toBe(saved);
 await page.getByRole('button',{name:'Back to my round'}).click();
 await expect(page.locator('.flashcard')).toBeVisible();
});
test('evaluation cards are separate and full review never awards mastery',async({page})=>{
 await ready(page);
 await page.getByRole('button',{name:'Browse all 32 cards'}).click();
 await page.getByRole('button',{name:/Review all 32 cards/}).click();
 await expect(page.locator('.flash-deck-label')).toHaveText('ALL-CARD REVIEW');
 await expect(page.locator('.round-controls')).toContainText('32');
 const first=await page.locator('.flash-front').innerText();
 await page.locator('.flashcard').click();
 await page.getByRole('button',{name:'Know it ✓'}).click();
 const count=await page.evaluate(()=>JSON.parse(localStorage.getItem('sampling-arcade-progress-v1'))?.answers??0);
 expect(count).toBe(0);
 await page.getByRole('button',{name:'Browse all 32 cards'}).click();
 await expect(page.locator('.flash-browser-count')).toHaveText('32 of 32 cards showing');
 await page.getByRole('button',{name:'Back to my round'}).click();
 await expect(page.locator('.flash-deck-label')).toHaveText('ALL-CARD REVIEW');
 expect(await page.locator('.flash-front').innerText()).not.toBe(first);
});
test('mixed revision has 40 cards and types of data only has eight terms',async({page})=>{
 await ready(page,'all');
 await page.getByRole('button',{name:'Browse all 40 cards'}).click();
 await expect(page.locator('.flash-library-card')).toHaveCount(40);
 await page.goto('/#/flashcards/data');
 await page.getByRole('button',{name:'Browse all 8 cards'}).click();
 await expect(page.locator('.flash-library-card')).toHaveCount(8);
 await expect(page.locator('.flash-browser-group')).toHaveCount(1);
});
for(const width of [320,390,1280]){
 test('browse library has no horizontal overflow at '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:740});
  await ready(page);
  await page.getByRole('button',{name:'Browse all 32 cards'}).click();
  const widthReport=await page.evaluate(()=>({
    page:document.documentElement.scrollWidth,
    viewport:document.documentElement.clientWidth
  }));
  expect(widthReport.page).toBeLessThanOrEqual(widthReport.viewport+1);
  await page.locator('#flash-library-filter').selectOption('advantage');
  await page.getByRole('button',{name:'Reveal all answers'}).click();
  const withAnswers=await page.evaluate(()=>({
    page:document.documentElement.scrollWidth,
    viewport:document.documentElement.clientWidth
  }));
  expect(withAnswers.page).toBeLessThanOrEqual(withAnswers.viewport+1);
 });
}
