// Pass 6 — optional classroom teams and shared mathematical goals.
// Every score, assignment, target and teacher message displayed here comes
// from the Worker. Client controls request changes but never compute winners.
const teamNames={
  vector:'Vector Vipers',sigma:'Sigma Sparrows',delta:'Delta Dolphins',pi:'Pi Pythons'
};
const PRESETS={
  which:['Which part of the scenario tells us how participants were selected?',
    'Explain why this is not stratified random sampling.',
    'Where could selection bias appear in this method?'],
  speed:['Which words are essential to that definition?',
    'Say the definition aloud without looking at the answer.',
    'Which similar mathematical term might someone confuse this with?'],
  match:['Explain one matched definition in your own words.',
    'Which two mathematical terms are easiest to confuse?',
    'Choose one pair and give an example from real data collection.'],
  sort:['Why is this an advantage for this particular method?',
    'Explain how the same statement might change for a different population.',
    'Where is the trade-off between bias, practicality and precision?']
};
const parent=(tag,cls,children=[])=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  el.append(...children);return el;
};
export function createTeamUI({make,button,command,stageKicker}){
  let draftFeedback='',feedbackOpen=false;
  function selector(id,options,value){
    const el=make('select');el.id=id;
    for(const [v,label] of options){
      const opt=make('option',label);opt.value=String(v);el.append(opt);
    }
    el.value=String(value);return el;
  }
  function setup(room,isHost,stage){
    if(!isHost){
      if(room.teamCount){
        const me=room.players.find(p=>p.id===room.me.id);
        stage.append(make('p','Your team: '+(teamNames[me?.teamId]||'Ask your teacher')+
          (room.objective==='class'?
            '. Your teammates help the entire class complete one shared mathematical goal.':
            '. Individual answers still count; your team score is the average earned per player.'),'team-lobby-note'));
      }
      if(room.goalTarget)stage.append(make('p','Class Quest: work together to achieve at least '+
        room.goalTarget+'% checked accuracy and 75% participation.','team-lobby-note'));
      return;
    }
    const section=make('section',undefined,'team-setup');
    section.append(stageKicker(room.objective==='class'?
      'OUR COOPERATIVE CREW':'OPTIONAL CLASSROOM CHALLENGES'));
    const h=make('h3',room.objective==='class'?
      'Teams working towards one goal':'Teams and class quest');section.append(h);
    const intro=make('p',room.objective==='class'?
      'Teams are balanced automatically. In Class Quest, all teams cooperate towards a single shared result; there is no competitive ranking.':
      'Teams are balanced automatically. Every student answers independently; team rankings use the average score per member, not the biggest total.');
    section.append(intro);
    const controls=parent('div','team-setup-controls');
    const teamLabel=make('label','Game format');teamLabel.htmlFor='team-count';
    const count=selector('team-count',[[0,'Individual competition'],[2,'2 balanced teams'],
      [3,'3 balanced teams'],[4,'4 balanced teams']],room.teamCount||0);
    const apply=button('Apply format',()=>void command('teams-set',{count:Number(count.value)}),'btn btn-quiet');
    apply.id='teams-apply';
    const teamField=parent('div','team-setup-field',[teamLabel,count,apply]);
    const shuffle=button('Shuffle team assignments',()=>void command('teams-shuffle'),'btn btn-quiet');
    shuffle.id='teams-shuffle';shuffle.disabled=!room.teamCount||room.players.length<2;
    teamField.append(shuffle);
    controls.append(teamField);
    const goalLabel=make('label','Class accuracy goal');goalLabel.htmlFor='goal-target';
    const target=selector('goal-target',[[0,'No class goal'],[70,'70% accurate'],
      [80,'80% accurate'],[90,'90% accurate']],room.goalTarget||0);
    const applyGoal=button('Set class goal',()=>void command('goal-set',{target:Number(target.value)}),'btn btn-quiet');
    applyGoal.id='goal-apply';
    if(room.objective==='classic')
      controls.append(parent('div','team-setup-field',[goalLabel,target,applyGoal]));
    section.append(controls);
    section.append(make('p',room.objective==='classic'?
      'A class goal succeeds when at least 75% of available responses are submitted, at least five mathematical decisions are checked, and the chosen accuracy target is met. Team Quests use 75% accuracy and 75% participation.':
      room.objective==='class'?
        'Class Quest is a shared class achievement. Every student needs at least two checked tasks to contribute, and at least three classmates must be involved.':
      ['bullseye','perfect'].includes(room.objective)?
        'In this race, a team wins only when one of its members first reaches the full mathematical target. Class Quest goals are a separate upcoming mode.':
        'Timed Blitz uses average checked team contributions; Class Quest goals will be available in a later pass.','team-setup-note'));
    stage.append(section);
  }
  function progress(label,value,max){
    const group=make('div',undefined,'team-progress-group');
    group.append(make('span',label,'team-progress-label'));
    const bar=make('progress');bar.max=100;bar.value=Math.max(0,Math.min(100,max));
    bar.setAttribute('aria-label',label+': '+max+'%');group.append(bar);
    return group;
  }
  function sidebar(room,root){
    root.replaceChildren();
    const teams=Array.isArray(room.teams)?room.teams:[];
    const quest=room.classQuest;
    root.hidden=room.objective==='class'||(!teams.length&&!quest);
    if(root.hidden)return;
    if(teams.length){
      const section=make('section',undefined,'team-score-panel');
      section.append(make('h3','Team standings'),make('p',
        ['bullseye','perfect'].includes(room.objective)?
          'The first team to reach the target wins; other scores show progress.':
          'Fair score: points per team member','team-small-note'));
      const grid=make('div',undefined,'team-score-grid');
      for(const t of teams){
        const item=make('article',undefined,'team-score-card');
        item.dataset.teamId=t.id;
        const head=make('div',undefined,'team-score-name');
        head.append(make('span',t.icon),make('strong',t.name));
        item.append(head,make('strong',t.averageScore.toLocaleString('en-GB')+' avg pts','team-score-amount'),
          make('small',t.members+' member'+(t.members===1?'':'s')+
            ' · '+t.totalScore.toLocaleString('en-GB')+' total points'));
        if(room.status!=='lobby'&&t.opportunities>0){
          item.append(progress('Checked accuracy',t.correct,t.accuracy),
            make('p',t.accuracy+'% accuracy · '+t.coverage+'% participation','team-small-note'));
          if(room.status==='finished'&&room.objective==='classic')item.append(make('span',
            t.questComplete?'✦ Team Quest completed':'Team Quest not yet completed','team-quest-label'));
        }
        grid.append(item);
      }
      section.append(grid);
      root.append(section);
    }
    if(quest){
      const section=make('section',undefined,'class-quest-panel');
      section.append(make('h3','Class Quest · '+quest.target+'%'),
        make('p','Work together: accurate mathematics and widespread participation.','team-small-note'));
      section.append(progress('Checked accuracy',quest.correct,quest.accuracy),
        progress('Participation',quest.submitted,quest.coverage));
      section.append(make('p',quest.correct+' / '+quest.checked+' decisions correct · '+
        quest.submitted+' / '+quest.opportunities+' responses','team-small-note'));
      const status=make('strong',quest.finished?
        quest.achieved?'✦ Class Quest achieved!':'Class Quest not yet achieved':
        quest.pendingReview?'Updates after the teacher reveals the answer.':'Keep building towards the goal.',
        'class-quest-status');
      section.append(status);root.append(section);
    }
  }
  function review(room,isHost,stage){
    if(room.status!=='reveal')return;
    const feedback=room.teacherFeedback;
    if(feedback?.text){
      const note=make('aside',undefined,'teacher-feedback-note');
      note.append(make('strong','A THOUGHT FROM YOUR TEACHER'),
        make('p',feedback.text));
      stage.append(note);
    }
    if(!isHost)return;
    const details=make('details',undefined,'teacher-feedback-tools');
    details.open=feedbackOpen;
    details.addEventListener('toggle',()=>{feedbackOpen=details.open;});
    const summary=make('summary','Share a teaching point');details.append(summary);
    const pulse=room.questionPulse;
    if(pulse)details.append(make('p','Class check: '+pulse.correct+' of '+pulse.decisions+
      ' decisions correct from '+pulse.responses+' of '+pulse.players+' students.','teacher-feedback-pulse'));
    details.append(make('p','Feedback appears to everyone after reveal, never during answering. Choose a prompt or write a short mathematical reflection.','team-small-note'));
    const suggestions=make('div',undefined,'teacher-feedback-presets');
    for(const text of PRESETS[room.game||'which']){
      const choice=button(text,()=>void command('feedback-post',{text}),'teacher-feedback-choice');
      suggestions.append(choice);
    }
    details.append(suggestions);
    const label=make('label','Your own teaching point (up to 160 characters)');
    label.htmlFor='teacher-feedback-text';
    const input=make('textarea');input.id='teacher-feedback-text';
    input.rows=2;input.maxLength=160;input.value=draftFeedback;
    input.placeholder='e.g. Compare how a quota is selected with a stratified random sample.';
    input.addEventListener('input',()=>{draftFeedback=input.value;});
    const send=button('Share teaching point',()=>{
      if(!draftFeedback.trim())return;
      const message=draftFeedback;
      draftFeedback='';
      void command('feedback-post',{text:message});
    },'btn btn-quiet');
    send.id='teacher-feedback-send';
    details.append(label,input,send);
    stage.append(details);
  }
  function finished(room,stage){
    if(room.status!=='finished')return;
    if(room.classQuest)stage.append(make('p',room.classQuest.achieved?
      '✦ Collaborative Class Quest achieved: the class met its accuracy and participation goals.':
      'The Class Quest target was not reached this time. Discuss one adjustment to make next round.','team-finish-summary'));
    if(room.teams?.length)stage.append(make('p',
      room.objective==='class'?
        'The whole class shares one achievement; character awards still recognise checked mathematics without a competitive podium.':
      ['bullseye','perfect'].includes(room.objective)?
        'Team victory is credited to the first verified target-reaching student. Other teams retain their checked practice scores and mathematical awards.':
        'Individual awards still celebrate checked mathematical thinking. Team standings show average points per member.','team-finish-summary'));
  }
  return {setup,sidebar,review,finished};
}
