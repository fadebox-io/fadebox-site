---
id: intro
title: What is Fadebox?
slug: /
---

**Fadebox is a self-hosted orchestrator for ephemeral environments on Docker.** You describe the
services an application needs as reusable templates, compose them into environments, and spin up as
many isolated, disposable copies of those environments as you need — one per feature branch, per
developer, per demo — each reachable at its own predictable URL like
`https://shop-dev-pr42-web.envs.example.com`, and gone again with one click.

It is built for teams that want preview/staging environments **on their own infrastructure**: a
single app in front of one or more plain Docker daemons. No Kubernetes, no SaaS control plane, no
phone-home — a fresh installation works fully offline.

## How it fits together

- **[Service templates](concepts/templates.md)** — reusable building blocks authored as Docker
  Compose YAML: one service plus its helpers (init containers, sidecars), with healthchecks,
  volumes, and files Fadebox injects at deploy time. Templates are global or scoped to one project.
- **[Environments](concepts/environments.md)** — an environment composes templates into an
  application stack (`postgres` + `backend` + `frontend`) inside a project. It is a pure
  definition; nothing runs yet.
- **[Instances](concepts/instances.md)** — running copies of an environment. Each is isolated by a
  namespace that prefixes containers, networks and volumes, so `pr-42` and `pr-43` of the same
  environment coexist on one host. Deploy, watch container status and logs live, stop, throw away.
- **[Runtimes](concepts/runtimes.md)** — the Docker daemons instances run on: the local socket out
  of the box, or remote daemons over `tcp://` secured with mutual TLS.

## Feature highlights

- **One-click ephemeral environments** — deploy an instance, watch per-container state, health and
  logs live, stop and redeploy at will. The daemon is the source of truth, so running instances
  survive Fadebox restarts.
- **[Name-based ingress](guides/ingress.md)** — mark a service's HTTP port and every instance gets
  a stable URL routed by Traefik. Fadebox installs and manages the ingress stack on each runtime
  host from the UI, including wildcard TLS via Let's Encrypt (DNS-01). Instance URLs can optionally
  require a Fadebox sign-in.
- **Template catalog** — curated, ready-to-import templates ship inside the app (PostgreSQL,
  MariaDB, Redis, RabbitMQ, Keycloak — standalone or PostgreSQL-backed, pgAdmin, Mailpit and a
  `whoami` demo). Import copies an entry into an editable template, globally or into one project,
  with version provenance.
- **[Compose-native authoring](guides/template-authoring.md)** — templates are the Compose subset
  teams already know, including `depends_on` conditions, healthchecks and resource limits. Ad-hoc
  **test runs** let authors verify a template before wiring it into an environment.
- **Multi-runtime, remote-capable** — manage several Docker hosts; remote daemons are reached over
  mTLS with write-only credential handling, and a runtime can be restricted to named projects.
- **[Private registries](guides/private-registries.md)** — a project holds the logins its own
  images pull with, so private images deploy onto a host nobody primed by hand. A runtime can also
  hold host-wide logins for a pull-through mirror; the project's win where both cover a registry.
- **Configs** — named, shared parameterizations of an environment: per-service image tags and
  environment-variable overrides. An instance resolves its config fresh on every deploy.
- **[Git value sources](guides/git-value-sources.md)** — environment variables **and image tags**
  can reference values inside files of a per-project git repository
  (`{{git:app-repo:deploy/values.yaml#$.image.tag}}`, JSONPath over YAML/JSON), resolved fresh on
  every deploy. The GitOps values file stays the single source of truth, and an ordinary release
  needs no write to Fadebox at all. A reference builder browses the repo and its parsed keys, so
  nobody writes placeholders from memory.
- **Single-origin apps** — a service can claim a path instead of a hostname
  (`fadebox.ingress.path: "/api"`, optionally stripped), so an SPA at `/` and its APIs under
  `/api/*` share one instance URL and relative links keep working. Values only the instance knows —
  `{{instance.host}}`, `{{instance.name}}`, `{{ingress.scheme}}` — interpolate into environment
  variables and injected files at deploy time, so a template with an absolute callback URL in it is
  deployable as-is instead of being regenerated per instance.
- **[Command-line client](guides/cli.md)** — a single native binary for pipelines:
  `fadebox instance up pr-123 --wait` creates the instance, deploys it, polls until the containers
  are up and prints its URLs — exiting non-zero with the deploy's own error when it isn't.
- **[Access control](guides/access-control.md)** — global roles (admin / template admin / user)
  plus per-project roles (maintainer ⊃ deployer ⊃ viewer), granted to a project's members directly
  or through groups an identity provider's group claim maps into.
- **[Single sign-on, configured at runtime](guides/oidc-sso.md)** — any number of
  standards-compliant OIDC providers, added and edited in the UI with no restart and no rebuild.
  Form login stays enabled alongside as the break-glass path.
- **Self-hosted by design** — no phone-home, no SaaS control plane, and an opt-in isolation label
  for the rare setup where several Fadebox installations share one Docker daemon.

## Next steps

- [Install Fadebox](getting-started/installation.md) — two containers, one compose file.
- [Deploy your first environment](getting-started/first-environment.md) — from an empty install to
  a running URL.
- [Automate deploys from CI](guides/ci-api-keys.md) with service accounts, API keys and the CLI.
