# Arena 2.0 — Pass 3: Bullseye + Perfect Run

## Student experience

Both objectives reuse the individually ordered, audited question bank and private checked feedback introduced by Pass 2. They work in **Free-for-All** and **Squad League** using Which Method?, Speed Recall, Match Up and Sort It!, with 2–4 balanced teams where selected.

### Bullseye — rolling accuracy
A teacher chooses a threshold between **60% and 100% in increments of 5** and a rolling window of **5–20 marked tasks**. To win, a student must first complete the full window; then their number of completely correct tasks in the latest N must meet the exact percentage. The Worker compares whole-number products, avoiding false wins from rounded percentages. Oldest tasks fall out as new ones arrive. The **first verified student** to reach the target wins, and their team wins if teams are enabled.

### Perfect Run — consecutive correctness
The teacher sets a streak between **3 and 20 fully correct tasks**. Each completely correct task adds one; an incorrect or partially correct task resets the streak to zero. The longest historical streak remains visible for reflection but does not count as the live streak. The **first verified student** to achieve the target wins.

### What counts as a task?
Each **Which Method?** or **Speed Recall** question is one task. Each **Match Up** or **Sort It!** board is one task, and must be **entirely correct** to increase rolling accuracy or a streak. Partial correctness still earns checked mathematical points and immediate explanations but counts as an unsuccessful task toward the objective. This avoids unfairly awarding a streak for a half-solved board and avoids inflated streaks in board-heavy games.

### Safety limit
Both races have a **1–15-minute teacher-configurable safety countdown** (Quick/Balanced/Stretch presets suggest 3/5/10 minutes). If no student reaches the target before the deadline, the Worker ends the game automatically and **does not invent a winner**. The teacher can also end early. The completed round retains the checked evidence and awards. New sessions require a separate room.

## Safety and fairness
- Targets are validated server-side in room creation; browsers cannot submit achievements, win flags, deadlines, or scores.
- One authenticated answer per current task; stale/duplicate submissions are rejected.
- Durable Object records wins in order of accepted mathematical answers, immediately transitions the room from playing to finished, and rejects subsequent submissions. Server time controls safety limits.
- Reconnection recovers the exact current question, feedback, rolling window or streak from persistent state without restarting the timer.
- Only the first verified target winner gets a podium rank; teacher-terminated and timed-out races have **no fictitious winner**. Mathematical character awards still recognise verified learning.
- For team races, the winning team is the one containing the first target-reaching student, not necessarily the largest or highest-raw-score team.
- Students see only their own checked answer/explanation, while the shared roster shows verified progress without revealing answer keys. Existing privacy controls, maximum class size, Classic and Blitz remain unchanged.
- The existing v1 SQLite Durable Object migration and production room storage are preserved.

## Tests
- Pure unit tests: thresholds at exact boundaries, 80% rolling window, history drop-off, early 100% not sufficient, invalid parameters, whole-board partial reset, streak recovery, unique winners, no bogus ranks.
- Playwright HTTP/browser: first-to-target race, accurate winner, partial Match Up reset, malformed/forged input, teams, no-winner closing, mobile student reconnect and answer feedback.
- Mandatory full Classic/Blitz/45-player browser regression and exact-version Cloudflare staging checks.
- The staging script requires `EXPECTED_BUILD_SHA` and verifies the actual separate test Worker health before calling its room endpoints.
- **No production Worker deployment or merge** before the dependency Pass 2 and the entire Pass 3 release gate pass.


## Browser-test traffic isolation
The full Playwright suite now starts a separate local Wrangler configuration
(`multiplayer/wrangler.test.jsonc`) containing an explicit `LOCAL_TEST_MODE`
binding. Only requests reaching **127.0.0.1** with that binding receive a higher
room-creation allowance, preventing unrelated parallel browser tests from
exhausting the 24-room production quota. Real production and staging Workers
continue to enforce **24 rooms per client per five minutes and 120 globally per
minute**. Unit tests prove both safeguards. The public Pages build does not
publish either the backend or its test configuration.

## Next milestone
**Pass 4 — Class Quest**, with configurable collective accuracy, number of correct answers, mastery of all five sampling methods, and meaningful participation safeguards.
