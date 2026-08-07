---
title: Environments
---

An **environment** composes [templates](templates.md) into an application stack — `postgres` +
`backend` + `frontend`. It belongs to a project and is a **pure definition**: creating one starts
nothing. What runs is an [instance](instances.md) of it.

## Environment services

Adding a template to an environment creates an **environment service**. Its name is unique within
the environment and plays exactly the role a service key plays in a `docker-compose.yml`: it is
what siblings resolve over the network, and it prefixes the deployed container names. It defaults
to the template's name, so the same template can be added twice under different names.

Each environment service carries:

- **An image tag** — the version this environment runs. See
  [versions](#versions-live-on-the-environment) below.
- **Environment variable overrides** — applied on top of the template's own values.
- **Injected files** — see [files](#injected-files) below.
- **A start wave** — an integer, `0` by default.
- **A job flag** — for run-once work like a migration.

## Start order: waves

Services with the same wave number start together; a wave does not begin until the previous one is
ready. "Ready" means *healthy* for services that declare a healthcheck and *started* for those that
do not — which is the practical reason to give databases a healthcheck.

```
wave 0    postgres, redis          ← start together
wave 1    migrate (job)            ← waits for wave 0 to be healthy
wave 2    api, web                 ← waits for the migration to exit 0
```

Wave `0` means "no ordering", so a stack with no waves configured simply starts everything at once.
The whole readiness wait is bounded by `fadebox.deploy.ready-timeout` (default 5 minutes).

### Jobs

Marking an environment service as a **job** changes four things: restart is forced off regardless
of what the template says, the next wave gates on the container *completing successfully*,
readiness counts it done only once it has exited `0`, and it **re-runs on every deploy**. Jobs must
therefore be idempotent — a migration that fails when re-applied will fail the second deploy.

## Versions live on the environment

Each environment service may set an **image tag** — "this environment runs `api:1.4.0`". Left
empty, the template's own tag applies. The tag replaces the tag only; the repository stays as the
template defined it, and the retag follows the *image*, not the container: helpers built from the
main service's repository (a migration container running the app image) get the same tag, while a
helper on a foreign image keeps its own.

The tag can also be a [git reference](../guides/git-value-sources.md)
(`{{git:app-repo:deploy/values.yaml#$.image.tag}}`), resolved fresh on every deploy — the GitOps
values file stays the single source of truth and an ordinary release needs no write to Fadebox.

Because versions are part of the definition, every instance of an environment runs the same
versions. "The same stack at other versions" is **another environment** — see
[cloning](#cloning) below.

## Where environment variables come from

Three layers, merged at deploy time. Later layers win:

1. **Environment shared variables** — key/value pairs on the environment itself. These sit
   *underneath* everything, so they fill in rather than overrule: anything a template already set
   keeps its value. Uniquely, they reach **every** container, helpers included — an init container
   usually needs the same connection settings as the service it prepares.
2. **The template's own `environment:`**.
3. **The environment service's overrides** — main service only, the last word.

Values may also be
[instance placeholders](../guides/template-authoring.md#values-only-the-instance-knows),
[references into a git repository](../guides/git-value-sources.md), or
[references to sibling services](../guides/template-authoring.md#values-another-service-owns) —
all resolved at deploy time, in that order. Service references resolve **last**, so a consumer
always receives the provider's final value: a database password the provider takes from git
reaches every service that references it already resolved.

## Injected files

An environment service can carry files written into its containers at deploy time, exactly like a
[template's own files](../guides/template-authoring.md#injected-files): each names a container
inside the unit, an absolute target path, and its content. One with the same target path as a
template file **replaces** it — how an environment swaps in its own config file without editing
the shared template. Because they are keyed by container, they reach a unit's helpers too, not
just the main service.

## Cloning

Cloning copies an environment's **definition** under a new slug — services, image tags,
environment-variable overrides, waves, injected files and shared variables. Instances are never
copied; they stay with the original.

This is how a second version stream is made: clone `dev` to `dev-v2`, then edit the tags. The
variation is named and visible in the environment list, instead of hidden in per-instance
parameters. In the dialog, typing a name suggests the slug; from a pipeline it is one call —
`fadebox env clone dev dev-v2`.

## Exporting

An environment can be exported as a standalone Docker Compose project, with the naming and
ordering fadebox would apply: plain YAML when it has no injected files, otherwise a zip of
`docker-compose.yaml` plus the bind-mounted `files/`. Useful for review, and for running the same
stack outside fadebox.

Deploy-time references have no resolver outside fadebox, so `{{git:…}}` image tags and
`{{service.*}}` values come out **verbatim**, under a header comment saying to replace them with
literals before running the file — never silently substituted with something the environment
didn't say. Verbatim output also keeps exports deterministic, which is what makes diffing one
against a committed golden file a usable drift check.
