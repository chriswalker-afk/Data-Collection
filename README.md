# Sampling Arcade — Data Collection

A polished, accessible set of Year 12 **Edexcel A level Mathematics (9MA0)** revision games covering sampling definitions, procedures and introductory types of data.

**Unified Arcade — Passes 2–3:** Solo, Multiplayer and [My Awards](./awards.html) are now three connected experiences. Pass 2 introduced premium classroom hosting, room-code sharing, teacher controls, the live roster and clearer mathematical review. Pass 3 added a fully working **Trophy Cabinet with 16 collectible Solo awards**, evidence-based unlock rules and local JSON backup/restore. The ten original solo games and their saved mastery remain intact. See [Unified Arcade Pass 2](docs/PASS_2_UNIFIED_ARCADE.md) and [Trophy Cabinet Pass 3](docs/PASS_3_TROPHY_CABINET.md).

**Pass 7:** a clearer route from vocabulary to exam responses, contextual next-activity guidance, three student-chosen Exam Lab difficulty paths, and an optional offline classroom feedback form. The 46-question bank and all ten games remain in place; no student writing or feedback is sent anywhere automatically.

**UI Pass 2:** all ten activities now use consistent *Practising → What to do → Question* framing, shared controls and panel styling, and clear distinction between checked answers and self-reviewed writing. The mathematics and local student progress stores are unchanged.

**Website:** https://chriswalker-afk.github.io/Data-Collection/ (published from `main` through GitHub Pages Actions).

## Student features
- Choose **Sampling**, **Types of data** or **Mixed revision**.
- **Flashcards** support term→definition and definition→term recall, plus separate advantage and disadvantage cards for each of five sampling methods, census and sample. Browse every card with search and filters or start a full, unscored review. Model points use the same audited evaluation bank as Sort It!.
- **Match Up** offers tactile term–definition tiles with selected-state guidance, short success/retry animations, visible pair progress and accessible keyboard or touch interaction.
- **Missing Words** now has three levels: **Recognise** (the original four choices), **Recall** (type a word with an optional first-letter hint) and **Independent** (type without choices or hints).
- **Sort It!** gives two sampling methods and mixed advantage/disadvantage statements. Place each statement in the correct method-and-category column; only the first complete check counts towards progress.
- **Which Method?** uses balanced 5-, 10- or 20-scenario rounds to identify all five methods with contextual explanations.
- **Speed Recall** asks for a term from its definition; choose untimed ten-term practice (eight for Types of Data) or 30-, 60- and 90-second timed challenges. The timer pauses during feedback and when the tab is hidden.
- Typos can prompt one spelling correction, but are **never automatically credited**. Only curated mathematical synonyms are accepted.
- **Sort It!**, **Which Method?**, **Build the Method**, **Spot the Error**, **Contextual Reasoning** and **Exam Lab** are sampling-only. The four recall games support Sampling, Types of data and Mixed revision.
- **My Awards / Trophy Cabinet** offers 16 quirky collectible mathematical trophies. Checked achievements require appropriate first-attempt, unassisted mathematical evidence; writing effort and flashcard confidence are clearly identified as ungraded practice. Earned awards are stored separately on this browser; use the Cabinet to view progress, filter collectibles, export, merge/restore and reset awards without altering Solo progress or exam-writing drafts.
- **Exam Lab** offers balanced 4-, 8- or 12-question papers at **Build confidence**, **Mixed progression** or **Stretch** levels. Questions increase in difficulty through each paper. Exact proportional allocations and systematic calculations are checked; written procedures and explanations are self-reviewed using audited models. Hinted numerical answers remain practice, not independent mastery. Reports can be printed or exported locally.
- The homepage offers **four goal-based routes** and a suggestion based only on the progress saved in this browser. Every completed mini-game recommends an optional next activity; Exam Lab reports explain how to follow up.
- The optional **Classroom feedback** section downloads a plain-text response for students to share if they choose. There are no names, logins, analytics or automatic submissions. Do not enter personally identifying information.
- Local learning progress tracks formative practice. Mastery requires two consecutive credited checks; a flashcard “Know it” is self-rated, not externally marked. Ungraded written review counts as practice without cancelling mastery streaks, and corrected Match Up pairs cannot earn first-try credit. **Reset my progress** clears learning and exam-writing progress, but not the separately saved Trophy Cabinet.

## Classroom multiplayer (Passes 1–6)

