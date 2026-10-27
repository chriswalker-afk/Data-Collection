import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {roomCreationRateLimits} from '../multiplayer/rules.js';

const normal={perClient:24,global:120};
test('production and Cloudflare staging keep the original anti-abuse limits',()=>{
 for(const env of [{},{LOCAL_TEST_MODE:'0'},{LOCAL_TEST_MODE:'1'}]){
  for(const url of [
   'https://sampling-arcade-multiplayer.chris-walker-d8b.workers.dev/rooms',
   'https://sampling-arcade-races-pass3-test.chris-walker-d8b.workers.dev/rooms'
  ])assert.deepEqual(roomCreationRateLimits(env,url),normal);
 }
});
test('even local connections use production limits without an explicit test binding',()=>{
 assert.deepEqual(roomCreationRateLimits({},'http://127.0.0.1:8787/rooms'),normal);
 assert.deepEqual(roomCreationRateLimits({LOCAL_TEST_MODE:'1'},'http://localhost:8787/rooms'),normal);
});
test('only 127.0.0.1 with the explicit Playwright binding can create many rooms',()=>{
 const limits=roomCreationRateLimits({LOCAL_TEST_MODE:'1'},'http://127.0.0.1:8787/rooms');
 assert.ok(limits.perClient>=300);
 assert.ok(limits.global>=1000);
});
test('the production Wrangler config never enables local test quotas',()=>{
 const production=readFileSync('multiplayer/wrangler.jsonc','utf8');
 const local=readFileSync('multiplayer/wrangler.test.jsonc','utf8');
 assert.doesNotMatch(production,/LOCAL_TEST_MODE/);
 assert.match(local,/"LOCAL_TEST_MODE": "1"/);
 assert.match(local,/"name": "sampling-arcade-multiplayer-playwright"/);
});
