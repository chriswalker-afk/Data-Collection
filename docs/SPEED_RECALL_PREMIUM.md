# Speed Recall Premium — accurate retrieval, not a speed contest

## Educational goal
Speed Recall checks whether students can produce an Edexcel A Level Mathematics term from its definition without seeing the answer. Timed mode adds optional retrieval pressure, but **accuracy and precise vocabulary remain more important than raw speed**.

## Improvements
- A calm dark-teal timed start screen with the complete rules visible *before* the clock starts.
- A stronger visual hierarchy for definition, answer entry and feedback. The answer input is described by the actual definition for assistive technology.
- An understated timer with a declining visual track. The final ten seconds are more noticeable without alarming animation, audio or repeated screen-reader interruptions.
- Timer continues while attempting an answer, but pauses when feedback is displayed or the tab is hidden. Unsubmitted answers when time expires are not scored.
- Correctly recalled, wrong and skipped responses remain distinct. Feedback always shows the model term, a contextual mathematical example, and a relevant misconception or distinction.
- Pressing Enter on the focused result advances to the next term; native Next buttons and focusable input remain available.
- At completion, present percentage correct *among submitted answers*, number submitted and number skipped, explicitly saying it is **not an exam grade**. A zero-attempt timed round displays “Not yet measured”, never 0% mastery.
- Students who missed or skipped terms can start an **optional targeted untimed review deck** containing only those concepts, once each. Correct answers on this deck are credited only after the student types them correctly; no mastery is awarded merely for opening the deck.
- Review mode is clearly identified and includes a return to standard practice action.

## Scoring and safety
- Existing `gradeTerm`, curated equivalents, typo policy, skips and progress storage remain intact.
- A typo prompt is not scored and offers one correction. Each final submitted answer records exactly one attempt. Incorrect and skipped answers cannot earn independent mastery.
- User responses, review IDs and timer state stay in memory only, beyond the existing local aggregate progress system. No tracking or new personal data is introduced.
- Question bank, content JSON, route IDs, and the other nine games are untouched.
- No animation delay is imposed on answering or advancing, and all animations respect `prefers-reduced-motion`.

## Files and verification
- `src/speed-ui.js`: pure clock/summary/review helpers.
- `styles/speed.css`: isolated responsive styling.
- `src/app.js`: student view and optional review state, reusing existing marking and storage.
- `tests/speed-ui.test.mjs` and `tests/browser/speed-premium.spec.js`: calculation, accessibility, timer, review and responsive regression coverage.

Run `npm run check` and the full `npm run test:e2e` suite. Include at least 320, 390, 768, 1024 and 1280 pixel widths. Conduct a real-student trial and a screen-reader trial separately as described in `docs/PASS_7_CLASSROOM_TRIAL.md`.

## Next candidate
**Sort It!** is a natural next premium pass. Its value comes from discriminating between advantages, disadvantages and sampling-method distinctions. Responsive choice placement, category confirmation and explanation-led feedback could help students *reason about sampling methods*, rather than merely memorise labels.
