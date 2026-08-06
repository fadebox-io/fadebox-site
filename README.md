# fadebox-site

The public web presence of [Fadebox](https://hlavki.github.io/fadebox-site/): the landing page and
the product documentation, deployed together to GitHub Pages.

## Layout

A pnpm workspace with two apps:

- `apps/landing/` — the landing page (Astro), served at the site root.
- `apps/docs/` — the product documentation (Docusaurus), served under `/docs/`.

The deploy workflow (`.github/workflows/deploy.yml`) builds both, copies the docs build into the
landing's `dist/docs`, and publishes the merged output as one Pages artifact. Pull requests run the
same build without deploying; Docusaurus fails the build on broken links, so PR CI doubles as the
docs link check.

## Commands

All from the repo root:

| Command          | Action                                              |
| :--------------- | :-------------------------------------------------- |
| `pnpm install`   | Install dependencies for both apps                  |
| `pnpm dev`       | Landing dev server (`localhost:4321`)               |
| `pnpm dev:docs`  | Docs dev server (`localhost:3000`)                  |
| `pnpm build`     | Build both apps (`apps/*/dist`, `apps/docs/build`)  |

## Docs versioning

`apps/docs/docs/` documents the **next** (unreleased) Fadebox version and tracks master. When a
Fadebox minor version is released, snapshot it in a reviewable PR:

```bash
pnpm --filter fadebox-docs docusaurus docs:version 1.0
```

Patch-level doc fixes for a released version are edited directly under
`apps/docs/versioned_docs/version-X.Y/`. Before the first release, no versions are cut and the
current docs serve at `/docs/` directly.
