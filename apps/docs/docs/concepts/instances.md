---
title: Instances
---

An **instance** is a running copy of an [environment](environments.md) on a chosen
[runtime](runtimes.md). One environment can have many: `pr-42`, `pr-43`, `alice`, `demo` — all from
the same definition, all at the same time, even on the same Docker host.

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

Logs are a **snapshot** of one service's output (a tail, capped at 5000 lines), not a stream. The
UI and the CLI both read the same endpoint.

## Ownership

The creator of an instance is recorded and displayed, but it is **not** an access control: any
`deployer` in the project may deploy, stop or delete any instance in it. That is what lets a
pipeline's cleanup job tear down what a different job started.
