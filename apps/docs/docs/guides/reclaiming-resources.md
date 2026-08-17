---
title: Reclaiming host resources
---

Fadebox owns Docker resources by **labelling** them, not by keeping a ledger. That is what makes
the daemon the source of truth for what is running — but it leaves nobody responsible for what is
no longer claimed. Named volumes outlive the instances that wrote them, a restored or reset
database knows nothing about what an earlier one deployed, and a host that was disconnected while
instances ran keeps them forever.

The **Resources on host** panel is the answer to "what is fadebox still holding here, and what of
it is nobody's?" It reports before it removes, and every removal is an explicit act.

## Where to find it

**Administration → Runtimes → the runtime → Resources on host** (global `admin` only). The panel
shows a count — `12 managed, 3 orphaned` — and lists each orphan as kind, name and who it used to
belong to:

```
CONTAINER shop-dev-pr42-web       — instance 7 is gone
NETWORK   shop-dev-pr42           — instance 7 is gone
VOLUME    shop-dev-pr42-db-data   — instance 7 is gone
```

The scan is read-only and runs every time you open the panel. Nothing is removed until you press
a button.

## What counts as an orphan

Every resource fadebox creates carries `fadebox.managed`, plus a label saying whose it is. The
scan reads that label back and asks whether the owner still exists:

| The resource carries | Owner shown as | Orphaned when |
| --- | --- | --- |
| An instance id | `instance 7` | No instance row with that id exists |
| A template test-run name | `template test 'postgres'` | No template with that slug exists (a test run is never persisted, so the template's existence is what makes its containers legitimate) |
| Neither | `unknown` | Always — it cannot be attributed to anything |

Two things are deliberately outside this:

- **The ingress stack.** Traefik and its socket proxy carry `fadebox.system`, not
  `fadebox.managed`, so they can never be reported as orphans or caught by a purge. They have
  their own install and remove actions — see [Ingress](ingress.md).
- **Anything created before fadebox labelled it.** It is invisible here and has to be cleared by
  hand with `docker`.

If two installations share one daemon, each sees only its own resources, provided both set
`FADEBOX_INSTALLATION_ID` — see [Configuration](../reference/configuration.md). Without it, one
installation's scan reports the other's resources as orphans.

## Reclaim: remove the orphans

Reclaiming removes **only** resources whose owner is gone, so it is safe to run against a runtime
with live instances on it. It is split in two, because the kinds are not equally recoverable:

- **Containers and networks** are rebuilt by a redeploy. This is the default button.
- **Volumes hold data** — a database, uploads, whatever the containers wrote — and the instance
  being gone does not make the data worthless. They are a separate button behind a confirmation,
  and there is no undo.

Removal runs containers first, then networks, then volumes: a network with an attached container,
or a volume with a live mount, is refused by the daemon, so any other order leaves the rest
behind.

The result counts what the daemon **actually** removed. A refusal is a warning in the server log,
not a failed request — so if a volume was still mounted, it simply is not in the count, and the
next scan still lists it.

## Purge: remove everything

**Purge** ignores ownership and removes every `fadebox.managed` resource on the host, including
those belonging to live instances, including every volume.

It exists for one situation: **the host's database is gone**. That is exactly when reclaim cannot
help — a fresh database reissues row ids that stale containers still carry, so the ownership diff
reports leftovers as live and healthy. Purge skips the diff entirely.

Anywhere else, reclaim the orphans instead. The confirmation dialog says how many live resources
you are about to take with you.

## What gets recorded

Both actions write an audit event on the runtime — `runtime.reclaimed` or `runtime.purged` — with
the per-kind counts and the names of what was removed. The name list records only what the daemon
confirmed: a refused deletion is never written down as a deletion. See
[Audit log](audit-log.md).

## Over the API

All three are `admin`-only.

| Call | Does |
| --- | --- |
| `GET /api/runtimes/{name}/resources` | The scan. Returns `kind`, `name`, `owner`, `orphaned` per resource. Read-only. |
| `POST /api/runtimes/{name}/resources/reclaim` | Removes orphans of the granted kinds. |
| `DELETE /api/runtimes/{name}/resources` | Purges everything managed, owned or not. |

The reclaim body's `kinds` is a **permission**, not a filter, and the distinction matters on a
destructive endpoint:

```bash
# containers and networks — the recoverable default
curl -sf -X POST -H "$AUTH" "$HOST/api/runtimes/local/resources/reclaim"

# volumes too: data goes with them, so it must be asked for by name
curl -sf -X POST -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"kinds":["CONTAINER","NETWORK","VOLUME"]}' \
  "$HOST/api/runtimes/local/resources/reclaim"

# an explicitly empty list grants nothing and removes nothing
curl -sf -X POST -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"kinds":[]}' "$HOST/api/runtimes/local/resources/reclaim"
```

An **absent** `kinds` (or no body at all) falls back to the recoverable default — containers and
networks. An **empty** one grants nothing, which is what a caller building the request from a
multi-select with everything deselected means by it.

Both removal calls answer with what was removed, by kind:

```json
{ "containers": 2, "networks": 1, "volumes": 0 }
```

There is no total; it is the sum of the three, and a client that wants one adds them up.
