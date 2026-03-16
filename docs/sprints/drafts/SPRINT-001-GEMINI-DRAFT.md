# Sprint 001: Foundation

## Overview

Sprint 001 exists to answer one question: does the full stack work, end-to-end, on a real phone? Everything else is secondary. The deliverable is a GitHub Pages URL that a player can open on an iPhone and tap a button. No gameplay, no assets, no state — just proof that Phaser 3 + TypeScript + Vite can be stood up, scaled correctly, and deployed continuously from a single `git push`.

This draft takes a deliberately minimal stance on scope. A tight foundation sprint is a sprint that actually ships. The architectural decisions that matter most in Sprint 001 — canvas resolution, orientation handling, touch input wiring, and project conventions — are the same decisions that are most expensive to change later. Get those right. Defer everything else.

The Barn scene in this sprint is a UX wireframe in code: barn background, five slot placeholders, a "Draw Animal" button. It is not meant to be beautiful. It is meant to be structurally correct — to prove the layout system, the button interaction, and the scaling math work before game content fills them in.

A `CLAUDE.md` written at the end of this sprint should be opinionated enough that a future agent or contributor can produce a new scene without asking any questions.

## Use Cases

1. **The "does it work on my phone" test**: A player opens the GitHub Pages URL on an iPhone SE or Android, sees a barn-shaped scene fill the screen in portrait, and taps "Draw Animal" to get a response.
2. **The "fresh clone" test**: A developer clones the repo, runs `npm install && npm run dev`, and sees the barn scene in 60 seconds with zero extra steps.
3. **The "push and forget" test**: A maintainer merges a PR to `main` and GitHub Pages automatically updates within minutes — no manual deployment.
4. **The "hand the phone over" test**: A player rotates to landscape and sees either a polite prompt to rotate back or a correctly pillarboxed scene — not a broken layout.
5. **The "conventions test"**: A future Claude agent reads `CLAUDE.md` and correctly infers how to add a new scene without additional human guidance.

## Architecture

### Orientation Strategy

The game is portrait-first. This is not a preference — it is a constraint that flows from the core mechanic: cards drawn into a vertical barn, a button at the bottom, a pass-and-play interaction model. Landscape is a degraded experience.

**Recommendation: show an orientation prompt in landscape.**

An orientation prompt is less effort than a responsive landscape layout and produces a better result. When `window.innerWidth > window.innerHeight`, render a full-screen message: "Rotate your phone to play." When the user rotates back, the game resumes normally.

This is simpler than letterboxing a portrait UI into a landscape viewport and avoids the confusion of having the entire scene appear squashed or tiny on a landscape phone.

Implementation:
- A thin DOM overlay div (outside the Phaser canvas) toggled by a `resize` listener.
- The Phaser canvas is hidden while the prompt is showing.
- No Phaser-level changes needed for orientation — the scale system handles the portrait case.

### Canvas Scaling

```
Logical resolution: 390 × 844 (portrait, 9:19.4 ratio)
Scaling mode:       Phaser.Scale.FIT
Center:             Phaser.Scale.CENTER_BOTH
```

The 390×844 logical resolution is chosen because it matches the iPhone 14/15 logical point resolution — the most common mobile form factor. All game coordinates are specified in this space. Phaser scales the canvas up or down to fill the viewport while preserving the aspect ratio.

The `index.html` `#game-container` fills `100dvh` (dynamic viewport height, which accounts for iOS Safari address bar changes) rather than `100vh`. This prevents the barn from being taller than the visible viewport on iOS.

### Scene Architecture

Two scenes, flat structure:

```
src/
├── main.ts              — Phaser.Game instantiation only
├── config/
│   └── game.ts          — GameConfig: resolution, scale, scenes
├── scenes/
│   ├── BootScene.ts     — Preload (placeholder) → start Barn
│   └── BarnScene.ts     — Barn BG, 5 slots, Draw button, interaction
└── types/
    └── index.ts         — Shared types: SlotState, SceneKey enum
```

**No subdirectories beyond these four in Sprint 001.** Do not create `systems/`, `ui/`, `app/`, `state/`, or `utils/` until a second file exists that would go in them. Empty directories are noise; they signal a plan that hasn't happened yet. Sprint 002 will introduce `src/game/` when the deck engine is built.

### Barn Scene Layout (Wireframe Spec)

The BarnScene layout is defined in logical coordinates (390×844):

```
┌─────────────────────────────┐  y=0
│  [Barn interior BG]         │
│  ┌──────┐ ┌──────┐ ┌──────┐│  y=160   ← Row 1: 3 slots (capacity slots 1-3)
│  │ SLOT │ │ SLOT │ │ SLOT ││
│  └──────┘ └──────┘ └──────┘│  y=280
│       ┌──────┐ ┌──────┐    │  y=320   ← Row 2: 2 slots (capacity slots 4-5)
│       │ SLOT │ │ SLOT │    │
│       └──────┘ └──────┘    │  y=440
│                             │
│  [Farmhouse silhouette BG]  │  y=600   ← Decorative element, farmhouse window
│                             │
│  ┌─────────────────────────┐│  y=720   ← Draw button
│  │     DRAW ANIMAL         ││
│  └─────────────────────────┘│  y=780
└─────────────────────────────┘  y=844
```

