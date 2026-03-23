# Sprint 004: Sound of the Barn

## Overview

Sprint 003 gave the game a face. This sprint gives it a voice. Every visual action in the game — inviting an animal, busting, scoring, buying, winning — currently happens in silence. After this sprint, the game has a complete "retro + country" soundscape: two music tracks, seven SFX categories, and player-accessible volume controls.

Backlog items covered: **#15–23** (Music — Barn Party Track, Music — Shop Track, SFX — Animal Entry, SFX — Bust, SFX — Scoring Jingle, SFX — Purchase, SFX — Activate Ability, SFX — Win Fanfare, SFX — UI Navigation).

Out of scope: CI/CD (#26), Final QA (#27), balance changes, new visual effects, gameplay changes.

### Product Rules

- **Procedural audio only.** All sounds are synthesized at runtime via Web Audio API. No `.mp3`/`.wav`/`.ogg` files. This matches the project's existing pattern (procedural SVG sprites, no image assets) and keeps the bundle near zero growth.
- **Retro + country feel.** Square waves, triangle waves, short decay envelopes, pentatonic/major scales. Think NES-era chiptune crossed with banjo twang. Not orchestral, not 8-bit-for-the-sake-of-it.
- **Audio must never block gameplay.** All sound is fire-and-forget. No animation or game logic waits on audio completion.
- **Browser autoplay policy compliance.** AudioContext is created on first user gesture. Before that, the game works exactly as it does today — silently.
- **Mute persists.** Volume/mute preference is stored in `localStorage` and restored on reload.
- **Zero new runtime dependencies.**

---

## Architecture

### 1. Audio engine: `src/audio/engine.ts`

A singleton `AudioEngine` class wrapping the Web Audio API. Responsibilities:

- Lazy `AudioContext` creation on first user interaction (click/keydown).
- Two independent gain nodes: `musicGain` and `sfxGain`, both feeding a `masterGain` before `destination`.
- Music playback: holds a reference to the currently playing music loop. Exposes `playMusic(trackId)` and `stopMusic()`. Crossfades between tracks over 400ms when switching phases.
- SFX playback: `playSfx(sfxId)` triggers a one-shot sound. Multiple SFX can overlap. Each SFX creates short-lived oscillator/gain nodes that self-disconnect after their envelope completes.
- Volume control: `setMusicVolume(0–1)`, `setSfxVolume(0–1)`, `setMuted(boolean)`. Reads/writes `localStorage` keys `hnn-music-vol`, `hnn-sfx-vol`, `hnn-muted`.
- `isUnlocked()` query so the UI can show a "tap to enable audio" hint if needed.

The engine knows nothing about game state. It exposes `playMusic`, `stopMusic`, `playSfx`, and volume methods. The integration layer decides *when* to call them.

### 2. Sound definitions: `src/audio/sounds.ts`

Pure functions that take an `AudioContext` and a destination `AudioNode` and produce sound. Each function schedules oscillators, gains, and envelopes using `context.currentTime`. No function holds state. Categories:

**Music generators:**
- `barnPartyLoop(ctx, dest)` → Returns an `AudioBufferSourceNode` playing a procedurally generated ~8-bar chiptune hoedown loop. Square wave melody over triangle wave bass, pentatonic major scale, ~140 BPM. Looping enabled.
- `shopLoop(ctx, dest)` → Same structure, ~90 BPM, laid-back country shuffle feel. More triangle wave, less percussive.

Music loops are rendered to `AudioBuffer` once on first play, then cached. This avoids per-frame scheduling overhead and ensures seamless looping.

**SFX generators (all one-shot, <1s duration):**
- `animalEntry(ctx, dest, animalId)` → Per-animal sound. Maps each `AnimalId` to a characteristic pitch + waveform (goat: short bleat via sawtooth vibrato; chicken: quick staccato clucks; owl: descending hoot via sine; etc.). Each animal should be immediately recognizable.
- `bust(ctx, dest)` → Two-part: white noise burst (record scratch, 200ms) → silence (150ms) → descending sawtooth "crow" (400ms). Dramatic, unmistakable.
- `scoringJingle(ctx, dest)` → Rising three-note arpeggio, triangle wave, major triad. Quick celebratory flourish (~500ms).
- `purchase(ctx, dest)` → High-pitched metallic "cha-ching": two fast sine pings with quick decay, slight pitch bend. (~300ms).
- `activateAbility(ctx, dest)` → Soft pluck: single triangle wave note with fast attack, medium decay. Subtle so it doesn't distract from the ability's visual effect. (~200ms).
- `winFanfare(ctx, dest)` → Extended celebration (~2s): ascending pentatonic run → held chord → rhythmic breakdown. Multiple oscillators, the most complex sound in the game.
- `uiHover(ctx, dest)` → Barely-there tick: single cycle of a high square wave. (~30ms).
- `uiSelect(ctx, dest)` → Wooden tap: filtered noise burst, very short, slightly lower pitch than hover. (~60ms).
- `uiNavigate(ctx, dest)` → Soft click: sine wave pip at ~800Hz, 50ms. Slightly more presence than hover but still background-level.

### 3. Integration layer: `src/audio/hooks.ts`

A Preact hook `useGameAudio(gameState, prevGameState)` that lives in `App.tsx`. It diffs current vs. previous game state and calls the audio engine accordingly. This is the **only** place game state touches audio.

Trigger map:
| State change | Audio call |
|---|---|
| `phase` changes to `'night'` | `playMusic('barn-party')` |
| `phase` changes to `'shop'` | `playMusic('shop')` |
| `phase` changes to `'win'` | `stopMusic()`, `playSfx('win-fanfare')` |
| `night.barnResidentIds` grows | `playSfx('animal-entry', newAnimalId)` |
| `night.bust` becomes truthy | `playSfx('bust')` |
| `phase` changes to `'night-summary'` and not bust | `playSfx('scoring-jingle')` |
| `shopState.offers` item stock decreases | `playSfx('purchase')` |
| `shopState.capacityUpgradeCount` increases | `playSfx('purchase')` |
| `night.usedAbilityIds` grows | `playSfx('activate-ability')` |

UI navigation sounds (hover, select, navigate) are triggered directly by event handlers in components, not by state diffing. The hook exports the audio engine instance so components can call `engine.playSfx('ui-hover')` etc. on `onMouseEnter`/`onFocus`/`onClick`.

### 4. Volume controls: `src/ui/AudioControls.tsx`

A small fixed-position UI widget (top-right corner or similar). Contains:
- Mute/unmute toggle button (speaker icon, built with inline SVG, no assets).
- Music volume slider.
- SFX volume slider.
- Collapsed by default to a single speaker icon; expands on click/focus.
- Keyboard accessible (Tab to reach, Enter to toggle mute, arrow keys for sliders).
- Reads initial state from `localStorage` on mount.

### 5. AudioContext unlock strategy

Browsers block `AudioContext` until a user gesture. The approach:
1. `AudioEngine` starts with `ctx = null`.
2. A one-time `click`/`keydown` listener on `document` creates the `AudioContext` and removes itself.
3. If the user interacts before any audio is requested, the context is ready silently.
4. If `playMusic`/`playSfx` is called before unlock, the call is silently dropped (no queuing — the user hasn't gestured yet, so they haven't missed anything).
5. No intrusive "click to enable sound" modal. The mute button's visual state hints at audio capability.

---

## Implementation Phases

### Phase 1 — Audio engine scaffold

Build `src/audio/engine.ts` with `AudioContext` lifecycle, gain node routing, `playMusic`/`stopMusic`/`playSfx` stubs, volume control with `localStorage` persistence, and the autoplay unlock listener.

Write `src/audio/__tests__/engine.test.ts` testing: volume persistence round-trip, mute toggling, unlock gating (calls before unlock are no-ops).

**Exit criteria:**
- `AudioEngine` can be instantiated, unlocked, and volume state persists across instances.
- Calling `playSfx` before unlock does not throw.
- Tests pass.

### Phase 2 — SFX sound definitions

Implement all SFX generators in `src/audio/sounds.ts`: `animalEntry` (all 14 regular + 5 blue ribbon animals), `bust`, `scoringJingle`, `purchase`, `activateAbility`, `winFanfare`, `uiHover`, `uiSelect`, `uiNavigate`.

Build a temporary dev-only sound palette page (behind `?audio-test` URL param) that renders a button per sound for rapid iteration and tuning. This is throwaway — it doesn't need to be polished.

**Exit criteria:**
- Every sound plays without errors or clicks/pops (proper envelope ramps prevent discontinuities).
- Each animal has an audibly distinct entry sound.
- Win fanfare is noticeably more elaborate than other SFX.
- UI sounds are subtle enough to not be annoying at rapid-fire rates (hovering quickly through a grid).

### Phase 3 — Music loop generation

Implement `barnPartyLoop` and `shopLoop` in `src/audio/sounds.ts`. Each generates a short looping `AudioBuffer` with melody, bass, and optional percussion channel.

Wire music into `AudioEngine.playMusic()` with crossfade support (fade out current over 400ms while fading in next).

**Exit criteria:**
- Barn party track loops seamlessly with no click at the loop point.
- Shop track loops seamlessly.
- Crossfade between tracks is smooth (no volume dip, no overlap artifacts).
- Each track has a distinct feel: barn = energetic, shop = relaxed.
- Music feels "retro + country" — recognizably chiptune, recognizably hoedown-ish.

### Phase 4 — Game state integration

Implement `useGameAudio` hook in `src/audio/hooks.ts`. Wire it into `App.tsx`. This phase connects all the audio to actual gameplay.

Integration points:
- Music switches on phase change.
- Animal entry sounds fire when `barnResidentIds` grows (including `Rowdy` chain invites — each entry gets its own sound, staggered by ~100ms).
- Bust sound fires when `night.bust` becomes truthy.
- Scoring jingle fires on non-bust summary transition.
- Purchase sound fires on shop buy (animal or capacity).
- Activate sound fires when `usedAbilityIds` grows.
- Win fanfare fires on win phase, replacing music.

**Exit criteria:**
- Full playthrough has correct audio at every moment.
- Rapid invites don't produce a wall of overlapping sound (sounds are short enough that ~2-3 overlapping is fine, but gate against >5 simultaneous).
- Phase transitions crossfade music cleanly.
- Bust immediately interrupts music with the bust SFX, then resumes barn party track at lower volume during pin selection (or crossfades to shop).

### Phase 5 — UI navigation sounds and volume controls

Add `AudioControls.tsx` to `App.tsx`. Wire `uiHover`, `uiSelect`, `uiNavigate` sounds into interactive components:
- Barn slots: hover → `uiHover`, click → `uiSelect`
- Shop cards: hover → `uiHover`, purchase click → handled by purchase SFX (no double-sound)
- Buttons (Call It a Night, Hootenanny, Play Again): hover → `uiHover`, click → `uiSelect`
- Arrow key navigation in barn grid / shop: each move → `uiNavigate`
- Door/Window slots: click → `uiSelect`

Volume controls:
- Collapsed single-icon default, expands to sliders.
- Mute toggle immediately silences all audio.
- Sliders provide independent music/SFX control.
- State persists to `localStorage`.

**Exit criteria:**
- UI sounds provide tactile feedback without being annoying.
- Volume controls work with mouse, keyboard, and touch.
- Mute state survives page reload.
- Audio controls don't obscure game UI at any viewport size.

### Phase 6 — Polish, QA, and regression

Tuning pass:
- Adjust relative volumes so music sits behind SFX, SFX sits behind UI sounds in importance but not volume.
- Ensure bust SFX cuts through clearly.
- Ensure win fanfare feels climactic.
- Test with `prefers-reduced-motion` — audio should still play (motion preference is visual, not auditory).

Add `tests/audio.spec.ts` (Playwright):
- Verify `AudioControls` widget renders and mute toggle works.
- Verify mute state persists across reload.
- Verify no console errors during a full playthrough with audio enabled.

Run all verification:
- `npm run test`
- `npm run test:e2e`
- `npm run build`
- `npm run check:bundle`

Remove the `?audio-test` dev palette if still present.

**Exit criteria:**
- All existing unit and E2E tests pass.
- New audio tests pass.
- Bundle size increase < 8KB gzipped (procedural audio is just code).
- No audio glitches (clicks, pops, stuck oscillators) during normal play.
- No console warnings about AudioContext state.
- Full playthrough from night 1 to win feels sonically cohesive.

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `src/audio/engine.ts` | Singleton AudioEngine: context lifecycle, gain routing, play/stop, volume persistence, autoplay unlock |
| `src/audio/sounds.ts` | Pure functions generating all music loops and SFX via Web Audio API oscillators and envelopes |
| `src/audio/hooks.ts` | `useGameAudio` hook: diffs game state, triggers audio engine calls; exports engine ref for UI sounds |
| `src/audio/__tests__/engine.test.ts` | Unit tests for AudioEngine: volume persistence, mute, unlock gating |
| `src/ui/AudioControls.tsx` | Mute toggle + volume sliders widget, collapsed by default, keyboard accessible |
| `tests/audio.spec.ts` | Playwright E2E: controls render, mute persists, no console errors during play |

### Modified Files
| File | Changes |
|------|---------|
| `src/app/App.tsx` | Import and call `useGameAudio` hook; mount `AudioControls`; pass audio engine ref to children needing UI sounds |
| `src/ui/BarnGrid.tsx` | Add `onMouseEnter`/`onFocus` handlers for `uiHover` on barn slots |
| `src/ui/TradingPostScreen.tsx` | Add `uiHover` on shop cards, `uiNavigate` on keyboard navigation |
| `src/ui/ShopCard.tsx` | Add `uiHover` on mouse enter |
| `src/ui/BarnUpgradeCard.tsx` | Add `uiHover` on mouse enter |
| `src/styles/app.css` | Styles for `AudioControls` positioning and collapsed/expanded states |

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
| `src/content/copy.ts` | No new copy needed for audio |
| `src/ui/AnimalSprite.tsx` | Sprites unchanged |
| `src/ui/NightSummaryModal.tsx` | Summary audio triggered by hook, not by modal |
| `src/ui/WinScreen.tsx` | Win audio triggered by hook, not by screen |
| `src/ui/PhaseTransitionCurtain.tsx` | No audio on transitions (music crossfade handles it) |
| `src/input/useControls.ts` | Navigation sounds wired at component level, not control level |

---

## Definition of Done

### Music
- [ ] Upbeat chiptune hoedown loop plays during the Hootenanny (night) phase
- [ ] Relaxed country/chiptune loop plays during the Shop phase
- [ ] Music crossfades smoothly (~400ms) on phase transitions
- [ ] Music stops (does not loop) on the Win screen — fanfare plays instead
- [ ] Both loops sound seamless with no audible click or gap at the loop point
- [ ] Music has a recognizably "retro + country" character

### Sound Effects
- [ ] Each of the 19 animal types has a unique, recognizable entry sound when entering the barn
- [ ] Bust triggers a dramatic record-scratch → rooster-crow sequence
- [ ] Non-bust night scoring triggers a celebratory fiddle flourish jingle
- [ ] Shop purchases (animal or capacity) trigger a "cha-ching" coin sound
- [ ] Activating an ability triggers a subtle pluck/chime
- [ ] Winning with 3 blue ribbons triggers an extended hoedown breakdown fanfare
- [ ] Hovering interactive elements produces a soft tick
- [ ] Clicking/selecting produces a wooden tap
- [ ] Keyboard navigation produces a soft click per move
- [ ] No SFX produces audible clicks or pops (all envelopes ramp properly)
- [ ] Rapid-fire sounds (fast hovering, Rowdy chain invites) don't produce a distorted wall of noise

### Volume & Controls
- [ ] Audio controls widget is visible and accessible (keyboard + mouse + touch)
- [ ] Mute toggle silences all audio instantly
- [ ] Independent music and SFX volume sliders
- [ ] Volume/mute preferences persist in `localStorage` across page reloads
- [ ] Default state is unmuted at reasonable volume levels (music ~0.4, SFX ~0.6)

### Browser Compliance
- [ ] AudioContext created lazily on first user gesture — no autoplay policy violations
- [ ] Calling audio functions before unlock is a silent no-op (no errors, no queuing)
- [ ] No console warnings about AudioContext state during normal play
- [ ] Works in Chrome, Firefox, and Safari (all use standard Web Audio API)

### Quality & Regression
- [ ] Game logic is completely untouched — no changes to engine, types, state, or scoring
- [ ] All existing unit and E2E tests pass without modification
- [ ] New Playwright spec validates: controls render, mute persists, no console errors
- [ ] Bundle size increase < 8KB gzipped
- [ ] `prefers-reduced-motion` has no effect on audio (audio is not motion)
- [ ] Full playthrough from night 1 through win has correct audio at every moment

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Procedural music sounds bad** — synthesized loops may not feel "musical" enough for extended play | High | Start with simple pentatonic melodies over predictable bass lines. Keep loops short (~8 bars) so repetition is a feature, not a bug. If quality is insufficient after 4 hours of tuning, fall back to simpler ambient textures (arpeggiated chords, rhythmic patterns) rather than trying to compose full melodies. |
| **Browser audio inconsistencies** — Web Audio API behavior varies across browsers, especially Safari | Medium | Stick to basic Web Audio features (OscillatorNode, GainNode, AudioBuffer). No AudioWorklet, no exotic node types. Test in Safari early in Phase 1. |
| **Annoying at volume** — sounds that seem fine individually become grating after 20 minutes of play | Medium | Keep all SFX short (<1s). Music volume defaults to 0.4. Provide easy mute access. Playtest a full game during Phase 6 polish. |
| **Audio clicks and pops** — discontinuities from abrupt oscillator starts/stops | Medium | Every gain envelope must ramp (even 5ms) rather than jump. `OscillatorNode.stop()` must be preceded by gain ramp-down. Enforce this pattern in code review. |
| **Overlapping sound overload** — Rowdy chains or rapid hovering produce 10+ simultaneous sounds | Medium | Cap simultaneous SFX at 8 (drop oldest). UI sounds are extremely short (<60ms) so overlap is naturally brief. Animal entry sounds stagger by 100ms for Rowdy chains. |
| **AudioContext resume on mobile** — iOS Safari may suspend the context on tab switch | Low | Listen for `visibilitychange` and call `ctx.resume()` when the tab becomes visible again. |
| **Bundle size from music buffers** — rendered AudioBuffers exist only in memory, but the generation code could be large | Low | Music generation is just math — a few hundred lines of oscillator scheduling. Estimated <3KB gzipped. |
| **Scope creep on sound design** — tweaking "one more thing" on every sound is an infinite loop | Medium | Each sound gets a maximum of 30 minutes of tuning. If it's not right by then, ship it and note it for Final QA (#27). |

---

## Dependencies

### Internal
- Sprint 003 complete and stable: all animation, copy, and phase transition infrastructure in place.
- All existing unit and E2E tests passing as baseline.
- `GameState` shape stable — the audio hook diffs against it, so field renames would break integration.

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