The ten Solo Arcade games and their saved progress remain unchanged. [Multiplayer Arena](./multiplayer.html) now has four classroom modes: **Which Method?**, **Speed Recall**, **Match Up** and **Sort It!**. The teacher chooses a game and length, shares a temporary six-digit code, and controls the start, locking/removal, mathematical answer reveal and subsequent questions. Student devices join by nickname without sign-in. Typed recall, matched pairs and sorting boards are all marked server-side. **Pass 6 adds optional balanced teams, average-per-member team rankings, teacher-set Class Quests and post-reveal mathematical feedback.** A 45-client synthetic load test checks simultaneous joining, marking and WebSocket reconnection.

Cloudflare Workers and SQLite-backed Durable Objects handle rooms and **hibernatable WebSocket** updates. The server validates answer keys, grading, timing and teacher-only actions; temporary rooms expire after three hours. The system avoids continuous polling while WebSockets are working. **Solo trophies and Multiplayer keepsakes are available now.** Multiplayer awards are based on server-graded responses and celebrated together with a teacher-controlled podium and synchronised character reveals. Student devices save nickname-free local keepsakes separately from Solo mastery.

See [the multiplayer setup and quality guide](./multiplayer/README.md) for testing, deployment, security and classroom trial instructions.

## Run locally
Start a static server (do not open the file directly in the browser because JSON is fetched):

```sh
python3 -m http.server 4173
```

Open http://127.0.0.1:4173

## Tests
Requires Node.js 20+ and Python 3 for browser tests.

```sh
npm install
npm run check
npx playwright install chromium
npm run test:e2e
```

GitHub Actions runs unit/content validation, desktop/mobile Chromium browser tests and Cloudflare staging multiplayer smoke tests. The published site is available at the URL above through the successful `.github/workflows/deploy-pages.yml` workflow. `node scripts/build-pages.mjs` validates the static publish artifact and keeps Cloudflare Worker backend files out of GitHub Pages.

## Source & project notes
- [Pass 6 Team Challenges: balanced groups, Class Quests, teacher feedback and 45-client stress testing](docs/PASS_6_TEAM_CHALLENGES.md)
- [Pass 5 Grand Multiplayer Awards Ceremony: verified character awards, podium, synchronized reveals and privacy](docs/PASS_5_GRAND_AWARDS_CEREMONY.md)
- [Pass 4 Multiplayer: Speed Recall, Match Up, Sort It!, scoring and classroom reliability](docs/PASS_4_MULTIPLAYER_GAMES.md)
- [Pass 3 Trophy Cabinet: 16 awards, fairness rules, offline storage and backup/restore](docs/PASS_3_TROPHY_CABINET.md)
- [Pass 2 Unified Arcade: shared navigation, classroom hosting and release checks](docs/PASS_2_UNIFIED_ARCADE.md)
- [Premium Match Up: interaction, animations, mobile accessibility and tests](docs/MATCH_UP_PREMIUM.md)
- [Premium Flashcards: flip animation, accessibility, review and classroom checks](docs/FLASHCARDS_PREMIUM.md)
- [UI Pass 3 responsive and accessibility audit](docs/UI_PASS_3.md)
- [UI Pass 2 instructional, feedback and design consistency audit](docs/UI_PASS_2.md)
- [UI Pass 1 navigation, learning-stage grouping and next steps](docs/UI_PASS_1.md)
- [Pass 7 classroom trial guide and learning-journey audit](docs/PASS_7_CLASSROOM_TRIAL.md)
- [Pass 6 examiner-scope, mathematical and UX quality audit](docs/PASS_6_AUDIT.md)
- [Pass 5 Exam Lab mathematical grading, written self-review and storage safeguards](docs/PASS_5_SITE.md)
- [Pass 4 exam skills](docs/PASS_4_SITE.md)
- [Pass 3 typed recall, timer and answer policy](docs/PASS_3_SITE.md)
- [Pass 2 sorting and classification notes](docs/PASS_2_SITE.md)
- [Pass 1 feature and accessibility notes](docs/PASS_1_SITE.md)
- [Pass 0 source and editorial audit](docs/PASS_0_CONTENT_AUDIT.md)
- Content bank: `content/*.json`
- UI: `index.html`, `styles.css`, `src/`
- Tests: `tests/`

All content is independently worded for teaching, rather than copied verbatim from textbooks. This site is not affiliated with or endorsed by Pearson.

**Next multiplayer roadmap:** Pass 6 introduces optional team challenges, collaborative goals, teacher feedback and 30–45 student classroom stress testing. Pass 5's Grand Awards Ceremony and 11 server-derived Multiplayer awards are available now. The earlier Solo Arcade Pass 7 classroom-trial recommendations remain documented in `docs/PASS_7_CLASSROOM_TRIAL.md`.
