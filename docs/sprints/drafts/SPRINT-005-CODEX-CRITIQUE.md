# Sprint 005 Critique: Claude Draft vs. Gemini Draft

Reviewed against:
- `docs/sprints/drafts/SPRINT-005-INTENT.md`
- `docs/sprints/drafts/SPRINT-005-CLAUDE-DRAFT.md`
- `docs/sprints/drafts/SPRINT-005-GEMINI-DRAFT.md`
- Current rendering code in `src/scenes/BootScene.ts`, `src/scenes/BarnScene.ts`, `src/scenes/TradingPostScene.ts`, `src/config/constants.ts`, and `src/scenes/barnLayout.ts`
- Current baseline screenshots in `artifacts/visual/sprint-004-before/`

This sprint is not about "add more effects." It is about making the game look authored.

Right now the ugliness comes from five things:
- Flat materials everywhere
- Placeholder typography everywhere
- Dead overlays and weak scene transitions
- Almost no depth, lighting, or atmosphere
- Weak composition in the always-visible HUD and action areas

Any draft that only improves one or two of those will make the game nicer, but not beautiful.

## Claude Draft

### 1) Strengths

- Claude is the draft most likely to produce a dramatic before/after screenshot. It attacks the actual visual surfaces the player stares at: barn wall, straw floor, cards, deck back, farmhouse, overlays, and Trading Post background.
- It is much better aligned with the intent's ambition. The intent asks for a full beauty pass across texture, particles, animation, scene transitions, depth, overlays, and Trading Post atmosphere. Claude tries to cover almost all of that.
- It understands the current codebase shape reasonably well. The biggest visual work really does live in `BootScene.ts` and the scene render code, and Claude keeps most of the blast radius there instead of pretending this is a gameplay or layout-helper sprint.
- It is strong on atmosphere, not just ornament. The sunset/plum palette additions, vignette, dust motes, warm shadows, and wood-panel overlays all push the game toward a mood instead of just "more detailed rectangles."
- It is the better draft on hero moments. Legendary cards, busts, warning escalation, night summary, card landing, and scene transitions all get bespoke treatment. That matters because beauty is judged most harshly in moments of drama.
- It gives the Trading Post a real visual identity. That is important. The current shop is just a brown field with functional cards. Claude at least tries to make it feel like a place.
- Its Definition of Done is much closer to a visual checklist than Gemini's. It names actual visible outcomes instead of only infrastructure changes.
- It correctly assumes depth layering must become explicit. The current `BarnScene.ts` relies heavily on creation order, and that will become fragile the moment shadows, particles, vignette, and themed overlays are added.

### 2) Weaknesses

- Claude is too additive. It reads like "add every nice thing" rather than "choose the few things that create a coherent art direction." Grain, knots, highlights, noise, shadow textures, vignette, dust, spark bursts, shimmer, slot flash, deck float, radial long-press fill, themed overlays, and celebration particles can absolutely tip from beautiful into cluttered.
- The biggest strategic miss is typography. The intent explicitly calls out a bitmap font upgrade. The current screenshots make it obvious that the white monospace text is part of the game's prototype feel. Claude's draft treats typography as an open question and even recommends deferring it to Sprint 006. That is not good enough.
- The Definition of Done exposes that miss. It has visual acceptance criteria for wood grain, straw, particles, vignette, overlays, and Trading Post texture, but no requirement that the monospace text be replaced. That means the sprint could "pass" while still looking like Courier pasted on top of fancy backgrounds.
- Claude spends much more energy on surface detail than on composition. The current desktop screenshot has a lot of dead red wall. More wood grain helps, but it does not fully solve that emptiness. The draft needs more explicit thought about focal hierarchy, shadow pools, and how to make the center of the barn feel intentionally framed rather than merely textured.
- The always-visible HUD is under-designed in the plan. In the current screenshots, the top band and the text distribution across it are among the ugliest parts of the game. Claude beautifies the scene behind the HUD but does not seriously redesign the HUD itself.
- The overlay plan is still too skin-deep. Swapping black rectangles for wood texture is directionally right, but it does not by itself make the bust, summary, or win states beautiful. Those screens also need stronger typographic hierarchy, spacing, and information grouping.
- Some effects feel like low-value scope compared with the real ugliness. Long-press radial fill, card touch feedback, and extra burst particles are polish-on-polish. They are not what will rescue the current top-to-bottom visual identity.
- Claude is optimistic about tuning. Procedural texture quality is not just an implementation problem; it is an art-direction problem. You can spend a lot of time drawing "detail" and still land on muddy, synthetic, overworked materials.
- The open questions show the plan is not actually resolved on important issues: vignette layer ordering, Trading Post parity, typography scope, and cut order. For a sprint this large, that ambiguity matters.

