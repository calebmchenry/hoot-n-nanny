# Critique of Sprint 004 Drafts

This document provides a comparative critique of the two proposed drafts for Sprint 004 (Sound of the Barn), analyzing their strengths, weaknesses, risk assessments, edge cases, and Definition of Done (DoD) completeness. It concludes with recommendations for a final merged sprint plan.

## 1. Claude Draft (Procedural Audio)

### Strengths
* **Zero Asset Footprint:** Relying entirely on the Web Audio API for procedural generation means no `.mp3`, `.wav`, or `.ogg` files to download, keeping the bundle size virtually unchanged and avoiding network latency issues.
* **Detailed Audio Architecture:** The separation of the `AudioEngine` (singleton), `sounds.ts` (pure Web Audio generators), and `hooks.ts` (`useGameAudio`) is highly robust and idiomatic for a React/Preact application.
* **Browser Autoplay Handling:** The lazy `AudioContext` instantiation strategy on the first user gesture is well thought out and avoids intrusive UI modals.
* **Granular Control:** Procedural audio allows for dynamic runtime modifications (e.g., slight pitch variations on rapid triggers) easily without needing multiple asset variations.

### Weaknesses
* **High Implementation Risk for SFX:** Procedurally generating 19 distinct, instantly recognizable animal sounds (plus music) using raw oscillators is an incredibly specialized skill. It is highly probable that the sounds will be generic "beeps" and "boops" rather than thematic, polished audio.
* **Time Sink:** Tuning envelopes, filters, and oscillators manually in code to sound "good" is notoriously time-consuming and often leads to an endless tweaking loop.
* **Throwaway Work:** Suggests building a "dev-only sound palette page," which adds scope not strictly necessary for shipping the feature.

### Gaps in Risk Analysis
* The risk of "Procedural music sounds bad" is identified, but the mitigation ("fall back to simpler ambient textures") doesn't solve the core problem if the result still feels incongruous with the game's high visual polish. It also underestimates the difficulty of the 19 animal sounds.
* Doesn't fully address what happens if the device physically cannot output audio or if the Web Audio API is partially implemented/buggy on certain older browsers (though it mentions Safari inconsistencies).

### Missing Edge Cases
* Voice stealing / Polyphony limits: It mentions gating against >5 simultaneous sounds, but doesn't detail the drop strategy (e.g., drop oldest, drop quietest, prevent new).
* `AudioContext` suspension: Only mentions iOS tab switching, but OS-level interruptions (phone calls, alarms) can also suspend the context and require robust resume handling.

### Definition of Done Completeness
* **Excellent.** The DoD is comprehensive, split logically by Music, SFX, Controls, Browser Compliance, and Regression.

---

## 2. Codex Draft (Asset-Based Audio)

### Strengths
* **Guaranteed Audio Quality:** Using pre-rendered assets (`.wav`, `.mp3`, `.ogg`) ensures the final product sounds exactly as intended, matching the visual polish.
* **Predictable Delivery:** Removes the massive technical risk of trying to synthesize complex sounds (like a rooster crow or an acoustic guitar) in JavaScript.
* **Clean State Separation:** The introduction of `deriveCues.ts` to cleanly diff the `GameState` and emit semantic cues without muddying the reducer is a superb architectural decision.
* **Pragmatic Budgeting:** Establishing a hard 2MB compressed payload budget is a smart constraint to prevent asset bloat.

### Weaknesses
* **Sourcing Bottleneck:** The draft assumes the existence of the audio assets (`src/assets/audio/**/*`). Finding, editing, mastering, and licensing these assets is a significant hidden effort not accounted for in the phases.
* **Dual Format Complexity:** Shipping both `.mp3` and `.ogg` for music adds to the payload and build complexity. Modern browsers (including Safari 15+) broadly support AAC or MP3 well enough that a single format might suffice for a casual game.
* **Network Latency:** Assets must be downloaded. The draft doesn't address preload strategies or what happens if a sound is triggered before it has finished downloading.

### Gaps in Risk Analysis
* **Asset Sourcing:** Fails to identify the time and effort required to source and edit the sound effects and music tracks as a risk.
* **Network Failures:** No risk identified for slow networks where audio assets might stall or fail to load entirely, potentially causing unhandled promise rejections or silent failures during gameplay.

### Missing Edge Cases
* **Loading States:** What happens if the user clicks a button, but the `ui-confirm.wav` hasn't loaded yet? Is the action delayed, or does it happen silently?
* **Rapid Polyphony:** While it mentions a "Polyphony cap: 6", it doesn't specify how the `HTMLAudioElement` or Web Audio buffer source handles rapid re-triggering of the *same* asset (e.g., clicking 5 times fast).

### Definition of Done Completeness
* **Good, but less detailed.** It covers the core requirements and constraints but is less granular than Claude's DoD regarding specific edge cases (like the `prefers-reduced-motion` check).

---

## 3. Recommendations for the Final Merged Sprint

The final sprint should combine the architectural purity of Codex's state handling with a hybrid approach to audio generation to balance payload size and audio quality.

1. **Hybrid Audio Sourcing:**
   * **Assets for Complex Sounds:** Use audio files (`.mp3`/`.webm`) for music loops, the bust sequence, the win fanfare, and the 19 animal entries. These are too complex to synthesize well in JS.
   * **Procedural for UI/Simple SFX:** Synthesize simple UI clicks, hovers, and basic jingles using the Web Audio API (Claude's approach). This saves network requests and payload size for high-frequency sounds that only need to be simple "ticks" or "pops".

2. **Architecture:**
   * Adopt **Codex's `deriveCues.ts`** pattern. It is the cleanest way to map pure state transitions to side-effectful audio cues without polluting the reducer or React components.
   * Adopt **Claude's lazy `AudioContext` and gain node routing** as the core of the `AudioDirector`. Even for playing assets, routing them through a Web Audio `GainNode` is superior to managing multiple `HTMLAudioElement` volumes.

3. **Asset Management & Preloading:**
   * Implement the 2MB asset budget.
   * Add a specific phase or task for *Asset Sourcing & Mastering*.
   * Ensure the `AudioDirector` has a robust decoding strategy: load the asset via `fetch`, decode via `AudioContext.decodeAudioData`, and cache the buffer. If it's not cached when requested, fail silently rather than blocking the game.

4. **Polyphony and Ducking:**
   * Explicitly define the voice-stealing algorithm (e.g., oldest-voice-drops).
   * Implement Codex's ducking rules (e.g., bust cue ducks background music to 0.12).

5. **Controls:**
   * Use the shared UI controls approach (persistent top-right overlay). Persisting to `localStorage` (Claude's idea) is low-effort and high-value for user experience, so it should be included despite Codex's restriction.