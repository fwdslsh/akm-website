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
const legacy = {
  'configuration.md': 'reference/configuration.md',
  'cli.md': 'reference/cli.md',
  'getting-started.md': 'guides/getting-started.md',
  'features/improvement-loop.md': 'architecture/improvement.md',
};
function websitePath(value) {
  const [pathname, suffix = ''] = value.split(/(?=[#?])/);
  const current = legacy[pathname] || pathname;
  if (files.has(current)) return '/docs/' + current.replace(/\.md$/, '.html') + suffix;
  if (files.has(current + 'README.md')) return '/docs/' + current + 'README.html' + suffix;
  return 'https://github.com/itlackey/akm/tree/main/docs/' + value;
}
let count = 0;
async function visit(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { await visit(file); continue; }
    if (!entry.name.endsWith('.md')) continue;
    const relative = path.relative(target, file).split(path.sep).join('/');
    const original = await readFile(file, 'utf8');
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
    const content = sections.map((part, index) => index % 2 ? part : part
      .replace(/(\]\()([^\s)]+)([^)]*\))/g, (_, before, url, after) => before + link(url) + after)
      .replace(/^(\s*\[[^\]]+\]:\s*)(\S+)/gm, (_, before, url) => before + link(url))).join('');
    await writeFile(file, content);
    count++;
  }
}
await visit(target);
console.log(`Imported ${count} Markdown pages from ${source}`);
