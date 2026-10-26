# Pass 5 — Grand Multiplayer Awards Ceremony

## Student and teacher experience

Pass 5 introduces a live, synchronised ceremony after **any** of the four Multiplayer Arena game modes. At round completion the teacher chooses **Start awards ceremony**; nothing launches without the teacher. The ceremony is shared by every currently connected device through the existing Durable Object/WebSocket room state.

1. **Welcome:** celebratory introduction to mathematical thinking.
2. **Podium:** gold, silver and bronze positions based strictly on server-awarded points. Equal scores share the same rank; the next place uses competition ranking (1st, 1st, 3rd). Students who score zero do not receive a fictitious medal. An empty podium is explained, never manufactured.
3. **Mathematical character reveals:** one screen per actually earned achievement. Each reveals the quirky character, requirement and winning nicknames. No client chooses which awards exist.
4. **Finale:** celebration and total count of achievements and recipients. No hidden autoplay timer.

The teacher may move forward/back, skip to the finale, end the ceremony, or replay after finishing. Students cannot use the teacher commands. Reconnection restores the current shared slide, not the first slide. Presentation mode and keyboard/touch controls still work.

## Server-verified awards

The Worker maintains a bounded result ledger with **one accepted, server-graded submission per player per question**. It records only player ID, question identity/index, checked correctness totals, point score and, where appropriate, the correctly identified method or term. It never records typed free-text answers, nicknames in the evidence, or any score/achievement sent by the client.

Awards are determined by \`multiplayer/ceremony-rules.js\` using only this server ledger:

| Award | Verified condition |
| --- | --- |
| Sampling Fox | Three different sampling methods correctly identified |
| Bias Buster | Both quota and opportunity correctly identified |
| Method Maestro | All five sampling methods correctly identified |
| Recall Raven | Five distinct correctly typed terms |
| Match-Up Mongoose | One fully correct six-pair Match Up board |
| Sorting Salamander | One Sort It! board with eight or more placements all correct |
| Precision Penguin | At least five checked decisions, with no errors |
| Steady Stoat | Three consecutive completely correct questions |
| Comeback Koala | An error followed by two later completely correct questions |
| Calm Capybara | At least 10 correct decisions over 12+ checked decisions and two or more submissions, at least 80% correct |
| Quota Quokka | Correct quota identification in two different scenarios |

Partial, empty, fabricated, duplicate, unauthenticated and out-of-time responses cannot independently earn mathematical awards. Correctness matters more than speed. The requirements are transparently described, and only earned award types are included in the ceremony slides.

## Security and privacy

- Only the teacher's existing room credential can start, advance, reverse, skip, finish or replay the ceremony. Students' HTTP attempts receive an error.
- Before the teacher starts, the game-complete state discloses no future ceremony award list. During the ceremony, only the *current* slide is sent to students, preventing spoilers.
- Server results and ceremonies live in the same temporary room; existing three-hour expiry and rate limits are retained. No migration, account, student database, or new Cloudflare resource is required.
- The authenticated student receives only **their own** award receipt on reaching the finale (or upon reconnecting to a completed room), without exposing other students' award collections.
- The public Pages artifact contains the presentational award catalogue and the ceremony UI; it never includes the server grading/eligibility rules or question answer keys.

## My Awards — separate Multiplayer keepsakes

The client stores a minimal, nickname-free local memento of a server-reported achievement from a completed live ceremony under \`sampling-arcade-multiplayer-keepsakes-v1\`. It retains only a random room identifier, game, award IDs and collection date; duplicate receipt delivery cannot award twice.

The **My Awards** page now shows these multiplayer keepsakes in a clearly separate gallery beside the existing sixteen Solo trophies. Students can clear just their multiplayer keepsakes. Existing Solo achievements, export/restore, locally stored mastery and exam writing are never changed by this system.

**Trust boundary:** A memento is derived from server-graded results at the moment of receipt, but local storage can later be edited and does **not** constitute a cryptographically signed certificate, independently authenticated after the short-lived room expires. No claim of persistent cloud identity or permanent verified award history is made.

## Accessibility and reliability

- Reveal sequence uses text headings, an explicit progress indicator, screen-reader announcements and clear teacher controls.
- No timed forced transitions, flashing confetti or disruptive overlays.
- Subtle CSS entrance animations are disabled by \`prefers-reduced-motion\`; podium cards and recipient lists wrap and scroll at 320px, 390px and larger widths.
- Previous Solo and multiplayer modes, reconnect behaviour, result scoring and membership controls remain available.
- New tests cover unit award conditions and ties, server secrecy and permissions, replay/skip/rewind, real WebSocket staging behaviour, mobile overflow, locally saved keepsakes and compatibility with Solo progress.

## Deployment checklist

1. Run \`npm run check\`; validate the Pages build with \`node scripts/build-pages.mjs\`.
2. Run Playwright browser suite, including two-device teacher/student ceremony and 320px/390px presentation.
3. Deploy the proposed Worker to \`sampling-arcade-multiplayer-stage\`. Run the expanded \`scripts/multiplayer-smoke.mjs\` with real authenticated sockets and all game types.
4. Review the complete PR and latest CI. **Only after all checks pass**, deploy the exact staged Worker bundle to \`sampling-arcade-multiplayer\`.
5. Merge PR into \`main\`; verify Pages deployment for the new UI modules and verify the production Worker version.

## Pass 6 follows

**Team Challenges, Collaborative Class Goals and Classroom Stress Testing**: optional teams with balanced sizes, cooperative mathematical goals, teacher progress/feedback, reconnect and anti-spam safeguards at 30–45 students, and accessibility/latency checks. Preserve verified individual answers, nickname privacy, and the single-player Arcade.
