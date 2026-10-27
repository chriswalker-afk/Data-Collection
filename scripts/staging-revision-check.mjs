// Run only after deploying the exact checked-out Worker revision to staging.
// This is intentionally separate from the fast PR pipeline until GitHub Actions
// has real Cloudflare credentials; green compatibility tests alone never prove
// that the PR's Worker was deployed.
import assert from 'node:assert/strict';

const api=(process.env.MULTIPLAYER_API||'').replace(/\/$/,'');
const expected=process.env.EXPECTED_BUILD_SHA||'';
assert.equal(api,'https://sampling-arcade-multiplayer-stage.chris-walker-d8b.workers.dev',
  'Exact-revision verification must target the isolated staging Worker');
assert.match(expected,/^[0-9a-f]{40}$/,'Expected an exact 40-character git SHA');
const response=await fetch(api+'/health',{signal:AbortSignal.timeout(15000)});
assert.equal(response.status,200,'Staging health endpoint unavailable');
const state=await response.json();
assert.equal(state.ok,true);
assert.equal(state.buildSha,expected,'Staging Worker does not match the checked-out revision');
assert.equal(state.transport,'websocket');
assert.ok(Array.isArray(state.games)&&state.games.length>=4,'Missing audited mathematical activities');
console.log('Verified exact Cloudflare Worker staging revision: '+expected);
