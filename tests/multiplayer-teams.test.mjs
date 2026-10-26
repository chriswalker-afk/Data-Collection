import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TEAM_DEFINITIONS,TEAM_COUNTS,CLASS_TARGETS,TEAM_QUEST_TARGET,
  balanceTeams,nextTeamId,teamStandings,classQuestSnapshot,checkedEvidence,
  cleanTeacherFeedback,questionPulse
} from '../multiplayer/team-rules.js';
import {makeCeremony} from '../multiplayer/ceremony-rules.js';
const player=(n)=>({id:'player-'+n,name:'Player '+n,score:0,teamId:null});
const evidence=(id,index,correctCount=1,total=1,points=1000)=>({
  playerId:id,index,questionId:'question-'+index,correctCount,total,points
});
const room=(players=[],teamCount=0,goalTarget=0)=>({
  game:'which',status:'lobby',players,teamCount,goalTarget,
  index:0,roundLength:5,deck:[],answers:[],results:[],feedback:null
});
test('teacher configuration accepts only individual play or 2, 3, 4 teams and the audited accuracy targets',()=>{
  assert.deepEqual(TEAM_COUNTS,[0,2,3,4]);
  assert.deepEqual(CLASS_TARGETS,[0,70,80,90]);
  assert.equal(TEAM_DEFINITIONS.length,4);
  assert.equal(new Set(TEAM_DEFINITIONS.map(t=>t.id)).size,4);
  assert.equal(TEAM_QUEST_TARGET,75);
  assert.throws(()=>balanceTeams([player(1)],5));
});
test('45 players are evenly allocated to each allowed team size without losing identity or score',()=>{
  const initial=Array.from({length:45},(_,i)=>player(i+1));
  for(const count of [2,3,4]){
    const result=balanceTeams(initial,count);
    assert.equal(result.length,45);
    assert.equal(new Set(result.map(p=>p.id)).size,45);
    const sizes=TEAM_DEFINITIONS.slice(0,count).map(t=>
      result.filter(p=>p.teamId===t.id).length);
    assert.ok(Math.max(...sizes)-Math.min(...sizes)<=1);
    assert.ok(initial.every(p=>p.teamId===null),'pure balancing never mutates callers');
    assert.equal(nextTeamId(result,count),
      TEAM_DEFINITIONS[sizes.indexOf(Math.min(...sizes))].id);
  }
  assert.ok(balanceTeams(initial,0).every(p=>p.teamId===null));
});
test('team scores use per-member average, so having more members does not guarantee victory',()=>{
  const r=room(balanceTeams(Array.from({length:5},(_,i)=>player(i+1)),2),2);
  const score=[1000,600,1000,600,1000];
  r.players.forEach((p,i)=>{p.score=score[i]});
  const standings=teamStandings(r);
  const vector=standings.find(t=>t.id==='vector'),sigma=standings.find(t=>t.id==='sigma');
  assert.equal(vector.members,3);assert.equal(sigma.members,2);
  assert.equal(vector.totalScore,3000);
  assert.equal(sigma.totalScore,1200);
  assert.equal(vector.averageScore,1000);
  assert.equal(sigma.averageScore,600);
  assert.equal(vector.rank,1);
  assert.equal(sigma.rank,2);
  assert.equal(teamStandings(room(),false).length,0);
});
test('team ranking permits ties and zero points never creates a winner',()=>{
  const r=room(balanceTeams([player(1),player(2),player(3),player(4)],2),2);
  assert.ok(teamStandings(r).every(t=>t.rank===null));
  r.players.forEach(p=>{p.score=1000});
  assert.deepEqual(teamStandings(r).map(t=>t.rank),[1,1]);
});
test('unrevealed answers never affect published class accuracy or team average',()=>{
  const players=balanceTeams([player(1),player(2)],2);
  const r=room(players,2,70);
  r.status='playing';r.index=1;r.deck=Array.from({length:5},()=>({}));
  r.results=[evidence('player-1',0,1,1,1000),evidence('player-2',0,0,1,0),
    evidence('player-1',1,1,1,1000),evidence('player-2',1,1,1,1000)];
  r.players[0].score=2000;r.players[1].score=1000;
  const current=teamStandings(r,true),published=teamStandings(r,false);
  assert.equal(current.find(t=>t.id==='vector').averageScore,2000);
  assert.equal(published.find(t=>t.id==='vector').averageScore,1000);
  assert.equal(published.find(t=>t.id==='sigma').averageScore,0);
  assert.equal(classQuestSnapshot(r).checked,2);
  assert.equal(classQuestSnapshot(r).correct,1);
  assert.equal(classQuestSnapshot(r).pendingReview,true);
  assert.equal(checkedEvidence(r,{includeCurrent:false}).length,2);
});
test('Class Quest requires accuracy, 75% participation, minimum five checked decisions, and completion',()=>{
  const people=Array.from({length:3},(_,i)=>player(i+1));
  const r=room(people,0,80);
  r.deck=Array.from({length:5},()=>({}));
  r.status='finished';r.index=5;
  // 12 of 15 available answers, 11 correct.
  r.results=Array.from({length:12},(_,i)=>evidence(people[i%3].id,Math.floor(i/3),i===0?0:1));
  let goal=classQuestSnapshot(r);
  assert.equal(goal.opportunities,15);
  assert.equal(goal.submitted,12);
  assert.equal(goal.accuracy,92);
  assert.equal(goal.coverage,80);
  assert.equal(goal.achieved,true);
  r.results.splice(-1,1);
  goal=classQuestSnapshot(r);
  assert.equal(goal.submitted,11);
  assert.equal(goal.achieved,false,'below participation coverage');
  r.results=Array.from({length:12},(_,i)=>evidence(people[i%3].id,Math.floor(i/3),i<4?0:1));
  assert.equal(classQuestSnapshot(r).achieved,false,'only 67% correct');
  r.status='playing';r.index=4;
  assert.equal(classQuestSnapshot(r).achieved,false,'not earned before round end');
});
test('Team Quests use the same real response and accuracy safeguards',()=>{
  const p=balanceTeams(Array.from({length:4},(_,i)=>player(i+1)),2);
  const r=room(p,2,0);r.status='finished';r.index=5;r.deck=Array.from({length:5},()=>({}));
  // Each team has ten available responses; first has eight correct, second five.
  r.results=[
    ...Array.from({length:8},(_,i)=>evidence(p[(i%2)*2].id,Math.floor(i/2))),
    ...Array.from({length:8},(_,i)=>evidence(p[(i%2)*2+1].id,Math.floor(i/2),i<5?1:0))
  ];
  const teams=teamStandings(r);
  assert.equal(teams.find(t=>t.id==='vector').questComplete,true);
  assert.equal(teams.find(t=>t.id==='sigma').questComplete,false);
});
test('feedback accepts clean teacher text only and review aggregates correct mathematical decisions',()=>{
  assert.equal(cleanTeacherFeedback('  Compare quota\nwith random sampling. '),
    'Compare quota with random sampling.');
  assert.equal(cleanTeacherFeedback('<script>alert(1)</script>'),'<script>alert(1)</script>');
  assert.equal(cleanTeacherFeedback('x'),null);
  assert.equal(cleanTeacherFeedback('x'.repeat(161)),null);
  assert.equal(cleanTeacherFeedback({text:'fake'}),null);
  const r=room([player(1),player(2)]);r.status='reveal';
  r.answers=[{id:'player-1',correctCount:3,total:4},{id:'player-2',correctCount:1,total:4}];
  assert.deepEqual(questionPulse(r),{responses:2,players:2,decisions:8,correct:4,accuracy:50});
  r.status='playing';assert.equal(questionPulse(r),null);
});
test('ceremony includes optional team league and Class Quest slides without changing individual awards',()=>{
  const players=balanceTeams([player(1),player(2)],2);
  players[0].score=1000;players[1].score=0;
  const r=room(players,2,70);r.status='finished';r.deck=Array(5).fill({});
  r.results=[evidence(players[0].id,0,1)];
  const slides=makeCeremony(r).slides;
  assert.deepEqual(slides.slice(0,4).map(s=>s.kind),
    ['welcome','team-podium','class-quest','podium']);
  assert.equal(slides[1].standings.length,2);
  assert.equal(slides[1].standings[0].averageScore,1000);
  assert.equal(slides[2].achieved,false);
  assert.equal(slides[3].standings[0].score,1000);
  r.teamCount=0;r.goalTarget=0;
  assert.deepEqual(makeCeremony(r).slides.slice(0,2).map(s=>s.kind),['welcome','podium']);
});
