# Pass 4 — Multiplayer Game Expansion

Pass 4 adds three distinct real-time games alongside the original **Which Method?**. All modes use the same temporary six-digit room, nickname-only join, teacher lock/unlock/remove/reveal/next, live leaderboard, WebSocket reconnection and server-authoritative scoring. No login, student database, account or new Durable Object migration is required.

## Student experiences

| Mode | Question structure | Teacher length options | Duration per question | Mathematical checking |
| --- | --- | --- | --- | --- |
| Which Method? | Choose one of five sampling methods in a contextual scenario | 5, 10, 20 | 20 s | Correct method |
| Speed Recall | Type a precise mathematical term for its definition | 5, 10, 20 | 25 s | Accepted mathematical term or vetted synonym; typos never credited |
| Match Up | Connect six different mathematical terms to six scrambled definitions | 1, 2, 3 boards | 75 s per board | Each connected pair scored; one complete board submission |
| Sort It! | Place 8–10 statements into advantages/disadvantages for two sampling methods | 1, 3, 6 boards | 90 s per board | Each of the four-category placements scored |

Match Up uses touch and keyboard-selectable terms/definitions rather than requiring drag-and-drop. Sort It! uses selectable statement cards and four visible destination panels. Both support changing assignments before the one final submission. Match Ups use unique terms across a multi-board room; Sort It! avoids repeating a board in one room.

## Accuracy-first scoring

- Single-answer modes: correct first answer gives **1,000 points plus up to 100 time points**. Wrong/empty answers earn zero; no client-supplied score is accepted.
- Whole-board modes: **up to 1,000 points proportional to correct decisions**; only a fully correct submitted board receives a speed bonus (up to 100).
- One authoritative submission per participant per question. Invalid or incomplete boards are rejected before grading, not recorded as attempts. There are no answer previews.
- Teacher may reveal once all current players have submitted **or** the server deadline expires.
- The server decides deadlines, correct answers, score increments and what is revealed. Client timers are display-only.
- A reconnect restores the same room and already-submitted status; a late duplicate cannot add points.
- During answer review all players see the correct solutions and mathematical explanations.

## Content provenance and privacy

- `multiplayer/game-bank.js` projects the existing Solo definitions, vetted accepted synonyms, pairs, claims and explanations into the Worker bundle. `tests/multiplayer-modes.test.mjs` compares it against all source JSON, flagging drift.
- During active questions, public question objects omit `correctMethod`, `answerKey`, `correctDestination`, `correctTerm`, `sourceId` and all explanations that would disclose solutions.
- Students submit typed responses, paired term/definition IDs or destinations over authenticated HTTPS. They do not send marks, deadlines or permissions.
- Temporary answer payloads are used for scoring; no student-entered written responses are retained in the room answer log. Only points and correctness totals are stored for board games.
- Teacher and student connections use expiring single-use WebSocket tickets. The Durable Object remains the room authority. Room expiry and bounded rate limits remain enforced.
- This server does not read or write `sampling-arcade-progress-v1`, exam-writing drafts or the Solo Trophy Cabinet.

## Release procedure

1. Run `npm run check` for source/content tests and current bank parity.
2. Run Playwright browser tests (including 320px, 390px, 768px and 1280px layouts).
3. Deploy to `sampling-arcade-multiplayer-stage` and run the real WebSocket + all-mode staging smoke script.
4. Confirm no regression to Which Method? or the ten Solo games.
5. Deploy the identical tested Worker bundle to production **only after** all staging and CI checks pass.
6. Merge the PR, verify GitHub Pages builds `multiplayer/client.js` and `multiplayer/mode-ui.js` but never the private Worker or question bank, and check the published Arena.

## Next pass

**Pass 5 — Grand Multiplayer Awards Ceremony.** Create a server-verified multiplayer achievement bank for each mode; determine awards from genuine answers and room outcomes (rather than repeated guessing); add a podium, quirky mathematical award reveal sequence and synchronised optional celebrations. Keep solo and multiplayer awards clearly distinguished, support reduced motion and teacher controls, and avoid revealing personal data.
