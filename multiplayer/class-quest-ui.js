// Cooperative Class Quest progress, derived entirely from the authenticated
// Worker snapshot. No answer keys or individual scores are ever rendered.
const METRICS={
  accuracy:{title:'Accuracy Quest',icon:'◎'},
  correct:{title:'Knowledge Quest',icon:'✳'},
  mastery:{title:'Mastery Quest',icon:'◇'},
  everyone:{title:'Everyone Counts',icon:'🤝'}
};
const node=(tag,cls,text)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(text!==undefined)el.textContent=text;
  return el;
};
function track(label,current,required){
  const section=node('div','quest-track');
  const head=node('div','quest-track-heading');
  head.append(node('strong','',label),
    node('span','',current+' / '+required));
  const bar=node('progress','quest-track-bar');
  bar.max=Math.max(1,required);bar.value=Math.min(required,Math.max(0,current));
  bar.setAttribute('aria-label',label+': '+current+' of '+required);
  section.append(head,bar);
  return section;
}
export function createClassQuestUI(){
  function render(room,stage){
    const q=room.quest;if(!q)return;
    const info=METRICS[q.metric];
    const section=node('section','quest-shared-panel');
    section.id='quest-shared-panel';
    section.setAttribute('aria-label','Shared Class Quest progress');
    const top=node('div','quest-shared-header');
    top.append(node('span','quest-symbol',info.icon),
      node('div','quest-shared-heading'));
    top.lastChild.append(node('span','quest-kicker','OUR SHARED CLASS CHALLENGE'),
      node('h2','',info.title));
    section.append(top);
    const summary={
      accuracy:'Raise the average accuracy of everyone who has answered.',
      correct:'Work together to collect credited mathematical decisions.',
      mastery:'Build correct evidence for all five sampling methods.',
      everyone:'Help classmates complete their personal accuracy challenges.'
    }[q.metric];
    section.append(node('p','quest-intro',summary));
    const progress=node('div','quest-progress-layout');
    progress.append(track('Students contributing',q.contributors,q.needed));
    if(q.metric==='accuracy'){
      progress.append(track('Mean student accuracy (%)',q.accuracy,q.target.accuracy));
      progress.append(node('p','quest-evidence-note',
        'Every participating student has equal weight in the class accuracy. A student needs two checked tasks to count as a contributor.'));
    }else if(q.metric==='correct'){
      progress.append(track('Credited correct decisions',q.creditedCorrect,q.target.correct));
      progress.append(node('p','quest-evidence-note',
        'Each student can contribute at most '+q.maxCorrectCredit+
        ' correct decisions, so no one person can complete the target for everybody.'));
    }else if(q.metric==='mastery'){
      const grid=node('div','quest-mastery-grid');
      grid.setAttribute('aria-label','Five sampling methods, each needing two distinct contributors');
      for(const method of q.methods){
        const item=node('div','quest-method'+(method.contributors>=method.needed?' is-mastered':''));
        item.append(node('strong','',method.label),
          node('span','',Math.min(method.contributors,method.needed)+' / '+method.needed+' students'));
        grid.append(item);
      }
      progress.append(grid);
      progress.append(node('p','quest-evidence-note',
        'Each method needs correct evidence from two different students. A partially correct Match Up or Sort It! board can still contribute correct individual method decisions.'));
    }else{
      progress.append(track('Students meeting personal target',q.everyoneMet,q.needed));
      progress.append(node('p','quest-evidence-note',
        'Each qualifying student must complete '+q.target.perStudent+
        ' fully correct task'+(q.target.perStudent===1?'':'s')+
        ', as well as at least '+q.minTasks+' checked tasks.'));
    }
    section.append(progress);
    const footer=node('p','quest-status');
    footer.setAttribute('role','status');
    if(q.achieved){
      footer.classList.add('is-achieved');
      footer.textContent='✦ Class Quest achieved! The whole class has earned the shared celebration.';
    }else if(room.status==='finished'||room.status==='ceremony'){
      footer.textContent='This quest finished before the shared goal was met. The class still earned its checked mathematical progress.';
    }else if(q.ready){
      footer.textContent='Participation threshold reached. Keep building the mathematical target together.';
    }else{
      footer.textContent='Everyone matters. At least '+q.needed+' of the original '+
        q.totalStudents+' students must complete two checked tasks.';
    }
    section.append(footer);stage.append(section);
  }
  return {render};
}
