# Sprint 003 Draft — Personality & Polish

## Overview
This sprint tackles Backlog Items #24 (Humor & Personality Pass) and #25 (Animation Polish). The core gameplay loop is complete; now the goal is to elevate Hoot N' Nanny from a functional prototype into a charming, lively experience. By the end of this sprint, the game will feature witty flavor text, satisfying animations for phase transitions, snappy UI juice, and an overarching warm, goofy tone that matches the design intent.

## Architecture
Since this is a polish and content sprint on an existing React/TypeScript codebase, architectural changes are minimal. The work is divided into data enrichment and presentation layer updates:
1. **Data Layer**: Expanding the core game catalog (`Animal`, `Power`) to include descriptive text strings.
2. **Component Layer**: Updating UI components to surface the new text and integrating animation hooks or class toggles.
3. **Styling Layer**: Adding robust CSS keyframes and transitions. To adhere to the strict "lightweight frontend" constraints outlined in `INTENT.md`, we will avoid heavy animation libraries (like Framer Motion) and rely purely on Vanilla CSS transitions and keyframe animations.

## Implementation Phases

### Phase 1: The Voice (Data & UI Text)
- **Data Model Update**: Modify `src/game/types.ts` to add `flavorText` and `wittyDescription` fields to the `Animal` and `Power` types.
- **Content Injection**: Update `src/game/catalog.ts` to include goofy, warm, and scrappy flavor text for every animal and power (e.g., "Goat: Eats tin cans, screams at clouds.", "Noisy: Three strikes and the farmer wakes up.").
- **UI Integration**: Update `src/ui/ShopInspector.tsx` and `src/ui/InspectorPanel.tsx` to render these new text fields with appropriate typography and spacing, ensuring they don't clutter the essential gameplay information.

### Phase 2: Core Gameplay Juice (Animations)
- **Animal Entry**: Update `src/ui/AnimalSprite.tsx` and associated CSS to animate animals entering the barn. They should use a satisfying "pop" (scale overshoot) or "drop-in" keyframe animation rather than just appearing.
- **Scoring Tally**: Enhance `src/ui/NightSummaryModal.tsx` and `src/ui/StatusBar.tsx` to animate the Pop and Cash numbers ticking up during scoring, rather than jumping instantly to the final value.
- **Capacity Warnings**: Implement the design requirement where unused activate abilities "flash tastefully" when the barn is at capacity to remind the player they have options before calling it a night.

### Phase 3: Flow & Feedback (Transitions)
- **Phase Transitions**: Smooth out the harsh cuts between game phases (Hootenanny → Night Summary → Shop → Hootenanny) with simple CSS fade-ins and fade-outs.
- **Interaction Feedback**: Audit all clickable elements (shop cards, barn slots, buttons). Ensure every interactive element has a clear hover state (e.g., slight scale up, brightness increase) and an active/click state (e.g., scale down "depress" effect).

## Files Summary
- **Data**: `src/game/types.ts`, `src/game/catalog.ts`
- **Components**: `src/ui/ShopInspector.tsx`, `src/ui/InspectorPanel.tsx`, `src/ui/AnimalSprite.tsx`, `src/ui/NightSummaryModal.tsx`, `src/ui/StatusBar.tsx`
- **Styles**: `src/styles/app.css`, `src/styles/shop.css`, `src/styles/win.css` (plus any component-specific CSS)

## Definition of Done
- All animals and powers in the catalog have unique, tone-appropriate flavor text.
- Flavor text is visible in the Shop and Barn inspector panels without breaking layouts.
- Animals entering the barn play a distinct entry animation.
- Score tallies count up dynamically during the scoring phase.
- Transitions between game phases are animated (no jarring cuts).
- All interactive UI elements have visible hover and active states.
- The game's bundle size remains small (no heavy external animation libraries added).

## Risks
- **Scope Creep on Polish**: "Juice" can be an endless rabbit hole. We must timebox animation tweaking to prevent the sprint from dragging on.
- **Layout Breakage**: Adding new text to the UI could overflow or break responsive layouts on mobile. We must test text lengths and ensure text wrapping/truncation is handled gracefully.
- **Animation Performance**: CSS animations on many elements (like a full barn) could cause jank on lower-end devices. We will stick to hardware-accelerated CSS properties (`transform`, `opacity`).

## Dependencies
- Assumes Sprint 002 (Core loop, shop, win condition) is fully complete and stable.
- Relies purely on existing sprites/fonts; no new external assets required.
