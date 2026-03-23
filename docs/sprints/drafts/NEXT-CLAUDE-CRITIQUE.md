# Sprint 004 — Draft Critique

## Claude Draft: Strengths

1. **Exceptional architectural clarity.** The four-layer separation (engine → sound definitions → integration hook → UI controls) is clean and well-reasoned. Each layer has a single responsibility and the boundaries are crisp: the engine knows nothing about game state, sound definitions are pure functions, the hook is the sole bridge between game state and audio.

2. **Zero-dependency procedural audio is the right call.** The project already uses procedural SVG sprites with no image assets. Extending that pattern to audio (raw Web Audio API oscillators, no `.mp3`/`.wav`) keeps the architecture philosophically consistent and the bundle near-zero growth. The <8KB gzipped target is aggressive and appropriate.

3. **Thorough browser compliance strategy.** The AudioContext unlock flow is well-thought-out: lazy creation on first gesture, silent no-ops before unlock, `visibilitychange` resume for mobile tab-switching, no intrusive modals. This covers the real-world pitfalls that trip up Web Audio implementations.

4. **Rich Definition of Done.** 31 checkboxes across five categories (Music, SFX, Volume & Controls, Browser Compliance, Quality & Regression). This is the most complete DoD of either draft by a wide margin. The bundle size target, regression requirements, and accessibility items are all explicit.

5. **Detailed trigger map.** The state-change-to-audio-call table in the integration layer section eliminates ambiguity about when each sound fires. This is directly implementable without interpretation.

6. **Explicit phase ordering with parallelism.** The ASCII dependency graph showing Phases 2 and 3 can run in parallel after Phase 1 is a useful planning artifact that reflects genuine independence in the work.

7. **Risk table is comprehensive.** Eight risks with impact ratings and specific mitigations — including the practical "30-minute tuning cap per sound" to prevent scope creep. The "procedural music sounds bad" risk honestly acknowledges the hardest problem in this sprint.

8. **Files Summary includes untouched files.** Explicitly listing what *won't* change and why is valuable for implementation confidence — it makes the "audio is purely additive" claim verifiable.

## Claude Draft: Weaknesses

1. **No polyphony/voice management design.** The draft mentions capping simultaneous SFX at 8 in the risk table, but the architecture section doesn't describe how this is implemented. Is it a pool? An LRU eviction? Does the engine track active nodes? This is a real implementation decision that's left unspecified.

2. **Music generation approach is hand-wavy.** "Procedurally generated ~8-bar chiptune hoedown loop" via raw oscillator scheduling is the hardest task in this sprint, and the architecture section gives it roughly the same depth as individual SFX. There's no discussion of how melody is generated (hardcoded note arrays? algorithmic?), how percussion is synthesized (noise bursts? filtered clicks?), or how the ~8-bar structure is composed. The risk table acknowledges this might not work, but the architecture should give more scaffolding for the attempt.

3. **19 unique animal sounds is a large surface area.** The draft calls for "all 14 regular + 5 blue ribbon animals" each with a distinct sound. That's 19 sound design tasks, each requiring creative work. The 30-minute cap helps, but the total time budget for animal sounds alone could be ~9.5 hours. The draft doesn't discuss whether some animals could share a base sound with pitch/timbre variation (which would be more practical and still recognizable).

4. **Test strategy for audio is thin.** Unit tests cover engine lifecycle (volume persistence, mute, unlock gating) but there's no strategy for testing that sounds actually *sound correct*. The Playwright tests check "no console errors" but not that audio actually played. Web Audio API is notoriously difficult to test — the draft should acknowledge this gap and suggest an approach (e.g., mocking AudioContext in unit tests, or accepting that sound quality is a manual QA gate).

5. **No accessibility consideration beyond keyboard navigation.** The volume controls are keyboard-accessible, which is good, but there's no mention of `aria-label` attributes, screen reader announcements, or whether audio-only feedback (like hover sounds) should have visual counterparts for deaf/hard-of-hearing users. The DoD item about `prefers-reduced-motion` is correct but narrow.

6. **Crossfade during bust is underspecified.** Phase 4 exit criteria mention "Bust immediately interrupts music with the bust SFX, then resumes barn party track at lower volume during pin selection (or crossfades to shop)" — the "or" here is a design decision, not an implementation detail. What actually happens after a bust? This should be definitive.

## Gemini Draft: Strengths

