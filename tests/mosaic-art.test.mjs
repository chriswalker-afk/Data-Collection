import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {
  MOSAIC_ARTWORKS,MOSAIC_GOALS,MOSAIC_TEAM_NAMES,
  mosaicArtwork,mosaicGeometry,mosaicTilePlan
} from '../multiplayer/mosaic-art.js';

test('all three class artwork themes are deterministic and use no external image source',()=>{
  assert.equal(mosaicArtwork('000000').id,'garden');
  assert.equal(mosaicArtwork('000001').id,'reef');
  assert.equal(mosaicArtwork('000002').id,'stars');
  for(const code of ['000000','000001','000002','123456','987654']){
    const original=mosaicArtwork(code);
    assert.strictEqual(mosaicArtwork(code),original);
    assert.ok(original.description.length>20);
  }
  assert.equal(mosaicArtwork('bad').id,'garden');
  assert.deepEqual(MOSAIC_ARTWORKS.map(scene=>scene.id),['garden','reef','stars']);
  for(const scene of MOSAIC_ARTWORKS){
    const file=new URL('../styles/mosaic-'+scene.id+'.svg',import.meta.url);
    assert.ok(existsSync(file),scene.id);
    const svg=readFileSync(file,'utf8');
    assert.match(svg,/viewBox="0 0 1600 900"/);
    assert.match(svg,/<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    assert.doesNotMatch(svg,/<script|https?:\/\/(?!www\.w3\.org\/2000\/svg)|onload\s*=/i);
  }
});
test('6, 10, 15 tile layouts reconstruct complete 16:9 illustration without overlaps',()=>{
  for(const goal of MOSAIC_GOALS){
    const {columns,rows}=mosaicGeometry(goal);
    assert.equal(columns*rows,goal);
    const plan=mosaicTilePlan(goal,[]);
    assert.equal(plan.length,goal);
    assert.ok(plan.every(tile=>!tile.unlocked&&tile.teamId===null));
    assert.equal(new Set(plan.map(tile=>tile.backgroundPosition)).size,goal);
    assert.ok(plan.every(tile=>tile.backgroundSize===columns*100+'% '+rows*100+'%'));
    assert.equal(plan[0].backgroundPosition,'0% 0%');
    assert.equal(plan.at(-1).backgroundPosition,'100% 100%');
    const filled=mosaicTilePlan(goal,
      Array.from({length:goal},(_,i)=>({index:i,teamId:Object.keys(MOSAIC_TEAM_NAMES)[i%2]})));
    assert.equal(filled.filter(t=>t.unlocked).length,goal);
  }
  assert.throws(()=>mosaicGeometry(7),/Unsupported/);
});
test('unknown teams, duplicate, negative and forged tiles cannot reveal picture pieces',()=>{
  const hostile=[
    {index:-1,teamId:'vector'},{index:99,teamId:'vector'},
    {index:0,teamId:'unknown'},{index:1,teamId:'vector'},
    {index:1,teamId:'sigma'},{index:2,teamId:'__proto__'},
    {index:NaN,teamId:'vector'},{index:3.14,teamId:'vector'},
    null,{}, {index:4,teamId:'delta',correct:true,points:999999}
  ];
  const tiles=mosaicTilePlan(6,hostile);
  assert.equal(tiles.filter(tile=>tile.unlocked).length,2);
  assert.equal(tiles[1].teamId,'vector');
  assert.equal(tiles[4].teamId,'delta');
  assert.equal(tiles[0].unlocked,false);
  assert.equal(tiles[2].unlocked,false);
  assert.ok(tiles.every(t=>!Object.hasOwn(t,'correct')&&!Object.hasOwn(t,'points')));
});
test('the public mural renderer and ceremony cannot import private Worker grading',()=>{
  for(const file of ['relay-ui.js','mosaic-art-ui.js','mosaic-art.js','ceremony-ui.js']){
    const source=readFileSync(new URL('../multiplayer/'+file,import.meta.url),'utf8');
    assert.doesNotMatch(source,/from\s+['"]\.\/(?:relay-rules|relay-bank|relay-adapter|worker)\.js['"]/);
  }
  const published=readFileSync(new URL('../scripts/build-pages.mjs',import.meta.url),'utf8');
  assert.match(published,/mosaic-art-ui\.js/);
  assert.match(published,/relay-bank\.js/);
  assert.match(published,/Worker backend must not be deployed to Pages/);
});
