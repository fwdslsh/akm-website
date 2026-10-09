# AKM documentation website

The source of <https://akm.fwdslsh.dev/>: AKM's own documentation from [itlackey/akm/docs](https://github.com/itlackey/akm/tree/main/docs), published with [unify](https://github.com/fwdslsh/unify) in the same look as unify's documentation site.

## How it is put together

This repository holds almost nothing of its own. The site **extends** the `unify-docs-template` package (`extends: node_modules/unify-docs-template` in `unify.yaml`): the layout, the stylesheet, the page directory at `/all-pages.html` and the 404 page are the template's, installed as a dev dependency and pinned by `bun.lock`. What is this site's own:

- `site/index.html`, the front page, laid out like the other fwdslsh docs sites' (hero, cards, next steps);
- the four files that name the site: `site/_includes/head.html` (title suffix, description, fonts), `nav.html` (the masthead), `docnav.html` (the sidebar) and `footer.html`;
- `site/assets/share-placeholder.png`, the 1200×630 share card;
- `site-content/`, this site's own versions of the two hub pages (`docs-index.md` and `agents-index.md`, published in place of `docs/README.md` and `docs/agents/README.md`);
- `scripts/gen.mjs`, which unify runs before every build (`generate:` in `unify.yaml`).

`scripts/gen.mjs` publishes AKM's `docs/` through the template's importer: every document lands at `docs/<its path>`, a missing title or description is filled in from the document, and a link leaving the folder goes to GitHub. Nothing is copied into this repository. What the script decides for itself: contributor material (`architecture/`, `plans/`, the testing docs) is published under `docs/maintainers/`, and each moved page's old address redirects to the new one; a few upstream pages get small patches (see `transform` in the script).

To change the look for every fwdslsh docs site at once, change the template in [fwdslsh/unify](https://github.com/fwdslsh/unify/tree/main/templates/docs) and bump the version here. To fix the documentation itself, edit it upstream in itlackey/akm.

## Develop

Requires Bun. Clone `itlackey/akm` beside this repository, then:

```sh
bun install
bun run build      # unify build --clean
bun run dev        # unify dev
bun run test       # the generator's tests
```

For another checkout of AKM, set `AKM_DOCS_DIR` (relative to this repository): `AKM_DOCS_DIR=/path/to/akm/docs bun run build`.

## Publish

GitHub Actions checks out AKM's `main`, runs the tests, and builds with `--strict` (a dry run first, then the real build) before deploying to GitHub Pages, on pushes, manual runs, and daily at 06:23 UTC. The site is <https://akm.fwdslsh.dev/>: GitHub Pages is bound to `akm.fwdslsh.dev`, whose Azure DNS CNAME points to `fwdslsh.github.io`; the custom domain is managed in the repository's Pages settings.

`unify audit` lists what a reader or crawler would find missing; most of what it reports today is in the upstream documents (pages nothing links to, links to headings that no longer exist), and is tracked in itlackey/akm.

Template code is MPL-2.0; AKM's documentation keeps its upstream license.
