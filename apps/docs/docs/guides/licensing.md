---
title: Licensing
---

Fadebox is commercial software with a Free tier — no license key, no
registration. Paid tiers are unlocked by a **license file**: a signed token you paste into
**Administration → License**. Verification is a local signature check — **nothing ever leaves your host**. There is
no activation server, no phone-home and no telemetry; a fully air-gapped installation licenses
exactly the same way as any other.

## Tiers

**Features are free, scale is paid, compliance is Enterprise.** The Free tier is the whole product —
[private registries](private-registries.md), [git value sources](git-value-sources.md),
[OIDC single sign-on](oidc-sso.md), [groups and project roles](access-control.md), remote
runtimes over mTLS, the CLI — with caps on scale. You pay when you are a team; Enterprise adds
the features auditors ask about. Current prices are on the pricing page; the mechanics:

| | **Free** | **Team** | **Enterprise** |
| --- | --- | --- | --- |
| Runtimes (Docker hosts) | 1 | 5 | unlimited |
| Concurrent running instances, per runtime | 5 | 20 | unlimited |
| Users | 5 (+3 service accounts) | unlimited | unlimited |
| Every product feature | ✅ | ✅ | ✅ |
| IdP group → role mapping | — | — | ✅ |

No tier counts what you build: projects, environments, templates, registry logins, git
repositories, per-user configuration and lifetime instances created are never limited. API keys
are never limited either — capping CI robots would tax exactly the workflow Fadebox exists for.

The Free tier needs no license file at all. "Users" counts active, human accounts; deactivating an
account frees its seat, and service accounts have their own allowance.

## Your installation ID

Every installation generates a random identity at first startup, shown in **Administration → License**.
A license is issued *for* that ID — you will be asked for it when purchasing.

The ID lives in the database, so it **survives backups, restores, upgrades and host moves**. Only
a fresh, empty database mints a new one. If you rebuilt an installation from scratch rather than
from a backup, contact support with the new ID for a free reissue.

A license applied to a *different* installation than it was issued for still works — Fadebox
never punishes you for an infrastructure event — but the License page will permanently show which
installation it belongs to. One license covers one installation; run more, buy more.

## Applying a license

**Administration → License → paste the token → Apply.** The page shows what the license contains
(customer, tier, limits, update horizon) before anything changes, and always shows your current
usage against the limits — you will never discover a cap by being refused. An invalid token is
refused with the exact reason and changes nothing. Admins can automate the same flow over the
API (`GET`/`PUT`/`DELETE /api/license`).

**Infrastructure-as-code installs** can provide the token at startup instead of pasting it:

```yaml
environment:
  FADEBOX_LICENSE: "<token>"
  # or a file holding it (set one of the two, not both):
  FADEBOX_LICENSE_PATH: /run/secrets/fadebox-license
```

A license pasted in the UI takes precedence over a config-provided one. Pick one channel per
installation — the License page warns when a newer config-provided license is being shadowed by an older
pasted one, and removing the pasted license lets the config one apply again.

## What enforcement does — and deliberately does not do

Limits are checked **only when you create or deploy something new**: adding a runtime, deploying
an instance, creating a user. A refusal names the limit and your current usage. Everything else
is never gated:

- **Running instances are never stopped or killed** — not on overage, not on a lapsed renewal,
  not ever.
- **Reading, stopping, deleting and redeploying what you already have always works.**
- **Downgrades are non-destructive.** Remove a license or drop a tier and everything stays and
  keeps running; you just can't add more until you are back under the caps. Already-configured
  Enterprise features (IdP group mappings) **keep working** too; only adding or changing such
  configuration requires the tier.

## Renewal, and what "expiry" means

A license never stops working. Instead of an expiry date it carries an **update horizon**: it
covers every Fadebox release published before that date, forever. Letting a license lapse means
staying on the releases it covers — everything you paid for keeps every feature, with no grace
periods and no degradation.

What requires renewal is **upgrading** to a release published after the horizon: such a build
refuses to start with a message naming both dates — apply the renewed license, or go back to the
previous release. Renewing issues a new file with a later horizon; paste it over the old one.
The License page shows *updates covered until \<date\>*, so renewal is a calendar item, not a surprise.

## Troubleshooting

| Message | Meaning | What to do |
| --- | --- | --- |
| *License not applied (…) — running as the Free tier* | The stored token failed verification: a corrupted paste, a truncated file, or a build too old to know the license's signing key. | Re-paste from the original file; upgrade Fadebox first if the license is newer than the build. |
| *Issued to a different installation* | The license works, but it was issued for another installation's ID. | Expected after rebuilding on an empty database — request a reissue for the new ID. |
| *A newer config-provided license is being shadowed* | The pasted license takes precedence over a newer `FADEBOX_LICENSE`. | Remove the pasted license on the License page to let the config-provided one apply. |
| Startup fails: release not covered by the license | The binary is newer than the license's update horizon. | Apply the renewed license, or run the previous release. |
| Startup fails: both `FADEBOX_LICENSE` and `FADEBOX_LICENSE_PATH` are set | The two config channels are exclusive. | Keep one. |
| Startup fails: cannot read `FADEBOX_LICENSE_PATH` | The configured file is missing or unreadable. | Fix the mount or path — config pointing nowhere is treated as a deployment error, unlike a token that merely fails to verify. |

## Privacy

Licensing reads a file and verifies a signature against a public key baked into the binary.
Fadebox makes no network calls for licensing — nothing is reported, counted or sent anywhere, on
any tier, ever.
