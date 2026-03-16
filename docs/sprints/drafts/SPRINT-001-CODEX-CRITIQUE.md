# Sprint 001 Critique: Claude Draft vs. Gemini Draft

Reviewed against `docs/INTENT.md`, `docs/sprints/drafts/SPRINT-001-INTENT.md`, and both sprint drafts.

## Claude Draft

### Strengths

- Strong architectural reasoning. It resolves several open questions the sprint intent leaves open: scene lifecycle, scaling approach, Phaser import strategy, and the shape of future state seams.
- Good scope discipline. The draft stays close to Sprint 001's actual job: get the stack running, render a simple barn scene, and deploy it.
- Clear module boundaries. The "thin scenes" rule, extracted scaling logic, and explicit file manifest are all useful foundation decisions.
- Definition of Done is mostly aligned with the sprint intent's success criteria: local dev, build, deploy, touch response, responsive scaling, and `CLAUDE.md`.
- Risk analysis is broader than Gemini's in a few important areas, especially base-path deployment failure and general mobile scaling behavior.
- The accessibility/security note around `user-scalable=no` is a useful callout instead of pretending games have zero trade-offs.

### Weaknesses

- It misses linting as a real Sprint 001 deliverable, even though the sprint seed explicitly says this sprint establishes conventions including linting.
- The future-state singleton recommendation is out of scope and too opinionated for Sprint 001. The intent explicitly says the directory structure should not foreclose options.
- `src/types/index.ts` with placeholder shared types feels premature. Nothing in this sprint needs a shared type seam yet.
- `jsx: "preserve"` in `tsconfig.json` is cargo-cult configuration for a project that does not use JSX.
- Landscape behavior is still effectively unresolved. The draft assumes portrait layout plus letterboxing is acceptable, but it never turns that into an explicit acceptance policy.
- The BootScene plan is slightly artificial: a loading indicator with no real assets and a simulated delay adds ceremony without much value.

### Gaps in Risk Analysis

- No explicit risk for safe-area and home-indicator overlap, even though the primary interaction sits near the bottom edge of a phone screen.
- No explicit risk for Phaser strict-mode friction. Phaser's bundled types are usable, but strict TypeScript projects still hit rough edges often enough to deserve a fallback plan.
- No explicit risk for Vite/Phaser hot-reload behavior creating duplicate canvases or duplicate resize listeners during development.
- No explicit risk for missing linting despite the sprint seed calling it out.
- The full-bundle Phaser import is justified, but the draft does not frame that as a deliberate exception to the intent's "tree-shake where possible" guidance.

### Missing Edge Cases

- Rotate mid-session on a phone and confirm the canvas remains usable.
- Large tablets in landscape, where simple pillarboxing may be perfectly acceptable.
- Bottom-button placement on notched phones with safe-area insets.
- Rapid repeated taps on "Draw Animal" and whether feedback stacks or breaks.
- BootScene transitioning too quickly for the loading text to ever render visibly.

### Definition of Done Completeness

- Mostly good on the visible product outcomes.
- Missing explicit linting or standalone typecheck acceptance, which matters because the seed names linting as part of the sprint.
- Deployment acceptance is weaker than it should be. "Workflow file exists and is syntactically valid" is not as strong as "the Pages URL builds and loads correctly."
- Orientation behavior should be a direct DoD item instead of something inferred from the scaling section.

### What I Would Steal For A Merged Sprint

- The scene lifecycle and "scenes stay thin" rule.
- The file/module breakdown and the rationale for not creating empty future directories like `state/`.
- The explicit Phaser import rationale, even if the merged sprint also adds bundle monitoring.
- The broader architecture commentary around scaling and future seams.
- The security/accessibility note quality.

## Gemini Draft

### Strengths

