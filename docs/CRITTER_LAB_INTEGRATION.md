# Critter Lab — Sampling Arcade website integration

## What is included

- Copy of the approved Pass 2 character creator into `critter-lab/` on the **same GitHub Pages origin** as the rest of Sampling Arcade.
- Link and small assembled avatar illustration in a prominent, secondary homepage panel. Solo, Multiplayer and Awards retain their existing three primary route cards; the ten maths games are unchanged.
- Optional link from the Multiplayer join form to customise a critter before joining.
- Navigation from Critter Lab back to Solo Arcade or Multiplayer Arena.
- The same versioned local-storage key (`critter-lab.avatar.v1`) is used by the original prototype and the integrated site; there is no storage migration, server account or student data upload.

## Deliberate boundary

**This pass makes the generator part of the live website, but it does not yet broadcast avatars through multiplayer rooms or display them to classmates.** The existing Durable Object protocol, scoring, award fairness and teacher controls are unchanged. Both the creator and join page disclose that limitation.

Future multiplayer rollout should validate only the allowlisted configuration `{version,head,body,legs,colours}`, never accept submitted SVG or custom images, and render avatar IDs from local, bundled assets. It should handle reconnections and expired rooms, avatar defaults, keyboard/reduced-motion support, roster and ceremony performance.

## Publishing and tests

`node scripts/build-pages.mjs` copies the `critter-lab/` directory into the Pages artifact and validates the new page's local asset references. `tests/critter-lab.test.mjs` covers valid, invalid and random configurations, including all 288 base animal combinations and 62,208 independent three-part colour variants. `tests/browser/critter-lab-integration.spec.js` covers homepage, mobile widths, local state, navigating to/from multiplayer and errors.

Source of the original 20 assets, creator UI and colour manifest: [`chriswalker-afk/avatar`](https://github.com/chriswalker-afk/avatar), Pass 2 (merged PR #2). Keep future artwork changes synchronised deliberately; don't fetch live assets from the source repo at runtime.