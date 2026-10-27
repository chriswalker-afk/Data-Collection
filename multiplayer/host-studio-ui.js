import {
  STUDIO_STORAGE_KEY, DEFAULT_DRAFT, OBJECTIVES, FORMATS, GAMES, CLASS_METRICS,
  cleanStudioDraft, presetStudioDraft, validateStudioDraft, legacyRoomSettings, describeStudioDraft
} from './host-studio.js';

// Host Studio is a real draft/configurator, not a substitute for a game engine.
// Only validated classic individual/squad settings can create Worker rooms.
const MODE_DESCRIPTIONS={
  which:'Five sampling methods are balanced across the challenge. 20 seconds per question.',
  speed:'Type the mathematical term without a word bank. 25 seconds per definition.',
  match:'Connect six term–definition pairs per board. 75 seconds per board.',
  sort:'Sort 8–12 statements into four destinations. 90 seconds per board.'
};
const numericFields={
  'studio-team-count':'teamCount','studio-goal-target':'goalTarget',
  'studio-minutes':'minutes','studio-accuracy-target':'accuracyTarget',
  'studio-accuracy-window':'accuracyWindow','studio-streak-target':'streakTarget',
  'studio-class-accuracy':'classAccuracy','studio-class-correct':'classCorrect',
  'studio-class-participation':'classParticipation','studio-class-per-student':'classPerStudent'
};
const stringFields={
  'studio-class-metric':'classMetric','studio-difficulty':'difficulty',
  'studio-question-order':'questionOrder'
};
export function createHostStudio(root) {
  if(!root)throw new Error('Missing Host Studio element');
  const find=id=>root.querySelector('#'+id);
  let draft={...DEFAULT_DRAFT};
  try{draft=cleanStudioDraft(JSON.parse(sessionStorage.getItem(STUDIO_STORAGE_KEY)));}
  catch{draft={...DEFAULT_DRAFT};}
  const create=find('create');
  function persist(){
    if(validateStudioDraft(draft).valid) {
      try{sessionStorage.setItem(STUDIO_STORAGE_KEY,JSON.stringify(draft));}
      catch{/* Private browsing may deny storage; the studio still works. */}
    }
  }
  function updateLengthPicker(){
    const game=GAMES[draft.game]||GAMES.which;
    const picker=find('length');
    const previous=picker.value;
    picker.replaceChildren();
    for(const [i,length] of game.lengths.entries()){
      const option=document.createElement('option');
      option.value=String(length);
      option.textContent=length+' '+game.unit+
        (i===0?' · Quick starter':i===game.lengths.length-1?' · Extended':' · Class challenge');
      picker.append(option);
    }
    if(!game.lengths.includes(draft.length)){
      draft.length=game.lengths[Math.min(['quick','balanced','stretch'].indexOf(draft.preset),game.lengths.length-1)];
    }
    picker.value=String(draft.length);
    find('mode-description').textContent=MODE_DESCRIPTIONS[draft.game];
  }
  function show(id,visible){find(id).hidden=!visible;}
  function render(){
    for(const radio of root.querySelectorAll('[name="studio-objective"]')){
      radio.checked=radio.value===draft.objective;
      radio.closest('.studio-choice')?.classList.toggle('is-selected',radio.checked);
    }
    for(const radio of root.querySelectorAll('[name="studio-format"]')){
      radio.checked=radio.value===draft.format;
      radio.closest('.studio-choice')?.classList.toggle('is-selected',radio.checked);
    }
    for(const choice of root.querySelectorAll('[data-studio-preset]')){
      const selected=choice.dataset.studioPreset===draft.preset;
      choice.setAttribute('aria-pressed',String(selected));
      choice.classList.toggle('is-selected',selected);
    }
    find('game-mode').value=draft.game;
    updateLengthPicker();
    show('studio-length-row',draft.objective==='classic');
    show('studio-class-goal-row',draft.objective==='classic');
    show('studio-team-count-row',draft.format==='squad'||draft.format==='relay');
    show('studio-future-settings',draft.objective!=='classic');
    show('studio-minutes-row',draft.objective==='blitz');
    show('studio-accuracy-target-row',draft.objective==='bullseye');
    show('studio-accuracy-window-row',draft.objective==='bullseye');
    show('studio-streak-target-row',draft.objective==='perfect');
    show('studio-class-metric-row',draft.objective==='class');
    show('studio-participation-row',draft.objective==='class');
    show('studio-class-accuracy-row',draft.objective==='class'&&draft.classMetric==='accuracy');
    show('studio-class-correct-row',draft.objective==='class'&&draft.classMetric==='correct');
    show('studio-class-per-student-row',draft.objective==='class'&&draft.classMetric==='everyone');
    show('studio-class-mastery-row',draft.objective==='class'&&draft.classMetric==='mastery');
    for(const [id,key] of Object.entries(numericFields))find(id).value=String(draft[key]);
    for(const [id,key] of Object.entries(stringFields))find(id).value=draft[key];
    find('studio-leaderboard').checked=draft.showLeaderboard;
    find('studio-advanced-live-note').hidden=draft.objective!=='classic';
    find('studio-advanced-future-fields').hidden=draft.objective==='classic';
    renderPreview();
  }
  function renderPreview(){
    const snapshot=describeStudioDraft(draft);
    const validation=validateStudioDraft(draft);
    find('studio-preview-title').textContent=snapshot.title;
    find('studio-preview-detail').textContent=snapshot.description;
    find('studio-preview-availability').textContent=snapshot.availability;
    find('studio-preview-availability').classList.toggle('is-ready',snapshot.playable);
    const message=validation.errors.length?validation.errors[0]:'';
    find('studio-validation').textContent=message;
    find('studio-validation').hidden=!message;
    create.disabled=!validation.playable;
    create.textContent=validation.playable?'Create room ↗':'Preview only · Not yet playable';
    find('studio-preview').dataset.availability=validation.playable?'live':'preview';
  }
  root.addEventListener('change',event=>{
    const field=event.target;
    if(field.name==='studio-objective'&&Object.hasOwn(OBJECTIVES,field.value)){
      draft=presetStudioDraft(draft,draft.preset,field.value);
    }else if(field.name==='studio-format'&&Object.hasOwn(FORMATS,field.value)){
      draft.format=field.value;
    }else if(field.id==='game-mode'&&Object.hasOwn(GAMES,field.value)){
      draft.game=field.value;
      draft.length=GAMES[field.value].lengths[Math.min(
        ['quick','balanced','stretch'].indexOf(draft.preset),GAMES[field.value].lengths.length-1)];
    }else if(field.id==='length'){
      draft.length=Number(field.value);
    }else if(Object.hasOwn(numericFields,field.id)){
      draft[numericFields[field.id]]=field.value===''?NaN:Number(field.value);
    }else if(Object.hasOwn(stringFields,field.id)){
      draft[stringFields[field.id]]=field.value;
    }else if(field.id==='studio-leaderboard'){
      draft.showLeaderboard=field.checked;
    }else{return;}
    render();persist();
  });
  root.addEventListener('input',event=>{
    if(Object.hasOwn(numericFields,event.target.id)){
      draft[numericFields[event.target.id]]=event.target.value===''?NaN:Number(event.target.value);
      renderPreview();
      // 'input' is the only guaranteed event before immediate refresh; saving
      // valid drafts here preserves the teacher's last numerical edit.
      persist();
    }
  });
  for(const preset of root.querySelectorAll('[data-studio-preset]')){
    preset.addEventListener('click',()=>{
      draft=presetStudioDraft(draft,preset.dataset.studioPreset);
      render();persist();
    });
  }
  render();
  return {
    draft:()=>({...draft}),
    liveSettings:()=>legacyRoomSettings(draft)
  };
}
