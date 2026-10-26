# Sampling Arcade — Site-wide Premium Quality & Assessment Integrity Audit

**Scope:** All 10 learning activities, Edexcel 9MA0 sampling / types-of-data content, student navigation, assessment signals, responsive presentation, keyboard/touch interaction, saved progress and privacy.

**Audit type:** Repository-level code/content audit plus automated unit and Chromium browser regression tests. This is **not** a teacher-observed classroom trial, a formal WCAG conformance certification, an official Edexcel mark scheme validation or a manual screen-reader/real-device test.

## Findings resolved in this pass

| Priority | Finding | Resolution | Test |
| --- | --- | --- | --- |
| P1 · mastery integrity | Match Up credited a correct pairing even after the same term/definition had been used in an unsuccessful pairing earlier in the round. Elimination could become apparent "independent" recall. | Track both tiles exposed by every wrong pair. Allow the puzzle to be completed, but award **first-try credit only** for a wholly unexposed correct pair. Show the number of first-try matches and explain the correction. Unexposed pairs still score as before. | Pure `matchAttemptCredit` tests; keyboard/browser match+correction test; existing correct-first, timers, duplicate-click and reduced-motion tests. |
| P1 · mastery integrity | Contextual Reasoning wrote a hard-coded **incorrect** response to concept progress even when a student had written and self-reviewed plausible work, cancelling their existing streak and possible mastery. | Add `recordPractice` to the **existing v1 progress model**: increment exposure/response counts without changing correct credit or previously earned streak. No automated grading of prose; flagged review still does not write progress. | Unit test of mastered→ungraded practice→actual wrong; browser test with pre-mastered five method concepts. |
| P2 · feedback honesty | Every completed round said "Nicely done", including zero-answer timed rounds and rounds where nothing was solved correctly. | Shared `completionHeading` chooses truthful, concise wording by game and available performance. Zero submitted timed answers explicitly say so. Written review never implies a grade. | Ten-game unit test, zero-answer timed browser check, completion regressions. |
| P2 · consistency | Students could not tell from the shared completion screen which activities gave independent credit, self-ratings or ungraded review. | Shared one-sentence `completionCreditNote` per activity, displayed beneath the round summary. No new card or animation; clearer first-check versus self-review wording. | Ten-game pure unit test; existing responsive and accessibility checks. |
| P2 · progress explanation | "Two correct answers in a row" omitted the self-reported flashcard route and treated ungraded writing as an incorrect attempt. "Answers recorded" included non-graded practice. | Explain that mastery is a **revision indicator**, not an exam grade; disclose Flashcard self-ratings, independent credited checks and ungraded writing. Rename summary count "Practice responses". | Browser progress readback, unit persistence validation. |

## All-activity checklist

| Activity | Mathematical/learning intent | Assessment and interaction checked | Outcome |
| --- | --- | --- | --- |
| Flashcards | Accurate term/definition, examples and common misconceptions | Reversible front/back, delayed answer, self-rated Again/Nearly/Know, optional review, screen reader label and reduced motion | Preserved. Correct self-rating is **not externally verified**; progress wording now makes this explicit. |
| Match Up | Link terms and full definitions, not infer from row alignment | Two-way selection, delayed match resolution, duplicate-click protection, wrong-match feedback, 320–1280px | **Fixed:** only wholly first-try correct pairs earn independent correct credit. Corrected pairs finish the puzzle but cannot earn it. |
| Missing Words | Progress from recognition to unaided vocabulary retrieval | Choices/guided/independent, first-letter hint exclusion, typo retry, full explanation | Preserved graded-versus-assisted distinction. |
| Speed Recall | Type precise terms under optional time pressure | Timed/untimed, paused feedback/hidden tab, typo handling, independent typed targeted review, zero-submission completion | Preserved; improved truthful zero-attempt message. Typed **independent** targeted review still legitimately earns credit. |
| Sort It! | Distinguish two methods and advantage/disadvantage using audited explanations | Touch/keyboard sorting, four destinations, first completed check, unscored corrections, explanations | Preserved. |
| Which Method? | Identify a method from its actual selection mechanism | Contextual clue, after-check evidence, incorrect method contrasts, method-level review | Preserved. |
| Build the Method | Order mathematically necessary dependencies, with valid alternatives | Drag and arrow movement, dependency checks, conditional procedures, model-reveal safeguards, unscored correction | Preserved. |
| Spot the Error | Locate the faulty step, repair it and explain its consequence | Three independent decisions, per-skill feedback, 15 cases, unscored missed-case review | Preserved. |
| Contextual Reasoning | Choose, justify, evaluate and improve using scenario evidence | Guided four-part builder, independent prose, case-specific misconceptions, reflective self-checks, unscored flagged review | **Fixed:** ungraded responses no longer erase earlier independently earned mastery. |
| Exam Lab | Numerical sampling calculations and defensible written evaluation | Valid numerical keys, hints and no-hint credit, written self-review, paper restoration, anonymous local report/export | Preserved. No claim to automatically mark prose. |

## Cross-game standards verified by source review and existing regression suite

1. **Mathematical coverage.** Existing authored content validation checks all five sampling methods, chance underrepresentation, sampling frames, systematic interval edge cases, proportion rounding, nonresponse and limits of inference. No question banks were rewritten during this site-wide pass.
2. **Progress contracts.** The original `sampling-arcade-progress-v1` and `sampling-arcade-exam-v1` keys remain; no migration or reset. Correctly checked answers, aided exposure and model-guided reflection are distinct. Completion and review paths should never double-write.
3. **Accessibility.** Headings, skip link, button and radio/checkbox names, feedback focus, live announcements, 44px+ touch targets, 320/390/768/1024/1280px overflow and reduced-motion behaviour already have broad browser coverage. Added ten-game route and unique-DOM-ID smoke tests. Native focus and real device testing remain worth doing separately.
4. **Privacy.** No sign-in, telemetry, remote writing upload or personal-data collection is introduced by these changes. Original opt-in local feedback export and clean report rules remain intact.
5. **Visual consistency.** Original shared headers, two-part instructions, question panels, contrast requirements, typography, completion next-step card and mobile navigation remain in use. Completion notes are lightweight inline text rather than additional cards, banners or animations.

## Outstanding after automated checks

- **Real classroom trial (not yet performed):** ask several Year 12 students of different confidence levels to begin unaided, complete a recall → choose → explain → exam path, and describe what "mastered" means. Specifically check whether Match Up's correction feedback and Contextual Reasoning's guided/independent paths feel fair and understandable.
- **Manual accessibility trial:** VoiceOver/TalkBack, hardware keyboard, 200% zoom and actual small phone in landscape. Automated Playwright focus/contrast/viewport checks cannot substitute for assistive-tech testing.
- **Optional future product work:** sessionless teacher-shareable anonymous feedback synthesis; question-bank expansion where student performance exposes under-covered misconceptions; optional multiplayer/awards only once a stable single-player baseline is confirmed.
- **Scoring caution:** "Mastery" is a local formative signal based on repeated credited practice. Flashcard self-ratings are subjective, matching is recognition, and human-assessed prose is not auto-graded. Do not interpret this as a predicted Pearson grade.

## How to rerun

```sh
npm install
npm run check
npm run test:e2e
```

The GitHub PR must pass both **Validate content bank** and **Test Sampling Arcade** (including Chromium browser tests) before merging. GitHub Pages publishing status must be checked separately after merge.
