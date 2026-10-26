# Sampling Arcade — Pass 2: Unified Arcade Experience

## Delivered

**Unified navigation.** The home page now offers a clear three-way choice between Solo Arcade (ten existing games), Multiplayer Arena (live classroom game) and My Awards (a **preview**, not an active trophy collection). The header has corresponding routes. The same brand and typography are used on all three pages, with responsive layouts and keyboard-accessible actions.

**Premium multiplayer lobby.** The teacher and student journeys have distinct colour-contrasted panels, straightforward guidance, and readable input controls. A shared join link can prefill the code without ever embedding tokens. The classroom banner emphasises the six-digit code on a projector, displays connection state, lets hosts copy a code or student link, and supports optional full-screen presentation.

**Teacher authority.** A teacher can lock and unlock new joining while the room is in the lobby, see a continuously updated roster of up to 45 nickname-only participants, and remove a nickname from that lobby. Students cannot impersonate the host to perform these commands. Once the challenge starts, host controls enable revealing only after all current players answer or time expires, with the existing ability to end a round early. The question, mathematical explanation and leaderboard are visually distinct.

**Safe exit.** A student leaving the room is removed from the roster. A teacher leaving an active room closes the challenge for the class after confirmation. Removing a student revokes their token and WebSocket connection. No personal names, emails or permanent student accounts are collected.

**Awards boundary.** My Awards is an honest upcoming-features page. The data model and award engine will be built in Pass 3; neither badges nor unearned trophies are invented in Pass 2. The multiplayer awards ceremony remains a later pass.

## Backward compatibility

- The ten solo activities, content banks, routes, local progress key \`sampling-arcade-progress-v1\`, and all existing recorded mastery are unchanged.
- Existing shareable links continue to work, including \`index.html#/identify/sampling\`.
- Single-player never requires Cloudflare, internet sign-in, or joining a multiplayer room.
- Server-created rooms from Pass 1 without a \`locked\` property remain joinable in their lobby because \`Boolean(undefined)\` is false.

## Architecture

Front-end is still static GitHub Pages. Cloudflare's existing \`GameRoom\` Durable Object class receives the two new host-only lobby actions (\`lock\`, \`unlock\`, \`remove\`) and the student \`leave\` action. No schema migration is required: existing room records are short-lived and old rooms retain the previous behaviour.

Room updates continue over authenticated, hibernatable WebSockets, with a 15-second fallback poll only during reconnection. Authenticated HTTP commands own every state mutation. No additional paid products or tracking cookies are introduced.

## Testing and release gate

1. \`npm run check\`: mathematical content, route and source consistency, syntax and unit tests.
2. \`npm run test:e2e\`: existing solo regression suite, plus the new \`tests/browser/arcade-unified.spec.js\` desktop/mobile tests and Pass 1 two-device tests.
3. Local Worker stress tests: concurrent joins, no duplicate answers, server-authoritative roles and scores.
4. Cloudflare staging smoke test: WebSocket, join lock/unlock, removal, scoring and revealed mathematical answer.
5. Deploy the updated Worker to production **only after** all GitHub PR checks pass and then squash-merge. Verify GitHub Pages finishes deployment.

## Student experience details

- On the home screen the **Browse all 10 games** button moves keyboard focus to the games heading.
- The teacher can copy a join link with a URL such as \`/multiplayer.html?room=123456\`; this contains a room code only, never session tokens.
- Teacher can remove a nickname only during the lobby in the interface. Server-side removal is authenticated and also available during active play for exceptional classroom safety needs.
- Host question reveal is disabled until the current round's 20-second limit expires or all students have answered. Students see an immediate 'Answer submitted' state.
- Resizing to 320, 390, 768 or 1280px should never cause horizontal scrolling.
- Counters use clear text, keyboard controls support visible focus, countdown updates do not repeatedly announce to screen readers, and decorative transitions respect reduced motion.

**Next: Pass 3 — Trophy Cabinet & Solo Awards.** Create a local, versioned achievement store; audit unlock rules across all ten solo games; distinguish verified answers from self-review; and add premium collectible reveal animations and export/restore without accounts.
