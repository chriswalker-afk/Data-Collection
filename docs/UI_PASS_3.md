# UI Pass 3 — Responsive, accessibility and restoration stress audit

**Repository:** `chriswalker-afk/Data-Collection`  
**Status:** Implemented for automated verification in PR; real-user and assisted-technology observations still require a classroom test.

This audit builds on UI Pass 1 (grouped navigation and clearer cards) and UI Pass 2 (unified game instructions and truthful feedback). Its focus is **readability, keyboard/touch access and data safety**, not new maths or another game.

## Findings and fixes

| Finding | Fix | Scope or limitation |
| --- | --- | --- |
| Returning to Home from a game's Back link could leave keyboard focus in an element removed by rerendering | The Home hero heading now accepts programmatic focus; route changes focus the new page heading | Initial page load still does not forcibly steal keyboard focus |
| Skip to main moved focus but relied on browser-specific scrolling | Explicitly scrolls the main content into view and then focuses it | The main region remains keyboard addressable |
| A long question could leave a newly focused answer or Next control temporarily below the visible viewport while the page animated | Use immediate scrolling rather than CSS smooth scrolling, and scroll only enough to reveal an offscreen target | Prevents unstable focus and unnecessary viewport jumps for keyboard and touch users |
| Mobile navigation could remain open on breakpoint changes or when a user tabbed out | Close the mobile Menu and Activities disclosure on screen-size breakpoint change or when focus moves outside the header | Escape retains its existing focus-return behaviour; mobile menu remains in normal document flow |
| Exam reasoning/diagnosis and Exam Lab question sections lacked programmatic labels | Link each question section to its existing question heading with `aria-labelledby` | No duplicated visible headings |
| Feedback components depended on visually apparent states when announced | Label feedback region as Checked answer, Review answer or Self-review as appropriate; retain visible text and the existing polite announcer | Written reasoning remains self-reviewed and does not earn automatic marks |
| Invalid numerical inputs were only focused, with feedback in a separate alert | Tie a field-specific error to the invalid input using `aria-invalid` and `aria-describedby`, and clear the error as the input is corrected | Existing mathematical validation and stored values are unchanged |
| Some menus and revision links fell short of recommended touch target sizes | Provide at least 44px vertical targets for principal navigation, action links, options, checkboxes and reordering buttons | Small decorative elements are not interactive targets |
| Long prose, copied models and narrow report cards could overflow phone widths | Explicit `min-width:0`, overflow wrapping, flexible actions, narrow-screen padding and scroll margins | Target sizes include 320px, 390px, 768px, 1024px, 1280px |
| Older 800px CSS breakpoint still declared horizontal-scrolling navigation | Remove obsolete rules, keeping the Pass 1 header styles authoritative | Historical game-specific selectors remain unless safely removed |
| Animations and print styling varied between older games | Respect reduced-motion preferences; remove unnecessary buttons and navigation from printed outputs while preserving the report | No new tracking, accounts or downloads without student action |

## Test matrix

The `tests/browser/ui-pass3.spec.js` suite checks both desktop/mobile Chromium projects:

- Every one of the **ten activities** at **320, 390, 768, 1024 and 1280px**, plus a short-height landscape case
- Document and body overflow; presence of activity instructions and the actual question
- Keyboard skip link, route-change focus, focus visibility after answering, disclosure Escape and breakpoint changes
- Programmatic names for question regions and honest, text-labelled feedback
- Numerical error announcements, focus, `aria-invalid` and recovery on edit
- Principal interactive touch targets and representative calculated text/background contrast (4.5:1 for normal text)
- Reduced motion; local-storage unavailable experience; complete report printable layout; saved written draft
- Pre-existing desktop/mobile regression suites covering mathematical checks, restoration, privacy-first CSV, hints and all other game behaviour

The test workflow now preserves **synthetic-data screenshots** of Match Up, Contextual Reasoning and Exam Lab at 320px, 768px and 1280px in the `sampling-arcade-ui-pass3-layouts` CI artifact (seven-day retention). These captures support visual review; generated captures **do not by themselves prove** a human has inspected them or that a physical device behaves identically.

## Deliberate preservation

- The Pearson 9MA0 sampling content, accepted definitions, 46 original Exam Lab questions, and all ten games are unmodified.
- Existing `sampling-arcade-progress-v1` and `sampling-arcade-exam-v1` local browser data schemas are unchanged.
- Automatic correctness applies only to defined numeric or selected-answer exercises; writing remains **self-review**, not an official grade.
- CSV exports remain local, exclude drafts by default and retain spreadsheet-formula injection protections.
- The optional classroom feedback form still requires an explicit student download.

## What still needs real-world testing

Automated Chromium, DOM and CSS assertions are **not a substitute** for observation with actual pupils and assistive technology. A short validation session should deliberately include:
1. Students using keyboard only, keyboard plus screen reader (NVDA/VoiceOver), and touch with accessibility settings
2. Native browser zoom at 200%/400%, mobile browser font enlargement and orientation changes
3. Long answer entry in Exam Lab followed by feedback, resumption and printed/CSV outputs
4. Visible and audible focus/announcements checked by humans, not just automated DOM attributes
5. Any unexpectedly misleading phrasing, even when contrast and touch targets meet measurable checks

**Recommended next step after UI Pass 3:** run a 20–30-minute classroom usability validation using the Pass 7 protocol, then make a focused follow-up fixes pass based on recorded issues. Avoid expanding the activity bank before this trial.
