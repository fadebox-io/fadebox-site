---
title: Environments and configs
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

- **Environment variable overrides** — applied on top of the template's own values.
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

## Where environment variables come from

Four layers, merged at deploy time. Later layers win:

1. **Environment shared variables** — key/value pairs on the environment itself. These sit
   *underneath* everything, so they fill in rather than overrule: anything a template already set
   keeps its value. Uniquely, they reach **every** container, helpers included — an init container
   usually needs the same connection settings as the service it prepares.
2. **The template's own `environment:`**.
3. **The environment service's overrides** — main service only.
4. **The config's overrides** — main service only, the last word.

Values may also be
[placeholders](../guides/template-authoring.md#values-only-the-instance-knows) resolved at deploy
time, or [references into a git repository](../guides/git-value-sources.md).

## Configs

A **config** is a named, reusable parameterization of one environment: per-service image tags and
environment-variable overrides, plus optional injected files. "The `dev` environment, but with my
branch's image tag" is a config.

- Configs are **shared within the project**, not private to their creator. The creator is recorded
  for display only; any `deployer` can read and edit them.
- A config's name is unique per environment.
- An instance references a config **live**, not by copy: it is resolved fresh on every deploy, so
  editing the config takes effect on the next deploy of every instance that uses it. Deleting a
  config reverts the instances that used it to the plain environment defaults.
- Overriding an **image tag** replaces the tag only; the repository stays as the template defined
  it.

Configs are what a pipeline names when it deploys: create one per version stream, then
`fadebox instance up pr-123 --config run-8842`.

## Exporting

An environment can be exported as a single Docker Compose document — every unit in one file, with
the naming and ordering fadebox would apply. Useful for review, and for running the same stack
outside fadebox.
