# Pass C — Practical Method Fluency

## Purpose
Build deeper Edexcel 9MA0 sampling understanding by giving students genuinely different situations to sequence and compare, without inventing examination marking claims or inflating progress through reveal/restarts. The five existing sampling methods, first-check dependency rules, independent mastery, assistive controls and local progress data are preserved.

## Build the Method: 15 classroom-ready investigations
- **Three scenarios for each of five methods**, with Foundation, Develop and Stretch options. A **Varied investigations** setting chooses among them and prioritises a different case for each method when replaying; the named difficulty levels let teachers target a specific stage.
- **All five methods remain in a full round**, beginning with the student's preferred method. Students see an investigation title, real context, the precise task, five/three/four *context-specific* steps, then mathematical feedback and a contextual worked example.
- The underlying `DEPENDENCIES` proof stays unchanged. Alternative valid orders remain correct (e.g., eligibility checks and approaching available participants can be prepared in either order for opportunity sampling). No first-check credit is given for revealing a model or correcting an erroneous sequence.
- Each contextual model retains the five original methods' required operations and an explicit caution: frame coverage and repetitions in SRS; random-start and periodicity in systematic; random selection *within* allocated strata; fixed quotas but non-random respondents; availability rather than random selection for opportunity samples.
- `content/build-scenarios.json` contains 15 sourced, individually written cases with structured numeric metadata. All calculations are independently validated, including 480/40=12 systematic interval, 700 plots allocated 28/19/13 across three strata, and group quota totals. Non-integer systematic cases remain correctly covered by the original conditional guidance, not a false universal rounding rule.
- `src/build-context.js` validates ID coverage, exactly one case per level/method, unique contextual step text, method-specific prerequisite order, numerical coherence and source provenance. This is a pure module with no browser storage or assessment side effects.
- `src/app.js` shows the case and lets the student choose an investigation level. `src/build-method-ui.js` supplies model steps/working for that exact case, keeping the premium drag-and-drop, keyboard arrows, touch control, correction workshop and step-by-step dependency feedback. `styles/build-method.css` keeps the case brief visually distinct without adding another full-screen screen.

## Sort It!: all ten distinct two-method comparisons
- Previously six pairs; now **all ten unordered combinations** of simple random, systematic, stratified, quota and opportunity sampling.
- Four additional decks: **simple random vs systematic**, **simple random vs quota**, **systematic vs stratified**, and **stratified vs opportunity**. Each has ten or twelve statements, balanced across four destinations (advantage/disadvantage of each method). The original six boards and their IDs remain intact.
- **Ten additional curated evaluation points** (46 total), improving comparisons of whole-sample fairness, subgroup planning, random starts, periodicity, frame requirements, quota nonresponse and convenience-selection bias.
- Contextual claim overrides are used where a general advantage could fit both methods. All answer keys and feedback still come from the audited source evaluations.
- At the end of a board, **Try the next comparison** starts the next unmarked pair. **Play another round** still practices the same pair; this is a choice, not a forced long session.
- `src/sort-it.js` now rejects missing or duplicated method pairs and any board without at least two cards in each of the four destinations. The first complete check is still the only score; corrections and reveals never retroactively award mastery.

## Safeguards
- The original methods, dependency graphs, identifier keys, condition notes, progress schema, awards rules and multiplayer bank are unchanged.
- The original 36 evaluation statements remain in the original legacy rounds. Ten new evaluation points are used by the new paired boards and appear as additional *points* on the existing aggregated flashcard evaluation cards; this does not create more flashcard IDs or change their mastery scoring.
- The browser-only preference for recently used case IDs is not stored remotely.
- Unseen-first selection is best-effort: fixed challenge levels have only one case per method and therefore repeat by design; varied mode avoids each method's immediately previous case.

## Verification and release gates
- `scripts/validate-content.mjs` verifies both new banks and source attributions.
- `tests/pass-c-content.test.mjs` tests 15-case coverage, dependency checking, structured systematic and stratified calculations, quota totals, mixed replay rotation and ten four-zone comparisons.
- `tests/browser/pass-c-practice.spec.js` tests genuine controls, real model sentences, alternative dependency orders, first-check scoring, a full five-method round, new sort boards and 320/390/768/1280px layouts.
- Existing tests are updated only where they expected six pairs or all evaluations to belong to the original 36-card legacy bank.
- Merge only after content validation, unit tests, full desktop/mobile browser suites and staging multiplayer checks pass.

## Following development
**Pass D — Exam Lab Depth:** expand numerical and procedure questions, use unseen-first selection, and audit explanations and unscored written-answer self-review before a classroom trial. Test with students rather than assuming that more questions necessarily makes practice better.
