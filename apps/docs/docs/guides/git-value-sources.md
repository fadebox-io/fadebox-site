---
title: Git value sources
---

An environment variable or an image tag can point at a value **inside a file in a git repository**
instead of holding a copy of it. Fadebox reads it fresh on every deploy.

This is what keeps a GitOps values file the single source of truth: when a release bumps
`image.tag` in `deploy/values.yaml`, every environment that references it picks the new tag up on
its next deploy. An ordinary release needs no write to Fadebox at all.

## Register a repository

*Project → Settings → Repositories*, as a `maintainer`. Each repository has:

| Field | Meaning |
| --- | --- |
| **Name** | Short slug used in references, e.g. `app-repo`. Unique within the project. |
| **URL** | `https://` clone URL. Only `https` is allowed. |
| **Default ref** | Branch or tag used when a reference does not name one. |
| **Auth token** | Optional token for a private repository. Write-only — accepted, never returned. |

**Test** does a real `ls-remote` against the URL and reports what it found, so credentials and
reachability are verified before a deploy depends on them.

Repositories are per project. A reference can only name a repository of its own project's list.

## Reference syntax

```
{{git:<repo>[@<ref>]:<file-path>#<json-path>}}
```

```yaml
{{git:app-repo:deploy/values.yaml#$.image.tag}}
{{git:app-repo@release-2.4:deploy/values.yaml#$.api.replicas}}
```

- **`repo`** — the repository name you registered.
- **`@ref`** — optional branch or tag, overriding the repository's default ref.
- **`file-path`** — repo-relative path to a **YAML or JSON** file. Both are parsed into the same
  tree, so one JSONPath syntax covers either.
- **`json-path`** — a JSONPath that must resolve to **exactly one scalar**. `#` separates it from
  the file path (JSONPath filters may contain `:`); the first `#` wins.

The **whole value must be a single reference** — you cannot mix literal text and a `{{git:…}}`
placeholder in one value, because the reference resolves to a scalar read out of a file. (The
[instance placeholders](template-authoring.md#values-only-the-instance-knows) are different: those
do interpolate inside a string.)

## Where references can be used

- Environment variable values — on an environment service or in a config.
- **Image tags** — in a config's per-service image tag override. The resolved value is checked
  against Docker's tag grammar, so a values file containing something unexpected fails the deploy
  instead of producing an unparseable image reference.

## The reference builder

Writing these by hand is error-prone, so the env and image-tag editors have a builder: it browses
the repository tree at the chosen ref, then lists the parsed keys of the file you pick, and writes
the reference for you. A **resolve preview** shows what a reference evaluates to right now, without
deploying.

## Failure is loud, never silent

A value that looks like a reference but does not parse is a **hard error**, not a literal passed
through to the container — a typo'd reference must not become a running container with a
placeholder in an environment variable.

At deploy time, an unreachable remote, a missing ref, a missing file, a path that matches nothing
or a path that matches more than one value all fail the deploy. The message carries the full
reference and becomes the instance's error verbatim, so the status panel tells you which reference
broke.

Fadebox keeps a bare-clone cache to make fetches incremental (`FADEBOX_GIT_CACHE_DIR`, on a volume
in the shipped compose file). It is an optimization only: an unreachable remote fails the deploy
and never falls back to stale content. Several references against the same repository and ref cost
one round trip per deploy.

## Limits

- **Fadebox only reads.** Nothing is ever written back to your repository.
- **No drift detection.** Values are read at deploy time, like every other input; changing the file
  does not redeploy anything on its own.
- **Files are not templated.** Injected file *content* cannot yet come from git — only env values
  and image tags.
- **Not a secrets manager.** Git-sourced values are configuration, not a vault.
