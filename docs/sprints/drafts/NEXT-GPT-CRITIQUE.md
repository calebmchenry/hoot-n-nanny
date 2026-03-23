# Critique of Sprint 004 Drafts

This critique compares `NEXT-CODEX-DRAFT.md` and `NEXT-GEMINI-DRAFT.md` against the current codebase and the project constraints in `docs/INTENT.md`. Both drafts correctly identify Sprint 004 as the audio sprint. The real difference is how well each plan fits the existing seams in `App.tsx`, `BarnGrid.tsx`, `TradingPostScreen.tsx`, and the project’s lightweight, non-blocking browser-game constraints.

## 1. Codex Draft

### Strengths

- Best fit with the current architecture. `App.tsx` already owns phase transitions, `BarnGrid.tsx` already diffs guest groups and used abilities, and `TradingPostScreen.tsx` already owns local focus and purchase interaction state. The draft mostly builds on those seams instead of fighting them.
- Strong separation of concerns. `deriveCues.ts` keeps the reducer pure, and the `AudioDirector` isolates browser audio behavior from UI code.
- Clear product rules. The draft explicitly protects `GameState`, forbids audio from blocking gameplay, defines phase music ownership, and treats audio failure as non-fatal.
- High implementation clarity. The phases, file summary, budgets, browser matrix, and test targets are concrete enough to reduce ambiguity before work starts.
- Strong verification posture. It includes unit tests, Playwright coverage, manual browser validation, and bundle checks instead of treating audio as impossible to test.

### Weaknesses

- It hides a significant content-production task inside an engineering sprint. "Import all final audio files up front" assumes sourcing, editing, trimming, level-matching, and provenance of the asset pack are already solved.
- The plan is broad enough to become two projects at once: audio engine implementation and audio asset production. If the asset pack slips, much of the engineering plan stalls.
- One important ownership seam is still unresolved. The scoring jingle is assigned to `NightSummaryModal.tsx` or `deriveCues.ts`, which means the exact-once rule is not fully settled.
- The sprint surface area is large: new audio domain, new hook, new controls UI, new styles, new asset pack, unit tests, E2E tests, and manual browser QA.
- The 2 MB audio budget is directionally good, but dual-format music plus 19 per-animal entry clips could force late compression compromises if the budget is not managed during asset production.

### Gaps in Risk Analysis

- Asset sourcing and mastering are not treated as first-class risks, even though they are the most likely schedule risk in the draft.
- First-play latency is under-specified. The draft covers decode failure, but not the common case where a cue is requested before the corresponding file has finished fetching or decoding.
- Mobile memory pressure is missing. A small compressed payload can still expand into large decoded buffers on Safari and lower-end devices.
- The risk table sets a polyphony cap but does not define how voice stealing works once the cap is hit.
- Seeded debug entry states such as `?seed=shop`, `?seed=win`, and `?seed=ability` are not called out as risk or verification targets, even though the app supports them today.

### Missing Edge Cases

- `night` to `night-summary` under reduced motion should keep the barn loop continuous even when the normal curtain timing is skipped.
- Bust is a multi-step flow in this codebase: the game can enter bust targeting before it becomes a completed summary. The bust cue must not fire once on bust and again when the summary is created.
- `peek` resolves immediately, while `fetch` and `kick` only resolve on target confirmation. The draft states this rule, but it should be elevated into explicit test coverage.
- `PLAY_AGAIN` from the win screen should reset music and fanfare ownership cleanly.
- Touch should get confirm feedback without synthetic hover spam from follow-up mouse events.

### Definition of Done Completeness

The Codex DoD is the stronger of the two. It covers music ownership, exactly-once cue behavior, global controls, failure non-fatal behavior, dependency constraints, payload budget, and automated verification.

What is still missing:

- A completion criterion for final asset readiness: authored or sourced, trimmed, level-matched, and checked into the repo.
- Explicit verification for seeded entry states and `PLAY_AGAIN`.
- An explicit "no console errors or warning spam during a full playthrough" item.

## 2. Gemini Draft

### Strengths

- Strong instinct for bundle discipline and tonal coherence. It takes the "retro + country" direction seriously instead of treating audio as generic polish.
- Procedural audio avoids asset download and decode latency entirely, which is a real operational advantage for a small static game.
- The high-level structure is easy to understand: one engine, one audio definitions file, then phased integration across UI, gameplay, and music.
- It correctly identifies autoplay and mixing fatigue as important audio risks.

### Weaknesses

