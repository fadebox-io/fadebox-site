---
title: OIDC single sign-on
---

Fadebox has two auth modes, both server-side and cookie-based:

- **Form login** (default) — username/password against the local user database.
- **OIDC single sign-on** (optional) — any standards-compliant IdP (Keycloak, Entra ID, Auth0, …),
  enabled per deployment with environment variables.

OIDC SSO is disabled by default. Fadebox runs the **authorization-code flow server-side** — tokens
never reach the browser; the session lives in an encrypted cookie. Form login keeps working
alongside as the break-glass path.

## Enabling it

Environment variables only — no rebuild:

| Env var                                | Description                                                        |
|----------------------------------------|--------------------------------------------------------------------|
| `QUARKUS_OIDC_TENANT_ENABLED`          | `true` to enable SSO (default `false`)                             |
| `QUARKUS_OIDC_AUTH_SERVER_URL`         | Issuer URL, e.g. `https://idp.example.com/realms/acme`             |
| `QUARKUS_OIDC_CLIENT_ID`               | Client ID registered at the IdP                                    |
| `QUARKUS_OIDC_CREDENTIALS_SECRET`      | Client secret (confidential client)                                |
| `FADEBOX_SECURITY_OIDC_PROVIDER_NAME`  | Login button label (default `SSO`)                                 |
| `FADEBOX_SECURITY_OIDC_AUTO_PROVISION` | Create a DB user (role `user`) on first SSO login (default `true`) |

## Registering the client at the IdP

- Redirect URI: `https://<host>/oidc/callback`
- Post-logout URI: `https://<host>/sign-in`
- The client must allow the `profile` and `email` scopes — Fadebox requests them because
  `preferred_username` and `email` drive provisioning; without them usernames degrade to
  `oidc-<uuid>`.

## How accounts are linked

Identity and roles are anchored in the local user table — **OIDC proves who you are; what you may
do always comes from your Fadebox account**. On sign-in, the token is mapped to an account in this
order:

1. by the stored IdP subject from a previous SSO sign-in;
2. by email against an existing local account — **only if the token says `email_verified=true`**
   (unverified claims must not take over local accounts); the match is then linked permanently;
3. otherwise a new password-less user with role `user` is provisioned just-in-time: username from
   `preferred_username` (fallback email; collisions get `-2`, `-3`, …). Disable this with
   `FADEBOX_SECURITY_OIDC_AUTO_PROVISION=false` for closed deployments.

Inactive users are rejected. Password-less (federated-only) accounts cannot use form login. Admins
manage roles in the user-management UI.

## Signing out

Sign-out from an SSO session is RP-initiated: it clears the Fadebox session **and** ends the IdP
session, landing back on the sign-in page.
