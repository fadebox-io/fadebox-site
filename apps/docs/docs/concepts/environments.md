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

## Instance lifetime

**Instance lifetime** in the environment editor sets how long this environment's instances run
after their last deploy. It takes humane values — `7d`, `12h`, `90m`. Empty inherits the
installation default of seven days; `0` means never expire. Over the API the field is
`ttlSeconds` on the environment update call, an integer number of seconds, where `null` inherits
and `0` is never.

A change applies **from the next deploy or extend** — instances already running keep the expiry
they were stamped with. Cloning an environment copies its lifetime along with the rest of the
definition. What happens when the time runs out is [an instance matter](instances.md#expiry): the
instance is stopped, never deleted.

## Cloning

Cloning copies an environment's **definition** under a new slug — services, image tags,
environment-variable overrides, waves, injected files and shared variables. Instances are never
copied; they stay with the original, and neither is the [blueprint](#blueprints) flag.

This is how a second version stream is made: clone `dev` to `dev-v2`, then edit the tags. The
variation is named and visible in the environment list, instead of hidden in per-instance
parameters. In the dialog, typing a name suggests the slug; from a pipeline it is one call —
`fadebox env clone dev dev-v2`.

## Blueprints

An environment can be marked a **blueprint**: a definition kept to be cloned from and never
deployed. Creating an instance of one is refused, so a blueprint is the environment you can improve
freely, knowing nothing is running from it.

The problem it solves shows up once a team clones regularly. The environment everyone copies —
call it `base` — is an ordinary environment, so it can also be deployed, and over time it collects
instances of its own. Now editing it to improve the next clone risks disturbing something live, and
the "canonical" environment is only canonical by convention. Marking it a blueprint makes that
convention a rule.

Three things follow from it, and the third is the one worth remembering:

- **Instances are refused.** The *New instance* button is gone in the UI; over the API and the CLI
  the call answers `409` with *"… is a blueprint — clone it to deploy"*.
- **The flag can only be set while the environment has no instances**, because that is exactly what
  it promises. If it still has some, the save is refused and tells you how many; delete them first.
  Clearing the flag has no such condition — a blueprint you decide you want to run just becomes an
  ordinary environment again.
- **Clones are deployable.** A clone does *not* inherit the flag, which is the whole point: cloning
  is how a blueprint gets used. `fadebox env clone base dev` gives you a `dev` you can deploy
  immediately. When you genuinely want a second base — forking `base` into `base-eu` — the clone
  dialog offers a checkbox to make the copy a blueprint too, which is safer than cloning and then
  editing, since it leaves no moment where the copy is deployable.

Set it with the **Blueprint** checkbox in the environment editor, or `blueprint: true` on the
create, update and clone API calls. Blueprints carry a `blueprint` badge in the environment list
and on the environment page, and a `blueprint` value in the `KIND` column of `fadebox env list`.

Everything else about a blueprint is an ordinary environment: it holds services, image tags, shared
variables and files, and it can be [exported](#exporting) as Compose like any other.

## Exporting

An environment can be exported as a standalone Docker Compose project, with the naming and
ordering fadebox would apply: plain YAML when it has no injected files, otherwise a zip of
`docker-compose.yaml` plus the bind-mounted `files/`. Useful for review, and for running the same
stack outside fadebox.

[Service references](../guides/template-authoring.md#values-another-service-owns) are
**resolved in the export**: the environment's definition holds everything they need, so
`{{service.db.host}}` comes out as `db` and `{{service.db.env.POSTGRES_PASSWORD}}` as the actual
value — the exported file runs. What has no resolver outside fadebox — `{{git:…}}` image tags,
instance placeholders, and a service reference whose provider is missing or whose value is itself
such a placeholder — comes out **verbatim**, under a header comment saying to replace it with a
literal before running the file, never silently substituted with something the environment didn't
say. Output stays deterministic either way, which is what makes diffing an export against a
committed golden file a usable drift check.
