# Pass 5 — Exam Lab: Mixed examination practice

## What has been built

A tenth sampling-only activity, **Exam Lab**, joins the previous nine games. Students choose one of three balanced papers:

| Practice | Questions | Allocation | Systematic numerical | Explain procedure | Evaluate design |
| --- | ---: | ---: | ---: | ---: | ---: |
| Quick | 4 | 1 | 1 | 1 | 1 |
| Standard | 8 | 2 | 2 | 2 | 2 |
| Full | 12 | 3 | 3 | 3 | 3 |

The bank includes **34 original, examiner-style** tasks: 8 exact proportional allocations, 8 systematic interval calculations, 9 procedural explanations, and 9 evaluations. Levels range from foundational to extension. The paper is shuffled and includes all four skills by design. This is a teacher-authored resource, **not a Pearson specimen/past paper**.

### Numerical marking is limited and exact

Allocation questions ask students to work out the correct **integer** numbers to select within each stratum. Each numerical key is derived from `(stratum size / population size) × total sample size`; the selected numbers must add to the target sample size. The selected pupils must still be randomly chosen within the strata (as explained in feedback).

Systematic questions use cases where `N/n` is an integer and the random starting position lies within the first sampling interval. Students calculate `k = N/n` and the final position `start + (n − 1)k`. The engine checks the result is in bounds. Non-integer ratios are discussed in written tasks without asserting a universal rounding rule.

These are **the only automatically checked mathematical answers** in Pass 5. The engine accepts alternative writing of whole numbers such as `020`, `20.0`, or `1,200`, but rejects malformed and non-integer submissions. It records one answer in the original `sampling-arcade-progress-v1` structure for each completed numerical task (correct only if every numerical part is correct). Displayed partial counts are diagnostic, not official examination marks.

### Writing: draft, model, honest self-review

Students write answers to procedure and evaluation questions. Explanatory procedures reuse the original audited `content/methods.json` steps and warnings, plus contextual points. Evaluation tasks show a model and link to relevant Pass 0 advantage/disadvantage claims. Students tick precisely what their explanation contains and can flag questions for revision. **No language model or keyword matcher grades the student's prose or certifies mastery.** The checklist is formative, and the number of ticked points is not represented as a Pearson mark.

### Adaptive revision, recovery and print

- An incomplete numerical answer, a skipped/revealed solution, or an incomplete/flagged written self-review adds its question to a deduplicated, bounded **practice target** list. Completing it successfully later removes that target.
- **Practise saved targets** creates a short paper of only these question IDs.
- The in-progress paper, index, numeric inputs, written drafts, model-review stage and checklist ticks are stored under a **separate**, defensively sanitised `sampling-arcade-exam-v1` key. The original `sampling-arcade-progress-v1` shape is not modified.
- A resumed paper does not re-record already-checked numerical answers. Corrupted, obsolete and unknown-question records are recovered safely.
- Students may delete the last paper, clear practice targets, or reset all progress. Clearing the saved paper asks for confirmation to protect draft writing.
- Completing the paper produces a printable browser report with numerical outcomes, self-reviewed points, original draft text and question-level revision suggestions.

There are no accounts, cloud uploads or trackers. Draft writing remains on the local device only; clearing browser storage removes it. This application is a teaching resource, not a formal assessment engine.

## Quality gates

`npm run check` validates authored question-bank links, integer allocations, systematic constraints, the original audited data and pure-model tests. Chromium browser suites test correct/incorrect submissions, preservation of student drafts, review targets, restoration, session completion, printing, keyboard navigation, and 320px/390px/desktop layouts. PR checks must all pass before merging.

## Next — Pass 6: Quality and coverage audit

Review student-facing exam language and worked solutions with actual teachers/students; broaden sampling and data-handling question types, add targeted hints without weakening independent practice, consider a carefully bounded teacher-friendly export or optional non-cloud printable booklet, and run a systematic accessibility and numerical edge-case audit. Preserve all existing progress and the explicit distinction between numeric checking and written self-review.