### 3) Gaps In Risk Analysis

- No explicit risk that the game becomes visually noisy instead of beautiful. Claude mentions texture busyness, but not the cumulative effect of textures plus particles plus shimmer plus flashes plus vignette plus overlay strips all competing for attention.
- No explicit risk that the top HUD remains ugly even if the environment becomes much richer. This is a real danger in the current code because the HUD is mostly plain text sitting over a dark band.
- No explicit risk that overlay readability gets worse once wood texture, vignette, particle celebration, and decorative strips are layered under dense score text.
- No explicit risk that full-screen procedural materials may look good at phone size and repetitive or artificial at desktop size. This matters because the intent explicitly requires desktop screenshots.
- No explicit risk that Barn and Trading Post end up looking like the same wood texture with different tints. The sprint needs related scenes, not duplicate ones.
- No explicit risk that beauty tuning needs iterative review states, not just final screenshots. A sprint like this needs repeated visual checkpoints after each major pass.
- No explicit risk for text overflow once more decorative framing is added. Current code already has long strings like `Penned: ...`, multi-line summary rows, and ability/info panel text.
- No explicit risk that new shadow images, particle emitters, and overlay textures complicate resize behavior and cleanup in scenes that already juggle overlays, long-press state, and animation flags.

### 4) Missing Edge Cases

- Warning state with all three noise dots filled, noisy cards in the barn, farmhouse glow active, and the deck nearly empty. That is one of the most important mood states in the whole game.
- Bust flow from animation into bust overlay into summary overlay. Claude beautifies all three pieces but does not require proving they work together as one sequence.
- Night summary with a long score list, bonus lines, unpaid hay, and multiple penned-up cards. The current summary is text-heavy; a wood texture behind it is not enough unless spacing still holds.
- Win overlay. The current win screen is a full-screen black panel. Claude mentions win overlay theming in tasks, but it is not a first-class visual proof target in the verification story.
- Trading Post legendary tab with low affordability, long animal names, stock indicators, and tab switching. Beauty has to survive the busiest shop state, not just the empty/default one.
- Barn capacity 8 with long names, noisy stripes, legendary treatment, and manual-ability chips all visible at once.
- Phone portrait and desktop should both be checked in sparse and crowded states. A nearly empty barn and a packed late-night barn fail in different ways.
- Info panel state. Claude focuses on bust and summary overlays, but the info panel is also part of the user's visual experience and currently text-heavy.
- Contrast edge cases: red/orange effects over terracotta/noisy cards, gold sparkle over parchment, button labels over textured painted wood.

### 5) Definition Of Done Completeness

- Claude's DoD is the more complete one on raw feature coverage. It includes textures, particles, transitions, depth, overlays, Trading Post background, tests, and screenshots.
- It is still missing one essential beauty criterion: typography. For this sprint, that omission is too big to ignore.
- It does not require the HUD/header to look materially better. That is a major completeness gap because the top of the screen is visible in every single screenshot.
- It does not require hero-state screenshots beyond generic viewport coverage. The DoD should require at least: Barn idle, warning state, legendary card state, bust or summary overlay, and Trading Post.
- It does not include an explicit "no obvious tiling / no over-textured noise" criterion. Procedural detail can meet the task list and still fail aesthetically.
- It does not include the info panel or win overlay as acceptance targets, even though those are real user-visible surfaces in the current code.
- It is too feature-checklist oriented and not enough art-direction oriented. "Has dust motes" is not the same thing as "the barn feels warm, legible, and composed."

### 6) Verdict

