# Pass 4 — Exam Skills
Pass 4 adds three sampling-only games without replacing any of the six prior games or the existing progress key `sampling-arcade-progress-v1`.

## Build the Method
All five procedures are loaded from the audited `content/methods.json` bank. Students reorder randomly shuffled steps using keyboard- and touch-operable up/down buttons. A dependency checker accepts other valid orderings when preliminary actions are independent. A model procedure, conditional details, exam keywords and warnings appear after checking or revealing. Each procedure is recorded once; revealing does not award mastery.

## Spot the Error
Fifteen original problems across Foundation, Developing and Stretch difficulties. Students identify the faulty line and the corresponding repair, then study precise feedback. The question bank includes repeat handling, out-of-range rules, random starting points, proportional allocation, periodicity, incomplete frames, stratified-versus-quota confusion and false guarantees about representativeness.

## Contextual Reasoning
Nine problems across three levels ask students to choose a method, contextual justification, limitation and improvement. They may draft a written explanation. One defensible model and an alternative perspective are shown. The checklist is formative, not official Pearson scoring. It never automatically credits independent conceptual mastery, since alternative reasoned answers may be defensible.

## Validation
Pure mathematical unit tests cover dependencies, edge cases and assessment keys. Browser tests cover keyboard input, correct and incorrect grading, preservation of the v1 progress store, mobile layouts and routes. Run `npm run check` and `npm run test:e2e`; merge only after GitHub Actions passes.

## Next: Pass 5
A mixed exam-practice simulator with numerical proportional allocations, practical sampling design explanations, adaptive revision from mistakes, optional self-review of free-text reasoning and printable summaries. Do not claim automatic marking of written answers follows official Edexcel mark schemes.
