# Pass 0 — Faster, verifiable Sampling Arcade CI

## Purpose and baseline

The original main-branch **Test Sampling Arcade** run on 27 October 2026
(see Actions run `40455183233`) took approximately **7 minutes** from
creation to completion. Most of that time came from a long Chromium suite
that waited for content/unit checks to finish, while a separate fast
multiplayer job re-ran overlapping desktop tests. The separate
`content-validation.yml` also repeated validation already in
`npm run check`.

These timings are *baseline observations*, not a guaranteed new duration.
Compare the latest CI run's timestamp and shard durations after this
pass lands; do not claim any speed improvement without measured data.

## Updated automatic development checks

All checks run on pull requests and pushes to main:

1. **Content and unit tests** — Node 22, cached npm dependencies,
   reproducible `npm ci` using `package-lock.json`; runs all syntax
   checks, mathematical/content validation and Node unit tests, plus
   the exact Pages artifact build and backend-exclusion checks.
2. **Full Chromium desktop and mobile** — all Playwright tests divided
   between **three independent shards**, each with two Playwright
   workers and an isolated local Wrangler Durable Object. Includes
   multiplayer security, accessibility, reconnection, solo game
   regression and classroom-load tests. An aggregate
   `Chromium browser tests` check succeeds **only if all three
   shards pass**; none are omitted.
3. **Critter Lab 45-player visual and accessibility audit** — retains
   its special screenshot and full-class tests with a separate
   `CRITTER_VISUAL_AUDIT=1` run. This is not replaced by a small
   interface smoke.
4. **Cloudflare staging multiplayer smoke** — verifies the existing
   *deployed* staging service's room/WebSocket/scoring/avatars.
   This is a compatibility check only, **not evidence that the PR's
   Worker was deployed**.

Independent jobs start at once instead of waiting for the unit job;
the redundant desktop-only fast job and separately triggered content
workflow have been retired. Browser cache hits avoid unnecessary
Chromium downloads. Failure artifacts use shard-specific names.

The original required check name `Chromium browser tests` remains
available as an aggregation job, so previous main-branch status
requirements can continue to refer to it.

## Exact-revision Cloudflare Worker release gate

Deploying Cloudflare Workers from GitHub Actions requires credentials
which are **not currently configured** in this repository. A previous
attempt (old PR #38) failed because
`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` were empty.

Rather than disabling an important test or treating an old staging
deployment as the current code, the release step is now a *separate,
deliberately invoked* workflow:

**Actions → Verify exact-revision Cloudflare Worker → Run workflow**,
select the feature branch that contains the Worker you intend to
release.

Before the action can run successfully, configure these two GitHub
Actions repository secrets under
**Settings → Secrets and variables → Actions**:

- `CLOUDFLARE_API_TOKEN`: a token authorised to deploy the dedicated
  staging Worker; give it only the necessary permissions.
- `CLOUDFLARE_ACCOUNT_ID`: the target Cloudflare account identifier.

Never commit either value, print them in logs or reuse the
production classroom room identifiers. Secret values are not available
to this workflow until supplied by the repository owner.

The release workflow:

1. Checks out the exact workflow-selected Git revision (`github.sha`).
2. Installs pinned npm dependencies.
3. **Fails visibly** if either required secret is missing.
4. Deploys `multiplayer/wrangler.stage.jsonc` to the isolated
   `sampling-arcade-multiplayer-stage` service with
   `BUILD_SHA=${{ github.sha }}`.
5. Checks that the remote Worker reports **that exact SHA**.
6. Runs existing room/WebSocket/avatars smoke tests and
   all-four-game Blitz plus Bullseye/Perfect Run tests against
   the *deployed* Worker.

The stage migration is `v1` SQLite Durable Object, and staging
uses its own Worker name and storage. The production Worker and rooms
are not touched by staging deployment.

**Release policy:** For a Worker-changing feature, do not deploy
the production Worker or merge it as a release until the full
automatic PR tests have passed *and* its exact revision has passed
the staging release workflow (or a documented equivalent exact-SHA
staging deployment verified with the same scripts). The automatic
PR suite alone is not presented as proof of remote revision match.

For non-Worker changes, the automatic tests are the normal PR gate.
The release workflow intentionally does not deploy on every PR edit:
repeated staging deploys would be expensive, could collide, and
would fail until the credentials exist.

## Regression safeguards

- No mathematical content tests, desktop/mobile test specs, or
  45-participant classroom-load tests removed.
- Playwright shards run against local Wrangler
  `multiplayer/wrangler.test.jsonc`, whose high test quota cannot be
  enabled for production URLs. Production rate limits remain intact.
- `tests/browser/ui-pass3.spec.js` waits for asynchronous Cloze UI
  elements before checking contrast (previously a mobile flake).
- All release smoke scripts continue rejecting wrong revision SHAs.
- Pages publishing is still separate, and the static build explicitly
  excludes private Worker grading code.

## Follow-up measurements

Record for the first green post-merge run:
**content/unit duration, each of the three browser shard durations,
aggregator result, special Critter audit duration, full workflow
elapsed time, cache-hit rates and any flaky tests**. Compare against
the approximately 7-minute baseline. Optimize further only when
supported by those measurements, not by dropping vital tests.

## Next development pass

After this process is merged, use **Pass 4 — Class Quest** for shared
classroom goals with fair participation rules. Keep changes in one
reviewable milestone PR and use the manual exact-revision gate for
Cloudflare Worker releases.
