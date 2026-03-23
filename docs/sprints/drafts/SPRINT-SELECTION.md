# Sprint 004 Selection — "Sound of the Barn"

## Selected Backlog Items

| # | Item | Priority |
|---|------|----------|
| 15 | Music — Barn Party Track | Medium |
| 16 | Music — Shop Track | Medium |
| 17 | SFX — Animal Entry Sounds | Medium |
| 18 | SFX — Bust | Medium |
| 19 | SFX — Scoring Jingle | Medium |
| 20 | SFX — Purchase | Medium |
| 21 | SFX — Activate Ability | Medium |
| 22 | SFX — Win Fanfare | Medium |
| 23 | SFX — UI Navigation | Medium |

## Rationale

### Why these nine items?

With Sprint 003 completing personality and animation polish, every remaining medium-priority item is audio. Items 15–23 are the entire audio layer of the game: two music tracks and seven sound effect categories. They are the last content work before shipping infrastructure and final QA.

### Why they belong together

**Single domain.** All nine items are audio. They share the same technical surface — an audio system for loading, playing, looping, and mixing sounds. Building that system once and populating it with all audio in one sprint avoids repeated setup and integration work.

**Consistent mix.** Music volume, SFX volume, and the interplay between them (e.g., the bust SFX cutting through the barn party track, the win fanfare replacing it) must be tuned holistically. Splitting audio across sprints would mean re-tuning the mix each time new sounds arrive.

**Tone coherence.** The GAME_DESIGN doc specifies a "retro + country" audio feel across all music and SFX. Producing everything together ensures a unified sonic identity — the chiptune hoedown loop, the fiddle scoring jingle, and the rooster bust sound all need to feel like they come from the same game.

**No external dependencies.** Audio is purely additive presentation work on top of the complete, polished game loop. It doesn't block or depend on any other remaining item.

**Completes medium priority.** After this sprint, all medium-priority backlog items are done. Only the two low-priority shipping items (CI/CD and Final QA) remain.

### What's excluded and why

- **GitHub Pages CI/CD (26):** Infrastructure, not gameplay content. Independent of audio work. Better as a small standalone task or bundled with Final QA.
- **Final QA & Ship Polish (27):** Explicitly a *final* pass. Should come after all content — including audio — is in place so the QA pass covers the complete game.

### What this sprint delivers

After this sprint:

1. An upbeat chiptune hoedown loop plays during the Hootenanny phase
2. A relaxed country/chiptune loop plays during the Shop phase
3. Each animal type has a unique entry sound when entering the barn
4. Busting triggers a record scratch / rooster crow sequence
5. Scoring has a celebratory fiddle flourish jingle
6. Shop purchases have a cash register / coin clink sound
7. Activate abilities have a subtle pluck or chime
8. Winning with 3 blue ribbons triggers a hoedown breakdown fanfare
9. UI navigation (hover, select, navigate) has soft click / wooden tap feedback
10. Volume controls or mute toggle let the player manage audio
11. The game has a complete, cohesive "retro + country" soundscape
