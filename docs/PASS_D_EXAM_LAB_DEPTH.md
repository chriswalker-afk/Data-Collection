# Pass D — Exam Lab Depth (100 questions)

## Educational purpose
Extend the Edexcel 9MA0 Sampling Arcade beyond identification and recall. Students should carry out procedural steps with context-specific numbers, decide whether evidence supports a population inference, and explain limitations without mistaking a worked model for independently assessed work.

The **four-skill paper structure** stays unchanged; the original 46 questions, existing records, score rules and manual writing review remain compatible.

## The 100-question Exam Lab

| Skill | Earlier | Pass D | How it is assessed |
|---|---:|---:|---|
| Proportional stratified allocations | 8 | **20** | Exact, automatically checked whole-number group allocations |
| Systematic sampling calculations | 8 | **20** | Exact interval and final selected list position |
| Describe/critique a sampling procedure | 9 | **24** | Student-authored explanation, self-reviewed against contextual model steps |
| Evaluate a method or a population claim | 21 | **36** | Student-authored inference or method critique, self-reviewed with explicit ideas |
| **Total** | **46** | **100** | Balanced quick/standard/full papers continue to contain each skill |

The expanded evaluation bank contains **21 inference/census** and **15 method-critique** questions. Both appear in an eight- or twelve-question paper. Difficulty remains Foundation, Develop and Extend, with *Build confidence*, *Mixed progression* and *Stretch* options.

### Mathematical integrity
- All 20 proportional numerical tasks require exact integer allocations. Every group is assessed individually and the allocations total the requested sample size. For genuinely fractional allocations, students instead discuss defensible rounding in **written** tasks; no automatic decimal rounding is imposed.
- All 20 automatic systematic tasks use integer `N/n` and a first random position within `1..k`; `last = start + (n−1)k` is checked against `N`.
- Written work explicitly covers invalid three-digit labels (000 and out-of-range), rejection of repeated IDs, random selection *within* strata, numerical subgroup targets versus non-random quota recruitment, periodicity and the pitfalls of overgeneralising.
- Non-integer systematic cases are handled through critical *written* questions, including 515 records / 40 selections. One valid interval-13 scheme restricts the initial position to 1..8 to keep the fortieth position within 515; it is **not** claimed to yield equal inclusion probabilities or represent a universal rounding rule.
- All examples are original teaching material using the repository's Pearson-aligned conceptual source register, not official past-paper reproductions or mark schemes. Student self-checks are never represented as examiner marks.

## Unseen-first papers and safe continuity
The new `makePaper(...,recentIds)` prioritises questions absent from the student's recent practice, then the least recently used ones, while maintaining:
1. One of each skill type in a four-question paper, two each in an eight-question paper and three each in a twelve-question paper.
2. An inference and a method critique among the evaluation items of standard and full papers.
3. Ascending difficulty within a mixed paper.

A bounded `recentQuestionIds` array of **at most 60 IDs** is added optionally to the existing local `sampling-arcade-exam-v1` record. No account, analytics or network transmission is involved. Existing stores lacking the field remain readable, and invalid/unknown history IDs are discarded. The old question IDs, targeted-review queue and saved written drafts are unchanged. Cancelled replacement of an unfinished paper never writes new history.

## More honest written self-review
- **Write, then compare**: the response remains alongside the model, with only the student marking points genuinely present. Written responses never award automated numerical mastery.
- **Reveal without writing**: shows the model for learning, but disables self-check boxes, records zero self-checked ideas and automatically keeps the item as a review target. Sanitisation also prevents legacy saves containing ticks but no writing from being misreported.
- **One improvement for next time**: optional short note (maximum 600 characters), saved locally with the draft, visible in the student's report. The 100-question evaluation bank also adds optional collapsible guidance to the newly written scenarios so the page does not become visually crowded.
- Default CSV exports do **not** contain student-written drafts or improvement notes; both are available only via the existing explicit writing opt-in. Formula-shaped text is escaped to prevent spreadsheet execution.

## Testing, accessibility and safeguarding
- `scripts/validate-content.mjs` checks the 100-question shape, distribution, source links, exact numerics, valid worked models and staged hints.
- `tests/pass-d-exam-depth.test.mjs` validates all 100 questions, exact allocations and intervals, procedure/inference coverage, unseen-first behaviour across all three difficulty levels, recent-history sanitation and CSV privacy.
- `tests/browser/pass-d-exam-depth.spec.js` exercises real start/replacement flows, four-stratum calculations, model-only review, improvement notes, reload/resume, and 320/390/768/1280px layouts.
- Existing `tests/exam-sim.test.mjs` expectations update to the expanded bank; Passes A–C, ten original solo modes and classroom multiplayer remain compatible.
- Merge only when full content/unit, browser desktop/mobile, fast multiplayer and Cloudflare staging smoke tests pass. GitHub Pages is published from `main`.

## After Pass D
Conduct a supervised classroom trial of the ten activities, especially varied practice duration, procedural explanation quality and whether learners correctly distinguish **self-checked writing** from externally checked answers. Use student work and teacher observations to guide a further polish pass rather than automatically adding yet more questions.
