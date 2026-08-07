---
title: Service templates
---

A **service template** is one service plus its helpers, written as a Docker Compose document.
Templates are the reusable building blocks: an environment is assembled by wiring templates
together, and nothing runs until an instance of that environment is deployed.

## A template provides exactly one service

A template's compose document may contain several containers, but exactly one of them is the
**main** service — the thing the template provides, and the one whose name the template contributes
to an environment. Every other container must declare what it is, with the `fadebox.role` label:

| `fadebox.role` | Meaning |
| --- | --- |
| *(absent, or `main`)* | The main service. Exactly one per template. |
| `init` | A run-once helper. Restart is forced off, the next wave waits for it to complete, and readiness counts it done only when it exits `0`. |
| `sidecar` | A long-running companion — a log shipper, a proxy, a metrics exporter. |

Saving a template with zero or several role-less services is rejected with a message naming them.
The rule exists so that reading the YAML always tells you what each container is for, and so that
"add this template to my environment" adds one predictable service name rather than an unknown
number of them.

Two peer services — an API and a database — are **two templates** composed in an environment, not
one template with two role-less services.

```yaml
services:
  app:                              # main: no fadebox.role label
    image: registry.example.com/shop/api:1.4.0
    labels:
      fadebox.ingress.port: "8080"
    depends_on:
      migrate:
        condition: service_completed_successfully

  migrate:
    image: registry.example.com/shop/api:1.4.0
    command: ["./migrate.sh"]
    labels:
      fadebox.role: init
```

## Naming inside an instance

When an environment service built from this template is deployed, containers are named
`{namespace}-{serviceName}` for the main service and `{namespace}-{serviceName}-{helper}` for its
helpers, where the namespace is `{project}-{environment}-{instance}`.

Within the instance, services reach each other **by their environment service name** — the same
way they would in a plain compose file. A template referencing `postgres:5432` works as long as the
environment has a service called `postgres`.

## Scope: global or project

A template is either **global** (visible to every project) or scoped to **one project**. Names are
unique within a scope, so `shop/api` and `billing/api` can coexist, and a project may keep its own
`postgres` alongside the global one. The environment composer lists global templates plus the
project's own.

Environments reference templates by identity, not by name, so scoping only affects what you can
see and pick — it never changes how a deployed instance resolves anything.

## The catalog

Ready-made templates ship inside the application and are browsable under *Catalog* with no network
access required — databases (PostgreSQL, MySQL, MariaDB, SQL Server, MongoDB, Redis), messaging
(RabbitMQ, Kafka), Keycloak (standalone or PostgreSQL-backed), search and storage (OpenSearch,
Elasticsearch, MinIO), cloud emulators (LocalStack, Azurite) and dev tools (WireMock, pgAdmin,
Mailpit and a `whoami` demo).

Importing an entry **copies** it into an ordinary, editable template — globally or into one project,
your choice at import time. There is no live coupling: the copy records which catalog entry and
version it came from, and nothing about it ever changes on its own.

When the catalog later carries a newer version of that entry, the copy's row on the Templates page
shows an **update hint** (“v1.1.0 available”), and *Update from catalog* re-imports the entry in
place: the template's spec, files and description follow the catalog, its name and slug stay
yours. It is explicit and confirmed — local edits to the copy are overwritten, and nothing ever
updates automatically.

The copy's **name and slug are yours to set** in the import dialog; they default to the entry's.
Since template names are unique per scope, renaming is what lets one entry land twice in the same
scope — import PostgreSQL as `postgres` and again as `postgres-analytics`, tune each copy
separately. Provenance still records the entry either way, so a renamed copy remains recognisable
as a copy of it.

### Well-known endpoints

Catalog entries are built to connect to each other by convention. Inside an instance every
container answers to its **service name**, so as long as you add a provider under its default
name, any entry (or template of your own) can reach it at the address below — with the throwaway
development credentials each entry ships:

| Entry | Address | Credentials |
|---|---|---|
| PostgreSQL | `postgres:5432` | `postgres` / `postgres`, database `postgres` |
| MySQL | `mysql:3306` | `root` / `root` — or `mysql` / `mysql`, database `app` |
| MariaDB | `mariadb:3306` | `mariadb` / `mariadb` (root: `mariadb`), database `mariadb` |
| SQL Server | `mssql:1433` | `sa` / `Passw0rd!` |
| MongoDB | `mongodb:27017` | `mongo` / `mongo` |
| Redis | `redis:6379` | no auth |
| RabbitMQ | `rabbitmq:5672` | `guest` / `guest` |
| Kafka | `kafka:9092` | plaintext, no auth |
| Keycloak | `keycloak:8080` | admin `admin` / `admin` |
| OpenSearch | `opensearch:9200` | security disabled |
| Elasticsearch | `elasticsearch:9200` | security disabled |
| MinIO | `minio:9000` (S3 API) | `minioadmin` / `minioadmin` |
| LocalStack | `localstack:4566` | any AWS key pair |
| Azurite | `azurite:10000/10001/10002` | standard `devstoreaccount1` account |
| WireMock | `wiremock:8080` | — |
| Mailpit | `mailpit:1025` (SMTP) | no auth |

Consumer entries carry
[service references](../guides/template-authoring.md#values-another-service-owns) for these
connections — Keycloak (PostgreSQL) reaches its database as `{{service.postgres.host}}` and reads
its credentials from the postgres service — so a missing provider fails the deploy with a message
naming both sides, and overriding the provider's credentials rewires every consumer. Such entries
declare their pairing: the catalog card shows a **pairs with** badge, and the import dialog
reminds you to import the provider too and add both to the environment, the provider in an
earlier wave. Renaming a
service on add (or importing an entry under another slug) moves it off its well-known address;
override the consumer's references in the environment to point at the new name. Kafka is the
strictest case: its advertised listener hardcodes `kafka`, so keep it under that name.

These are development defaults, stated in each entry's description on purpose — override them at
the environment level for anything shared or long-lived.

## Next

- [Authoring a template](../guides/template-authoring.md) — the supported Compose subset, injected
  files, ingress directives and test runs.
- [Environments](environments.md) — composing templates into a stack.
