---
title: API keys — for CI, and for you
---

Anything that talks to Fadebox without a browser session authenticates with an **API key**
(`Authorization: Bearer fbx_...`). There are two kinds, and which you want depends on whether the
thing acting is a pipeline or a person.

- A **service-account key** is for CI. A service account is a user of origin `SERVICE` with roles
  like anyone else, but no password and no interactive sign-in; a project maintainer creates its
  keys on the project page (or via the API). Instances it deploys are owned by the account, not by
  whoever clicked the button.
- A **personal key** is your own credential, for the CLI on your machine and for one-off scripts.
  You create it under *Settings → API Keys*, and it acts as **you**. See
  [Your own keys](#your-own-keys).

Both are `fbx_` tokens, both are shown exactly once, and both follow the same rule below.

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

### Expiry

A key can be given a lifetime — 30 days, 90 days, a year — after which it stops authenticating.
The key stays in the list, marked expired, so a pipeline that suddenly fails has a visible cause
rather than a mystery.

Expiry is **optional, and CI keys default to not having one**. A key sitting in a secret store
that quietly lapses breaks a deploy for whoever happens to be on call, so committing to a rotation
schedule should be a decision rather than a default. Personal keys default the other way, to 90
days — they live on laptops.

## Your own keys

*Settings → API Keys* issues a key for your own account. It carries exactly what you carry: the
same global roles, the same projects, the same everything. That is the whole model — there is no
narrower key, and no way to make one do less than you can.

Three consequences worth knowing before you create one:

- **Only you can issue one, and only you can revoke one.** Not a project maintainer, not an admin.
  A key that acted as someone else would put their name on every request it made, so the route to
  issue one simply doesn't exist. What an admin *can* do is deactivate your account or force a
  password reset — either one refuses every key you hold, from the next request onwards, and both
  are reversible.
- **A key cannot create another key.** If you try, through either the personal or the project
  route, you get a `403` and a message saying to sign in. This is why a leaked token cannot quietly
  grow itself a replacement that survives revoking the original.
- **Group changes from your identity provider reach a key only after you next sign in.** A key
  reads the roles stored in Fadebox, and those refresh at interactive sign-in. Anything changed in
  Fadebox itself — a revoked role, a deactivated account — applies on the very next request.

If you sign in through SSO you have no password, so a personal key is how you use the
[CLI](cli.md) at all.

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
which is exactly what the CLI's `--wait` is. `GET .../status` reports `status` plus `containers`,
keyed by service — `.containers.web.urls[0]` is the preview URL of the `web` service.

## Where a key can reach

A key is scoped by its **account**, so it sees what that account's roles and memberships reach: the
project list, the cross-project overview and the template catalog all narrow to them, and a `403`
means a missing role, the same as for a person. See [Users, groups and roles](access-control.md).
