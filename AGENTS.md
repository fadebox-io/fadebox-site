# fadebox-site

pnpm workspace with two apps, deployed together to GitHub Pages (see README.md):

- `apps/landing/` — landing page, Astro. Content lives in `src/data/landing.ts`.
- `apps/docs/` — product docs, Docusaurus. Content in `docs/`, config in `docusaurus.config.ts`.

The deploy workflow merges the docs build into the landing's `dist/docs`; both are served from one
origin (`/fadebox-site/`, docs under `/fadebox-site/docs/`). Keep `base`/`baseUrl` in the two app
configs consistent when touching either.

## Development

Landing dev server — use background mode:

```
cd apps/landing && astro dev --background
```

Manage it with `astro dev stop`, `astro dev status`, and `astro dev logs`.

Docs dev server: `pnpm dev:docs` (from the root).

## Docs conventions

- `apps/docs/docs/` documents the next (unreleased) Fadebox version. Released versions are
  snapshotted with `docusaurus docs:version X.Y` in the release PR — never edit `versioned_docs/`
  except to fix docs of an already-released version.
- Broken links fail the build (`onBrokenLinks: 'throw'`); link between pages by relative `.md` file
  path so links survive version snapshots.
- The Fadebox code repo is private — never link into `github.com/hlavki/fadebox`; inline what the
  docs need (as the installation page does with the compose file).
- Mark tier availability with `<Tier level="enterprise|team" />` (globally registered, no import)
  under the page title or the section heading it applies to. It renders one badge per tier that
  has the thing, so `team` shows Team and Enterprise both. `enterprise` marks the two gated
  features; `team` marks a Free scale cap, since the tiers differ by scale, not by features.
  Nothing is ever marked Free. The badge carries no text of its own: state what exactly needs the
  tier — the gated write, or the Free number — in a sentence beneath it, since gates sit on
  configuration writes and "the whole page is Enterprise" is usually wrong.
- `apps/docs/FADEBOX-SYNC.md` records the last fadebox commit/PR the docs cover and the procedure
  for catching up. When updating docs from merged fadebox PRs, start there and bump it after.

## Astro documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
