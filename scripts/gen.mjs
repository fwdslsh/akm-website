/**
 * gen.mjs — publishes AKM's documentation, run by unify before every build
 * through `generate: scripts/gen.mjs` in unify.yaml.
 *
 * The documents are AKM's own `docs/` (itlackey/akm), read where they are:
 * `../akm/docs` beside this repository, or wherever AKM_DOCS_DIR points
 * (relative to this repository). The docs template's importer publishes them
 * to `docs/` (a link leaving the folder goes to GitHub; a missing title or
 * description is filled in), and unify builds what it writes as part of the
 * site. Nothing is copied into this repository.
 *
 * What is this site's own, and only that, is below:
 *
 * - Contributor material (architecture/, plans/, and the testing docs) is
 *   published under docs/maintainers/, so the user guides stay focused, and
 *   the old address of each moved page redirects to the new one.
 * - The two hub pages (docs/README.md, docs/agents/README.md) are this site's
 *   own versions, kept in site-content/.
 * - A few upstream pages get a small patch (posts listing, guide list without
 *   contributor links, maintainer index); see `transform`.
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { importDocs } from "unify-docs-template/scripts/import-docs.mjs";

const [, , , overlay] = process.argv;
const project = fileURLToPath(new URL("..", import.meta.url));
const from = resolve(project, process.env.AKM_DOCS_DIR ?? "../akm/docs");
const github = "https://github.com/itlackey/akm/blob/main/docs";

/** Where a document is published, given its path in AKM's docs/. */
export function publishedPath(rel) {
  if (rel === "architecture/internals/functional-contract-patterns.md") return "maintainers/functional-contract-patterns.md";
  if (rel.startsWith("architecture/testing/")) return rel.replace("architecture/testing/", "maintainers/testing/");
  if (rel.startsWith("architecture/") || rel.startsWith("plans/")) return `maintainers/${rel}`;
  return rel;
}

/** Documents that moved upstream, by their old path: links still naming the old one reach the new one. */
const LEGACY = {
  "configuration.md": "reference/configuration.md",
  "cli.md": "reference/cli.md",
  "getting-started.md": "guides/getting-started.md",
  "features/improvement-loop.md": "architecture/improvement.md",
};

let files = [];
const site = (rel) => `/docs/${publishedPath(rel)}`;
const titleOf = (text, rel) =>
  text.match(/^title:\s*['"]?(.+?)['"]?\s*$/m)?.[1] ?? text.match(/^#\s+(.+)$/m)?.[1] ?? posix.basename(rel, ".md").replaceAll("-", " ");

/** This site's patches to upstream pages, applied before the importer reads them. */
function transform(rel, text) {
  const own = { "README.md": "docs-index.md", "agents/README.md": "agents-index.md" }[rel];
  if (own) text = readFileSync(join(project, "site-content", own), "utf8");
  text = text.replace(/(\]\()([^)\s]+)/g, (whole, open, url) => {
    const [path, suffix = ""] = url.split(/(?=[#?])/);
    // Relative to the document, or an absolute GitHub link into docs/.
    const inDocs = path.startsWith(`${github}/`) ? path.slice(github.length + 1)
      : /^([a-z]+:|#|\/)/i.test(path) ? null : posix.normalize(posix.join(posix.dirname(rel), path));
    const target = inDocs === null ? undefined : LEGACY[inDocs];
    return target ? `${open}${site(target)}${suffix}` : whole;
  });
  if (rel === "reference/README.md") {
    text = text.replace(/^See also:.*$/m, "")
      .replace("Pointer page: where the bundle-format compatibility table and adapter internals now live", "Supported bundle formats and compatibility");
  }
  if (rel === "posts/README.md") {
    text = "# Posts\n\nArticles about using AKM. These describe the version available at publication time; use the guides and reference for current commands.\n\n";
    for (const post of files.filter((f) => f.startsWith("posts/") && f.endsWith(".md") && f !== rel)) {
      text += `- [${titleOf(readFileSync(join(from, post), "utf8"), post)}](${site(post)})\n`;
    }
  }
  if (rel === "guides/README.md") {
    // The user guide index links no contributor material; that lives under Maintainers.
    text = text.split("\n").filter((line) => !/^[-*]\s/.test(line) || !/\]\((\.\.\/)?(maintainers|architecture|plans)\//.test(line)).join("\n");
  }
  if (rel === "maintainers/README.md") {
    text += `\n## Architecture and internals\n\n- [Architecture documentation](${site("architecture/README.md")}) — Design, internals, specifications, and contributor reviews.\n\n## Testing and contributor plans\n\n`;
    for (const doc of files.filter((f) => f.startsWith("architecture/testing/") || f.startsWith("plans/") || f === "architecture/internals/functional-contract-patterns.md")) {
      text += `- [${posix.basename(doc, ".md").replaceAll("-", " ")}](${site(doc)})\n`;
    }
  }
  if (rel === "architecture/README.md") {
    text = text.replace(/\n## Testing[^\n]*\n[\s\S]*?(?=\n## |$)/, "\n## Contributor testing\n\nSee [Maintainer documentation](/docs/maintainers/README.md#testing-and-contributor-plans).\n");
  }
  return text;
}

if (overlay) {
  files = walk(from);
  const pages = importDocs({ from, into: overlay, github, rename: publishedPath, transform });

  // A moved page's old address still works: a small page that sends the reader on, held out of search.
  const titles = new Map(pages.map((p) => [p.source, p.title]));
  const attr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  for (const rel of files.filter((f) => f.endsWith(".md") && publishedPath(f) !== f)) {
    const destination = `/docs/${publishedPath(rel).replace(/\.md$/, ".html")}`;
    const title = attr(titles.get(rel) ?? rel);
    const stub = join(overlay, "docs", ...rel.replace(/\.md$/, ".html").split("/"));
    mkdirSync(dirname(stub), { recursive: true });
    writeFileSync(stub, `<!doctype html>\n<html lang="en" data-layout="none"><head><meta charset="utf-8"><title>${title} has moved</title><meta name="description" content="${title} moved to the Maintainers section."><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0; url=${destination}"></head><body><h1>${title} has moved</h1><p><a href="${destination}">Continue to its new address</a>.</p></body></html>\n`);
  }
  console.log(`gen.mjs: ${pages.length} documents from ${relative(project, from) || from}`);
}

/** Every file under `dir`, relative and `/`-separated, in order. */
function walk(dir, top = dir) {
  return readdirSync(dir).flatMap((name) => {
    const abs = join(dir, name);
    return statSync(abs).isDirectory() ? walk(abs, top) : [relative(top, abs).split(sep).join("/")];
  }).sort();
}
