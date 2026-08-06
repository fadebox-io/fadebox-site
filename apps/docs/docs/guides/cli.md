---
title: The fadebox CLI
---

`fadebox` is a single native binary that drives the same API the UI does, authenticating with an
[API key](ci-api-keys.md). It exists for pipelines: the useful half is not wrapping REST calls, it
is the **deploy loop** — deploy is asynchronous, so anything that gates a build on an environment
coming up has to poll, decide what counts as success, and report why it failed.

## Install

Download `fadebox-linux-amd64` from the latest release and put it on your `PATH`:

```bash
curl -fsSL -o fadebox <release-asset-url>
chmod +x fadebox
sudo mv fadebox /usr/local/bin/fadebox
```

It is a native binary with no runtime dependency — nothing to install alongside it.

## Connect

`login` verifies a key against a server and stores it as a **context**:

```bash
fadebox login --url https://fadebox.example.com --project demo --env dev
```

It prompts for the key so it does not land in your shell history, calls `/api/me` to confirm it
works, and writes `~/.config/fadebox/config.yaml` — created with mode `0600` before anything is
written to it, so the token never touches disk world-readable.

Contexts are named, so one machine can talk to several installations:

```bash
fadebox context list
fadebox context use staging
fadebox context current
```

**In CI, write no file at all.** Every setting resolves flag → environment variable → context file:

| Flag | Environment variable |
| --- | --- |
| `--url` | `FADEBOX_URL` |
| `--token` | `FADEBOX_TOKEN` |
| `-p`, `--project` | `FADEBOX_PROJECT` |
| `-e`, `--env` | `FADEBOX_ENV` |

`FADEBOX_CONFIG_DIR` relocates the context file if you do want one.

## The deploy loop

```bash
fadebox instance up pr-123 --config run-8842 --wait --timeout 10m
```

- **`up` is find-or-create.** If an instance with that slug exists it is reused and redeployed;
  otherwise it is created first. `instance create` stays strict by comparison — the API
  disambiguates a repeated name into `pr-123-2` rather than failing, which is right for a UI and a
  quiet duplicate-per-retry for a pipeline.
- **`--wait`** polls status and renders per-container state and health as they come up. It exits
  `0` on `RUNNING` and `1` on `ERROR`, printing the failure reason the UI would show — otherwise
  only reachable by having a human open the UI.
- **`--timeout`** (default `10m`) and **`--poll-interval`** (default `2s`) bound the wait. They
  accept `90s`, `10m` and the like.
- **On success it prints the instance's URLs**, taken from the deployed containers.
- `--config` and `--runtime` apply **on create only** — an existing instance keeps the config it
  was created with.

`--wait` is available on `up`, `deploy` and `stop`.

## Command surface

| | |
| --- | --- |
| `fadebox login` | Verify a key and store a context. |
| `fadebox context list \| use \| current` | Switch between installations. |
| `fadebox env list \| get` | Environments of the project. |
| `fadebox config list \| get \| create \| delete` | Configs of the environment. |
| `fadebox instance list \| get \| create \| up \| deploy \| stop \| delete` | The instance lifecycle. |
| `fadebox instance status \| logs` | Live state and a log snapshot. |
| `fadebox template list \| get` | Templates visible to the key's account. |
| `fadebox runtime list` | Runtimes; narrowed to those the project may deploy onto. |

Every command reaches exactly as far as the key's account does — a `403` means a missing role,
exactly as it would for a person.

## Output and exit codes

`-o table` (default), `-o json`, `-o yaml`, and `-o url` on instance commands, which prints the
instance's URLs one per line and nothing else — a merge-request comment becomes a one-liner.

`--wait` writes its live container progress to **stderr**, and only the final result to stdout. So
`URL=$(fadebox instance up pr-123 --wait -o url)` captures the URLs alone while you still watch the
deploy happen in the job log.

| Exit code | Meaning |
| --- | --- |
| `0` | Success. |
| `1` | The operation failed — a deploy that ended in `ERROR`, or any 4xx/5xx. |
| `2` | Usage error. |

Conflicts arrive as plain text and are printed as such: *"Instance is RUNNING — stop it before
deleting"* is the message, not the status line.

## A pipeline

```bash
export FADEBOX_URL=https://fadebox.example.com
export FADEBOX_TOKEN=$CI_FADEBOX_KEY      # from your CI secret store
export FADEBOX_PROJECT=demo FADEBOX_ENV=dev

# pin this run's images, then bring the instance up and wait for it
fadebox config create "run-$CI_PIPELINE_ID" \
  --image-tag api=$CI_COMMIT_SHA --image-tag web=$CI_COMMIT_SHA

URL=$(fadebox instance up "pr-$CI_MERGE_REQUEST_IID" \
        --config "run-$CI_PIPELINE_ID" --wait -o url)
echo "Preview: $URL"

# … run the tests against $URL …

fadebox instance stop "pr-$CI_MERGE_REQUEST_IID" --wait
fadebox instance delete "pr-$CI_MERGE_REQUEST_IID"
```

If the deploy fails, `instance up --wait` exits `1` with the reason and the pipeline stops there.

## Not yet

- **`logs` is a snapshot, not a stream.** `-f` would mean polling and de-duplicating a tail window,
  which is wrong at the edges; it waits for a streaming endpoint rather than being faked.
- **No `apply`.** Pushing a directory of template and environment manifests into an installation is
  designed but unbuilt; today the CLI creates instances and configs, not templates and environments.
- **Linux amd64 only** as a published binary.
