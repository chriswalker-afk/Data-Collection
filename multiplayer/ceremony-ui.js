// One projected ceremony step, supplied entirely by the Durable Object.
// No client-side winner selection, award inference or timer-driven auto-advances.
import {critterPortrait} from './avatar-ui.js';
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
  function personWithCritter(person,scale='medium'){
    const row=node('span',undefined,'ceremony-person-with-critter');
    row.append(critterPortrait(person.avatar,scale),node('strong',person.name));
    return row;
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
        item.dataset.place=String(group.rank);
        // The podium order stays silver/gold/bronze; the centre winner arrives first.
        item.style.setProperty('--reveal-delay',
          group.rank===1?'90ms':group.rank===2?'270ms':'420ms');
        item.append(node('span',medal.emoji,'ceremony-podium-emoji'),
          node('span',medal.label+' · '+(group.rows.length>1?'Joint ':'')+(group.rank===1?'1st':group.rank===2?'2nd':'3rd')+' place',
            'ceremony-podium-rank'));
        const names=node('div',undefined,'ceremony-podium-names');
        for(const person of group.rows)names.append(personWithCritter(person,'large'));
        if(group.rows.length>1)names.append(node('span',group.rows.length+' joint winners','ceremony-people-caption'));
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
    for(const [index,person] of slide.recipients.entries()){
      const li=node('li');
      li.style.setProperty('--reveal-delay',Math.min(index,10)*55+'ms');
      li.append(node('span','✦','ceremony-name-spark'),personWithCritter(person));
      names.append(li);
    }
    nameBox.append(names);container.append(detail,nameBox);
  }
  function classPhoto(players){
    // A non-ranked class photo: everyone is included, regardless of points.
    const section=node('section',undefined,'ceremony-class-photo');
    section.append(node('h3','Our classroom critters'),
      node('p',players.length+' players · Every mathematician belongs in the celebration.'));
    const list=node('ul',undefined,'ceremony-class-gallery');
    list.setAttribute('aria-label','All classroom critters, alphabetically by nickname');
    const alphabetical=[...players].sort((a,b)=>a.name.localeCompare(b.name,'en-GB'));
    for(const [index,person] of alphabetical.entries()){
      const item=node('li');
      item.style.setProperty('--reveal-delay',Math.min(index,10)*50+'ms');
      item.append(critterPortrait(person.avatar,'medium'),node('strong',person.name));
      list.append(item);
    }
    section.append(list);
    return section;
  }
  function render(room,isHost,stage){
    const c=room.ceremony;
    if(!c?.slide)return;
    const slide=c.slide;
    const outer=node('div',undefined,'ceremony-card is-'+slide.kind);
    outer.setAttribute('data-ceremony-step',String(c.step));
    outer.setAttribute('data-ceremony-run',String(c.run));
    outer.append(stageKicker((room.objective==='mosaic'?'OUR CLASS MOSAIC CELEBRATION':'THE GRAND AWARDS CEREMONY')+' · '+(c.step+1)+' / '+c.total));
    const steps=node('progress');steps.max=c.total;steps.value=c.step+1;
    steps.className='ceremony-progress';steps.setAttribute('aria-label','Ceremony reveal '+(c.step+1)+' of '+c.total);
    outer.append(steps);
    if(slide.kind==='welcome'){
      outer.append(node('div','✦   🏆   ✧','ceremony-welcome-icons'),h(slide.title),
        node('p',slide.subtitle,'ceremony-subtitle'),
        node('p','A little celebration for the careful thinkers, determined improvers and mathematical detectives in the room.','ceremony-context'));
    }else if(slide.kind==='team-podium'){
      outer.append(node('div','🤝','ceremony-top-icon'),h(slide.title));
      const board=node('div',undefined,'ceremony-team-podium');
      for(const team of slide.standings){
        const card=node('article');
        card.append(node('span',team.icon,'team-avatar'),
          node('strong',team.name,'team-name'));
        const teamMates=room.players.filter(person=>person.teamId===team.id);
        if(teamMates.length){
          const group=node('div',undefined,'ceremony-team-critters');
          group.setAttribute('aria-label',team.name+' team critters');
          for(const person of teamMates.slice(0,4))group.append(critterPortrait(person.avatar));
          if(teamMates.length>4)group.append(node('span','+'+(teamMates.length-4),'ceremony-more'));
          card.append(group);
        }
        card.append(
          node('span',room.objective==='class'?'Working together':
            team.rank?team.rank===1?'1st place':team.rank===2?'2nd place':
            team.rank===3?'3rd place':'4th place':'No positive points yet','team-rank'),
          node('strong',room.objective==='class'?
            team.correct+' correct decisions':' '+team.averageScore.toLocaleString('en-GB')+' average points','team-average'),
          node('span',team.members+' members · '+team.accuracy+'% checked accuracy','team-quest-label'),
          node('span',room.objective==='class'?'Contributing to our shared quest':
            team.questComplete?'✦ Team Quest achieved':'Team Quest not yet achieved','team-quest-label'));
        board.append(card);
      }
      outer.append(board,node('p',slide.subtitle,'ceremony-footnote'));
    }else if(slide.kind==='mosaic'){
      outer.append(node('div',slide.achieved?'✦   🎉   ✧':'✦   🤝   ✧','ceremony-welcome-icons'),
        h(slide.title),node('p',slide.subtitle,'ceremony-subtitle'));
      const count=slide.completedTiles+' / '+slide.targetTiles+' tiles completed';
      const coverage=slide.contributingTeams+' of '+slide.totalTeams+' teams contributed';
      outer.append(node('p',count+' · '+coverage,'ceremony-finale-count'));
      const grid=node('div',undefined,'mosaic-grid mosaic-ceremony-grid');
      grid.style.setProperty('--mosaic-columns',String(slide.targetTiles===6?3:5));
      grid.setAttribute('role','group');
      grid.setAttribute('aria-label',count);
      for(let i=0;i<slide.targetTiles;i++){
        const won=slide.tiles.find(tile=>tile.index===i);
        const el=node('span',won?'✦':'◇','mosaic-tile'+(won?' is-revealed':''));
        el.setAttribute('aria-label',won?'Tile '+(i+1)+' unlocked':'Tile '+(i+1)+' locked');
        if(won)el.dataset.teamId=won.teamId;
        grid.append(el);
      }
      outer.append(grid);
    }else if(slide.kind==='class-quest'){
      outer.append(node('div',slide.achieved?'✦   🎉   ✧':'✦   🤝   ✧','ceremony-welcome-icons'),
        h(slide.title));
      if(slide.metric){
        const goalText=slide.metric==='accuracy'?
          'Mean student accuracy: '+slide.accuracy+'% / '+slide.target.accuracy+'%':
          slide.metric==='correct'?
            'Credited correct decisions: '+slide.creditedCorrect+' / '+slide.target.correct:
          slide.metric==='mastery'?
            'Sampling methods mastered: '+slide.methods.filter(m=>m.contributors>=m.needed).length+' of 5':
            'Students meeting personal goal: '+slide.everyoneMet+' / '+slide.needed;
        outer.append(node('p',goalText,'ceremony-subtitle'),
          node('p','Meaningful participation: '+slide.contributors+' of '+slide.totalStudents+
            ' students, '+slide.coverage+'%.','ceremony-finale-count'));
        if(slide.metric==='mastery'){
          const grid=node('ul',undefined,'quest-ceremony-methods');
          for(const method of slide.methods){
            grid.append(node('li',method.label+': '+method.contributors+
              ' / '+method.needed+' students'));
          }
          outer.append(grid);
        }
      }else{
        outer.append(node('p',slide.accuracy+'% checked accuracy · '+slide.coverage+
          '% class participation','ceremony-subtitle'),
          node('p','Goal: '+slide.target+'% accuracy and 75% participation','ceremony-finale-count'));
      }
      outer.append(node('p',slide.subtitle,'ceremony-footnote'));
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
      if(room.players?.length)outer.append(classPhoto(room.players));
    }
    stage.append(outer);
    if(isHost)controls(c,stage);
    else stage.append(node('p',room.objective==='mosaic'?
      'Your teacher reveals each stage of the shared class celebration. All contributions count.':
      c.step===c.total-1?
      'You can view earned Multiplayer keepsakes in My Awards after the teacher completes the ceremony.':
      'Your teacher controls each reveal. Enjoy the celebration together.','ceremony-student-note'));
  }
  return {render};
}
