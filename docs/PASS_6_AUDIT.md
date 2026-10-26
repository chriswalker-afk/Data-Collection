# Pass 6 — Mathematical, content, accessibility and reporting audit

## Scope and sources

The website deliberately covers **Statistical sampling (9MA0, Paper 3 §1.1)** and introductory data terminology; it does not pretend to cover the complete Edexcel statistics course or the large data set. Audited against Pearson's official *Enhanced Content Guidance*, Issue 2 (January 2023), pages 31–32 of Paper 3 (PDF pages 35–36), at:
https://qualifications.pearson.com/content/dam/pdf/A%20Level/Mathematics/2017/specification-and-sample-assesment/pearson-edexcel-l3-advanced-gce-mathematics-9ma0-enhanced-content-guidance-issue-2.pdf

The guidance explicitly includes population/sample; informal inference; census versus sample advantages and disadvantages; five sampling methods (simple random, stratified, systematic, quota, opportunity/convenience); critique in context; variation between independent samples; and notes that non-integer systematic ratios admit a random-start systematic plan, not one mandatory universal rounded interval.

The Pass 6 additions use original classroom examples rather than reproduced past-paper material. All numerical items are formative and automatically checked; written work is model-assisted **self-review**, not official Pearson marks.

## Audit ledger — findings and responses

| Risk / missed coverage | Resolution | Regression |
| --- | --- | --- |
| An unrestricted three-digit table used the constrained-generator generic SRS instructions | Context-specific procedure now rejects 000, 181–999 and repeats while accepting 001–180 | Bank and unit tests check the exact scenario |
| A non-integer systematic ratio used model wording only suitable for an integer interval | Explicit defensible plan for 40 of 197: random start 1 or 2, then 39 further positions at interval 5, ending ≤197; acknowledges alternatives | Procedure model and boundary assertions |
| The mixed paper overemphasised methods and calculations, with little census or sampling-inference work | Added 12 evaluation cases about population/sample, census practicality, nonresponse, sample variability, coverage, weather-station generalisation and cautious conclusions (34 → 46 total) | Bank validation and paper balance tests |
| Written checklist steps inherited from a generic method even when not applicable | Question-specific steps and self-review points now match the displayed context-specific model | Unit and browser tests |
| Hint support risked awarding independent mastery | Two scaffolded, progressively revealed hints per task; used hints are saved; correct **assisted** numerical answers go to revision and cannot earn independent mastery until subsequently completed without hints | Engine and keyboard/browser tests |
| Numeric input allowed misplaced comma groupings and unsafe large integer products | Validate comma groups strictly, reject malformed/non-integer inputs, require safe population sums/products and valid start/end positions | Boundary, input equivalence and overflow tests |
| Self-review feedback was not consistently focusable and checklist progress was not announced | Focusable model feedback, live self-review count, accessible hint region/buttons and ≥44px controls | Keyboard, touch and 320/390/desktop browser tests |
| Teachers could only obtain a printed report with writing | Explicit **Export CSV report**; no names or cloud upload; written drafts excluded unless checked. Formula-like text from drafts is escaped against spreadsheet formula injection | CSV unit, browser download and privacy tests |
| Data loss across reload or old paper versions | Existing v1 storage keys preserved, draft/hint state sanitised and retained; old/corrupt records fail safely; reset still clears both keys | Restoration, downgrade and browser resume tests |

## Coverage by activity

| Skill | Original practice | Pass 6 extra |
| --- | --- | --- |
| Sampling definitions / vocabulary | Flashcards, Match Up, Missing Words, Speed Recall | Remains unchanged |
| Five sampling procedures | Build the Method, Spot the Error, Exam Lab procedures | Contextual digit table/non-integer systematic worked models |
| Method selection and limitations | Sort It!, Which Method?, Contextual Reasoning | Additional evaluation scenarios |
| Numerically proportional stratified / exact-interval systematic | Exam Lab numerical tasks | Strict numeric validation and hints |
| Census vs sample, inference, variation between samples | Existing terms and some isolated evaluation | New set of 12 original evaluation prompts and balanced mixed-paper selection |
| Examination reflection / teacher sharing | Model answers, printable report | Checklists with live counts, adaptive review and offline CSV |

**Mixed paper composition remains 4/8/12 questions:** one, two or three from each of four skill types. Standard/full papers now deliberately include an inference/census critique and a method-selection evaluation.

## Student privacy and correct assessment claims

The site stores work only in the browser; there are **no external analytics, logins, or submission endpoints**. CSV export is generated on the device when the user clicks the button. By default it contains question IDs, tasks, numerical results, self-reviewed point counts and review flags **but not written drafts**; including those drafts requires an explicit checkbox. No student name is embedded. Spreadsheet formula-like cells from optional drafts are protected against interpretation as formulas. The user must choose whether to share the downloaded file. Printing may display written drafts on paper.

A checked written rubric point is **not** a teacher/examiner mark. Likewise a hinted correct calculation is recorded as practice, not evidence of independent conceptual mastery.

## Testing and future work

`npm run check` checks the entire audited content, validator constraints, mathematical invariants and unit tests. `npm run test:e2e` runs regression tests in desktop and mobile Chromium, including 320px/390px widths, browser storage, hints, self-review focus, CSV export, print styling and prior games. The PR must pass all checks before merging.

**Remaining limits:** these original question banks have not been externally standardised by Edexcel examiners and should receive teacher review and classroom trial. A model answer cannot represent every defensible written explanation; sample variations and non-integer systematic selection should continue to be assessed in context. Student progress remains browser-local, so changing browsers or clearing storage loses data. Pass 7 should use real student feedback to refine pacing, difficulty, guidance and clarity, not expand scope without evidence.
