# Sprint 005 Draft — "Ship It"

## Overview
This sprint addresses the final two backlog items (26: GitHub Pages CI/CD, and 27: Final QA & Ship Polish). The goal is to cross the finish line, taking Hoot N' Nanny from a functional local build to a polished, publicly playable game. This means automated deployments, a performance and bundle audit, and rigorous end-to-end playtesting to ensure the game "feels finished to a stranger" on both desktop and mobile viewports.

## Architecture
- **Infrastructure:** A single GitHub Actions workflow (`.github/workflows/deploy.yml`) will handle building the Vite app and deploying the `dist` directory to GitHub Pages.
- **Frontend Configuration:** The Vite configuration must be updated to ensure the `base` path matches the repository name, preventing 404 errors for assets on the live site.
- **Performance Tooling:** We will integrate the existing `scripts/check-bundle-budget.mjs` directly into the CI pipeline to fail the build if the bundle size exceeds the acceptable threshold for a fast-loading browser game.

## Implementation Phases

### Phase 1: CI/CD Pipeline
1. Add `.github/workflows/deploy.yml` utilizing `actions/configure-pages`, `actions/upload-pages-artifact`, and `actions/deploy-pages`.
2. Modify `vite.config.ts` to include a dynamic `base` path depending on the environment (e.g., `process.env.GITHUB_REPOSITORY`).
3. Add `npm run build` and `npm run preview` tests to the pipeline.

### Phase 2: Performance & Bundle Audit
1. Wire `scripts/check-bundle-budget.mjs` into the `build` script in `package.json`.
2. Review the built output for excessively large assets (e.g., audio files, sprite sheets).
3. If necessary, compress audio to WebM/Ogg or implement lazy loading to ensure the initial load remains snappy.

### Phase 3: QA & Playtest Fixes
1. **Full Playthroughs:** Conduct complete runs targeting the win condition (3 blue ribbons) and forced bust conditions to ensure state resets correctly without refreshing the page.
2. **Mobile Validation:** Test touch targets (Shop and Barn grid) on emulated and real mobile devices. Ensure hover states don't break touch interactions.
3. **Audio Context Unlocking:** Implement a "Click to Start" or "Enter Barn" overlay if mobile browsers block autoplaying audio.

### Phase 4: Polish & "Juice"
1. Verify animations (entry, bust, win) are smooth. Optimize CSS by moving from `top`/`left` transitions to hardware-accelerated `transform` and `opacity` where needed.
2. Ensure UI copy is clear to a new player without external instructions (e.g., visible tooltips or persistent helper text).

## Files Summary
- **New:** `.github/workflows/deploy.yml` (Deployment pipeline)
- **Modified:** `vite.config.ts` (Base path config)
- **Modified:** `package.json` (Scripts update for bundle checks)
- **Modified:** `src/app/App.tsx` or similar (Potential "Click to Start" overlay for audio context)
- **Modified:** Various `.css` files (Mobile responsiveness tweaks, touch-target sizing)

## Definition of Done
- Pushing to the `main` branch automatically and successfully deploys the latest build to GitHub Pages.
- The CI pipeline runs `check-bundle-budget.mjs` and passes.
- A player can complete a full game loop (Hootenanny -> Shop -> Win/Bust) on both desktop and a mobile viewport without console errors or layout breaks.
- Audio plays correctly on mobile after an initial user interaction.
- The game requires zero external instructions to understand how to play.

## Risks
- **Mobile Audio Restrictions:** Modern browsers require user interaction to unlock the AudioContext. If not handled cleanly, the game will be silent on mobile.
- **Asset Paths on GitHub Pages:** Incorrect relative paths in Vite can cause sprites or audio to 404 in production.
- **Touch Targets:** The barn grid might feel too cramped on smaller screens, leading to accidental clicks.

## Dependencies
- The GitHub repository must have GitHub Pages enabled and configured to build from GitHub Actions.
- All core gameplay features (Sprints 001-004) must be fully complete and merged to `main`.
