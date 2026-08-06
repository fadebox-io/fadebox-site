---
title: Ingress and instance URLs
---

Mark a service's HTTP port and every instance of it gets a stable, predictable URL. No per-deploy
proxy configuration, no host-port allocation, no collisions between instances.

## How the URL is built

```
{namespace}-{service}.{ingress-domain}
└────────────┬───────┘
   the container name        shop-staging-pr42-web.envs.example.com
```

The namespace is `{project}-{environment}-{instance}`, so the whole hostname is a **single DNS
label** — that is what lets one wildcard record and one wildcard certificate cover every instance
you will ever deploy. Multi-level subdomains would break both.

The ingress domain is a property of the [runtime](../concepts/runtimes.md), which is how traffic
reaches the right host when you run several: `envs.example.com` for `local`, `eu.envs.example.com`
for `eu-prod`. A runtime with no ingress domain has no instance URLs — publishing host ports still
works everywhere.

## Setting it up

1. **Point a wildcard DNS record at the runtime host**: `*.envs.example.com → 203.0.113.10`.
   For a local try-out, `localtest.me` resolves `*.localtest.me` to `127.0.0.1` with no DNS setup
   at all.
2. **Set the ingress domain** on the runtime under *Settings → Runtimes*, along with whether URLs
   are HTTPS and whether they require a Fadebox sign-in.
3. **Install the ingress stack** from the same screen. Fadebox deploys Traefik plus a read-only
   Docker socket proxy onto that runtime, labelled as system containers, and shows their live
   status. The same button upgrades them; remove tears them down.

Traefik derives its routes from container labels by watching the daemon's event stream, so a deploy
needs nothing pushed to it and there is no proxy config to drift out of sync. Fadebox stamps the
labels; it never manages proxy state.

:::caution

Do not run the managed stack and a hand-installed proxy on the same host — both bind ports 80 and
443.

:::

## TLS

For HTTPS, give the runtime ACME settings: an email address, a DNS provider and its credentials, as
`VAR=value` lines. Traefik then issues a **wildcard certificate over DNS-01**, which is the only
challenge type that can cover `*.envs.example.com`.

The credentials are write-only — accepted by the API, never returned. They end up as environment
variables on the Traefik container, which is visible to anyone who can administer that daemon; that
is the same trust level as the daemon itself.

Certificates live on a volume that survives upgrade and removal of the stack, so re-installing does
not re-issue them. If you already hold certificates and would rather mount them, stay on a
hand-installed Traefik.

## Single-origin applications

One hostname per service is wrong for an application served as **one origin** — an SPA at `/` whose
API lives under `/api/*` and which calls it with relative URLs. Those services have to share a
hostname.

Give a port a path and it moves onto the **instance host**, `{namespace}.{ingress-domain}`, which
every path-routed service of that instance shares:

```yaml
services:
  web:
    image: shop/web:1
    labels:
      fadebox.ingress.port: "80"
      fadebox.ingress.path: "/"          # claims the instance host

  api:
    image: shop/api:1
    labels:
      fadebox.ingress.port: "8080"
      fadebox.ingress.path: "/api"
      fadebox.ingress.strip: "true"      # the app sees /orders, not /api/orders
```

- **Order does not matter.** The longest prefix wins, so `/api/orders` beats `/api`, which beats
  `/`. Nothing has to be sorted or configured.
- **`/` is a valid path** and does not stop siblings from claiming deeper prefixes. Stripping `/`
  is rejected — there would be no rooted path left.
- **Mixing is fine.** A service without a path keeps its own `{namespace}-{service}` hostname, so an
  admin UI can live on a separate origin while the app is single-origin.
- **Collisions fail the deploy**, not the request: if two services in an environment would produce
  the same route, the deploy is rejected naming both. A proxy would otherwise pick one silently.

A multi-port service assigns paths **positionally** — one path per port, in the same order as
`fadebox.ingress.port`.

## Requiring a sign-in

Turning on **Require fadebox sign-in** for a runtime gates every instance URL on it behind a
Fadebox session. Anonymous visitors are sent to the sign-in page and bounced back.

The mechanism is worth understanding, because it is designed around one constraint: **the Fadebox
session cookie must never reach instance hosts.** A cookie widened to the parent domain would be
sent to every deployed — and therefore untrusted — container, handing any preview app the
operator's session. Instead:

1. Traefik asks Fadebox whether the request is allowed. Without a valid per-host cookie, the
   visitor is redirected to Fadebox's own origin.
2. There, where the real session is valid, Fadebox checks the target host against the ingress
   domains of enabled runtimes (so it cannot be used as an open redirect) and mints a **60-second
   token bound to that exact hostname**.
3. The token is exchanged for a cookie **scoped to the instance host only**, valid 12 hours. A
   cookie issued for one instance is useless against any other.

The deployed application sees only that per-host cookie — which is valid for its own hostname
anyway — and an `X-Fadebox-User` header naming the signed-in user.

Authorization is authentication-only: any signed-in Fadebox user may open any gated instance URL.
Per-instance rules are not implemented.

This flow needs to know Fadebox's own browser-reachable address. Set `FADEBOX_PUBLIC_URL` if the
URL Traefik reaches Fadebox on is not the same one a browser would use.

## What is not covered

- **Non-HTTP traffic.** Databases and other TCP services keep using published host ports — routing
  raw TCP through Traefik requires TLS with SNI, which does not apply here.
- **Instance-to-instance isolation on the edge network.** Every ingress-exposed container shares one
  bridge network with Traefik, so those containers can reach each other's exposed ports directly.
  That is the same trust domain as the shared host itself.
