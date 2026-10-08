# AKM documentation website

Built from the [Unify documentation example](https://github.com/fwdslsh/unify/tree/main/examples/unify-docs), with documentation imported from [itlackey/akm/docs](https://github.com/itlackey/akm/tree/main/docs).

## Develop

Requires Bun. Clone `itlackey/akm` alongside this repository, then:

```sh
bun install
bun run build
bun run dev
```

For another checkout, use `AKM_DOCS_DIR=/path/to/akm/docs bun run build`.
The importer preserves document paths, rewrites Markdown links to rendered pages, and leaves code examples intact. Generated `site/docs/` and `dist/` are ignored. Edit documentation upstream; edit the website shell here.

## Publish

GitHub Actions imports the latest upstream `main` docs and deploys to GitHub Pages on pushes, manual runs, and daily at 06:23 UTC. The default address is https://akm.fwdslsh.dev/. GitHub Pages is bound to `akm.fwdslsh.dev`; its Azure DNS CNAME points to `fwdslsh.github.io`. The custom domain is managed in repository Pages settings.

Template provenance: Unify 0.11.7, `examples/unify-docs` for the layout, masthead, sidebar and styling; `templates/docs` for the searchable page directory. Deployment follows Unify’s `.github/workflows/deploy-docs.yml`, adapted for the separate upstream AKM checkout and project Pages address. The workflow runs a dry build before publishing. Strict completeness audit is not enabled: upstream docs currently contain stale heading links and missing descriptions. Unify template code is MPL-2.0; imported AKM content retains its upstream license.

## Website organization

The documentation hub and Guides index are user focused. Architecture, design internals, and reviews live under Maintainers. The importer places contributor testing under `docs/maintainers/testing/`, contributor plans under `docs/maintainers/plans/`, and functional contract patterns under Maintainers. Source docs stay canonical upstream; website links are rewritten and old website URLs redirect to their new location. Pages without an authored H1 receive a descriptive heading so the page directory never uses the shared layout title as its label.

Run directory behavior checks with `bun test ./tests/import-docs.test.mjs ./tests/page-directory.test.mjs`.
