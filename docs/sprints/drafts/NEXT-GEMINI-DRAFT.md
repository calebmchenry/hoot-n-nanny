# Sprint 004 — "Sound of the Barn"

## Overview
This sprint implements the entire audio layer of Hoot N' Nanny, covering all remaining medium-priority backlog items (15–23). By tackling all audio at once, we ensure a cohesive "retro + country" sonic identity, establish a single unified audio architecture, and balance the mix holistically. This is the final content-focused sprint before we move into shipping infrastructure and final QA.

## Architecture & Technical Direction
**Opinionated Stack:** To adhere to the strict "lightweight frontend stack" and "reasonable bundle budget" constraints outlined in the Project Intent, **we will use procedural audio generation instead of importing bulky MP3/WAV files.** 
- We will use [ZzFX](https://github.com/KilledByAPixel/ZzFX) for all Sound Effects (SFX). It's a tiny (~1KB) micro audio synthesizer perfect for retro/chiptune sounds.
- We will use [ZzFXM](https://github.com/keithclark/ZzFXM) for the music tracks. It allows us to sequence chiptune music in code, keeping the bundle size microscopically small while perfectly hitting the required "chiptune hoedown" aesthetic.

**Core Audio Engine (`src/audio/engine.ts`):** 
A singleton or context-provided audio manager that wraps ZzFX/ZzFXM. It will handle:
- Global mute state and volume control.
- Crossfading/switching between the Barn Party and Shop music tracks.
- Playing transient SFX with slight pitch variations (especially for animal entries) to prevent auditory fatigue.
- Handling browser autoplay policies (waiting for the first user interaction before initializing the `AudioContext`).

## Implementation Phases

### Phase 1: Audio Engine & Asset Definition
1. Integrate ZzFX and ZzFXM into the project.
2. Create `src/audio/engine.ts` to manage the `AudioContext`, track playing state, and expose `playSfx(id)` and `playMusic(trackId)` functions.
3. Create `src/audio/assets.ts` to define the ZzFX sound parameter arrays (the "instruments" and SFX) and the ZzFXM song arrays. 
   - *Drafting the actual arrays will require some trial and error in the ZzFX tracker during implementation to hit the "country/chiptune" vibe.*

### Phase 2: System SFX Integration
Wire up the non-gameplay UI sounds.
- **Item 23 (UI Navigation):** Add soft clicks to `useControls.ts` (keyboard) and UI button `onClick`/`onPointerEnter` handlers.
- **Item 20 (Purchase):** Trigger a coin clink/cha-ching in `ShopCard.tsx` or the shop action handler.
- **Volume UI:** Add a mute toggle button to the `StatusBar.tsx`.

### Phase 3: Gameplay SFX Integration
Wire up sounds tied to the game loop and state changes.
- **Item 17 (Animal Entry):** Trigger unique short blips when an animal is added to the barn grid.
- **Item 21 (Activate Ability):** Trigger a chime when an active ability is used.
- **Item 18 (Bust):** Trigger a dissonant scratch + rooster crow sequence when the bust state is derived.
- **Item 19 (Scoring Jingle):** Trigger a celebratory flourish during the scoring phase sequence.
- **Item 22 (Win Fanfare):** Trigger a major breakdown tune when the WinScreen mounts.

### Phase 4: Music Tracks
- **Item 15 & 16 (Barn Party & Shop Tracks):** Wire up the phase transition logic (likely in `App.tsx` or `PhaseTransitionCurtain.tsx`) to switch the active ZzFXM loop based on the current game phase.

## Files Summary
- **`src/audio/engine.ts`** (New): Core Web Audio API manager.
- **`src/audio/assets.ts`** (New): ZzFX/ZzFXM definitions for all sounds.
- **`src/audio/zzfx.ts` / `zzfxm.ts`** (New): The micro-libraries themselves (or added via npm if preferred, though raw files are often smaller).
- **`src/ui/StatusBar.tsx`** (Update): Add mute/volume controls.
- **`src/app/App.tsx`** (Update): Handle music track switching based on phase.
- **`src/game/engine.ts` & Various UI Components** (Update): Dispatch SFX calls on state changes/interactions.

## Definition of Done
- [ ] An upbeat chiptune hoedown loop plays during the Hootenanny phase.
- [ ] A relaxed country/chiptune loop plays during the Shop phase.
- [ ] Unique entry sounds play for different animal types.
- [ ] Busting triggers a distinct audio sequence (scratch + crow).
- [ ] Scoring triggers a celebratory jingle.
- [ ] Purchasing in the shop triggers a cash/clink sound.
- [ ] Activating abilities triggers a subtle chime.
- [ ] Winning triggers a major fanfare.
- [ ] UI navigation (hover, click) has soft audio feedback.
- [ ] A mute button exists and successfully silences all audio.
- [ ] Audio system respects browser autoplay policies (no errors on initial load before interaction).
- [ ] Bundle size impact is minimal (ideally < 15KB total for all audio).

## Risks
- **Autoplay Policies:** Browsers aggressively block audio until the user interacts with the page. We must ensure the audio engine gracefully waits for the first click/keypress before attempting to play the music or SFX.
- **Mixing/Levels:** Procedural audio can be piercing. We need to carefully tune the volume of SFX relative to the music to avoid listener fatigue.
- **Aesthetic Alignment:** Generating "country" sounding music purely via a chiptune tracker (ZzFXM) requires some musical sequencing skill. If it proves too difficult to get right quickly, we may need to pivot back to highly compressed, externally produced OGG files as a fallback.

## Dependencies
- All visual and mechanical implementations from Sprint 001-003 must be stable. Audio integration touches almost every file, so a stable foundation is required to avoid merge conflicts or wiring sounds to changing logic.
