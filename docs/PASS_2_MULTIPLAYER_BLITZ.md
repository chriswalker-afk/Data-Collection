# Arena 2.0 — Pass 2: Blitz and the Self-Paced Engine

## Status
Blitz is now a playable objective in the Host Studio for **Free-for-All** and **Squad League**. Classic remains the unchanged teacher-paced game. Bullseye, Perfect Run, the full cooperative Class Quest and Puzzle Relay remain correctly marked as previews, with room creation disabled for unsupported configurations.

## Teacher setup
- Choose Blitz, a game from Which Method?, Speed Recall, Match Up or Sort It!, and a 1–15 minute shared countdown. Quick, Balanced and Stretch presets suggest 3, 5 and 10 minutes.
- Choose individual participation or 2–4 balanced teams.
- Existing Classic-only class accuracy goal does **not** silently apply to Blitz.
- The teacher launches the same room-code lobby, sees connected students and live checked progress, can stop early, and conducts the existing Grand Awards Ceremony when the countdown finishes.

## Student gameplay
- Each student receives a private, independently ordered task from the same audited question pool.
- When they submit, the Worker checks exactly one current answer. The student sees the checked answer/explanation immediately and explicitly chooses **Next question**. No teacher reveal/advance is required.
- The shared countdown is always shown on the teacher and student screen and cannot be extended by a client clock.
- Every deck item appears once in a cycle. When the limited audited bank is exhausted it reshuffles and avoids repeating the immediately previous question.
- The long-form Match Up (six pairs) and Sort It! (8–12 statements) boards remain available using accessible labelled selects in Blitz rather than unreliable drag-only controls; faster single-decision variants may be added later.
- Draft text/placements survive routine live updates on the same device; an authenticated reload restores the server-held question, grading evidence and feedback.

## Fairness and scoring
- **Individual rank** prioritises total *correct checked decisions*, then exact percentage accuracy, then points (which include only a small speed bonus). Displayed accuracy rounds to a percentage, but tie-breaking uses the exact underlying ratio.
- **Team rank** prioritises correct decisions per member, then checked accuracy, then average points. A bigger team receives no automatic advantage.
- No positive correct decisions = no invented winner. Equal results share rank.
- Server chooses and privately grades every question; clients cannot supply scores, achievements, start times or winning decisions.
- Per-player question keys and one-use submission state prevent duplicate scoring or answers to a stale question.
- All classic results and existing privacy/awards rules remain compatible. Blitz produces individually indexed, verified attempt evidence for mathematical achievements.

## Clock and reconnection
- Worker writes one shared UTC deadline on start, and Durable Object alarm transitions the room to finished automatically. Authenticated state requests and commands also finalize an expired round even if an alarm is slightly delayed.
- Refresh and WebSocket recovery use persisted Durable Object state and never reset progress, reorder the current question or extend the deadline.
- Leaving/removing a player correctly drops their results; only teacher credentials may end a round or launch a ceremony.
- After the results appear, the same server-authored awards ceremony and local nickname-free keepsakes remain available.

## Testing and release
- Pure unit tests cover all four question banks, private server grading, deterministic scheduling, no immediate repeats, valid duration bounds, independent player progress, and exact accuracy/point tie-breaking.
- Browser tests cover teacher/player participation, all four game formats, anti-spoofing and answer confidentiality, reconnect after reload, team fairness, early finalisation, and ceremony transition.
- Desktop/mobile layouts and existing 45-player/classic regression run in standard CI.
- **Do not deploy the production Worker or merge the release until the exact revision of the Worker has been tested on Cloudflare staging.** A smoke test against an old fixed staging URL cannot prove new Blitz code.
- Existing production SQLite Durable Object migration `v1` and storage are unchanged.

## Next
**Pass 3 — Bullseye + Perfect Run:** reuse the independent question scheduler and secure answer evidence to calculate rolling accuracy windows and consecutive streaks, including capped attempts, tie handling, and safe end conditions.
