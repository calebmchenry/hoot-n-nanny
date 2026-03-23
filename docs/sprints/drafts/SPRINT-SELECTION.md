# Sprint 005 Selection — "Ship It"

## Selected Backlog Items

| # | Item | Priority |
|---|------|----------|
| 26 | GitHub Pages CI/CD | Low |
| 27 | Final QA & Ship Polish | Low |

## Rationale

### Why both remaining items?

These are the only two items left on the backlog. Sprints 001–004 completed all core gameplay, powers, scoring, shop, win condition, personality, animation, and audio. Items 26 and 27 are pure shipping infrastructure and polish — the last mile.

### Why they belong together

**Sequential dependency.** Final QA (#27) includes a performance audit and bundle-size check. Having CI/CD (#26) in place first means QA can validate the actual deployed artifact on GitHub Pages, not just a local dev build. Testing the real deployment pipeline is part of "feeling finished to a stranger."

**Shared goal.** Both items exist to answer the same question: "Can someone visit the GitHub Pages URL and have a complete, polished experience?" CI/CD gets the game there; QA makes sure it holds up once it arrives.

**Small scope.** CI/CD is a single GitHub Actions workflow file plus repo settings. QA is playtesting and targeted fixes. Neither is large enough to justify a standalone sprint, but together they form a coherent "ship it" sprint.

**No remaining dependencies.** All content — visuals, gameplay, audio — is done. There is nothing left to block deployment or invalidate a QA pass.

### What this sprint delivers

After this sprint:

1. Pushing to `main` automatically deploys the static site to GitHub Pages
2. The build pipeline catches broken builds before they reach production
3. End-to-end playtesting has covered all game paths (normal win, bust, edge cases)
4. Performance is audited — no janky animations, no excessive bundle size
5. The game feels finished to a stranger landing on the GitHub Pages link
