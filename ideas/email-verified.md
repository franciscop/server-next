# `emailVerified` on the profile

Account linking by email is the pattern the docs teach (`db.users.upsert({
email: profile.email })` appears across Authentication and the tutorials). It
is only safe when the provider has proven the person owns that address. If any
enabled provider hands back an unverified email, someone can register
`victim@example.com` there, sign in, and land on the victim's row.

The profile has no way to tell today, and some providers already return
unverified addresses:

- **Entra** falls back to `preferred_username` when `email` is missing
  (antarctic `microsoft-entra-id.js`). That is a free-text field any tenant
  admin can set: the "nOAuth" takeover.
- **GitHub** takes the primary address from `/user/emails`, or else the first
  entry, without looking at that entry's `verified` flag.
- **Generic OIDC** (`src/auth/providers/oidc.ts`) passes `raw.email` through
  and ignores the standard `email_verified` claim.
- **Google** sends `email_verified`, but it only reaches the app via `raw`.
- Many others (Facebook, Discord, Twitch...) have their own flag or none.

## Proposal

Add `emailVerified: boolean` to `AuthProfile`, set per provider in antarctic,
which already owns the per-provider profile mapping:

- `true` only when the provider asserts it: OIDC's `email_verified`, GitHub's
  `verified` on the chosen `/user/emails` entry, Discord's `verified`...
- `false` when the provider says no, **and** when it has no signal at all.
  Unknown has to count as unverified, or the flag protects nothing.
- GitHub picks the primary address only if it is verified, else the first
  verified one. Entra stops falling back to `preferred_username` for `email`.

On our side:

- `AuthProfile` in `src/auth/types.ts`, and `oidc.ts` reading `email_verified`.
- `publicProfile` in `credential.ts` carries it, so the no-database `cookie`
  shape can check it too.
- Docs: the profile shape, a line in "Account linking" under `onLogin`, and
  the `upsert({ email })` examples check `profile.emailVerified` first.

## Open questions

- **Flag only, or also a default?** A flag leaves every existing
  `upsert({ email })` exactly as exposed as before. The alternative is to drop
  an unverified email from the profile (`email: undefined`), so linking by it
  cannot happen by accident, at the cost of apps that only wanted to display it.
- `email` is typed `string` but is already missing for some providers; this is
  a natural moment to make it `string | undefined`.
- Whether per-provider trust belongs in config (for example "trust this
  in-house OIDC issuer's emails") or stays with antarctic's per-provider
  mapping.
- It is a breaking change either way for anyone relying on the Entra and
  GitHub fallbacks, which would start returning a different address, or none.
