---
title: Installation
slug: /install
---

All you need on the host is Docker with the Compose plugin. Fadebox runs as two containers: the app
and a PostgreSQL database.

## 1. Create the compose file

Save this as `docker-compose.yml`:

```yaml
# Fadebox — app + PostgreSQL. Create .env next to this file first (step 2).
#
# Nothing host-specific is baked in here: the Docker socket path and the GID that owns it
# come from .env, because they differ per host (docker group on Linux, root on Docker
# Desktop, your own uid under rootless Docker).
services:
  db:
    image: postgres:18
    environment:
      POSTGRES_DB: fadebox
      POSTGRES_USER: fadebox
      POSTGRES_PASSWORD: ${DB_PASSWORD:?set DB_PASSWORD in .env}
    ports:
      - "5432:5432"
    volumes:
      # PG18 images store data in a version-specific subdir under /var/lib/postgresql
      - fadebox-db:/var/lib/postgresql
    healthcheck:
      test: [ "CMD-SHELL", "pg_isready -U fadebox -d fadebox" ]
      interval: 5s
      timeout: 5s
      retries: 10

  app:
    image: ghcr.io/hlavki/fadebox:latest
    depends_on:
      db:
        condition: service_healthy
    # The image's own uid (185, UBI convention); only the supplementary group varies per host.
    user: "${FADEBOX_UID:-185}:${FADEBOX_GID:-0}"
    group_add:
      # GID that owns the Docker socket — see step 2 for how to find it.
      - "${DOCKER_GID:?set DOCKER_GID in .env}"
    environment:
      # Point the baked-in postgres datasource at the db service.
      QUARKUS_DATASOURCE_JDBC_URL: jdbc:postgresql://db:5432/fadebox
      QUARKUS_DATASOURCE_USERNAME: fadebox
      QUARKUS_DATASOURCE_PASSWORD: ${DB_PASSWORD:?set DB_PASSWORD in .env}
      # Session-cookie encryption key; generate with `openssl rand -base64 32`.
      QUARKUS_HTTP_AUTH_SESSION_ENCRYPTION_KEY: "${FADEBOX_SESSION_KEY:?set FADEBOX_SESSION_KEY in .env}"
      # At-rest encryption key for stored credentials; generate the same way. Keep it stable —
      # changing it makes every stored credential unreadable until re-entered.
      FADEBOX_ENCRYPTION_KEY: "${FADEBOX_ENCRYPTION_KEY:?set FADEBOX_ENCRYPTION_KEY in .env}"
      # Bare-clone cache for git value sources (kept on a volume so fetches stay incremental)
      FADEBOX_GIT_CACHE_DIR: /data/git
    volumes:
      - ${DOCKER_SOCK:-/var/run/docker.sock}:/var/run/docker.sock
      - fadebox-git:/data
    ports:
      - "${FADEBOX_PORT:-8080}:8080"

volumes:
  fadebox-db:
  fadebox-git:
```

## 2. Create `.env`

Nothing host-specific is baked into the compose file, so it reads these from `.env` next to it
(compose fails fast with a named variable if one is missing):

```bash
{
  echo "DOCKER_GID=$(stat -c '%g' /var/run/docker.sock)"   # macOS: stat -f '%g'
  echo "FADEBOX_SESSION_KEY=$(openssl rand -base64 32)"
  echo "FADEBOX_ENCRYPTION_KEY=$(openssl rand -base64 32)"
  echo "DB_PASSWORD=$(openssl rand -base64 24)"
} >> .env
```

`DOCKER_GID` is the group that owns the Docker socket — `docker` on most Linux hosts, `0` on Docker
Desktop, your own gid under rootless Docker (which also needs
`DOCKER_SOCK=/run/user/$UID/docker.sock`). The app container keeps its own uid and just joins that
group; without it, every deploy fails with `permission denied` on `/var/run/docker.sock`.

`FADEBOX_ENCRYPTION_KEY` encrypts stored credentials (registry passwords, git tokens, mTLS client
keys, OIDC client secrets) at rest, so a database dump or backup does not leak them. Keep it stable
and include it in your backups: unlike `FADEBOX_SESSION_KEY` (rotating that one just signs
everyone out), changing this key makes every stored credential unreadable until re-entered.

## 3. Start it

```bash
docker compose up -d
```

## 4. Sign in

Open `http://localhost:8080`. The initial `admin` user's generated password is printed once in the
log:

```bash
docker compose logs app | grep "generated password"
```

Sign in with it. Fadebox then **requires** a new password before the account can do anything
else — a password somebody (or something) else chose is treated as temporary, so the first screen
after this sign-in is the password form and every other page answers 403 until you are through it.
The same applies to any account an admin creates or resets. See
[Passwords](../guides/access-control.md#passwords).

:::warning

Fadebox's app container mounts `/var/run/docker.sock` — managing a Docker daemon is effectively
root on that host, so treat Fadebox admin access accordingly.

:::

## Next

[Deploy your first environment](first-environment.md) — ingress domain, a template from the
catalog, and a running URL.

Optional, whenever you need them:

- [Remote runtimes](../guides/remote-runtimes.md) to keep this VM small and deploy environments
  onto a powerful Docker host instead.
- [Single sign-on](../guides/oidc-sso.md) against your identity provider, configured in the UI.
- [Users, groups and roles](../guides/access-control.md) for anything beyond the bootstrap admin.
- [Configuration reference](../reference/configuration.md) for the environment variables the app
  understands.
