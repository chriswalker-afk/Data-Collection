// Pass 2 game models; every question comes from the audited Pass 0 JSON bank.
import { shuffled } from './core.js';

export const METHOD_ORDER = Object.freeze([
  'simple-random','systematic','stratified','quota','opportunity'
]);
export const METHOD_LABELS = Object.freeze({
  'simple-random': 'Simple random sampling',
  'systematic': 'Systematic sampling',
  'stratified': 'Stratified sampling',
  'quota': 'Quota sampling',
  'opportunity': 'Opportunity sampling'
});
export const SORT_LABELS = Object.freeze({
  'sort-census': 'Census',
  'sort-sample': 'Sample',
  'sort-srs': 'Simple random sampling',
  'sort-systematic': 'Systematic sampling',
  'sort-stratified': 'Stratified sampling',
  'sort-quota': 'Quota sampling',
  'sort-opportunity': 'Opportunity sampling',
  'compare-quota-stratified': 'Stratified vs quota',
  'compare-simple-systematic': 'Simple random vs systematic'
});
export const ROUND_LENGTHS = Object.freeze([5, 10, 20]);
export function categoryLabel(value) {
  if (value === 'advantage') return 'Advantage';
  if (value === 'disadvantage') return 'Disadvantage';
  return METHOD_LABELS[value] || value;
}
export function conceptIdForSubject(subject, methods) {
  if (subject === 'sample' || subject === 'census') return subject;
  const method = methods.find(item => item.id === subject);
  if (!method) throw new Error('Unknown sampling method subject: ' + subject);
  return method.conceptId;
}
export function makeSortRound(rounds, evaluations, id, random = Math.random) {
  const selected = rounds.find(round => round.id === id);
  if (!selected) throw new Error('Unknown sorting round: ' + id);
  if (selected.type === 'polarity') {
    const byId = new Map(evaluations.map(item => [item.id, item]));
    const cards = selected.evaluationIds.map(key => {
      const evaluation = byId.get(key);
      if (!evaluation || evaluation.subject !== selected.subject) {
        throw new Error('Missing or mismatched evaluation: ' + key);
      }
      return {
        id: evaluation.id,
        prompt: evaluation.claim,
        correctCategory: evaluation.polarity,
        explanation: evaluation.explanation,
        conceptSubject: evaluation.subject
      };
    });
    return { round: selected, items: shuffled(cards, random) };
  }
  if (selected.type === 'comparison') {
    const cards = selected.cards.map((card, index) => {
      if (!selected.categories.includes(card.answer)) throw new Error('Invalid comparison answer');
      return {
        id: selected.id + ':' + index,
        prompt: card.prompt,
        correctCategory: card.answer,
        explanation: card.why,
        conceptSubject: card.answer
      };
    });
    return { round: selected, items: shuffled(cards, random) };
  }
  throw new Error('Unknown sorting type: ' + selected.type);
}
export function makeScenarioRound(scenarios, length = 10, random = Math.random) {
  if (!ROUND_LENGTHS.includes(length)) throw new Error('Scenario round length must be 5, 10 or 20');
  const each = length / METHOD_ORDER.length;
  const selected = METHOD_ORDER.flatMap(method => {
    const pool = shuffled(scenarios.filter(s => s.correctMethod === method), random);
    if (pool.length < each) throw new Error('Too few scenarios for ' + method);
    return pool.slice(0, each);
  });
  return shuffled(selected, random);
}
