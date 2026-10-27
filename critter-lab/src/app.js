import {
  LAYERS, STORAGE_KEY, NATURAL_COLOUR,
  assertManifest, avatarDescription, avatarName, defaultAvatar,
  normaliseAvatar, paletteLabel, parseStoredAvatar,
  randomAvatar, serialiseAvatar, titleCase
} from './model.js';

// Preserve a valid classroom code when returning from the optional creator.
const returnRoom = new URLSearchParams(window.location.search).get('room');
if (/^[0-9]{6}$/.test(returnRoom || '')) {
  const roomLink = document.querySelector('.lab-arcade-nav a[href="../multiplayer.html"]');
  if (roomLink) roomLink.href = `../multiplayer.html?room=${returnRoom}`;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const PART_ORDER = ['legs', 'body', 'head'];
const picture = document.getElementById('critter-picture');
const nameElement = document.getElementById('critter-name');
const descriptionElement = document.getElementById('critter-description');
const announcer = document.getElementById('announcer');
const saveMessage = document.getElementById('save-message');
const controls = document.getElementById('creator-controls');
const loading = document.getElementById('loading');
const loadError = document.getElementById('loading-error');
let manifest;
let avatar;
let sourceParts = new Map();
let ready = false;

function announce(message) { announcer.textContent = message; }
function labelOf(choice) { return titleCase(choice); }
function resourcePath(collection, id) { return `./assets/${collection}/${id}.svg`; }

function loadSavedAvatar() {
  try { return parseStoredAvatar(localStorage.getItem(STORAGE_KEY), manifest); }
  catch { return defaultAvatar(); }
}

function saveAvatar() {
  try {
    localStorage.setItem(STORAGE_KEY, serialiseAvatar(avatar, manifest));
    saveMessage.textContent = 'Saved on this device';
    document.querySelector('.save-line').dataset.status = 'saved';
    return true;
  } catch {
    saveMessage.textContent = 'Preview only · Storage unavailable';
    document.querySelector('.save-line').dataset.status = 'unavailable';
    return false;
  }
}

function validateSource(svg, collection, id) {
  const root = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
  if (root.localName !== 'svg' || root.namespaceURI !== SVG_NS || root.getAttribute('viewBox') !== '0 0 320 360') throw new Error(`Invalid SVG: ${collection}/${id}`);
  const elements = [root, ...root.querySelectorAll('*')];
  const allowedTags = new Set(['svg', 'title', 'desc', 'g', 'path', 'circle', 'ellipse']);
  const allowedAttributes = new Set([
    'xmlns', 'width', 'height', 'viewbox', 'role', 'aria-labelledby', 'id',
    'fill', 'stroke', 'stroke-linejoin', 'stroke-linecap', 'stroke-width',
    'd', 'cx', 'cy', 'rx', 'ry', 'r', 'opacity', 'transform'
  ]);
  for (const element of elements) {
    if (element.namespaceURI !== SVG_NS || !allowedTags.has(element.localName)) throw new Error(`Unsafe SVG element: ${collection}/${id}`);
    for (const attr of element.attributes) {
      const key = attr.name.toLowerCase();
      if ((!allowedAttributes.has(key) && !key.startsWith('data-')) || attr.value.includes('url(')) throw new Error(`Unsafe SVG attribute: ${collection}/${id}`);
    }
  }
  if (root.getAttribute('data-part-id') !== id || root.getAttribute('data-critter-part') !== collection) throw new Error(`Mismatched SVG: ${collection}/${id}`);
  return root;
}

async function loadAssets() {
  const response = await fetch('./manifest.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to fetch manifest');
  const loadedManifest = assertManifest(await response.json());
  const entries = LAYERS.flatMap(({ collection }) => loadedManifest.parts[collection].map(id => ({ collection, id })));
  const downloaded = await Promise.all(entries.map(async ({ collection, id }) => {
    const response = await fetch(resourcePath(collection, id));
    if (!response.ok) throw new Error(`Unable to load ${collection}/${id}`);
    return [`${collection}/${id}`, validateSource(await response.text(), collection, id)];
  }));
  manifest = loadedManifest;
  sourceParts = new Map(downloaded);
}

function buildLayer(layer) {
  const part = sourceParts.get(`${layer.collection}/${avatar[layer.key]}`);
  if (!part) throw new Error(`Missing ${layer.collection} asset`);
  const svg = document.importNode(part, true);
  svg.querySelectorAll('title, desc').forEach(node => node.remove());
  // The original part SVGs use repeated title/art IDs. Strip them for unique, decorative inline layers.
  svg.querySelectorAll('[id], [aria-labelledby]').forEach(node => { node.removeAttribute('id'); node.removeAttribute('aria-labelledby'); });
  svg.removeAttribute('id');
  svg.removeAttribute('aria-labelledby');
  svg.removeAttribute('role');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('avatar-layer');
  svg.dataset.layer = layer.key;
  const paletteId = avatar.colours[layer.key];
  if (paletteId !== NATURAL_COLOUR) {
    const palette = manifest.palettes[paletteId];
    svg.querySelectorAll('[data-color-slot]').forEach(node => {
      const slot = node.getAttribute('data-color-slot');
      if (Object.hasOwn(palette, slot)) node.setAttribute('fill', palette[slot]);
    });
    svg.querySelectorAll('[data-stroke-slot]').forEach(node => {
      const slot = node.getAttribute('data-stroke-slot');
      if (Object.hasOwn(palette, slot)) node.setAttribute('stroke', palette[slot]);
    });
  }
  return svg;
}

function renderPreview(animate = false) {
  const fragment = document.createDocumentFragment();
  for (const key of PART_ORDER) fragment.append(buildLayer(LAYERS.find(layer => layer.key === key)));
  picture.replaceChildren(fragment);
  picture.setAttribute('aria-label', `${labelOf(avatar.head)} head, ${labelOf(avatar.body)} body and ${labelOf(avatar.legs)} legs`);
  nameElement.textContent = avatarName(avatar);
  descriptionElement.textContent = avatarDescription(avatar);
  if (animate) {
    picture.classList.remove('pop');
    // Force a discrete animation restart after a rapid selection without delaying the new preview.
    void picture.offsetWidth;
    picture.classList.add('pop');
  }
}

function updateChoices() {
  for (const { key } of LAYERS) {
    document.getElementById(`${key}-selected`).textContent = labelOf(avatar[key]);
    document.getElementById(`${key}-colour-name`).textContent = paletteLabel(avatar.colours[key]);
    for (const button of document.getElementById(`${key}-options`).querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button.dataset.value === avatar[key]));
    }
    for (const button of document.getElementById(`${key}-colours`).querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button.dataset.value === avatar.colours[key]));
    }
  }
}

