// Precise, testable typed-answer engine for Pass 3. No automatic typo credit.
import { conceptsInTopic, shuffled } from './core.js';

export const CLOZE_LEVELS = Object.freeze([
  { id: 'choices', label: 'Recognise', description: 'Choose from four words.' },
  { id: 'guided', label: 'Recall', description: 'Type the missing word. A first-letter hint is available.' },
  { id: 'independent', label: 'Independent', description: 'Type the answer without a word bank or hint.' }
]);
export const SPEED_MODES = Object.freeze(['untimed', 'timed']);
export const SPEED_DURATIONS = Object.freeze([30, 60, 90]);

export function normalizeAnswer(text) {
  return String(text ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase('en-GB')
    .replace(/[‐‑–—-]/g, ' ')
    .replace(/[.,!?;:()'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Distance is capped at 2 for efficiency; adjacent transpositions count as one typo.
// A near miss must be retyped correctly and cannot itself contribute to mastery.
export function oneTypoAway(first, second) {
  const a = normalizeAnswer(first);
  const b = normalizeAnswer(second);
  if (a.length < 6 || b.length < 6 || Math.abs(a.length-b.length) > 1 || a === b) return false;
  if (a.length === b.length) {
    const diffs = [];
    for (let i=0; i<a.length; i++) if (a[i] !== b[i]) diffs.push(i);
    return diffs.length === 1 ||
      (diffs.length === 2 && diffs[1] === diffs[0]+1 &&
       a[diffs[0]] === b[diffs[1]] && a[diffs[1]] === b[diffs[0]]);
  }
  const short = a.length < b.length ? a : b;
  const long = a.length > b.length ? a : b;
  let i=0,j=0,skips=0;
  while (i<short.length && j<long.length) {
    if (short[i] === long[j]) {i++;j++;}
    else {skips++; j++; if (skips>1) return false;}
  }
  return true;
}

export function acceptedForConcept(concept, overrides) {
  const terms = [concept.label, ...(overrides[concept.id] ?? [])].map(normalizeAnswer).filter(Boolean);
  return [...new Set(terms)];
}

export function validateTermBank(concepts, overrides) {
  const allIds = new Set(concepts.map(c => c.id));
  const owner = new Map();
  for (const id of Object.keys(overrides)) {
    if (!allIds.has(id)) throw new Error('Unknown accepted-term concept: '+id);
    if (!Array.isArray(overrides[id])) throw new Error('Expected alias list for '+id);
  }
  for (const concept of concepts) {
    for (const term of acceptedForConcept(concept, overrides)) {
      if (owner.has(term) && owner.get(term) !== concept.id) {
        throw new Error('Ambiguous alias "'+term+'" ('+owner.get(term)+' / '+concept.id+')');
      }
      owner.set(term, concept.id);
    }
  }
  return owner;
}

// status: correct, typo, wrong, empty. Typo is a prompt to correct, not credit.
export function gradeTyped(text, expectedTerms, reservedTerms = new Map()) {
  const input = normalizeAnswer(text);
  const expected = [...new Set(expectedTerms.map(normalizeAnswer).filter(Boolean))];
  if (!input) return {status:'empty'};
  if (expected.includes(input)) return {status:'correct', alias:input !== expected[0]};
  if (reservedTerms.has(input)) return {status:'wrong'};
  if (expected.some(answer => oneTypoAway(input,answer))) return {status:'typo'};
  return {status:'wrong'};
}

export function gradeTerm(text, concept, overrides, allConcepts) {
  const reserved = validateTermBank(allConcepts, overrides);
  return gradeTyped(text, acceptedForConcept(concept, overrides), reserved);
}

export function gradeCloze(text, question) {
  return gradeTyped(text, [question.answer]);
}

export function speedDeck(concepts, topic, random = Math.random, maxUntimed = 10) {
  const pool = conceptsInTopic(concepts,topic);
  if (!pool.length) throw new Error('No concepts for speed recall');
  return shuffled(pool,random).slice(0,Math.min(maxUntimed,pool.length));
}

export function secondsRemaining(milliseconds) {
  return Math.ceil(Math.max(0,milliseconds)/1000);
}
export function formatClock(milliseconds) {
  const total = secondsRemaining(milliseconds);
  return String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0');
}
