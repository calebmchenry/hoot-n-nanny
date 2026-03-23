# Critique: Sprint 005 "Ship It" Drafts

This document synthesizes a critique of the two proposed drafts for Sprint 005: `NEXT-CLAUDE-DRAFT.md` and `NEXT-CODEX-DRAFT.md`. 

## 1. NEXT-CLAUDE-DRAFT.md

### Strengths
*   **Comprehensive QA Structure:** The breakdown into five QA dimensions (Gameplay paths, Responsive layout, Input parity, Performance, Cross-browser) is exceptionally detailed and provides a clear, actionable roadmap for manual testing.
*   **404 Fallback Strategy:** Correctly identifies the GitHub Pages quirk where deep links or query parameters might result in a 404, and proposes a `public/404.html` redirect to preserve state like `?seed=...`.
*   **Specific Edge Cases Covered:** The gameplay checklist is exhaustive, explicitly testing nuanced mechanics like Upkeep with 0 cash, Rowdy capacity overflows, and Sneak capacity logic.
*   **Environment-Aware Base Path:** Uses an environment variable for the Vite base path, ensuring local development remains untouched while the CI build targets the correct subdirectory.

### Weaknesses
*   **Coupled Asset Paths:** Hardcoding `/hoot-n-nanny/` in the Vite config via the environment variable couples the build to the repository name. If the repo is renamed or forked, the deployment will break silently.
*   **Workflow Duplication:** Splitting into two jobs (`test` and `deploy`) with duplicate `npm ci && npm run build` steps wastes CI minutes and creates two separate build artifacts, rather than verifying and deploying the *exact same* artifact.

### Gaps in Risk Analysis
*   **Asset Path Leaks:** Does not acknowledge the risk of accidentally introducing absolute paths (e.g., `/assets/...`) in CSS or JS, which would break on GitHub Pages even if the Vite base is set correctly.
*   **Silent Failures in CI:** Fails to account for the risk that the deployed artifact might be fundamentally broken despite a green CI run, relying entirely on manual QA to catch base path issues.

### Definition of Done Completeness
*   Very strong on manual verification and gameplay states.
*   Lacks automated enforcement of build artifact integrity prior to deployment.

---

## 2. NEXT-CODEX-DRAFT.md

### Strengths
*   **Relocatable Artifacts:** Proposes `base: './'` in Vite. This is the superior architectural choice for an SPA without client-side routing. It makes the build immune to repository renames and sub-path deployment quirks.
*   **Automated Artifact Verification:** Introduces `scripts/check-pages-artifact.mjs` as a hard deployment gate. Statically analyzing the build for absolute paths is an excellent defensive engineering practice.
*   **Automated QA Expansion:** Actively extends the Playwright test suite with a new `?seed=bust` deterministic state to automate the failure/pinning paths, reducing reliance on manual QA.
*   **Single Workflow Pipeline:** Consolidates verification and deployment into a streamlined workflow, ensuring the exact artifact tested is the one deployed.

### Weaknesses
*   **Incomplete QA Checklist:** The manual QA checklist is too brief. It lacks the rigorous, scenario-specific depth provided in the Claude draft (e.g., checking specific power combinations).
*   **Missing 404 Handling:** Fails to address how GitHub Pages handles 404s. Without a fallback, users refreshing the page with a `?seed=` query parameter will hit a hard GitHub Pages error screen.

### Gaps in Risk Analysis
*   **Performance Degradation:** Does not explicitly call out or test for memory leaks over sustained sessions, which is critical for a browser game.
*   **Browser-Specific Audio Quirks:** Mentions mobile audio differences but lacks a concrete plan (like Claude's specific Safari/iOS audio resume checks) to validate them.

### Definition of Done Completeness
*   Strong on automated guardrails and CI/CD integrity.
*   Weaker on defining the exact standards for visual and gameplay polish required to ship.

---

## Missing Edge Cases Across Both Drafts
*   **GitHub Actions Concurrency:** Neither draft explicitly mandates concurrency controls (`concurrency: group: "pages", cancel-in-progress: false`) in the GitHub Actions workflow. Without this, rapid pushes to `main` could cause race conditions during the deployment step, leading to broken Pages builds.
*   **Caching Strategy:** Neither draft explicitly defines the caching headers or cache-busting strategy for GitHub Pages. While Vite handles asset hashing, the root `index.html` might be aggressively cached by browsers, preventing players from seeing updates.

---

## Recommendations for the Final Merged Sprint

The final Sprint 005 plan should combine the defensive CI/CD architecture of the Codex draft with the rigorous manual QA and edge-case handling of the Claude draft.

1.  **Adopt Relocatable Builds:** Use Codex's `base: './'` in `vite.config.ts`. It is strictly superior to hardcoding the repo name for a static game.
2.  **Enforce Artifact Integrity:** Implement Codex's `check-pages-artifact.mjs` script to statically analyze `dist/` for absolute path leaks before deployment.
3.  **Include 404 Routing:** Implement Claude's `public/404.html` redirect mechanism to ensure `?seed=` parameters survive page reloads and direct links.
4.  **Single, Concurrent Workflow:** Use a single `.github/workflows/deploy.yml` with separate `test` and `deploy` jobs passing the *same* artifact, and strictly enforce deployment concurrency.
5.  **Expand Automated States:** Add Codex's `?seed=bust` to the application state and write the corresponding Playwright tests.
6.  **Execute the Exhaustive QA Sweep:** Use Claude's five-dimension QA checklist (Gameplay, Responsive, Input, Performance, Cross-browser) as the definitive manual QA pass against the live `github.io` URL.
7.  **Performance Auditing:** Mandate a Lighthouse run (Performance ≥ 90) and a 10+ night memory leak check as part of the final ship criteria.