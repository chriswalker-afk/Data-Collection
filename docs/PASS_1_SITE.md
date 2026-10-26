# Pass 1 — Sampling Arcade

## Summary
A dependency-light, static and responsive site built from the reviewed Pass 0 content bank.

### Student workflow
1. Open the home page and choose **Sampling**, **Types of data** or **Mixed revision**.
2. Choose a game: **Flashcards**, **Match Up** or **Missing Words**.
3. Get immediate feedback, try another round and see progress by concept on the home page.

### Games
- **Flashcards:** shuffle the matching bank for the selected topic, switch between term→definition and definition→term, reveal the model answer, example and misconception, and rate each card Again / Nearly / Know it. Only Know it counts as successful recall; Again and Nearly keep the concept in need of practice.
- **Match Up:** five distinct term-definition pairs, rearranged to avoid visible row clues. Correct matches disappear; incorrect attempts prompt students to try again. All choices are real buttons.
- **Missing Words:** one essential word per prompt, four vetted options, instant explanation and a one-answer-per-question rule. No auto-advance after incorrect responses so learners can read the explanation.

### Progress and privacy
All results are stored locally under the key `sampling-arcade-progress-v1`, not sent to a server. A concept counts as mastered after **two consecutive successful responses** (across games). Answers, sessions, practiced concepts and mastered concepts appear on the home screen. Reset requires confirmation. If local storage is unavailable, games remain usable but saving may not persist. Progress may not carry across browsers, devices or private browsing sessions.

### Hosting
The GitHub Pages workflow publishes the site from `main` once the repository owner enables Pages through **Settings → Pages → Build and deployment → Source: GitHub Actions**. The default `GITHUB_TOKEN` cannot enable Pages on its own; this is a one-time GitHub repository setting. After enabling, push to `main` or run **Publish Sampling Arcade** manually. Static site content consists only of `index.html`, `styles.css`, `favicon.svg`, `src/*.js` and the two JSON files used by Pass 1. Hash routes work within the project subpath. No account, build system or analytics is required.

### Testing
- `npm run check`: Pass 0 content validation plus Node.js unit tests for shuffling, coverage, matching, cloze, routes and persistence.
- `npm run test:e2e`: Playwright Chromium navigation, flashcards, matching, cloze, progress reset and corruption recovery, plus mobile width checks at 320px and 390px.
- Run the local site with `npm run preview` (Python 3), or run `npm run test:e2e` to start an automatic local server.

### Limitations and next work
Pass 1 deliberately focuses on vocabulary, not full written-response marking. The sorting and scenario game data already exist in Pass 0 but are not surfaced as games yet. No streak leaderboard or user accounts are planned. **Pass 2** should add category sorting for advantages/disadvantages and scenario classification using the already vetted `content/evaluations.json`, `content/sort-rounds.json` and `content/scenarios.json`. Include contextual explanations and avoid falsely implying every generic advantage is unique to one sampling method.
