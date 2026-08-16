---
title: Configuration reference
---

Fadebox is configured with environment variables on the app container. Everything here has a
working default except the two encryption keys, which the app refuses to start without.

Each variable is the uppercased, underscore form of an underlying property — `fadebox.git.cache-dir`
is `FADEBOX_GIT_CACHE_DIR`. Durations are ISO-8601 (`PT30S`, `PT5M`) unless noted.

Most of what an operator actually configures — runtimes, ingress domains, identity providers,
users, groups — is **not** here. Those are managed in the UI and stored in the database.

## Required

| Variable | Notes |
| --- | --- |
| `QUARKUS_HTTP_AUTH_SESSION_ENCRYPTION_KEY` | Encrypts the session cookie. At least 16 characters; generate with `openssl rand -base64 32`. **Startup fails without it.** Changing it signs everyone out. |
| `FADEBOX_ENCRYPTION_KEY` | Encrypts stored credentials at rest — see [Secrets at rest](#secrets-at-rest). At least 16 characters; generate with `openssl rand -base64 32`. **Startup fails without it.** Deliberately a different secret than the session key: changing it makes every stored credential unreadable until re-entered, so keep it stable and back it up. |
| `QUARKUS_DATASOURCE_JDBC_URL` | e.g. `jdbc:postgresql://db:5432/fadebox`. |
| `QUARKUS_DATASOURCE_USERNAME` / `QUARKUS_DATASOURCE_PASSWORD` | Database credentials. The schema is created and migrated on startup. |

## General

| Variable | Default | What it does |
| --- | --- | --- |
| `FADEBOX_PUBLIC_URL` | *(unset)* | The browser-reachable base URL of this installation. Used by the [ingress sign-in flow](../guides/ingress.md#requiring-a-sign-in) when sending a visitor of an instance URL here to sign in. Only needed when the URL Traefik reaches Fadebox on is not the one a browser would use. |
| `FADEBOX_DOCKER_HOST` | `unix:///var/run/docker.sock` | The daemon the seeded `local` runtime points at. Additional runtimes are configured in the UI, not here. |
| `FADEBOX_INSTALLATION_ID` | *(unset)* | Set a **distinct** value per installation when two Fadebox installations share one Docker daemon. Every container is stamped with it and all stop/status queries filter on it; without it, one installation's teardown can remove the other's containers. Changing it later orphans containers deployed under the old value. |
| `FADEBOX_SECURITY_BOOTSTRAP_ADMIN_ENABLED` | `true` | Creates the `admin` account with a generated password, logged once, when it is missing. Turn off once you manage accounts another way. |

## Deploys

| Variable | Default | What it does |
| --- | --- | --- |
| `FADEBOX_DEPLOY_POOL_SIZE` | `4` | How many deploys run concurrently across the whole installation. |
| `FADEBOX_DEPLOY_START_CONCURRENCY` | `4` | How many services **within one deploy** may start at once (pull, create, health wait). Parallel pulls can saturate a daemon's disk or network, so lower it on a constrained host; `1` makes starts fully sequential. |
| `FADEBOX_DEPLOY_READY_TIMEOUT` | `PT5M` | Ceiling on waiting for readiness — both the per-[wave](../concepts/environments.md#start-order-waves) waits and the final aggregation. |
| `FADEBOX_DEPLOY_CANCEL_GRACE` | `PT30S` | How long a cancel waits for the interrupted deploy worker to return before tearing containers down anyway, so teardown cannot race a worker still creating them. |

## Log export

Caps for the [instance log download](../concepts/instances.md#logs), counted on raw bytes before
zip compression. Docker cannot report a log's size in advance, so the export is scoped and capped
rather than size-checked: a breached cap cuts that entry with a visible marker instead of failing
the download.

| Variable | Default | What it does |
| --- | --- | --- |
| `FADEBOX_LOGS_EXPORT_DEFAULT_TAIL` | `100000` | Lines per container when the request does not say — the recent end, which is the useful one. |
| `FADEBOX_LOGS_EXPORT_MAX_CONTAINER_BYTES` | `64M` | Ceiling for one container's entry. |
| `FADEBOX_LOGS_EXPORT_MAX_TOTAL_BYTES` | `256M` | Ceiling for the whole archive, allocated fairly across its containers. |
| `FADEBOX_LOGS_EXPORT_MAX_CONCURRENT` | `2` | Simultaneous exports; each holds a worker thread and a daemon read for the whole download. Requests beyond it get a 429. |

## Git value sources

See [Git value sources](../guides/git-value-sources.md).

| Variable | Default | What it does |
| --- | --- | --- |
| `FADEBOX_GIT_CACHE_DIR` | `~/.fadebox/git` | Bare-clone cache making fetches incremental. Keep it on a volume — the shipped compose file does. It is an optimization only: an unreachable remote fails the deploy rather than serving stale content. |
| `FADEBOX_GIT_FETCH_TIMEOUT` | `PT30S` | Ceiling on each remote operation. |
| `FADEBOX_GIT_ALLOWED_URL_SCHEMES` | `https` | Schemes a repository URL may use. Deliberately narrow: this is the layer that actually opens the URL, and `file://` would read the app container's own filesystem. |

## Single sign-on

Providers themselves are database rows managed in the UI — see
[OIDC single sign-on](../guides/oidc-sso.md). Only these two are environment variables.

| Variable | Default | What it does |
| --- | --- | --- |
| `FADEBOX_SECURITY_OIDC_REGISTRY_REFRESH_INTERVAL` | `60s` | How stale a provider edit made on **another** app instance may be here. A write on this instance applies immediately. Also the pickup interval for a row inserted straight into the database. |
| `FADEBOX_SECURITY_OIDC_ALLOWED_ISSUER_SCHEMES` | `https` | Schemes an admin-supplied issuer URL may use. The server fetches the discovery document from it, so it is an outbound-request surface even though only a global admin can set one. |

:::info Removed variables

`QUARKUS_OIDC_TENANT_ENABLED`, `QUARKUS_OIDC_AUTH_SERVER_URL`, `QUARKUS_OIDC_CLIENT_ID`,
`QUARKUS_OIDC_CREDENTIALS_SECRET`, `FADEBOX_SECURITY_OIDC_PROVIDER_NAME` and
`FADEBOX_SECURITY_OIDC_AUTO_PROVISION` configured the old single-provider SSO. They no longer exist
— providers are managed at runtime instead. Delete them from your compose file.

:::

## Licensing

Normally the license is pasted in **Administration → License** and stored in the database — see
[Licensing](../guides/licensing.md). These exist for infrastructure-as-code installs; a pasted
license takes precedence over either.

| Variable | Default | What it does |
| --- | --- | --- |
| `FADEBOX_LICENSE` | *(unset)* | The license token itself. Unset means the Free tier. |
| `FADEBOX_LICENSE_PATH` | *(unset)* | Path to a file holding the token (e.g. a compose secret). Setting both variables fails startup, as does a path that cannot be read. |

## Secrets at rest

Registry passwords, git repository tokens, runtime mTLS client keys, ACME DNS credentials and OIDC
client secrets are **write-only against the API** — accepted on save, never returned — and
**encrypted in the database** (AES-256-GCM) under `FADEBOX_ENCRYPTION_KEY`, so a database dump or
backup does not leak them. User passwords and API keys are hashed, not encrypted.

Two things this does not change: the key lives on the app host, so a full compromise of that host
still yields the credentials — the encryption protects the database, its backups, and SQL-level
access, not the host itself. And losing the key means losing the stored credentials: they cannot be
read back out, only re-entered. Back the key up alongside the database.
