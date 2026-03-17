# Sprint 004 Critique: Claude Draft vs. Gemini Draft

Reviewed against:
- `docs/sprints/drafts/SPRINT-004-INTENT.md`
- `docs/sprints/drafts/SPRINT-004-CLAUDE-DRAFT.md`
- `docs/sprints/drafts/SPRINT-004-GEMINI-DRAFT.md`
- Current code shape in `src/config/*`, `src/scenes/*`, `index.html`, and existing tests

Sprint 004 is not just "make the canvas resize." The current implementation is hard-coded all over the place: fixed canvas dimensions in config, fixed layout helpers, and many Barn/Trading Post overlays positioned directly in scene code. Any draft that does not respect that blast radius is pretending the job is smaller than it is.

## Claude Draft

### 1) Strengths

- It is the more implementation-ready draft. The phase breakdown, file inventory, and test checklist are concrete enough that an engineer could start from it immediately.
- It understands the actual codebase better than Gemini in one important way: the fixed `390x844` assumptions are spread across config, layout helpers, scene rendering, generated textures, and tests. Claude names most of the right files.
- The choice to keep landscape phones on a rotate prompt is a real scope-control decision, not an accident. The sprint intent explicitly allows either a landscape layout or a rotate prompt, so this is defensible if the team wants the safer route.
- It is stronger on regression thinking than Gemini in a few practical areas: backward-compatibility checks at `390x844`, multi-viewport Playwright coverage, and explicit resize handling in scenes instead of only talking about CSS.
- The draft is disciplined about staying out of `src/game/` and treating this as a layout/rendering sprint, which matches the intent.
- It is more believable than Gemini on live resize handling. Repositioning existing objects is much more compatible with the current scene architecture than destroy-and-rebuild.

### 2) Weaknesses

- The desktop strategy is internally contradictory. The draft says the game should "fill 100% of the container" with `Scale.RESIZE`, then immediately proposes portrait-ish aspect ratio clamping via CSS. That reintroduces the exact problem the sprint is supposed to fix: a narrow game column floating inside a wide desktop browser.
- The Definition of Done makes that contradiction worse. "Canvas occupies at least 80% of viewport area" cannot coexist with a `3:4` max aspect clamp on `1920x1080`. That math simply does not work. This is the biggest flaw in the draft because it undermines the core sprint goal.
- The draft keeps saying "no massive black bars" while still allowing pillarboxing as a design principle. That is a partial mitigation, not a full response to "the game should take up the whole browser."
- The proportional-layout approach is too linear for the problem. Multiplying portrait coordinates by `cw/refW` and `ch/refH` may remove some clipping, but it does not truly reflow a dense mobile-first interface for desktop. It mostly stretches the same composition.
- Safe-area handling is undercooked. Phase 1 removes the existing CSS safe-area padding, but the replacement is mostly hand-wavy and falls back to constants like "30px bottom safe area." That is not robust across devices.
- The agent-browser story is inconsistent. The draft says "no new npm dependencies," then later suggests installing agent-browser as a dev dependency or using `npx`. Those are different operational choices and should not be blurred together.
- Texture handling is not resolved cleanly. The architecture section says the full-canvas plank background should regenerate on resize, while later phases lean back toward reference-sized textures plus `setDisplaySize()`. That is a real implementation fork, not a minor detail.
- It understates how much hard-coded geometry lives outside `barnLayout.ts`. The current `BarnScene` has many overlay and modal positions still tied directly to `LAYOUT.CANVAS.WIDTH/HEIGHT`. Claude mentions overlays, but its architecture still reads as if converting layout helpers is most of the work. It is not.
- The rotate prompt is acceptable by intent, but it is still a strategic surrender. If that is the choice, the draft should say plainly that it is buying schedule safety by not delivering usable phone landscape gameplay.

### 3) Gaps In Risk Analysis

- No explicit risk that the current hard-coded overlays in `BarnScene` are the real migration trap, not the basic slot layout.
- No explicit risk for safe-area regressions after removing the existing `env(safe-area-inset-bottom)` padding from `index.html`.
- No explicit risk for pointer/input bugs when a DOM rotate overlay sits above a still-running Phaser canvas. If the overlay does not fully suppress interaction, users can tap "through" it.
- No explicit risk for scene-state preservation when resize occurs during long-press info-panel interaction, ability overlay flow, bust overlay, or win overlay.
- No explicit risk for screenshot-test flakiness on an animated Phaser canvas. "Capture screenshots" is not the hard part; stabilizing them is.
- No explicit risk that backward-compatibility within `2px` could block better layout fixes. That item is a constraint disguised as validation.
- No explicit risk for mobile browser chrome changes (`dvh` changes as the address bar collapses/expands), which is one of the common ways "it looked fine in DevTools" turns into "it clips on a real phone."

