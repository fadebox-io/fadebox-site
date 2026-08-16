# Docs ↔ fadebox sync state

This file records how far the docs have caught up with the private fadebox code repo, so the next
documentation pass knows where to start. It lives outside `docs/` on purpose — it is maintenance
state, not published content.

## Current state

- **Last documented fadebox commit:** `4cb5ff5` (master, 2026-08-16)
- **Merged PRs reviewed through:** #81 (#66 was closed unmerged; #79 never existed)

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
| 2026-08-16 | PRs #68–#81 — the backlog cleared and the counters above bumped. Documented here: #70 (ingress log level), #73 (redeploy sweep), #74 (instance expiry — the largest gap: nothing about TTLs was published at all). Reviewed, no user docs needed: #68 (CI runner steering), #71 (DTOs out of services), #72 (license-store design; its tier rename was documented on 08-15). #69, #75–#78, #80 and #81 were covered by the passes below. | `concepts/instances.md` — new Expiry section, redeploy replaces the whole generation, logs die on a redeploy too; `concepts/environments.md` — new Instance lifetime; `reference/configuration.md` — new Instance expiry; `guides/ingress.md` — new Reading the ingress logs; `guides/cli.md`, `guides/audit-log.md` — cross-links. |
| 2026-08-16 | Audit log (fadebox PRs #75–#78, #80 — counters above not bumped; #68/#70/#71/#73/#74/#79 still unreviewed) | New `guides/audit-log.md` (+ sidebar); `reference/configuration.md` — new Audit log section; `guides/licensing.md` — tier-table row, feature line link, downgrade note; `concepts/instances.md` — export-is-audited note. |
| 2026-08-16 | Instance log export (fadebox PR #81 — single-PR pass, #68–#80 not otherwise reviewed, counters above not bumped) | `concepts/instances.md` — Logs section rewritten around tail + zip export, params and caps; `reference/configuration.md` — new Log export section. |
| 2026-08-15 | Community tier renamed to Free (fadebox PR #72 — rename only, #68–#72 not otherwise reviewed, counters above not bumped) | `guides/licensing.md`, `reference/configuration.md`, landing pricing. |
| 2026-08-14 | ACME provider credentials (fadebox PR #69, open — counters above not bumped) | `guides/ingress.md` — provider-credentials section: env-only constraint, inline `GCE_SERVICE_ACCOUNT` walkthrough for Google Cloud DNS. |
| 2026-08-13 | PRs #59–#67 (`501684b`) | `guides/ingress.md`, `concepts/runtimes.md`, `guides/template-authoring.md` — per-runtime ingress port + public port (#63, #67). #59 (OIDC without `end_session_endpoint`) was already covered by the Google/Entra recipes commit; #60/#61/#62/#64/#65 and the CI/release PRs needed no docs. |
| 2026-08-09 | PRs #55, #58 | `guides/licensing.md`, encryption-at-rest note, OIDC provider recipes. |
