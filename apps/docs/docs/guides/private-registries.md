---
title: Private image registries
---

Deploying an image from a private registry needs a login, and the Docker API does not consult the
daemon host's `~/.docker/config.json` — the credential has to travel with the pull. So Fadebox
stores registry logins and sends them with every deploy. A private image deploys onto a fresh host
nobody primed by hand.

## Where a login lives

There are two levels, and which one you want is usually obvious:

| | Managed by | Use it for |
| --- | --- | --- |
| **Project** — *Project → Settings → Registries* | A project `maintainer` | The normal case: a team's images live in its own registry namespace behind its own robot account, and its maintainers are the people who hold that account. |
| **Runtime** — *Settings → Runtimes* | A global `admin` | Host-wide concerns: a pull-through mirror, or the registry the ingress stack's own images are mirrored into. |

Keeping them separate also keeps pull access from leaking sideways. A runtime is shared with every
project by default, so a credential parked there would let *any* project pull *any* image from that
registry just by naming it in a template.

## Precedence

Credentials are layered per registry: the **project's win** where both cover the same registry, and
the runtime's fill in everywhere else. So a host-wide mirror login can coexist with a team's own
robot account without either having to know about the other.

## Entering one

| Field | Notes |
| --- | --- |
| **Registry** | The registry host as it appears in your image references, e.g. `registry.example.com` or `ghcr.io`. |
| **Username** | The account or robot name. |
| **Password** | Write-only — accepted when you save it, never returned by the API or shown in the UI again. |

Registry hosts are normalized, so a scheme, a trailing slash or different capitalization all match
the same registry. Docker Hub's several spellings (`docker.io`, `index.docker.io`,
`https://index.docker.io/`) are folded together, so a Hub credential also applies to a bare image
reference like `postgres:18`.

One credential per registry per project (or per runtime) — saving a second for the same registry
replaces the first.

:::info At-rest storage

Registry passwords, git tokens, runtime client keys and ACME credentials are write-only against
the API and [encrypted at rest](../reference/configuration.md#secrets-at-rest) under
`FADEBOX_ENCRYPTION_KEY`. Still prefer scoped robot accounts over personal ones — the credential is
handed to every runtime that pulls with it.

:::
