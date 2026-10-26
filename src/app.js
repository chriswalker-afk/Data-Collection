import {
  TOPICS, GAMES, ACTIVITY_STAGES, topicLabel, conceptsInTopic, clozeInTopic,
  makeMatchRound, shuffled, splitCloze, clozeCorrect, routeFromHash, hashFor, isSamplingOnlyGame
} from './core.js';
import {
  emptyProgress, loadProgress, saveProgress, clearProgress,
  recordAnswer, recordPractice, recordSession, progressForTopic
} from './progress.js';
import {
  METHOD_ORDER, METHOD_LABELS, ROUND_LENGTHS,
  categoryLabel, conceptIdForSubject, makeScenarioRound
 } from './phase2.js';
import {
  CLOZE_LEVELS, SPEED_MODES, SPEED_DURATIONS, gradeCloze, gradeTerm,
  speedDeck, formatClock, validateTermBank
} from './recall.js';
import {EXAM_LEVELS,ERROR_ROUND_LENGTHS,REASON_ROUND_LENGTHS,procedureRound,checkProcedure,moveStep,makeErrorDeck,gradeErrorDiagnosis,validateErrorBank,makeReasoningDeck} from './exam.js';
import {createReasonRound,validateReasonBank} from './reasoning.js';
import {createReasoningUI} from './reasoning-ui.js';
import {emptyExamStore,loadExamStore,saveExamStore,clearExamStore} from './exam-sim.js';
import {createExamSimulationUI} from './exam-sim-ui.js';
import {createExperienceUI} from './experience-ui.js';
import {nextAfterRound} from './journey.js';
import {guideForActivity} from './activity-guidance.js';
import {completionHeading,completionCreditNote} from './quality.js';
import {makeFlashDeck,flashFaces,makeFlashSession,rateFlashSession,skipFlashSession,makeFlashReviewSession,flashCardLabel} from './flashcards.js';
import {chooseMatch,matchNextStep,matchStatus,matchAttemptCredit,MATCH_MOTION_MS} from './match-up.js';
import {clozePresentation} from './cloze-ui.js';
import {makePairSortRound,validatePairBank} from './sort-it.js';
import {createSortItUI} from './sort-ui.js';
import {speedClockPercent,speedRoundSummary,speedReviewDeck,SPEED_CAUTION_MS} from './speed-ui.js';
import {AWARDS,earnedAwards,loadAwards,saveAwards,applyAwardEvent} from './awards.js';
import {showAwardUnlock} from './award-toast.js';

const mount = document.getElementById('app');
const announcer = document.getElementById('announcer');
let data = null;
let progress = loadProgress();
let awardLedger = loadAwards();
let examStore = emptyExamStore();
let persistenceAvailable = true;
let topic = 'sampling';
let mode = 'home';
let session = null;
let flashBrowseOpen = false;
let sortRoundId = 'pair-srs-stratified';
let scenarioLength = 10;
let clozeLevel = 'choices';
let speedMode = 'untimed';
let speedDuration = 60;
let buildMethodId='simple-random';
let examLevel='foundation';
let errorRoundLength=5;
let reasonRoundLength=3;
let clockHandle = null;
let matchSettleTimer = null;
let progressJumpPending = false;
const headerNav=document.getElementById('main-nav');
const mobileMenuToggle=document.getElementById('mobile-menu-toggle');
const activitiesMenu=document.getElementById('activities-menu');
function closeHeaderMenus(){
  activitiesMenu.open=false;
  headerNav.classList.remove('is-open');
  mobileMenuToggle.setAttribute('aria-expanded','false');
}
const desktopMenuQuery=window.matchMedia('(max-width: 760px)');
desktopMenuQuery.addEventListener('change',closeHeaderMenus);
function focusProgressPanel(){
  const target=mount.querySelector('#progress-title');
  if(!target)return;
  target.scrollIntoView({block:'start',behavior:'auto'});
  target.focus({preventScroll:true});
}

