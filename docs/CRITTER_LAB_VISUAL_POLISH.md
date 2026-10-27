# Critter Lab — Multiplayer visual polish

This pass changes **only presentation**. The Cloudflare Durable Object protocol, authoritative scoring, team balancing, local student preference format and mathematical awards remain unchanged.

## Design decisions

- A soft illustration halo gives interchangeable SVG layers a consistent presence in roster, podium and awards at small sizes.
- The local student is indicated unobtrusively in the roster. Offline critters desaturate while nicknames and scores remain fully readable.
- Gentle idle motion runs **only in small, connected lobbies**. During questions and answers critters remain still.
- A score increase from the authoritative server causes a brief, one-time glow. It cannot be triggered by client scoring data or fake badges.
- Gold, silver and bronze enter in a short ordered podium reveal. Tied rank groups stay together, with names and scores intact.
- Award recipients and team members display their real chosen avatars.
- The teacher-controlled finale includes **all participants**, alphabetically, without implying the gallery is a rank.
- Every animation honors `prefers-reduced-motion`. Narrow viewports use compact layouts, while a full-screen ceremony gets a larger, clearer stage. CSS-only art is printable and usable under forced colours.

## Verification

Run `npm run check` and `npm run test:e2e` plus the existing multiplayer staging smoke test. The new browser audit checks the lobby, mobile sizes 320/390/768, 1920px projector, a 45-player roster, full-class finale, reduced motion, and no horizontal overflow. The existing ceremony test asserts correct podium placement and achievement receipts.

## Revert

All visual changes are confined to `styles/multiplayer-critters.css`, `multiplayer/client.js`, and `multiplayer/ceremony-ui.js`; no Worker deployment is needed. Rolling back this pull request restores the prior presentation without changing existing rooms or student avatar data.
