import {
  TOPICS, GAMES, topicLabel, conceptsInTopic, clozeInTopic,
  makeMatchRound, shuffled, splitCloze, clozeCorrect, routeFromHash, hashFor, isSamplingOnlyGame
} from './core.js';
import {
  emptyProgress, loadProgress, saveProgress, clearProgress,
  recordAnswer, recordSession, progressForTopic
} from './progress.js';
import {
  METHOD_ORDER, METHOD_LABELS, SORT_LABELS, ROUND_LENGTHS,
  categoryLabel, conceptIdForSubject, makeSortRound, makeScenarioRound
} from './phase2.js';

const mount = document.getElementById('app');
const announcer = document.getElementById('announcer');
let data = null;
let progress = loadProgress();
let persistenceAvailable = true;
let topic = 'sampling';
let mode = 'home';
let session = null;
let sortRoundId = 'sort-srs';
let scenarioLength = 10;

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
function span(cls, text) { return element('span', { className: cls }, text); }
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
  const symbol = { flashcards: '▧', match: '⇄', cloze: '✎', sort: '↕', identify: '?' }[game.id];
  const card = link('', hashFor(game.id, topic), 'game-card');
  card.append(
    div('game-card-top', span('game-number', game.number + ' / REVISE'), icon(symbol, 'game-icon')),
    heading(3, 'game-card-title', game.title),
    paragraph('game-card-description', game.description),
    div('game-card-foot', span('', (isSamplingOnlyGame(game.id) ? 'Sampling only · ' : '') + game.subtitle), icon('↗'))
  );
  return card;
}
function homeView() {
  const root = div('page page-home');
  const hero = element('section', { className: 'hero' });
  const copy = div('hero-content',
    span('kicker', 'YEAR 12 / STATISTICS / EDEXCEL 9MA0'),
    heading(1, 'hero-title', 'Learn the language.'),
    heading(2, 'hero-subtitle', 'Understand the method.'),
    paragraph('hero-description', 'Little revision games, carefully worded definitions, and useful feedback. Build recall before you tackle exam questions.'),
    div('hero-actions',
      link('Start flashcards ' + '↗', hashFor('flashcards', topic), 'btn btn-primary hero-button'),
      link('Try Match Up', hashFor('match', topic), 'btn btn-quiet hero-button')
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
  root.append(hero);
  const topicSection = element('section', { className: 'section section-topic', 'aria-labelledby': 'topic-title' });
  topicSection.append(
    div('section-top', div('', span('eyebrow', 'MAKE IT YOURS'), heading(2, 'section-title', 'What are you revising?', { id: 'topic-title' })),
      paragraph('section-note', 'The first three games cover both topics. The new games focus on sampling.')),
    topicPicker()
  );
  root.append(topicSection);
  const gameSection = element('section', { className: 'section games-section', 'aria-labelledby': 'games-title' });
  gameSection.append(
    div('section-top', div('', span('eyebrow', 'FIVE WAYS TO LEARN'), heading(2, 'section-title', 'Choose a challenge', { id: 'games-title' })),
      paragraph('section-note', 'A different way to practise the same mathematics.')),
    div('games-grid', GAMES.map(gameCard))
  );
  root.append(gameSection);
  const bottom = div('bottom-grid');
  const stats = progressForTopic(progress, data.concepts, topic);
  const progressCard = element('section', { className: 'panel progress-panel', 'aria-labelledby': 'progress-title' });
  progressCard.append(
    span('eyebrow', 'YOUR REVISION'),
    heading(2, 'panel-title', 'Progress at a glance', { id: 'progress-title' }),
    metaBar(),
    paragraph('mastery-explainer', 'Mastery means two correct responses in a row, across the games.'),
    div('summary-numbers',
      div('', heading(3, 'stat-number', String(stats.answers)), paragraph('stat-label', 'Answers recorded')),
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
  root.append(bottom);
  if (!persistenceAvailable) root.append(paragraph('storage-notice', 'Local storage is unavailable. You can still play, but your progress may not remain after closing this page.'));
  return root;
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
      ? div('activity-scope', 'Sampling methods only · Revise types of data in the first three games.')
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
function showCompletion(game) {
  const gameTitle = GAMES.find(g => g.id === game).title;
  const scoreLine = game === 'flashcards' ? session.correct + ' confident recalls out of ' + session.items.length + ' cards'
    : game === 'match' ? 'All ' + session.terms.length + ' pairs matched · ' + session.mistakes + ' incorrect attempts'
    : game === 'sort' ? session.correct + ' of ' + session.items.length + ' statements sorted correctly'
    : game === 'identify' ? session.correct + ' of ' + session.items.length + ' scenarios identified correctly'
    : session.correct + ' correct answers out of ' + session.items.length;
  return div('completed-screen',
    div('completion-badge', icon('✓'), span('', 'Round complete')),
    heading(2, 'completion-title', 'Nicely done. Keep it going.', { tabindex: '-1' }),
    paragraph('completion-description', gameTitle + ' · ' + topicLabel(topic)),
    paragraph('completion-score', scoreLine),
    metaBar(),
    div('complete-actions',
      action('Play another round ↻', 'restart', {}, 'btn btn-primary'),
      link('Back to arcade', hashFor('home', topic), 'btn btn-quiet')
    )
  );
}
function flashcardView() {
  const root = div('page activity-page');
  root.append(activityTop('flashcards'));
  if (session.complete) { root.append(showCompletion('flashcards')); return root; }
  const current = session.items[session.index];
  const face = session.reversed ? current.definition : current.label;
  const answer = session.reversed ? current.label : current.definition;
  const counter = session.index + 1;
  const controls = div('round-controls',
    roundProgress(counter, session.items.length, 'Card ' + counter + ' of ' + session.items.length),
    action(session.reversed ? 'Definition → term' : 'Term → definition', 'reverse', { 'aria-pressed': session.reversed }, 'btn btn-quiet btn-small')
  );
  root.append(controls);
  const card = element('section', { className: 'flash-area', 'aria-label': 'Current flashcard' });
  const faceButton = action('', 'flip', { 'aria-expanded': session.revealed }, 'flashcard');
  faceButton.append(
    span('flash-overline', session.reversed ? 'WHICH TERM MATCHES?' : 'RECALL THIS DEFINITION'),
    span('flash-front', face),
    span('flash-reveal-label', session.revealed ? 'Tap to hide answer ↑' : 'Tap to reveal answer ↓')
  );
  card.append(faceButton);
  if (session.revealed) {
    const body = div('flash-answer',
      span('eyebrow', 'MODEL ANSWER'),
      heading(2, 'answer-main', answer),
      div('flash-detail',
        div('flash-detail-item', span('detail-label', 'Example'), paragraph('', current.example)),
        div('flash-detail-item', span('detail-label', 'Watch out'), paragraph('', current.misconception))
      )
    );
    if (!session.reversed) {
      body.insertBefore(div('phrase-row', span('detail-label', 'Key ideas'), ...current.keyPhrases.map(k => span('phrase-chip', k))), body.querySelector('.flash-detail'));
    }
    card.append(body);
    card.append(
      div('grade-wrap',
        paragraph('grade-prompt', 'How well did you remember it? “Know it” counts towards mastery.'),
        div('grade-options',
          action('Again', 'grade', { 'data-grade': 'again' }, 'btn btn-grade btn-again'),
          action('Nearly', 'grade', { 'data-grade': 'nearly' }, 'btn btn-grade btn-nearly'),
          action('Know it ✓', 'grade', { 'data-grade': 'know' }, 'btn btn-grade btn-know')
        )
      )
    );
  } else {
    card.append(div('card-undertext', icon('↳'), paragraph('', 'Try to say the full definition before revealing it.')));
  }
  root.append(card, div('activity-bottom', action('Skip this card →', 'skip', {}, 'text-button')));
  return root;
}
function matchView() {
  const root = div('page activity-page');
  root.append(activityTop('match'));
  if (session.complete) { root.append(showCompletion('match')); return root; }
  const complete = session.matched.size;
  root.append(
    div('round-controls', roundProgress(complete, session.terms.length, 'Pairs matched'),
      span('quiet-tag', session.mistakes + ' to revisit')),
    paragraph('game-instructions', 'Choose a term and the definition that matches it. Correct pairs disappear.')
  );
  const termCol = div('match-column');
  const defCol = div('match-column');
  termCol.append(heading(2, 'match-column-label', 'Terms'));
  defCol.append(heading(2, 'match-column-label', 'Definitions'));
  for (const item of session.terms.filter(c => !session.matched.has(c.id))) {
    const chosen = session.selectedTerm === item.id;
    termCol.append(action(item.label, 'match-term', {
      'data-id': item.id, 'aria-pressed': chosen
    }, 'match-tile term-tile' + (chosen ? ' is-selected' : '')));
  }
  for (const item of session.definitions.filter(c => !session.matched.has(c.id))) {
    const chosen = session.selectedDefinition === item.id;
    defCol.append(action(item.definition, 'match-def', {
      'data-id': item.id, 'aria-pressed': chosen
    }, 'match-tile definition-tile' + (chosen ? ' is-selected' : '')));
  }
  root.append(div('match-columns', termCol, defCol));
  if (session.feedback) root.append(div('inline-feedback' + (session.feedbackGood ? ' correct' : ' incorrect'), icon(session.feedbackGood ? '✓' : '!'), paragraph('', session.feedback)));
  return root;
}
function clozeView() {
  const root = div('page activity-page');
  root.append(activityTop('cloze'));
  if (session.complete) { root.append(showCompletion('cloze')); return root; }
  const current = session.items[session.index];
  const parts = splitCloze(current.prompt);
  const number = session.index + 1;
  root.append(div('round-controls', roundProgress(number, session.items.length, 'Question ' + number + ' of ' + session.items.length),
    span('quiet-tag', session.correct + ' correct')));
  const question = element('section', { className: 'cloze-panel', 'data-question-id': current.id, 'aria-labelledby': 'cloze-title' });
  question.append(
    span('eyebrow', 'COMPLETE THE DEFINITION'),
    heading(2, 'cloze-title', 'Which word belongs in the gap?', { id: 'cloze-title' }),
    div('cloze-sentence', parts[0], span('cloze-blank', session.answered ? current.answer : '________'), parts[1]),
    paragraph('choose-note', 'Choose one answer.')
  );
  const options = div('cloze-options');
  const choices = session.options[current.id];
  for (const choice of choices) {
    const selected = session.choice === choice;
    const correct = clozeCorrect(current, choice);
    const stateClass = session.answered && correct ? ' is-correct' : session.answered && selected ? ' is-incorrect' : '';
    options.append(action(choice, 'cloze-option', { 'data-choice': choice, disabled: session.answered ? true : false },
      'option-button' + stateClass));
  }
  question.append(options);
  if (session.answered) {
    const correct = clozeCorrect(current, session.choice);
    question.append(
      div('inline-feedback' + (correct ? ' correct' : ' incorrect'), icon(correct ? '✓' : '!'),
        div('', heading(3, 'feedback-heading', correct ? 'Exactly right.' : 'Not quite — ' + current.answer + ' is correct.'),
          paragraph('', current.explanation))
      ),
      div('next-row', action(number === session.items.length ? 'Finish round →' : 'Next question →', 'cloze-next', {}, 'btn btn-primary'))
    );
  }
  root.append(question);
  return root;
}

function sortSetPicker() {
  const wrap = div('game-settings');
  const label = element('label', { for: 'sort-set', className: 'game-settings-label' }, 'Choose a sorting set');
  const select = element('select', { id: 'sort-set', className: 'game-select', 'data-control': 'sort-round' });
  const groups = [
    ['Census and sample', data.rounds.filter(r => r.type === 'polarity' && (r.subject === 'census' || r.subject === 'sample'))],
    ['Sampling methods', data.rounds.filter(r => r.type === 'polarity' && r.subject !== 'census' && r.subject !== 'sample')],
    ['Compare methods', data.rounds.filter(r => r.type === 'comparison')]
  ];
  for (const [labelText, choices] of groups) {
    const group = element('optgroup', { label: labelText });
    for (const item of choices) {
      group.append(element('option', { value: item.id, selected: item.id === sortRoundId },
        SORT_LABELS[item.id] || item.id));
    }
    select.append(group);
  }
  wrap.append(label, select);
  return wrap;
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
    span('eyebrow', kind === 'identify' ? 'READ THE SCENARIO' : comparison ? 'COMPARE THE METHODS' : 'EVALUATE THE METHOD'),
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
    const feedback = div('inline-feedback classification-feedback' + (right ? ' correct' : ' incorrect'),
      icon(right ? '✓' : '!'),
      div('',
        heading(3, 'feedback-heading', (right ? 'Correct — ' : 'Not quite — ') + categoryLabel(correctAnswer) + '.', { tabindex: '-1' }),
        paragraph('', kind === 'identify' ? item.reason : item.explanation),
        ...(kind === 'identify' ? [paragraph('feedback-contrast', item.contrast)] : [])
      )
    );
    feedback.setAttribute('tabindex', '-1');
    root.append(
      feedback,
      div('next-row',
        action(number === session.items.length ? 'Finish round →' : 'Next question →',
          'classify-next', {}, 'btn btn-primary'))
    );
  }
  return root;
}
function sortView() {
  const root = div('page activity-page');
  root.append(activityTop('sort'), sortSetPicker());
  if (session.complete) { root.append(showCompletion('sort')); return root; }
  const number = session.index + 1;
  root.append(
    div('round-controls',
      roundProgress(number, session.items.length, 'Statement ' + number + ' of ' + session.items.length),
      span('quiet-tag', session.correct + ' correct')
    ),
    paragraph('game-instructions', session.round.type === 'comparison'
      ? 'These contrasts distinguish two similar methods. Select the method described.'
      : 'Classify each claim for the named method. Some strengths and limitations also apply to other methods.'),
    classificationCard('sort')
  );
  return root;
}
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
    paragraph('game-instructions', 'Each round includes all five sampling methods. Read how the participants or items were chosen.'),
    classificationCard('identify')
  );
  return root;
}
function answerClassification(choice) {
  if (session.answered || session.complete) return;
  const item = session.items[session.index];
  const answer = mode === 'sort' ? item.correctCategory : item.correctMethod;
  const concept = conceptIdForSubject(
    mode === 'sort' ? item.conceptSubject : item.correctMethod, data.methods);
  const right = choice === answer;
  session.choice = choice;
  session.answered = true;
  if (right) session.correct += 1;
  remember(concept, right);
  render('.classification-feedback');
  const explanation = mode === 'identify' ? item.reason : item.explanation;
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

function render(focusTarget) {
  if (!data) return;
  navSync();
  const views = { home: homeView, flashcards: flashcardView, match: matchView, cloze: clozeView,
    sort: sortView, identify: identifyView };
  const view = (views[mode] || homeView)();
  mount.replaceChildren(view);
  if (focusTarget) {
    requestAnimationFrame(() => {
      const target = mount.querySelector(focusTarget) || mount.querySelector('#view-heading');
      target?.focus({ preventScroll: true });
    });
  }
}
function restartGame() {
  if (mode === 'flashcards') {
    session = { items: shuffled(conceptsInTopic(data.concepts, topic)), index: 0, revealed: false,
      reversed: false, correct: 0, complete: false };
  } else if (mode === 'match') {
    const round = makeMatchRound(data.concepts, topic);
    session = { ...round, matched: new Set(), selectedTerm: null, selectedDefinition: null,
      mistakes: 0, feedback: '', feedbackGood: false, complete: false };
  } else if (mode === 'cloze') {
    const items = shuffled(clozeInTopic(data.cloze, data.concepts, topic));
    const options = Object.fromEntries(items.map(q => [q.id, shuffled(q.choices)]));
    session = { items, options, index: 0, choice: null, answered: false, correct: 0, complete: false };
  } else if (mode === 'sort') {
    const round = makeSortRound(data.rounds, data.evaluations, sortRoundId);
    session = { ...round, items: round.items, index: 0, choice: null, answered: false,
      correct: 0, complete: false };
  } else if (mode === 'identify') {
    session = { items: makeScenarioRound(data.scenarios, scenarioLength), index: 0,
      choice: null, answered: false, correct: 0, complete: false };
  } else session = null;
}
function setRoute() {
  const route = routeFromHash(window.location.hash);
  const changed = route.mode !== mode || route.topic !== topic || !session && route.mode !== 'home';
  mode = route.mode;
  topic = route.topic;
  if (changed) restartGame();
  render(changed && mode !== 'home' ? '#view-heading' : null);
}
function remember(conceptId, correct) {
  progress = recordAnswer(progress, conceptId, correct);
  if (!saveProgress(progress)) persistenceAvailable = false;
}
function finishRound() {
  if (session.complete) return;
  session.complete = true;
  progress = recordSession(progress);
  if (!saveProgress(progress)) persistenceAvailable = false;
  render('.completion-title');
  announce('Round complete. Your revision progress has been updated.');
}
function advanceFlash() {
  session.revealed = false;
  if (session.index === session.items.length - 1) finishRound();
  else { session.index += 1; render('[data-action="flip"]'); }
}
function selectMatch(side, id) {
  if (session.matched.has(id)) return;
  if (side === 'term') session.selectedTerm = id;
  else session.selectedDefinition = id;
  if (session.selectedTerm && session.selectedDefinition) {
    const right = session.selectedTerm === session.selectedDefinition;
    const currentId = session.selectedTerm;
    if (right) {
      session.matched.add(currentId);
      remember(currentId, true);
      session.feedback = 'Correct pair. Well matched!';
      session.feedbackGood = true;
      session.selectedTerm = null;
      session.selectedDefinition = null;
      announce('Correct pair. ' + session.matched.size + ' of ' + session.terms.length + ' matched.');
      if (session.matched.size === session.terms.length) { finishRound(); return; }
      render('[data-action="match-term"]');
    } else {
      remember(currentId, false);
      session.mistakes += 1;
      session.feedback = 'Not a match. Try to identify the exact defining feature.';
      session.feedbackGood = false;
      session.selectedTerm = null;
      session.selectedDefinition = null;
      render('[data-action="match-term"]');
      announce(session.feedback);
    }
  } else {
    session.feedback = '';
    render(side === 'term' ? '[data-action="match-def"]' : '[data-action="match-term"]');
  }
}
function onAction(button) {
  const command = button.dataset.action;
  if (command === 'topic') {
    window.location.hash = hashFor(mode, button.dataset.topic);
    return;
  }
  if (command === 'reset') {
    if (window.confirm('Reset all saved Sampling Arcade progress on this browser? This cannot be undone.')) {
      progress = emptyProgress();
      persistenceAvailable = clearProgress();
      render();
      announce('Your saved revision progress was reset.');
    }
    return;
  }
  if (command === 'restart') {
    restartGame(); render('#view-heading');
    announce('New round started.');
    return;
  }
  if (command === 'flip') {
    session.revealed = !session.revealed;
    render('[data-action="flip"]');
    announce(session.revealed ? 'Answer revealed.' : 'Answer hidden.');
    return;
  }
  if (command === 'reverse') {
    const reversed = !session.reversed;
    restartGame();
    session.reversed = reversed;
    render('[data-action="reverse"]');
    announce(reversed ? 'Now practising definition to term.' : 'Now practising term to definition.');
    return;
  }
  if (command === 'grade') {
    const grade = button.dataset.grade;
    const concept = session.items[session.index];
    remember(concept.id, grade === 'know');
    if (grade === 'know') session.correct += 1;
    advanceFlash();
    announce('Recall rated ' + grade + '.');
    return;
  }
  if (command === 'skip') {
    advanceFlash(); announce('Card skipped.');
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
  if (command === 'cloze-option') {
    if (session.answered) return;
    const current = session.items[session.index];
    session.choice = button.dataset.choice;
    session.answered = true;
    const correct = clozeCorrect(current, session.choice);
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
      render('[data-action="cloze-option"]');
      announce('Next question.');
    }
    return;
  }
  if (command === 'retry') loadData();
}
document.querySelector('.skip-link').addEventListener('click', event => {
  event.preventDefault();
  document.getElementById('main').focus();
});
mount.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (button && !button.disabled) onAction(button);
});
mount.addEventListener('change', event => {
  const control = event.target;
  if (!control.matches('select[data-control]')) return;
  if (control.dataset.control === 'sort-round' && mode === 'sort') {
    if (!data.rounds.some(r => r.id === control.value)) return;
    sortRoundId = control.value;
  } else if (control.dataset.control === 'scenario-length' && mode === 'identify') {
    const length = Number(control.value);
    if (!ROUND_LENGTHS.includes(length)) return;
    scenarioLength = length;
  } else return;
  restartGame();
  render('select[data-control]');
  announce('A new round is ready.');
});
window.addEventListener('hashchange', () => { if (data) setRoute(); });
async function loadData() {
  mount.replaceChildren(div('loading', 'Loading your revision activities…'));
  try {
    const sources = [
      ['concepts', 'concepts'], ['cloze', 'cloze'], ['evaluations', 'evaluations'],
      ['sort-rounds', 'rounds'], ['scenarios', 'scenarios'], ['methods', 'methods']
    ];
    const responses = await Promise.all(sources.map(([name]) =>
      fetch(new URL('./content/' + name + '.json', document.baseURI))));
    if (responses.some(response => !response.ok)) throw new Error('The revision content could not be loaded.');
    const payloads = await Promise.all(responses.map(response => response.json()));
    data = Object.fromEntries(sources.map((source, i) => [source[1], payloads[i][source[1]]]));
    if (Object.values(data).some(items => !Array.isArray(items))) throw new Error('Unexpected content format.');
    if (data.rounds.length < 9 || data.scenarios.length < 20 || data.methods.length !== 5) {
      throw new Error('Incomplete sampling content.');
    }
    setRoute();
  } catch {
    data = null;
    mount.replaceChildren(div('error-panel',
      heading(1, 'panel-title', 'We couldn’t load the questions.'),
      paragraph('', 'Please check your connection and try again. Your saved progress has not been changed.'),
      action('Try again', 'retry')
    ));
  }
}
loadData();
