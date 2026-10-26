import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

const examKey='sampling-arcade-exam-v1',progressKey='sampling-arcade-progress-v1';
async function bank(page){return page.evaluate(async()=> (await(await fetch('./content/exam-practice.json')).json()).questions);}
async function stored(page,key=examKey){return page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);}

test('home clearly guides students through recall, application and exam work',async({page})=>{
 await page.goto('/#/home/sampling');
 await expect(page.getByRole('heading',{name:'Not sure where to begin?'})).toBeVisible();
 await expect(page.locator('.journey-step')).toHaveCount(4);
 await expect(page.locator('.game-card')).toHaveCount(10);
 await expect(page.locator('.journey-suggestion')).toContainText('Start with the key terms');
 await expect(page.locator('.journey-step').last()).toContainText('Exam Lab');
 await page.locator('.journey-step').last().getByRole('link').click();
 await expect(page).toHaveURL(/#\/exam\/sampling$/);
 await expect(page.locator('#view-heading')).toHaveText('Exam Lab');
});

test('data-topic recommendations never direct students to sampling-only activities',async({page})=>{
 await page.goto('/#/home/data');
 await expect(page.locator('.journey-step')).toHaveCount(4);
 const hrefs=await page.locator('.journey-step-link').evaluateAll(nodes=>nodes.map(a=>a.getAttribute('href')));
 expect(hrefs).toHaveLength(4);
 expect(hrefs.every(h=>!['/exam/','/identify/','/build/','/reason/','/error/','/sort/'].some(token=>h.includes(token)))).toBe(true);
 await page.locator('.journey-step-link').last().click();
 await expect(page).toHaveURL(/#\/speed\/data$/);
});

test('local saved exam targets produce an explainable exam recommendation without modifying progress',async({page})=>{
 await page.goto('/#/home/sampling');
 await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({version:1,reviewIds:['eval-two-samples'],paper:null})),examKey);
 await page.reload();
 await expect(page.locator('.journey-suggestion')).toContainText('Review your saved exam questions');
 await expect(page.locator('.journey-suggestion a')).toHaveAttribute('href','#/exam/sampling');
 expect(await page.evaluate(()=>localStorage.getItem('sampling-arcade-progress-v1'))).toBeNull();
});

test('Exam Lab level selection is keyboard operable, balanced, progressive and restored',async({page})=>{
 const rank={foundation:0,develop:1,extend:2};
 await page.goto('/#/exam/sampling');const questions=await bank(page);
 await page.locator('input[name="exam-difficulty"][value="confidence"]').focus();
 await page.keyboard.press('Space');
 await expect(page.locator('input[value="confidence"]')).toBeChecked();
 await page.getByRole('button',{name:'Start mixed paper'}).click();
 let current=await stored(page);
 expect(current.paper.difficulty).toBe('confidence');
 expect(current.paper.questionIds).toHaveLength(8);
 let chosen=current.paper.questionIds.map(id=>questions.find(q=>q.id===id));
 expect(chosen.every(q=>q.level!=='extend')).toBe(true);
 expect(chosen.map(q=>rank[q.level])).toEqual([...chosen.map(q=>rank[q.level])].sort());
 await page.reload();
 await page.getByRole('button',{name:'Resume saved paper'}).click();
 expect((await stored(page)).paper.difficulty).toBe('confidence');
 await page.getByRole('button',{name:'Back to paper choices'}).click();
 await page.locator('input[value="stretch"]').check();
 page.once('dialog',d=>d.accept());
 await page.getByRole('button',{name:'Start full challenge'}).click();
 current=await stored(page);
 expect(current.paper.difficulty).toBe('stretch');
 chosen=current.paper.questionIds.map(id=>questions.find(q=>q.id===id));
 expect(chosen).toHaveLength(12);
 expect(chosen.every(q=>q.level!=='foundation')).toBe(true);
 const evals=chosen.filter(q=>q.type==='evaluation');
 expect(evals.some(q=>q.coverageArea==='inference')).toBe(true);
 expect(evals.some(q=>q.coverageArea==='methods')).toBe(true);
});

test('completed round provides next lesson and opt-in classroom feedback entry',async({page})=>{
 await page.goto('/#/match/data');
 for(let i=0;i<5;i++){
  const id=await page.locator('[data-action="match-term"]').first().getAttribute('data-id');
  await page.locator('[data-action="match-term"][data-id="'+id+'"]').click();
  await page.locator('[data-action="match-def"][data-id="'+id+'"]').click();
 }
 await expect(page.getByText('Round complete',{exact:true})).toBeVisible();
 await expect(page.locator('.completion-next')).toContainText('Recall the missing words');
 await page.getByRole('button',{name:'Share short feedback'}).click();
 await expect(page).toHaveURL(/#\/home\/data$/);
 await expect(page.locator('#classroom-feedback')).toHaveAttribute('open','');
 await expect(page.locator('#classroom-feedback-summary')).toBeFocused();
});

test('classroom feedback is downloaded only on deliberate submit and never transmitted',async({page})=>{
 const posts=[];
 page.on('request',request=>{if(request.method()==='POST')posts.push(request.url())});
 await page.goto('/#/home/sampling');
 await expect(page.locator('#classroom-feedback')).not.toHaveAttribute('open','');
 await page.locator('#classroom-feedback summary').click();
 await page.locator('#trial-activity').selectOption('exam');
 await page.locator('input[name="clarity"][value="Partly clear"]').check();
 await page.locator('input[name="challenge"][value="About right"]').check();
 await page.locator('input[name="feedback"][value="Somewhat helpful"]').check();
 await page.locator('#trial-comment').fill('The procedure steps could have a clearer example.');
 const [download]=await Promise.all([
  page.waitForEvent('download'),page.getByRole('button',{name:'Download feedback file'}).click()
 ]);
 expect(download.suggestedFilename()).toBe('sampling-arcade-classroom-feedback.txt');
 const text=await readFile(await download.path(),'utf8');
 expect(text).toContain('Exam Lab');expect(text).toContain('Partly clear');
 expect(text).toContain('clearer example');
 await expect(page.locator('[data-feedback-status]')).toContainText('Share it with your teacher only if you choose');
 expect(posts).toEqual([]);
 expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.includes('feedback')))).toEqual([]);
});

test('Exam Lab completion report offers an accessible feedback hand-off',async({page})=>{
 await page.goto('/#/exam/sampling');
 await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({version:1,reviewIds:[],paper:{
  variant:'review',questionIds:['eval-two-samples'],index:0,complete:true,
  entries:{'eval-two-samples':{stage:'done',draft:'My own words',values:{},included:[],flag:true,hintsUsed:0}}
 }})),examKey);
 await page.reload();
 await page.getByRole('button',{name:'View previous report'}).click();
 await expect(page.locator('.sim-report-coaching')).toBeVisible();
 await page.getByRole('button',{name:'Share short feedback'}).click();
 await expect(page.locator('#classroom-feedback')).toHaveAttribute('open','');
});

for(const width of [320,390,1280]){
 test('student journey, feedback form and difficulty choices fit '+width+'px',async({page})=>{
  await page.setViewportSize({width,height:820});
  await page.goto('/#/home/sampling');
  await expect(page.locator('.journey-steps')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
  await page.locator('#classroom-feedback summary').click();
  await expect(page.locator('#trial-activity')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
  await page.goto('/#/exam/sampling');
  await expect(page.locator('.sim-level-picker')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
 });
}
