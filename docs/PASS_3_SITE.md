# Pass 3 — Active Recall and Precision

## Student-facing additions

**Speed Recall** is the sixth game. Select Sampling, Types of data or Mixed revision, then:
- **Untimed:** ten shuffled definitions (or all eight Types of Data definitions) with a prompt to type their matching mathematical terms; complete the round at your own pace.
- **Timed:** choose a 30-, 60- or 90-second round. The clock starts only after selecting **Start**; it runs while a question is active, pauses when its feedback is open, and also pauses when the tab is hidden. If the time expires mid-answer, that unfinished answer is **not** recorded as incorrect. Once the full bank has been attempted, the timed game reshuffles for continued recall until time is up.
- Every completed, skipped or incorrect question shows the model term plus the audited example and misconception. A score and session summary are shown when the round finishes.

**Missing Words** retains the original four-option game as **Recognise**. It adds:
1. **Recall:** type the missing word, with an optional first-letter hint. Using the hint helps learning but does not earn an independent mastery mark.
2. **Independent:** type the missing word with no options or hints, retaining the same audited prompt and explanation.
3. A round-completion link suggests the next level without enforcing an artificial lock.

Level switching starts a fresh shuffled round, not a new local progress account. The student always sees the model answer and explanation after marking, and can submit with Enter.

## Marking policy

The new file `content/accepted-terms.json` explicitly lists mathematically equivalent alternative **terms** for selected concepts. It is not a second set of definitions. The original 26 concept labels and 25 cloze answer keys are unchanged.

- Case, whitespace and trivial punctuation/hyphenation differences are normalised.
- Example accepted equivalents: opportunity/convenience sampling, qualitative/categorical data, midpoint/class mark.
- Important non-equivalences stay distinct: `stratum` is not interchangeable with plural `strata`, `quota` is not `stratified`, and `random sampling` is not automatically `simple random sampling`.
- Plausible **one-character** spelling slips on sufficiently long terms (including adjacent swaps) provide **one correction opportunity**. These responses are never auto-marked correct and do not record an attempt until corrected or finally marked.
- The second incorrect response or an outright wrong term shows the correct term and records one incorrect attempt.
- Assisted correct answers are recorded as practice but not as successful independent mastery.
- A skipped question records one incorrect attempt; an unfinished timed question records none.
- Every answer is counted **at most once**, and all games continue to use `sampling-arcade-progress-v1`. This retains student records created in Passes 1 and 2.

The games are **practice tools**, not automatic Pearson mark schemes. An extended written explanation is not marked by string equality.

## Implementation

- `src/recall.js`: pure answer normalisation, collision checks, typo detection, cloze grading, topic decks and clock formatting.
- `src/app.js`: routed views, typed form submission, validated settings, clock management, live feedback and focus restoration.
- `content/accepted-terms.json`: individually reviewed equivalences; source concept aliases are not blindly accepted.
- `styles.css`: touch-friendly forms, high-contrast feedback, responsive timing panel and 320px/390px safeguards.
- `tests/recall.test.mjs` and `tests/browser/phase3.spec.js`: mathematical validation, data preservation, keyboard forms, mode switching, accuracy and timer behaviour.
- GitHub Pages deploy workflow copies the new terminology file with the existing audited JSON banks.

## Privacy, accessibility and limitations

No accounts, cookies or external analytics are added. Student practice stays in browser local storage. Timed mode is optional, uses a visible numeric timer but no repeated screen-reader live announcements, and pauses during feedback or when hidden; reduced-motion preferences are respected. Keyboard submission and explicitly labelled input controls work without a mouse.

Typing a near miss is **not** automatically correct; this is intentional for exam terminology. Students may retry that typo once. There is no automated assessment of longer written methods yet.

## Test commands

```sh
npm install
npm run check
npx playwright install chromium
npm run test:e2e
```

The GitHub Actions PR workflow must pass the original content checks, unit tests and Chromium browser suites. The website is static; GitHub Pages must be enabled in Settings → Pages → Source: GitHub Actions for publication.

## Next: Pass 4 — Exam skills

Add **Build the Method** (ordering the steps for simple random, systematic, stratified, quota and opportunity sampling), **spot the error** questions (e.g. missing "ignore repeats", no random start, quota versus stratified), and contextual reasoning with examiner-style checklists and feedback. Questions must distinguish mandatory procedures from conditional details such as out-of-range values.
