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

## Evaluation extension — Sampling strengths and limitations

- The original 26 definition cards remain intact; the flashcard view combines them with **14 evaluation cards**, generated from the existing, audited `content/evaluations.json` statements. There is one advantages and one disadvantages card for each of simple random, systematic, stratified, quota and opportunity sampling, plus census and sample.
- Sampling has 32 cards, Types of Data has eight, and Mixed Revision has 40. These evaluation entries **do not enter** `content/concepts.json`: Match Up, Missing Words, Speed Recall and their accepted term banks remain definition-only.
- Evaluation card fronts explicitly ask for a method's advantages or disadvantages. The back groups each audited claim with its contextual explanation, so students learn why a point matters rather than memorising an isolated phrase. Term-only reverse mode does not reverse these evaluation prompts.
- **Browse all cards** is available during the game or on completion. Students can search all card text, filter for terminology/advantages/disadvantages, expand individual answers or reveal all. Browsing leaves the active session and local mastery entirely unchanged.
- **Review all cards** is available from the browser and completion screen. It cycles through the whole topic in stable order, using the same accessible flip-card controls. This is explicitly unscored: self-ratings during a review do not add mastery answers or collectible self-rated awards.
- The original short review of Again/Nearly/Skipped cards remains, and is also unscored. A complete standard session still records per-card self-rated recall and awards exactly as before.
- All entries are generated from one audited source rather than copied into a separate answer bank. Search/filter widgets, responsive card panels and display-only controls introduce no new saved storage schema.

Tests: `tests/flashcards.test.mjs` checks method/polarity coverage and source equality; `tests/browser/flashcards-library.spec.js` covers library search, filter, reveal, unscored review, topic counts and 320/390/1280px layouts. The premium flip-card browser regression covers both evaluation and term faces.
