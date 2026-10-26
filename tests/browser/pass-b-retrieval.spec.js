import {test,expect} from '@playwright/test';
const store=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('sampling-arcade-progress-v1')));
const currentId=(page,selector,attr)=>page.locator(selector).getAttribute(attr);

test('Missing Words has focused ten-question practice and an optional complete bank',async({page})=>{
  await page.goto('/#/cloze/data');
  await expect(page.locator('#cloze-level')).toHaveValue('choices');
  await expect(page.locator('#cloze-length')).toHaveValue('10');
  await expect(page.locator('.round-progress')).toContainText('1 / 10');
  expect(await store(page)).toBe(null);
  await page.locator('#cloze-length').selectOption('all');
  await expect(page.locator('.round-progress')).toContainText('1 / 16');
  const bank=await page.evaluate(async()=>await(await fetch('./content/cloze.json')).json());
  expect(bank.cloze).toHaveLength(53);
  await page.goto('/#/cloze/sampling');
  await expect(page.locator('#cloze-length')).toHaveValue('10');
  await page.locator('#cloze-length').selectOption('20');
  await expect(page.locator('.round-progress')).toContainText('1 / 20');
  await page.locator('#cloze-length').selectOption('all');
  await expect(page.locator('.round-progress')).toContainText('1 / 37');
  expect(await store(page)).toBe(null,'Changing the practice size cannot award progress');
});

test('new Missing Words prompts retain accurate independent grading and locally saved progress',async({page})=>{
  await page.goto('/#/cloze/data');
  await page.locator('#cloze-level').selectOption('independent');
  const id=await currentId(page,'[data-question-id]','data-question-id');
  const q=await page.evaluate(async id=>(await(await fetch('./content/cloze.json')).json()).cloze.find(x=>x.id===id),id);
  await page.locator('#cloze-answer').fill(q.answer);
  await page.locator('#cloze-answer').press('Enter');
  await expect(page.locator('.cloze-feedback')).toContainText('Exactly right');
  await expect(page.locator('.cloze-reason')).toHaveText(q.explanation);
  const before=await store(page);
  expect(before.answers).toBe(1);
  await page.locator('#cloze-length').selectOption('all');
  expect((await store(page)).answers).toBe(1);
  await expect(page.locator('.round-progress')).toContainText('1 / 16');
  await expect(page.locator('.cloze-blank')).not.toHaveClass(/is-revealed/);
});

test('Speed Recall uses a reviewed clue without exposing the mathematical term',async({page})=>{
  await page.goto('/#/speed/data');
  const id=await currentId(page,'[data-concept-id]','data-concept-id');
  const displayed=await page.locator('#speed-definition').innerText();
  const details=await page.evaluate(async id=>{
    const concepts=(await(await fetch('./content/concepts.json')).json()).concepts;
    const clues=(await(await fetch('./content/recall-clues.json')).json()).clues;
    return {c:concepts.find(x=>x.id===id),clues:clues.filter(x=>x.conceptId===id)};
  },id);
  expect([details.c.definition,...details.clues.map(x=>x.text)]).toContain(displayed);
  expect(displayed.toLowerCase()).not.toContain(details.c.label.toLowerCase());
  await page.locator('#speed-answer').fill(details.c.label);
  await page.locator('#speed-answer').press('Enter');
  await expect(page.locator('.speed-feedback')).toContainText('Correct');
  await expect(page.locator('.speed-model-example')).toContainText(details.c.example);
  expect((await store(page)).answers).toBe(1);
});

test('Match Up offers five, seven or all eight data terms and preserves scoring',async({page})=>{
  await page.goto('/#/match/data');
  await expect(page.locator('#match-length')).toHaveValue('5');
  await expect(page.locator('.match-board .match-tile')).toHaveCount(10);
  await page.locator('#match-length').selectOption('7');
  await expect(page.locator('.match-board .match-tile')).toHaveCount(14);
  await expect(page.locator('.match-progress-pip')).toHaveCount(7);
  await page.locator('#match-length').selectOption('8');
  await expect(page.locator('.match-board .match-tile')).toHaveCount(16);
  await expect(page.locator('.match-progress-pip')).toHaveCount(8);
  expect(await store(page)).toBe(null);
  const first=page.locator('[data-action="match-term"]').first();
  const id=await first.getAttribute('data-id');
  await first.click();
  await page.locator('[data-action="match-def"][data-id="'+id+'"]').click();
  await expect(page.locator('.match-progress-pip.is-complete')).toHaveCount(1);
  expect((await store(page)).answers).toBe(1);
  await page.locator('#match-length').selectOption('5');
  await expect(page.locator('.match-board .match-tile')).toHaveCount(10);
  expect((await store(page)).answers).toBe(1,'Restarting cannot award a second mark');
});

test('replaying Match Up prioritises genuinely new terms and new descriptions',async({page})=>{
  await page.goto('/#/match/sampling');
  const oldIds=await page.locator('.match-terms [data-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.id));
  await page.locator('#match-length').selectOption('7');
  const newIds=await page.locator('.match-terms [data-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.id));
  expect(oldIds).toHaveLength(5);
  expect(newIds).toHaveLength(7);
  expect(newIds.filter(id=>oldIds.includes(id))).toHaveLength(0);
  await expect(page.locator('.match-board')).toHaveAttribute('aria-busy','false');
});

for(const width of [320,390,768,1280]){
  test('longer retrieval rounds remain accessible without horizontal scrolling at '+width+'px',async({page})=>{
    await page.setViewportSize({width,height:800});
    for(const [mode,control,value] of [['match','match-length','8'],['cloze','cloze-length','all'],['speed',null,null]]){
      await page.goto('/#/'+mode+'/data');
      if(control)await page.locator('#'+control).selectOption(value);
      const size=await page.evaluate(()=>({
        client:document.documentElement.clientWidth,
        scroll:document.documentElement.scrollWidth
      }));
      expect(size.scroll,mode+' at '+width).toBeLessThanOrEqual(size.client+1);
      if(mode==='match')await expect(page.locator('.match-definitions .match-tile')).toHaveCount(8);
      if(mode==='cloze')await expect(page.locator('.cloze-level-track')).toBeVisible();
      if(mode==='speed')await expect(page.locator('#speed-definition')).toBeVisible();
    }
  });
}
