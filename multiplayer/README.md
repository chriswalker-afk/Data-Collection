# Sampling Arcade — Multiplayer Architecture (Passes 1–6)

The original ten Solo Arcade games remain available at `index.html`, with their own local progress and sixteen Solo trophies. Multiplayer at `multiplayer.html` runs separately, without student accounts. Its temporary, nickname-only classrooms are coordinated by a Cloudflare Worker and SQLite-backed Durable Objects.

## Critter Lab character integration

Student avatars are small cosmetic allowlisted configurations, not raw image uploads. The Worker validates head, body, legs and each palette at join and on authenticated lobby-only updates. WebSocket state includes each player's selected critter; previously created rooms and clients receive a safe default. The client renders the original same-origin SVG assets in the roster, leaderboard and server-derived award recipient/podium views. Server scoring, team balancing and prize criteria do not depend on avatars. Reconnection reuses stored room state; students may change their local character while waiting for the teacher.

## Classroom journey

1. Teacher chooses **Which Method?**, **Speed Recall**, **Match Up** or **Sort It!**, and a challenge length. Game instructions and timings adapt to that mode.
2. Students use a **six-digit room code** and a nickname to join from independent devices. Teacher may lock/unlock joining or remove a participant before starting.
3. The Durable Object prepares a checked mathematical question bank, holds all answer keys privately and publishes only safe question data.
4. Student answers go through authenticated HTTPS, are accepted only once per question and within the server deadline, and are graded **exclusively by the server**.
5. Teacher reveals solutions when everyone has answered or the deadline passes, with mathematical reasoning and a live leaderboard. Teacher advances questions or ends the round.
6. Once complete, the teacher may launch the **Grand Awards Ceremony**. All devices see the same Welcome, Podium, earned character awards and Finale, at the teacher's chosen pace. Replays and backwards navigation are available.
7. Individual students reaching the finale can retain their verified classroom character achievements as **nickname-free local keepsakes** in My Awards, separate from Solo trophies.

## Host Customisation Studio (Arena 2.0, Pass 1)

The teacher entry now offers **Classic Challenge** (playable now) alongside safe planning previews for **Blitz**, **Bullseye**, **Perfect Run**, and the full cooperative **Class Quest**. Teachers can experiment with Quick / Balanced / Stretch presets, meaningful targets and three participation formats, including a **Puzzle Relay** preview. Unsupported objectives disable room creation and are never sent to the current Worker. Free-for-All and 2–4 team **Squad League** work immediately using existing team commands, with optional Classic class-goal setup. [Scope and tests](../docs/PASS_1_MULTIPLAYER_HOST_STUDIO.md).

## Arena 2.0 Pass 2 — playable Blitz

The Host Studio now supports a **timed, self-paced Blitz** for all four audited mathematical activities: independent questions and private instant mathematical feedback, a class-wide 1–15 minute countdown, server-owned ranking by correct decisions then accuracy then points, independent 2–4 team play, and automatic end-of-round awards. The existing Classic Challenge remains teacher-paced. All other new objectives are still clearly labelled previews. [Blitz implementation, safeguards and tests](../docs/PASS_2_MULTIPLAYER_BLITZ.md).

## Arena 2.0 Pass 3 — Bullseye + Perfect Run

**Bullseye** and **Perfect Run** extend the independent question engine: first student to reach a target rolling percentage over a full window or a verified consecutive fully-correct streak wins. Teachers choose the targets and a 1–15-minute safety countdown. All four audited activities and individual or balanced-team play are supported. A board is one task, and must be fully correct; partially correct boards still receive checked points and explanations. If nobody reaches the goal, no mathematical winner is invented. The cooperative Class Quest and distributed Puzzle Relay are still previews. [Pass 3 goals, validation and no-winner policy](../docs/PASS_3_MULTIPLAYER_RACES.md).

## Four distinct mathematical modes

| Mode | Content | Choice | Time |
| --- | --- | --- | --- |
| Which Method? | Sampling scenarios balanced across the five methods | 5, 10, 20 questions | 20 s/question |
| Speed Recall | Definitions with precise accepted terms/synonyms | 5, 10, 20 questions | 25 s/question |
| Match Up | Six terms and scrambled definitions per board | 1, 2, 3 boards | 75 s/board |
| Sort It! | All ten pairwise method comparisons, with 8–12 advantage/disadvantage statements across four columns | 1, 3, 6, 10 boards | 90 s/board |

