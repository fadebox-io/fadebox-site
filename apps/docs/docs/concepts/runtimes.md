---
title: Runtimes
---

A **runtime** is a place containers run: one Docker daemon, reachable over a Unix socket or
`tcp://`. Instances are deployed onto a runtime, and one installation can manage several — a
laptop, a shared dev box, a machine per region.

Runtimes are managed by a global admin under *Settings → Runtimes*.

## The local runtime

A runtime named `local` pointing at `unix:///var/run/docker.sock` is seeded on first start, so the
single-host case works with no configuration. It is shared with every project.

Because the app container mounts the Docker socket, **anyone who can deploy on the local runtime is
effectively root on that host**. That is inherent to orchestrating Docker without a broker, and it
is why template authoring and runtime management are admin-gated.

## Remote daemons

<Tier level="team">A second runtime — Free runs one, and the seeded local runtime is it. See [Licensing](../guides/licensing.md#tiers).</Tier>

A remote runtime is a `tcp://host:2376` URI plus mutual-TLS material: a CA certificate, a client
certificate and a client key, all PEM. The three are meaningful only together. The client key is
**write-only** — the API accepts it and never returns it.

Use *Test connection* after saving; it does a real round trip to the daemon and reports what it
found rather than only whether the socket opened.

[Remote runtimes](../guides/remote-runtimes.md) walks through the whole setup — securing the
daemon with TLS, registering it, and putting the ingress on the remote host.

:::caution

Never expose a Docker daemon on `tcp://` without TLS client authentication. An unauthenticated
daemon port is a root shell on that host for anyone who can reach it.

:::

## Who may deploy where

| Setting | Effect |
| --- | --- |
| **Enabled** | A disabled runtime accepts no new deploys. |
| **Shared** | Usable by every project. This is the default and what `local` is seeded with. |
| **Restricted** | Usable only by the projects you list — for a host that belongs to one team, or one that must not run other people's images. |

## Ingress

A runtime carries the ingress settings for the instances that run on it, because that is what
routes traffic to the right host:

- **Ingress domain** — the wildcard domain instance URLs are built under, e.g. `envs.example.com`.
  Per runtime, so `local` and `eu-prod` can have different ones. A runtime with no ingress domain
  simply has no instance URLs; publishing host ports still works.
- **HTTPS** — whether URLs are `https`, and which Traefik entrypoint routers are pinned to.
- **Ingress port** — the port the ingress proxy binds on the host. Empty means the scheme default
  (80, or 443 with HTTPS); a non-default port appears in every generated instance URL.
- **Public port** — for a reverse proxy in front of the ingress: the port URLs advertise when it
  differs from the one the proxy binds. See
  [custom ports and reverse proxies](../guides/ingress.md#custom-ports-and-reverse-proxies).
- **Require fadebox sign-in** — gate every instance URL on the runtime behind a Fadebox session.
- **ACME settings** — email, DNS provider and credentials for wildcard certificates via DNS-01. The
  credentials are write-only like the client key.

Fadebox can install and manage the ingress stack (Traefik plus a Docker socket proxy) on each
runtime from the UI — install, upgrade and remove, with live status. See
[Ingress and instance URLs](../guides/ingress.md).

## Several installations on one daemon

If two Fadebox installations share a Docker host, set `FADEBOX_INSTALLATION_ID` to a distinct value
in each. Every container is then stamped with an installation label that all stop and status
queries filter on. Without it, the label values the two installations generate can collide, and one
installation's teardown can remove the other's containers.

Changing the value later orphans containers deployed under the old one, so set it before the first
deploy.
