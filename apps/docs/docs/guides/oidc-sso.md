---
title: OIDC single sign-on
---

Fadebox accepts interactive sign-ins two ways, both server-side and cookie-based:

- **Form login** — username/password against the local user database. Always enabled and not
  disableable: a misconfigured identity provider must never lock everyone out of the installation.
- **OIDC single sign-on** — any number of standards-compliant providers (Keycloak, Entra ID,
  Auth0, Okta, …), added and edited **at runtime**.

Providers are data, not deployment configuration. Each one is a row an admin creates in the UI;
adding, editing or disabling one takes effect on the next request, with **no environment
variables, no restart and no rebuild**. With no provider configured, the sign-in page shows only
the password form.

:::info Upgrading from an earlier build?

Fadebox used to take a single provider from `QUARKUS_OIDC_*` and `FADEBOX_SECURITY_OIDC_*`
environment variables. Those no longer exist — delete them from your compose file and re-create the
provider under *Access → Identity Providers*. The callback URL also changed: it is now
per-provider, `…/oidc/callback/{slug}`.

:::

## Add a provider

*Access → Identity Providers → Add provider*, as a global admin. The same catalog is available over
the API at `/api/admin/oidc-providers`.

| Field | Meaning |
| --- | --- |
| **Slug** | Short identifier such as `corp`. It becomes part of the login and callback URLs *and* of the session cookie name, so it is **immutable** once created — renaming would orphan every live session. |
| **Display name** | Label of the sign-in button, e.g. `Acme SSO`. |
| **Issuer** | The provider's issuer URL, e.g. `https://idp.example.com/realms/acme`. Fadebox fetches the OIDC discovery document from it. `https` only. |
| **Client ID** and **Client secret** | A **confidential** client registered at the provider. The secret is write-only: the API accepts it and never returns it. |
| **Scopes** | Requested scopes; defaults to `profile,email`. |
| **Groups claim** | Which token claim carries group values. Defaults to `groups`; providers disagree, so this is per provider. |
| **Link by verified email** | Off by default. See [Account linking](#account-linking) below. |
| **Auto-provision** | On by default: create a local account on first sign-in. |
| **Enabled** | A disabled provider shows no button and its slug returns 404. The row survives, so accounts that signed in through it keep resolving. |

## Register the client at your provider

Per provider, using its slug:

| | |
| --- | --- |
| Redirect URI | `https://<your-fadebox-host>/oidc/callback/<slug>` |
| Post-logout redirect URI | `https://<your-fadebox-host>/sign-in` |
| Client type | Confidential (a client secret is required) |
| Scopes | At least `profile` and `email` — `preferred_username` and `email` drive account resolution |

Fadebox runs the **authorization-code flow server-side**, one Quarkus tenant per provider: tokens
never reach the browser, and the session lives in an encrypted `q_session_<slug>` cookie. Sign-out
is RP-initiated — it clears the Fadebox session and ends the provider session.

## Account linking

Identity and permissions are anchored in the **local** user table. The provider proves who you are;
what you may do always comes from your Fadebox account and its groups — never from the token.

A sign-in resolves to an account in this order:

1. **By provider + subject**, from a previous sign-in through the same provider. Never by the bare
   `sub` claim: `sub` is unique only within its own issuer, so with several providers configured,
   matching on it alone would let one provider sign its users in as another's.
2. **By verified email**, *only if* **Link by verified email** is on for that provider and the token
   carries `email_verified: true`. The account gains a permanent identity link.
3. **Auto-provision**, if it is on for that provider — a new password-less account with the global
   role `user`. The username comes from `preferred_username`, falling back to the email address and
   then to `oidc-<subject>`; a clash with an unrelated local account gets a `-2`, `-3`, … suffix.

If none of the three applies — an unknown user at a provider with auto-provisioning off — the
sign-in is rejected, which is what a closed deployment wants.

:::caution Link by verified email is off by default

The provider decides its own `email_verified` value. If you federate an identity provider you do
not operate — a contractor or partner directory — its administrator could claim any Fadebox account
by setting an address and marking it verified. Turn this on only for a provider you control.

:::

Inactive accounts are rejected. Password-less (federated-only) accounts cannot use form login.

## Mapping groups to permissions

A provider's group claim can place users into Fadebox groups, which is how an SSO login arrives
with project permissions already granted. Claim mappings name **which provider** asserted the
value, so `engineering` from a partner directory cannot enter the group that `engineering` from
your corporate directory enters. See [Access control](access-control.md).

## Running several Fadebox instances

Nothing notifies one running instance that another wrote a provider row, so each re-reads the
catalog periodically. `FADEBOX_SECURITY_OIDC_REGISTRY_REFRESH_INTERVAL` (default `60s`) bounds how
stale an edit made elsewhere may be; a write on the instance you are using applies immediately.

## Troubleshooting

**The button does not appear.** The provider is disabled, or the sign-in page was loaded before it
was created — the list comes from `/api/public/auth-config`, which returns only the slug and
display name of enabled providers.

**Sign-in fails with an issuer error.** Fadebox fetches the discovery document from the issuer URL
at first use. Check that `<issuer>/.well-known/openid-configuration` is reachable **from the
Fadebox container** and served over `https`.

**Users arrive with the username `oidc-<subject>`.** The token carried neither
`preferred_username` nor `email` — add the `profile` and `email` scopes to the client.

**Sign-in is rejected for an unknown user.** Auto-provisioning is off for that provider and the
account does not exist yet. Create it first, or turn auto-provisioning on.

**Everyone lands as role `user`.** That is the design: auto-provisioned accounts get the lowest
global role. Grant more through [groups and project roles](access-control.md).
