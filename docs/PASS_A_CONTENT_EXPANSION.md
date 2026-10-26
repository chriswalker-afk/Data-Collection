# Pass A — Contextual Application and Reasoning Bank Expansion

## Scope
Extend three Solo sampling investigations without adding artificial question-count pressure or altering scoring, accepted mathematical vocabulary, routes, or browser-local progress.

| Mode | Before | After | Coverage |
| --- | --- | --- | --- |
| Which Method? | 20 | **50 scenarios** | 10 per method; seven application + three recognition each |
| Spot the Error | 15 | **30 cases** | Two per sampling method at each of Foundation, Develop and Extend |
| Contextual Reasoning | 9 | **30 investigations** | Two per sampling method at each of Foundation, Develop and Extend |

These questions are original school/workplace/research scenarios, not representations of particular Pearson past-paper mark schemes. Editorial scope follows the original site's Pearson 9MA0 sampling audit and source definitions.

## Short rounds are retained
- **Which Method?:** 5, 10, or 20, balanced across the five methods. Drawing 10 now uses only two of each method's ten authored items, so a replay need not repeat half the questions.
- **Spot the Error:** default 5 cases, an optional complete 10-case level. The short set draws one of each method when the bank permits. Each case still tests location, repair, and impact as three separate decisions.
- **Contextual Reasoning:** default three investigations, optional five (one per method) or all ten at a chosen difficulty. Both independent writing and guided four-part decision paths remain. No model, self-review checkbox or prose response becomes an automatic examination mark.

## Mathematical safeguards
- Simple random selection requires equal probabilities for whole samples of a fixed size; repeat labels are ignored only in without-replacement procedures. Out-of-range rejection is needed for unrestricted random digit sources, not a correctly constrained generator.
- Systematic selection requires a random start and fixed interval. A non-integer population-to-sample ratio has no single universal rounded rule; new examples include a valid interval of 5 with start 1 or 2 when selecting 40 from 197.
- Stratified allocation has random selection *within* the groups as well as the planned proportional counts. Matched group quotas without those random draws are quota sampling.
- Convenience and quota surveys do not automatically establish population representativeness; selection bias, nonresponse, small-subgroup variation and frame coverage are evaluated in context.
- Every new Which Method? application case supplies a precise short **evidence** quotation embedded in its question. Original 20 case evidence quotations remain supported for backward compatibility.

## Consistency and backward compatibility
- All 50 Which Method? scenarios are mirrored in the multiplayer private `multiplayer/scenarios.js` bank; the server continues to disclose only prompt and ID before revealing the correct answer.
- Source keys, all original cases, previous routes, storage versions, trophies, and existing self-assessment contracts are preserved.
- No student account, analytics, cloud progress storage or free-form automated essay marking is added.
- Validators enforce 50/30/30, method/difficulty balance, unique IDs, evidence quotations, correct option keys and authored feedback for each distractor.

## Tests
- `node scripts/validate-content.mjs`, `node scripts/validate-identify.mjs`, `npm run check`
- `tests/pass-a-content.test.mjs`: mathematical invariants, multi-level balance, exact source parity to Multiplayer, valid complete and focused decks, scored vs unscored assessment distinctions.
- `tests/browser/pass-a-content.spec.js`: interactive selectors, desktop/mobile layouts and preservation of saved progress on switching a round's length.
- Existing premium Which Method?, Spot the Error, Contextual Reasoning, multiplayer privacy, and wider 9MA0 exam practice tests must all stay green.

## Next planned passes
- **Pass B — Retrieval depth:** expand Missing Words coverage, add alternative Speed Recall clues, improve Match Up replay length and prompt variety.
- **Pass C — Practical method fluency:** more contextual Build the Method variants and the remaining Sort It! method comparisons.
- **Pass D — Exam Lab depth:** expand numerical/procedure questions and improve unseen-first selection, preserving honest self-review of written responses.
- **Classroom pilot:** observe real students including a 15–45-device session, decide whether short defaults are appropriate, and refine based on use rather than assuming longer rounds are always better.
