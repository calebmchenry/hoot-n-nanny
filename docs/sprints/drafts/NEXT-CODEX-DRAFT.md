# Sprint 004: Sound of the Barn

## Overview

Sprint 003 finished the feel of the game. Sprint 004 finishes its sound. This sprint implements every remaining medium-priority backlog item in one pass so the audio system, the cue set, and the final mix are tuned together instead of being bolted on piecemeal later.

Backlog items covered: **#15 (Music — Barn Party Track)**, **#16 (Music — Shop Track)**, **#17 (SFX — Animal Entry Sounds)**, **#18 (SFX — Bust)**, **#19 (SFX — Scoring Jingle)**, **#20 (SFX — Purchase)**, **#21 (SFX — Activate Ability)**, **#22 (SFX — Win Fanfare)**, **#23 (SFX — UI Navigation)**.

Out of scope: CI/CD (#26), final QA / ship polish (#27), adaptive music, ambient barn Foley, voiceover, and settings persistence across reloads. This sprint is about complete in-session audio, not a full options menu or audio middleware project.

### Product Rules

- Use the browser platform directly. No `howler`, no game engine, no extra runtime dependency just to play two loops and a handful of one-shots.
- Do not add audio flags, pending cues, or sound state to `GameState`. The reducer stays about mechanics.
- `night` and `night-summary` share the same barn music bed. The summary gets a scoring flourish on top; it does not get its own third music track.
- Only one music loop may be active at a time. Entering `win` stops background music and plays the win fanfare as a one-shot.
- If audio cannot unlock, decode, or play on a given device, the game must remain fully playable with no blocked controls and no console spam loops.

After this sprint, all content-facing gameplay work is done. Only shipping infrastructure and final QA remain.

---

## Architecture

### 1. Add a dedicated `src/audio` domain, not ad-hoc `new Audio()` calls

The codebase already has clean domains for `game`, `ui`, and `content`. Audio should follow that pattern instead of leaking playback code into components.

Add a small audio layer:

```ts
interface AudioDirector {
  unlock(): Promise<void>;
  setMuted(muted: boolean): void;
  setMusicVolume(value: number): void; // 0..1
  setSfxVolume(value: number): void;   // 0..1
  setMusicTrack(track: 'barn-party' | 'shop' | null): void;
  playCue(cue: AudioCueId): void;
  suspend(): void;
  resume(): void;
}
```

`AudioDirector` owns one `AudioContext`, one master gain, one music bus, and one SFX bus. It also owns decoded buffer caching, loop start/stop, short crossfades, and simple ducking. `App.tsx` owns exactly one director instance for the lifetime of the page.

This is the right trade:

- `HTMLAudioElement` clones are fine for prototypes, but they are bad at mixing, ducking, and repeated low-latency UI cues.
- Web Audio gives us predictable gain control, layering, and one-shot reuse without adding a dependency.
- Keeping the director in `src/audio` prevents UI components from becoming a pile of browser-audio edge cases.

### 2. Keep cue derivation out of the reducer

The reducer is already pure and testable. Do not contaminate it with presentation concerns.

Add `src/audio/deriveCues.ts` as a pure diff layer:

- Input: previous `GameState`, next `GameState`
- Output: semantic cue ids such as `bust`, `purchase`, `ability`, `score-jingle`, `win-fanfare`

`App.tsx` already centralizes state transitions. It should keep a `previousGameStateRef`, run `deriveCues(prev, next)` in an effect after each reducer update, and hand the resulting cue ids to `AudioDirector`.

This keeps the ownership clean:

- `engine.ts` decides what happened mechanically
- `deriveCues.ts` decides what should be heard
- `AudioDirector` decides how to play it

### 3. Reuse existing UI-local diff seams instead of inventing new state

The current UI already has two excellent audio trigger points:

- `BarnGrid.tsx` already compares previous and current guest groups to animate new entries and stack growth. It should also own animal entry SFX. Do **not** add `lastInvitedAnimalId` to state.
- `TradingPostScreen.tsx` already owns focus navigation and immediate purchases. It is the correct place for shop hover/confirm audio and for plumbing purchase success back to the shared audio layer.

That means audio ownership splits cleanly:

| Trigger | Owner | Behavior |
| --- | --- | --- |
| Enter `night` or `night-summary` | `App.tsx` | Play / keep barn party loop |
| Enter `shop` | `App.tsx` | Crossfade to shop loop |
| Enter `win` | `App.tsx` | Stop music and play win fanfare once |
| New animal group appears in barn | `BarnGrid.tsx` | Play `animal-entry:<animalId>` |
| Successful ability resolution | `deriveCues.ts` | Play `ability` once |
| Successful shop purchase or capacity buy | `deriveCues.ts` | Play `purchase` once |
| Bust transition | `deriveCues.ts` | Play composite bust cue |
| Non-bust summary reveal begins | `NightSummaryModal.tsx` or `deriveCues.ts` | Play `score-jingle` once |
| Hover / keyboard focus / confirm | UI leaf components | Play `ui-hover` or `ui-confirm` |

One opinionated rule matters here: the activate-ability cue fires when the ability actually resolves, not when the player merely enters targeting mode. `peek` resolves immediately, so it sounds on button press. `fetch` and `kick` are two-step interactions, so the cue fires on target confirmation.

### 4. Use an explicit asset manifest and keep the pack small

Add audio assets under `src/assets/audio/` and register them in `src/audio/manifest.ts`.

Recommended asset layout:

- `src/assets/audio/music/barn-party.ogg`
- `src/assets/audio/music/barn-party.mp3`
- `src/assets/audio/music/shop.ogg`
- `src/assets/audio/music/shop.mp3`
- `src/assets/audio/sfx/animals/*.wav` for all 19 `AnimalId`s
- `src/assets/audio/sfx/bust-scratch.wav`
- `src/assets/audio/sfx/bust-rooster.wav`
- `src/assets/audio/sfx/score-jingle.wav`
- `src/assets/audio/sfx/purchase.wav`
- `src/assets/audio/sfx/ability.wav`
- `src/assets/audio/sfx/win-fanfare.wav`
- `src/assets/audio/sfx/ui-hover.wav`
- `src/assets/audio/sfx/ui-confirm.wav`

Two important choices:

- Music gets dual formats because loop playback quality matters and Safari is still the browser most likely to disagree with the happy path.
- Short SFX stay as tiny mono `.wav` files because decode speed and compatibility matter more here than shaving the last few kilobytes.

Set a hard audio payload budget: **2 MB compressed total across all shipped audio files**. This is separate from the existing JS budget check and prevents the game from quietly turning into a large static download.

### 5. Mix for readability, not realism

The sound direction is retro + country, but clarity matters more than authenticity. The player should always understand what just happened.

Mix rules:

- Default music gain: `0.45`
- Default SFX gain: `0.8`
- UI hover gain: quieter than confirm; it should tick, not chatter
- Music crossfade: `220ms`
- Bust cue: duck music to `0.12`, play scratch, then rooster about `140ms` later
- Win cue: hard-stop background music, play fanfare once, then remain silent on the win screen
- Polyphony cap: 6 simultaneous SFX voices
- Entry SFX may get tiny pitch jitter (`±3%`) to avoid repeated goat/goose spam sounding robotic

Do not overdesign this into a dynamic mix system. Two buses, one ducking path, and a polyphony cap are enough.

### 6. Add one global audio control surface

The current app has three primary scenes. Duplicating sound controls in all three is wasteful and guarantees drift.

Add `AudioControls.tsx` and mount it once from `App.tsx` as a persistent top-right overlay:

- Always-visible mute toggle
- Expandable panel with two range inputs: `Music` and `SFX`
- Keyboard reachable and touch friendly
- Present in every phase without duplicating markup in `StatusBar`, `TradingPostScreen`, and `WinScreen`

Do **not** persist settings in `localStorage` this sprint. The project intent explicitly avoids cross-session persistence, and audio preference persistence is nice-to-have, not core to finishing the game’s soundscape.

### 7. Test decisions, not waveforms

Do not try to assert literal speaker output in automated tests.

Testable seams:

- `deriveCues.ts` gets unit tests for exactly-once semantics on bust, purchase, ability, scoring, and win
- `App.tsx` exposes lightweight debug attributes like `data-audio-track` and `data-audio-unlocked` so Playwright can assert phase ownership and unlock behavior
- Playwright validates controls, mute state, phase music switching, and that audio never blocks progress through the game flow

That is the right level of confidence for this repo.

---

## Implementation Phases

### Phase 1 — Asset pack and audio scaffolding

Create the `src/audio` directory, the asset manifest, and the `AudioDirector` skeleton. Import all final audio files up front so filenames, cue ids, and gains are locked before UI wiring starts.

Add the persistent `AudioControls` shell in `App.tsx` with runtime-only settings state: `muted`, `musicVolume`, `sfxVolume`, `unlocked`.

Browser behavior to implement now:

- First pointer or keyboard interaction calls `unlock()`
- Hidden tab suspends audio context
- Returning to the tab resumes audio context if not muted
- Decode failures fail silent and mark the cue unavailable instead of retrying forever

**Exit criteria:**
- Audio assets are present in-repo and referenced only through `manifest.ts`
- One `AudioDirector` instance exists for the whole app
- Mute and volume controls manipulate live gain nodes
- The game still runs normally if audio never unlocks

### Phase 2 — Phase music and fanfare ownership

Wire phase-based music from `App.tsx`.

Rules to implement:

- `night` and `night-summary` both use the barn party loop
- Moving from `night` to `night-summary` must not restart the barn loop
- Entering `shop` crossfades to the shop track
- Returning from `shop` to `night` crossfades back to the barn track
- Entering `win` stops looped music and plays the win fanfare once

Do not put this logic into scene components. They mount and unmount too often. `App.tsx` already has the stable phase model.

**Exit criteria:**
- Exactly one music track is active at a time
- Phase changes never double-start or abruptly restart the same loop
- Win screen always gets fanfare instead of layered music chaos

### Phase 3 — One-shot SFX for gameplay events

Wire the event-driven cues.

`BarnGrid.tsx`
- Play the per-animal entry cue whenever a new guest group appears
- Rowdy chains should trigger one cue per actual entrant
- Stack growth should not replay the entry cue for the whole stack

`deriveCues.ts`
- Successful `usedAbilityIds` growth -> `ability`
- Successful `pop` or `cash` spend in shop -> `purchase`
- `night.bust` transition or bust summary creation -> `bust`
- Non-bust summary opening -> `score-jingle`
- Transition into `win` -> handled as fanfare, not generic score cue

One opinionated exception: the scoring jingle plays once when the summary starts revealing, not once per scoring row. The tally is already visual; repeated jingles would be obnoxious.

**Exit criteria:**
- Every backlog event from #17 through #22 has a concrete cue and a single owner
- No-op actions and disabled controls do not emit sounds
- Bust, scoring, and win cues never double-fire across phase transitions

### Phase 4 — UI navigation audio and final mix tuning

Wire `ui-hover` and `ui-confirm` across the interactive surfaces:

- Barn slot selection and inspector buttons
- Shop card hover / focus / purchase
- Capacity upgrade card
- Summary continue / skip button
- Win screen `Play Again`

Add two guardrails:

- Throttle hover/focus ticks so moving the mouse across a grid does not machine-gun the speaker
- Do not replay `ui-hover` if focus stays on the same control

Then tune the actual mix:

- Balance entry SFX against the barn loop
- Make the bust cue cut through the music cleanly
- Keep purchase and ability cues short enough that repeated actions still feel snappy

**Exit criteria:**
- Mouse, keyboard, and touch all get navigation feedback
- The mix remains readable during rapid play, not just in isolated happy paths
- Audio never feels louder than the game’s visual polish can support

### Phase 5 — Verification and regression coverage

Add tests:

- `src/audio/__tests__/deriveCues.test.ts`
- `tests/audio-smoke.spec.ts`

Test cases to cover:

- First interaction unlocks audio state
- Mute toggle suppresses new playback without breaking UI
- `night` owns barn music, `shop` owns shop music, `win` owns fanfare
- Ability, purchase, bust, and scoring cues are derived exactly once from representative state transitions
- Existing `shop-and-win` and personality/motion flows still work with audio enabled

Run:

- `npm run test`
- `npm run test:e2e`
- `npm run build`
- `npm run check:bundle`

Manual pass required on:

- Desktop Chrome
- Mobile Safari or iOS simulator
- Mobile Chrome

**Exit criteria:**
- Automated tests pass
- Manual browser pass confirms unlock, looping, and mute behavior
- Existing gameplay flows are unaffected

---

## Files Summary

### New Files

| File | Purpose |
| --- | --- |
| `src/audio/types.ts` | `AudioCueId`, `MusicTrackId`, settings types, and small shared audio interfaces |
| `src/audio/manifest.ts` | Single source of truth for imported assets, cue metadata, gains, and loop flags |
| `src/audio/director.ts` | Web Audio playback engine: unlock, decode, buses, loop switching, ducking, polyphony cap |
| `src/audio/deriveCues.ts` | Pure previous-state / next-state diff for gameplay-driven cue decisions |
| `src/audio/useAudio.ts` | Preact hook that owns one `AudioDirector` instance and exposes settings + actions |
| `src/audio/__tests__/deriveCues.test.ts` | Unit tests for exactly-once cue derivation and phase ownership |
| `src/ui/AudioControls.tsx` | Persistent mute + music/SFX controls |
| `src/styles/audio.css` | Global audio control layout and responsive styles |
| `src/assets/audio/**/*` | Two music loops and the full SFX pack checked into the repo |
| `tests/audio-smoke.spec.ts` | Browser smoke test for unlock, mute, and phase-track switching |

### Modified Files

| File | Changes |
| --- | --- |
| `src/app/App.tsx` | Create the audio director, unlock on first interaction, diff game state for cues, own phase music, mount `AudioControls` |
| `src/main.tsx` | Import `audio.css` |
| `src/ui/BarnGrid.tsx` | Reuse existing guest diff to fire per-animal entry audio |
| `src/ui/InspectorPanel.tsx` | Play confirm cues for invite / call-it-a-night / ability interactions |
| `src/ui/TradingPostScreen.tsx` | Play navigation cues for keyboard focus changes and wire shop actions into shared audio flow |
| `src/ui/ShopCard.tsx` | Hover / focus / press cue hooks |
| `src/ui/BarnUpgradeCard.tsx` | Hover / focus / press cue hooks |
| `src/ui/NightSummaryModal.tsx` | Trigger score flourish once at reveal start and add confirm cue on continue |
| `src/ui/WinScreen.tsx` | Confirm cue on `Play Again`; no local music ownership |
| `src/content/copy.ts` | Labels and helper text for the sound controls |

---

## Definition of Done

- The barn party track plays during both `night` and `night-summary`, the shop track plays during `shop`, and entering `win` stops looped music and plays the win fanfare once.
- All 19 animal types have distinct short entry sounds, including blue-ribbon animals, and rowdy chains correctly play one sound per actual entrant.
- Bust, scoring, purchase, and activate-ability sounds fire exactly once on successful trigger and never on no-op or disabled interactions.
- UI hover / focus / confirm sounds work across mouse, keyboard, and touch without noisy repetition.
- A global sound control surface is visible in every phase and exposes mute, music volume, and SFX volume.
- Audio failure is non-fatal: blocked autoplay, missing decode support, or muted state never breaks core gameplay.
- No new runtime dependency is added and `GameState` remains mechanics-only.
- Existing JS bundle budget still passes and the total compressed audio payload stays at or below 2 MB.
- `npm run test`, `npm run test:e2e`, `npm run build`, and `npm run check:bundle` all pass.

---

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Browser autoplay rules make the game appear “silent” on first load | High | Unlock on the first real user gesture, fail silent before unlock, and surface unlocked state for Playwright and manual QA |
| Cue duplication from state diffs and component mounts | High | Centralize gameplay cue derivation in `deriveCues.ts` and keep a single owner for every cue category |
| Audio pack grows too large for a casual GitHub Pages game | Medium | Hard-cap audio payload at 2 MB, keep SFX mono and short, and avoid unnecessary alternate takes |
| Hover/focus sounds become irritating during dense shop navigation | Medium | Throttle hover cues, suppress duplicates on same-element focus, and keep hover quieter than confirm |
| Loop behavior differs across browsers, especially Safari | Medium | Use an asset manifest with explicit music formats, test desktop + mobile browsers manually, and keep the music system simple |

---

## Dependencies

- Sprint 003’s current phase model and `App.tsx` transition ownership must remain stable; this sprint relies on those seams instead of reworking scene flow.
- `BarnGrid.tsx` guest-diff behavior must remain intact because it is the cleanest trigger point for entry audio.
- Final mastered audio assets must be available in-repo, trimmed, and named before Phase 2 closes. Placeholder clips can unblock wiring, but the sprint is not done until they are replaced.
- Manual validation on at least one Safari-family browser and one Chromium-family mobile browser is required; autoplay and loop behavior cannot be trusted from desktop Chrome alone.