function element(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (value === null || value === undefined || (value === false && !key.startsWith('aria-'))) continue;
    if (key === 'className') node.className = value;
    else if (key === 'textContent') node.textContent = String(value);
    else node.setAttribute(key, value === true && !key.startsWith('aria-') ? '' : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}
function div(cls, ...children) { return element('div', { className: cls }, ...children); }
function span(cls, ...children) { return element('span', { className: cls }, ...children); }
function paragraph(cls, text) { return element('p', { className: cls }, text); }
function heading(level, cls, text, attributes = {}) { return element('h' + level, { className: cls, ...attributes }, text); }
function action(label, actionName, attrs = {}, cls = 'btn btn-primary') {
  return element('button', { type: 'button', className: cls, 'data-action': actionName, ...attrs }, label);
}
function link(label, destination, cls) { return element('a', { href: destination, className: cls }, label); }
function icon(mark, cls = 'icon-mark') { return element('span', { className: cls, 'aria-hidden': 'true' }, mark); }
function announce(message) { announcer.textContent = ''; requestAnimationFrame(() => { announcer.textContent = message; }); }
function countFor(item) {
  return item === 'all' ? data.concepts.length : data.concepts.filter(c => c.module === item).length;
}
function navSync() {
  for (const anchor of document.querySelectorAll('[data-nav]')) {
    const destination = anchor.getAttribute('data-nav');
    anchor.href = hashFor(destination, topic);
    if (destination === mode) anchor.setAttribute('aria-current', 'page');
    else anchor.removeAttribute('aria-current');
  }
  const progressLink=document.querySelector('[data-progress-nav]');
  if(progressLink)progressLink.href=hashFor('home',topic);
  activitiesMenu.classList.toggle('is-current',mode!=='home'&&mode!=='exam');
  document.title = (mode === 'home' ? 'Sampling Arcade' : GAMES.find(g => g.id === mode).title + ' · Sampling Arcade') + ' · A Level Maths';
}
function topicPicker() {
  const wrap = div('topic-picker');
  wrap.append(element('p', { className: 'eyebrow topic-eyebrow', id: 'topic-picker-label' }, 'Choose your topic'));
  const choices = div('topic-choices');
  for (const option of TOPICS) {
    const selected = option.id === topic;
    const pill = action(option.label, 'topic', {
      'data-topic': option.id,
      'aria-pressed': selected
    }, 'topic-option' + (selected ? ' selected' : ''));
    pill.append(span('topic-count', String(countFor(option.id))));
    choices.append(pill);
  }
  wrap.append(choices);
  return wrap;
}
function metaBar() {
  const stats = progressForTopic(progress, data.concepts, topic);
  const fraction = stats.total ? Math.round((100 * stats.mastered) / stats.total) : 0;
  return div('mastery-wrap',
    div('mastery-head',
      span('small-caps', 'Knowledge progress'),
      span('mastery-label', stats.mastered + ' / ' + stats.total + ' mastered')
    ),
    element('progress', { value: stats.mastered, max: stats.total || 1, 'aria-label': topicLabel(topic) + ' concepts mastered' }),
    div('mastery-foot',
      span('', stats.practiced + ' concepts practised'),
      span('', fraction + '% mastered')
    )
  );
}
function gameCard(game) {
  const symbol = { flashcards: '▧', match: '⇄', cloze: '✎', sort: '↕', identify: '?', speed: '⌨', build: '≡', error: '!', reason: '◇', exam: '✦' }[game.id];
  const card = link('', hashFor(game.id, topic), 'game-card');
  card.dataset.gameId=game.id;
  card.append(
    div('game-card-top', span('game-number', game.number + ' / REVISE'), icon(symbol, 'game-icon')),
    heading(4, 'game-card-title', game.title),
    paragraph('game-card-description', game.description),
    div('game-card-foot', span('', (isSamplingOnlyGame(game.id) ? 'Sampling only · ' : '') + game.subtitle), icon('↗'))
  );
  return card;
}
const experience=createExperienceUI({element,div,span,paragraph,heading,action,link,announce,render,
  getState:()=>({progress,data,topic,examStore,mode})
});
function activityStagesView(){
  const stages=div('activity-stages');
  for(const stage of ACTIVITY_STAGES){
    const items=stage.games.map(id=>GAMES.find(g=>g.id===id));
    const section=element('section',{
      className:'activity-stage activity-stage-'+stage.id,
      'aria-labelledby':'stage-'+stage.id+'-title'
    });
    const details=div('activity-stage-label',
      span('stage-number','STAGE '+stage.number),
      heading(3,'stage-title',stage.title,{id:'stage-'+stage.id+'-title'}),
      paragraph('stage-description',stage.subtitle));
    const scope=span('stage-scope',stage.id==='recall'?'Sampling & types of data':
      'Sampling methods'+(topic==='data'||topic==='all'?' · switches to Sampling':''));
    section.append(div('activity-stage-heading',details,scope),
      div('games-grid',items.map(gameCard)));
    stages.append(section);
  }
  return stages;
}
function arcadePathsView(){
  const section=element('section',{className:'arcade-paths','aria-labelledby':'arcade-path-title'});
  section.append(div('arcade-paths-head',
    div('',span('arcade-paths-kicker','YOUR ARCADE · YOUR WAY'),
      heading(2,'arcade-paths-title','Choose how you want to play',{id:'arcade-path-title'})),
    paragraph('arcade-paths-note','Independent study or a live class challenge. Your revision is always your choice.')));
  const cards=div('arcade-path-grid');
  const solo=action('Browse solo games','browse-solo',{},'arcade-path-card is-solo');
  solo.replaceChildren(icon('▤','arcade-path-icon'),span('arcade-path-spark','01 / SOLO'),
    span('arcade-path-name','Solo Arcade'),span('arcade-path-desc','Ten focused activities, your own pace and progress saved in this browser.'),
    span('arcade-path-foot','Browse all 10 games ↘'));
  const multi=link('', './multiplayer.html','arcade-path-card is-multi');
  multi.append(icon('⇄','arcade-path-icon'),span('arcade-path-spark','02 / LIVE'),
    span('arcade-path-name','Multiplayer Arena'),span('arcade-path-desc','Join a teacher-led sampling showdown with a six-digit room code.'),
    span('arcade-path-foot','Create or join a room ↗'));
  const awards=link('','./awards.html','arcade-path-card is-awards');
  awards.append(icon('✦','arcade-path-icon'),span('arcade-path-spark','03 / COLLECT'),
    span('arcade-path-name','My Awards'),span('arcade-path-desc','Collect 16 quirky mathematical achievements across your independent revision.'),
    span('arcade-path-foot',earnedAwards(awardLedger).length+' / '+AWARDS.length+' collected · Open cabinet ↗'));
  cards.append(solo,multi,awards);section.append(cards);
  return section;
}

function homeView() {
  const root = div('page page-home');
  const hero = element('section', { className: 'hero' });
  const copy = div('hero-content',
    span('kicker', 'YEAR 12 / STATISTICS / EDEXCEL 9MA0'),
    heading(1, 'hero-title', 'Learn the language.', {id:'home-heading',tabindex:'-1'}),
    heading(2, 'hero-subtitle', 'Understand the method.'),
    paragraph('hero-description', 'Short, focused revision for sampling and types of data. Start with recall, then choose, explain and tackle exam questions.'),
    div('hero-actions',
      link('Start flashcards ' + '↗', hashFor('flashcards', topic), 'btn btn-primary hero-button'),
      link('Go to Exam Lab', hashFor('exam', topic), 'btn btn-quiet hero-button'),
      link('Multiplayer showdown', './multiplayer.html', 'btn btn-quiet hero-button')
    )
  );
  const art = div('hero-art');
  art.setAttribute('aria-hidden', 'true');
  art.append(
    div('art-circle circle-one'),
    div('art-circle circle-two'),
    div('art-dash dash-one'),
    div('art-dash dash-two'),
    div('floating-card art-back', span('art-label', 'SAMPLING'), span('art-sentence', 'Every possible sample...')),
    div('floating-card art-front', span('art-label', 'KEY IDEA 01'), span('art-word', 'Population'), span('art-rule', ''), span('art-sentence', 'The entire set of interest.'))
  );
  hero.append(copy, art);
  root.append(hero,arcadePathsView());
  const topicSection = element('section', { className: 'section section-topic', 'aria-labelledby': 'topic-title' });
  topicSection.append(
    div('section-top', div('', span('eyebrow', 'MAKE IT YOURS'), heading(2, 'section-title', 'What are you revising?', { id: 'topic-title' })),
      paragraph('section-note', 'Four recall games support both topics; the other six challenges focus on sampling.')),
    topicPicker()
  );
  root.append(topicSection,experience.journeyView());
  const gameSection = element('section', { className: 'section games-section', 'aria-labelledby': 'games-title' });
  gameSection.append(
    div('section-top', div('', span('eyebrow', 'TEN WAYS TO LEARN'), heading(2, 'section-title', 'Choose a challenge', { id: 'games-title', tabindex: '-1' })),
      paragraph('section-note', 'Build from accurate recall to full exam-style reasoning.')),
    activityStagesView()
  );
  root.append(gameSection);
  const bottom = div('bottom-grid');
  const stats = progressForTopic(progress, data.concepts, topic);
  const progressCard = element('section', { className: 'panel progress-panel', 'aria-labelledby': 'progress-title' });
  progressCard.append(
    span('eyebrow', 'YOUR REVISION'),
    heading(2, 'panel-title', 'Progress at a glance', { id: 'progress-title', tabindex: '-1' }),
    metaBar(),
    paragraph('mastery-explainer', 'This is a revision indicator, not an exam grade: mastery requires two consecutive credited checks. “Know it” on flashcards is self-rated. Ungraded writing is practice, never a failed answer.'),
    div('summary-numbers',
      div('', heading(3, 'stat-number', String(stats.answers)), paragraph('stat-label', 'Practice responses')),
      div('', heading(3, 'stat-number', String(stats.sessions)), paragraph('stat-label', 'Rounds completed'))
    ),
    action('Reset my progress', 'reset', {}, 'text-button')
  );
  const examCard = element('aside', { className: 'panel exam-panel', 'aria-labelledby': 'exam-title' });
  examCard.append(
    span('eyebrow', 'EXAM LANGUAGE MATTERS'),
    heading(2, 'panel-title', 'A detail worth remembering', { id: 'exam-title' }),
    paragraph('exam-quote', '“Ignore repeats”'),
    paragraph('exam-description', 'For a simple random sample selected using a random-number generator, choose different valid numbers until you have the required sample size. Ignore repeated numbers.'),
    paragraph('exam-caveat', 'If random digits can generate out-of-range values, ignore those too. This is unnecessary for a generator already restricted to the valid range.')
  );
  bottom.append(progressCard, examCard);
  root.append(bottom,experience.feedbackView());
  if (!persistenceAvailable) root.append(paragraph('storage-notice', 'Local storage is unavailable. You can still play, but your progress may not remain after closing this page.'));
  return root;
}

function practiceGuide(id,options={}){
  const guide=guideForActivity(id,options);
  return element('section',{className:'practice-guide','aria-label':'Practice instructions'},
    div('practice-guide-part',
      span('practice-guide-label','PRACTISING'),
      paragraph('practice-guide-copy',guide.practice)),
    div('practice-guide-part',
      span('practice-guide-label','WHAT TO DO'),
      paragraph('practice-guide-copy',guide.task)));
}
// These states distinguish checked answers from written work requiring human judgement.
function feedbackBanner(status,title,body=[],extraClass=''){
  const kind=['correct','incorrect','review','assisted'].includes(status)?status:'review';
  const badge=kind==='assisted'?'Checked with a hint':kind==='correct'?'Checked answer':kind==='incorrect'?'Review answer':'Self-review';
  const feedback=div('inline-feedback typed-feedback ui-feedback '+kind+(extraClass?' '+extraClass:''),
    icon(kind==='correct'?'✓':kind==='assisted'?'↗':kind==='incorrect'?'!':'i'),
    div('ui-feedback-body',
      span('ui-feedback-badge',badge),
      heading(3,'feedback-heading',title),
      ...body));
  feedback.setAttribute('tabindex','-1');
  feedback.setAttribute('role','group');
  feedback.setAttribute('aria-label',badge);
  return feedback;
}
function activityTop(game) {
  const meta = GAMES.find(item => item.id === game);
  const root = div('activity-top',
    link('← Back to arcade', hashFor('home', topic), 'back-link'),
    div('activity-intro',
      div('',
        span('eyebrow', 'CHALLENGE ' + meta.number),
        heading(1, 'activity-title', meta.title, { id: 'view-heading', tabindex: '-1' }),
        paragraph('activity-description', meta.description)
      ),
      div('activity-topic', topicLabel(topic))
    ),
    isSamplingOnlyGame(game)
      ? div('activity-scope', 'Sampling methods only · Flashcards, Match Up, Missing Words and Speed Recall also cover types of data.')
      : topicPicker()
  );
  return root;
}
function roundProgress(current, total, label) {
  return div('round-progress',
    div('round-head', span('round-caption', label), span('round-caption', current + ' / ' + total)),
    element('progress', { value: current, max: total || 1, 'aria-label': label })
  );
}
function speedCompletionPanel(){
  const stats=speedRoundSummary(session);
  return div('speed-summary',
    div('speed-summary-stats',
      div('speed-summary-stat',span('speed-summary-number',stats.accuracyLabel),span('speed-summary-label','Correct of submitted')),
      div('speed-summary-stat',span('speed-summary-number',String(stats.attempted)),span('speed-summary-label','Submitted')),
      div('speed-summary-stat',span('speed-summary-number',String(stats.skipped)),span('speed-summary-label','Skipped'))
    ),
    paragraph('speed-summary-explainer','Accuracy is based on submitted answers, not an examination grade.'),
    paragraph('speed-summary-next',stats.takeaway),
    ...(stats.reviewCount?[action('Review '+stats.reviewCount+' tricky term'+
      (stats.reviewCount===1?'':'s')+' →','speed-review',{},'btn btn-primary speed-review-button')]:[])
  );
}
function showCompletion(game) {
  const next=nextAfterRound(game,topic);
  const gameTitle = GAMES.find(g => g.id === game).title;
  const scoreLine = game === 'speed'
    ? session.correct + ' correct of ' + session.attempted + ' submitted · ' +
      (session.speedMode === 'timed' ? speedDuration + '-second challenge' : 'untimed practice') +
      (session.finishedReason === 'time' ? ' · Time is up' : '')
    : game === 'flashcards' ? session.correct + ' confident recalls out of ' + session.items.length + ' cards'
    : game === 'match' ? 'All ' + session.terms.length + ' pairs connected · ' + session.independentPairs + ' first-try matches · ' + session.mistakes + ' incorrect attempts'
    : game === 'sort' ? session.correct + ' of ' + session.items.length + ' statements placed correctly on the first check'
    : game === 'identify' ? session.correct + ' of ' + session.items.length + ' scenarios identified correctly'
    : game === 'build' ? session.correct + ' of ' + session.methods.length + ' procedures correct on first check'
    : game === 'error' ? session.correct + ' of ' + session.items.length + ' complete diagnoses'
    : game === 'reason' ? session.guidedCases + ' guided cases · ' + session.writtenCases + ' independent responses'
    : session.correct + ' correct answers out of ' + session.items.length;
  return div('completed-screen',
    div('completion-badge', icon('✓'), span('', 'Round complete')),
    heading(2, 'completion-title', completionHeading(game, session), { tabindex: '-1' }),
    paragraph('completion-description', gameTitle + ' · ' + topicLabel(topic)),
    paragraph('completion-score', scoreLine),
    paragraph('completion-credit-note',completionCreditNote(game,session)),
    ...(game==='speed'?[speedCompletionPanel()]:[]),
    ...(game==='reason'?[reasoningUI.summaryView()]:[]),
    ...(game==='error'?[div('error-summary',...[['Located',session.errorStats.located],['Repaired',session.errorStats.repaired],['Explained',session.errorStats.explained]].map(([label,n])=>div('error-metric',span('error-metric-value',String(n)),span('',label)))),
      paragraph('error-note',session.reviewMode?'Unscored practice: progress unchanged.':'Only the first attempt contributes to mastery.'),
      ...(!session.reviewMode&&session.missed.length?[action('Review missed cases →','error-review')]:[])]:[]),
    div('completion-next',
      span('eyebrow','A USEFUL NEXT STEP'),
      heading(3,'completion-next-title',next.label),
      paragraph('completion-next-detail',next.reason),
      link('Try '+GAMES.find(g=>g.id===next.game).title,hashFor(next.game,topic),'btn btn-quiet')),

    ...(game === 'cloze' && clozeLevel !== 'independent'
      ? [action('Try the next level →', 'cloze-step-up', {}, 'btn btn-quiet')] : []),
    ...(game === 'flashcards' && session.revisitIds?.length
      ? [paragraph('flash-review-note',session.revisitIds.length+' card'+(session.revisitIds.length===1?' is':'s are')+
          ' ready for another look. Revisiting them is optional and does not automatically award mastery.')] : []),
    metaBar(),
    div('complete-actions',
      ...(game === 'flashcards'&&session.revisitIds?.length
        ? [action('Review '+session.revisitIds.length+' tricky card'+(session.revisitIds.length===1?'':'s')+' ↻',
          'flash-review',{},'btn btn-primary')] : []),
      ...(game==='flashcards'?[
        action('Review all '+makeFlashDeck(data.concepts,data.evaluations,topic).length+' cards ↻',
          'flash-review-all',{},'btn btn-quiet'),
        action('Browse all cards','flash-browse',{},'btn btn-quiet')
      ]:[]),
      action('Play another round ↻', 'restart', {}, 'btn '+(game==='flashcards'&&session.revisitIds?.length?'btn-quiet':'btn-primary')),
      link('Back to arcade', hashFor('home', topic), 'btn btn-quiet'),
      action('Share short feedback', 'open-feedback', {}, 'text-button')
    )
  );
}

function flashEvaluationList(card){
  return span('flash-evaluation-points',...card.points.map((point,i)=>
    span('flash-evaluation-point',
      span('flash-evaluation-number',String(i+1).padStart(2,'0')),
      span('flash-evaluation-content',
        span('flash-evaluation-claim',point.claim),
        span('flash-evaluation-reason',point.explanation)))));
}
function flashBrowserView(){
  const cards=makeFlashDeck(data.concepts,data.evaluations,topic);
  const categories=[
    {id:'term',label:'Key terms',description:'Definitions and precise mathematical language.'},
    {id:'advantage',label:'Advantages',description:'Strengths of each sampling approach.'},
    {id:'disadvantage',label:'Disadvantages',description:'Limitations to consider in an investigation.'}
  ];
  const groups=div('flash-browser-grid');
  for(const category of categories){
    const matching=cards.filter(card=>(card.kind==='evaluation'?card.polarity:'term')===category.id);
    if(!matching.length)continue;
    const tiles=div('flash-browser-items');
    for(const card of matching){
      const kind=card.kind==='evaluation'?card.polarity:'term';
      const searchable=[card.label,card.definition,...(card.points||[]).map(p=>p.explanation)].join(' ').toLocaleLowerCase('en-GB');
      const answer=card.kind==='evaluation'?flashEvaluationList(card):div('flash-library-definition',
        paragraph('flash-library-answer',card.definition),
        div('flash-library-notes',
          paragraph('', 'Example: '+card.example),
          paragraph('', 'Watch out: '+card.misconception)));
      tiles.append(element('details',{className:'flash-library-card',
          'data-flash-type':kind,'data-flash-search':searchable},
        element('summary',{className:'flash-library-summary'},
          span('flash-library-title',card.label),
          span('flash-library-toggle','Show answer')),
        div('flash-library-body',answer)));
    }
    groups.append(element('section',{className:'flash-browser-group'},
      heading(3,'flash-browser-group-title',category.label),
      paragraph('flash-browser-group-detail',category.description),tiles));
  }
  const filter=element('select',{id:'flash-library-filter',
      'data-control':'flash-library-filter','aria-label':'Filter flashcards by type'},
    ...[{id:'all',label:'All card types'},...categories.map(({id,label})=>({id,label}))].map(o=>
      element('option',{value:o.id},o.label)));
  const search=element('input',{id:'flash-library-search',type:'search',
    placeholder:'Search terms, methods or points','aria-label':'Search all flashcards'});
  return div('flash-browser',
    div('flash-browser-intro',
      span('eyebrow','YOUR COMPLETE CARD LIBRARY'),
      heading(2,'flash-browser-title','Browse all '+cards.length+' cards',{id:'flash-browser-title',tabindex:'-1'}),
      paragraph('flash-browser-description','Open any card to see its answer. Browse in your own order without changing saved mastery or completing a round.'),
      div('flash-browser-actions',
        action(session.complete?'Back to results':'Back to my round','flash-browse',{},'btn btn-quiet'),
        action('Review all '+cards.length+' cards ↻','flash-review-all',{},'btn btn-primary'))),
    div('flash-browser-tools',
      element('label',{for:'flash-library-search'},'Find a card'),search,
      element('label',{for:'flash-library-filter'},'Card type'),filter,
      action('Reveal all answers','flash-library-reveal',{},'btn btn-quiet')),
    paragraph('flash-browser-count',cards.length+' of '+cards.length+' cards showing'),
    paragraph('flash-browser-empty','No cards match that search.'),
    groups);
}
function updateFlashLibrary(){
  if(mode!=='flashcards'||!flashBrowseOpen)return;
  const term=(mount.querySelector('#flash-library-search')?.value||'').trim().toLocaleLowerCase('en-GB');
  const filter=mount.querySelector('#flash-library-filter')?.value||'all';
  const items=[...mount.querySelectorAll('.flash-library-card')];
  let shown=0;
  for(const item of items){
    const matches=(filter==='all'||item.dataset.flashType===filter)&&
      (!term||item.dataset.flashSearch.includes(term));
    item.hidden=!matches;
    if(matches)shown++;
  }
  for(const group of mount.querySelectorAll('.flash-browser-group')){
    group.hidden=![...group.querySelectorAll('.flash-library-card')].some(card=>!card.hidden);
  }
  const count=mount.querySelector('.flash-browser-count');
  if(count)count.textContent=shown+' of '+items.length+' cards showing';
  const empty=mount.querySelector('.flash-browser-empty');
  if(empty)empty.hidden=shown!==0;
}

function flashcardView() {
  const root = div('page activity-page flash-page');
  root.append(activityTop('flashcards'));
  if(flashBrowseOpen){root.append(flashBrowserView());return root;}
  if(session.complete){root.append(showCompletion('flashcards'));return root;}
  const current=session.items[session.index];
  const {prompt,answer}=flashFaces(session,current);
  const counter=session.index+1;
  const controls=div('round-controls flash-toolbar',
    roundProgress(counter,session.items.length,'Card '+counter+' of '+session.items.length),
    action(session.reversed?'Definition → term':'Term → definition','reverse',
      {'aria-pressed':session.reversed,'title':'Changing direction restarts the shuffled deck; evaluation cards always ask for points'},'btn btn-quiet btn-small'),
    action('Browse all '+makeFlashDeck(data.concepts,data.evaluations,topic).length+' cards','flash-browse',{},'btn btn-quiet btn-small'));
  root.append(controls,practiceGuide('flashcards',{reversed:session.reversed}));

  // Both sides occupy one stable-height grid. DOM remains in place on flip so
  // the CSS 3D transition actually runs; the hidden side stays out of the a11y tree.
  const faceButton=action('','flip',{
    'aria-expanded':session.revealed,
    'aria-label':flashCardLabel(session,current),
    'data-flipped':String(session.revealed),
    'title':'Flip the card'
  },'flashcard flash-flip-control'+(session.revealed?' is-flipped':''));
  const front=element('span',{
    className:'flash-side flash-face-front','aria-hidden':String(session.revealed)
  },
    span('flash-side-top',
      span('flash-side-type','FRONT · QUESTION'),
      span('flash-turn-symbol','↻')),
    span('flash-front'+(current.kind==='evaluation'?' flash-front-evaluation':''),prompt),
    span('flash-face-footer',span('',current.kind==='evaluation'?'Recall specific points':'Think of the full answer'),span('','Tap or press Enter to flip ↗'))
  );
  const back=element('span',{
    className:'flash-side flash-face-back flash-answer','aria-hidden':String(!session.revealed)
  },
    span('flash-side-top',
      span('flash-side-type','BACK · ANSWER'),span('flash-turn-symbol','↻')),
    ...(current.kind==='evaluation'?[
      span('eyebrow flash-model-label','MODEL POINTS'),
      flashEvaluationList(current),
      paragraph('flash-evaluation-tip','Each point includes why it matters. Aim to recall the ideas in your own words.')
    ]:[
      span('eyebrow flash-model-label','MODEL ANSWER'),
      span('answer-main',answer),
      ...(!session.reversed&&current.keyPhrases?.length?[
        span('flash-key-section',
          span('flash-mini-label','KEY IDEAS'),
          span('flash-chips',...current.keyPhrases.map(phrase=>span('phrase-chip',phrase))))
      ]:[]),
      span('flash-detail',
        span('flash-detail-item',
          span('detail-label','Example'),span('flash-detail-copy',current.example)),
        span('flash-detail-item',
          span('detail-label','Watch out'),span('flash-detail-copy',current.misconception))
      )
    ]),
    span('flash-face-footer',span('','Now rate your recall below'),span('','Tap to see the prompt ↶'))
  );
  faceButton.append(element('span',{className:'flash-flip-inner'},front,back));
  const scene=div('flash-deck-stage',faceButton);
  const stage=element('section',{className:'flash-area','aria-label':'Current flashcard'},scene);
  const gradeWrap=div('grade-wrap flash-grade-panel',
    paragraph('grade-prompt','How accurately did you recall it? Only “Know it” counts towards mastery.'),
    div('grade-options',
      action('Again','grade',{'data-grade':'again','aria-keyshortcuts':'1'},'btn btn-grade btn-again'),
      action('Nearly','grade',{'data-grade':'nearly','aria-keyshortcuts':'2'},'btn btn-grade btn-nearly'),
      action('Know it ✓','grade',{'data-grade':'know','aria-keyshortcuts':'3'},'btn btn-grade btn-know')
    ),
    paragraph('flash-keyboard-help','Keyboard shortcuts: 1 Again · 2 Nearly · 3 Know it')
  );
  gradeWrap.hidden=!session.revealed;
  stage.append(gradeWrap);
  const status=div('flash-deck-footer',
    div('flash-pace',
      span('flash-deck-label',session.reviewType==='all'?'ALL-CARD REVIEW':session.isReview?'REVIEW DECK':'SHUFFLED DECK'),
      span('flash-pace-value',session.ratings.know+' confident · '+session.revisitIds.length+' to revisit')),
    action('Skip for now →','skip',{},'text-button flash-skip'));
  root.append(stage,status);
  return root;
}

function matchTile(item,side){
  const isTerm=side==='term';
  const selected=isTerm?session.selectedTerm===item.id:session.selectedDefinition===item.id;
  const label=isTerm?item.label:item.definition;
  const button=action('','match-'+(isTerm?'term':'def'),{
    'data-id':item.id,'aria-pressed':selected,
    'aria-label':(isTerm?'Term: ':'Definition: ')+label
  },'match-tile '+(isTerm?'term-tile':'definition-tile')+(selected?' is-selected':''));
  button.append(
    span('match-tile-initial',isTerm?'T':'D'),
    span('match-tile-text',label),
    span('match-tile-check',selected?'✓':'↗')
  );
  button.querySelector('.match-tile-initial').setAttribute('aria-hidden','true');
  button.querySelector('.match-tile-check').setAttribute('aria-hidden','true');
  return button;
}
function matchView(){
  const root=div('page activity-page match-page');
  root.append(activityTop('match'));
  if(session.complete){root.append(showCompletion('match'));return root;}
  const done=session.matched.size;
  const summary=matchStatus(done,session.terms.length,session.mistakes);
  root.append(
    div('round-controls match-round-controls',
      roundProgress(done,session.terms.length,'Pairs matched'),
      span('match-try-count',summary.mistakes)),
    practiceGuide('match')
  );
  const board=element('section',{
    className:'match-board'+(session.resolving?' is-resolving':''),
    'aria-labelledby':'match-question-title',
    'aria-busy':String(Boolean(session.resolving))
  });
  const info=div('match-board-intro question-preamble',
    div('match-board-copy',
      span('match-board-kicker','QUESTION · MATCH THE PAIRS'),
      heading(2,'match-board-title','Make the connection',{id:'match-question-title'})),
    div('match-progress-markers',
      ...session.terms.map((_,i)=>span('match-progress-pip'+(i<done?' is-complete':''),i<done?'✓':String(i+1)))
    )
  );
  info.querySelector('.match-progress-markers').setAttribute('aria-hidden','true');
  const step=matchNextStep(session);
  const selectedItem=session.selectedTerm
    ? session.terms.find(item=>item.id===session.selectedTerm)
    : session.selectedDefinition
      ? session.definitions.find(item=>item.id===session.selectedDefinition)
      : null;
  const selectedCopy=selectedItem
    ?(session.selectedTerm?selectedItem.label:selectedItem.definition):null;
  const selection=div('match-instruction-bar',
    div('match-instruction-main',
      span('match-instruction-icon',selectedItem?'↗':'◎'),
      div('match-instruction-copy',
        paragraph('match-instruction-text',step),
        ...(selectedCopy?[span('match-selected-name',selectedCopy)]:[]))),
    span('match-pairs-remaining',summary.remaining)
  );
  selection.querySelector('.match-instruction-text').id='match-instruction-text';
  selection.querySelector('.match-instruction-icon').setAttribute('aria-hidden','true');
  const termCol=div('match-column match-terms');
  const defCol=div('match-column match-definitions');
  termCol.setAttribute('role','group');termCol.setAttribute('aria-labelledby','match-terms-label');
  defCol.setAttribute('role','group');defCol.setAttribute('aria-labelledby','match-definitions-label');
  termCol.append(heading(3,'match-column-label','Terms',{id:'match-terms-label'}));
  defCol.append(heading(3,'match-column-label','Definitions',{id:'match-definitions-label'}));
  for(const item of session.terms.filter(c=>!session.matched.has(c.id)))termCol.append(matchTile(item,'term'));
  for(const item of session.definitions.filter(c=>!session.matched.has(c.id)))defCol.append(matchTile(item,'definition'));
  board.append(info,selection);
  if(session.feedback){
    board.append(feedbackBanner(session.feedbackGood?'correct':'incorrect',session.feedback,[],'match-feedback'));
  }
  board.append(div('match-columns',termCol,defCol));
  root.append(board);
  return root;
}

function clozeModePicker() {
  const wrap = div('game-settings recall-settings cloze-level-settings');
  const label = element('label', {for:'cloze-level',className:'game-settings-label'}, 'Choose your level');
  const select = element('select', {id:'cloze-level',className:'game-select','data-control':'cloze-level'});
  for (const level of CLOZE_LEVELS) {
    select.append(element('option',{value:level.id,selected:level.id===clozeLevel},level.label));
  }
  const path=element('div',{className:'cloze-level-track',role:'list','aria-label':'Three practice levels'});
  const purposes=['Choose a word','Type with a hint','Type from memory'];
  for(const [index,level] of CLOZE_LEVELS.entries()){
    path.append(element('div',{
      role:'listitem',className:'cloze-stage'+(level.id===clozeLevel?' is-current':''),
      ...(level.id===clozeLevel?{'aria-current':'step'}:{})
    },
      span('cloze-stage-number',String(index+1)),
      span('cloze-stage-title',level.label),
      span('cloze-stage-caption',purposes[index])));
  }
  wrap.append(
    div('cloze-level-choice',label,select),
    path,
    paragraph('settings-hint cloze-stage-explain',
      CLOZE_LEVELS.find(level=>level.id===clozeLevel).description+
      (clozeLevel==='choices'?' Build familiarity before practising recall.':
       clozeLevel==='guided'?' A correct answer after a hint is practice, not independent recall.':
       ' This is your strongest check of unaided recall.'))
  );
  return wrap;
}
function typedForm(kind, labelText, value) {
  const fieldId=kind==='cloze'?'cloze-answer':'speed-answer';
  const form=element('form',{'data-form':kind,'className':'typed-form'});
  const input=element('input',{
    type:'text', id:fieldId, name:'answer',
    className:'typed-input', value:value||'',
    placeholder:kind==='cloze'?'Enter the missing word':'Enter the mathematical term',
    autocomplete:'off',autocapitalize:'off',spellcheck:'false',maxlength:'100',required:true
  });
  if(kind==='cloze')input.setAttribute('aria-describedby','cloze-sentence'+
    (session.hintUsed?' cloze-hint-text':'')+(session.typoRetry?' cloze-near-miss':''));
  if(kind==='speed')input.setAttribute('aria-describedby','speed-definition speed-answer-note'+
    (session.typoRetry?' speed-typo-note':''));
  form.append(
    element('label',{for:fieldId,className:'typed-label'},labelText),
    div('typed-input-row',input,element('button',{type:'submit',className:'btn btn-primary'},'Check answer'))
  );
  return form;
}
function clozeView() {
  const root = div('page activity-page cloze-page');
  root.append(activityTop('cloze'),clozeModePicker());
  if (session.complete) { root.append(showCompletion('cloze')); return root; }
  const current=session.items[session.index];
  const parts=splitCloze(current.prompt);
  const number=session.index+1;
  const typed=clozeLevel!=='choices';
  const presentation=clozePresentation(clozeLevel,session,current.answer);
  root.append(
    div('round-controls',
      roundProgress(number,session.items.length,'Question '+number+' of '+session.items.length),
      span('quiet-tag',session.correct+' correct answers')
    ),
    practiceGuide('cloze',{level:clozeLevel})
  );
  const question=element('section',{
    className:'cloze-panel'+(session.answered?' is-answered':''),
    'data-question-id':current.id,
    'data-answer-state':presentation.outcome,
    'aria-labelledby':'cloze-title'
  });
  question.append(
    span('eyebrow',typed?'QUESTION · RECALL THE MISSING WORD':'QUESTION · COMPLETE THE DEFINITION'),
    heading(2,'cloze-title',typed?'Type the word that belongs in the gap.':'Which word belongs in the gap?',{id:'cloze-title'}),
    element('div',{className:'cloze-sentence',id:'cloze-sentence'},
      parts[0],
      element('span',{
        className:'cloze-blank'+(presentation.preview?' is-preview':'')+(session.answered?' is-revealed':''),
        'aria-hidden':'true'
      },presentation.display),
      span('sr-only',session.answered?current.answer:'blank'),
      parts[1])
  );
  if (!typed) {
    question.append(paragraph('choose-note','Select the missing word.'));
    const options=div('cloze-options');
    for (const [index,choice] of session.options[current.id].entries()) {
      const selected=session.choice===choice;
      const correct=clozeCorrect(current,choice);
      const stateClass=session.answered&&correct?' is-correct':session.answered&&selected?' is-incorrect':
        session.answered?' is-muted':'';
      const option=action(choice,'cloze-option',{
        'data-choice':choice,disabled:session.answered
      },'option-button cloze-choice'+stateClass);
      option.replaceChildren(
        element('span',{className:'cloze-choice-key','aria-hidden':'true'},String.fromCharCode(65+index)),
        span('cloze-choice-word',choice)
      );
      if(session.answered){
        option.append(icon(correct?'✓':selected?'!':'','cloze-choice-mark'));
        option.setAttribute('aria-label',choice+
          (correct?', correct answer':selected?', your answer':''));
      }
      options.append(option);
    }
    question.append(options);
  } else if (!session.answered) {
    question.append(
      paragraph('choose-note',clozeLevel==='guided'?
        'Read the sentence, then type only the missing word.':'Retrieve the missing word without any hints.'),
      typedForm('cloze','Your missing word',session.draft)
    );
    if (session.typoRetry) {
      question.append(element('p',{id:'cloze-near-miss',className:'typed-near-miss'},
        'Almost — check your spelling and try once more. No answer has been recorded.'));
    }
    if (clozeLevel==='guided') {
      const assistance=div('hint-area',
        action(session.hintUsed?'Hint revealed':'Show first-letter hint','cloze-hint',
          {disabled:session.hintUsed},'btn btn-quiet btn-small')
      );
      if (session.hintUsed) assistance.append(element('span',{
        id:'cloze-hint-text',className:'hint-text'
      },'First letter: '+current.answer.charAt(0).toUpperCase()+
        ' · A hinted answer is practice, not mastery.'));
      question.append(assistance);
    }
    question.append(div('typed-tools',
      action('Show answer and move on','cloze-reveal',{},'text-button')));
  }
  if (session.answered) {
    let title;
    if (!typed) {
      title=presentation.outcome==='correct'?'Exactly right.':'Not quite — '+current.answer+' is correct.';
    } else {
      title=session.status==='correct'?'Exactly right.'
        :session.status==='assisted'?'Correct with help — try again without a hint to build mastery.'
        :session.status==='skipped'?'Here is the model word: '+current.answer
        :'Not quite — '+current.answer+' is correct.';
    }
    const details=[
      ...(typed&&session.status==='wrong'&&session.choice?.trim()?
        [paragraph('cloze-attempt','Your entry: '+session.choice)]:[]),
      paragraph('cloze-reason-label','WHY THIS WORD FITS'),
      paragraph('cloze-reason',current.explanation)
    ];
    question.append(feedbackBanner(presentation.outcome,title,details,'cloze-feedback'));
    question.append(div('next-row',
      action(number===session.items.length?'Finish round →':'Next question →',
        'cloze-next',{},'btn btn-primary')));
  }
  root.append(question);
  return root;
}


function speedModePicker() {
  if(session?.reviewMode){
    return div('speed-review-context',
      div('speed-review-context-copy',
        span('speed-review-kicker','TARGETED RECALL'),
        paragraph('speed-review-message','Revisit the terms you missed or skipped. A correct typed answer earns recall credit.')),
      action('Back to standard practice','speed-exit-review',{},'btn btn-quiet btn-small'));
  }
  const wrap=div('game-settings speed-settings');
  const modeLabel=element('label',{for:'speed-mode',className:'game-settings-label'},'Practice mode');
  const modeSelect=element('select',{id:'speed-mode',className:'game-select','data-control':'speed-mode'});
  modeSelect.append(
    element('option',{value:'untimed',selected:speedMode==='untimed'},'Untimed · '+
      Math.min(10,conceptsInTopic(data.concepts,topic).length)+' terms'),
    element('option',{value:'timed',selected:speedMode==='timed'},'Timed · beat the clock')
  );
  wrap.append(div('setting-group',modeLabel,modeSelect));
  if(speedMode==='timed'){
    const durationLabel=element('label',{for:'speed-duration',className:'game-settings-label'},'Time limit');
    const durationSelect=element('select',{id:'speed-duration',className:'game-select','data-control':'speed-duration'});
    for(const duration of SPEED_DURATIONS){
      durationSelect.append(element('option',{value:duration,selected:duration===speedDuration},duration+' seconds'));
    }
    wrap.append(div('setting-group',durationLabel,durationSelect));
  }
  wrap.append(paragraph('speed-settings-note',
    speedMode==='timed'?'The timer starts when you choose Start. It pauses during feedback and when you switch tabs.':
    'Recall independently at your own pace. You can revisit missed terms after the round.'));
  return wrap;
}
function clockBadge(){
  const value=element('span',{
    className:'clock-value','data-clock':'',role:'timer','aria-live':'off',
    'aria-label':'Time remaining '+formatClock(session.remainingMs)
  },formatClock(session.remainingMs));
  const remaining=span('speed-clock-fill');
  remaining.style.width=speedClockPercent(session.remainingMs,speedDuration)+'%';
  const track=div('speed-clock-track',remaining);
  track.setAttribute('aria-hidden','true');
  const container=div('clock-badge speed-clock',
    div('speed-clock-head',
      div('speed-clock-copy',
        span('clock-caption','Time remaining'),
        span('speed-clock-state',session.answered?'Paused for feedback':'Timer running')),
      value),
    track);
  if(session.remainingMs<=SPEED_CAUTION_MS)container.classList.add('is-low');
  return container;
}
function paintSpeedClock(){
  const el=mount.querySelector('.speed-clock');
  if(!el)return;
  const clock=el.querySelector('[data-clock]');
  if(clock){
    clock.textContent=formatClock(session.remainingMs);
    clock.setAttribute('aria-label','Time remaining '+formatClock(session.remainingMs));
  }
  const fill=el.querySelector('.speed-clock-fill');
  if(fill)fill.style.width=speedClockPercent(session.remainingMs,speedDuration)+'%';
  el.classList.toggle('is-low',session.remainingMs<=SPEED_CAUTION_MS);
}
function speedView(){
  const root=div('page activity-page speed-page');
  root.append(activityTop('speed'),speedModePicker());
  if(session.complete){root.append(showCompletion('speed'));return root;}
  if(!session.started){
    root.append(div('speed-ready',
      div('speed-ready-main',
        div('speed-ready-copygroup',
          span('speed-ready-kicker','TIMED ACTIVE RECALL'),
          heading(2,'speed-ready-title','Recall the term. Make it count.'),
          paragraph('speed-ready-copy','Read each definition, type the mathematical term and check your answer. You have '+
            speedDuration+' seconds of answering time. The timer pauses during feedback and when you switch tabs.'),
          action('Start '+speedDuration+'-second round →','speed-start',{},'btn btn-primary')),
        div('speed-ready-clock',
          span('speed-ready-clock-number',formatClock(speedDuration*1000)),
          span('speed-ready-clock-label','Your time to retrieve'))
      )
    ));
    return root;
  }
  const current=session.items[session.index];
  const reviewing=session.reviewMode===true;
  const index=session.index+1;
  const total=session.items.length;
  root.append(
    div('round-controls speed-round-controls',
      session.speedMode==='untimed'
        ?roundProgress(index,total,(reviewing?'Review term ':'Term ')+index+' of '+total)
        :div('round-head timed-score',
          span('round-caption',session.attempted+' submitted'),
          span('round-caption',session.correct+' correct'),
          span('round-caption',session.skipped+' skipped')),
      session.speedMode==='timed'?clockBadge():
        span('quiet-tag',session.correct+' correct'+(reviewing?' in this review':''))
    ),
    practiceGuide('speed',{timed:session.speedMode==='timed'})
  );
  const panel=element('section',{
    className:'recall-panel speed-recall-panel'+(session.answered?' is-answered':''),
    'aria-labelledby':'recall-title','data-concept-id':current.id,
    'data-recall-state':session.answered?session.status:'question'
  });
  panel.append(
    div('speed-question-head',
      span('eyebrow',reviewing?'REVIEW · DEFINITION → TERM':'QUESTION · DEFINITION → TERM'),
      span('speed-question-number',session.speedMode==='untimed'?index+' / '+total:
        'Term '+(session.attempted+1))
    ),
    heading(2,'recall-title','Which mathematical term is described?',{id:'recall-title'}),
    element('div',{className:'recall-definition',id:'speed-definition'},current.definition)
  );
  if(!session.answered){
    panel.append(
      element('p',{className:'recall-instruction',id:'speed-answer-note'},'Type the precise term. Press Enter to check.'),
      typedForm('speed','Your mathematical term',session.draft),
      div('typed-tools speed-support-tools',action('Skip and reveal','speed-skip',{},'text-button'))
    );
    if(session.typoRetry)panel.append(element('p',{
      className:'typed-near-miss speed-near-miss',id:'speed-typo-note'
    },'Very close — check your spelling and submit once more. No mark has been recorded yet.'));
  }else{
    const correct=session.status==='correct';
    const title=correct?'Correct — '+current.label
      :session.status==='skipped'?'Skipped — '+current.label
      :'The correct term is '+current.label;
    const feedback=feedbackBanner(correct?'correct':'incorrect',title,[
      ...(correct&&session.aliasUsed?[paragraph('alias-note','Accepted equivalent terminology.')]:[]),
      ...(session.status==='wrong'&&session.draft.trim()?
        [paragraph('speed-written-attempt','Your answer: '+session.draft.trim())]:[]),
      div('speed-model-example',span('speed-model-heading','MATHEMATICAL EXAMPLE'),
        paragraph('',current.example)),
      div('speed-model-caution',span('speed-model-heading','IMPORTANT DISTINCTION'),
        paragraph('feedback-contrast',current.misconception))
    ],'speed-feedback');
    panel.append(feedback,
      paragraph('speed-feedback-tip','Press Enter to continue, or use the next button.'),
      div('next-row',action(session.speedMode==='untimed'&&session.index===session.items.length-1
        ?'Finish round →':'Next definition →','speed-next',{},'btn btn-primary')));
  }
  root.append(panel);
  return root;
}
function stopClock() {
  if (clockHandle!==null) window.clearInterval(clockHandle);
  clockHandle=null;
}
function ensureClock() {
  if (mode!=='speed'||!session||session.complete||session.speedMode!=='timed'||!session.started) {
    stopClock();return;
  }
  if (clockHandle===null) clockHandle=window.setInterval(syncClock,200);
}
function syncClock() {
  if (mode!=='speed'||!session||session.complete||session.speedMode!=='timed'||!session.started) return;
  if (document.hidden||session.answered) { session.lastTick=null;return; }
  const now=performance.now();
  if (session.lastTick!==null) {
    session.remainingMs=Math.max(0,session.remainingMs-(now-session.lastTick));
  }
  session.lastTick=now;
  paintSpeedClock();
  if (session.remainingMs<=0) {
    session.finishedReason='time';
    finishRound();
    announce('Time is up. The round has ended.');
  }
}
function speedForward() {
  if (!session.answered||session.complete) return;
  session.answered=false;
  session.draft='';
  session.typoRetry=false;
  session.status=null;
  session.aliasUsed=false;
  if (session.index===session.items.length-1) {
    if (session.speedMode==='untimed') {
      session.finishedReason='complete';finishRound();return;
    }
    session.items=speedDeck(data.concepts,topic,Math.random,Number.POSITIVE_INFINITY);
    session.index=0;
  } else session.index++;
  session.lastTick=performance.now();
  render('#speed-answer');
  announce('Next definition.');
}
function resolveSpeed(value, skipped=false) {
  if(mode!=='speed'||!session?.started||session.complete||session.answered) return;
  syncClock();
  if(session.complete) return;
  const current=session.items[session.index];
  const result=skipped?{status:'wrong'}:gradeTerm(value,current,data.acceptedTerms,data.concepts);
  if(result.status==='empty') return;
  if(result.status==='typo'&&!session.typoRetry&&!skipped) {
    session.typoRetry=true;
    session.draft=value;
    render('#speed-answer');
    announce('Almost. Check the spelling and try once more. Nothing has been marked.');
    return;
  }
  const correct=result.status==='correct'&&!skipped;
  session.answered=true;
  session.draft=value;
  session.status=skipped?'skipped':correct?'correct':'wrong';
  session.aliasUsed=correct&&result.alias===true;
  session.attempted++;
  if(correct) session.correct++;
  if(skipped) session.skipped++;
  if(!correct)session.reviewIds.add(current.id);
  session.lastTick=null; // Reading explanatory feedback is not against the clock.
  remember(current.id,correct);
  render('.recall-panel .typed-feedback');
  announce(correct?'Correct. '+current.label:(skipped?'Skipped. ':'Not quite. ')+
    'The term is '+current.label+'.');
}


function scenarioSetPicker() {
  const wrap = div('game-settings');
  const label = element('label', { for: 'scenario-length', className: 'game-settings-label' }, 'Questions per round');
  const select = element('select', { id: 'scenario-length', className: 'game-select', 'data-control': 'scenario-length' });
  for (const length of ROUND_LENGTHS) {
    select.append(element('option', { value: length, selected: length === scenarioLength },
      length === 5 ? '5 · Quick round' : length === 10 ? '10 · Standard round' : '20 · All scenarios'));
  }
  wrap.append(label, select);
  return wrap;
}
function classificationCard(kind) {
  const item = session.items[session.index];
  const correctAnswer = kind === 'sort' ? item.correctCategory : item.correctMethod;
  const comparison = kind === 'sort' && session.round.type === 'comparison';
  const categories = kind === 'sort' ? session.round.categories : METHOD_ORDER;
  const number = session.index + 1;
  const titleText = kind === 'identify' ? 'Which sampling method is being used?'
    : comparison ? 'Which sampling method does this describe?' : 'Advantage or disadvantage?';
  const root = element('section', {
    className: 'classification-panel',
    'data-item-id': item.id,
    'aria-labelledby': 'classification-title'
  });
  root.append(
    span('eyebrow', 'QUESTION · '+(kind === 'identify' ? 'READ THE SCENARIO' : comparison ? 'COMPARE THE METHODS' : 'EVALUATE THE METHOD')),
    heading(2, 'classification-title', titleText, { id: 'classification-title' }),
    div('classification-statement', item.prompt),
    paragraph('choose-note', kind === 'identify'
      ? 'Look for how the sample was selected, not just who was interviewed.'
      : comparison ? 'Focus on the defining difference.' : 'Decide whether this is a strength or a limitation.')
  );
  const choices = element('div', {
    className: 'classification-options' + (kind === 'identify' ? ' method-options' : ''),
    role: 'group', 'aria-label': titleText
  });
  for (const choice of categories) {
    const selected = session.choice === choice;
    const state = session.answered && choice === correctAnswer ? ' is-correct'
      : session.answered && selected ? ' is-incorrect' : '';
    choices.append(action(categoryLabel(choice), 'classify-option',
      { 'data-choice': choice, disabled: session.answered, 'aria-pressed': selected },
      'option-button classification-choice' + state));
  }
  root.append(choices);
  if (session.answered) {
    const right = session.choice === correctAnswer;
    const feedback=feedbackBanner(right?'correct':'incorrect',
      (right?'Correct — ':'Not quite — ')+categoryLabel(correctAnswer)+'.',[
        paragraph('',kind==='identify'?item.reason:item.explanation),
        ...(kind==='identify'?[paragraph('feedback-contrast',item.contrast)]:[])
      ],'classification-feedback');
    root.append(
      feedback,
      div('next-row',
        action(number === session.items.length ? 'Finish round →' : 'Next question →',
          'classify-next', {}, 'btn btn-primary'))
    );
  }
  return root;
}
function sortView(){return sortUI.view();}
function identifyView() {
  const root = div('page activity-page');
  root.append(activityTop('identify'), scenarioSetPicker());
  if (session.complete) { root.append(showCompletion('identify')); return root; }
  const number = session.index + 1;
  root.append(
    div('round-controls',
      roundProgress(number, session.items.length, 'Scenario ' + number + ' of ' + session.items.length),
      span('quiet-tag', session.correct + ' correct')
    ),
    practiceGuide('identify'),
    classificationCard('identify')
  );
  return root;
}
function answerClassification(choice) {
  if(mode!=='identify'||session.answered||session.complete)return;
  const item = session.items[session.index];
  const answer = item.correctMethod;
  const concept = conceptIdForSubject(item.correctMethod,data.methods);
  const right = choice === answer;
  session.choice = choice;
  session.answered = true;
  if (right) session.correct += 1;
  remember(concept, right);
  render('.classification-feedback');
  const explanation = item.reason;
  announce((right ? 'Correct. ' : 'Not quite. The answer is ' + categoryLabel(answer) + '. ') + explanation);
}
function nextClassification() {
  if (!session.answered || session.complete) return;
  if (session.index === session.items.length - 1) {
    finishRound();
    return;
  }
  session.index += 1;
  session.answered = false;
  session.choice = null;
  render('[data-action="classify-option"]');
  announce('Next question.');
}


function examLevelPicker() {
 const wrap=div('game-settings');
 const select=element('select',{id:'exam-level',className:'game-select','data-control':'exam-level'});
 for(const level of EXAM_LEVELS)select.append(element('option',{value:level,selected:level===examLevel},({foundation:'Foundation skills',develop:'Developing explanations',extend:'Stretch and critique'})[level]));
 wrap.append(element('label',{for:'exam-level',className:'game-settings-label'},'Challenge level'),select);
 const sizes=mode==='error'?ERROR_ROUND_LENGTHS:REASON_ROUND_LENGTHS;
 const selected=mode==='error'?errorRoundLength:reasonRoundLength;
 const sizeSelect=element('select',{id:'case-length',className:'game-select','data-control':'case-length'});
 for(const amount of sizes)sizeSelect.append(element('option',{value:amount,selected:amount===selected},
   amount===sizes[0]?amount+' · Focused round':amount===sizes[sizes.length-1]?amount+' · All investigations':amount+' · Extended practice'));
 wrap.append(element('label',{for:'case-length',className:'game-settings-label'},'Investigations per round'),sizeSelect);
 return wrap;
}
function buildPicker() {
 const wrap=div('game-settings'),select=element('select',{id:'build-method',className:'game-select','data-control':'build-method'});
 for(const method of data.methods)select.append(element('option',{value:method.id,selected:method.id===buildMethodId},METHOD_LABELS[method.id]));
 wrap.append(element('label',{for:'build-method',className:'game-settings-label'},'First method'),select);
 return wrap;
}
function buildView(){
 const root=div('page activity-page');root.append(activityTop('build'),buildPicker());
 if(session.complete){root.append(showCompletion('build'));return root;}
 const current=session.methods[session.index],method=current.method;
 root.append(roundProgress(session.index+1,session.methods.length,'Method '+(session.index+1)+' of '+session.methods.length),practiceGuide('build'));
 const panel=element('section',{className:'exam-workspace','data-method-id':method.id,'aria-labelledby':'exam-heading'});
 panel.append(span('eyebrow','QUESTION · ORDER THE STEPS'),heading(2,'exam-heading',METHOD_LABELS[method.id],{id:'exam-heading',tabindex:'-1'}),
  paragraph('exam-help','Move steps with the arrow buttons, using touch or keyboard. Equivalent valid orderings are accepted.'));
 const list=element('ol',{className:'exam-step-list'});
 current.steps.forEach((step,i)=>{
   const li=element('li',{className:'exam-step','data-step-id':step.id});
   li.append(span('exam-step-number',String(i+1)),paragraph('exam-step-copy',step.text),
     div('exam-step-actions',
       action('↑','build-move',{'data-step':step.id,'data-dir':'-1',disabled:current.checked||i===0,'aria-label':'Move step '+(i+1)+' up'},'exam-arrow'),
       action('↓','build-move',{'data-step':step.id,'data-dir':'1',disabled:current.checked||i===current.steps.length-1,'aria-label':'Move step '+(i+1)+' down'},'exam-arrow')));
   list.append(li);
 });panel.append(list);
 if(!current.checked)panel.append(div('exam-buttons',action('Check procedure','build-check'),action('Reveal model','build-reveal',{},'btn btn-quiet')));
 else {
   const feedback=feedbackBanner(current.correct?'correct':'incorrect',
     current.correct?'Valid procedure.':'Study this model procedure.',[
       paragraph('',current.correct?'This order satisfies the compulsory dependencies.':'Some compulsory steps were in the wrong order, or you chose to reveal the answer.')
     ]);
   const model=element('ol',{className:'exam-model-list'});
   method.procedure.forEach(step=>model.append(element('li',{},step.text)));
   panel.append(feedback,heading(3,'exam-model-heading','Model method'),model,
    paragraph('exam-help','Exam details: '+method.examKeywords.join(' · ')),
    ...(method.conditionalProcedure||[]).map(x=>paragraph('exam-help','Only if '+x.condition.toLowerCase()+': '+x.text)),
    paragraph('exam-warning',method.warning),
    div('next-row',action(session.index===session.methods.length-1?'Finish round →':'Next method →','build-next')));
 }
 root.append(panel);return root;
}
function examRadio(name,value,text,checked,disabled,attribute) {
 const input=element('input',{type:'radio',name,value,checked,disabled,[attribute]:attribute==='data-error-line'||attribute==='data-error-repair'?'':name.slice(7)});
 return element('label',{className:'exam-choice'},input,span('',text));
}
function errorView(){
 const root=div('page activity-page error-page');root.append(activityTop('error'));
 if(!session.reviewMode)root.append(examLevelPicker());
 if(session.complete){root.append(showCompletion('error'));return root;}
 const q=session.items[session.index];
 root.append(roundProgress(session.index+1,session.items.length,(session.reviewMode?'Review ':'Case ')+(session.index+1)+' of '+session.items.length),practiceGuide('error'));
 const panel=element('section',{className:'exam-workspace error-workspace','data-error-id':q.id,'aria-labelledby':'exam-heading'});
 panel.append(div('error-head',div('',span('eyebrow',session.reviewMode?'QUESTION · UNSCORED REVIEW':'QUESTION · SAMPLING CASE FILE'),heading(2,'exam-heading','Inspect the procedure',{id:'exam-heading',tabindex:'-1'})),span('error-method',METHOD_LABELS[q.methodId])),
 paragraph('exam-scenario',q.context),paragraph('error-note','Identify the flawed step, choose a correction and diagnose its mathematical consequence.'));
 const steps=element('fieldset',{className:'error-steps'});
 steps.append(element('legend',{className:'error-legend'},'01 · Locate the error'));
 q.lines.forEach((line,i)=>steps.append(element('label',{className:'error-step'+(session.answered&&i===q.errorLine?' is-key':'')},
 element('input',{type:'radio',name:'error-line',value:String(i),'data-error-line':'',checked:session.selectedLine===i,disabled:session.answered}),
 span('error-step-num',String(i+1).padStart(2,'0')),span('',line))));
 panel.append(steps);
 const choices=(name,headingText,items,selected,attr)=>{
  const group=element('fieldset',{className:'error-choices'});
  group.append(element('legend',{className:'error-legend'},headingText));
  items.forEach((option,i)=>group.append(element('label',{className:'error-option'},
   element('input',{type:'radio',name,value:option.id,[attr]:'',checked:selected===option.id,disabled:session.answered}),
   span('error-choice-letter',String.fromCharCode(65+i)),span('',option.text))));
  return group;
 };
 panel.append(choices('error-repair','02 · Repair the instruction',q.repairs,session.selectedRepair,'data-error-repair'),
 choices('error-impact','03 · Diagnose the consequence',q.impact.options,session.selectedImpact,'data-error-impact'));
 if(!session.answered)panel.append(div('exam-buttons',action('Check all three decisions','error-check',{disabled:session.selectedLine===null||!session.selectedRepair||!session.selectedImpact})));
 else{
  const mark=gradeErrorDiagnosis(q,session.selectedLine,session.selectedRepair,session.selectedImpact);
  const fix=q.repairs.find(x=>x.id===q.repair),impact=q.impact.options.find(x=>x.id===q.impact.answer);
  panel.append(div('error-analysis',span('eyebrow','YOUR DIAGNOSIS'),heading(3,'error-analysis-title',mark.correct?'All three decisions correct':'Review the mathematics'),
   div('error-summary',...[['Locate',mark.lineCorrect],['Repair',mark.repairCorrect],['Consequence',mark.impactCorrect]].map(([label,ok])=>div('error-metric',span('error-metric-value',ok?'✓':'↺'),span('',label),span('',ok?'Correct':'Review')))),
   feedbackBanner(mark.correct?'correct':'incorrect',mark.correct?'Complete diagnosis.':'The mathematical explanation',[
    paragraph('','Flawed step '+(q.errorLine+1)+': '+q.lines[q.errorLine]),
    paragraph('','Correction: '+fix.text),paragraph('','Consequence: '+impact.text),
    paragraph('','Why: '+q.explanation+' '+q.impact.explanation)
   ]),...(session.reviewMode?[paragraph('error-note','Review mode does not change saved progress.')]:[])),
   div('next-row',action(session.index===session.items.length-1?'Finish round →':'Next case →','error-next')));
 }
 root.append(panel);return root;
}
function examAdvance(){
 if(mode==='build'){
  if(session.index===session.methods.length-1){finishRound();return;}
 }else if(session.index===session.items.length-1){finishRound();return;}
 session.index++;session.answered=false;session.selectedLine=null;session.selectedRepair=null;session.selectedImpact=null;session.selections={};session.draft='';
 render('#exam-heading');
}
function examAction(command,button){
 if(command==='build-move'&&mode==='build'){
  const current=session.methods[session.index];if(current.checked)return;
  current.steps=moveStep(current.steps,button.dataset.step,Number(button.dataset.dir));
  render('[data-step-id="'+button.dataset.step+'"] .exam-arrow');announce('Step moved.');return;
 }
 if((command==='build-check'||command==='build-reveal')&&mode==='build'){
  const current=session.methods[session.index];if(current.checked)return;
  current.correct=command==='build-check'&&checkProcedure(current.method,current.steps).correct;
  current.checked=true;if(current.correct)session.correct++;
  remember(current.method.conceptId,current.correct);
  render('.exam-workspace .typed-feedback');announce(current.correct?'Valid procedure.':'Review the model procedure.');return;
 }
 if(command==='build-next'&&mode==='build'&&session.methods[session.index].checked){examAdvance();return;}
 if(command==='error-check'&&mode==='error'&&!session.answered){
  if(session.selectedLine===null||!session.selectedRepair||!session.selectedImpact)return;
  const q=session.items[session.index],mark=gradeErrorDiagnosis(q,session.selectedLine,session.selectedRepair,session.selectedImpact);
  session.answered=true;if(mark.correct)session.correct++;
  session.errorStats.located+=mark.identified;session.errorStats.repaired+=mark.repaired;session.errorStats.explained+=mark.explained;
  if(!mark.correct&&!session.reviewMode)session.missed.push(q.id);
  if(!session.reviewMode)remember(conceptIdForSubject(q.methodId,data.methods),mark.correct);
  render('.error-analysis');announce(mark.correct?'All three decisions correct.':'Review the mathematical explanation.');return;
 }
 if(command==='error-next'&&mode==='error'&&session.answered){examAdvance();return;}
 
}

const reasoningUI=createReasoningUI({
 element,div,span,paragraph,heading,action,activityTop,examLevelPicker,roundProgress,
 practiceGuide,feedbackBanner,showCompletion,getState:()=>({data,session,mode}),
 setSession:next=>{session=next;},
 render,announce,rememberPractice,finishRound,conceptIdForSubject
});
const sortUI=createSortItUI({
  mount,element,div,span,paragraph,heading,action,activityTop,roundProgress,
  practiceGuide,feedbackBanner,showCompletion,
  getState:()=>({data,session,mode}),
  render,announce,finishRound,
  remember:(subject,correct)=>remember(conceptIdForSubject(subject,data.methods),correct),
  awardAnswer:(item,correct)=>{if(correct)awardEvent({kind:'answer',game:'sort',id:item.id,
    correct:true,verified:true,review:false,assisted:false});}
});
const examSimulator=createExamSimulationUI({
  element,div,span,paragraph,heading,action,link,icon,activityTop,roundProgress,
  getState:()=>({data,session,examState:examStore}),
  beginPaper:paper=>{session=paper;examStore.paper=paper;},
  beginReady:()=>{session={ready:true,complete:false};},
  persist:()=>{if(!saveExamStore(examStore,data.examQuestions,data.methods))persistenceAvailable=false;},
  recordNumerical:remember,finish:finishRound,render,announce,
  practiceGuide,feedbackBanner,openFeedback:experience.openFeedback
});
function render(focusTarget) {
  if (!data) return;
  navSync();
  const views = { home: homeView, flashcards: flashcardView, match: matchView, cloze: clozeView,
    sort: sortView, identify: identifyView, speed: speedView, build: buildView, error: errorView, reason: reasoningUI.view, exam: examSimulator.view };
  const view = (views[mode] || homeView)();
  mount.replaceChildren(view);
  ensureClock();
  if (focusTarget) {
    requestAnimationFrame(() => {
      const target = mount.querySelector(focusTarget) || mount.querySelector('#view-heading');
      if(!target)return;
      target.focus({preventScroll:true});
      // Keyboard focus must remain visible, including after long mathematical answers.
      const rect=target.getBoundingClientRect();
      const header=document.querySelector('.site-header');
      const sticky=header&&getComputedStyle(header).position==='sticky';
      const visibleTop=sticky?header.getBoundingClientRect().bottom+12:12;
      if(rect.top<visibleTop||rect.bottom>window.innerHeight-16)
        target.scrollIntoView({block:'nearest',behavior:'auto'});
    });
  }
}
function restartGame(){
  if(matchSettleTimer!==null){clearTimeout(matchSettleTimer);matchSettleTimer=null;}
  sortUI.clearDrag();
  if (mode === 'flashcards') {
    session=makeFlashSession(shuffled(makeFlashDeck(data.concepts,data.evaluations,topic)));
    flashBrowseOpen=false;
  } else if (mode === 'match') {
    const round = makeMatchRound(data.concepts, topic);
    session = { ...round, matched: new Set(), selectedTerm: null, selectedDefinition: null,
      mistakes: 0, independentPairs: 0, exposedIds: new Set(), feedback: '', feedbackGood: false, complete: false, resolving: null };
  } else if (mode === 'cloze') {
    const items = shuffled(clozeInTopic(data.cloze, data.concepts, topic));
    const options = Object.fromEntries(items.map(q => [q.id, shuffled(q.choices)]));
    session = { items, options, index: 0, choice: null, answered: false, correct: 0,
      complete: false, draft: '', status: null, hintUsed: false, typoRetry: false };
  } else if (mode === 'sort') {
    const round=makePairSortRound(data.sortPairs,data.evaluations,sortRoundId);
    session={...round,placements:{},selectedSortId:null,checked:false,revealed:false,
      everChecked:false,firstCorrect:null,lastCorrect:null,correct:0,complete:false};
  } else if (mode === 'identify') {
    session = { items: makeScenarioRound(data.scenarios, scenarioLength), index: 0,
      choice: null, answered: false, correct: 0, complete: false };
  } else if (mode === 'speed') {
    const pool = speedDeck(data.concepts, topic, Math.random,
      speedMode === 'timed' ? Number.POSITIVE_INFINITY : 10);
    session = { items: pool, index: 0, speedMode, started: speedMode === 'untimed',
      answered: false, draft: '', status: null, typoRetry: false,
      remainingMs: speedDuration * 1000, lastTick: null, attempted: 0,
      correct: 0, skipped: 0, complete: false, finishedReason: null,
      reviewMode:false,reviewIds:new Set() };
  } else if(mode==='build') {
    const order=[buildMethodId,...data.methods.map(m=>m.id).filter(id=>id!==buildMethodId)];
    session={methods:order.map(id=>({...procedureRound(data.methods,id),checked:false,correct:false})),index:0,correct:0,complete:false};
  } else if(mode==='error') {
    session={items:makeErrorDeck(data.errors,examLevel,Math.random,errorRoundLength),index:0,correct:0,complete:false,answered:false,selectedLine:null,selectedRepair:null,selectedImpact:null,reviewMode:false,missed:[],errorStats:{located:0,repaired:0,explained:0}};
  } else if(mode==='reason') {
    session=createReasonRound(makeReasoningDeck(data.reasoning,examLevel,Math.random,reasonRoundLength));
  } else if(mode==='exam'){
    session={ready:true,complete:false};
  } else session = null;
}
function setRoute() {
  const route = routeFromHash(window.location.hash);
  const changed = route.mode !== mode || route.topic !== topic || !session && route.mode !== 'home';
  mode = route.mode;
  topic = route.topic;
  if (changed) { stopClock(); restartGame(); }
  closeHeaderMenus();
  const showProgress=mode==='home'&&progressJumpPending;
  if(showProgress)progressJumpPending=false;
  render(showProgress?'#progress-title':
    experience.isFeedbackOpen()&&mode==='home'?'#classroom-feedback-summary':
    changed?(mode==='home'?'#home-heading':'#view-heading'):null);
  if(showProgress)requestAnimationFrame(focusProgressPanel);
}
function awardEvent(event){
  const outcome=applyAwardEvent(awardLedger,event);
  awardLedger=outcome.state;
  if(!saveAwards(awardLedger)){persistenceAvailable=false;return;}
  for(const award of outcome.newlyUnlocked)showAwardUnlock(award);
}
function remember(conceptId, correct) {
  progress = recordAnswer(progress, conceptId, correct);
  if (!saveProgress(progress)) persistenceAvailable = false;
  if(!correct||!session)return;
  let id=null,method=null,level=null,selfRated=false,verified=true;
  if(mode==='flashcards'){
    if(session.isReview)return;
    id=session.items[session.index]?.id;selfRated=true;verified=false;
  }else if(mode==='match'){
    if(session.resolving!=='correct')return;
    id=conceptId;
  }else if(mode==='cloze'){
    id=session.items[session.index]?.id;level=clozeLevel;
  }else if(mode==='identify'){
    const item=session.items[session.index];
    id=item?.id;method=item?.correctMethod;
  }else if(mode==='speed'){
    if(session.reviewMode)return;
    id=session.items[session.index]?.id;
  }else if(mode==='build'){
    id=session.methods[session.index]?.method?.id;
  }else if(mode==='error'){
    if(session.reviewMode)return;
    id=session.items[session.index]?.id;
  }else if(mode==='exam'){
    id=session.questionIds?.[session.index];
  }else return; // Sort It! awards use each statement ID at the first full-board check.
  if(id)awardEvent({kind:'answer',game:mode,id,method,level,correct:true,
    verified,selfRated,review:Boolean(session.reviewMode),assisted:false});
}
function rememberPractice(conceptId) {
  progress = recordPractice(progress, conceptId);
  if (!saveProgress(progress)) persistenceAvailable = false;
  if(mode==='reason'&&session?.track==='independent'&&!session.reviewMode&&session.answered){
    awardEvent({kind:'writing',game:'reason',id:session.items[session.index]?.id,
      review:false,independent:true,writtenLength:session.draft?.trim().length||0});
  }
}
function roundAwardEvent(){
  const base={kind:'round',game:mode,verified:true,review:Boolean(session.reviewMode)};
  if(mode==='match')return {...base,total:session.terms.length,correct:session.independentPairs,
    attempted:session.independentPairs,mistakes:session.mistakes};
  if(mode==='sort')return {...base,total:session.items.length,
    correct:session.firstCorrect,firstCheck:session.everChecked};
  if(mode==='cloze')return {...base,total:session.items.length,
    correct:session.correct,level:clozeLevel};
  if(mode==='build')return {...base,total:session.methods.length,correct:session.correct,firstCheck:true};
  if(mode==='speed')return {...base,total:session.items.length,correct:session.correct,
    attempted:session.attempted,speedMode:session.speedMode};
  return null;
}
function finishRound() {
  if (session.complete) return;
  session.complete = true;
  if((mode==='error'||mode==='reason')&&session.reviewMode){render('.completion-title');return;}
  if (mode === 'speed') stopClock();
  const awardRound=roundAwardEvent();
  if(awardRound)awardEvent(awardRound);
  progress = recordSession(progress);
  if (!saveProgress(progress)) persistenceAvailable = false;
  render('.completion-title');
  announce(mode==='flashcards'&&session.isReview?
    'All selected cards reviewed. Your mastery has not changed.':
    'Round complete. Your revision progress has been updated.');
}
function flipCurrentFlashcard(){
  if(mode!=='flashcards'||!session||session.complete)return;
  session.revealed=!session.revealed;
  const current=session.items[session.index];
  const button=mount.querySelector('[data-action="flip"]');
  if(!button){render('[data-action="flip"]');return;}
  button.classList.toggle('is-flipped',session.revealed);
  button.setAttribute('data-flipped',String(session.revealed));
  button.setAttribute('aria-expanded',String(session.revealed));
  button.setAttribute('aria-label',flashCardLabel(session,current));
  button.querySelector('.flash-face-front')?.setAttribute('aria-hidden',String(session.revealed));
  button.querySelector('.flash-face-back')?.setAttribute('aria-hidden',String(!session.revealed));
  const gradePanel=mount.querySelector('.flash-grade-panel');
  if(gradePanel)gradePanel.hidden=!session.revealed;
  announce(session.revealed?'Answer: '+flashFaces(session,current).answer+
    '. Rate Again, Nearly or Know it.':'Prompt shown.');
}

function advanceFlash() {
  session.revealed = false;
  if (session.index === session.items.length - 1) finishRound();
  else { session.index += 1; render('[data-action="flip"]'); }
}
function matchTilePositions(){
  const map=new Map();
  for(const tile of mount.querySelectorAll('.match-board .match-tile')){
    map.set(tile.dataset.action+':'+tile.dataset.id,tile.getBoundingClientRect().top);
  }
  return map;
}
function animateMatchReflow(before){
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  for(const tile of mount.querySelectorAll('.match-board .match-tile')){
    const key=tile.dataset.action+':'+tile.dataset.id;
    if(!before.has(key)||typeof tile.animate!=='function')continue;
    const delta=before.get(key)-tile.getBoundingClientRect().top;
    if(Math.abs(delta)<2)continue;
    tile.animate([{transform:'translateY('+delta+'px)'},{transform:'translateY(0)'}],
      {duration:MATCH_MOTION_MS.settle,easing:'cubic-bezier(.2,.75,.23,1)'});
  }
}
function showMatchResolution(success,termId,definitionId){
  const board=mount.querySelector('.match-board');
  if(!board)return;
  board.classList.add('is-resolving',success?'is-confirming':'is-trying');
  board.setAttribute('aria-busy','true');
  const instruction=board.querySelector('.match-instruction-text');
  if(instruction)instruction.textContent=matchNextStep(session);
  for(const tile of board.querySelectorAll('.match-tile')){
    const chosen=(tile.dataset.action==='match-term'&&tile.dataset.id===termId)||
      (tile.dataset.action==='match-def'&&tile.dataset.id===definitionId);
    tile.setAttribute('aria-disabled','true');
    if(chosen){
      tile.setAttribute('aria-pressed','true');
      tile.classList.add('is-selected',success?'is-match-success':'is-match-error');
      const check=tile.querySelector('.match-tile-check');
      if(check)check.textContent=success?'✓':'!';
    }
  }
}
function selectMatch(side,id){
  if(mode!=='match'||!session||session.complete||session.resolving||session.matched.has(id))return;
  const next=chooseMatch(session,side,id);
  session.selectedTerm=next.selectedTerm;
  session.selectedDefinition=next.selectedDefinition;
  session.feedback='';
  if(!next.complete){
    const other=next.selectedTerm?'definition':next.selectedDefinition?'term':'term';
    render('[data-action="match-'+(other==='definition'?'def':'term')+'"]');
    announce(matchNextStep(session));
    return;
  }
  session.resolving=next.correct?'correct':'incorrect';
  showMatchResolution(next.correct,next.selectedTerm,next.selectedDefinition);
  const round=session;
  const duration=window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ?0:MATCH_MOTION_MS[session.resolving];
  matchSettleTimer=window.setTimeout(()=>{
    matchSettleTimer=null;
    // Ignore a delayed response from a game or topic the student has already left.
    if(mode!=='match'||session!==round||!session.resolving)return;
    const positions=next.correct?matchTilePositions():null;
    const termId=session.selectedTerm;
    const credit=matchAttemptCredit(session.exposedIds,termId,session.selectedDefinition);
    session.exposedIds=credit.exposed;
    if(next.correct){
      session.matched.add(termId);
      if(credit.independent)session.independentPairs++;
      remember(termId,credit.independent);
      session.feedback=credit.independent?'Correct pair. Well matched!':
        'Pair connected after an earlier mistake. A useful correction, but not first-try recall credit.';
      session.feedbackGood=true;
    }else{
      remember(termId,false);
      session.mistakes+=1;
      session.feedback='Not a match. Try to identify the exact defining feature.';
      session.feedbackGood=false;
    }
    session.selectedTerm=null;session.selectedDefinition=null;session.resolving=null;
    if(next.correct&&session.matched.size===session.terms.length){
      finishRound();
    }else{
      render('[data-action="match-term"]');
      if(positions)animateMatchReflow(positions);
      announce(next.correct?'Correct pair. '+session.matched.size+' of '+session.terms.length+' matched.':session.feedback);
    }
  },duration);
}

function resolveCloze(value, skipped=false) {
  if(mode!=='cloze'||clozeLevel==='choices'||session.complete||session.answered) return;
  const current=session.items[session.index];
  const result=skipped?{status:'wrong'}:gradeCloze(value,current);
  if(result.status==='empty') return;
  if(result.status==='typo'&&!session.typoRetry&&!skipped) {
    session.typoRetry=true;
    session.draft=value;
    render('#cloze-answer');
    announce('Very close. Check the spelling and submit again. Nothing has been marked yet.');
    return;
  }
  const correct=!skipped&&result.status==='correct';
  session.answered=true;
  session.draft=value;
  session.status=skipped?'skipped':correct?(session.hintUsed?'assisted':'correct'):'wrong';
  session.choice=value;
  // Helped recall teaches the answer but must not count as independent mastery.
  if(session.status==='correct') session.correct++;
  remember(current.conceptId,session.status==='correct');
  render('.cloze-panel .typed-feedback');
  announce(session.status==='correct'?'Correct. ':session.status==='assisted'?'Correct with a hint. ':
    'The missing word is '+current.answer+'.');
}

function onAction(button) {
  const command = button.dataset.action;
  if(command==='error-review'&&mode==='error'&&session?.complete&&!session.reviewMode&&session.missed.length){
  session={items:session.missed.map(id=>data.errors.find(q=>q.id===id)),index:0,correct:0,complete:false,answered:false,reviewMode:true,missed:[],errorStats:{located:0,repaired:0,explained:0},selectedLine:null,selectedRepair:null,selectedImpact:null};render('#exam-heading');return;
 }
 if(command.startsWith('reason-')&&mode==='reason'){reasoningUI.handle(command,button);return;}
  if(command.startsWith('sort-')&&mode==='sort'){sortUI.handle(command,button);return;}
  if(command.startsWith('sim-')){examSimulator.handle(command,button);return;}
  if(['build-move','build-check','build-reveal','build-next','error-check','error-next'].includes(command)){examAction(command,button);return;}
  if(command==='open-feedback'){experience.openFeedback();return;}
  if(command==='browse-solo'){
    const target=mount.querySelector('#games-title');
    target?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    target?.focus({preventScroll:true});
    return;
  }
  if (command === 'topic') {
    window.location.hash = hashFor(mode, button.dataset.topic);
    return;
  }
  if (command === 'reset') {
    if (window.confirm('Reset all saved Sampling Arcade progress on this browser? This cannot be undone.')) {
      progress = emptyProgress();
      const knowledgeCleared=clearProgress();
      const writingCleared=clearExamStore();
      persistenceAvailable=knowledgeCleared&&writingCleared;
      examStore = emptyExamStore();
      if(mode==='exam')restartGame();
      render();
      announce('Your saved revision progress was reset.');
    }
    return;
  }
  if (command === 'restart') {
    stopClock(); restartGame(); render('#view-heading');
    announce('New round started.');
    return;
  }
  if(command==='flash-browse'&&mode==='flashcards'){
    flashBrowseOpen=!flashBrowseOpen;
    render(flashBrowseOpen?'#flash-browser-title':'#view-heading');
    if(flashBrowseOpen)updateFlashLibrary();
    announce(flashBrowseOpen?'Browsing the full card library without changing progress.':'Returned to flashcards.');
    return;
  }
  if(command==='flash-library-reveal'&&mode==='flashcards'&&flashBrowseOpen){
    const cards=[...mount.querySelectorAll('.flash-library-card:not([hidden])')];
    const revealing=cards.some(card=>!card.open);
    for(const card of cards)card.open=revealing;
    button.textContent=revealing?'Hide all answers':'Reveal all answers';
    announce((revealing?'Revealed ':'Hidden ')+cards.length+' answers.');
    return;
  }
  if(command==='flash-review-all'&&mode==='flashcards'){
    flashBrowseOpen=false;
    session=makeFlashSession(makeFlashDeck(data.concepts,data.evaluations,topic),
      {reversed:session.reversed,isReview:true,reviewType:'all'});
    render('[data-action="flip"]');
    announce('Reviewing all '+session.items.length+' cards in order. This review does not change mastery.');
    return;
  }
  if(command==='flip'){flipCurrentFlashcard();return;}
  if (command === 'reverse') {
    const reversed = !session.reversed;
    restartGame();
    session.reversed = reversed;
    render('[data-action="reverse"]');
    announce(reversed ? 'Now practising definition to term.' : 'Now practising term to definition.');
    return;
  }
  if(command==='grade'&&mode==='flashcards'){
    if(!session.revealed)return;
    const grade=button.dataset.grade;
    const concept=session.items[session.index];
    session=rateFlashSession(session,grade);
    if(!session.isReview)remember(concept.id,grade==='know');
    advanceFlash();
    announce('Recall rated '+grade+'.');
    return;
  }
  if(command==='skip'&&mode==='flashcards'){
    session=skipFlashSession(session);
    advanceFlash();
    announce('Card marked to revisit.');
    return;
  }
  if(command==='flash-review'&&mode==='flashcards'&&session.complete){
    session=makeFlashReviewSession(session);
    render('[data-action="flip"]');
    announce('Reviewing '+session.items.length+' cards. Reveal each answer before rating.');
    return;
  }
  if (command === 'match-term' || command === 'match-def') {
    selectMatch(command === 'match-term' ? 'term' : 'definition', button.dataset.id);
    return;
  }
  if (command === 'classify-option') {
    answerClassification(button.dataset.choice);
    return;
  }
  if (command === 'classify-next') {
    nextClassification();
    return;
  }
  if (command === 'cloze-step-up' && mode === 'cloze') {
    const index=CLOZE_LEVELS.findIndex(level=>level.id===clozeLevel);
    if(index>=0&&index<CLOZE_LEVELS.length-1) clozeLevel=CLOZE_LEVELS[index+1].id;
    restartGame();render('#cloze-level');
    announce('Next level: '+CLOZE_LEVELS.find(level=>level.id===clozeLevel).label+'.');
    return;
  }
  if (command === 'cloze-hint' && mode === 'cloze' && clozeLevel === 'guided' && !session.answered) {
    session.hintUsed=true;
    render('#cloze-answer');
    announce('The first letter is '+session.items[session.index].answer.charAt(0)+'. This will be recorded as practice, not mastery.');
    return;
  }
  if (command === 'cloze-reveal') {
    resolveCloze('',true);
    return;
  }
  if (command === 'speed-start' && mode === 'speed' && !session.started) {
    session.started=true;
    session.lastTick=performance.now();
    render('#speed-answer');
    announce('Timed challenge started.');
    return;
  }
  if (command === 'speed-skip') {
    resolveSpeed('',true);
    return;
  }
  if(command==='speed-review'&&mode==='speed'&&session.complete&&session.reviewIds?.size){
    const items=speedReviewDeck(data.concepts,session.reviewIds);
    session={items,index:0,speedMode:'untimed',started:true,answered:false,
      draft:'',status:null,typoRetry:false,aliasUsed:false,
      remainingMs:0,lastTick:null,attempted:0,correct:0,skipped:0,
      complete:false,finishedReason:null,reviewMode:true,reviewIds:new Set()};
    render('#speed-answer');
    announce('Targeted review started. '+items.length+' terms to recall without clues.');
    return;
  }
  if(command==='speed-exit-review'&&mode==='speed'&&session.reviewMode){
    stopClock();restartGame();render('#view-heading');
    announce('Standard Speed Recall is ready.');
    return;
  }
  if (command === 'speed-next') {
    speedForward();
    return;
  }
  if (command === 'cloze-option') {
    if (session.answered) return;
    const current = session.items[session.index];
    session.choice = button.dataset.choice;
    session.answered = true;
    const correct = clozeCorrect(current, session.choice);
    session.status=correct?'correct':'wrong';
    if (correct) session.correct += 1;
    remember(current.conceptId, correct);
    render('[data-action="cloze-next"]');
    announce(correct ? 'Correct. ' + current.explanation : 'Not quite. Correct word: ' + current.answer + '. ' + current.explanation);
    return;
  }
  if (command === 'cloze-next') {
    if (session.index === session.items.length - 1) finishRound();
    else {
      session.index += 1;
      session.answered = false;
      session.choice = null;
      session.draft = '';
      session.status = null;
      session.hintUsed = false;
      session.typoRetry = false;
      render(clozeLevel==='choices'?'[data-action="cloze-option"]':'#cloze-answer');
      announce('Next question.');
    }
    return;
  }
  if (command === 'retry') loadData();
}
mobileMenuToggle.addEventListener('click',()=>{
  const expanded=headerNav.classList.toggle('is-open');
  mobileMenuToggle.setAttribute('aria-expanded',String(expanded));
  if(!expanded)activitiesMenu.open=false;
});
headerNav.addEventListener('click',event=>{
  const anchor=event.target.closest('a[href]');
  if(!anchor)return;
  if(anchor.matches('[data-progress-nav]')){
    event.preventDefault();
    progressJumpPending=true;
    const destination=hashFor('home',topic);
    closeHeaderMenus();
    if(window.location.hash===destination){
      progressJumpPending=false;
      focusProgressPanel();
    }else window.location.hash=destination;
    return;
  }
  closeHeaderMenus();
});
document.addEventListener('pointerdown',event=>{
  if(!document.querySelector('.site-header').contains(event.target))closeHeaderMenus();
});
document.addEventListener('focusin',event=>{
  // An expanded nav should not remain open when a keyboard user tabs away.
  if(!document.querySelector('.site-header').contains(event.target))closeHeaderMenus();
});
document.addEventListener('keydown',event=>{
  if(event.key!=='Escape'||(!activitiesMenu.open&&!headerNav.classList.contains('is-open')))return;
  event.preventDefault();
  const onMobile=headerNav.classList.contains('is-open');
  closeHeaderMenus();
  (onMobile?mobileMenuToggle:activitiesMenu.querySelector('summary')).focus();
});
document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  const main=document.getElementById('main');
  main.scrollIntoView({block:'start',behavior:'auto'});
  main.focus({preventScroll:true});
});
// Shortcuts only work within the live flashcard or its self-rating controls.
// Avoid intercepting inputs, site navigation or assistive technology modifiers.
mount.addEventListener('keydown',event=>{
  if(mode==='speed'&&session?.answered&&!session.complete&&
    event.key==='Enter'&&!event.repeat&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&
    event.target.matches('.speed-recall-panel .typed-feedback')){
    event.preventDefault();speedForward();return;
  }
  if(mode!=='flashcards'||!session?.revealed||session.complete||event.repeat||
     event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
  const target=event.target;
  if(!target.closest('.flashcard,.flash-grade-panel')||target.closest('input,textarea,select,[contenteditable]'))return;
  const choice={'1':'again','2':'nearly','3':'know'}[event.key];
  if(!choice)return;
  const button=mount.querySelector('[data-action="grade"][data-grade="'+choice+'"]');
  if(!button)return;
  event.preventDefault();
  button.click();
});
mount.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (button && !button.disabled) onAction(button);
});
mount.addEventListener('change',event=>{
 if(mode==='exam')examSimulator.onChange(event.target);
 const control=event.target;
 if(mode==='error'&&!session?.answered&&control.matches('input[data-error-line],input[data-error-repair],input[data-error-impact]')){
   if(control.dataset.errorLine!==undefined)session.selectedLine=Number(control.value);
   else if(control.dataset.errorRepair!==undefined)session.selectedRepair=control.value;
    else session.selectedImpact=control.value;
   render('input[name="'+control.name+'"]:checked');
 }
 if(mode==='reason')reasoningUI.onChange(control);
});
mount.addEventListener('input',event=>{
  if(mode==='exam')examSimulator.onInput(event.target);
  if(mode==='reason')reasoningUI.onInput(event.target);
  if(mode==='flashcards'&&flashBrowseOpen&&event.target.id==='flash-library-search')
    updateFlashLibrary();
  if(mode==='cloze'&&!session?.answered&&event.target.id==='cloze-answer'){
    session.draft=event.target.value;
    const blank=mount.querySelector('.cloze-blank');
    if(blank){
      const visual=clozePresentation(clozeLevel,session,session.items[session.index].answer);
      blank.textContent=visual.display;
      blank.classList.toggle('is-preview',visual.preview);
    }
  }
});
mount.addEventListener('submit', event => {
  const form=event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  if(form.dataset.form==='trial-feedback'&&mode==='home'){
    experience.submitFeedback(form);return;
  }
  if(form.dataset.form==='sim-numeric'&&mode==='exam'){
    examSimulator.submit(form);return;
  }
  const input=form.querySelector('input[name="answer"]');
  if(!input || !input.value.trim()) return;
  if(form.dataset.form==='cloze') resolveCloze(input.value);
  else if(form.dataset.form==='speed') resolveSpeed(input.value);
});
mount.addEventListener('change', event => {
  const control = event.target;
  if (!control.matches('select[data-control]')) return;
  if(control.dataset.control==='flash-library-filter'&&mode==='flashcards'&&flashBrowseOpen){
    updateFlashLibrary();return;
  }
  if(control.dataset.control==='build-method'&&mode==='build'){
    if(!data.methods.some(m=>m.id===control.value))return;buildMethodId=control.value;
  } else if(control.dataset.control==='exam-level'&&(mode==='error'||mode==='reason')){
    if(!EXAM_LEVELS.includes(control.value))return;examLevel=control.value;
  } else if(control.dataset.control==='case-length'&&(mode==='error'||mode==='reason')){
    const count=Number(control.value);
    const allowed=mode==='error'?ERROR_ROUND_LENGTHS:REASON_ROUND_LENGTHS;
    if(!allowed.includes(count))return;
    if(mode==='error')errorRoundLength=count;
    else reasonRoundLength=count;
  } else if (control.dataset.control === 'sort-round' && mode === 'sort') {
    if (!data.sortPairs.some(r => r.id === control.value)) return;
    sortRoundId = control.value;
  } else if (control.dataset.control === 'scenario-length' && mode === 'identify') {
    const length = Number(control.value);
    if (!ROUND_LENGTHS.includes(length)) return;
    scenarioLength = length;
  } else if (control.dataset.control === 'cloze-level' && mode === 'cloze') {
    if(!CLOZE_LEVELS.some(level=>level.id===control.value)) return;
    clozeLevel=control.value;
  } else if (control.dataset.control === 'speed-mode' && mode === 'speed') {
    if(!SPEED_MODES.includes(control.value)) return;
    speedMode=control.value;
  } else if (control.dataset.control === 'speed-duration' && mode === 'speed') {
    const duration=Number(control.value);
    if(!SPEED_DURATIONS.includes(duration)) return;
    speedDuration=duration;
  } else return;
  stopClock();
  restartGame();
  render('select[data-control="'+control.dataset.control+'"]');
  announce('A new round is ready.');
});
window.addEventListener('hashchange', () => { if (data) setRoute(); });
document.addEventListener('visibilitychange', () => {
  if(mode==='speed' && session?.speedMode==='timed') {
    session.lastTick=null; // Return to the same remaining time after switching tabs.
  }
});
async function loadData() {
  mount.replaceChildren(div('loading', 'Loading your revision activities…'));
  try {
    const sources = [
      ['concepts', 'concepts'], ['cloze', 'cloze'], ['evaluations', 'evaluations'],
      ['sort-rounds', 'rounds'], ['sort-pairs', 'pairs'], ['scenarios', 'scenarios'], ['methods', 'methods'],
      ['accepted-terms', 'terms'], ['exam-errors', 'errors'], ['exam-reasoning','reasoning'], ['exam-practice','questions']
    ];
    const responses = await Promise.all(sources.map(([name]) =>
      fetch(new URL('./content/' + name + '.json', document.baseURI))));
    if (responses.some(response => !response.ok)) throw new Error('The revision content could not be loaded.');
    const payloads = await Promise.all(responses.map(response => response.json()));
    data = Object.fromEntries(sources.map((source, i) => [source[1], payloads[i][source[1]]]));
    data.examQuestions=data.questions;
    delete data.questions;
    data.sortPairs=data.pairs;
    delete data.pairs;
    if (Object.entries(data).some(([key,items]) => key!=='terms' && !Array.isArray(items))) {
      throw new Error('Unexpected content format.');
    }
    if(!data.terms||typeof data.terms!=='object'||Array.isArray(data.terms)) {
      throw new Error('Invalid accepted terminology.');
    }
    data.acceptedTerms=data.terms;
    validateTermBank(data.concepts,data.acceptedTerms);
    validatePairBank(data.sortPairs,data.evaluations);
    if (data.rounds.length < 9 || data.scenarios.length < 20 || data.methods.length !== 5 || data.errors.length < 15 || data.reasoning.length < 9 || data.examQuestions.length < 32) {
      throw new Error('Incomplete sampling content.');
    }
    validateErrorBank(data.errors);
    validateReasonBank(data.reasoning);
    examStore=loadExamStore(data.examQuestions,data.methods);
    setRoute();
  } catch (error) {
    console.error('Sampling Arcade initialisation failed:', error);
    data = null;
    mount.replaceChildren(div('error-panel',
      heading(1, 'panel-title', 'We couldn’t load the questions.'),
      paragraph('', 'Please check your connection and try again. Your saved progress has not been changed.'),
      action('Try again', 'retry')
    ));
  }
}
loadData();
