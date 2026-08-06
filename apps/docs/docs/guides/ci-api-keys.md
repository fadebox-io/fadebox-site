---
title: CI with service accounts & API keys
---

For deploys without a browser session — CI pipelines, scripts — Fadebox has **service accounts**:
users of origin `SERVICE` with roles like anyone else, but no password and no interactive sign-in.
They authenticate exclusively through **API keys** (`Authorization: Bearer fbx_...`), created by a
project maintainer on the project page (or via the API).

## The model

**The account is the key's scope, the key is only the credential**: a key acts with exactly the
account's roles and project memberships, like a signed-in user.

- Creating a key from a project grants the account a project role there (default `deployer` — the
  full instance lifecycle: create, deploy, stop, delete, status, logs).
- A maintainer may only issue or revoke keys for accounts whose entire authority they could have
  granted a colleague — an account with a global role (say `template_admin` for a CI job that
  manages templates) or memberships in other projects is issued its keys by an admin.
- Creating a key without naming an account uses a per-project default (`svc-<project>`),
  auto-created on first use; naming an account shares it across keys and projects.
- Instances created via a key are owned by the service account — every key of the account acts as
  the same creator, so a pipeline's cleanup job can stop what its deploy job started.

The token is shown **exactly once** at creation (only its hash is stored); revoke a key by deleting
it, or disable the whole account by deactivating it.

## Using the key

The [`fadebox` CLI](cli.md) is the intended client — it wraps the deploy loop, exits non-zero when a
deploy fails, and prints the instance URLs:

```bash
export FADEBOX_URL=https://fadebox.example.com
export FADEBOX_TOKEN=$CI_FADEBOX_KEY
export FADEBOX_PROJECT=demo FADEBOX_ENV=dev

fadebox instance up pr-42 --wait
fadebox instance stop pr-42 --wait
```

## The same thing over plain HTTP

The API is ordinary REST, so a pipeline that would rather not ship a binary can do it with `curl`:

```bash
HOST=https://fadebox.example.com
AUTH="Authorization: Bearer $FADEBOX_API_KEY"   # from your CI secret store
P=demo; E=dev; I=pr-42

# create + deploy an instance for this pipeline run
curl -sf -H "$AUTH" -H 'Content-Type: application/json' -d "{\"name\":\"$I\"}" \
  "$HOST/api/projects/$P/environments/$E/instances"
curl -sf -X POST -H "$AUTH" "$HOST/api/projects/$P/environments/$E/instances/$I/deploy"

# wait until it is RUNNING (deploy is async — the call above returns 202 immediately)
until [ "$(curl -sf -H "$AUTH" "$HOST/api/projects/$P/environments/$E/instances/$I/status" \
    | jq -r .status)" = RUNNING ]; do sleep 3; done

# logs of one service, then tear the instance down again
curl -sf -H "$AUTH" "$HOST/api/projects/$P/environments/$E/instances/$I/logs?service=app&tail=200"
curl -sf -X POST -H "$AUTH" "$HOST/api/projects/$P/environments/$E/instances/$I/stop"
curl -sf -X DELETE -H "$AUTH" "$HOST/api/projects/$P/environments/$E/instances/$I"
```

A robust script must also treat a final `ERROR` status as failure instead of looping forever —
which is exactly what the CLI's `--wait` is. `GET .../status` reports `status` plus per-container
detail.

## Where a key can reach

A key is scoped by its **account**, so it sees what that account's roles and memberships reach: the
project list, the cross-project overview and the template catalog all narrow to them, and a `403`
means a missing role, the same as for a person. See [Users, groups and roles](access-control.md).
