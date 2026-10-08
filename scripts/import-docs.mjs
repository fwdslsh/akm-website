import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const source = path.resolve(process.env.AKM_DOCS_DIR || '../akm/docs');
const target = path.resolve('site/docs');
await readdir(source); // Verify the source before replacing generated content.
await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true });
const files = new Set();
async function inventory(dir, prefix = '') {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) await inventory(path.join(dir, entry.name), name + '/');
    else files.add(name);
  }
}
await inventory(source);
function publishedPath(relative) {
  if (relative.startsWith('architecture/testing/')) return relative.replace('architecture/testing/', 'maintainers/testing/');
  if (relative === 'architecture/internals/functional-contract-patterns.md') return 'maintainers/functional-contract-patterns.md';
  if (relative.startsWith('architecture/')) return 'maintainers/' + relative;
  if (relative.startsWith('plans/')) return 'maintainers/' + relative;
  if (relative === 'architecture/internals/functional-contract-patterns.md') return 'maintainers/functional-contract-patterns.md';
  return relative;
}
const originals = new Map();
for (const relative of files) {
  const published = publishedPath(relative);
  originals.set(published, relative);
  if (published === relative) continue;
  await mkdir(path.dirname(path.join(target, published)), { recursive: true });
  await cp(path.join(target, relative), path.join(target, published));
  await rm(path.join(target, relative));
}
const legacy = {
  'configuration.md': 'reference/configuration.md',
  'cli.md': 'reference/cli.md',
  'getting-started.md': 'guides/getting-started.md',
  'features/improvement-loop.md': 'architecture/improvement.md',
};
function websitePath(value) {
  const [pathname, suffix = ''] = value.split(/(?=[#?])/);
  const current = legacy[pathname] || pathname;
  if (files.has(current)) return '/docs/' + publishedPath(current).replace(/\.md$/, '.html') + suffix;
  if (files.has(current + 'README.md')) return '/docs/' + publishedPath(current + 'README.md').replace(/\.md$/, '.html') + suffix;
  return 'https://github.com/itlackey/akm/tree/main/docs/' + value;
}
let count = 0;
async function visit(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { await visit(file); continue; }
    if (!entry.name.endsWith('.md')) continue;
    const emitted = path.relative(target, file).split(path.sep).join('/');
    const relative = originals.get(emitted) || emitted;
    const overrides = { 'README.md': 'docs-index.md', 'agents/README.md': 'agents-index.md' };
    const original = overrides[relative]
      ? await readFile(new URL('../site-content/' + overrides[relative], import.meta.url), 'utf8')
      : await readFile(file, 'utf8');
    function link(url) {
      const github = url.match(/^https:\/\/github\.com\/itlackey\/akm\/blob\/main\/docs\/(.*)$/);
      if (github) return websitePath(github[1]);
      if (/^(?:[a-z]+:|#|\/)/i.test(url)) return url;
      const [pathname] = url.split(/[?#]/);
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(relative), pathname));
      if (resolved.startsWith('../')) return 'https://github.com/itlackey/akm/blob/main/' + resolved.replace(/^\.\.\//, '');
      return websitePath(resolved + url.slice(pathname.length));
    }
    // Keep code examples verbatim; rewrite inline and reference Markdown links only.
    const sections = original.split(/(^\s*```[^\n]*\n[\s\S]*?^\s*```\s*$|^\s*~~~[^\n]*\n[\s\S]*?^\s*~~~\s*$)/m);
    let content = sections.map((part, index) => index % 2 ? part : part
      .replace(/(\]\()([^\s)]+)([^)]*\))/g, (_, before, url, after) => before + link(url) + after)
      .replace(/^(\s*\[[^\]]+\]:\s*)(\S+)/gm, (_, before, url) => before + link(url))).join('');
    // Plain-text release notes have no heading; give the page and catalog a
    // meaningful name without replacing any authored heading or frontmatter.
    const frontmatter = content.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/)?.[0] || '';
    const body = content.slice(frontmatter.length);
    const prose = body.replace(/^\s*```[^\n]*\n[\s\S]*?^\s*```\s*$/gm, '');
    if (!/^#\s+\S/m.test(prose)) {
      const authoredTitle = frontmatter.match(/^title:\s*['"]?([^\n]+?)['"]?\s*$/m)?.[1];
      const title = authoredTitle || prose.match(/^#{2,6}\s+(.+)$/m)?.[1]
        || prose.split('\n').find(line => line.trim() && !/^[-*>]/.test(line.trim()))?.trim()
        || path.basename(relative, '.md').replaceAll('-', ' ');
      content = frontmatter + '# ' + title + '\n\n' + body;
    }
    if (relative === 'reference/README.md') {
      content = content.replace(/^See also:.*$/m, '');
      content = content.replace('Pointer page: where the bundle-format compatibility table and adapter internals now live', 'Supported bundle formats and compatibility');
    }
    if (relative === 'posts/README.md') {
      content = '# Posts\n\nArticles about using AKM. These describe the version available at publication time; use the guides and reference for current commands.\n\n';
      for (const candidate of [...files].filter(name => name.startsWith('posts/') && name.endsWith('.md') && name !== relative).sort()) {
        const article = await readFile(path.join(source, candidate), 'utf8');
        const title = article.match(/^title:\s*([^\n]+)$/m)?.[1]?.replace(/^['"]|['"]$/g, '') || article.match(/^#\s+(.+)$/m)?.[1] || path.basename(candidate, '.md').replaceAll('-', ' ');
        content += '- [' + title + '](' + websitePath(candidate) + ')\n';
      }
    }
    if (relative === 'guides/README.md') {
      content = content.split('\n').filter(line => !/^[-*]\s/.test(line) || !line.includes('/docs/maintainers/')).join('\n');
    }
    if (relative === 'maintainers/README.md') {
      content += '\n## Architecture and internals\n\n- [Architecture documentation](' + websitePath('architecture/README.md') + ') — Design, internals, specifications, and contributor reviews.\n\n## Testing and contributor plans\n\n';
      for (const candidate of [...files].sort()) {
        if (candidate.startsWith('architecture/testing/') || candidate.startsWith('plans/') || candidate === 'architecture/internals/functional-contract-patterns.md') {
          const title = path.basename(candidate, '.md').replaceAll('-', ' ');
          content += '- [' + title + '](' + websitePath(candidate) + ')\n';
        }
      }
    }
    if (relative === 'architecture/README.md') {
      content = content.replace(/\n## Testing[^\n]*\n[\s\S]*?(?=\n## |$)/, '\n## Contributor testing\n\nSee [Maintainer documentation](/docs/maintainers/README.html#testing-and-contributor-plans).\n');
    }
    await writeFile(file, content);
    count++;
  }
}
await visit(target);
// Retain bookmarked URLs without duplicating pages in the search catalog.
for (const [published, original] of originals) {
  if (published === original || !original.endsWith('.md')) continue;
  const destination = '/docs/' + published.replace(/\.md$/, '.html');
  const oldFile = path.join(target, original.replace(/\.md$/, '.html'));
  await mkdir(path.dirname(oldFile), { recursive: true });
  await writeFile(oldFile, '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Page moved</title><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=' + destination + '"></head><body><h1>Page moved</h1><p><a href="' + destination + '">Continue to Maintainer documentation</a></p></body></html>');
}
console.log(`Imported ${count} Markdown pages from ${source}`);
