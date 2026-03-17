# Sprint 006 Merge Notes

## Draft Strengths
- **Claude**: Clean architecture, unicode escapes for safety, explicit cross-platform concern table, no-fallback simplicity argument
- **Codex**: Most concise. Platform-aware font stack (`Apple Color Emoji`, `Segoe UI Emoji`, `Noto Color Emoji`). Uses `createCanvas` + `refresh()` pattern. Conservative emoji choices (🤠 for StableHand, 🦆 for GoldenGoose)
- **Gemini**: 64x64 textures with LINEAR filtering (best quality), OffscreenCanvas with fallback, center-pixel-sample fallback detection, tier-colored letter fallback for missing emoji

## Key Decisions
- **64x64 + LINEAR filtering** (from Gemini, user confirmed)
- **🧑‍🌾 Farmer ZWJ** for StableHand (user confirmed, with letter fallback)
- **Fallback system**: center-pixel-sample detection + letter on colored circle (from Gemini)
- **Emoji map in separate file** `src/config/emojiMap.ts` (from Claude/Gemini)
- **Platform-aware font stack** (from Codex)
- **🪿 for GoldenGoose** (from Claude/Gemini, with fallback protection)

## Critiques Skipped
Given the small scope and low uncertainty, cross-critiques were skipped in favor of direct merge.
