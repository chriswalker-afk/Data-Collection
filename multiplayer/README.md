# Sampling Arcade — Multiplayer
This service is **independent of the single-player game** and runs on Cloudflare Workers Free with one SQLite-backed Durable Object per six-digit classroom code.

## Live architecture
- Frontend: `multiplayer.html` on GitHub Pages; link appears on the existing home page and nav.
- Backend: `sampling-arcade-multiplayer.chris-walker-d8b.workers.dev`
- No student login or email. Students choose nickname and enter a code.
- Host controls start, reveal, next and end. Students only submit one answer per question.
- Balanced 5/10/20-question rounds from the audited Sampling scenario bank; 1000 accuracy points and up to 100 speed points.
- The simple first release uses authenticated HTTPS polling every 1.5 seconds. Do not describe it as WebSocket live synchronization. The Worker has an optional WebSocket path but a browser cannot send Authorization headers during handshake; production clients intentionally do not use it.

## Safety and limitations
- Server owns questions, scoring, accepted methods, host controls and participant tokens.
- Bearer tokens are stored only in the current browser tab's sessionStorage; reloading a tab reconnects, a closed tab discards it.
- Rooms expire after 3 hours, capped at 45 participants and have no chat.
- No rate-limiter has been attached to unauthenticated room creation and joining: supervise classroom use, do not publish to an untrusted or high-volume audience without rate limiting.
- Code is not an authentication secret; host token is unguessable UUID.
- No historical grades or personal data are stored; nicknames are temporary room identifiers.
- WebSocket support is not used in this first release; host reveals and advances questions manually, after the visible timer reaches zero or sooner. Timer information is illustrative; host controls progress.
- To update the Worker, run `npx wrangler deploy --config multiplayer/wrangler.jsonc` from the repository root only after its import paths and bundling have been validated; the initial API deployment bundled `rules.js`, `scenarios.js` and `worker.js` into the main module. Future deployment should use a bundler or adjust config to Worker module paths.
- Changes in `content/scenarios.json` must be audited and copied into `multiplayer/scenarios.js` before a redeploy.

## Classroom pilot
Create a 5-question room as teacher in one browser, join using a second device with nickname, start game, check one correct and one incorrect answer, reveal, next, refresh one device and confirm it reconnects. Check mobile input and projector mode. Existing independent exercises should continue unchanged.
