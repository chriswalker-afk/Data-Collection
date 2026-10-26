export const TOPICS = Object.freeze([
  { id: 'sampling', label: 'Sampling', description: 'Censuses, frames, methods and sampling variation.' },
  { id: 'data', label: 'Types of data', description: 'Qualitative, quantitative, classes and variables.' },
  { id: 'all', label: 'Mixed revision', description: 'Bring the two topics together.' }
]);
export const GAMES = Object.freeze([
  { id: 'flashcards', title: 'Flashcards', subtitle: 'Recall the language', description: 'Reveal each definition, then grade your recall.', number: '01' },
  { id: 'match', title: 'Match Up', subtitle: 'Connect the pairs', description: 'Match terms to their definitions, one pair at a time.', number: '02' },
  { id: 'cloze', title: 'Missing Words', subtitle: 'Fill the gaps', description: 'Identify the essential word in an Edexcel-aligned sentence.', number: '03' },
  { id: 'sort', title: 'Sort It!', subtitle: 'Compare two methods', description: 'Drag mixed advantages and disadvantages into the correct column for each of two sampling methods.', number: '04' },
  { id: 'identify', title: 'Which Method?', subtitle: 'Apply the definitions', description: 'Identify the method used in realistic sampling scenarios.', number: '05' },
  { id: 'speed', title: 'Speed Recall', subtitle: 'Type from memory', description: 'Type the mathematical term from its definition, with or without a timer.', number: '06' },
  { id: 'build', title: 'Build the Method', subtitle: 'Sequence the steps', description: 'Put the five sampling procedures into a valid examination order.', number: '07' },
  { id: 'error', title: 'Spot the Error', subtitle: 'Find and correct it', description: 'Diagnose inaccurate sampling instructions and choose the correct repair.', number: '08' },
  { id: 'reason', title: 'Contextual Reasoning', subtitle: 'Make a defensible choice', description: 'Build a justified response with a limitation and an improvement.', number: '09' },
  { id: 'exam', title: 'Exam Lab', subtitle: 'Mixed examination practice', description: 'Combine numerical calculations, full methods and contextual evaluation.', number: '10' }
]);
// Deliberately share the same activity IDs as existing routes and student progress keys.
export const ACTIVITY_STAGES = Object.freeze([
  { id: 'recall', number: '01', title: 'Learn & Remember',
    subtitle: 'Build the vocabulary you need for accurate mathematical explanations.',
    games: ['flashcards','match','cloze','speed'] },
  { id: 'apply', number: '02', title: 'Apply & Choose',
    subtitle: 'Identify sampling methods and weigh up how they work.',
    games: ['sort','identify'] },
  { id: 'explain', number: '03', title: 'Explain & Evaluate',
    subtitle: 'Write clearer procedures, diagnose mistakes and justify decisions.',
    games: ['build','error','reason'] },
  { id: 'exam', number: '04', title: 'Exam Lab',
    subtitle: 'Bring calculations, methods and evaluation together in one mixed paper.',
    games: ['exam'] }
]);
export function topicLabel(id) { return TOPICS.find(t => t.id === id)?.label || TOPICS[0].label; }
export function isTopic(id) { return TOPICS.some(t => t.id === id); }
export function isGame(id) { return GAMES.some(g => g.id === id); }
export function isSamplingOnlyGame(id) { return ['sort','identify','build','error','reason','exam'].includes(id); }
export function effectiveTopic(mode, topic) {
  return isSamplingOnlyGame(mode) ? 'sampling' : (isTopic(topic) ? topic : 'sampling');
}
export function shuffled(values, random = Math.random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function conceptsInTopic(concepts, topic) {
  return topic === 'all' ? [...concepts] : concepts.filter(item => item.module === topic);
}
export function clozeInTopic(cloze, concepts, topic) {
  const ids = new Set(conceptsInTopic(concepts, topic).map(item => item.id));
  return cloze.filter(item => ids.has(item.conceptId));
}
export function makeMatchRound(concepts, topic, random = Math.random, count = 5) {
  const pool = conceptsInTopic(concepts, topic);
  const picks = shuffled(pool, random).slice(0, Math.min(count, pool.length));
  if (picks.length < 2) throw new Error('At least two terms are needed to make a match.');
  const definitions = shuffled(picks, random);
  if (definitions.some((item, i) => item.id === picks[i].id)) {
    // A cyclic shift avoids accidental same-row clues while keeping each answer unique.
    definitions.splice(0, definitions.length, ...picks.slice(1), picks[0]);
  }
  return { terms: picks, definitions };
}
export function splitCloze(prompt) {
  const parts = prompt.split('{{blank}}');
  if (parts.length !== 2) throw new Error('A missing-word prompt needs exactly one blank.');
  return parts;
}
export function normalizeKeyword(value) {
  return String(value ?? '').trim().toLocaleLowerCase('en-GB').replace(/\s+/g, ' ');
}
export function clozeCorrect(question, choice) {
  return normalizeKeyword(question.answer) === normalizeKeyword(choice);
}
export function routeFromHash(hash) {
  const path = String(hash || '').replace(/^#\/?/, '').split('/');
  const mode = isGame(path[0]) ? path[0] : 'home';
  const topicCandidate = mode === 'home' ? (path[0] === 'home' ? path[1] : path[0]) : path[1];
  return { mode, topic: effectiveTopic(mode, topicCandidate) };
}
export function hashFor(mode, topic) {
  const safeMode = isGame(mode) ? mode : 'home';
  return '#/' + safeMode + '/' + effectiveTopic(safeMode, topic);
}