function changeAvatar(updated, announcement) {
  avatar = normaliseAvatar(updated, manifest);
  renderPreview(true);
  updateChoices();
  saveAvatar();
  announce(announcement);
}

function createPartButton(layer, id) {
  const button = document.createElement('button');
  button.className = 'part-option';
  button.type = 'button';
  button.dataset.value = id;
  button.setAttribute('aria-label', `${labelOf(id)} ${layer.title}`);
  button.setAttribute('aria-pressed', 'false');
  const image = document.createElement('img');
  image.src = resourcePath(layer.collection, id);
  image.alt = '';
  image.loading = 'eager';
  image.decoding = 'async';
  const label = document.createElement('span');
  label.textContent = labelOf(id);
  button.append(image, label);
  button.addEventListener('click', () => {
    changeAvatar({ ...avatar, [layer.key]: id }, `${labelOf(id)} ${layer.title} selected. Your critter is updated.`);
  });
  return button;
}

function createColourButton(layer, paletteId) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'colour-option';
  button.dataset.value = paletteId;
  button.setAttribute('aria-label', `${paletteLabel(paletteId)} ${layer.title} colour`);
  button.setAttribute('aria-pressed', 'false');
  button.title = paletteLabel(paletteId);
  if (paletteId === NATURAL_COLOUR) button.classList.add('is-natural');
  else button.style.setProperty('--swatch', manifest.palettes[paletteId].primary);
  const tick = document.createElement('span');
  tick.className = 'check-mark';
  tick.textContent = '✓';
  tick.setAttribute('aria-hidden', 'true');
  button.append(tick);
  button.addEventListener('click', () => {
    changeAvatar({ ...avatar, colours: { ...avatar.colours, [layer.key]: paletteId } }, `${paletteLabel(paletteId)} selected for ${layer.title}.`);
  });
  return button;
}

function buildControls() {
  const choices = [NATURAL_COLOUR, ...Object.keys(manifest.palettes)];
  for (const layer of LAYERS) {
    const group = document.getElementById(`${layer.key}-options`);
    const colours = document.getElementById(`${layer.key}-colours`);
    group.replaceChildren(...manifest.parts[layer.collection].map(id => createPartButton(layer, id)));
    colours.replaceChildren(...choices.map(palette => createColourButton(layer, palette)));
  }
}

function exportSvg() {
  if (!ready) return;
  const root = document.createElementNS(SVG_NS, 'svg');
  root.setAttribute('xmlns', SVG_NS);
  root.setAttribute('viewBox', manifest.viewBox.join(' '));
  root.setAttribute('width', '320');
  root.setAttribute('height', '360');
  root.setAttribute('role', 'img');
  root.setAttribute('aria-label', `${labelOf(avatar.head)} head, ${labelOf(avatar.body)} body and ${labelOf(avatar.legs)} legs`);
  const title = document.createElementNS(SVG_NS, 'title');
  title.textContent = avatarName(avatar);
  root.append(title);
  for (const svg of picture.querySelectorAll('.avatar-layer')) {
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('data-layer', svg.dataset.layer);
    for (const child of svg.children) group.append(document.importNode(child, true));
    root.append(group);
  }
  const xml = new XMLSerializer().serializeToString(root);
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `critter-${avatar.head}-${avatar.body}-${avatar.legs}.svg`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
  announce('Your critter artwork has been downloaded as an SVG.');
}

function setReady(value) {
  ready = value;
  loading.hidden = value;
  controls.hidden = !value;
  for (const id of ['surprise','reset','download']) document.getElementById(id).disabled = !value;
}

async function initialise() {
  loading.hidden = false;
  loadError.hidden = true;
  controls.hidden = true;
  try {
    await loadAssets();
    avatar = loadSavedAvatar();
    buildControls();
    renderPreview();
    updateChoices();
    saveAvatar();
    setReady(true);
    announce('Character parts are ready. Select a head, body and legs to build your critter.');
  } catch (error) {
    console.error('Critter Lab failed to initialise:', error);
    loading.hidden = true;
    loadError.hidden = false;
    setReady(false);
    loading.hidden = true;
  }
}

document.getElementById('surprise').addEventListener('click', () => {
  if (!ready) return;
  const next = randomAvatar(manifest, avatar);
  changeAvatar(next, `Surprise! Your new critter has a ${next.head} head, ${next.body} body and ${next.legs} legs.`);
});
document.getElementById('reset').addEventListener('click', () => {
  if (!ready) return;
  changeAvatar(defaultAvatar(), 'Back to the original Fox, Penguin and Frog.');
});
document.getElementById('download').addEventListener('click', exportSvg);
document.getElementById('retry').addEventListener('click', initialise);
initialise();