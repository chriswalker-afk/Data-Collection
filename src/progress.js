export const STORAGE_KEY = 'sampling-arcade-progress-v1';
export function emptyProgress() {
  return { version: 1, answers: 0, sessions: 0, concepts: {} };
}
function nonnegativeInt(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}
export function sanitizeProgress(value) {
  if (!value || value.version !== 1 || typeof value !== 'object') return emptyProgress();
  const result = emptyProgress();
  result.answers = nonnegativeInt(value.answers);
  result.sessions = nonnegativeInt(value.sessions);
  const source = value.concepts && typeof value.concepts === 'object' && !Array.isArray(value.concepts) ? value.concepts : {};
  for (const [id, entry] of Object.entries(source)) {
    if (!/^[a-z0-9-]{1,80}$/.test(id) || !entry || typeof entry !== 'object') continue;
    const attempts = nonnegativeInt(entry.attempts);
    const correct = Math.min(attempts, nonnegativeInt(entry.correct));
    const streak = Math.min(correct, nonnegativeInt(entry.streak));
    result.concepts[id] = { attempts, correct, streak };
  }
  return result;
}
export function loadProgress(storage) {
  try {
    const source = storage ?? globalThis.localStorage;
    const raw = source.getItem(STORAGE_KEY);
    return raw ? sanitizeProgress(JSON.parse(raw)) : emptyProgress();
  } catch {
    // Privacy modes and corrupt values must not break the games.
    return emptyProgress();
  }
}
export function saveProgress(progress, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(STORAGE_KEY, JSON.stringify(sanitizeProgress(progress)));
    return true;
  } catch { return false; }
}
export function clearProgress(storage) {
  try { (storage ?? globalThis.localStorage).removeItem(STORAGE_KEY); return true; }
  catch { return false; }
}
export function recordAnswer(progress, conceptId, correct) {
  if (!/^[a-z0-9-]{1,80}$/.test(conceptId)) throw new Error('Invalid concept identifier.');
  const next = sanitizeProgress(progress);
  const current = next.concepts[conceptId] || { attempts: 0, correct: 0, streak: 0 };
  next.concepts[conceptId] = {
    attempts: current.attempts + 1,
    correct: current.correct + (correct ? 1 : 0),
    streak: correct ? current.streak + 1 : 0
  };
  next.answers += 1;
  return next;
}
// Observing a model or self-reviewing prose is practice, not a wrong answer.
// Count the exposure so the student can see their work, but preserve any
// previously earned independent-recall streak (and never create new credit).
export function recordPractice(progress, conceptId) {
  if (!/^[a-z0-9-]{1,80}$/.test(conceptId)) throw new Error('Invalid concept identifier.');
  const next = sanitizeProgress(progress);
  const current = next.concepts[conceptId] || { attempts: 0, correct: 0, streak: 0 };
  next.concepts[conceptId] = {
    attempts: current.attempts + 1,
    correct: current.correct,
    streak: current.streak
  };
  next.answers += 1;
  return next;
}
export function recordSession(progress) {
  const next = sanitizeProgress(progress);
  next.sessions += 1;
  return next;
}
export function progressForTopic(progress, concepts, topic) {
  const rows = topic === 'all' ? concepts : concepts.filter(c => c.module === topic);
  const p = sanitizeProgress(progress);
  return {
    total: rows.length,
    practiced: rows.filter(c => (p.concepts[c.id]?.attempts || 0) > 0).length,
    mastered: rows.filter(c => {
      const record = p.concepts[c.id];
      return record && record.correct >= 2 && record.streak >= 2;
    }).length,
    answers: p.answers,
    sessions: p.sessions
  };
}