1. **ZzFX/ZzFXM is a pragmatic library choice.** Rather than building everything from raw Web Audio API primitives, Gemini proposes using two battle-tested micro-libraries (~1KB and ~1KB respectively) purpose-built for exactly this use case — retro/chiptune game audio. This dramatically reduces the risk of "procedural music sounds bad" because ZzFXM has an existing tracker workflow for composing chiptune music.

2. **Honest about the creative challenge.** "Drafting the actual arrays will require some trial and error in the ZzFX tracker" is refreshingly practical. It acknowledges that sound design is an iterative creative process, not just a coding task.

3. **Compact and focused.** The draft is concise without being incomplete. Four phases, clear file list, straight to the point.

4. **Pitch variation for anti-fatigue.** The note about "slight pitch variations (especially for animal entries) to prevent auditory fatigue" is a smart detail that the Claude draft doesn't mention.

## Gemini Draft: Weaknesses

1. **Architecture is significantly underspecified.** There's no gain node routing diagram, no discussion of how music and SFX volumes are independently controlled, no explanation of crossfade mechanics. The Claude draft's four-layer architecture is far more implementable.

2. **Definition of Done is too sparse.** 12 items vs. Claude's 31. Missing entirely: loop seamlessness, click/pop prevention, overlap management, bundle size target, regression testing, browser compatibility specifics, volume persistence, keyboard accessibility for controls. Several of these are non-trivial requirements that will be discovered during implementation if not planned for.

3. **Introduces external dependencies.** ZzFX and ZzFXM are tiny, but they're still third-party code. The project intent says "lightweight frontend stack" and the existing pattern is zero external runtime dependencies for content generation (procedural SVG, no image libraries). Adding two libraries — even small ones — breaks this pattern. The draft also hedges between vendoring the files and using npm, which is an unresolved decision.

4. **Touches game engine directly.** The Files Summary says `src/game/engine.ts` will be updated to "dispatch SFX calls on state changes." This violates separation of concerns — game logic should not know about audio. The Claude draft's hook-based approach (diffing state externally) is architecturally superior because it keeps the game engine pure.

5. **No risk analysis for overlap/polyphony.** What happens when Rowdy chain-invites 5 animals in rapid succession? What about rapid hovering across a grid of 20+ slots? The draft doesn't consider these scenarios at all.

6. **No `localStorage` persistence mentioned.** Volume/mute preferences aren't discussed beyond "a mute button exists." Will the user have to unmute every time they reload?

7. **No AudioContext unlock strategy beyond one sentence.** "Waiting for the first user interaction" is stated but not designed. What happens if audio is requested before unlock? Is it queued? Dropped? What about mobile tab-switching?

8. **Bundle size target is 15KB vs. Claude's 8KB.** Nearly double, and less ambitious for a sprint whose core thesis is "procedural audio keeps the bundle small." The 15KB target also doesn't specify gzipped vs. raw.

9. **Phase ordering doesn't allow parallelism.** Phases are strictly sequential (1→2→3→4) with no discussion of which can overlap. Music (Phase 4) depends on the engine (Phase 1) but not on SFX integration (Phase 2–3), yet it's ordered last.

10. **Missing test strategy entirely.** No unit tests, no E2E tests, no test files in the Files Summary. The Definition of Done has no quality/regression category.

## Gaps in Risk Analysis

### Claude Draft
- **No risk for memory leaks.** Long-lived `AudioBufferSourceNode` and `OscillatorNode` references that aren't properly disconnected can leak memory over a 20-30 minute session. The draft mentions "self-disconnect after envelope completes" but doesn't call this out as a risk.
- **No risk for mobile performance.** Web Audio on mobile (especially older Android) can have higher latency and lower polyphony limits. The draft assumes desktop-like behavior.
- **No risk for the dev sound palette becoming a time sink.** The "throwaway" test page could itself consume hours of iteration time.

### Gemini Draft
- **Missing almost all the risks Claude identified:** overlap/polyphony, audio clicks/pops, mobile AudioContext suspension, scope creep on sound design, music quality.
- **No fallback plan for ZzFXM.** If the tracker workflow can't produce acceptable "country" music, the fallback is "pivot to OGG files" — which would blow the bundle budget and require a completely different architecture. This is a high-impact risk with no real mitigation.
- **No risk for ZzFX/ZzFXM compatibility.** These are micro-libraries that may not be actively maintained. Any browser-specific bugs would require forking and fixing.