- Best implementation spec of the two. Exact layout, dimensions, colors, and tap feedback remove most ambiguity for whoever builds BarnScene.
- It makes an actual orientation decision instead of deferring it. That is valuable in a foundation sprint because orientation bugs are expensive to clean up later.
- Mobile browser handling is concrete: `100dvh`, a fallback path, and explicit resize/orientation behavior.
- The task lists are clean and executable. Each phase is easy to validate by inspection.
- The structure minimalism is strong. "No new directory until it earns a second file" is the right instinct for a greenfield sprint.
- Splitting validation and deployment into `ci.yml` and `deploy.yml` is cleaner than mixing them.
- `CLAUDE.md` is treated as a real deliverable with real contents, not just a vague note to "document conventions."

### Weaknesses

- It also misses linting, despite the sprint seed explicitly requiring it.
- The DOM orientation overlay is pragmatic, but it is an exception to the product intent's default assumption that UI lives on canvas. That exception should be stated plainly.
- The draft over-specifies raw layout coordinates in the markdown and then asks `CLAUDE.md` to repeat them. Without a shared constants source, that becomes duplicate truth.
- `main.ts` is described as Phaser bootstrap only, but the orientation listener is later assigned to `main.ts`; that is an avoidable internal inconsistency.
- `src/types/index.ts` with `SceneKey` and `SlotState` is still slightly premature for Sprint 001.
- The farmhouse silhouette is nice, but it is extra UI detail in a sprint whose main goal is platform validation, not wireframe polish.
- Import strategy and bundle discipline are left unresolved even though the sprint intent explicitly raises both concerns.

### Gaps in Risk Analysis

- No explicit risk for missing linting or generally weak code-quality enforcement.
- No explicit risk for Phaser strict-TypeScript friction.
- No explicit risk for bundle size, import strategy, or cache invalidation behavior.
- No explicit risk for the DOM overlay interfering with focus, resume, or resize behavior when orientation changes.
- No explicit risk for CI and deploy workflows drifting if they build in slightly different environments.

### Missing Edge Cases

- Landscape tablets and foldables. `innerWidth > innerHeight` is a weak policy boundary by itself.
- Safe-area handling for the bottom button.
- Rapid tap or double-tap behavior on the button.
- Android-specific verification in the Definition of Done, not just the use cases.
- A more meaningful visible response than a button flash alone; nothing in the slot grid changes, so the scene proves input wiring but not much stateful UI behavior.

### Definition of Done Completeness

- Strongest user-facing DoD of the two. Most items are concrete and easy to test.
- Still missing linting and explicit typecheck acceptance, which is the main gap against the sprint seed.
- The deploy-related DoD is better than Claude's, but it would still be stronger if it clearly separated "CI green" from "Pages URL is reachable and loading correctly."
- The orientation policy should distinguish phones from larger landscape devices instead of treating all landscape the same.

### What I Would Steal For A Merged Sprint

- The wireframe-level BarnScene spec.
- The touch target rules and button feedback behavior.
- The mobile viewport handling details, especially `100dvh`.
- The "no new directory until it earns one" rule.
- The split between validation and deployment workflows.
- The `CLAUDE.md` content checklist.

## Overall Recommendation

- Claude is stronger on architecture and future-facing trade-off analysis.
- Gemini is stronger on concrete implementation detail and real-device behavior.
- The merged sprint should take Gemini's UI and orientation specificity, Claude's architectural framing, and add one thing both drafts underweight: linting as an explicit Sprint 001 outcome, because the sprint seed requires it.

## Shared Gaps To Close In The Final Merged Sprint

- Add `lint` and `typecheck` as explicit scripts and CI checks.
- Decide the exact landscape policy for phones versus tablets and write it into the Definition of Done.
- Handle safe-area insets for the bottom button.
- Add a short fallback plan for Phaser strict-mode friction and Vite/Phaser HMR cleanup.
- Resolve the GitHub repo slug and Pages settings before implementation starts.
- Make deploy acceptance mean "the URL loads correctly," not just "the workflow file exists."