### 4) Missing Edge Cases

- Rotate the device while an info panel, ability prompt, summary overlay, bust overlay, or win overlay is visible.
- Resume directly into BarnScene with a partially completed night on a non-reference viewport, instead of only testing fresh loads.
- Capacity `8` with long animal names, noisy badges, and Legendary glow all present at once.
- Trading Post after tab switching on a resized viewport, especially when moving between portrait and wide desktop.
- Landscape tablet vs. landscape phone boundary behavior. The draft defines a threshold, but the acceptance criteria do not test awkward mid-range devices or split-screen windows.
- Real safe-area devices: notched iPhones, home-indicator overlap, and top inset collision with the resource banner.
- Browser zoom / high-DPI rendering quality. The draft talks about pixel art and `roundPixels`, but not about how it looks on Retina-class displays at large desktop sizes.

### 5) Definition Of Done Completeness

- The DoD is detailed, but not consistently aligned with the sprint intent.
- The desktop acceptance criteria are the clearest problem. "At least 80% of the viewport area" and "no black bars wider than aspect-ratio pillarboxing" are not the same as "game should take up the whole browser."
- The DoD never explicitly proves Trading Post cleanliness across the same viewport matrix with the same rigor it applies to Barn.
- The DoD does not require verification of overlay-heavy states: info panel open, ability overlay open, bust summary, win screen. Those are exactly where clipping bugs tend to hide.
- It mentions safe-area handling in the success criteria but does not make safe-area validation a first-class, measurable DoD item.
- The backward-compatibility clause is useful as a guardrail, but it is over-weighted relative to user-visible outcomes. Matching the old layout within `2px` is less important than actually fixing desktop and phone behavior.
- The agent-browser proof requirement is present, but the specific states are still too shallow. A single empty barn screenshot per viewport is not enough to prove "no clipping/overlap."

### 6) Verdict

- Claude is the more executable draft.
- It is also too willing to compromise away the hardest part of the user ask: making desktop actually use desktop space.
- If adopted, it needs one major correction: stop pretending portrait aspect clamping is compatible with "take up the whole browser." Either embrace a wider desktop layout or state explicitly that desktop will remain a centered content column.

## Gemini Draft

### 1) Strengths

- It is much more honest about the core problem. The draft correctly argues that `FIT` on a portrait canvas will always produce a narrow strip on desktop, and that merely changing the base resolution does not solve that.
- Its architectural thesis is stronger than Claude's. `Scale.RESIZE` plus dynamic layout is the right family of solution if the product really wants desktop to feel native instead of merely less broken.
- It is better aligned with the spirit of the user request on landscape. Rather than hiding behind a rotate prompt, it treats landscape as a real supported mode.
- It has the better opinion on agent-browser. Manual verification as an external tool is cleaner and more compatible with the "no new npm dependencies" constraint than trying to half-install it into the project.
- It raises some genuinely useful design questions Claude mostly skips: ultrawide capping, snapped vs. continuous slot scaling, and high-DPI texture behavior.
- It correctly recognizes that simple coordinate scaling is not enough on wide screens; some parts of the interface need genuine reorganization.

### 2) Weaknesses

- It is over-scoped. A true desktop-responsive layout, a true phone-landscape layout, a Trading Post grid redesign, a new `LayoutContext` abstraction, resize rebuild logic, new Playwright screenshot coverage, and manual agent-browser verification is not a "polish" sprint anymore. It is a UI systems rewrite.
- The draft talks tough about "no black bars anywhere" and "use the full width," then backpedals later. The open questions propose capping on large monitors and even preserving a portrait-column layout beyond a threshold. That is a direct contradiction of the opening thesis.
- The landscape plan is ambitious but not grounded enough in the actual scene density. A `20/60/20` split on `667x375` gives very little room for sidebars once padding, text, buttons, badges, and the farmhouse are all accounted for.
- The draft is too casual about destroy-and-rebuild on resize. In the current `BarnScene`, that is not "simpler"; it is a magnet for state bugs. The scene has long-press timers, overlays, animation flags, card containers, and interactive objects. Recreating all of that safely is harder than the draft admits.
- It underestimates the number of special-case overlays that need layout logic. The main barn grid is only part of the problem. Info panels, boot/fetch overlays, summary views, and the win overlay all need a landscape story too.
- The Playwright screenshot plan is under-specified for an animated canvas. "Capture screenshots and diff them" sounds rigorous, but without freezing animation, seeded deterministic states, and stable wait points, it becomes brittle fast.
- The draft sometimes treats responsive layout as though proportional font scaling solves readability. It does not. Phaser text, badge placement, wrapping, truncation, and display-size scaling all interact in ugly ways on small screens.
- It is architecturally cleaner than Claude, but much less sprint-safe. There is a high chance this plan turns into a long-running refactor with unfinished edge states.

