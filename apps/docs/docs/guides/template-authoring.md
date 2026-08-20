---
title: Authoring a template
---

A [template](../concepts/templates.md) is written as a Docker Compose document — the same YAML your
team already writes — plus a few label directives for the things plain Compose has no concept of.

Templates are authored by an `admin` or a `template_admin`.

If the service you are modelling is a Spring Boot, Quarkus or Rails application, the create form
can [start you from a skeleton](#starting-from-a-framework-skeleton) rather than an empty editor.

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

An [environment service](../concepts/environments.md#injected-files) can supply a file at the same
path to override a template file — environment files are keyed by container too, so they reach a
unit's helpers just like the template's own.

## Values only the instance knows

Some values cannot be written into a template because they differ per instance: a frontend's API
URL, an OIDC issuer, a CORS allow-list. Rather than generating those per run, write a placeholder
and let the deploy fill it in:

| Placeholder | Resolves to |
| --- | --- |
| `{{instance.name}}` | The instance slug, e.g. `pr-42`. |
| `{{instance.namespace}}` | `{project}-{environment}-{instance}` — the container-name prefix. |
| `{{instance.host}}` | The instance's own hostname, `{namespace}.{ingress-domain}` — with `:port` appended on a runtime whose [ingress port](ingress.md#custom-ports-and-reverse-proxies) is not the scheme default, so `{{ingress.scheme}}://{{instance.host}}/…` stays a working URL everywhere. |
| `{{ingress.domain}}` | The runtime's ingress domain. |
| `{{ingress.scheme}}` | `http` or `https`, per the runtime. |
| `{{ingress.port}}` | The port instance URLs are reached on — `80`/`443` or the runtime's override. For templates that build a per-service host from `{{ingress.domain}}` and need `:{{ingress.port}}` to survive a non-default-port runtime. |

These interpolate **inside** a string, so `https://{{instance.host}}/auth` works, and they apply
both to environment values and to injected file content.

Spelling matters: anything that looks like one of these placeholders but is not exactly right —
`{{ instance.host }}` with spaces, say — **fails the deploy** instead of reaching the container as
literal text. A typo in a callback URL should not become a running container.

## Values another service owns

A template that connects to a sibling — Keycloak to its database, an app to its cache — can
reference that service instead of copying its values:

| Placeholder | Resolves to |
| --- | --- |
| `{{service.<name>.host}}` | The in-instance hostname of environment service `<name>`. |
| `{{service.<name>.env.<KEY>}}` | The effective value of env var `KEY` on that service's main container. |

`<name>` is the service's name in the environment. The same rules as instance placeholders apply —
interpolation inside strings, env values and injected files, malformed references fail the deploy —
plus two of their own: referencing a service that is not in the environment **fails the deploy**
with a message naming both sides (instead of a crash-loop at runtime), and references are **one
level only** — a referenced value may not itself be a reference.

The payoff is a single source of truth: override the provider's password once, at the environment
level, and every consumer follows on the next deploy:

```yaml
KC_DB_URL: jdbc:postgresql://{{service.postgres.host}}:5432/{{service.postgres.env.POSTGRES_DB}}
KC_DB_PASSWORD: "{{service.postgres.env.POSTGRES_PASSWORD}}"
```

Renamed the provider? Override the consumer's variable in the environment with a reference to the
new name — the template stays untouched.

Nobody has to write these from memory: the env editors that sit inside an environment (the
composer's per-service overrides, and the add/edit-service drawers) have a **Service reference**
builder next to the git one — pick a sibling service, then its hostname or one of its env vars,
and the finished placeholder lands at the caret. The composer also **warns** when a service's
template or overrides reference a name the environment doesn't have yet; the warning is
non-blocking, because the deploy is the enforcement point and the missing service may simply not
be added yet.

## Test runs

Before wiring a template into an environment, run it on its own: *Test run* starts the unit ad hoc
on a runtime, with no project or environment involved, and shows container status and logs.

A test run is not persisted. Its containers are labelled and the daemon is the source of truth, so
a run survives an app restart and stays stoppable. There is one test run per template, in the
namespace `tpl-test-<template>`.

A template that carries `{{service.*}}` references cannot test-run — the references need sibling
services, and a test run deploys the template alone. Compose it into an environment instead.

## Starting from a framework skeleton

The create-template form has a **Start from** picker above the spec field. Choosing *Spring Boot*,
*Quarkus* or *Ruby on Rails* fills the editor with a commented skeleton for that framework, and
*Blank* empties it again. Only the spec is filled — the name, slug, description and scope stay
yours, because the template models *your* application, not the framework it happens to use. If the
spec already holds something you typed, switching asks before replacing it.

A skeleton is a one-off copy, not a subscription: what you save is an ordinary template with no
link back, and nothing updates it later. Replace the image, delete what you don't need.

Each one wires up the four things a first application template usually gets wrong.

**An ingress port, and the framework's forwarded-headers switch.** `fadebox.ingress.port` is what
publishes the app at its [instance URL](ingress.md). Without the matching framework setting —
`SERVER_FORWARD_HEADERS_STRATEGY` for Spring Boot, `QUARKUS_HTTP_PROXY_PROXY_ADDRESS_FORWARDING`
for Quarkus, nothing for Rails — the links and redirects the app generates point at `localhost`
instead of the instance. Traefik overwrites those headers for traffic arriving from outside, but a
container belonging to another instance shares the edge network and can set them directly, so
don't make authorization decisions on them.

**The database by reference rather than by literal**, using
[`{{service.postgres.*}}`](#values-another-service-owns) so that renaming the provider or
overriding its password rewires the app instead of breaking it. Delete those lines if the app has
no database, or change `postgres` to whatever you named that service.

**A healthcheck the image can actually run** — the part that most often goes wrong, below.

**Migrations as an init helper**, in the Rails skeleton: `db:prepare` runs as a
[`fadebox.role: init`](../concepts/templates.md#a-template-provides-exactly-one-service) helper on
the app's own image, so an image-tag override moves the app and its migrations together, and the
wave waits for the migration to exit 0 before the app starts.

### The healthcheck has to match your image

[Waves gate on *healthy*](#healthchecks-earn-their-keep), so a probe that can never succeed does
not merely leave a container looking unwell — it stalls the deploy until it times out, with
nothing in the logs to say why. The probe has to be a tool the image actually ships, and the JVM
images differ more than you would expect:

| Image | `curl` | `wget` | Can run `java Health.java` |
| --- | --- | --- | --- |
| `eclipse-temurin:*-jre` | yes | yes | **no** |
| `ubi9/openjdk-*-runtime` | yes | no | yes |
| Images built by buildpacks | often neither | often neither | no |

The skeletons probe with `curl -fsS`, which covers the first two. If your image ships neither curl
nor wget — buildpack-built images frequently ship neither — add one in your Dockerfile, or pick a
run image that has one.

The last column is the trap. `java Health.java` looks like a probe with no dependencies beyond the
JVM, but running a `.java` file directly compiles it first, and a JRE has no compiler. On a JRE
image — the usual base for a Spring Boot service — that probe fails forever.

### Secrets are not shipped in a skeleton

The Rails skeleton deliberately leaves `SECRET_KEY_BASE` unset, and Rails will not boot in
production without one. That is the intent: a value shipped inside a skeleton would be identical in
every copy of it, and it signs session cookies on a URL the ingress publishes, so anyone who knew
the skeleton could forge a session. Set your own — on the `db-prepare` helper as well as the app,
since an environment override reaches only the main container — or read it from
[git](git-value-sources.md).

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
