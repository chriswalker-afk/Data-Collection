import {test,expect} from '@playwright/test';

async function bank(page,name,key) {
  return page.evaluate(async ({name,key})=>{
    const response=await fetch('./content/'+name+'.json');
    if(!response.ok) throw new Error(name+' missing');
    return (await response.json())[key];
  },{name,key});
}
async function saved(page) {
  return page.evaluate(()=>JSON.parse(localStorage.getItem('sampling-arcade-progress-v1')));
}
async function speedConcept(page,concepts) {
  const id=await page.locator('[data-concept-id]').getAttribute('data-concept-id');
  return concepts.find(item=>item.id===id);
}

test('navigation includes Speed Recall and original Missing Words defaults to choices',async ({page})=>{
  await page.goto('/#/home/data');
  await expect(page.locator('.game-card')).toHaveCount(10);
  if(await page.locator('#mobile-menu-toggle').isVisible())
    await page.locator('#mobile-menu-toggle').click();
  await page.locator('#activities-menu > summary').click();
  await page.getByRole('link',{name:'Speed Recall',exact:true}).click();
  await expect(page).toHaveURL(/#\/speed\/data$/);
  await expect(page.getByRole('heading',{name:'Speed Recall'})).toBeVisible();
  await expect(page.locator('#speed-mode')).toHaveValue('untimed');
  if(await page.locator('#mobile-menu-toggle').isVisible())
    await page.locator('#mobile-menu-toggle').click();
  await page.locator('#activities-menu > summary').click();
  await page.getByRole('link',{name:'Missing Words',exact:true}).click();
  await expect(page.locator('#cloze-level')).toHaveValue('choices');
  await expect(page.locator('[data-action="cloze-option"]')).toHaveCount(4);
});

test('guided Missing Words hint gives help but never false mastery credit',async ({page})=>{
  await page.goto('/#/cloze/sampling');
  const questions=await bank(page,'cloze','cloze');
  await page.locator('#cloze-level').selectOption('guided');
  const id=await page.locator('[data-question-id]').getAttribute('data-question-id');
  const item=questions.find(q=>q.id===id);
  await expect(page.locator('.cloze-options')).toHaveCount(0);
  await page.getByRole('button',{name:'Show first-letter hint'}).click();
  await expect(page.locator('.hint-text')).toContainText(item.answer.charAt(0).toUpperCase());
  await page.locator('#cloze-answer').fill(item.answer);
  await page.locator('#cloze-answer').press('Enter');
  await expect(page.locator('.typed-feedback')).toContainText('Correct with help');
  const state=await saved(page);
  expect(state.answers).toBe(1);
  expect(state.concepts[item.conceptId].correct).toBe(0);
  await page.getByRole('button',{name:/Next question/}).click();
  await expect(page.locator('#cloze-answer')).toBeFocused();
});

test('independent Missing Words offers one typo correction without double recording',async ({page})=>{
  await page.goto('/#/cloze/sampling');
  const questions=await bank(page,'cloze','cloze');
  await page.locator('#cloze-level').selectOption('independent');
  let current;
  for(let index=0;index<questions.length;index++){
    const id=await page.locator('[data-question-id]').getAttribute('data-question-id');
    current=questions.find(q=>q.id===id);
    if(current.answer.length>=8) break;
    await page.getByRole('button',{name:'Show answer and move on'}).click();
    await page.getByRole('button',{name:/Next question/}).click();
  }
  expect(current.answer.length).toBeGreaterThanOrEqual(8);
  const before=(await saved(page))?.answers ?? 0;
  await page.locator('#cloze-answer').fill(current.answer.slice(0,-1));
  await page.locator('#cloze-answer').press('Enter');
  await expect(page.locator('.typed-near-miss')).toBeVisible();
  await expect(page.locator('#cloze-answer')).toBeFocused();
  expect((await saved(page))?.answers ?? 0).toBe(before);
  await page.locator('#cloze-answer').fill(current.answer);
  await page.locator('#cloze-answer').press('Enter');
  await expect(page.locator('.typed-feedback')).toContainText('Exactly right');
  expect((await saved(page)).answers).toBe(before+1);
  await expect(page.locator('.typed-feedback')).toBeFocused();
});

test('incorrect independent Missing Words answer is recorded once and feedback shows the model word',async ({page})=>{
  await page.goto('/#/cloze/data');
  await page.locator('#cloze-level').selectOption('independent');
  const questions=await bank(page,'cloze','cloze');
  const id=await page.locator('[data-question-id]').getAttribute('data-question-id');
  const item=questions.find(q=>q.id===id);
  await page.locator('#cloze-answer').fill('a completely different answer');
  await page.locator('#cloze-answer').press('Enter');
  await expect(page.locator('.typed-feedback')).toContainText(item.answer);
  expect((await saved(page)).answers).toBe(1);
  await expect(page.locator('.typed-form')).toHaveCount(0);
});

test('all eight data terms can be retrieved in untimed Speed Recall and progress survives reload',async ({page})=>{
  await page.goto('/#/speed/data');
  const concepts=await bank(page,'concepts','concepts');
  for(let i=0;i<8;i++){
    const item=await speedConcept(page,concepts);
    expect(item).toBeTruthy();
    await page.locator('#speed-answer').fill(item.label);
    await page.locator('#speed-answer').press('Enter');
    await expect(page.locator('.typed-feedback')).toContainText('Correct');
    await page.getByRole('button',{name:i===7?'Finish round →':'Next definition →'}).click();
  }
  await expect(page.getByText('Round complete',{exact:true})).toBeVisible();
  await expect(page.locator('.completion-score')).toContainText('8 correct of 8 submitted');
  expect((await saved(page)).sessions).toBe(1);
  expect((await saved(page)).answers).toBe(8);
  await page.reload();
  await page.goto('/#/home/data');
  await expect(page.locator('.progress-panel .stat-number').first()).toHaveText('8');
});

test('Speed Recall accepts curated synonym convenience sampling with credit',async ({page})=>{
  await page.goto('/#/speed/sampling');
  await page.locator('#speed-mode').selectOption('timed');
  await page.locator('#speed-duration').selectOption('90');
  await page.getByRole('button',{name:/Start 90-second round/}).click();
  for(let i=0;i<18;i++) {
    const id=await page.locator('[data-concept-id]').getAttribute('data-concept-id');
    if(id==='opportunity-sampling')break;
    await page.getByRole('button',{name:'Skip and reveal'}).click();
    await page.getByRole('button',{name:'Next definition →'}).click();
  }
  await expect(page.locator('[data-concept-id="opportunity-sampling"]')).toBeVisible();
  await page.locator('#speed-answer').fill('convenience sampling');
  await page.locator('#speed-answer').press('Enter');
  await expect(page.locator('.typed-feedback')).toContainText('Correct');
  await expect(page.locator('.alias-note')).toContainText('Accepted equivalent terminology');
  expect((await saved(page)).concepts['opportunity-sampling'].correct).toBe(1);
});

test('Speed Recall typo correction does not count until exact answer is submitted',async ({page})=>{
  await page.goto('/#/speed/data');
  const concepts=await bank(page,'concepts','concepts');
  const item=await speedConcept(page,concepts);
  // All data terms are long enough to support a one-character omission except "Raw data", length 8.
  await page.locator('#speed-answer').fill(item.label.slice(0,-1));
  await page.locator('#speed-answer').press('Enter');
  await expect(page.locator('.typed-near-miss')).toBeVisible();
  expect((await saved(page))?.answers ?? 0).toBe(0);
  await page.locator('#speed-answer').fill(item.label);
  await page.locator('#speed-answer').press('Enter');
  await expect(page.locator('.typed-feedback')).toBeFocused();
  expect((await saved(page)).answers).toBe(1);
});

test('timed Speed Recall starts on demand and expires at the limit without marking unfinished answer',async ({page})=>{
  await page.clock.install();
  await page.goto('/#/speed/data');
  await page.locator('#speed-mode').selectOption('timed');
  await page.locator('#speed-duration').selectOption('30');
  await expect(page.getByRole('button',{name:/Start 30-second round/})).toBeVisible();
  expect(await saved(page)).toBe(null);
  await page.getByRole('button',{name:/Start 30-second round/}).click();
  await expect(page.locator('[data-clock]')).toHaveText('00:30');
  await page.clock.fastForward(31_000);
  await expect(page.getByText('Round complete',{exact:true})).toBeVisible();
  await expect(page.locator('.completion-score')).toContainText('Time is up');
  expect((await saved(page))?.answers ?? 0).toBe(0);
  expect((await saved(page)).sessions).toBe(1);
});

test('timer pauses while explanation is displayed, and resumes for next definition',async ({page})=>{
  await page.clock.install();
  await page.goto('/#/speed/data');
  await page.locator('#speed-mode').selectOption('timed');
  await page.locator('#speed-duration').selectOption('30');
  await page.getByRole('button',{name:/Start 30-second round/}).click();
  const concepts=await bank(page,'concepts','concepts');
  const item=await speedConcept(page,concepts);
  await page.locator('#speed-answer').fill(item.label);
  await page.locator('#speed-answer').press('Enter');
  await expect(page.locator('.typed-feedback')).toContainText('Correct');
  await page.clock.fastForward(40_000);
  await expect(page.locator('.typed-feedback')).toBeVisible();
  await expect(page.locator('[data-clock]')).toHaveText('00:30');
  await page.getByRole('button',{name:'Next definition →'}).click();
  await page.clock.fastForward(31_000);
  await expect(page.getByText('Round complete',{exact:true})).toBeVisible();
  expect((await saved(page)).sessions).toBe(1);
});

test('both typed activities retain accessibility and no horizontal overflow at 320px/390px',async ({page})=>{
  for (const width of [320,390]){
    await page.setViewportSize({width,height:790});
    await page.goto('/#/cloze/sampling');
    await page.locator('#cloze-level').selectOption('guided');
    await expect(page.locator('#cloze-answer')).toBeVisible();
    let w=await page.evaluate(()=>document.documentElement.scrollWidth);
    expect(w,'cloze guided '+width).toBeLessThanOrEqual(width+1);
    await page.getByRole('button',{name:'Show first-letter hint'}).click();
    w=await page.evaluate(()=>document.documentElement.scrollWidth);
    expect(w,'cloze hint '+width).toBeLessThanOrEqual(width+1);
    await page.goto('/#/speed/data');
    await page.locator('#speed-mode').selectOption('timed');
    await page.locator('#speed-duration').selectOption('30');
    await page.getByRole('button',{name:/Start 30-second round/}).click();
    await expect(page.locator('#speed-answer')).toBeVisible();
    w=await page.evaluate(()=>document.documentElement.scrollWidth);
    expect(w,'speed timed '+width).toBeLessThanOrEqual(width+1);
    await page.locator('#speed-answer').fill('incorrect');
    await page.locator('#speed-answer').press('Enter');
    await expect(page.locator('.typed-feedback')).toBeVisible();
    w=await page.evaluate(()=>document.documentElement.scrollWidth);
    expect(w,'speed feedback '+width).toBeLessThanOrEqual(width+1);
  }
});
