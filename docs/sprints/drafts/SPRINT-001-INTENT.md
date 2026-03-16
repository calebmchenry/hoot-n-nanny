# Sprint 001 Intent: Foundation

## Seed

Bootstrap the Hoot 'n Nanny project from zero. Set up Phaser 3 + TypeScript + Vite, configure GitHub Pages deployment, establish project conventions (CLAUDE.md, directory structure, linting), and render a basic interactive barn scene that proves the full stack is wired together end-to-end.

## Context

- **Greenfield project** — no code exists yet. SEED.md and docs/INTENT.md are the only artifacts.
- **Game:** Browser-based push-your-luck deck builder, farm animal theme. Inspired by UFO 50's Party House.
- **Stack decided:** Phaser 3, TypeScript, Vite, no backend. Deployed to GitHub Pages.
- **Mobile-first:** Must work on iOS Safari and Android Chrome. Touch input required. Canvas scaling from 375px to 1440px.
- **No CLAUDE.md yet** — this sprint will establish project conventions.

## Recent Sprint Context

No prior sprints. This is Sprint 001.

## Relevant Codebase Areas

No code exists yet. This sprint creates the following top-level structure:

```
hoot-n-nanny/
├── src/
│   ├── main.ts           — Phaser game bootstrap
│   ├── scenes/
│   │   ├── BootScene.ts  — Asset preloading
│   │   └── BarnScene.ts  — First playable scene
│   ├── config/
│   │   └── game.ts       — Phaser game config
│   └── types/
│       └── index.ts      — Shared TypeScript types
├── public/               — Static assets (placeholder sprites)
├── index.html
├── vite.config.ts
├── tsconfig.json
├── .github/workflows/
│   └── deploy.yml        — GitHub Pages CI
└── CLAUDE.md             — Project conventions
```

## Constraints

- Phaser 3 (latest stable), TypeScript strict mode, Vite 5+
- GitHub Pages deployment must work via `gh-pages` branch or GitHub Actions
- No backend, no accounts — pure static browser app
- Canvas must scale responsively: fixed logical resolution (e.g., 390×844 portrait) with letterboxing
- Touch input must work on iOS Safari (no hover-only interactions)
- All placeholder assets must be programmatic (colored rectangles/text) — no real pixel art yet
- Keep bundle size lean: tree-shake Phaser modules where possible

## Success Criteria

- `npm run dev` launches a local dev server showing the barn scene
- `npm run build` produces a deployable `dist/` with no TypeScript errors
- GitHub Actions workflow deploys to GitHub Pages on push to `main`
- Barn scene renders: barn background, 5 empty animal slots, a placeholder "Draw Animal" button
- Canvas scales correctly on iPhone SE (375px) and desktop (1440px) without overflow or distortion
- Touch tap on "Draw Animal" produces a visible response (placeholder log or animation)
- CLAUDE.md documents conventions established in this sprint

## Verification Strategy

- **Manual:** Load on iOS Safari + Chrome desktop, verify layout at both breakpoints
- **Build check:** `npm run build` exits 0 with no TS errors
- **CI check:** GitHub Actions green on a test push
- **No automated tests in Sprint 001** — test infrastructure is a Sprint 002+ concern

## Uncertainty Assessment

- **Correctness uncertainty: Low** — well-understood scaffolding task, no novel logic
- **Scope uncertainty: Low** — tightly bounded: project setup + one static scene
- **Architecture uncertainty: Medium** — Phaser scene architecture and TypeScript module structure need deliberate decisions that will constrain all future sprints; getting this right matters

## Open Questions

1. Should the logical canvas resolution be portrait (390×844) or landscape (844×390)? Or should we support both orientations?
2. Should Phaser be imported as a full bundle or with selective module imports (affects bundle size and tree-shaking complexity)?
3. Where should game state eventually live — in Phaser's scene registry, a separate state singleton, or a lightweight store (e.g., Zustand)? Sprint 001 doesn't implement state, but the directory structure should not foreclose options.
