---
title: Authoring a template
---

A [template](../concepts/templates.md) is written as a Docker Compose document — the same YAML your
team already writes — plus a few label directives for the things plain Compose has no concept of.

Templates are authored by an `admin` or a `template_admin`.

## The supported Compose subset

Under `services:`, these keys are understood:

`image`, `command`, `entrypoint`, `environment`, `ports`, `volumes`, `depends_on` (with
`condition:`), `healthcheck`, `restart`, `networks` (with `aliases`), `privileged`, `user`,
`labels`, and resource limits as either `mem_limit`/`cpus` or `deploy.resources.limits`.
Top-level `networks:` and `volumes:` are supported too.

Format variants are handled transparently — string ports (`"5432:5432"`) and long form, string and
mapping volumes, `healthcheck` with its usual sub-keys.

Two rules to know:

- **Any unsupported key is a hard error**, not a silent drop. `build`, `env_file`, `profiles` and
  `secrets` will be rejected by name when you save. This is deliberate: a silently ignored key is a
  deploy that quietly does the wrong thing.
- **`${VAR}` interpolation is not performed.** Templates are static documents. Use
  [environment overrides](../concepts/environments.md#where-environment-variables-come-from),
  [instance placeholders](#values-only-the-instance-knows) or
  [git value references](git-value-sources.md) instead.

## Label directives

Four labels are consumed at parse time and never reach the container:

| Label | Purpose |
| --- | --- |
| `fadebox.role` | `init`, `sidecar`, or `main`/absent. See [templates](../concepts/templates.md#a-template-provides-exactly-one-service). |
| `fadebox.ingress.port` | Comma-separated container ports to expose through the ingress proxy. |
| `fadebox.ingress.path` | Route those ports by path prefix on the shared instance host — one path per port, same order. |
| `fadebox.ingress.strip` | `true` to strip the prefix before proxying. |

An ingress port needs **no** `ports:` entry — it is reached through the proxy over the Docker
network and is deliberately not published on the host. A port that also has an explicit host
mapping keeps it. See [Ingress and instance URLs](ingress.md).

## Healthchecks earn their keep

A service with a healthcheck is waited for until it is *healthy*; one without is only waited for
until it has *started*. Since [waves](../concepts/environments.md#start-order-waves) gate on
exactly that, a database with no healthcheck will let the next wave start before it can accept
connections.

```yaml
services:
  postgres:
    image: postgres:18-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: postgres
    volumes:
      - postgres-data:/var/lib/postgresql/18/docker
    healthcheck:
      test: ["CMD-SHELL", "sh -c 'pg_isready -U $POSTGRES_USER -d $POSTGRES_DB'"]
      start_period: 20s
      interval: 5s
      timeout: 5s
      retries: 12
```

## Injected files

A template can carry files that are written into a container at deploy time — an init script, a
config file, a seed SQL dump. Each file names the service inside the unit it targets (so an init
container can carry its own script), an absolute path inside that container, and its content. Files
are text, up to 1 MB, and land with mode `0644`.

A target path underneath one of that service's volume mounts is rejected when you save it, because
the volume would shadow the file the moment the container starts.

A [config](../concepts/environments.md#configs) can supply a file at the same path to override a
template file — configs reach the main service only.

## Values only the instance knows

Some values cannot be written into a template because they differ per instance: a frontend's API
URL, an OIDC issuer, a CORS allow-list. Rather than generating those per run, write a placeholder
and let the deploy fill it in:

| Placeholder | Resolves to |
| --- | --- |
| `{{instance.name}}` | The instance slug, e.g. `pr-42`. |
| `{{instance.namespace}}` | `{project}-{environment}-{instance}` — the container-name prefix. |
| `{{instance.host}}` | The instance's own hostname, `{namespace}.{ingress-domain}`. |
| `{{ingress.domain}}` | The runtime's ingress domain. |
| `{{ingress.scheme}}` | `http` or `https`, per the runtime. |

These interpolate **inside** a string, so `https://{{instance.host}}/auth` works, and they apply
both to environment values and to injected file content.

Spelling matters: anything that looks like one of these placeholders but is not exactly right —
`{{ instance.host }}` with spaces, say — **fails the deploy** instead of reaching the container as
literal text. A typo in a callback URL should not become a running container.

## Test runs

Before wiring a template into an environment, run it on its own: *Test run* starts the unit ad hoc
on a runtime, with no project or environment involved, and shows container status and logs.

A test run is not persisted. Its containers are labelled and the daemon is the source of truth, so
a run survives an app restart and stays stoppable. There is one test run per template, in the
namespace `tpl-test-<template>`.

## A worked example

```yaml
services:
  api:
    image: registry.example.com/shop/api:1.4.0
    environment:
      DATABASE_URL: jdbc:postgresql://postgres:5432/shop
      PUBLIC_BASE_URL: "{{ingress.scheme}}://{{instance.host}}"
    labels:
      fadebox.ingress.port: "8080"
      fadebox.ingress.path: "/api"
      fadebox.ingress.strip: "true"
    depends_on:
      migrate:
        condition: service_completed_successfully
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://localhost:8080/q/health/ready"]
      start_period: 15s
      interval: 5s
      retries: 20
    deploy:
      resources:
        limits:
          memory: 1g

  migrate:
    image: registry.example.com/shop/api:1.4.0
    command: ["./migrate.sh"]
    environment:
      DATABASE_URL: jdbc:postgresql://postgres:5432/shop
    labels:
      fadebox.role: init
```

`postgres` is not in this file: it is a separate template, composed alongside this one in the
environment, and reached here by its environment service name.
