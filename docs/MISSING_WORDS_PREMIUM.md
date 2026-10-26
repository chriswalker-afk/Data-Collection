# Premium Missing Words — retrieval journey

The original three levels (Recognise, Recall, Independent) and default level are preserved. The refreshed interface gives each level a visible purpose, a restrained sentence-based answer slot and clear feedback on *why* a word fits.

## Interaction
- The three-stage strip is descriptive, not three extra controls. The native labelled level selector remains available and changing level restarts the practice round.
- Choice answers are generous, labelled tiles. They show the correct word after checking, without giving premature clues.
- Typed answers appear live in the sentence, but this is **a preview only**: no correctness is checked or recorded until submission.
- Existing near-typo second chance, hint and reveal actions continue unchanged; pressing Enter submits.
- Feedback distinguishes correct independent answers, incorrect answers, skipped answers and correct answers achieved with a first-letter hint. A hint never earns mastery credit.
- Explanation remains tied to the mathematical sentence, rather than decorative celebration.
- Native controls, text-independent feedback, a sentence description for typed input, focus on feedback and next input, 320px layouts and reduced-motion styles.

## Files
- `src/cloze-ui.js` provides pure, presentation-only answer slot states.
- `styles/cloze.css` isolates all new design rules.
- `src/app.js` updates the level strip, answer feedback and live preview without altering persistence or grading.
- `tests/cloze-ui.test.mjs` and `tests/browser/cloze-premium.spec.js` test the new behaviour.

## Preserved
No content JSON, question banks, activity IDs, scoring formulas or saved-progress format were changed. Correct prompted answers still count only when independently retrieved; a typo retry does not create a second stored attempt. Other nine activities keep their existing behaviour.

## Classroom validation
Try a few questions at each level with students and a screen reader. In particular, check whether the stage descriptions are understood and whether entering a word in the sentence feels clearer than the previous disconnected input.
