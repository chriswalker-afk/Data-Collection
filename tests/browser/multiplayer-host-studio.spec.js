import {test,expect} from '@playwright/test';

const API='http://127.0.0.1:8787';
async function open(page) {
 await page.addInitScript(url=>window.__SAMPLING_MULTIPLAYER_API__=url,API);
 await page.goto('/multiplayer.html');
}
async function selectObjective(page,value) {
 await page.locator('.studio-choice').filter({has:page.locator('input[name="studio-objective"][value="'+value+'"]')}).click();
}
async function selectFormat(page,value) {
 await page.locator('.studio-choice').filter({has:page.locator('input[name="studio-format"][value="'+value+'"]')}).click();
}

test('default studio hosts the same checked classic multiplayer activities',async({page})=>{
 await open(page);
 await expect(page.locator('#studio-preview-availability')).toContainText('Ready to host now');
 await expect(page.locator('#create')).toBeEnabled();
 await expect(page.locator('#studio-preview-title')).toContainText('Classic Challenge');
 for(const [game,lengths,seconds] of [
  ['which',['5','10','20'],20],['speed',['5','10','20'],25],
  ['match',['1','2','3'],75],['sort',['1','3','6','10'],90]
 ]){
  await page.locator('#game-mode').selectOption(game);
  expect(await page.locator('#length option').evaluateAll(options=>options.map(o=>o.value))).toEqual(lengths);
  await expect(page.locator('#mode-description')).toContainText(seconds+' seconds');
  await expect(page.locator('#create')).toBeEnabled();
 }
});
test('objective presets and previews never create unfinished gameplay rooms',async({page})=>{
 await open(page);
 await selectObjective(page,'blitz');
 await expect(page.locator('#create')).toBeEnabled();
 await expect(page.locator('#studio-preview-availability')).toContainText('Ready to host now');
 await expect(page.locator('#studio-minutes')).toBeVisible();
 for(const objective of ['bullseye','perfect']){
  await selectObjective(page,objective);
  await expect(page.locator('#create')).toBeEnabled();
  await expect(page.locator('#studio-preview-availability')).toContainText('Ready to host now');
  await expect(page.locator('#studio-minutes')).toBeVisible();
  await expect(page.locator('#studio-future-note')).toBeHidden();
 }
 for(const [objective,target,needle] of [
  ['class','#studio-class-metric','shared']
 ]){
  await selectObjective(page,objective);
  await expect(page.locator('#create')).toBeDisabled();
  await expect(page.locator('#studio-preview-availability')).toContainText('Preview only');
  await expect(page.locator(target)).toBeVisible();
  if(objective!=='class')await expect(page.locator('#studio-preview-detail')).toContainText(needle);
  await expect(page.locator('#room')).toBeHidden();
 }
 await selectObjective(page,'classic');
 await expect(page.locator('#create')).toBeEnabled();
 await selectFormat(page,'relay');
 await expect(page.locator('#create')).toBeDisabled();
 await expect(page.locator('#studio-preview-availability')).toContainText('Puzzle Relay');
 await selectFormat(page,'individual');
 await expect(page.locator('#create')).toBeEnabled();
});
test('Bullseye and cooperative metrics keep their edited configuration after refresh',async({page})=>{
 await open(page);
 await selectObjective(page,'bullseye');
 await page.locator('#studio-accuracy-target').fill('95');
 await page.locator('#studio-accuracy-window').fill('12');
 await expect(page.locator('#studio-preview-detail')).toContainText('95% accuracy');
 await expect(page.locator('#studio-preview-detail')).toContainText('12 fully marked tasks');
 await selectObjective(page,'class');
 await page.locator('#studio-class-metric').selectOption('correct');
 await page.locator('#studio-class-correct').fill('180');
 await page.locator('#studio-class-participation').fill('85');
 await expect(page.locator('#studio-preview-detail')).toContainText('180 correct answers');
 await expect(page.locator('#studio-preview-detail')).toContainText('85% participation');
 await page.reload();
 await expect(page.locator('input[name="studio-objective"][value="class"]')).toBeChecked();
 await expect(page.locator('#studio-class-correct')).toHaveValue('180');
 await expect(page.locator('#studio-class-participation')).toHaveValue('85');
 await expect(page.locator('#create')).toBeDisabled();
 await page.locator('#studio-class-metric').selectOption('everyone');
 await page.locator('#studio-class-per-student').fill('6');
 await expect(page.locator('#studio-preview-detail')).toContainText('each answer 6 questions correctly');
});
test('invalid configuration shows its reason and cannot launch',async({page})=>{
 await open(page);
 await selectObjective(page,'blitz');
 await page.locator('#studio-minutes').fill('16');
 await expect(page.locator('#studio-validation')).toBeVisible();
 await expect(page.locator('#studio-validation')).toContainText('between 1 and 15');
 await expect(page.locator('#create')).toBeDisabled();
 await page.locator('#studio-minutes').fill('7');
 await expect(page.locator('#studio-validation')).toBeHidden();
 await page.locator('[data-studio-preset="quick"]').click();
 await expect(page.locator('#studio-minutes')).toHaveValue('3');
 await page.locator('[data-studio-preset="stretch"]').click();
 await expect(page.locator('#studio-minutes')).toHaveValue('10');
});
test('advanced settings are honestly labelled preview-only',async({page})=>{
 await open(page);
 await page.locator('#studio-advanced summary').click();
 await expect(page.locator('#studio-advanced-live-note')).toBeVisible();
 await expect(page.locator('#studio-advanced-future-fields')).toBeHidden();
 await selectObjective(page,'bullseye');
 await expect(page.locator('#studio-advanced-future-fields')).toBeVisible();
 await page.locator('#studio-difficulty').selectOption('advanced');
 await page.locator('#studio-question-order').selectOption('same');
 await page.locator('#studio-leaderboard').uncheck();
 await expect(page.locator('#create')).toBeDisabled();
});
test('Classic squad and optional goal are applied using existing Worker lobby commands',async({page,request,isMobile})=>{
 test.skip(isMobile,'Parallel mobile join and team tests already cover 320px and 390px; avoid duplicate local Worker load.');
 await open(page);
 await selectFormat(page,'squad');
 await page.locator('#studio-team-count').selectOption('3');
 await page.locator('#studio-goal-target').selectOption('80');
 await page.locator('#game-mode').selectOption('sort');
 await page.locator('#length').selectOption('1');
 await expect(page.locator('#studio-preview-detail')).toContainText('3 balanced teams');
 await expect(page.locator('#studio-preview-detail')).toContainText('80%');
 await page.locator('#create').click();
 await expect(page.locator('#connection')).toHaveText('Live connection',{timeout:15000});
 const code=(await page.locator('#room-id').innerText()).trim();
 const token=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('sampling-arcade-multiplayer-v1')).token);
 const res=await request.get(API+'/rooms/'+code+'/state',{headers:{Authorization:'Bearer '+token}});
 expect(res.ok()).toBe(true);
 const state=await res.json();
 expect(state.teamCount).toBe(3);
 expect(state.goalTarget).toBe(80);
 expect(state.game).toBe('sort');
 expect(state.roundLength).toBe(1);
 await expect(page.locator('#team-count')).toHaveValue('3');
 await expect(page.locator('#goal-target')).toHaveValue('80');
});
test('Host Studio fits 320px/mobile and does not stretch the student join card',async({page})=>{
 await open(page);
 for(const width of [320,390,768,1024,1280]){
  await page.setViewportSize({width,height:860});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow,'Horizontal overflow at '+width+'px').toBeLessThanOrEqual(1);
  await expect(page.locator('#host-studio')).toBeVisible();
  await expect(page.locator('#join-form')).toBeVisible();
 }
 const host=await page.locator('.host-entry').boundingBox();
 const student=await page.locator('.student-entry').boundingBox();
 expect(student.height).toBeLessThan(host.height);
});
