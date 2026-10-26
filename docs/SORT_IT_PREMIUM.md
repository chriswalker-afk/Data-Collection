# Premium Sort It! — two-method, four-destination sorting

## Student task

**Students see two named sampling methods at once.** A bank of 8–10 **mixed up** statements contains advantages and disadvantages of both methods. They must place each card in one of four destinations:

| | Method A | Method B |
| --- | --- | --- |
| Advantages | Positive statements about A | Positive statements about B |
| Disadvantages | Limitations about A | Limitations about B |

For example, “Small subgroups may be underrepresented by chance.” belongs to **Simple random sampling → Disadvantages**, not to stratified sampling.

This is a complete redesign of the student-facing Sort It! activity. The original Pass 2 `content/sort-rounds.json` and `makeSortRound` remain in place as historical, audited source material and for other existing test contracts; **students now use the new paired-board experience**.

## Six carefully curated comparisons

The new `content/sort-pairs.json` sources every card from the previously reviewed `content/evaluations.json` bank, with its original mathematical explanation. Where a general advantage also applies to other methods, the pairing uses a contextualised claim that makes the intended distinction specific while preserving mathematical accuracy.

- Simple random sampling vs stratified sampling — **10 statements**
- Systematic sampling vs quota sampling — **10 statements**
- Stratified sampling vs quota sampling — **10 statements**
- Simple random sampling vs opportunity sampling — **10 statements**
- Quota sampling vs opportunity sampling — **10 statements**
- Systematic sampling vs opportunity sampling — **8 statements**

Every board has at least two advantages and two disadvantages for **each** method. All five sampling methods appear across the pairings.

## Interaction design

- **Drag cards** from a compact, scrollable statement tray to one of four visible drop zones. This uses native HTML drag-and-drop on computers, plus a grab-handle pointer implementation for touch devices.
- **Tap or keyboard alternative:** select a statement, then select its destination. This is easier than a long drag on a phone, and uses native buttons.
- Students can move any unmarked card between destinations or return it to the mixed bank.
- A sticky, compact selected-statement strip retains context during scrolling, with accessible announcements of placements and remaining cards.
- All 8–10 cards must be placed before checking. No automatic clues or premature correctness colours are shown while sorting.
- **First check** grades each statement once, using its existing concept ID. All first-check answers are recorded in the original local progress schema. Nothing is recorded while students place, move or return cards.
- After checking, incorrect cards are visibly marked. Students can rearrange and check again, but corrections **cannot retroactively change saved mastery**.
- An optional **Show explanations** action reveals the actual method, polarity and original mathematical reason on every card. This locks the submitted board as a model answer.
- **Finish round** records a single session and reports the first-check score, accurately labelled.

**No sound, gamified speed pressure, autoplay hints or external tracking** are added. The responsive layout uses adjacent tray and boards on desktop, compact scrolling tray and stacked destinations on phones, focus outlines and no forced motion.

## Tests

- `scripts/validate-content.mjs` checks every board has valid unique source statements, two methods, and enough cards in all four destinations.
- `tests/sort-it.test.mjs` checks the cards, answer keys, exemplar small-subgroup statement, scoring and invalid configurations.
- `tests/browser/sort-premium.spec.js` tests desktop dragging, tap and keyboard placement, errors and corrections, first-check persistence, answer explanations, changing sets, reduced motion and 320, 390, 768, 1024 and 1280px viewports.
- `tests/browser/phase2.spec.js` now tests the new Sort It! instead of obsolete one-statement-per-screen behaviour; **Which Method?** tests are preserved.

Run `npm run check` and the entire `npm run test:e2e` suite in CI. A real-classroom trial should include whether the four-way distinction genuinely supports students' comparisons, plus screen-reader and touch-device tests.

## Potential next activity

**Which Method?** is the natural next premium pass. Enhance scenario-based method recognition, ensure students focus on how a sample is *actually selected*, and improve the explanation of why plausible alternatives are wrong.
