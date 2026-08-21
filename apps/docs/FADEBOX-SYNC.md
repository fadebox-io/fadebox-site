# Docs ↔ fadebox sync state

This file records how far the docs have caught up with the private fadebox code repo, so the next
documentation pass knows where to start. It lives outside `docs/` on purpose — it is maintenance
state, not published content.

## Current state

- **Last documented fadebox commit:** `6df0ffd` (master, 2026-08-21)
- **Merged PRs reviewed through:** #113 (#66, #89, #99 and #110 were closed unmerged or are
  issues; #79 never existed)

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
| 2026-08-21 | The MCP endpoint — Fadebox serving its tool registry to the agent you already run, authenticated by an ordinary API key. Written ahead of the merge; #111 and #113 (server-side log search) have since **merged**, and the counters above moved with this row. The security half is the part that needed writing down and did not exist anywhere user-facing: an agent's authority is its account's roles, so each agent gets its own service account at the role it should have, and a personal key — least of all an admin's — is never pasted into an agent config. Also documented deliberately: tool results are **not** redacted, because ephemeral environments need their values to start and an agent writes back what it reads. | New `guides/mcp.md` (+ sidebar, after the CLI); `guides/ci-api-keys.md` — an agent is the third consumer of a key, in *Using the key*; `guides/cli.md` — points at MCP for when you want an agent rather than a command. |
| 2026-08-20 | Follow-up to the pass below: the CLI guide still framed the tool as a pipelines-only thing and said nothing about which kind of key drives it. No fadebox PR — #109 needed no CLI code change at all, which is the point worth writing down. | `guides/cli.md` — the intro now says either kind of key drives it and that SSO users need a personal one, `login` says who you end up acting as, and a new note explains why a `401` cannot name its cause (the server answers identically for wrong/revoked/expired/disabled, so it cannot be probed). |
| 2026-08-20 | Catch-up pass over #91–#109, the gap since the counters were last moved. **Documented:** #95 forced password change (undocumented, and it changes the very first thing a new install does), #96 granting access by search, #100 the business-error envelope, #109 personal API keys and key expiry. **Reviewed, no docs needed:** #91/#92/#94 (UI layout), #97 (e2e suite), #101 (CI). **Covered by fadebox-site #18:** #103 starters, #105 the spec code editor, #107 placeholder completion. All of it merged on 2026-08-20, and the counters above moved with it. | `getting-started/installation.md` — the first sign-in now forces a new password; `guides/access-control.md` — new Passwords section, the member pickers, and a key is not only a service-account thing; `guides/ci-api-keys.md` — retitled and reframed around both kinds of key, new "Your own keys", "Expiry" and "When a call is refused" sections. |
| 2026-08-20 | Template starters — the create-template form's *Start from* picker and the three framework skeletons behind it. Fadebox PR #103, merged 2026-08-20 (docs written ahead of it); #105 — the CodeMirror spec editor — is UI-level and needs no doc text. Counters stay until #91–#102 get a review pass. | `guides/template-authoring.md` — new "Starting from a framework skeleton" section, covering what each skeleton wires up, why a healthcheck has to match the image (JRE images cannot run `java Health.java`), and why the Rails skeleton ships no `SECRET_KEY_BASE`; plus a pointer under the intro. |
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
