# Multiplayer Arena 2.0 — Pass 1: Host Customisation Studio

## Scope and release contract

Pass 1 implements the **teacher configuration experience**, not self-paced gameplay. The existing classic Worker remains the authoritative source of truth for room creation, participants, scoring, timer, team allocation and awards. Existing Solo, Awards and Critter Lab behaviour is unchanged.

**Live today**
- Classic Challenge, with all four existing question activities and their exact allowed lengths/timers.
- Free-for-All: classic individual classroom play.
- Squad League: choose 2–4 balanced teams before room creation. The client uses the existing authenticated `teams-set` command immediately after creating a room.
- Existing optional class goal: 70%, 80% or 90%, applied with the existing `goal-set` command. It is explicitly distinguished from the future cooperative Class Quest objective.
- Teachers retain all lobby controls; failed initial team/goal application is reported and can be corrected in the lobby.

**Preview only, never submitted to the Worker**
- Blitz: configurable timed target (1–15 minutes).
- Bullseye: configurable rolling accuracy threshold (60–100% in steps of 5) and 5–20 qualifying answers.
- Perfect Run: configurable 3–20 consecutive correct answers.
- Class Quest: Accuracy / Knowledge / Mastery / Everyone Counts, meaningful class participation and target conditions.
- Puzzle Relay: individually assigned complementary tasks across multiple team screens.
- Planned modifiers: difficulty, question distribution, leaderboard visibility.

Selecting an unsupported combination disables **Create room**, provides a descriptive availability message, and never sends a new objective/format payload to the Worker. Merely selecting planned settings must not change live gameplay.

## Design
- Clear numbered steps: objective, participation, challenge setup.
- Recommended Quick, Balanced and Stretch presets, adjusted to valid board/question lengths.
- Per-objective settings and a live natural-language summary. The student join form remains independently sized; it no longer stretches to the height of the richer host panel.
- Advanced controls are in an optional disclosure to reduce clutter.
- Native fieldsets, labels, radio inputs, buttons and status/error messages; keyboard/tab order and 320px layout supported.
- Settings persist only as a tiny versioned draft in the browser's tab session storage. No student names or data enter this store. Malformed/old drafts fall back to safe validated defaults.

## Architecture
`multiplayer/host-studio.js` is a pure schema/validation/preset/preview module, reusable when implementing future Worker validation. `multiplayer/host-studio-ui.js` drives the controls. The existing `multiplayer/client.js` calls `legacyRoomSettings`, which rejects any future objective or Puzzle Relay format.

The GitHub Pages build explicitly copies the two new public Host Studio modules and associated stylesheet. It still **never publishes Worker logic or private answer keys**.

## Validation
- Node tests cover preset values across all activities, class metrics, malformed drafts, out-of-bounds targets, preview-only launch guards and classic payload integrity.
- Playwright tests cover actual Classic team/goal room setup via a local Worker, all planned previews and invalid values, session restore, accessible advanced controls and 320–1280px layouts.
- Existing multiplayer, solo, Critter Lab, awards, security and 45-player stress tests remain part of normal full-browser checks.

## Next
**Pass 2 — Blitz and the Self-Paced Engine:** server-side per-player questions, independent progression, shared time limit, consistent scoring, reconnection and fair final results. Only when that engine and its release checks are complete should the Blitz card be promoted from preview to live.