Slots are `88×88` rectangles with a 2px border. The "Draw Animal" button is `350×48`, centered horizontally. Colors are placeholder: barn background `#8B3A3A`, slots `#D4A574` (empty fill), button `#4A7C59` (farm green).

These exact coordinates must be documented in `CLAUDE.md` so future sprints can position UI elements consistently.

### Touch Input

All interactive elements use `setInteractive()` + `on('pointerdown')`. No `click` events, no hover states, no `pointerup`-only patterns.

The "Draw Animal" button needs a minimum tap target. Phaser's interactive hitArea defaults to the object bounds — for an `88×88` slot, this is fine. For UI text or small icons, use `setInteractive(new Phaser.Geom.Rectangle(x, y, w, h), Phaser.Geom.Rectangle.Contains)` with at least 44×44px.

Button feedback on tap: the button rectangle briefly tints to a lighter color (`#6AAD7E`) and returns to original after 100ms. This is implemented with `scene.time.delayedCall(100, () => { btn.setFillStyle(0x4A7C59); })`. No tweens in Sprint 001.

### GitHub Pages CI

Two separate workflow files:

**`.github/workflows/ci.yml`** — Runs on every push and pull request:
1. Checkout
2. Node setup (pin 20 LTS)
3. `npm ci`
4. `npm run build` (fail on TS errors)

**`.github/workflows/deploy.yml`** — Runs on push to `main` only:
1. Checkout
2. Node setup (pin 20 LTS)
3. `npm ci`
4. `npm run build`
5. Upload `dist/` as GitHub Pages artifact
6. Deploy via `actions/deploy-pages@v4`

### CLAUDE.md Conventions (Draft)

The `CLAUDE.md` produced in this sprint should include:

- **Stack:** Phaser 3 (pinned to x.y.z), TypeScript 5.x strict, Vite 5.x+
- **Logical resolution:** 390×844 portrait. Never change without updating all layout code.
- **Scene naming:** `XxxScene.ts` → `key: 'Xxx'`. One class per file. Register in `config/game.ts` scene array.
- **Scenes are thin:** No game logic in scene files. Scenes call helpers; helpers live in `src/game/`.
- **Interactive elements:** Always `setInteractive()` + `pointerdown`. Minimum tap target 44×44px.
- **Placeholder visuals:** Colored rectangles + Phaser text until Art Pass sprint. Never commit placeholder image files.
- **No barrel files** until 3+ exports exist that share a consumer.
- **Scripts:** `dev`, `build`, `preview`. That's it for Sprint 001.
- **Orientation:** Portrait required. Landscape shows DOM overlay prompt (see `index.html` implementation).
- **Slot layout spec:** [paste exact coordinates from Barn Scene Layout above]

## Implementation

### Phase 1: Scaffolding (~25% of effort)

**Files:**
- `package.json`
- `tsconfig.json`
- `vite.config.ts`
- `index.html`
- `.gitignore`
- `src/main.ts`
- `src/config/game.ts`

**Tasks:**
- [ ] `npm init -y`, install `phaser@^3.80.1`, `typescript@^5.4`, `vite@^5.4`, `@types/node`
- [ ] `tsconfig.json`: `strict: true`, `moduleResolution: "bundler"`, `target: "ES2022"`, `lib: ["ES2022", "DOM"]`
- [ ] `vite.config.ts`: `base: '/hoot-n-nanny/'`, `build.target: 'es2022'`
- [ ] `index.html`: viewport meta (`width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no`), `100dvh` body, `#game-container`, `#orientation-prompt` (hidden by default)
- [ ] `src/main.ts`: `new Phaser.Game(config)`, nothing else
- [ ] `src/config/game.ts`: GameConfig with 390×844, Scale.FIT, CENTER_BOTH, BootScene + BarnScene
- [ ] Verify: `npm run dev` → black canvas in browser

### Phase 2: Barn Scene (~40% of effort)

**Files:**
- `src/scenes/BootScene.ts`
- `src/scenes/BarnScene.ts`
- `src/types/index.ts`

**Tasks:**
- [ ] `BootScene`: key `'Boot'`, `create()` immediately starts `'Barn'` (no real assets to load yet)
- [ ] `BarnScene`: key `'Barn'`
  - [ ] Barn background rectangle (full canvas, `#8B3A3A`)
  - [ ] 5 slot rectangles at exact layout spec coordinates, `#D4A574` fill, 2px `#6B4226` stroke
  - [ ] Farmhouse silhouette rectangle at y=600, `#4A3728`, 390×200 (decorative, no interaction)
  - [ ] "DRAW ANIMAL" button rectangle + centered text at y=720
  - [ ] `button.setInteractive()` + `pointerdown` → flash button fill, log `'draw:tapped'` to console
- [ ] `src/types/index.ts`: export `SlotState = 'empty' | 'occupied'`, `SceneKey` enum (`Boot`, `Barn`)
- [ ] Verify full scene flow and slot layout at 375px viewport

