---
title: Audit log
---

<Tier level="enterprise" />

Who did what, when — state-changing and security-relevant actions recorded as structured,
**append-only events**: actor, action, target, outcome, timestamp, and the context that makes a
row useful on its own. Recording is an **Enterprise** feature ([Licensing](licensing.md));
reading is never gated, so history recorded while entitled stays visible on every tier.

## Where to read it

| Place | Who | What it shows |
| --- | --- | --- |
| **Administration → Audit Log** | global `admin` | Every event in the installation, filterable. |
| **Project → Settings → Audit Log** | project `maintainer` | The project's own slice — the same view, scoped server-side. |
| The instance's timeline in its status panel | project `viewer` | One instance's events, newest first: who created, deployed and stopped it, and how each attempt ended. |

Filters narrow by actor, action, outcome, target and a time window, and free-text search matches
actor names, target names and projects. The same queries are available over the API
(`GET /api/admin/audit`, `GET /api/projects/{project}/audit`) for scripting.

### Times are yours, storage is UTC

Every timestamp is **stored** in UTC and **shown** in your browser's own time zone and date
format, so the same event reads `4:04 PM` for a colleague in Prague and `7:04 AM` for one in
California. Picking a day in the time-range filter means that day where *you* are, matching the
column beside it — so a window never hides a row that the listing would have shown.

The clock follows *Settings → Appearance → Time format*: **Automatic** takes its cue from your
browser's locale, or you can pin 24-hour or 12-hour. That setting governs every timestamp Fadebox
renders, not just this page.

Over the API the values are raw UTC, without a zone suffix — a script gets the installation's
clock, not the reader's. Both bounds of a query window are inclusive.

## What is recorded

Sign-ins — including **failed** ones — and everything that changes state: users, groups and
membership; API keys; identity providers; the license; projects, environments and templates; the
whole instance lifecycle (create, deploy, stop, delete, extend,
[expiry sweeps](../concepts/instances.md#expiry)) including
[log exports](../concepts/instances.md#logs); runtimes and their certificates; ingress
installations; and fadebox's own cleanup jobs.

Each event carries the actor (a user, a [service account](ci-api-keys.md) — with the API key
that authenticated the request — or `SYSTEM` for fadebox's own jobs), the action, the target and
its project, `SUCCESS` or `FAILURE`, when it happened, a source IP where the request carries
one, and action-specific detail: the deploy's error, the export's byte count, the role a
membership granted.

Three attribution rules worth knowing:

- **Async outcomes belong to whoever asked.** A deploy finishes on a worker thread, but its
  outcome event names the user who requested it — "who deployed this" returns a person on the
  outcome row too, never a pool thread.
- **Fadebox's own jobs are `SYSTEM` actors** named after the job (`instance-expiry`,
  `startup-sweep`, `retention`), never an invented user.
- **An event exists only if the change actually happened.** Rolled-back work records nothing,
  and failures — a failed login, a failed deploy — are recorded where the failure became final.

## Recording follows the license

Below Enterprise the recorder simply drops events — the feature does not exist there — but the
pages and the API stay open, showing whatever was recorded while entitled. A downgrade **stops
new events without hiding or deleting history**: there are no carve-outs to
[non-destructive downgrades](licensing.md).

## Shipping to a SIEM

Setting `FADEBOX_AUDIT_LOG_MIRROR=true` additionally emits every recorded event as **one JSON
line** on the `fadebox.audit` logger, so an existing log pipeline can forward events without
touching the database. The mirror is a feed, not the record — the database stays authoritative.

## Retention

Events are kept **forever by default**. Setting `FADEBOX_AUDIT_RETENTION` (ISO-8601, e.g.
`P365D`) enables a periodic purge of older events — and the purge **records its own
`audit.purged` event on every tier**, so the log never shrinks silently. Retention is
deliberately configuration-only, with no UI: pruning policy belongs in reviewable deployment
configuration, not behind an admin session. The variables are in the
[configuration reference](../reference/configuration.md#audit-log).
