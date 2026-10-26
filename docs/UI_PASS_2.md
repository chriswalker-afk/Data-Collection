# UI Pass 2 — Consistent learning and feedback across ten games

**Repository:** `chriswalker-afk/Data-Collection`  
**Scope:** student-facing presentation, accessibility and instructional clarity; no changes to the mathematical engines.

## Aim

Make Sampling Arcade feel like one coherent revision application rather than ten separately evolved pages. Students should recognise the same order on every playable activity:

**Practising → What to do → Question → Feedback / model → Next step.**

The two-part guidance is intentionally compact, not a large advice panel, so the question remains the visual centre of the activity. A brief question label appears in all nine mini-games; Exam Lab shows the same framing at the question stage, with its saved-paper options retained on the landing page.

## Audit ledger

| Before | UI Pass 2 correction | Educational safeguard |
| --- | --- | --- |
| Game instructions appeared in inconsistent locations, including within questions and duplicated text | A single `practiceGuide` renderer with ten audited instructions and contextual variants for flashcards, Missing Words, Sort It!, Speed Recall and Exam Lab | No instructions expose an answer or modify the method |
| No consistent indication where instructions end and the current question begins | Each activity now displays a short, distinguishable **QUESTION** overline; Match Up also gets a labelled question heading | Existing question text and datasets remain unchanged |
| Correct/incorrect feedback banners were implemented separately by game | One shared `feedbackBanner` renders checked-answer status, answer-specific explanation and a focusable result | Feedback never changes what counts as an independently correct response |
| Self-assessed Contextual Reasoning and Exam Lab written answers could appear in green checked-answer banners | Neutral blue **Self-review** status, explicitly separated from green checked answers and amber review-needed answers | A four-point option checklist is *not* automatically awarded a mark for a student's written explanation |
| Different activities used different panel radius, white backgrounds, controls and form input treatments | One `styles/activity-ui.css` applies reusable tokens for question panels, text fields, radio/choice cards, focus, buttons, feedback and spacing | Correct/incorrect answer classes, touch targets and focus visibility preserved |
| Earlier website passes assigned card-icon colours by child position | Removed positional CSS; Stage labels and semantic classes remain authoritative from UI Pass 1 | Icons no longer inherit the wrong colour when their card's order or group changes |
| A scrolling navigation rule remained despite the Pass 1 header rebuild | Removed the old `overflow-x:auto` navigation compatibility block | Pass 1 grouped menus remain unchanged |

## Game-by-game student journey

| Activity | Learning focus | Practice instruction / feedback |
| --- | --- | --- |
| Flashcards | Accurate terms and definitions | Recall, reveal and **self-rate**; reversal is reflected in the instructions; a self-rating isn't an external exam mark |
| Match Up | Connect vocabulary | Select a term then its definition; matched pairs leave the board; checked pair feedback |
| Missing Words | Exact terminology | Word choices, guided typed recall with hints, or independent typed recall; assisted answers remain practice |
| Sort It! | Strengths, limitations and distinctions | Context-sensitive instruction for the comparison variant; checked explanation |
| Which Method? | Recognise method from selection procedure | Choose method, read defining feature and contrast |
| Speed Recall | Type from memory | Timed / untimed instruction aligns with chosen mode; skipped or incorrect responses clearly flagged |
| Build the Method | Sequence steps | Up/down buttons work for keyboard/touch; checked validity and separate worked method |
| Spot the Error | Diagnose and repair | Identify both the inaccurate line and repair; explanation shown afterwards |
| Contextual Reasoning | Justification, limitation and improvement | Four component model choices and optional writing; **Self-review**, not auto-grading of student prose |
| Exam Lab | Apply calculations and written reasoning | Numerical answers checked; contextual writing compared to models, marked **Self-review**, not an official Pearson grade |

The existing practice progress and grading semantics are unchanged; feedback is only a presentation layer. The neutral self-review state specifically prevents misleading claims that written work has been automatically assessed.

## Files

- `src/activity-guidance.js` — pure descriptions and contextual variants, testable without a browser.
- `src/app.js` — shared instruction and feedback renderers consumed by nine games and supplied to Exam Lab.
- `src/exam-sim-ui.js` — uses the same components without modifying `src/exam-sim.js`.
- `styles/activity-ui.css` — design tokens and presentation-only component styles loaded after the existing stylesheet.
- `styles.css` — removed obsolete positional icon colours and scrolling-header overrides, leaving historical game-specific rules in place until safely evaluated.
- `tests/activity-guidance.test.mjs`, `tests/browser/ui-pass2.spec.js` — new instructional, visual, correctness-claim and responsive regression tests.
- `index.html`, `package.json`, `README.md` — load and validate shared assets.

## Testing and acceptance

Run:
- `npm run check` for content validation, syntax and the full unit suite.
- `npm run test:e2e` for desktop/mobile Chromium, including the original ten-game tests and UI Pass 1 navigation.
- Validate shared guidance and feedback states at **320, 390, 768 and 1280 px**. Verify question and control contrasts, recorded progress and persistence.
- Merge only once all required PR checks pass.

## UI Pass 3 — Remaining work

Conduct a **full responsive and accessibility quality audit**, particularly:
1. Visually inspect gameplay on actual 320px/390px phones, 768px tablets and standard desktops; inspect long questions, orientation and zoom.
2. Audit keyboard-only and assistive-technology journeys: tab order, disclosure controls, question/feedback focus transitions, live announcements, form errors and selection state.
3. Verify contrast and colour-independent meaning, minimum touch target size, reduced motion, print and export layouts.
4. Stress-test navigation after deep links, restored sessions and changes between topics, devices and storage availability.
5. Refine or remove residual duplicated CSS **only after** comparing rendered gameplay and existing screenshot baselines.

**Do not** expand content or add automatic assessment of student writing during UI Pass 3.
