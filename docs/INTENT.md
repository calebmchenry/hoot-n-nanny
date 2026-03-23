# Hoot N' Nanny — Project Intent

## What is this?

A browser-based, single-player, push-your-luck deck builder with a farm party theme. Inspired by UFO 50's "Party House." The full game design lives in `docs/GAME_DESIGN.md` — this document covers the project-level goals and constraints that surround it.

## Platform & Hosting

- Runs entirely in the browser — no server, no backend, no accounts.
- Hosted on GitHub Pages. The build artifact must be a static site deployable with a simple push.
- Must work on desktop (mouse + keyboard) and mobile (touch). Target viewports: phones (portrait + landscape), tablets, and standard desktop.

## Tech Constraints

- Lightweight frontend stack — vanilla JS/TS or a minimal framework. No heavy game engine unless bundle size stays small.
- All assets (sprites, audio) must be self-contained in the repo or generated at build time. No runtime CDN fetches.
- Bundle budget should stay reasonable for a casual browser game.

## Session & Pace

- A full game should take roughly 20–30 minutes.
- No save/load, no persistence between sessions. Each play is self-contained.
- The loop (night → shop → night) should feel snappy. Minimize dead time between phases.

## Tone

- Goofy, warm, scrappy. A barn party thrown with whatever was lying around.
- Retro pixel art aesthetic with country/chiptune audio.
- Humor and personality wherever it fits — animal names, ability descriptions, UI copy, sound effects. Don't take itself seriously.

## Quality Bar

- Ship-complete: visuals, sound, UI polish, win/lose states, responsive layout.
- The game should feel finished to a stranger who stumbles on the GitHub Pages link — not a prototype or tech demo.

## Art & Audio Sources

- Sprite sources and audio direction are specified in `docs/GAME_DESIGN.md`.
- If original sprites or procedural generation replace sourced assets, that's fine as long as the retro pixel style is maintained.

## Non-Goals

- Multiplayer.
- Leaderboards or online features.
- Native app packaging.
- Monetization.
