# Flashcards Premium — Real front/back cards and purposeful retrieval practice

## The problem

Previously the flashcard was a green question button that displayed a separate answer section beneath it. This pushed the page downward and felt more like an accordion than a physical study card.

## What this pass improves

1. **A physical, two-sided card:** Tap, click, Space or Enter to flip an actual card from prompt to answer. The same DOM button remains mounted; the front and back use CSS 3D rotation and backface visibility. The card height is set by the larger of both faces, eliminating layout jumps when flipping.
2. **A coherent visual design:** Dark-teal prompt face, warm neutral answer face, neat example and common-misconception panels, raised stacked-deck effect, shallow entrance animation for a new card, and calmer button design. The card remains the visual focus of the page.
3. **Student-friendly self-review:** Again / Nearly / Know it buttons appear only after the answer is revealed; the keyboard can also use 1 / 2 / 3 while the card or grading controls are focused. Only *Know it* records a correct recall in the existing mastery system.
4. **Optional targeted review:** Any cards marked Again, Nearly or Skip are available as a shorter review deck on completion. Starting the review does **not** automatically award mastery or change persisted local student data. Review retains the chosen direction and original deck order.
5. **Flexible mode selection:** Term → definition or Definition → term. Changing direction restarts the deck explicitly and does not modify learning records. Definition-to-term cards display the original definition on the front.
6. **Accessibility:** Both faces are in the DOM, but only the active face is exposed via `aria-hidden`. The flip button keeps keyboard focus and its accessible label/expanded state updates. A live announcement gives the revealed answer; keyboard shortcuts do not intercept input fields, navigation or modifier combinations.
7. **Reduced motion and responsive handling:** Reduced-motion preferences remove animation while preserving the visible card swap. The face layouts adapt to 320px/390px mobile widths, examples stack into one column, and both sides can grow vertically to accommodate long text.
8. **Focused implementation:** New `src/flashcards.js` isolates session/rating/review calculations, while `styles/flashcards.css` owns the visual treatment. All concepts, wording, scores, progress storage keys and other games remain intact.

## Mastery and progress safeguards

- `Know it` records a correct response (as before).
- `Again` and `Nearly` each record an attempt without independent mastery (as before).
- `Skip` does not record an answer, but adds the card to the *current session's* optional review pile.
- The review queue is in memory only; it is not a new storage schema and is not represented as spaced repetition scheduling.
- Finishing either a normal deck or an optional review deck records the normal finished round event. Restart creates a new shuffled full deck.
- Saved progress, existing activity routes and the content/question bank are unchanged.

## Tests and verification

Unit coverage in `tests/flashcards.test.mjs` tests new session creation, rating semantics, skip/review behaviour, direction retention and accessible content labels.

Browser coverage in `tests/browser/flashcards-premium.spec.js` checks actual 3D transforms, no DOM remount on flip, hidden faces and grade buttons, keyboard shortcuts and focus, mastery counters, optional review, direction switching, reduced motion, and 320px/390px/768px/1280px layouts. All existing practice, saved-state and UI regressions run in the full suite.

**Still worth observing with students:** whether the flip timing is comfortable on different physical phones, how naturally pupils discover tapping and self-rating, and whether the example/pitfall notes feel useful without making the back too busy.

## Next after this pass

Audit Match Up as the next individual function. Prioritise tactile matching, clear paired selections, responsive alignment, immediate but not overwhelming feedback, and accessible keyboard flow. Keep existing questions and progress semantics.
