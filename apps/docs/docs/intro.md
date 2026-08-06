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

- **Service templates** — reusable building blocks authored as Docker Compose YAML: one primary
  container plus its helpers (init containers, sidecars), with healthchecks, volumes, and files
  Fadebox injects at deploy time. Templates are global or scoped to a single project.
- **Projects & environments** — an environment composes templates into an application stack
  (`postgres` + `backend` + `frontend`). It is a pure definition; nothing runs yet.
- **Instances** — running copies of an environment on a chosen runtime. Instances are isolated by a
  namespace that prefixes containers, networks and volumes, so `pr-42` and `pr-43` of the same
  environment coexist on one host. Deploy, watch live container status and logs, stop, throw away.
- **Runtimes** — the Docker daemons instances run on: the local socket out of the box, or remote
  daemons over `tcp://` secured with mutual TLS.

## Feature highlights

- **One-click ephemeral environments** — deploy an instance, watch per-container state, health and
  logs live, stop and redeploy at will; the daemon is the source of truth, so running instances
  survive Fadebox restarts.
- **Name-based ingress** — mark a service's HTTP port and every instance gets a stable URL
  (`{instance}-{service}.{your-domain}`) routed by Traefik. Fadebox installs and manages the ingress
  stack on each runtime host from the UI, including wildcard TLS via Let's Encrypt (DNS-01).
  Environment URLs can optionally require a Fadebox sign-in.
- **Template catalog** — curated, ready-to-import templates ship inside the app (PostgreSQL, Redis,
  RabbitMQ, Keycloak, Mailpit, a whoami demo). Import copies an entry into an editable template —
  globally or into one project — with version provenance.
- **Compose-native authoring** — templates are written as the Docker Compose subset teams already
  know, including `depends_on` conditions for init containers, healthchecks and resource limits;
  ad-hoc **test runs** let authors verify a template before wiring it into an environment.
- **Multi-runtime, remote-capable** — manage several Docker hosts; remote daemons are reached over
  mTLS with write-only credential handling.
- **Private registries** — a project holds the logins its own images pull with
  (maintainer-managed, password write-only), so private images deploy onto a host nobody primed by
  hand. A runtime can also hold host-wide logins for a pull-through mirror; the project's win where
  both cover a registry.
- **Per-user configs** — users can override images/env vars of an environment privately (e.g. "this
  environment, but with my branch's image tag").
- **Git value sources** — env vars **and image tags** can reference values inside files of a
  per-project git repository (`{{git:app-repo:deploy/values.yaml#$.image.tag}}`, JSONPath over
  YAML/JSON), resolved fresh on every deploy — the GitOps values file stays the single source of
  truth, and an ordinary release needs no write to Fadebox at all. A reference builder in the env
  and image-tag editors browses the repo and its parsed keys, so nobody writes placeholders from
  memory.
- **Single-origin apps** — a service can claim a path instead of a hostname
  (`fadebox.ingress.path: "/api"`, optionally stripped), so an SPA at `/` and its APIs under
  `/api/*` share one instance URL and relative links keep working. Values only the instance knows —
  `{{instance.host}}`, `{{instance.name}}`, `{{ingress.scheme}}` — interpolate into env vars and
  injected files at deploy time, so a template with an absolute callback URL or an OIDC issuer in
  it is deployable as-is instead of being regenerated per instance.
- **Self-hosted by design** — role-based access (admin / template admin / user), a bootstrap admin
  created on first start with a generated password in the log, optional OIDC single sign-on against
  any standards-compliant IdP, and an opt-in isolation label for the rare setup where several
  Fadebox installations share one Docker daemon.

## Next steps

- [Install Fadebox](getting-started/installation.md) — two containers, one compose file.
- [Enable OIDC single sign-on](guides/oidc-sso.md) against your identity provider.
- [Automate deploys from CI](guides/ci-api-keys.md) with service accounts and API keys.