- Poor fit with the current codebase architecture. The file summary explicitly plans to touch `src/game/engine.ts`, which would push presentation concerns into pure game logic.
- The mute control is assigned to `StatusBar.tsx`, but `StatusBar` only renders during the night flow. That would remove audio controls from `shop` and `win`.
- Music ownership is left vague as "likely in `App.tsx` or `PhaseTransitionCurtain.tsx`". In this app, `PhaseTransitionCurtain.tsx` is not a stable owner because transitions are skipped when reduced motion is enabled.
- The draft assumes ZzFX/ZzFXM are an easy fit, but the repo has recently been strict about avoiding new runtime dependencies. The draft never really reconciles that tradeoff.
- "Unique short blips" for all 19 animals is a weaker bar than the game design’s requirement for short animal noise clips. The draft lowers the quality target without acknowledging it.
- Cue ownership is too vague. Without a `deriveCues.ts`-style seam, the plan is likely to create duplicate or mistimed sounds from rerenders, mounts, and multi-step transitions.
- The DoD is too light for a sprint that touches nearly every screen. It mostly says which sounds should exist, not how correctness will be guaranteed.

### Gaps in Risk Analysis

- No risk is identified for duplicate or mistimed cues caused by deriving audio from the wrong ownership layer.
- No risk is identified for architectural drift from pushing audio into reducer-adjacent logic or scattered UI handlers.
- The biggest procedural-audio risk is execution risk, not just aesthetic fit. Two convincing music loops plus 19 recognizable animal cues are a specialized skill bottleneck.
- There is no risk coverage for reduced-motion mode, seeded debug states, win reset behavior, or tab/background suspend-resume handling.
- There is no explicit regression or verification risk despite the sprint touching phase transitions, input flows, shop interactions, summary behavior, and the win screen.

### Missing Edge Cases

- `night` and `night-summary` need to share one continuous barn track; summary should not restart the music.
- `peek` should cue on immediate resolution, while `fetch` and `kick` should only cue after target confirmation.
- Rowdy chain invites need one entry cue per actual entrant, not one cue per rerendered stack.
- Disabled shop purchases, sold-out offers, full-capacity invites, and canceled targeting should be silent.
- Hover and focus sounds need duplicate suppression and throttling, especially in `TradingPostScreen.tsx`, which already manages rapid keyboard focus changes.
- Entering `win` should stop looped music and play the fanfare once; `PLAY_AGAIN` should restore normal phase music on the new run.
- Audio failure needs a defined behavior beyond autoplay blocking. If initialization fails or playback is unavailable, the game still needs to remain fully playable.

### Definition of Done Completeness

The Gemini DoD is incomplete for this repo. It checks feature presence, but it does not cover:

- exact-once semantics
- no-op or disabled-interaction silence
- persistent controls across all phases
- touch, keyboard, and mouse behavior
- failure non-fatal behavior
- regression tests, manual browser validation, or bundle script verification
- the repo’s no-new-runtime-dependency posture

As written, the sprint could satisfy the Gemini DoD and still ship with duplicate cues, missing controls in `shop` and `win`, or phase-music regressions.

## Recommendations for the Final Merged Sprint

1. Keep the Codex ownership model. `App.tsx` should own phase music, a dedicated `src/audio` domain should own playback, `deriveCues.ts` should map state transitions to semantic cues, and UI leaf components should only fire local navigation sounds.
2. Keep Gemini’s tonal and bundle discipline, but not its full implementation strategy. The merged sprint should preserve the "retro + country" target and a hard size budget, but it should not make ZzFX/ZzFXM or reducer-level audio dispatch the foundation of the sprint.
3. Add an explicit asset-production task if the final sprint uses recorded files. Sourcing or authoring, trimming, loudness matching, provenance/licensing, compression, and placeholder replacement should be a named phase with exit criteria.
4. Expand the risk register to cover first-play decode latency, mobile memory pressure, suspend-resume behavior, voice-stealing rules, seeded entry states, reduced-motion transitions, and win reset behavior.
5. Expand the DoD to include exactly-once cue tests for bust, purchase, ability, score, and win; silence on disabled or no-op actions; uninterrupted barn music across `night` to `night-summary`; persistent controls in every phase; no console errors during a full playthrough; `npm run test`; `npm run test:e2e`; `npm run build`; `npm run check:bundle`; and manual validation in at least one Safari-family browser and one Chromium-family mobile browser.
6. Resolve two ownership questions before implementation starts: whether the score jingle is derived centrally or owned by `NightSummaryModal.tsx`, and whether simple UI ticks are procedural or file-based.

That merged plan would keep the Codex draft’s architectural rigor, absorb the Gemini draft’s emphasis on tone and size discipline, and close the operational gaps most likely to derail implementation.