- Claude is the better "make it beautiful" draft.
- It is the only one that consistently aims at atmosphere, materials, scene identity, and emotional beats rather than just cleanliness.
- It still needs a hard editorial pass before implementation:
  - Typography must become mandatory, not optional.
  - Some lower-value FX should be cut so the scene does not become a Christmas tree.
  - The HUD/header and overlay hierarchy need to be treated as first-class visual work, not leftovers.
- As written, Claude risks turning the game from flat-and-ugly into busy-and-ambitious. That is still closer to the brief than Gemini, but it is not yet disciplined enough.

## Gemini Draft

### 1) Strengths

- Gemini has the better sense of leverage. It correctly identifies the current monospace text as a core part of the prototype look and argues that typography is not a cosmetic afterthought.
- The draft is more disciplined about scope. It explicitly prioritizes what it thinks gives the biggest return and cuts several lower-priority categories instead of pretending everything can ship at full depth.
- It is more restrained in tone than Claude. Phrases like "the grain should be felt, not seen" are the right instinct. Beauty often comes from controlled subtlety, not maximum detail.
- The texture ideas it does keep are generally solid: beveled planks, textured straw, paper grain, farmhouse detail, deck-back ornament, vignette, and card shadows are all high-value improvements.
- It understands that the current text system is spread through both scenes and some layout helpers, so the font work is not just a one-file tweak.
- It is more likely to ship a stable sprint than Claude because it cuts scope early instead of carrying every requested category to the end.
- Its DoD is better than Claude's on one important point: it explicitly requires removal of the monospace text in scene files.

### 2) Weaknesses

- Gemini overcorrects toward typography. Replacing the font matters, but it is not the single most impactful change in this sprint. The baseline screenshots are ugly because the entire scene is flat, dead, and under-composed. A different font alone will not make that barn beautiful.
- The actual font proposal is aesthetically weak. A generic 5x7 ASCII bitmap font is a compliance answer to "bitmap font," not a strong art-direction answer. It risks making the game look more retro, but not more premium, cozy, or distinctive.
- The draft cuts exactly the moments where polish becomes memorable: legendary shimmer, bust sparks, celebration particles, themed overlays, and richer micro-interactions. Those are not frivolous here; they are part of what makes the game feel alive and authored.
- Saying "overlays work fine as dark panels" is simply the wrong bar for this sprint. The current bust, summary, and win overlays are some of the ugliest states in the game. Deferring them undermines the beauty brief.
- Trading Post parity is too weak. Gemini itself admits the draft does not give the Trading Post texture or particle treatment. That means the sprint can ship with the barn improved and the shop still feeling second-rate.
- The draft is shakier on the current codebase than Claude. It proposes updating the window-glow tween even though `BarnScene.ts` already uses `Sine.easeInOut` and the `0.3 -> 0.8` range. It also talks about `scaledFont()` as if it may return a style object, but it already returns a number. Those are small tells, but they matter.
- The BitmapText migration is underspecified relative to the actual UI. Current scenes use word wrap, multi-line text, mixed colors, stock labels, summary rows, and info panel copy. Gemini acknowledges the word-wrap issue, then hand-waves toward CSS `@font-face`, which is not a clean fit with the sprint constraints and current architecture.
- The draft does not do enough for the always-visible HUD and action areas. Better text helps, but the current top band and bottom button zone also need stronger framing and hierarchy.
- Because it cuts overlays and reduces FX so aggressively, Gemini can succeed on its own DoD and still leave the game looking like "cleaner prototype" rather than "beautiful game."

### 3) Gaps In Risk Analysis

- No explicit risk that the chosen 5x7 font is too crude to feel beautiful. The risk table talks about blur and technical rendering, but not aesthetic fit or readability tone.
- No explicit risk that BitmapText conversion explodes the complexity of summary, info panel, and shop-card layouts that currently rely on Phaser text behavior.
- No explicit risk that mixed typography systems will look inconsistent if some screens remain `Text` and others move to `BitmapText`.
- No explicit risk that deferring overlays and Trading Post texture leaves the sprint visually incomplete even if all planned tasks ship.
- No explicit risk that reducing particles and dramatic FX makes legendary, bust, and summary moments feel emotionally flat.
- No explicit risk that the HUD/header still looks unfinished after the font pass.
- No explicit risk that a minimal retro font can clash with the desired warm rustic tone by reading more arcade than farm-card game.
- No explicit risk that desktop screenshots will still feel empty because composition barely changes even if materials and type improve.

