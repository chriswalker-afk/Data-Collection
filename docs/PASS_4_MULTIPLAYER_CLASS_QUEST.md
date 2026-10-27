# Arena 2.0 — Pass 4: Class Quest

## Four real cooperative objectives

Class Quest reuses the server-checked, independent question/feedback flow from
Blitz without creating an individual race or leaderboard. Teachers can choose
1–15 minutes, Free-for-All or 2–4 balanced teams, and any of the four audited
mathematical activities.

**Accuracy Quest:** the *mean of each responding student's individual checked
accuracy* must meet a 60–100% target. Every student who has answered has equal
weight, so excessive submissions by one fast student cannot swamp classmates'
scores. Uses unrounded accuracy to determine success.

**Knowledge Quest:** the class must collect 20–300 credited correct mathematical
decisions. A maximum of 20 correct decisions is credited *per student* towards
the shared goal. Correct statements in Match Up/Sort It count individually.

**Mastery Quest:** correct, independently checked evidence is required for all
five sampling methods. Each method must be demonstrated by **two distinct
students**. Correct Which Method? choices, correctly recalled method terms,
correctly matched method definitions, and correctly sorted method statements
all contribute to the same five-method matrix.

**Everyone Counts:** the specified percentage of the original roster must each
finish 1–10 entirely correct tasks, and two or more checked tasks. A Match Up
or Sort It board is one task and must be entirely correct to count here.

## Participation fairness

- Minimum **three students** to start. A configured threshold of 50–100% of
  the original roster (minimum three) must each submit **two fully checked
  tasks** before a quest can succeed.
- The roster is frozen when the host starts the challenge, and students who
  leave or are removed do not shrink the minimum contribution requirement.
- The calculation always needs at least five checked decisions and the
  activity-specific mathematical goal.
- The Knowledge goal is validated against the number of students in the
  lobby: `students × 20` is the highest possible credited total.
- An individual cannot submit client-side contributions, correctness,
  achievement flags, leaderboard positions, or finish times.
- The Worker marks one current question once, stores verified evidence,
  recomputes shared progress, and finishes immediately only if both the
  mathematical goal and meaningful participation are met.
- A timeout, host stop or unachievable collective goal gives **no fake win**.
- Teams share the same whole-class goal. There are no solo/team podiums in
  Class Quest. Individual mathematical character awards still recognise
  genuinely checked work, without ranking students.

## Student-facing experience

Accessible shared progress, automatic updates through WebSockets, method
mastery indicators, clear participation requirements, private mathematical
explanations after each submission and reconnection using Durable Object
state. The roster shows contribution status, not individual marks, and the
Grand Awards Ceremony celebrates the verified class achievement (or its
learning journey) without a competitive podium.

All four pre-existing modes (Classic, Blitz, Bullseye, Perfect Run) remain
unchanged, including their respective scoring and awards semantics.
Puzzle Relay / Class Mosaic remain future work.

## Verification

- Pure Node tests for target boundaries, three-person threshold, immutable
  roster denominator, per-student cap, weighted fairness and 5-method evidence.
- Playwright tests for all four objectives, 320px/mobile reconnection,
  confidentiality, anti-spoofing, frozen roster, class and team results and
  the no-podium ceremony.
- Existing full desktop/mobile Chromium, security and 45-player tests still run.
- Cloudflare staging must use **the exact current commit SHA** and the new
  Class Quest service smoke before production deployment.
- Production Durable Object migration and existing classroom storage are not
  changed; the server retains a separate per-room, short-lived quest state.

## Next

**Pass 5 — Puzzle Relay and Class Mosaic:** team members receive genuinely
complementary problems that assemble into a shared mathematical result.
