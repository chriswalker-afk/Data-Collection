# Pass B — Retrieval Depth

## Purpose
Make the recall activities worth replaying, so students retrieve the *idea* behind Edexcel 9MA0 sampling and data terminology rather than memorising a single cue or spending a whole lesson in one endless set. Preserve the mathematical source bank, existing Student/Trophy Cabinet progress keys, and the original unassisted-credit contract.

## Missing Words — 53 prompts (previously 25)
- `content/cloze.json`: 28 new questions; **53 in total**, with **at least two prompts for each of the 26 audited concepts**. This fills gaps in random sampling, stratum, selection bias, representativeness and sampling interval.
- Questions draw on definitions, contrasts, sampling frames and real small calculations: proportional allocation, class boundaries, width and midpoint. All questions have exactly one blank, four non-duplicated answer options, a model explanation and source provenance.
- A short **10-question** round is the new default; students may choose 20 where a topic has enough questions, or **All** (37 sampling, 16 types of data, 53 mixed).
- Short rounds balance concept coverage and prefer question IDs not shown in the immediately preceding round. They do not prematurely count as completion of the entire bank.
- Recognise, Recall and Independent levels are unchanged. Hinted answers remain unscored for mastery; a near typo requires correction before it can count.

## Speed Recall — 78 ways to ask 26 terms
- `content/recall-clues.json` adds **52 individually written alternative descriptions** (two per audited concept) to the existing original definitions.
- Each description is explicitly linked to a known concept, without introducing new accepted answers. The checking mechanism still uses that concept's label and curated mathematical synonyms, with the original exact-typing, typo correction, timer, skip, and progress rules.
- Each new deck chooses one of the three wordings per concept and avoids using the most recently shown wording on the next appearance. This also applies to timed deck cycles and optional targeted review.
- Clues do **not** insert the correct mathematical term into the prompt; the solution and related concept example are revealed only after checking.

## Match Up — depth and replay value
- Choose **5 (quick)**, **7 (extended)** or **10 (deep)** pairs for Sampling and Mixed Revision. The Types of Data topic contains eight concepts, so the longest option is **8 (all)**.
- The same curated alternate descriptions can appear in the definition column, with stable concept-ID matching and the original definition still available in the source bank. Students are matching meanings, not a fixed memorised phrase.
- The next match round prioritises concepts not used in the immediately previous round. That is a preference, not a false guarantee of wholly new terms when the topic contains fewer unused terms than requested.
- Tile accessibility, selected-state instructions, reduced-motion behaviour, animation locking and the first-try independent match scoring rule stay unchanged. Mistakes remain useful practice but do not receive unearned independent credit.

## Validation and release gates
- `src/retrieval-depth.js` contains independently testable selectors and validators. No answer source or learner response is transmitted to a server.
- Content validation requires every concept to have at least two valid Missing Words prompts and exactly two alternative recall clues. It verifies IDs, single blanks, four distinct choices, no full-label leakage, and provenance.
- `tests/pass-b-retrieval.test.mjs` verifies coverage, mathematical grading, no-repetition preference, 3-wording rotation, stable answer keys, topic sizes and immutable source data.
- `tests/browser/pass-b-retrieval.spec.js` checks real browser round-length choices, typing, scoring, restarts, alternative descriptions, 320px/390px layouts, and absence of horizontal overflow.
- Existing browser tests are updated only where they assumed a 25-item Missing Words bank or all 25 items in every round.

Run `npm run check`, `node scripts/build-pages.mjs`, and `npm run test:e2e`, including desktop and mobile Chromium, plus the existing staging multiplayer smoke. Merge only with all checks green.

## Next steps
**Pass C — Practical Method Fluency:** enrich Build the Method with diverse contextual sequencing tasks, complete all useful Sort It! sampling-method comparisons, then review whether the student instructions and responses still fit at 320/390px. **Pass D — Exam Lab Depth** follows, with a broader unseen-first question bank and more numerical and procedural practice.

A supervised classroom trial should follow these content passes; synthetic browser/Cloudflare checks are not evidence of actual student understanding or school Wi-Fi reliability.
