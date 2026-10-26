# Pass 6 — Team Challenges, Collaborative Class Goals and Classroom Stress Testing

## Summary

Sampling Arcade now supports **optional balanced teams** and **class-wide mathematical goals** in all four existing Multiplayer Arena game modes, while retaining individual server-graded answers, the full Solo Arcade, the Trophy Cabinet and the Grand Awards Ceremony.

Teams and Class Quests are disabled by default, so existing classroom rooms remain familiar and compatible. The teacher chooses their format in the lobby. No account, chat feature, new Cloudflare product, data migration or paid storage is needed.

## Classroom journey

1. Host **Which Method?**, **Speed Recall**, **Match Up**, or **Sort It!** as before.
2. In the lobby, choose **individual competition**, **two**, **three**, or **four balanced teams**. Students are placed automatically with the fewest-members-first rule; the teacher may shuffle the assignments before starting.
3. Optionally set a **Class Quest** accuracy target: 70%, 80%, 90%, or Off.
4. Each student still answers on their own device. The existing one-answer-per-question rule, server-held solution key, deadlines and score calculations remain authoritative.
5. The student roster shows team membership; the side panel shows team standings and the Class Quest progress. **Unrevealed answers are not counted in public accuracy or score displays** until the teacher reviews the question.
6. During answer review, the teacher can share a concise mathematical prompt or their own teaching point, visible immediately to all connected students and to students who reconnect while that review is active.
7. After the challenge, students see **Team Quest** and **Class Quest** results. If teams or a Class Quest were enabled, the Grand Awards Ceremony shows those class achievements before the original individual podium and character awards.

## How scoring stays fair

**Individual scores are unchanged:** for a single answer, 1,000 points plus up to 100 for speed; for a whole sorting/matching board, partial credit up to 1,000, with a small speed bonus only for a fully correct board.

**Team ranking uses the average score per team member**, not total points. The team panel separately shows membership and total contributions. A team of 12 does not automatically outrank one of 11. Teams with equal averages share the same rank. Zero points do not create a fake podium winner. All calculations happen in the Durable Object; client requests cannot alter a mark, ranking or team assignment.

**Team Quest:** at least 75% correct decisions and 75% available submissions, with at least five checked decisions. **Class Quest:** a teacher-selected target of 70%, 80% or 90% correct decisions, together with 75% available submissions and at least five checked decisions. A goal is earned only once the round is finished; a single lucky response or repeated guessing never completes it. Mathematical board questions count each correctly classified/matched decision, while submission coverage counts one complete submitted board per participant.

The teacher may choose a different format before starting. Once in progress, players cannot be reassigned and the goals cannot change. Teachers retain lobby lock/unlock, removal, mathematical review, round transition and ceremony controls.

## Teacher feedback and classroom diagnostics

During **reveal** only, the server publishes aggregate checked accuracy and participation for that question. The teacher can choose a context-specific prompt or send a short note (3–160 characters). Messages are stored as plain text and rendered with textContent, not injected HTML. Only the teacher can send them; a maximum of three updates per question prevents spam. Messages never disclose answer keys before reveal, and they clear on the next question. This is for mathematical discussion, not student chat or automated AI judgment.

## Reliability and privacy

- A new **shared snapshot** computes class and team summaries once per broadcast, rather than repeating the calculation independently for each of up to 46 WebSocket recipients.
- Public marks and team averages exclude the **current unreviewed question** while playing. The authoritative Durable Object still grades immediately and prevents duplicate/replayed answers.
- Team allocation, member identifiers and current game progress live only within the short-lived classroom. There is no permanent team profile, cross-device log-in, persistent transcript or database migration.
- Existing single-use socket tickets, 45-player room cap, 3-hour room expiry, CORS and rate limits remain in place. Student requests to set teams/goals or post teacher feedback are rejected.
- Teams and class accuracy are derived from server-recorded, first accepted mathematical submissions, and no private correct answers are shipped to GitHub Pages.
- The existing solo progress, exam-writing data and 16 Solo awards remain unchanged. Individual Grand Ceremony collectible rules are unchanged; team success is celebrated at classroom level, not silently minted as an individual award.

## Testing and load evidence

- **Unit tests:** 45-player allocation and balance, pure scoring, average-point fairness, ties, goal thresholds, unreviewed-answer privacy, feedback validation and conditional ceremony slides.
- **Browser tests:** teacher settings, live team updates, unauthorized student commands, review-only feedback, reconnection, touch interfaces and responsive layouts at 320px and 390px.
- **Synthetic 45-player stress regression:** concurrent joins, 45 authenticated WebSockets, 45 simultaneous full-board submissions, 46th-join rejection, duplicate-answer rejection, delayed public scoring, six reconnections, completed Class/Team Quests and synchronised team podium. The test measures join/socket/answer durations and attaches timing data to its Playwright report.
- **Cloudflare staging smoke:** six real staging students exercise team assignment, unauthorized commands, correct sorting, post-reveal teacher feedback, Class Quest completion and ceremony slides, in addition to all four existing modes.

**Important limitation:** synthetic 45-player tests validate software behaviour, not Wi-Fi contention, real student devices, browser OS sleep, projector conditions or classroom motivation. A **supervised live classroom trial** remains necessary before claiming measured resilience at 45 school devices.

## Release gates

1. Run content/unit validation and the Pages artifact build. It must publish `multiplayer/team-ui.js` but exclude private `multiplayer/team-rules.js` and all answer/eligibility engines.
2. Pass full desktop/mobile Chromium and the fast multiplayer regression, including synthetic 45-device stress.
3. Deploy the feature branch to `sampling-arcade-multiplayer-stage` with the existing `ROOMS` Durable Object binding, and pass the expanded staging smoke test.
4. **Only then** deploy the exact tested Worker code to production, merge the PR, and verify GitHub Pages and both public URLs.
5. Do not claim real classroom Wi-Fi/device performance solely from the automated tests.

## What follows Pass 6?

**Pass 7 — Classroom Pilot and Evidence-Led Refinement.** Run a structured real class trial of 15–45 students across device types, gather teacher observations, measure joining/reconnect and question clarity, audit team fairness and accuracy of feedback, and refine any problem areas without adding unnecessary interface complexity.
