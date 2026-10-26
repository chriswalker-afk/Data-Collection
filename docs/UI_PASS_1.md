# UI Pass 1 — Navigation and Homepage

## Goal

Make Sampling Arcade immediately understandable and visually navigable without changing any mathematics, game logic, saved student data, or routes. The previous 11-link navigation exceeded a typical desktop width and had a horizontal scrollbar. Uniform white cards were difficult to distinguish from the light page.

## Changes implemented

1. **Header navigation:** four top-level controls: Home, Activities, Exam Lab and My Progress. Activities is a native disclosure containing the nine practice games in three clearly labelled learning groups. The active activity is marked in the panel and the parent disclosure is highlighted. The panel can be closed by Escape, selecting a link or clicking outside.
2. **Mobile navigation:** one labelled Menu button opens a vertically stacked navigation without horizontal scrolling. The Activities disclosure nests inside it. The button communicates expanded/collapsed state and is touch- and keyboard-operable.
3. **My Progress:** direct in-page jump to the existing progress panel. From an activity, it returns to the home page for the same topic, scrolls the progress heading into view and moves keyboard focus to it.
4. **Four learning stages:** Learn & Remember (Flashcards, Match Up, Missing Words, Speed Recall); Apply & Choose (Sort It!, Which Method?); Explain & Evaluate (Build the Method, Spot the Error, Contextual Reasoning); Exam Lab (standout full-width activity). No games have been removed. Sampling-only cards explicitly indicate their scope.
5. **Contrast and scanability:** stronger borders, restrained shadows, compact cards and four deliberately subtle, different stage surfaces. A slightly darker site background separates white game content from the page.
6. **Simplified hero:** reduced desktop minimum height and padding, simplified illustration, shorter descriptive copy and direct links to Flashcards and Exam Lab. The topic chooser, Pass 7 learning journey, progress panel and classroom feedback are preserved.

## Implementation and quality principles

- Routing continues to use existing `#/game/topic` hashes. The `data-nav` links are updated to the current topic and sampling-only games continue to route to Sampling appropriately.
- The complete existing ten-game bank remains visible and clickable on the home page; no forced learning path. Existing local progress and unfinished exam writing are untouched.
- Stage IDs and names are defined in `src/core.js`. Both the homepage and the header group them by the same learning purpose.
- Header disclosures are keyboard focusable using native summary elements. Mobile Menu is a button with `aria-expanded`. Escape and outside clicks close transient navigation.
- Background colour alone never conveys which activity is available; stages also have names, descriptions, numbers and focus-visible clickable cards.
- Prefer small, isolated CSS modifications in this pass. More invasive typography and component cleanup belongs in UI Pass 2.

## Testing and acceptance

The pull request adds `tests/browser/ui-pass1.spec.js` for desktop navigation, keyboard Escape, outside-click behaviour, screen widths of 320/390/768/1024/1280, progress jumps, card contrast and all ten routes. Existing tests that navigated using old always-visible header links are updated to open Activities first. All other mathematical and progress tests remain unchanged.

### Remaining UI work

**UI Pass 2 — Design consistency throughout the games:**
- Standardise instructions and task framing to “What you are practising → What to do → Question”.
- Establish common typography, buttons, card spacing, input appearance and exam-feedback patterns.
- Make correct, incorrect and self-reviewed feedback consistent without claiming to grade written mathematical reasoning.
- Consolidate earlier pass-specific CSS and remove obsolete styles **after** checking that all ten games retain their functionality.

**UI Pass 3 — Responsive polish and accessibility:**
- Visual testing of real mobile/tablet/desktop layouts and long text, including 320px, 390px, 768px, 1024px and wider.
- Screen-reader and keyboard journey audit (menus, dialogs, feedback, focus restoration and progress).
- Reduced-motion, contrast and touch-target review; print and CSV report checks.
