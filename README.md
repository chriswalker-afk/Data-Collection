# Sampling Arcade — Data Collection

A polished, accessible set of Year 12 **Edexcel A level Mathematics (9MA0)** revision games covering sampling definitions, procedures and introductory types of data.

**Pass 7:** a clearer route from vocabulary to exam responses, contextual next-activity guidance, three student-chosen Exam Lab difficulty paths, and an optional offline classroom feedback form. The 46-question bank and all ten games remain in place; no student writing or feedback is sent anywhere automatically.

**UI Pass 2:** all ten activities now use consistent *Practising → What to do → Question* framing, shared controls and panel styling, and clear distinction between checked answers and self-reviewed writing. The mathematics and local student progress stores are unchanged.

**Website:** https://chriswalker-afk.github.io/Data-Collection/ (published from `main` once Pages is enabled).

## Student features
- Choose **Sampling**, **Types of data** or **Mixed revision**.
- **Flashcards** support term→definition and definition→term recall, examples and common misconceptions.
- **Match Up** offers tactile term–definition tiles with selected-state guidance, short success/retry animations, visible pair progress and accessible keyboard or touch interaction.
- **Missing Words** now has three levels: **Recognise** (the original four choices), **Recall** (type a word with an optional first-letter hint) and **Independent** (type without choices or hints).
- **Sort It!** classifies advantages and disadvantages for seven specific subjects, or distinguishes stratified from quota and simple random from systematic sampling.
- **Which Method?** uses balanced 5-, 10- or 20-scenario rounds to identify all five methods with contextual explanations.
- **Speed Recall** asks for a term from its definition; choose untimed ten-term practice (eight for Types of Data) or 30-, 60- and 90-second timed challenges. The timer pauses during feedback and when the tab is hidden.
- Typos can prompt one spelling correction, but are **never automatically credited**. Only curated mathematical synonyms are accepted.
- **Sort It!**, **Which Method?**, **Build the Method**, **Spot the Error**, **Contextual Reasoning** and **Exam Lab** are sampling-only. The four recall games support Sampling, Types of data and Mixed revision.
- **Exam Lab** offers balanced 4-, 8- or 12-question papers at **Build confidence**, **Mixed progression** or **Stretch** levels. Questions increase in difficulty through each paper. Exact proportional allocations and systematic calculations are checked; written procedures and explanations are self-reviewed using audited models. Hinted numerical answers remain practice, not independent mastery. Reports can be printed or exported locally.
- The homepage offers **four goal-based routes** and a suggestion based only on the progress saved in this browser. Every completed mini-game recommends an optional next activity; Exam Lab reports explain how to follow up.
- The optional **Classroom feedback** section downloads a plain-text response for students to share if they choose. There are no names, logins, analytics or automatic submissions. Do not enter personally identifying information.
- Local progress tracks formative practice. Mastery is a revision indicator requiring two consecutive credited checks; a flashcard “Know it” is self-rated, not externally marked. Ungraded written self-review counts as practice without cancelling an existing mastery streak. Corrected Match Up pairs cannot earn first-try credit. Use Reset my progress to clear this browser's saved information.

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

GitHub Actions runs both unit/content validation and Chromium browser tests for PRs. **One-time publishing setup:** open Repository Settings → Pages → Build and deployment → Source: **GitHub Actions**. The `.github/workflows/deploy-pages.yml` workflow then publishes the site on the next push to `main` (or a manual workflow dispatch). The site's URL is not active until a deployment succeeds.

## Source & project notes
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

**Next: Pass 8 — prioritise evidence from a real classroom trial, then refine any weak navigation, unclear feedback or over/under-challenging tasks. Pass 7 provides the trial-ready workflow; it does not claim to have observed real students.**