## Missing Edge Cases (Both Drafts)

1. **Tab backgrounding during music.** When the user switches tabs, should music continue playing (potentially annoying) or pause? Neither draft addresses this. The Claude draft handles AudioContext resume but not intentional pause-on-background.
2. **Multiple rapid phase transitions.** If the game state flickers (e.g., a bust happens on the same frame as a phase change), what audio wins? Priority/interruption rules aren't defined.
3. **Audio during phase transition curtain.** The existing `PhaseTransitionCurtain.tsx` presumably has an animation. Should music crossfade start when the curtain starts, or when the new phase renders?
4. **Game restart mid-music.** If the player wins and clicks "Play Again," does the win fanfare cut immediately or fade? Does barn party music start on the first night of the new game?
5. **Extremely long sessions.** A player who leaves the tab open for hours — do AudioBuffers or cached oscillator data accumulate?

## Definition of Done Completeness

### Claude Draft: **Strong (8/10)**
Comprehensive across functional, technical, and quality dimensions. Missing items:
- No explicit item for memory leak prevention / cleanup on unmount
- No item for tab backgrounding behavior
- No item for ARIA labels on audio controls
- "Works in Chrome, Firefox, and Safari" is stated but not testable without defining what "works" means (manual QA? automated?)

### Gemini Draft: **Insufficient (4/10)**
Covers the happy path but misses:
- Loop seamlessness
- Click/pop prevention
- Overlap management
- Bundle size precision (gzipped?)
- Volume persistence
- Keyboard/touch accessibility
- Regression testing
- Browser-specific verification
- Any quality/polish criteria

---

## Recommendations for the Final Merged Sprint

1. **Use Claude's architecture as the foundation.** The four-layer separation (engine → sounds → hook → controls) is the right design. The hook-based integration that keeps game logic untouched is non-negotiable — do not put audio calls in `engine.ts` or game logic files.

2. **Seriously evaluate ZzFX for SFX (from Gemini).** Raw Web Audio oscillator scheduling for 19 distinct animal sounds plus 8 other SFX categories is a lot of bespoke audio code. ZzFX's parameterized sound generation could dramatically reduce the implementation effort for SFX while staying under 1KB. However, the sound definition functions should still be wrapped as pure functions matching Claude's `sounds.ts` pattern, so the engine doesn't depend on ZzFX directly.

3. **Keep raw Web Audio for music (from Claude) OR evaluate ZzFXM carefully.** ZzFXM could solve the "procedural music sounds bad" risk, but it adds a dependency and its tracker workflow is a black box. If ZzFXM is adopted, budget explicit time for learning the tracker and define a fallback (simpler ambient arpeggios, not OGG files). If raw Web Audio is used, acknowledge that music generation will be the riskiest phase and timebox it aggressively.

4. **Adopt Claude's DoD wholesale, then add:** ARIA labels on controls, tab-backgrounding behavior (pause music when hidden, resume on visible), cleanup/disconnect verification, and a manual QA gate for subjective sound quality ("does it feel right?").

5. **Adopt Claude's risk table and add:** mobile audio latency, memory leak risk from long sessions, and (if using ZzFX/ZzFXM) library maintenance/compatibility risk.

6. **Reduce the 19-animal-sound scope.** Define 5-6 base sound profiles (e.g., poultry-cluck, ruminant-bleat, bird-call, pig-snort, horse-whinny, cat-meow) and derive individual animals via pitch, speed, and waveform variation. This is more achievable, still provides variety, and matches Gemini's pitch-variation insight.

7. **Keep Claude's phase ordering with parallelism** (Phases 2+3 in parallel after Phase 1). Gemini's strictly sequential ordering wastes time.

8. **Bundle target: <8KB gzipped** (Claude's target). This is achievable with procedural audio and keeps the project's lightweight ethos intact. Gemini's 15KB is too generous.

9. **Include a test strategy.** Use a mocked `AudioContext` (e.g., `OfflineAudioContext` or a stub) for unit tests verifying that the right sounds are triggered for the right state changes. Accept that subjective audio quality is a manual QA gate. Include Playwright tests from Claude's draft for controls and error-free playthrough.

10. **Define audio priority/interruption rules explicitly.** When multiple audio events compete (bust + phase change, rapid animal entries, win fanfare replacing music), the sprint doc should specify which sound wins, which is dropped, and which is queued/staggered.
