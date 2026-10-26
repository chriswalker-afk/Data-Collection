# Pass 3 — Trophy Cabinet and Solo Awards

## What was built
My Awards is now a functional offline-friendly Trophy Cabinet with 16 collectible mathematical characters, locked and collected states, meaningful requirement text, evidence progress, a quiet reveal after unlocking, responsive 320px–1280px presentation and reduced-motion behaviour. The Solo home screen shows the current collection count. Local JSON backup and merge/restore work without student accounts.

## Audited opportunities across all ten existing games

| Game | Award evidence | Reliability boundary |
| --- | --- | --- |
| Flashcards | 10 **distinct** cards self-rated "Know it" | A **practice** badge, not independently verified mathematics; review deck excluded |
| Match Up | First-attempt correct pairs and a flawless round of at least 5 pairs | Any earlier incorrect pairing prevents flawless credit; corrected pairs don't count |
| Missing Words | Perfect independent, typed round of at least 8 terms | Choice or guided/hinted levels cannot earn the typed-recall award |
| Sort It! | Perfect first full-board check with at least 8 statements | Corrections and revealed explanations do not improve awarded first-check evidence |
| Which Method? | Correct initial choices on distinct scenarios; count separately for all five methods | Repeating the same scenario never increases award credit |
| Speed Recall | 20 distinct correctly typed terms; a perfect 10/10 untimed round | Skips, wrong terms, review mode and partial/timed rounds do not earn perfect-round awards |
| Build the Method | Correct initial procedures for all five methods | Revealed models and corrections cannot earn correct-procedure evidence |
| Spot the Error | Three distinct, fully correct line/repair/consequence diagnoses | All three parts must be correct on the first check; review rounds excluded |
| Contextual Reasoning | Three different independently drafted substantial responses | Explicitly a **writing-practice** award, not machine-grading of the response; guided track excluded |
| Exam Lab | Three different fully correct, unassisted numerical questions | Hints, revealed worked answers and written self-assessment receive no verified mathematical credit |

## Initial award collection (16)

**Sampling detectives:** The Sampling Fox, Random Raccoon, Systematic Squirrel, Stratified Stoat, Quota Quokka, Opportunity Otter.

**Reasoning & repair:** Bias Buster, Procedure Panda, Calculation Capybara.

**Recall specialists:** Precision Penguin, Recall Raven, Word Weasel.

**Pattern masters:** Match-Up Mongoose, Sorting Salamander.

**Practice & reflection (explicitly ungraded):** Flashcard Firefly, Reasoning Robin.

The central bank in `src/awards.js` owns all conditions, progress counts and labels, rather than individual UI components deciding what qualifies.

## Architecture and student data protection

- Award storage uses the **new**, separate localStorage key `sampling-arcade-awards-v1`. Its version 1 schema contains distinct evidence IDs and computed unlock dates.
- Original `sampling-arcade-progress-v1`, exam writing, Solo routes, game scoring, multiplayer code and Durable Object data are unchanged.
- Awards activate **from new activity**, not from historical mastery counters: those older counters do not preserve whether help or self-review was used.
- The award engine only consumes verified event callbacks after existing game grading. A reasoned written response is never marked automatically.
- Duplicate question IDs are deduplicated. Corrupt/unknown award IDs and invalid unlock claims without supporting evidence are discarded on load.
- Export uses versioned JSON. Restore checks its wrapper, version and size and **merges** supporting evidence only after confirmation; it never replaces Solo progress.
- A student can manually edit localStorage or a JSON backup. These are motivating **local** collectibles, not cryptographically provable or remotely authenticated certificates.
- No personal names, accounts, analytics, Cloudflare databases or additional paid services are required. Multiplayer ceremony awards remain reserved for Pass 5.

## Regression and release gates

- `npm run check` includes award unit tests, safety rules and JavaScript syntax.
- Playwright runs live single-player evidence, 16-card gallery, filters, import safety and 320/390/768/1280px layouts alongside all existing Solo and multiplayer cases.
- `node scripts/build-pages.mjs` validates the actual publish artifact and assets; backend Worker files are never exposed in GitHub Pages.
- Merge after all required PR checks pass. Since Pass 2 was not yet merged at development start, this PR is initially targeted at `feature/pass2-unified-arcade`, rather than risking deploying Pass 3 independently of its navigation prerequisites.

**Next development pass:** Pass 4 — Additional multiplayer game modes (Speed Recall, Match Up, Sort It!), secure server-authoritative answers and classroom UX.
