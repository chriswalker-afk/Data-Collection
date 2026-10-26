# Pass 0: Edexcel-aligned content audit

## Scope and status
The repo was empty at project start. This pass supplies a structured, reusable, **editorially reviewed** bank for the six planned games. It is content infrastructure, **not yet a playable website**.

The uploaded teacher screenshots define the scope and preferred terminology. A Pearson chapter sample and enhanced 9MA0 guidance are linked in `content/sources.json`. Definitions and explanations are independently worded, not copied as textbook pages or presented as mandatory word-for-word examination mark schemes.

## Coverage
- **Sampling vocabulary:** population, census, sample, raw data, sampling unit/frame, random sampling, stratum, selection bias, representativeness, sampling variation, sampling interval, proportional allocation.
- **Five sampling methods:** simple random, systematic, stratified, quota and opportunity (also convenience).
- **Evaluation:** advantages and disadvantages of census, sample and each method.
- **Introductory data:** qualitative, quantitative, discrete, continuous, grouped frequency, class boundaries, width and midpoint.

## Key mathematical/editorial decisions
1. **Simple random sample:** every *possible sample of the given size* is equally likely. Equal individual probabilities alone are insufficient for this full definition.
2. **Random numbers:** assign unique numbers to eligible units; select distinct values; **ignore repeats**. Reject out-of-range values **when using a source that can produce them**, not unconditionally when a generator is restricted to 1..N.
3. **Stratified:** strata must be mutually exclusive; proportional allocation uses (stratum size/population size) x sample size. Selection **within each** stratum must be random, with no duplicate pupils. Integer rounding requires checking total allocation.
4. **Systematic:** regular interval after a **random start**. For N/n not an integer, do not teach a universal rounding rule; choose a valid systematic plan in context.
5. **Quota vs stratified:** proportional targets alone do not imply random stratified sampling. Quota uses non-random selection within targets.
6. **Bias:** chance selection can reduce selection bias, but it does not guarantee representativeness. A census can also contain measurement and non-response errors.
7. **Data type:** rounded measured times remain continuous in the model; categorical codes are not automatically quantitative.
8. **Game ambiguity:** advantage/disadvantage rounds are **method-scoped**; the question does not assume a unique method from a generic claim such as 'quick'. Scenario contrasts explain distinguishing information.

## Content model
- `concepts.json`: definitions, key phrases, examples, misconceptions, aliases, provenance
- `methods.json`: exam procedure steps, worked examples, conditional caveats and keywords
- `evaluations.json`: reasoned advantage/disadvantage items by subject
- `scenarios.json`: method identification with reasons and contrasts
- `cloze.json`: one-blank questions with four unique options and explanations
- `sort-rounds.json`: safe polarity and explicit two-method comparisons
- `sources.json`: provenance and editorial policy

IDs are stable. Do not automatically score free-form explanations by exact string equality. For typed keywords normalize case, whitespace and allowed aliases; assess extended procedure steps by explicitly designed rubrics with student-friendly feedback. Never claim automated answers match a particular unseen mark scheme.

## Run checks
`node scripts/validate-content.mjs` (Node 20+). No packages required.

## Pass 1 entry criteria
Use this bank in a static, accessible site with three games: flashcards, matching and missing words; mobile/keyboard interactions, progress in local storage, and unit/browser tests. Keep the source fields internal to an optional teacher-facing information view. No personal accounts or analytics initially.

## Sources and limitation
See `content/sources.json`. The screenshots were provided in chat; they are **not** uploaded verbatim to this public repository. The bank is aligned to their content and published Pearson guidance but it should undergo teacher approval before claiming any item is a verbatim Edexcel definition.
