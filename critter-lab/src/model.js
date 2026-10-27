/** Critter Lab's pure, dependency-free configuration and validation logic. */
export const STORAGE_KEY = 'critter-lab.avatar.v1';
export const VERSION = 1;
export const LAYERS = Object.freeze([
  Object.freeze({ key: 'head', collection: 'heads', title: 'head' }),
  Object.freeze({ key: 'body', collection: 'bodies', title: 'body' }),
  Object.freeze({ key: 'legs', collection: 'legs', title: 'legs' })
]);
export const NATURAL_COLOUR = 'original';

const NAMES = Object.freeze({
  fox: 'Foxy', frog: 'Hoppy', panda: 'Panda', owl: 'Owly', rabbit: 'Bouncy',
  cat: 'Whiskers', penguin: 'Chilly', dino: 'Dino'
});
const BODY_NAMES = Object.freeze({
  penguin: 'Waddler', dino: 'Stomper', bear: 'Hugger', cat: 'Pouncer',
  flamingo: 'Fluffster', owl: 'Glider'
});
const COLOURS = Object.freeze({
  'sunset-orange': 'Sunset orange', 'honey-yellow': 'Honey yellow',
  'leaf-green': 'Leaf green', 'ocean-teal': 'Ocean teal',
  'grape-purple': 'Grape purple', 'blossom-pink': 'Blossom pink',
  original: 'Original'
});

export function titleCase(value) {
  return String(value).split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
export function paletteLabel(key) { return COLOURS[key] || titleCase(key); }
export function avatarName(avatar) {
  return `${NAMES[avatar.head] ?? titleCase(avatar.head)} ${BODY_NAMES[avatar.body] ?? titleCase(avatar.body)}`;
}
export function avatarDescription(avatar) {
  return `${titleCase(avatar.head)} head · ${titleCase(avatar.body)} body · ${titleCase(avatar.legs)} legs`;
}
export function defaultAvatar() {
  return {
    version: VERSION,
    head: 'fox', body: 'penguin', legs: 'frog',
    colours: { head: NATURAL_COLOUR, body: NATURAL_COLOUR, legs: NATURAL_COLOUR }
  };
}

/** Reject unexpected values but preserve independently valid choices from old/corrupt records. */
export function normaliseAvatar(value, manifest) {
  const fallback = defaultAvatar();
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== VERSION) return fallback;
  const result = defaultAvatar();
  for (const { key, collection } of LAYERS) {
    if (typeof value[key] === 'string' && manifest.parts[collection].includes(value[key])) result[key] = value[key];
    const candidate = value.colours && typeof value.colours === 'object' && !Array.isArray(value.colours) ? value.colours[key] : undefined;
    if (candidate === NATURAL_COLOUR || (typeof candidate === 'string' && Object.hasOwn(manifest.palettes, candidate))) result.colours[key] = candidate;
  }
  return result;
}

/** Only versioned, allowlisted identifiers are ever serialized. */
export function serialiseAvatar(value, manifest) {
  return JSON.stringify(normaliseAvatar(value, manifest));
}

export function parseStoredAvatar(text, manifest) {
  if (typeof text !== 'string' || text.length > 1024) return defaultAvatar();
  try { return normaliseAvatar(JSON.parse(text), manifest); } catch { return defaultAvatar(); }
}

function pick(options, rng) {
  const sample = Number(rng());
  // Also tolerate buggy test random providers without producing out-of-range indices.
  const ratio = Number.isFinite(sample) ? Math.min(Math.max(sample, 0), 0.999999999999) : 0;
  return options[Math.floor(ratio * options.length)];
}

/** Mix each animal part and its palette separately; never send user text or SVG. */
export function randomAvatar(manifest, previous = null, rng = Math.random) {
  const avatar = { version: VERSION, colours: {} };
  for (const {key, collection} of LAYERS) {
    avatar[key] = pick(manifest.parts[collection], rng);
    avatar.colours[key] = pick([NATURAL_COLOUR, ...Object.keys(manifest.palettes)], rng);
  }
  if (previous && serialiseAvatar(previous, manifest) === serialiseAvatar(avatar, manifest)) {
    const options = manifest.parts.heads;
    avatar.head = options[(options.indexOf(avatar.head) + 1) % options.length];
  }
  return avatar;
}

/** Fail closed if a modified manifest tries to introduce remote resource paths/unsafe colours. */
export function assertManifest(manifest) {
  if (!manifest || !manifest.parts || !manifest.palettes || !Array.isArray(manifest.viewBox)) throw new Error('Manifest is incomplete');
  const idPattern = /^[a-z][a-z0-9-]{0,31}$/;
  for (const { collection } of LAYERS) {
    const ids = manifest.parts[collection];
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 32 || new Set(ids).size !== ids.length || !ids.every(x => typeof x === 'string' && idPattern.test(x))) throw new Error(`Invalid ${collection} catalogue`);
  }
  const palettes = Object.entries(manifest.palettes);
  if (palettes.length < 1 || palettes.length > 20 || !palettes.every(([name, slots]) => idPattern.test(name) && slots && typeof slots === 'object' && ['primary','light','dark','belly','accent','spot','blush'].every(s => /^#[\da-f]{6}$/i.test(slots[s])))) throw new Error('Invalid colour palettes');
  if (manifest.viewBox.join(' ') !== '0 0 320 360') throw new Error('Incompatible avatar artboard');
  return manifest;
}