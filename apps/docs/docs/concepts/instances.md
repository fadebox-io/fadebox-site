---
title: Instances
---

An **instance** is a running copy of an [environment](environments.md) on a chosen
[runtime](runtimes.md). One environment can have many: `pr-42`, `pr-43`, `alice`, `demo` — all from
the same definition, all at the same time, even on the same Docker host.

The one environment that cannot have instances is a [blueprint](environments.md#blueprints), which
exists to be cloned rather than run; clone it and deploy the clone.

<Tier level="team" />

Free runs five at once per runtime; redeploying one that is already running never counts against
that. See [Licensing](../guides/licensing.md#tiers).

## Isolation

Every instance gets a **namespace**, `{project}-{environment}-{instance}`, and everything it
creates is prefixed with it: container names, the bridge network, named volumes. That is what lets
`pr-42` and `pr-43` of the same environment coexist on one daemon without colliding, and what makes
teardown exact — stopping an instance removes what carries its labels and nothing else.

The instance name you type becomes a slug. If that slug is taken within the environment, fadebox
disambiguates it (`pr-123` → `pr-123-2`) rather than failing — convenient in the UI, worth knowing
about in a pipeline, where the [CLI's](../guides/cli.md) `instance up` does find-or-create instead
so a retried job does not accumulate copies.

## Lifecycle

```
DRAFT ──► STOPPED ──► STARTING ──► RUNNING ──► STOPPING ──► STOPPED
                          │            │                        │
                          │ (cancel)   └────────► ERROR ◄───────┘
                          └─────────► STOPPING
```

| State | Meaning |
| --- | --- |
| `DRAFT` | Being configured; not yet deployed. |
| `STOPPED` | Defined, nothing running. |
| `STARTING` | A deploy is in progress. |
| `RUNNING` | Every service is up and ready. |
| `STOPPING` | Tear-down in progress. |
| `ERROR` | The last deploy or stop attempt failed. |

**Deploy is asynchronous.** The call returns immediately with `STARTING` and the work continues on
a worker; poll the status endpoint (or watch the UI) to see it settle. **Stopping mid-deploy
cancels it** rather than being refused — `STARTING → STOPPING` is a supported edge.

Only `DRAFT` and `STOPPED` instances can be deleted. An `ERROR` instance is both deployable and
stoppable, so stop-then-delete is always available; you can never be stranded.

**Deploying an instance that is already running replaces it whole.** Every container of the
previous deploy is removed first — helpers included, and services that have since been renamed or
removed from the environment along with them — and only then does the new generation start. There
is no rolling replacement, so the instance is down for the length of the deploy, image pulls
included. Named volumes and the instance network survive it, and the URLs do not change. (Stopping
removes the containers and the network; **named volumes are removed by no path at all**, so they
outlive even a deleted instance — see
[reclaiming host resources](../guides/reclaiming-resources.md).) Values
resolve before anything is torn down, so a deploy that fails while reading a
[git value](../guides/git-value-sources.md) leaves what is running untouched.

## Expiry

Instances are meant to be disposable, so they carry a lifetime. Every deploy stamps the instance
with an expiry — now plus the environment's TTL, seven days unless the installation says
otherwise — and a sweep stops whatever has run out.

**Expiry stops; it never deletes.** A swept instance lands in `STOPPED` with its definition
untouched, and a redeploy brings it back and starts the clock again. This collects abandoned
*containers*, not anyone's work.

Two things reset the clock: **every deploy and redeploy**, so an instance in active use never
expires under its user, and **Extend** — a button on the instance that pushes the expiry to a
full TTL from now without redeploying. Extend needs the `deployer` role and appears only while
the instance is running or in `ERROR` and actually has an expiry. Creating an instance does not
start the clock: a `DRAFT` has none until its first deploy.

`RUNNING` and `ERROR` instances are swept — `ERROR` deliberately, since a failed deploy leaves
containers holding a network, which is exactly the litter this exists to collect. A deploy in
flight is never swept, and an Extend or redeploy that lands while the sweep is deciding wins.
The sweep runs every minute by default, so a stop follows the expiry closely rather than to the
second.

The instance shows its remaining time as a countdown (`3d 4h`, then `now`) with the exact
timestamp in the tooltip; one that ran out and was stopped is badged `expired`, and
`fadebox instance get` prints the same as `Expires:`. Whether a person or the sweep stopped
something is answered by the instance's history, where a swept stop is recorded by the
`instance-expiry` system actor — see the [audit log](../guides/audit-log.md).

The lifetime itself belongs to the environment: see
[instance lifetime](environments.md#instance-lifetime).

## The daemon is the source of truth

Fadebox does not keep a shadow copy of what is running. Status is read from the Docker daemon
through the instance's labels, which has two consequences worth relying on:

- **Running instances survive a fadebox restart.** Containers are not tied to the app's lifetime.
- **What the status panel shows is what exists.** Per-container state, health and logs come from
  the daemon at the moment you ask.

If the app is killed mid-deploy, the instance is left claiming a worker that no longer exists. On
the next startup such instances are swept to `ERROR` — deliberately not to a state claiming to know
what is on the host, because that question is answered by opening the instance's status.

## Logs

The status panel shows a per-service **tail** — a snapshot of one service's output (capped at 5000
lines), not a stream. The UI and the CLI both read the same endpoint.

Next to the tail sits **Download**, which streams the whole instance's logs as one zip: a
`logs/<service>.log` entry per container — init helpers and sidecars included — plus a
`manifest.json` recording what was exported (image, state, exit code, bytes, and whether the entry
was cut short, per container). Lines carry the daemon's timestamps, so output from different
containers can be ordered.

The download URL takes scoping parameters, which is also how a pipeline uses it with an
[API key](../guides/ci-api-keys.md):

```bash
curl -sf -OJ -H "Authorization: Bearer $FADEBOX_API_KEY" \
  "$HOST/api/projects/$P/environments/$E/instances/$I/logs/export?since=2026-08-16T12:00:00Z"
```

| Parameter | Default | Meaning |
| --- | --- | --- |
| `service` | all containers | Repeatable; takes the service keys the status panel shows. |
| `tail` | `100000` | Last N lines **per container**, or `all`. |
| `since` / `until` | *(unset)* | ISO-8601 instants; the Docker API applies them at second granularity. |
| `timestamps` | `true` | The per-line timestamp prefix. |

Docker cannot report a log's size in advance, so the export is **bounded rather than measured**:
the default `tail` keeps each container's recent end, and byte caps
([configurable](../reference/configuration.md#log-export)) cut a pathological entry mid-stream
with a visible `[fadebox] truncated …` marker rather than failing the download — the zip is
always valid, and the manifest says exactly what was cut.

Both the tail and the export read live containers, and container logs die with the containers —
on a stop, and on the redeploy that replaces them. Export **before** you stop or redeploy
something you are still diagnosing. Any project `viewer` may read
logs and download the export; each download is recorded in the
[audit log](../guides/audit-log.md).

## Ownership

The creator of an instance is recorded and displayed, but it is **not** an access control: any
`deployer` in the project may deploy, stop or delete any instance in it. That is what lets a
pipeline's cleanup job tear down what a different job started.
