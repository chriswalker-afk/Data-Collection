# Sampling Arcade — Data Collection

A polished, accessible set of Year 12 **Edexcel A level Mathematics (9MA0)** revision games covering sampling definitions, procedures and introductory types of data.

**Pass 1:** a playable static website with Flashcards, Match Up and Missing Words; topic selection, immediate feedback and locally saved progress. The mathematical question bank was audited in [Pass 0](docs/PASS_0_CONTENT_AUDIT.md).

**Website:** https://chriswalker-afk.github.io/Data-Collection/ (automatically published from `main` once GitHub Pages deployment is enabled).

## Student features
- Choose **Sampling**, **Types of data** or **Mixed revision**.
- **Flashcards** support term→definition and definition→term recall, examples and common misconceptions.
- **Match Up** hides successfully matched definition pairs.
- **Missing Words** uses checked four-option questions with specific feedback.
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

GitHub Actions runs both unit/content validation and Chromium browser tests for PRs. Deployment is handled by `.github/workflows/deploy-pages.yml` after merge.

## Source & project notes
- [Pass 1 feature and accessibility notes](docs/PASS_1_SITE.md)
- [Pass 0 source and editorial audit](docs/PASS_0_CONTENT_AUDIT.md)
- Content bank: `content/*.json`
- UI: `index.html`, `styles.css`, `src/`
- Tests: `tests/`

All content is independently worded for teaching, rather than copied verbatim from textbooks. This site is not affiliated with or endorsed by Pearson.

**Next: Pass 2 — sorting advantages/disadvantages and identifying methods from scenarios.**
