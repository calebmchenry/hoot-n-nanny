# Sprint 004: Sound of the Barn

## Overview

Sprint 003 gave the game personality and polish. This sprint gives it a voice. Every visual action — inviting an animal, busting, scoring, buying, winning — currently happens in silence. After this sprint, the game has a complete "retro + country" soundscape: two music tracks, gameplay SFX, UI navigation sounds, and player-accessible volume controls.

Backlog items covered: **#15–23** (Music — Barn Party Track, Music — Shop Track, SFX — Animal Entry, SFX — Bust, SFX — Scoring Jingle, SFX — Purchase, SFX — Activate Ability, SFX — Win Fanfare, SFX — UI Navigation).

Out of scope: CI/CD (#26), Final QA (#27), balance changes, new visual effects, gameplay changes.

### Product Rules

- **Procedural audio only.** All sounds are synthesized at runtime via Web Audio API. No `.mp3`/`.wav`/`.ogg` files. This matches the project's existing pattern (procedural SVG sprites, no image assets) and keeps bundle growth near zero.
- **Retro + country feel.** Square waves, triangle waves, short decay envelopes, pentatonic/major scales. Think NES-era chiptune crossed with banjo twang.
- **Audio must never block gameplay.** All sound is fire-and-forget. No animation or game logic waits on audio completion.
- **`GameState` stays mechanics-only.** No audio flags, pending cues, or sound state in the reducer.
- **Browser autoplay policy compliance.** AudioContext is created on first user gesture. Before that, the game works silently.
- **Audio failure is non-fatal.** Blocked autoplay, missing decode support, or muted state never breaks core gameplay or produces console spam.
- **Mute persists.** Volume/mute preferences are stored in `localStorage` and restored on reload.
- **Zero new runtime dependencies.**

---

## Architecture

### 1. Audio engine: `src/audio/engine.ts`

A singleton `AudioEngine` class wrapping the Web Audio API. Responsibilities:

- Lazy `AudioContext` creation on first user interaction (click/keydown). Listener removes itself after unlock.
- Two independent gain nodes: `musicGain` and `sfxGain`, both feeding a `masterGain` → `destination`.
- Music playback: holds a reference to the currently playing music loop. Exposes `playMusic(trackId)` and `stopMusic()`. Crossfades between tracks over 300ms when switching phases.
- SFX playback: `playSfx(sfxId)` triggers a one-shot sound. Each SFX creates short-lived oscillator/gain nodes that self-disconnect after their envelope completes.
- Polyphony cap: maximum 8 simultaneous SFX voices. When the cap is hit, the oldest active voice is stopped to make room.
- Volume control: `setMusicVolume(0–1)`, `setSfxVolume(0–1)`, `setMuted(boolean)`. Reads/writes `localStorage` keys `hnn-music-vol`, `hnn-sfx-vol`, `hnn-muted`.
- Tab visibility: listens for `visibilitychange`. When hidden, suspends the `AudioContext`. When visible again and not muted, resumes it.
- `isUnlocked()` query so the UI can hint at audio capability.

The engine knows nothing about game state. It exposes `playMusic`, `stopMusic`, `playSfx`, and volume methods. The cue derivation layer decides *when* to call them.

If `playMusic`/`playSfx` is called before unlock, the call is silently dropped — the user hasn't gestured yet, so they haven't missed anything. No intrusive "click to enable sound" modal.

### 2. Sound definitions: `src/audio/sounds.ts`

Pure functions that take an `AudioContext` and a destination `AudioNode` and produce sound. Each function schedules oscillators, gains, and envelopes using `context.currentTime`. No function holds state. Every gain envelope ramps (minimum 5ms) rather than jumping — this prevents clicks and pops.

**Music generators:**
- `barnPartyLoop(ctx, dest)` → Renders a procedurally generated ~8-bar chiptune hoedown loop to an `AudioBuffer`. Square wave melody over triangle wave bass, pentatonic major scale, ~140 BPM. Cached after first render.
- `shopLoop(ctx, dest)` → Same structure, ~90 BPM, laid-back country shuffle. More triangle wave, less percussive. Cached after first render.

Music loops are rendered to `AudioBuffer` once, then cached. This avoids per-frame scheduling overhead and ensures seamless looping.

**SFX generators (all one-shot):**
- `animalEntry(ctx, dest, animalId)` → Per-animal sound built from 6 base profiles (poultry-cluck, ruminant-bleat, bird-call, pig-snort, horse-whinny, cat-meow). Each animal maps to a base profile with characteristic pitch, speed, and waveform variation. Slight random pitch jitter (±3%) on each play to prevent auditory fatigue.
- `bust(ctx, dest)` → White noise burst (200ms) → silence (150ms) → descending sawtooth "crow" (400ms). Dramatic and unmistakable.
- `scoringJingle(ctx, dest)` → Rising three-note arpeggio, triangle wave, major triad (~500ms).
- `purchase(ctx, dest)` → High-pitched metallic "cha-ching": two fast sine pings with quick decay, slight pitch bend (~300ms).
- `activateAbility(ctx, dest)` → Soft pluck: single triangle wave note with fast attack, medium decay (~200ms).
- `winFanfare(ctx, dest)` → Extended celebration (~2s): ascending pentatonic run → held chord → rhythmic breakdown. Multiple oscillators — the most complex sound in the game.
- `uiHover(ctx, dest)` → Barely-there tick: single cycle of a high square wave (~30ms).
- `uiSelect(ctx, dest)` → Wooden tap: filtered noise burst, slightly lower pitch than hover (~60ms).

### 3. Cue derivation: `src/audio/deriveCues.ts`

A pure function `deriveCues(prev: GameState, next: GameState): AudioCueId[]` that diffs previous and next game state to produce semantic cue IDs. This is the **only** place game state touches audio decisions.

Trigger map:

| State change | Cue |
|---|---|
| `phase` → `'night'` | `music:barn-party` |
| `phase` → `'shop'` | `music:shop` |
| `phase` → `'win'` | `music:stop`, `sfx:win-fanfare` |
| `night` → `night-summary` (same music, no restart) | *(no music change)* |
| `night.barnResidentIds` grows | `sfx:animal-entry` (per new animal) |
| `night.bust` becomes truthy | `sfx:bust` |
| `phase` → `'night-summary'` and not bust | `sfx:scoring-jingle` |
| `shopState.offers` item stock decreases | `sfx:purchase` |
| `shopState.capacityUpgradeCount` increases | `sfx:purchase` |
| `night.usedAbilityIds` grows | `sfx:activate-ability` |

Key rules:
- `night` and `night-summary` share the barn party loop. Transitioning between them must **not** restart the music.
- Entering `win` stops looped music and plays the win fanfare as a one-shot.
- The scoring jingle plays once when the summary starts revealing, not once per scoring row.
- The activate-ability cue fires when the ability resolves, not when targeting mode is entered. `peek` resolves immediately; `fetch` and `kick` fire on target confirmation.
- Bust cue fires exactly once — not again when the bust summary is created.
- Disabled actions, no-op interactions, and sold-out purchases are silent.

`App.tsx` keeps a `previousGameStateRef`, runs `deriveCues(prev, next)` in an effect after each reducer update, and hands the resulting cue IDs to `AudioEngine`.

### 4. UI navigation sounds

UI sounds (hover, select) are triggered directly by event handlers in components, not by state diffing. The audio engine instance is accessible to components via the hook exported from `src/audio/useAudio.ts`.

Guardrails:
- Throttle hover/focus ticks so moving the mouse across a grid does not machine-gun the speaker.
- Do not replay `uiHover` if focus stays on the same control.
- Touch gets confirm feedback without synthetic hover spam from follow-up mouse events.

### 5. Volume controls: `src/ui/AudioControls.tsx`

A small fixed-position UI widget (top-right corner). Mounted once from `App.tsx`, persistent across all phases:

- Mute/unmute toggle button (speaker icon, inline SVG).
- Music volume slider.
- SFX volume slider.
- Collapsed by default to a single speaker icon; expands on click/focus.
- Keyboard accessible (Tab to reach, Enter to toggle mute, arrow keys for sliders).
- ARIA labels on all controls.
- Reads initial state from `localStorage` on mount.
- Default volumes: music ~0.4, SFX ~0.6.

### 6. Mix rules

- Default music gain: `0.4`. Default SFX gain: `0.6`.
- Music crossfade: `300ms`.
- Bust cue: duck music to `0.1`, play scratch → crow sequence, then crossfade to shop track.
- Win cue: hard-stop music, play fanfare once, remain silent on win screen.
- UI hover gain: quieter than select — it should tick, not chatter.
- `PLAY_AGAIN` from win screen resets music ownership cleanly; barn party starts on the first night of the new game.

---

## Implementation Phases

### Phase 1 — Audio engine scaffold

Build `src/audio/engine.ts` with `AudioContext` lifecycle, gain node routing, `playMusic`/`stopMusic`/`playSfx` stubs, polyphony management, volume control with `localStorage` persistence, autoplay unlock listener, and `visibilitychange` suspend/resume.

Create `src/audio/types.ts` for `AudioCueId`, `MusicTrackId`, and settings types.

Write `src/audio/__tests__/engine.test.ts` testing: volume persistence round-trip, mute toggling, unlock gating (calls before unlock are no-ops), polyphony cap behavior.

**Exit criteria:**
- `AudioEngine` can be instantiated, unlocked, and volume state persists across instances.
- Calling `playSfx` before unlock does not throw.
- Polyphony cap stops oldest voice when exceeded.
- Tests pass.

### Phase 2 — SFX sound definitions

Implement all SFX generators in `src/audio/sounds.ts`: `animalEntry` (6 base profiles mapped to all animal IDs with pitch/timbre variation), `bust`, `scoringJingle`, `purchase`, `activateAbility`, `winFanfare`, `uiHover`, `uiSelect`.

Build a temporary dev-only sound palette (behind `?audio-test` URL param) for rapid iteration. This is throwaway.

**Exit criteria:**
- Every sound plays without errors or clicks/pops (proper envelope ramps).
- Each animal has an audibly distinct entry sound within its profile group.
- Win fanfare is noticeably more elaborate than other SFX.
- UI sounds are subtle enough to not annoy at rapid-fire rates.

### Phase 3 — Music loop generation

Implement `barnPartyLoop` and `shopLoop` in `src/audio/sounds.ts`. Each generates a short looping `AudioBuffer` with melody, bass, and optional percussion.

Wire music into `AudioEngine.playMusic()` with crossfade support.

If quality is insufficient after 4 hours of tuning, fall back to simpler ambient textures (arpeggiated chords, rhythmic patterns) rather than full melodies.

**Exit criteria:**
- Both tracks loop seamlessly with no click at the loop point.
- Crossfade between tracks is smooth (no volume dip, no overlap artifacts).
- Each track has a distinct feel: barn = energetic, shop = relaxed.
- Music feels "retro + country."

### Phase 4 — Game state integration

Implement `deriveCues` in `src/audio/deriveCues.ts`. Wire it into `App.tsx` via a `previousGameStateRef` and a post-dispatch effect.

Create `src/audio/useAudio.ts` hook that owns the `AudioEngine` instance and exposes it to components.

Integration points:
- Music switches on phase change. `night` → `night-summary` does **not** restart the barn loop.
- Animal entry sounds fire when `barnResidentIds` grows. Rowdy chain invites stagger by ~100ms per entrant.
- Bust fires exactly once (not again on summary creation).
- Scoring jingle fires on non-bust summary transition.
- Purchase fires on shop buy (animal or capacity).
- Activate fires when `usedAbilityIds` grows (on resolution, not targeting).
- Win fanfare replaces music.
- `PLAY_AGAIN` resets audio state cleanly.

Write `src/audio/__tests__/deriveCues.test.ts` testing exactly-once semantics for bust, purchase, ability, scoring, and win.

**Exit criteria:**
- Full playthrough has correct audio at every moment.
- Rapid invites don't produce a wall of overlapping sound.
- Phase transitions crossfade music cleanly.
- deriveCues unit tests pass.

### Phase 5 — UI navigation sounds and volume controls

Add `AudioControls.tsx` to `App.tsx`. Wire `uiHover` and `uiSelect` sounds into interactive components:

- Barn slots: hover → `uiHover`, click → `uiSelect`
- Shop cards / barn upgrade card: hover → `uiHover`, purchase → handled by purchase SFX (no double-sound)
- Buttons (Call It a Night, Hootenanny, Play Again): hover → `uiHover`, click → `uiSelect`
- Summary continue/skip: click → `uiSelect`

Add hover throttling and same-element deduplication.

**Exit criteria:**
- UI sounds provide tactile feedback without being annoying.
- Volume controls work with mouse, keyboard, and touch.
- Mute state survives page reload.
- Audio controls don't obscure game UI at any viewport size.
- Controls visible and functional in every game phase.

### Phase 6 — Polish, QA, and regression

Tuning pass:
- Balance music behind SFX; ensure bust cuts through clearly and win fanfare feels climactic.
- Test with `prefers-reduced-motion` — audio should still play (motion preference is visual, not auditory).
- Verify seeded debug states (`?seed=shop`, `?seed=win`, `?seed=ability`) work correctly with audio.
- Verify `PLAY_AGAIN` resets music ownership cleanly.

Add `tests/audio.spec.ts` (Playwright):
- `AudioControls` renders and mute toggle works.
- Mute state persists across reload.
- Phase music switches correctly (barn → shop → win).
- No console errors or warnings during a full playthrough with audio enabled.

Remove the `?audio-test` dev palette.

Run all verification:
- `npm run test`
- `npm run test:e2e`
- `npm run build`
- `npm run check:bundle`

Manual validation on at least one Safari-family and one Chromium-family mobile browser.

**Exit criteria:**
- All existing unit and E2E tests pass without modification.
- New audio tests pass.
- Bundle size increase < 8KB gzipped.
- No audio glitches (clicks, pops, stuck oscillators) during normal play.
- No console warnings about AudioContext state.
- Full playthrough from night 1 through win has correct audio at every moment.

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `src/audio/types.ts` | `AudioCueId`, `MusicTrackId`, settings types |
| `src/audio/engine.ts` | Singleton AudioEngine: context lifecycle, gain routing, play/stop, polyphony cap, volume persistence, autoplay unlock, visibility suspend/resume |
| `src/audio/sounds.ts` | Pure functions generating all music loops and SFX via Web Audio API oscillators and envelopes |
| `src/audio/deriveCues.ts` | Pure prev/next `GameState` diff producing semantic cue IDs |
| `src/audio/useAudio.ts` | Preact hook owning one `AudioEngine` instance; exposes engine ref and settings to components |
| `src/audio/__tests__/engine.test.ts` | Unit tests for AudioEngine: volume persistence, mute, unlock gating, polyphony cap |
| `src/audio/__tests__/deriveCues.test.ts` | Unit tests for exactly-once cue derivation across all trigger types |
| `src/ui/AudioControls.tsx` | Persistent mute toggle + volume sliders widget, collapsed by default, keyboard accessible, ARIA-labeled |
| `src/styles/audio.css` | Audio controls positioning, collapsed/expanded states, responsive layout |
| `tests/audio.spec.ts` | Playwright E2E: controls render, mute persists, phase music switches, no console errors |

### Modified Files
| File | Changes |
|------|---------|
| `src/app/App.tsx` | Create AudioEngine via `useAudio`, run `deriveCues` in post-dispatch effect, mount `AudioControls`, pass engine ref to children |
| `src/main.tsx` | Import `audio.css` |
| `src/ui/BarnGrid.tsx` | Add `onMouseEnter`/`onFocus` handlers for `uiHover` on barn slots |
| `src/ui/InspectorPanel.tsx` | Add confirm cue for invite / call-it-a-night / ability interactions |
| `src/ui/TradingPostScreen.tsx` | Add `uiHover` on shop cards, navigation cues on keyboard focus changes |
| `src/ui/ShopCard.tsx` | Add `uiHover` on mouse enter |
| `src/ui/BarnUpgradeCard.tsx` | Add `uiHover` on mouse enter |
| `src/ui/NightSummaryModal.tsx` | Add confirm cue on continue/skip |
| `src/ui/WinScreen.tsx` | Add confirm cue on Play Again |
| `src/content/copy.ts` | Labels and helper text for sound controls |

### Untouched Files
| File | Reason |
|------|--------|
| `src/game/engine.ts` | Game logic unchanged — audio is purely additive presentation |
| `src/game/types.ts` | No new game state for audio — audio state is local to `AudioEngine` |
| `src/game/state.ts` | No changes to game state creation |
| `src/game/catalog.ts` | Animal definitions unchanged |
| `src/game/selectors.ts` | Read-only queries unchanged |
| `src/game/shop.ts` | Shop logic unchanged |
| `src/game/rng.ts` | Untouched |
| `src/ui/AnimalSprite.tsx` | Sprites unchanged |
| `src/ui/PhaseTransitionCurtain.tsx` | No audio on transitions — music crossfade handles it |
| `src/input/useControls.ts` | Navigation sounds wired at component level, not control level |

---

## Definition of Done

### Music
- [ ] Upbeat chiptune hoedown loop plays during the Hootenanny (night) phase
- [ ] Relaxed country/chiptune loop plays during the Shop phase
- [ ] `night` and `night-summary` share the barn party loop — transitioning between them does not restart the music
- [ ] Music crossfades smoothly (~300ms) on phase transitions
- [ ] Music stops on the Win screen — fanfare plays instead
- [ ] Both loops sound seamless with no audible click or gap at the loop point
- [ ] Music has a recognizably "retro + country" character
- [ ] `PLAY_AGAIN` resets music ownership cleanly for the new game

### Sound Effects
- [ ] Each animal type has an audibly distinct entry sound (6 base profiles with per-animal pitch/timbre variation)
- [ ] Bust triggers a dramatic record-scratch → crow sequence
- [ ] Non-bust night scoring triggers a celebratory jingle (once per summary, not per row)
- [ ] Shop purchases (animal or capacity) trigger a "cha-ching" coin sound
- [ ] Activating an ability triggers a subtle pluck/chime on resolution (not on targeting)
- [ ] Winning triggers an extended hoedown breakdown fanfare
- [ ] Hovering interactive elements produces a soft tick (throttled, deduplicated)
- [ ] Clicking/selecting produces a wooden tap
- [ ] No SFX produces audible clicks or pops (all envelopes ramp properly)
- [ ] Rapid-fire sounds (fast hovering, Rowdy chain invites) don't produce a distorted wall of noise
- [ ] Disabled actions, no-op interactions, and sold-out purchases are silent
- [ ] Bust cue fires exactly once — not duplicated across phase transitions

### Volume & Controls
- [ ] Audio controls widget is visible and accessible in every game phase (keyboard + mouse + touch)
- [ ] ARIA labels on all audio controls
- [ ] Mute toggle silences all audio instantly
- [ ] Independent music and SFX volume sliders
- [ ] Volume/mute preferences persist in `localStorage` across page reloads
- [ ] Default state is unmuted at reasonable volume levels (music ~0.4, SFX ~0.6)

### Browser Compliance
- [ ] AudioContext created lazily on first user gesture — no autoplay policy violations
- [ ] Calling audio functions before unlock is a silent no-op (no errors, no queuing)
- [ ] Tab backgrounding suspends audio context; returning resumes if not muted
- [ ] No console warnings or errors about AudioContext state during normal play
- [ ] Works in Chrome, Firefox, and Safari (manual validation)

### Quality & Regression
- [ ] Game logic is completely untouched — no changes to engine, types, state, or scoring
- [ ] All existing unit and E2E tests pass without modification
- [ ] `deriveCues` unit tests verify exactly-once semantics for all trigger types
- [ ] New Playwright spec validates: controls render, mute persists, phase music switches, no console errors
- [ ] Bundle size increase < 8KB gzipped
- [ ] `prefers-reduced-motion` has no effect on audio
- [ ] Seeded debug states (`?seed=shop`, `?seed=win`, `?seed=ability`) work correctly with audio
- [ ] Full playthrough from night 1 through win has correct audio at every moment
- [ ] `npm run test`, `npm run test:e2e`, `npm run build`, and `npm run check:bundle` all pass

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Procedural music sounds bad** — synthesized loops may not feel "musical" enough for extended play | High | Start with simple pentatonic melodies over predictable bass lines. Keep loops short (~8 bars). If quality is insufficient after 4 hours of tuning, fall back to simpler ambient textures (arpeggiated chords, rhythmic patterns) rather than full melodies. |
| **Browser audio inconsistencies** — Web Audio API behavior varies, especially Safari | Medium | Stick to basic Web Audio features (OscillatorNode, GainNode, AudioBuffer). No AudioWorklet, no exotic nodes. Test in Safari early in Phase 1. Manual validation on Safari + mobile Chrome. |
| **Annoying at volume** — sounds fine individually become grating after 20 minutes | Medium | Keep all SFX short (<1s). Music defaults to 0.4. Provide easy mute access. Playtest a full game during Phase 6 polish. |
| **Audio clicks and pops** — discontinuities from abrupt oscillator starts/stops | Medium | Every gain envelope must ramp (minimum 5ms). `OscillatorNode.stop()` must be preceded by gain ramp-down. Enforce in code review. |
| **Overlapping sound overload** — Rowdy chains or rapid hovering produce 10+ simultaneous sounds | Medium | Cap simultaneous SFX at 8 (stop oldest). UI sounds are extremely short (<60ms). Animal entry sounds stagger by ~100ms for Rowdy chains. Hover sounds throttled. |
| **Memory leaks from long sessions** — undisconnected nodes accumulate over a 30-minute session | Medium | Every oscillator/gain node self-disconnects after envelope completes. Music buffer cached once, not re-created. Verify in Phase 6 with a sustained play session. |
| **Mobile audio latency** — Web Audio on mobile can have higher latency and lower polyphony limits | Low | Keep SFX short and simple. Polyphony cap of 8 accommodates mobile limits. Accept slightly higher latency on mobile as non-blocking. |
| **AudioContext resume on mobile** — iOS Safari may suspend context on tab switch or OS interruption | Low | Listen for `visibilitychange` and call `ctx.resume()` when tab becomes visible. Accept that OS-level interruptions (phone calls) may require a user gesture to resume. |
| **Scope creep on sound design** — tweaking "one more thing" is an infinite loop | Medium | Each sound gets a maximum of 30 minutes of tuning. Music loops get a 4-hour cap total. Ship and note issues for Final QA (#27). |

---

## Dependencies

### Internal
- Sprint 003 complete and stable: all animation, copy, and phase transition infrastructure in place.
- All existing unit and E2E tests passing as baseline.
- `GameState` shape stable — `deriveCues` diffs against it, so field renames would break integration.
- `BarnGrid.tsx` guest-diff behavior must remain intact — it is the trigger point for entry audio.
- `App.tsx` phase transition ownership must remain stable.

### External
- Web Audio API (supported in all target browsers: Chrome 35+, Firefox 25+, Safari 14.1+).
- No new npm packages.
- No audio asset files.

### Ordering
- Phase 1 (engine scaffold) must come first — everything depends on it.
- Phase 2 (SFX definitions) and Phase 3 (music loops) can proceed in parallel after Phase 1.
- Phase 4 (game state integration) depends on Phases 1, 2, and 3.
- Phase 5 (UI sounds + controls) depends on Phase 4 (needs engine ref wired through App).
- Phase 6 (polish + QA) comes last.

```
Phase 1 (engine)
├── Phase 2 (SFX)     ─┐
└── Phase 3 (music)    ─┤
                        └── Phase 4 (integration)
                              └── Phase 5 (UI sounds + controls)
                                    └── Phase 6 (polish + QA)
```
