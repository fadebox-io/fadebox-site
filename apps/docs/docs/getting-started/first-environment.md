---
title: Your first environment
---

From a freshly [installed](installation.md) Fadebox to a running instance with a URL. About ten
minutes, all of it in the UI.

## 1. Give the runtime an ingress domain

*Settings → Runtimes*. The `local` runtime is already there, pointing at the Docker socket. Open it
and set an **ingress domain** — this is what instance URLs are built under.

You need a wildcard DNS record pointing at the host (`*.envs.example.com → your host`). For a local
try-out there is a shortcut: **`localtest.me`** resolves `*.localtest.me` to `127.0.0.1`, so it
works with zero DNS setup.

Then click **Install** on the ingress stack. Fadebox deploys Traefik and a Docker socket proxy onto
the runtime and shows their status. Leave HTTPS off for a local try-out; for a real domain, see
[Ingress and instance URLs](../guides/ingress.md).

## 2. Import a template

*Catalog*. Import **Whoami (demo)** — a tiny HTTP echo service that exists precisely to prove
routing works — and **PostgreSQL** if you want something with a healthcheck to watch.

Import copies the entry into an ordinary, editable template. Choose **global** scope for now.

## 3. Create a project

*Projects → New project*. Pick a slug like `demo`; it becomes part of every instance URL.

As the admin who created it you are automatically one of its maintainers, so you can run it without
falling back on your global role.

## 4. Compose an environment

Inside the project, create an environment — call it `dev` — and add the templates you imported as
services. Each one becomes an **environment service** whose name is how siblings reach it over the
network and what appears in the container name.

If you added both templates, give `postgres` wave `0` and `whoami` wave `1`, so the database is
healthy before anything else starts. With a single service, leave the waves alone.

Nothing is running yet. An environment is a definition.

## 5. Deploy an instance

Create an instance — name it `pr-42` — pick the `local` runtime, and hit **Deploy**.

The deploy runs in the background. The status panel fills in per-container state and health as they
come up, reading from the Docker daemon rather than from a fadebox-side copy. When it reaches
`RUNNING`, the panel shows the instance's URLs:

```
http://demo-dev-pr-42-whoami.localtest.me
```

Open it. That hostname is `{project}-{environment}-{instance}-{service}` under the runtime's ingress
domain — a single DNS label, which is why one wildcard record covers every instance you will ever
create.

## 6. Do it again

Create a second instance, `pr-43`, from the same environment and deploy it too. Both run on the
same host at the same time: everything each one creates is prefixed with its own namespace, so
there is nothing to collide.

Stop one, redeploy it, throw it away. Deleting requires stopping first.

## Where to go next

- **[Author your own template](../guides/template-authoring.md)** — the Compose subset, the ingress
  directives, injected files and instance placeholders.
- **[Configs](../concepts/environments.md#configs)** — parameterize the environment with per-service
  image tags instead of editing it per deploy.
- **[Automate it](../guides/cli.md)** — the same flow from a pipeline, in one command.
