# AKM documentation website

Built from the official [Unify docs template](https://github.com/fwdslsh/unify/tree/main/templates/docs), with documentation imported from [itlackey/akm/docs](https://github.com/itlackey/akm/tree/main/docs).

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

GitHub Actions imports the latest upstream `main` docs and deploys to GitHub Pages on pushes, manual runs, and daily at 06:23 UTC. The default address is https://fwdslsh.github.io/akm-website/. Change `base-url` in `unify.yaml` when using a custom domain.

Template provenance: Unify 0.11.7, `templates/docs`. Original template styling and page-directory implementation retained. Unify template code is MPL-2.0; imported AKM content retains its upstream license.