### 4) Missing Edge Cases

- Info panel with long ability text and wrapped copy. This is the exact kind of surface that becomes painful under a BitmapText-first plan.
- Summary overlay with many lines, bonus/penalty rows, unpaid hay, and penned-up notifications. Gemini deprioritizes overlay design, but those states still have to look good.
- Win overlay. If the barn gets nicer cards and fonts but the win screen remains a plain black presentation, the game still does not feel beautiful end to end.
- Warning and bust states. The draft trims the bespoke effects for those moments, but that means it never proves the most dramatic gameplay state feels visually special.
- Trading Post legendary tab, low-affordability state, and long-name cards. If beauty is supposed to reach the whole game, the shop cannot be a partial afterthought.
- Desktop wide-barn composition. Gemini does not do enough to prove that the larger canvas feels atmospheric rather than merely larger.
- HUD overflow cases: long `Penned:` strings, dense counters, and small-height viewports where the font hierarchy may crowd the top.
- Mixed-font edge cases if not every text object can realistically become BitmapText.

### 5) Definition Of Done Completeness

- Gemini's DoD is strong on typography and basic polish infrastructure. If the sprint were "make the UI feel cleaner and more cohesive," it would be respectable.
- It is weaker than Claude's DoD on beauty completeness. It omits improved overlays, reduced several particle categories, de-emphasizes Trading Post atmosphere, and drops some of the most emotionally visible visual moments.
- It does not require a beautiful solution for bust, summary, or win screens, which is a major hole in a visual polish sprint.
- It does not require Trading Post parity beyond text and transitions, even though the current shop is visually underdeveloped.
- It does not require hero-state screenshots. As with Claude, generic viewport captures are not enough, but Gemini's narrowed scope makes this more dangerous because the draft can "pass" on the barn's quiet state while failing all the dramatic ones.
- It does not require the HUD/header to be reworked beyond typography.
- It does not include an aesthetic quality bar for the font choice itself. "All monospace removed" is measurable, but it does not guarantee the replacement is actually attractive.
- It is, fundamentally, a complete DoD for a partial beauty sprint.

### 6) Verdict

- Gemini is the better draft if the only goal is to reduce risk and ship something cleaner.
- It is not the better draft if the goal is to make the game beautiful.
- The likely outcome of Gemini's plan is a game that is more cohesive, more readable, and more polished than today, but still not lush, atmospheric, or memorable enough to satisfy the brief.
- To get there, Gemini would need major additions:
  - A more distinctive typography plan than a generic 5x7 font
  - Real overlay theming
  - Stronger legendary, bust, and summary presentation
  - A more serious Trading Post material pass

## Comparative Judgment

- Claude has the better beauty instinct.
- Gemini has the better scope instinct.
- Claude is trying to make the game feel transformed.
- Gemini is trying to make the game feel cleaned up.

For this specific sprint, cleaned up is not enough.

The brief is not "less ugly." The brief is "beautiful." The current screenshots are so flat and so placeholder-heavy that a winning draft has to deliver:
- Stronger materials
- Better typography
- Better atmosphere
- Better overlays
- Better hero moments
- Better Trading Post identity

Claude gets closer to that target, but it needs more restraint and a mandatory typography pass.

Gemini gets closer to a sensible sprint size, but it cuts too many of the exact things that would make the result feel luxurious and authored.

## Bottom Line

- If I had to choose one draft strictly on "which is more likely to make the game BEAUTIFUL," I would choose Claude.
- If I had to choose one draft strictly on "which is more likely to ship with less thrash," I would choose Gemini.
- Neither draft is ready untouched.
- The best final sprint should take:
  - Claude's full-scene ambition, overlay work, Trading Post parity, and hero-moment polish
  - Gemini's prioritization discipline and bias toward restraint
  - A mandatory typography upgrade, but with a stronger visual direction than a bare 5x7 terminal font
  - Explicit HUD/header acceptance criteria
  - Screenshot proof for Barn idle, warning, legendary, summary/win, and Trading Post at phone and desktop sizes

That is the bar for "beautiful" here. Anything less risks shipping a game that is technically more polished but still visibly prototype-grade.
