# Docs ↔ fadebox sync state

This file records how far the docs have caught up with the private fadebox code repo, so the next
documentation pass knows where to start. It lives outside `docs/` on purpose — it is maintenance
state, not published content.

## Current state

- **Last documented fadebox commit:** `8940076` (master, 2026-08-17)
- **Merged PRs reviewed through:** #90 (#66 and #89 were closed unmerged; #79 never existed)

No known gaps. (Runtime resource reclaim/purge was the last one — undocumented until
`guides/reclaiming-resources.md`, written 2026-08-17 after #83–#85 fixed defects in a feature the
docs had never described.)

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
| 2026-08-20 | Template starters — the create-template form's *Start from* picker and the three framework skeletons behind it. Written ahead of the merge; fadebox PR #103, **open**, so the counters above are not bumped. | `guides/template-authoring.md` — new "Starting from a framework skeleton" section, covering what each skeleton wires up, why a healthcheck has to match the image (JRE images cannot run `java Health.java`), and why the Rails skeleton ships no `SECRET_KEY_BASE`; plus a pointer under the intro. |
| 2026-08-19 | Blueprint environments — an environment marked clone-only, which refuses instances. Written ahead of the merge; fadebox PR #98, **open** (and itself based on the unmerged `io-fadebox-namespace` branch), so the counters above are not bumped. | `concepts/environments.md` — new Blueprints section, and Cloning now says the flag is not inherited; `concepts/instances.md` — the one environment that cannot have instances; `guides/cli.md` — `env list`'s `KIND` column and the `409` from `instance create`/`up`, command-surface row. |
| 2026-08-17 | Runtime resource reclaim/purge — the gap the review pass below recorded. Not a fadebox PR: an undocumented feature, found by reviewing #83–#85. | New `guides/reclaiming-resources.md` (+ sidebar); `concepts/runtimes.md` — the installation-id warning now says what to do about stranded resources; `concepts/instances.md` — volumes outlive a deleted instance, not just a redeploy. |
| 2026-08-17 | Counters bumped to master's tip after reviewing #82–#90. Needed no docs: #82 (the expiry-badge fixes — `concepts/instances.md` already describes the corrected behaviour, since documenting expiry is what found the bugs), #86, #87's coverage plumbing, #90 (CI only). Reviewed and **deliberately not covered**: #83–#85, see the reclaim gap above. #87 and #88 are the two rows below. | none — review pass. |
| 2026-08-17 | A status document's `containers` became a **map keyed by service** instead of a list, so `jq` addresses one service (`.containers.web.urls[0]`) rather than scanning. Written ahead of the merge; landed as `aa66b74` (PR #88). | `guides/cli.md` — the jq recipes and the pipeline example; `guides/ci-api-keys.md` — what `GET .../status` returns. |
| 2026-08-17 | The CLI's `-o url` output format was removed; the instance URLs still ship inside the status document, so the pipeline recipe is `-o json` through `jq`. Written ahead of the merge; landed as `aa66b74` (PR #88). | `guides/cli.md` — output formats are table/json/yaml, the `--wait` capture and the pipeline example go through `jq`; landing `CiSection.astro` — the CI snippet. |
| 2026-08-16 | PRs #68–#81 — the backlog cleared and the counters above bumped. Documented here: #70 (ingress log level), #73 (redeploy sweep), #74 (instance expiry — the largest gap: nothing about TTLs was published at all). Reviewed, no user docs needed: #68 (CI runner steering), #71 (DTOs out of services), #72 (license-store design; its tier rename was documented on 08-15). #69, #75–#78, #80 and #81 were covered by the passes below. | `concepts/instances.md` — new Expiry section, redeploy replaces the whole generation, logs die on a redeploy too; `concepts/environments.md` — new Instance lifetime; `reference/configuration.md` — new Instance expiry; `guides/ingress.md` — new Reading the ingress logs; `guides/cli.md`, `guides/audit-log.md` — cross-links. |
| 2026-08-16 | Audit log (fadebox PRs #75–#78, #80 — counters above not bumped; #68/#70/#71/#73/#74/#79 still unreviewed) | New `guides/audit-log.md` (+ sidebar); `reference/configuration.md` — new Audit log section; `guides/licensing.md` — tier-table row, feature line link, downgrade note; `concepts/instances.md` — export-is-audited note. |
| 2026-08-16 | Instance log export (fadebox PR #81 — single-PR pass, #68–#80 not otherwise reviewed, counters above not bumped) | `concepts/instances.md` — Logs section rewritten around tail + zip export, params and caps; `reference/configuration.md` — new Log export section. |
| 2026-08-15 | Community tier renamed to Free (fadebox PR #72 — rename only, #68–#72 not otherwise reviewed, counters above not bumped) | `guides/licensing.md`, `reference/configuration.md`, landing pricing. |
| 2026-08-14 | ACME provider credentials (fadebox PR #69, open — counters above not bumped) | `guides/ingress.md` — provider-credentials section: env-only constraint, inline `GCE_SERVICE_ACCOUNT` walkthrough for Google Cloud DNS. |
| 2026-08-13 | PRs #59–#67 (`501684b`) | `guides/ingress.md`, `concepts/runtimes.md`, `guides/template-authoring.md` — per-runtime ingress port + public port (#63, #67). #59 (OIDC without `end_session_endpoint`) was already covered by the Google/Entra recipes commit; #60/#61/#62/#64/#65 and the CI/release PRs needed no docs. |
| 2026-08-09 | PRs #55, #58 | `guides/licensing.md`, encryption-at-rest note, OIDC provider recipes. |
