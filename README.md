# Sampling Arcade — Data Collection

A polished, accessible set of Year 12 **Edexcel A level Mathematics (9MA0)** revision games covering sampling definitions, procedures and introductory types of data.

**Pass 2:** five playable activities: Flashcards, Match Up, Missing Words, Sort It! and Which Method? Sorting and method-identification questions use the audited Pass 0 bank. The original Pass 1 games, topic selection and locally saved progress are preserved. The mathematical question bank was audited in [Pass 0](docs/PASS_0_CONTENT_AUDIT.md).

**Website:** https://chriswalker-afk.github.io/Data-Collection/ (published from `main` once Pages is enabled).

## Student features
- Choose **Sampling**, **Types of data** or **Mixed revision**.
- **Flashcards** support term→definition and definition→term recall, examples and common misconceptions.
- **Match Up** hides successfully matched definition pairs.
- **Missing Words** uses checked four-option questions with specific feedback.
- **Sort It!** classifies advantages and disadvantages for seven specific subjects, or distinguishes stratified from quota and simple random from systematic sampling.
- **Which Method?** uses balanced 5-, 10- or 20-scenario rounds to identify all five methods with contextual explanations.
- **Sort It!** and **Which Method?** are sampling-only activities; the original three games support Sampling, Types of data and Mixed revision.
- Local progress tracks practice attempts and mastery across games, requiring two consecutive successful responses per concept. Use Reset my progress to clear this browser's saved information.

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
- [Pass 2 sorting and classification notes](docs/PASS_2_SITE.md)
- [Pass 1 feature and accessibility notes](docs/PASS_1_SITE.md)
- [Pass 0 source and editorial audit](docs/PASS_0_CONTENT_AUDIT.md)
- Content bank: `content/*.json`
- UI: `index.html`, `styles.css`, `src/`
- Tests: `tests/`

All content is independently worded for teaching, rather than copied verbatim from textbooks. This site is not affiliated with or endorsed by Pearson.

**Next: Pass 3 — typed and timed active recall, with an accessible untimed mode and accepted synonyms.**
