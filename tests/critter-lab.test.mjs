import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  LAYERS, NATURAL_COLOUR, STORAGE_KEY, VERSION, assertManifest, avatarDescription,
  avatarName, defaultAvatar, normaliseAvatar, paletteLabel,
  parseStoredAvatar, randomAvatar, serialiseAvatar, titleCase
} from '../critter-lab/src/model.js';
const manifest = JSON.parse(readFileSync(join(import.meta.dirname, '../critter-lab/manifest.json'), 'utf8'));

test('validates the production manifest and fixed dimensions', () => {
  assert.strictEqual(assertManifest(manifest), manifest);
  assert.deepEqual(manifest.viewBox, [0,0,320,360]);
  assert.equal(LAYERS.length, 3);
  assert.equal(STORAGE_KEY, 'critter-lab.avatar.v1');
  assert.equal(VERSION, 1);
  assert.equal(NATURAL_COLOUR, 'original');
});
test('presents a predictable, offline default with all three parts', () => {
  const a = defaultAvatar();
  assert.deepEqual(a, { version:1, head:'fox', body:'penguin', legs:'frog', colours:{head:'original',body:'original',legs:'original'} });
  assert.equal(avatarName(a), 'Foxy Waddler');
  assert.equal(avatarDescription(a), 'Fox head · Penguin body · Frog legs');
  assert.equal(paletteLabel('ocean-teal'), 'Ocean teal');
  assert.equal(titleCase('sunset-orange'), 'Sunset Orange');
});
test('round-trips a valid avatar without retaining arbitrary fields', () => {
  const raw={version:1,head:'owl',body:'cat',legs:'flamingo',colours:{head:'grape-purple',body:'leaf-green',legs:'sunset-orange'},unused:'private information'};
  const safe=normaliseAvatar(raw,manifest);
  assert.deepEqual(safe,{version:1,head:'owl',body:'cat',legs:'flamingo',colours:{head:'grape-purple',body:'leaf-green',legs:'sunset-orange'}});
  assert.deepEqual(JSON.parse(serialiseAvatar(raw,manifest)),safe);
  assert.deepEqual(parseStoredAvatar(serialiseAvatar(raw,manifest),manifest),safe);
});
test('recovers gracefully from corrupted, oversized and incompatible data', () => {
  for(const input of [null,undefined,'', '{unclosed', 'x'.repeat(1025), '[]', '{"version":99}', JSON.stringify({version:1,head:'../../evil',body:'cat',legs:'alien',colours:{head:'garbage',body:'leaf-green',legs:'original'}})]){
    const result=parseStoredAvatar(input,manifest);
    assert.ok(manifest.parts.heads.includes(result.head));
    assert.ok(manifest.parts.bodies.includes(result.body));
    assert.ok(manifest.parts.legs.includes(result.legs));
    for(const key of ['head','body','legs']) assert.ok(result.colours[key]==='original'||Object.hasOwn(manifest.palettes,result.colours[key]));
  }
  const partiallyValid=normaliseAvatar({version:1,head:'fake',body:'dino',legs:'frog',colours:{head:'#ff0000',body:'ocean-teal',legs:42}},manifest);
  assert.equal(partiallyValid.head,'fox');
  assert.equal(partiallyValid.body,'dino');
  assert.equal(partiallyValid.colours.head,'original');
  assert.equal(partiallyValid.colours.body,'ocean-teal');
});
test('randomiser covers animal parts and independent palettes, avoids duplicate', () => {
  const a=randomAvatar(manifest,null,()=>0);
  const b=randomAvatar(manifest,a,()=>0);
  assert.equal(a.head,manifest.parts.heads[0]);
  assert.notEqual(b.head,a.head);
  for(const key of ['head','body','legs']) assert.equal(a.colours[key],'original');
  const c=randomAvatar(manifest,a,()=>1);
  assert.equal(c.head,manifest.parts.heads.at(-1));
  assert.equal(c.colours.head,Object.keys(manifest.palettes).at(-1));
  assert.deepEqual(normaliseAvatar(c,manifest),c);
});
test('rejects malicious or incompatible manifests', () => {
  const copy=()=>structuredClone(manifest);
  const evil=copy();evil.parts.heads[0]='../../evil.svg';
  assert.throws(()=>assertManifest(evil));
  const duplicate=copy();duplicate.parts.legs[0]='duck';duplicate.parts.legs[1]='duck';
  assert.throws(()=>assertManifest(duplicate));
  const remote=copy();remote.palettes['sunset-orange'].primary='url(https://evil.test)';
  assert.throws(()=>assertManifest(remote));
  const wrongCanvas=copy();wrongCanvas.viewBox=[0,0,100,100];
  assert.throws(()=>assertManifest(wrongCanvas));
});
test('all 288 combinations and 62,208 independent-colour variants normalise correctly', () => {
  const paletteKeys=Object.keys(manifest.palettes);
  let combos=0, variants=0;
  for(const head of manifest.parts.heads) for(const body of manifest.parts.bodies) for(const legs of manifest.parts.legs){
    combos++;
    for(const h of paletteKeys) for(const b of paletteKeys) for(const l of paletteKeys){
      const raw={version:1,head,body,legs,colours:{head:h,body:b,legs:l}};
      const safe=normaliseAvatar(raw,manifest);
      assert.deepEqual(safe,raw);
      variants++;
    }
  }
  assert.equal(combos,288);
  assert.equal(variants,62208);
});