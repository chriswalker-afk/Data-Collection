# Premium Which Method? — evidence-led method identification

## Learning purpose
Help students distinguish the **sampling mechanism** (the rule for selecting people or items), rather than guess from the context or the demographic groups mentioned. All 20 original Edexcel 9MA0-aligned scenario questions are retained: 4 per sampling method, with the existing method key, mathematical reasoning, common contrast and difficulty labels.

## Before an answer
- A premium dark-teal case-study panel presents the **entire unchanged scenario**; no keyword highlighting gives away the answer beforehand.
- Five large native button choices remain accessible via pointer, touch and keyboard. They use text labels, generous targets and focus outlines.
- The same 5 / 10 / 20 settings preserve the current balanced distribution across the five sampling methods.
- Instruction wording reminds students to inspect how individuals are actually selected.

## After an answer
- Highlight the **decisive phrase inside the scenario**, pulled from a curated, exact-substring quotation for that case.
- Show the original, audited reason explaining the correct method.
- If the student chooses the wrong method, explain why **that particular chosen method** does not fit. All 20 directed correct-vs-incorrect method contrasts are written in `src/identify.js`; they focus on random numbers, fixed intervals, stratification, quotas and convenience.
- Keep the original `scenario.contrast` as a separate second distinction.
- Preserve the original `classify-option` / `classify-next` buttons, native focus behaviour, screen-reader announcements and all original grading logic.

## End-of-round learning
- A five-method, per-round accuracy breakdown uses only the questions actually answered, without implying an exam grade.
- A collapsible, **unscored review** of missed case studies contains their decisive phrases, answers and specific contrasts with the wrong choice. Viewing it never creates an extra attempt or awards mastery.
- Starting a new round clears the temporary on-screen comparison record. Nothing is uploaded or sent to an external service.
- The existing locally saved progress, two-in-a-row mastery, question totals and completion criteria remain unchanged.

## Architecture
The improvement is intentionally a **progressive presentation enhancement**, not a replacement marking engine:
- `src/identify.js`: auditable evidence quotations, all wrong-method contrasts, pure review and validation helpers.
- `src/identify-enhancer.js`: updates the existing student UI after its normal render and passively records which answer the student selected, for the round summary. Original button actions retain responsibility for marking and progress.
- `src/identify-page.js` and `styles/identify.css`: page-specific responsive presentation, reduced motion and accessible headings.
- `scripts/validate-identify.mjs`: verifies exact evidence text for all 20 cases at build time.
- `tests/identify.test.mjs` and `tests/browser/identify-premium.spec.js`: content integrity, learner feedback, correct answer timing, progress safety, responsive and keyboard tests.

A presentation-layer load failure leaves the original Which Method? question-and-marking experience usable. Do not use this review to change grades; it is learning support.

## Validation and future work
Run `npm run check` and the full desktop/mobile Playwright suite, including pre-existing Pass 2 and UI regression tests. An in-person trial should confirm whether students can explain the difference between quota and stratified selection and between systematic and simple random methods after using the feedback.

**Recommended next premium activity:** Build the Method — visual sequencing, context-sensitive steps and explanations of valid alternative orders.
