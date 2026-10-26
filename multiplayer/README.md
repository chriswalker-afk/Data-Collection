# Sampling Arcade — Pass 1: Multiplayer stabilisation

The original single-player arcade remains available at `index.html`. Multiplayer is an independent classroom experience at `multiplayer.html`, using the same reviewed `content/scenarios.json` question texts and sampling-method answer keys.

## Classroom experience

1. Teacher selects Multiplayer > Create room and chooses 5, 10, or 20 questions.
2. Students join from any device with the six-digit room code and a nickname, without accounts.
3. Teacher starts a round; the server privately chooses a balanced deck (all five methods).
4. Students submit **one** answer per question. The server validates the answer and awards 1,000 points for accuracy plus a small 0–100 time bonus.
5. Teacher reveals the mathematics once all students have answered or the 20-second timer finishes.
6. Teacher advances through the round; standings stay in sync. Students can reload and reconnect from the same browser tab.

### Privacy and safeguarding

- No student accounts, emails, chat, analytics or permanent profiles.
- Room participants are nickname-only; a class room expires after three hours and stores no historic results.
- Session tokens are kept in per-tab `sessionStorage`, never in browser history or the public leaderboard.
- Browser WebSockets use **one-use tickets** obtained with an authenticated HTTPS request; tickets expire after 30 seconds and are not reusable.
- Cloudflare Durable Objects authoritatively enforce roles, scoring, questions, and time limits.
- Per-IP room creation is strictly capped at 12 per five minutes through a dedicated Durable Object instance; a separate global counter limits 120 per minute. Per-room joining permits up to 75 attempts per network per minute, with a hard 45-player room cap. School shared addresses are not denied access by an overly tight per-IP join restriction. Rate limiting identifiers are SHA-256 hashes, not raw IPs.
- Only the GitHub Pages origin and local development origins are allowed as browser origins.
- Answers, award conditions and correctness are **not revealed before the teacher reveals the question**.
- This first pass has no class chat or individual student account recovery. A full awards ceremony is deliberately reserved for Pass 5.

## Network architecture

- Static site: GitHub Pages, unchanged for solo activities
- Multiplayer worker: Cloudflare Workers + SQLite-backed Durable Objects
- One Durable Object per classroom; small DO instances also enforce strict creation limits
- WebSockets: hibernatable real-time state pushes; HTTPS commands remain server-authoritative
- Backup: if the WebSocket drops, the page retries exponentially and polls every **15 seconds only during reconnection**. It does **not** poll continuously during normal play.

### Run and test

```sh
npm install --no-audit --no-fund
npm run check
npx playwright install chromium
npm run test:e2e
```

Playwright launches two local servers: Python static files on port 4173 and Wrangler/Cloudflare DOs on port 8787. Multiplayer browser tests run host and student contexts in the same test against the **real local Worker runtime**, including reconnect, scores, rules, CORS, and data secrecy.

Production Worker deployment configuration is in `multiplayer/wrangler.jsonc`. From the repository root with a Cloudflare-authenticated CLI:

```sh
npx wrangler deploy --config multiplayer/wrangler.jsonc
```

Do **not** add Cloudflare credentials to GitHub source files. Deployment through the connected Cloudflare integration is also possible; in that case upload the bundled Worker as a module, preserving the SQLite `GameRoom` class and existing migration tag `v1`.

### Deployment and verification

Before merging, require green content/unit and Chromium browser workflows; then verify a classroom with two real devices and one refresh. Recheck that solo exercises and local progress are unchanged. Unlike the original prototype, there is no duplicate question-answer bank risk left unchecked: `tests/multiplayer.test.mjs` verifies an exact source-to-bundle match.

**Next: Pass 2 — Unified Arcade Experience:** a cohesive Solo / Multiplayer / My Awards navigation, premium lobby and classroom presentation, with the existing ten solo activities preserved.
