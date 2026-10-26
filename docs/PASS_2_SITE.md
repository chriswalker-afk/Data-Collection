# Pass 2 — Sorting & Method Classification

## Goal and scope

Extend the three Pass 1 games with two **sampling-only** activities. All material must come from the audited Pass 0 JSON bank, preserving the exact approved claims, explanations, scenario reasons and contrasts. No new unreviewed mathematical answer keys were introduced in this pass.

### Sort It!

- Choose **Census**, **Sample**, **Simple random**, **Systematic**, **Stratified**, **Quota**, **Opportunity**, **Stratified vs quota**, or **Simple random vs systematic** using an accessible native selector.
- Polarity rounds use `content/evaluations.json` and `content/sort-rounds.json`: students decide whether an individually contextualised claim is an **advantage** or **disadvantage** of the named method.
- Comparison rounds use the four deliberately contrasting prompts for each pair from the same bank.
- One card at a time, two large selection buttons, immediate explanation, explicit correct answer on errors and a **Next** button. Correct answers cannot be submitted twice.
- This avoids misleading claims that generic benefits like *quick* or *cheap* are unique to one sampling method.

### Which Method?

- Select a quick **5**, standard **10**, or full **20** scenario round. The activity draws from all 20 scenarios in `content/scenarios.json`, with a balanced number from **each of the five sampling methods**.
- Students read the scenario and choose a method using one of five large, labelled buttons.
- Every response shows the reason and a comparison note (for example why the example is quota rather than stratified). The original `reason` and `contrast` fields are preserved.
- Results, correct answer and explanation are shown before continuing. Students can start another randomized round.

## Topic boundaries

Both new activities assess sampling, not general types of data. They are labelled **Sampling only** on the home screen. Launching from the Types of data or Mixed homepage routes these two games to Sampling and shows a clear scope notice. The first three games retain full topic selection. The URL router normalises `#/sort/data` and `#/identify/all` to sampling content, so learners are never shown misleading data-only labels.

## Progress and persistence

Pass 1's `sampling-arcade-progress-v1` format is reused unchanged, so existing student progress is preserved. For an evaluation, the score is attributed to its named subject (census, sample or the relevant sampling-method concept). For a scenario, it is attributed to the correct method's concept. A single answer creates **one** correct or incorrect attempt. Two consecutive correct answers are needed for concept mastery. Finishing a round adds one session. The site continues without saved progress if local storage is blocked.

## Interaction and access

- Large touch-friendly buttons and `<select>` controls; no drag-and-drop or pointer precision required.
- Full keyboard activation with Enter/Space for buttons, native keyboard selection for drop-down controls.
- Selected buttons use accurate `aria-pressed="true"/"false"` states.
- When an answer is submitted, visible feedback receives focus and the screen-reader live region announces the result. **Next** follows immediately in tab order.
- 320px / 390px layouts are specifically tested, including after feedback. Reduced-motion preferences are respected.
- All mathematical content is inserted as text nodes rather than HTML injection.

## Implementation and tests

The new game model is `src/phase2.js`. It builds category choices directly from audited evaluation and sorting records, balances scenario rounds, maps subjects to existing stable concept IDs, and exposes readable method labels. All new game views and interactions are in `src/app.js`. The home screen, navigation, styles and GitHub Pages artifact list have been updated.

Run:
```sh
npm install
npm run check
npx playwright install chromium
npm run test:e2e
```

Automated coverage includes pure-model integrity, referential correctness, all nine sets, balanced 5/10/20 scenario rounds, original answer-key consistency, both correct and incorrect responses, prevention of duplicate submissions, completed rounds, progress persistence, keyboard use, and mobile viewport overflow checks. Pass 1 regression tests remain in place.

## Hosting

`main` publishes with `.github/workflows/deploy-pages.yml`. GitHub Pages must be enabled with **Settings → Pages → Build and deployment → Source: GitHub Actions** before the deployment can succeed. The workflow includes all six JSON files required by the site.

## Next — Pass 3: active recall

Add **Speed Recall**, the timed definition-to-term typing game with accessible untimed mode, accepted synonyms/aliases, scoring that discourages guessing and sensible handling of typos. Extend **Missing Words** with an optional answer-without-choices mode (or staged difficulty) while preserving the current accessible option mode. Incorporate repeat exposure for missed items rather than rewarding speed alone.
