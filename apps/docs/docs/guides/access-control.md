---
title: Users, groups and roles
---

Fadebox has two kinds of role. **Global roles** are platform-wide and live on the user account.
**Project roles** apply inside one project and are granted through **groups**.

## Global roles

<Tier level="team" />

Free covers five people — only active accounts count, so deactivating one frees a seat. See
[Licensing](licensing.md#tiers).

| Role | What it allows |
| --- | --- |
| `user` | The baseline every account has. On its own it grants no access to any project — you see only what a project role gives you. |
| `template_admin` | Create, edit and delete templates, and start template test runs. |
| `admin` | Everything. Manages users, groups, identity providers and runtimes; creates and deletes projects; and **bypasses project roles** — an admin has full authority in every project. |

Admins assign global roles under *Users*. New accounts — including those auto-provisioned by an
[OIDC provider](oidc-sso.md) — start as `user`.

## Project roles

Inside a project the roles are hierarchical: **maintainer ⊃ deployer ⊃ viewer**. Holding
`maintainer` implies everything `deployer` may do, which implies everything `viewer` may do.

| | viewer | deployer | maintainer |
| --- | :---: | :---: | :---: |
| See the project, its environments and instances | ● | ● | ● |
| Read repositories and registry entries | ● | ● | ● |
| Create, deploy, stop and delete instances | | ● | ● |
| Read instance status and logs | ● | ● | ● |
| Create, edit and clone environments — services, waves, image tags, shared variables, files | | | ● |
| Manage git repositories and registry credentials | | | ● |
| Manage members and API keys | | | ● |

Creating a project is a global-admin act — you cannot be a member of a project that does not exist
yet. The admin who creates one is seeded into its maintainers, so they can run it afterwards
without using their global role.

## Groups are how project roles are granted

A **group** is a set of people. What a group *grants* is a set of edges of the form "every member
of this group holds *role* in *project*". Users are never granted a project role directly — the
grant always runs through a group, which is what makes an org-wide directory usable as the source
of truth.

Membership comes from one of two places:

- **Manual** — an admin adds the user to the group.
- **A claim mapping** — an OIDC sign-in whose group claim carried a value the group maps.

### Two ways to work with the same machinery

**From the project** — *Project → Settings → Members*. A maintainer starts typing a name, email or
group and picks from the matches, then chooses a role — no need to know a username or a group slug
by heart. The search runs on the server and reaches accounts and groups that are *not* in the
project yet, which is why it is a maintainer's to use rather than any member's. Behind the scenes the project owns a canonical group per role, and the member is added to it;
you never have to think about groups to run a project. Rows that came from a shared org group or
from an SSO sync appear here read-only — revoking them belongs where they were granted.

**From the platform** — *Access → Groups*, as an admin. This is where you create groups that span
projects (`platform-team`, `qa`), give them roles in several projects at once, and attach claim
mappings.

## Passwords

A password the account holder did not choose is temporary. That covers the generated bootstrap
password, an account an admin creates with a password typed into the form, and an admin resetting
somebody's password. Until it is replaced, the account can reach exactly one thing — the password
form — and everything else answers `403`; the create-user form says as much, so an admin knows
what they are handing over.

Replacing it needs the current password, and clearing the flag frees the **session already open**,
so nobody has to sign in twice. A user who cannot produce the current password can still sign out
from that screen rather than being stuck on a dead session.

Changing your own password lives at *Settings → Account*. It appears only for accounts that have a
password here at all: a federated user's credentials belong to their identity provider, and a
service account has none, so both see a sentence saying where the credential lives instead of a
form that could not work.

An account locked this way also cannot authenticate with an [API key](ci-api-keys.md), and cannot
create one — which makes forcing a reset a way to contain an account without deleting it.

## Mapping identity-provider groups

<Tier level="enterprise" />

A claim mapping puts everyone whose token carries a given value into a Fadebox group.
Attaching claim mappings is an [Enterprise feature](licensing.md#tiers); everything else on this
page — groups, project roles, manual membership — is available on every tier.

A mapping always names **which provider** asserted the value. This matters: a bare claim value
would be global, so `engineering` emitted by a contractor's directory would land in the same group
as `engineering` from your corporate one — and that group carries project role grants. Scoping the
match to the provider the token was verified against means an outside directory administrator
cannot mint membership in your groups.

A group with no claim mappings can only be filled by hand, which includes every canonical group a
project's Members view creates. The invariant throughout: **a claim can only place you in a group
an admin defined, and only an admin decides what that group grants.**

:::note

Group membership from a sign-in is recomputed on each request of a signed-in SSO user, so removing
someone from a directory group takes effect on their next request — you do not have to wait for a
session to expire.

:::

## Service accounts

<Tier level="team" />

Free covers three service accounts, an allowance separate from the one for people. See
[Licensing](licensing.md#tiers).

CI pipelines authenticate as **service accounts**: accounts with roles and memberships like anyone
else, but with no password and no interactive sign-in. They hold
[API keys](ci-api-keys.md) instead.

A key is not only a service-account thing: you can issue one for your own account too, and it
carries exactly your roles and projects. Only you can create or revoke it — see
[Your own keys](ci-api-keys.md#your-own-keys).
