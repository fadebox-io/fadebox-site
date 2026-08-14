# Docs ↔ fadebox sync state

This file records how far the docs have caught up with the private fadebox code repo, so the next
documentation pass knows where to start. It lives outside `docs/` on purpose — it is maintenance
state, not published content.

## Current state

- **Last documented fadebox commit:** `501684b` (master, 2026-08-13)
- **Merged PRs reviewed through:** #67 (#65 was the last one merged chronologically)

## How to update the docs

1. In the fadebox repo, list what merged since the commit above:

   ```bash
   git log 501684b..origin/master --merges --oneline
   # or, with PR metadata:
   gh pr list --state merged --limit 30 --json number,title,mergedAt,mergeCommit
   ```

2. Skim each PR body and decide whether it is user-visible. Internal refactors, CI, release
   plumbing and UI polish usually are not; new settings, placeholders, CLI commands, security
   behaviour and setup steps usually are.

3. Update the affected pages under `apps/docs/docs/` (conventions in the repo `CLAUDE.md`),
   checking for wording the change made stale, not only for missing sections.

4. Bump the commit and PR number above to the new tip of master.

## Log of past passes

| Date | Covered | Pages touched |
| --- | --- | --- |
| 2026-08-14 | ACME provider credentials (fadebox PR #69, open — counters above not bumped) | `guides/ingress.md` — provider-credentials section: env-only constraint, inline `GCE_SERVICE_ACCOUNT` walkthrough for Google Cloud DNS. |
| 2026-08-13 | PRs #59–#67 (`501684b`) | `guides/ingress.md`, `concepts/runtimes.md`, `guides/template-authoring.md` — per-runtime ingress port + public port (#63, #67). #59 (OIDC without `end_session_endpoint`) was already covered by the Google/Entra recipes commit; #60/#61/#62/#64/#65 and the CI/release PRs needed no docs. |
| 2026-08-09 | PRs #55, #58 | `guides/licensing.md`, encryption-at-rest note, OIDC provider recipes. |
