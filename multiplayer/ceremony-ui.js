// One projected ceremony step, supplied entirely by the Durable Object.
// No client-side winner selection, award inference or timer-driven auto-advances.
const MEDALS={1:{label:'Gold',emoji:'🥇',tone:'gold'},
  2:{label:'Silver',emoji:'🥈',tone:'silver'},3:{label:'Bronze',emoji:'🥉',tone:'bronze'}};
export function createCeremonyUI({make,button,actionRow,command,stageKicker}){
  const node=(tag,text,cls)=>make(tag,text,cls);
  const h=(text,cls='ceremony-title')=>{
    const heading=node('h2',text,cls);heading.tabIndex=-1;return heading;
  };
  function controls(c,stage){
    const actions=actionRow();actions.classList.add('ceremony-controls');
    const back=button('Previous reveal',()=>void command('ceremony-prev'), 'btn btn-quiet');
    back.disabled=c.step===0;
    const next=button(c.step===c.total-1?'Finish ceremony':'Next reveal',
      ()=>void command(c.step===c.total-1?'ceremony-end':'ceremony-next'));
    next.id='ceremony-next';
    const skip=button('Skip to finale',()=>void command('ceremony-finale'),'btn btn-quiet');
    skip.disabled=c.step===c.total-1;
    actions.append(back,next,skip);
    stage.append(actions);
    stage.append(node('p','Teacher controls: all connected devices see the same reveal. You can go back or skip ahead.','ceremony-control-note'));
  }
  function podium(slide,container){
    const stand=node('ol',undefined,'ceremony-podium');
    stand.setAttribute('aria-label','Classroom top scores');
    const groups=[1,2,3].map(rank=>({rank,rows:slide.standings.filter(x=>x.rank===rank)}))
      .filter(g=>g.rows.length);
    if(!groups.length){
      container.append(node('p','No positive scores to rank this time. Try another round to make the podium.','ceremony-empty'));
    }else{
      for(const group of groups){
        const medal=MEDALS[group.rank],item=node('li',undefined,'ceremony-podium-step is-'+medal.tone);
        item.append(node('span',medal.emoji,'ceremony-podium-emoji'),
          node('span',medal.label+' · '+(group.rows.length>1?'Joint ':'')+(group.rank===1?'1st':group.rank===2?'2nd':'3rd')+' place',
            'ceremony-podium-rank'));
        const names=node('div',undefined,'ceremony-podium-names');
        for(const person of group.rows)names.append(node('strong',person.name));
        item.append(names,node('span',group.rows[0].score.toLocaleString('en-GB')+' points','ceremony-podium-score'));
        stand.append(item);
      }
      container.append(stand);
    }
    container.append(node('p',slide.subtitle,'ceremony-footnote'));
  }
  function recipients(slide,container){
    const detail=node('p',slide.award.detail,'ceremony-award-detail');
    const nameBox=node('div',undefined,'ceremony-recipients');
    nameBox.append(node('span',slide.recipients.length===1?'Awarded to':'Awarded to '+slide.recipients.length+' mathematicians',
      'ceremony-recipients-kicker'));
    const names=node('ul');
    for(const person of slide.recipients){
      const li=node('li');li.append(node('span','✦','ceremony-name-spark'),node('strong',person.name));names.append(li);
    }
    nameBox.append(names);container.append(detail,nameBox);
  }
  function render(room,isHost,stage){
    const c=room.ceremony;
    if(!c?.slide)return;
    const slide=c.slide;
    const outer=node('div',undefined,'ceremony-card is-'+slide.kind);
    outer.setAttribute('data-ceremony-step',String(c.step));
    outer.setAttribute('data-ceremony-run',String(c.run));
    outer.append(stageKicker('THE GRAND AWARDS CEREMONY · '+(c.step+1)+' / '+c.total));
    const steps=node('progress');steps.max=c.total;steps.value=c.step+1;
    steps.className='ceremony-progress';steps.setAttribute('aria-label','Ceremony reveal '+(c.step+1)+' of '+c.total);
    outer.append(steps);
    if(slide.kind==='welcome'){
      outer.append(node('div','✦   🏆   ✧','ceremony-welcome-icons'),h(slide.title),
        node('p',slide.subtitle,'ceremony-subtitle'),
        node('p','A little celebration for the careful thinkers, determined improvers and mathematical detectives in the room.','ceremony-context'));
    }else if(slide.kind==='podium'){
      outer.append(node('div','🏆','ceremony-top-icon'),h(slide.title));
      podium(slide,outer);
    }else if(slide.kind==='award'){
      const portrait=node('div',slide.award.emoji,'ceremony-award-portrait');
      portrait.setAttribute('aria-hidden','true');
      outer.append(node('p','MATHEMATICAL ACHIEVEMENT UNLOCKED','ceremony-award-kicker'),portrait,
        h(slide.title));
      recipients(slide,outer);
    }else if(slide.kind==='finale'){
      outer.append(node('div','✦   🎉   ✧','ceremony-welcome-icons'),h(slide.title),
        node('p',slide.subtitle,'ceremony-subtitle'),
        node('p',slide.awardedCount+' different character award'+(slide.awardedCount===1?'':'s')+
          ' celebrated · '+slide.recipientsCount+' student'+(slide.recipientsCount===1?'':'s')+
          ' earned a special achievement','ceremony-finale-count'));
    }
    stage.append(outer);
    if(isHost)controls(c,stage);
    else stage.append(node('p',c.step===c.total-1?
      'You can view earned Multiplayer keepsakes in My Awards after the teacher completes the ceremony.':
      'Your teacher controls each reveal. Enjoy the celebration together.','ceremony-student-note'));
  }
  return {render};
}
