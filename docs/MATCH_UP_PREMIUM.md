# Match Up Premium — focused, tactile pairing practice

## Purpose and baseline

The previous Match Up showed two columns of text buttons and removed matching pairs immediately. Students could select either side but received little visual confirmation. On a phone, the columns stack, which made it easy to forget what was selected while scrolling.

This targeted refinement improves **one existing game**, rather than adding features or distracting effects.

## Improvements

- A clearly defined match board with restrained teal and blue styling for **terms** and **definitions**, plus high-contrast selection outlines, a clear tick and a numbered five-pair progress indicator.
- A context-sensitive direction strip: “Choose a term or definition” → “Term selected. Now choose its definition” (or the reverse). The selected item's text remains visible near the board heading.
- On phones and tablets, the direction strip remains visible while scrolling to the second column; it returns to normal flow on short landscape screens.
- **Correct matches:** both selected tiles briefly brighten and lift together before disappearing. Remaining tiles ease into their new positions using browser animation. Progress and stored correctness are recorded exactly once when the pair is settled.
- **Incorrect matches:** a short, restrained sideways nudge and amber text-independent error treatment. The pair remains available; the existing wrong-answer accounting and feedback apply once.
- First-choice toggling and replacement are supported, and students can start from either the term or the definition.
- Keyboard focus goes to the opposite column after a first choice, then to the next available term after resolution. Every tile remains a native button with an accessible name and `aria-pressed`.
- During a pair animation the board uses `aria-busy`, tiles use `aria-disabled`, and repeated clicks are ignored so the same attempt cannot be recorded twice. The existing polite announcer describes the result.
- Reduced-motion preferences bypass both exit animation and reflow effects; no sound, confetti or forced timing games.
- A pending animation is cancelled on route, topic or round changes so it cannot record a score on a different activity.

## Safeguards

- Existing `makeMatchRound` vocabulary bank and randomised five-pair deck are unchanged.
- A correct pair calls the existing `remember(id,true)` **once**; an incorrect pair calls `remember(id,false)` **once**. Merely selecting or changing a highlighted tile does not count as an attempt.
- Existing `sampling-arcade-progress-v1` storage, score reporting, finished-round logic and ten-game navigation are unchanged.
- No new user tracking, sound autoplay or stored personal information.
- Styling isolated in `styles/match-up.css`. Pure selection and instructional helpers live in `src/match-up.js`.

## Checks

Run `npm run check` and `npm run test:e2e` before merging. New tests cover:

1. Five-item matching board, progress and accessible selection prompts.
2. Success animation, two matched tiles and single correct result.
3. Incorrect-choice animation, no removal and single incorrect attempt.
4. Keyboard and definition-first interaction, toggle/cancel selection.
5. Navigation away mid-animation without stale scoring.
6. Reduced motion and responsive layouts at **320, 390, 768, 1024 and 1280px**.
7. Original game and progress regression tests, including a full five-pair round.

### Next individual function

After students experience this version, **Missing Words** is a useful next candidate. Its three levels can be refined into a more fluid retrieval journey, especially typed-answer feedback, helpful correction and the transition from guided to independent recall. Review its actual teaching value and accessibility before adding decoration.