### 3) Gaps In Risk Analysis

- No explicit risk for the breadth of overlay/layout rewrite beyond the main barn and Trading Post surfaces.
- No explicit risk for destroy-and-rebuild causing leaked listeners, duplicated interactivity, broken timers, or lost animation state.
- No explicit risk for Playwright screenshot instability on animated Phaser scenes.
- No explicit risk for landscape UX failure. "Landscape is usable" is the hardest product promise in the draft, but the risk table treats it as mostly a design exercise.
- No explicit risk for safe-area behavior and mobile browser UI changes under `100dvh`/RESIZE behavior.
- No explicit risk for test rewrite cost. Existing layout tests are built around fixed dimensions, and this sprint would force a significant rewrite of what "correct" means.
- No explicit risk for texture quality on very large desktop canvases if the game truly scales across the whole browser.
- No explicit risk for narrow desktop windows, split-screen desktop apps, or tablet landscape where orientation and size-class rules blur together.

### 4) Missing Edge Cases

- Resize or rotate while an overlay is open: info panel, ability picker, boot target picker, fetch list, bust screen, summary, or win overlay.
- Landscape Trading Post after tab switching, capacity button updates, and shop regeneration.
- Capacity `7` and `8` in landscape with the full HUD visible, not just a couple of empty slots.
- Real-device browser chrome shifts on mobile, especially when the address bar collapses or reappears.
- Tablet landscape and desktop narrow-window cases. The draft focuses on canonical viewports but not the awkward in-between shapes users actually hit.
- Retained interaction state across rebuild: hovered/pressed buttons, focused overlay choice, pending long-press, ongoing tween.
- Very wide monitors and 4K displays. The draft raises the question, but the actual acceptance criteria never pin down what happens.

### 5) Definition Of Done Completeness

- The DoD is stronger than Claude's on product ambition, but weaker on implementation realism.
- It clearly states the right headline outcomes: desktop uses available space, phone portrait works, phone landscape is usable, no clipping, multi-viewport verification. That part is good.
- It does not define landscape completeness deeply enough. "Usable" is too vague unless the DoD names the actual states that must work in landscape: empty barn, populated barn, info panel, ability choice, Trading Post.
- It does not include a measurable policy for very large desktop monitors even though the draft itself raises the issue.
- It does not elevate safe-area verification into the DoD, despite the sprint intent calling it out.
- It does not explicitly require seeded or deterministic visual verification for the crowded states most likely to fail.
- It does not require parity checks for non-responsive behavior. A sprint this invasive should explicitly say that normal portrait gameplay remains behaviorally unchanged aside from layout.
- It is missing a guardrail around scope. There is no "minimum acceptable fallback" if the landscape redesign proves too expensive. That makes the DoD binary in the riskiest area.

### 6) Verdict

- Gemini has the better product instinct. If the user literally means "desktop should take up the whole browser," Gemini is arguing for the right class of solution.
- It is also the riskier draft by a wide margin. The landscape-first ambition and rebuild strategy turn the sprint into a much larger systems rewrite than the document admits.
- If adopted, it needs one major correction: stop smuggling contradictory fallbacks into the open questions. Either commit to real wide-screen usage or explicitly define where the layout caps and why.

## Comparative Judgment

- **Claude is stronger on execution discipline.** It is closer to something a team could deliver in one sprint without losing the plot.
- **Gemini is stronger on product honesty.** It is much less willing to paper over the desktop problem with a nicer version of the same portrait constraint.
- **Claude undershoots the ask.** It solves responsiveness as "less clipping plus a rotate prompt plus narrower bars."
- **Gemini overshoots the sprint.** It solves responsiveness as "rethink the layout system for every orientation and viewport class."

If I had to merge them, I would take:
- Gemini's refusal to accept portrait-column desktop as a real fix
- Claude's more incremental scene-update strategy instead of destroy-and-rebuild
- Gemini's external/manual stance on agent-browser
- Claude's more concrete viewport matrix and regression checklist

What the merged sprint must lock down before implementation:
- The exact desktop policy: true wide layout vs. centered capped content area
- The exact landscape policy: real gameplay layout vs. explicit rotate prompt
- Safe-area handling in scene coordinates, not just CSS vibes
- Which overlay states must be verified visually, not just the empty/default screens
- How screenshots are stabilized for automation on an animated Phaser game

## Bottom Line

- Claude is the safer sprint plan, but it currently compromises too much on the core desktop requirement.
- Gemini is the more correct product plan, but it is too large and too internally conflicted to be a safe sprint as written.
- Neither draft is ready untouched.
- The best final sprint should be narrower than Gemini, bolder than Claude, and brutally explicit about where "responsive" means genuine reflow versus where it means a deliberate fallback.
