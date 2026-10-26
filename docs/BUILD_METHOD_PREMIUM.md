# Premium Build the Method — dependency-aware procedure workshop

## Educational design
Students construct valid Edexcel A Level Mathematics (9MA0) procedures for **all five sampling methods**. The task is not to memorise one canonical order. Its marking is based on **genuine prerequisites** in the original `src/exam.js` `DEPENDENCIES` and `checkProcedure` engine. In particular, the eligible-population and available-participant preliminaries in opportunity sampling can be interchanged: their relative order is *not* compulsory.

All five original procedures, mathematical examples, warnings, conditional caveats, mark-checking rules, method IDs and local-progress schema remain unchanged.

### Before checking
- Existing **First method** selector lets the student begin with any of the five methods and then work through all five.
- Premium, legible step cards sit beneath a short explanation of the sampling method and its random/non-random family.
- Students can **drag** cards to new positions using a grab handle, on mouse, pen and touch. An insertion highlight, lightweight floating label and reflow show where a step will move.
- The original **↑ / ↓** controls are deliberately kept as fully accessible keyboard, touch and mouse alternatives. Buttons stay at least 44 × 44 px.
- The interface does **not** reveal prerequisite relationships or step-specific answers before marking. An instruction does warn that independent preliminaries may be interchangeable.
- Students can **Check procedure** once or **Reveal model**; no credit is earned merely for clicking Reveal.

### After checking
- Clearly identify whether the student's first order is **valid**, **valid but different from the sample model**, or **has unmet prerequisites**.
- If incorrect, name the precise violated relationships and explain *why* each step must precede the other.
- Explain the purpose of all 20 audited steps across the five methods through collapsed **Why this step matters** sections within the model. These explanations are deliberately not shown before the student checks.
- A contextual worked example is available in a collapsed disclosure. Original exam keywords, caveats and warnings remain displayed.
- If incorrect or the answer is revealed, offer an optional **unscored correction exercise** with up/down controls and Check corrected sequence. It checks the same genuine dependencies, with no extra first-check credit or local-progress writes.
- A final five-method breakdown shows which procedures were solved independently, which need review and which models were revealed. It does not claim an examination grade.

### Scoring integrity
The existing app is still the **only authority** for `recordAnswer`, `recordSession`, correct first-check credit and progress saving. The new UI observes and explains first checks but **never changes or writes** `sampling-arcade-progress-v1` itself. It uses the existing `build-move` action for drag reordering, meaning the original step checker always receives the same state. Corrections are clearly unscored and cannot retroactively turn an incorrect first check into mastery.

### Accessibility and visual design
- Native buttons, descriptive labels, semantic ordered lists and disclosures; visible focus rings.
- Pointer gestures are paired with fully usable arrow controls; touch gestures originate on a large grab handle so the rest of the card can scroll normally.
- Responsive layouts for 320, 390, 768, 1024 and 1280px; clear text rather than colour alone identifies outcomes.
- `prefers-reduced-motion` removes lift effects and floating-label rotation.
- No audio, confetti, background tracking or external submissions. Original activity still works with arrows if the optional enhancement fails to load.

## Implementation files
- `src/build-method.js`: step titles and explanations, link-specific reasons, build validation, immutable move-to-position and report helpers.
- `src/build-method-ui.js`: enhancement of existing Build the Method UI, drag handling, explanation panels, unscored correction and completion summary.
- `styles/build-method.css`: isolated premium responsive style layer.
- `scripts/validate-build.mjs`: verifies that the explanation bank matches all audited sampling steps and dependencies.
- `tests/build-method.test.mjs` and `tests/browser/build-method-premium.spec.js`: unit and desktop/mobile regression coverage.
- `src/activity-guidance.js`, `src/core.js`, `index.html`, `package.json`: instructions and registration.

## Verification
Run `npm run check` and the full `npm run test:e2e` suite on a feature branch. Test pointer mouse and touch, keyboard arrows, every method, real prerequisite failures, accepted valid alternatives, reveal-without-credit, unscored correction, persistence, responsive widths and reduced motion. Trial on real classroom tablets and with a screen reader before claiming complete accessibility coverage.

## Recommended next premium activity
**Spot the Error** — present a realistic flawed sampling procedure, identify the incorrect line, select a repair, and explain the mathematical consequence. The experience should distinguish diagnosis from correction and help students understand plausible traps rather than reward guessing.
