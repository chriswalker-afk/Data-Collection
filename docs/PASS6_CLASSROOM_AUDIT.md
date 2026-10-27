# Sampling Arcade — Arena 2.0 Pass 6 classroom release audit

## Scope

Pass 6 refines the previously deployed, server-authoritative Puzzle Relay and Class Mosaic with three original illustrated murals, piece-by-piece picture reveals, noncompetitive cooperative ceremony, critter reactions, clearer teacher bottleneck controls, and a labelled, accessible student role panel.

The underlying room state, grading rules, access tokens, 45-student cap, one-use submissions, timed finishes, reconnect assignments and Cloudflare Durable Object bindings are **unchanged**. Only the Worker awards each tile.

## Automated release gates

- npm run check: mathematical content, Node syntax and unit tests including artwork geometry, invalid tiles, source isolation, and theme determinism.
- node scripts/build-pages.mjs: publish only safe modules and all three SVG murals; never ship relay-bank, relay-rules, relay-adapter or worker.
- All three Chromium desktop/mobile shards: existing modes and new art/reactions/teacher controls.
- Real Worker integration: forged commands rejected; teacher-only role reopen; wrong/duplicate attempts never award a tile; all three checked roles unlock one tile; all teams must contribute before victory.
- Real 45-student / four-team / 15-tile room: full checked completion and picture/roster at 320, 390, 768, 1920 px without overflow.
- 320 px touch client: same mural as host, accessible question group, saved identity and role after reload.
- Reduced motion: no tile reveal or mascot cheer animation when the device prefers reduced motion.
- Full ceremony: same picture and verified team contributions, every class critter in finale, no invented winner or individual podium for Mosaic.
- Existing Classic, Blitz, Bullseye, Perfect Run, Class Quest and Critter Lab checks all stay green.
- Confirm the deployed GitHub Pages and production Worker revisions after merging. Since Pass 6 does not modify backend source, do **not** replace the existing Durable Object namespace.

## Practical supervised pilot (after automated release)

1. Prepare a teacher/projector device and mixed phone/laptop browsers, using nicknames only.
2. Host Class Mosaic / Puzzle Relay with two teams, six tiles and a short safety clock. Verify team readiness before starting.
3. Ask teammates to discuss Discover, Evaluate and Improve; each student submits their own assigned piece.
4. Check that the picture reveals **one tile** only after three checked pieces. Try a wrong answer and teacher reset.
5. Reload a student tab, then reconnect another. Confirm role, checked feedback and team membership survive.
6. Inspect the teacher pulse on projector and pupil view on a narrow phone. Verify mathematical text and controls remain readable.
7. End one round before the goal; finish another. The incomplete ceremony must not declare victory, and the successful ceremony must recognise all teams and display the same picture.
8. Visit Classic, Class Quest and Critter Lab as regression spot checks.

Record date, device/browser, mode, step, expected and observed behaviour, and whether refreshing resolves the issue. Never include student names, room tokens, credentials or identifying screenshots in reports.

## Release / rollback

The feature PR and GitHub Actions are the source of truth. Merge only after required checks pass; GitHub Pages then publishes the safe frontend. Production Cloudflare Worker remains on the previously verified Pass 5 revision. If the new frontend breaks, revert the Pass 6 commit and republish Pages — do not clear classroom data or reset the Worker as a cosmetic rollback.

## Next stage

A real-lesson pilot remains sensible after this automated quality pass. CI can demonstrate synthetic concurrency and layout/accessibility regression coverage, but cannot substitute for observing actual student comprehension, pacing or the school's network.