### Phase 3: Orientation + Scaling (~15% of effort)

**Tasks:**
- [ ] In `index.html`, add `#orientation-prompt` div: full-screen overlay, `display: none` by default, centered text "Rotate to portrait to play"
- [ ] In `main.ts` (after game init), add `window.addEventListener('resize', checkOrientation)` where `checkOrientation` shows/hides `#orientation-prompt` and `#game-container` based on `window.innerWidth > window.innerHeight`
- [ ] Test on real iPhone or iOS Simulator: rotate to landscape → prompt appears, rotate back → game resumes
- [ ] Verify `100dvh` body height eliminates iOS Safari address-bar overflow
- [ ] Verify `#game-container` and canvas have `margin: 0 auto`, no horizontal scroll at 375px

### Phase 4: CI + CLAUDE.md (~20% of effort)

**Files:**
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `CLAUDE.md`

**Tasks:**
- [ ] Write `ci.yml`: triggers on `push` and `pull_request`, Node 20 LTS, `npm ci`, `npm run build`
- [ ] Write `deploy.yml`: triggers on push to `main`, builds and deploys to GitHub Pages via artifact upload
- [ ] Enable GitHub Pages in repo settings (Source: GitHub Actions)
- [ ] Verify deploy on first push to `main`
- [ ] Write `CLAUDE.md` per conventions spec above, including exact slot coordinates

## Files Summary

| File | Action | Purpose |
|---|---|---|
| `package.json` | Create | Dependencies and build scripts |
| `tsconfig.json` | Create | TypeScript strict config |
| `vite.config.ts` | Create | Build config with GitHub Pages base path |
| `index.html` | Create | Viewport meta, game container, orientation overlay |
| `.gitignore` | Create | Ignore node_modules, dist, .DS_Store |
| `src/main.ts` | Create | Phaser.Game bootstrap |
| `src/config/game.ts` | Create | GameConfig factory |
| `src/scenes/BootScene.ts` | Create | Boot → Barn transition |
| `src/scenes/BarnScene.ts` | Create | Barn wireframe scene with touch interaction |
| `src/types/index.ts` | Create | SlotState, SceneKey shared types |
| `.github/workflows/ci.yml` | Create | Validate on every push/PR |
| `.github/workflows/deploy.yml` | Create | Deploy to GitHub Pages on main push |
| `CLAUDE.md` | Create | Opinionated project conventions doc |

## Definition of Done

- [ ] `npm install && npm run dev` shows barn scene within 60 seconds on a clean clone
- [ ] `npm run build` exits 0 with zero TypeScript errors
- [ ] Barn scene shows: barn-red background, 5 slot rectangles (3 top / 2 bottom), farmhouse silhouette, "DRAW ANIMAL" button
- [ ] Tapping "DRAW ANIMAL" button causes a visible flash and console log
- [ ] Canvas displays correctly at 375px viewport (no overflow, no clipping)
- [ ] Canvas displays correctly at 1440px viewport (portrait layout centered with pillarboxing)
- [ ] On landscape orientation, `#orientation-prompt` is visible and game canvas is hidden
- [ ] GitHub Actions CI workflow is green on a push to any branch
- [ ] GitHub Pages deploy workflow runs on push to `main` and URL is accessible
- [ ] `CLAUDE.md` exists with: stack versions, logical resolution, scene naming convention, interactive element rules, slot layout coordinates, orientation strategy

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `100dvh` not supported on target iOS version | Low | Medium | Add fallback: `height: -webkit-fill-available` on `#game-container` |
| GitHub Pages URL path mismatch breaks asset loading | Medium | High | Set `base: '/hoot-n-nanny/'` in Vite config on day 1; verify in first deploy |
| Orientation prompt approach feels janky | Low | Low | It's a Sprint 001 placeholder; a smoother transition can be added later |
| Slot coordinates in CLAUDE.md go stale as UI evolves | Medium | Medium | Derive layout from a single `LAYOUT` constants object in `game.ts`; CLAUDE.md refers to the constants, not raw numbers |

## Security Considerations

- No user input, no network, no localStorage in this sprint. Security surface is essentially zero.
- Viewport meta `user-scalable=no` is standard for games; noted as accessibility trade-off.
- GitHub Actions deploy workflow should use minimal permissions: `pages: write`, `id-token: write` only.

## Dependencies

- GitHub repo must exist with GitHub Pages enabled (Settings → Pages → Source: GitHub Actions)
- Node 20 LTS available locally (document in `.nvmrc`)
- No prior sprint dependencies

## Open Questions

1. Should the farmhouse silhouette be a visible interactive element (the NOISY! warning will animate the window light in a later sprint) — or purely decorative in Sprint 001? This affects whether it needs to be in a named variable vs. an anonymous `add.rectangle`.
2. Should the slot layout be defined as a constant object exported from `config/game.ts`, or as a local constant in `BarnScene.ts`? Moving it to config makes it more reusable but adds surface area to the config file.
3. Is `hoot-n-nanny` the exact GitHub repo slug? The Vite `base` path and GitHub Pages URL depend on this being correct.