Correct individual answers receive **1,000 accuracy points plus up to 100 speed points**. Match Up and Sort It! use proportional mathematical credit across the board (maximum 1,000 base) and award the small speed bonus only for an entirely correct board. Invalid/incomplete boards are rejected without creating an attempt.

The reviewed Solo content bank is projected to the private Worker bundle in `game-bank.js`, with drift tests against the source JSON. The browser is never sent answer keys before reveal.

## Ceremony, achievement fairness and privacy

- 11 mathematical character achievements reward meaningful checked conditions such as method breadth, five accurate retrievals, a perfect pairing or sorting board, sustained precision and thoughtful recovery after an error.
- The server records only the **first authenticated, graded** submission for each question and participant. It never accepts client-supplied awards, marks or deadlines. The award conditions live privately in `ceremony-rules.js`.
- The podium uses server scores. Joint scores share the same rank; zero scores never create a fictitious winner. Students cannot start, advance or skip the ceremony.
- Only the **currently revealed slide** is sent to devices. Reconnecting returns the current ceremony position.
- Local mementos are tiny, separate records with no stored nickname, token or room code. They reflect a server-verified live result, but are **not cryptographically independently verifiable** after room expiry and can be edited by the owner of a browser.
- The Solo Trophy Cabinet, existing local progress, writing drafts and Solo backup/restore are unaffected.

See [Pass 4 modes](../docs/PASS_4_MULTIPLAYER_GAMES.md) and [Pass 5 ceremony and award criteria](../docs/PASS_5_GRAND_AWARDS_CEREMONY.md).

**Pass 6 classroom options:** In the teacher lobby you may enable 2, 3 or 4 automatically balanced teams (or leave individual mode unchanged), shuffle assignments before launch, and optionally choose a Class Quest target of 70%, 80% or 90%. Team standings use **average points per member**, while team and class goals require 75% participation and at least five checked mathematical decisions. Current-question accuracy and scores stay hidden until reveal. Teachers may publish up to three short mathematical teaching points per question, after review only. These results are also recognised in team and class celebration slides without changing individual awards. See [Pass 6 team challenges and stress validation](../docs/PASS_6_TEAM_CHALLENGES.md).

## Network and safeguarding

- Rooms expire automatically after three hours. Maximum of **45 players per room**.
- Temporary teacher/participant UUID credentials are stored only in `sessionStorage` for tab recovery and never shown on the leaderboard.
- Hibernatable WebSockets use authenticated, expiring **single-use connection tickets**. Changes to scores/room state use HTTPS; push state is authoritative.
- WebSocket reconnect uses exponential backoff. HTTP state polling is only enabled as a fallback **during reconnection**, every 15 seconds.
- Classroom creation is limited to **24 per five minutes per shared network address**, with a further global maximum of **120 per minute**. Joining has its own per-room bounds. Hashed, not raw, IP-derived limiter keys are used.
- CORS allows the GitHub Pages site and local development origins; no account database, chat system, email addresses or permanent profiles.
- A removal is authorized only for the teacher and a student cannot impersonate a teacher to change round, question or ceremony state.

## Development and release validation

```sh
npm install --no-audit --no-fund
npm run check
npx playwright install chromium
npm run test:e2e
node scripts/build-pages.mjs
```

Playwright launches the local static site (port 4173) and a real local Wrangler Worker (port 8787). Tests cover two-device rounds and ceremonies, answer secrecy, scoring/permissions, browser reconnection, 320px and 390px layouts, and preservation of Solo progress.

The Cloudflare staging smoke script tests the **deployed** staging Worker and all four multiplayer modes. Release gating requires unit/content, Chromium, fast multiplayer and staging smoke checks green. Only then upload the **same tested Worker bundle** to production, merge the PR, and verify GitHub Pages deployment. Existing SQLite Durable Object migration `v1` and `ROOMS` binding must be preserved. Never place Cloudflare credentials in the repo.

## Next

**Pass 7 — Classroom Pilot and Evidence-Led Refinement.** Run a real 15–45 student session on school devices/Wi-Fi, review accuracy and team fairness, measure reconnect and participation, gather teacher feedback and refine any unclear navigation or overly distracting elements. The synthetic 45-WebSocket automated stress test is not a substitute for this supervised trial.
