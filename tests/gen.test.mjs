import { test, expect } from 'bun:test';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { publishedPath } from '../scripts/gen.mjs';

const generator = new URL('../scripts/gen.mjs', import.meta.url).pathname;

/** Run scripts/gen.mjs the way unify does: argv[3] is the overlay; AKM_DOCS_DIR names the docs. */
async function generate(fixture) {
  const root = await mkdtemp(path.join(tmpdir(), 'akm-site-gen-'));
  const source = path.join(root, 'upstream');
  const overlay = path.join(root, 'overlay');
  for (const [name, content] of Object.entries(fixture)) {
    await mkdir(path.dirname(path.join(source, name)), { recursive: true });
    await writeFile(path.join(source, name), content);
  }
  await mkdir(overlay);
  const proc = Bun.spawn(['bun', generator, root, overlay], { env: { ...Bun.env, AKM_DOCS_DIR: source }, stdout: 'pipe', stderr: 'pipe' });
  expect(await proc.exited, await new Response(proc.stderr).text()).toBe(0);
  return { root, read: (rel) => readFile(path.join(overlay, rel), 'utf8'), has: (rel) => existsSync(path.join(overlay, rel)) };
}

test('contributor material publishes under Maintainers, and its old address redirects', () => {
  expect(publishedPath('architecture/README.md')).toBe('maintainers/architecture/README.md');
  expect(publishedPath('architecture/testing/checks.md')).toBe('maintainers/testing/checks.md');
  expect(publishedPath('plans/next.md')).toBe('maintainers/plans/next.md');
  expect(publishedPath('guides/getting-started.md')).toBe('guides/getting-started.md');
});

test('user guides exclude contributor links, the hub is this site\'s own, and moved pages keep their links', async () => {
  const { root, read, has } = await generate({
    'README.md': '# Documentation\n\nUpstream hub.\n',
    'guides/README.md': '# Guides\n\n- [Getting Started](getting-started.md)\n- [Local Development](../maintainers/local-development.md)\n- [Testing](../architecture/testing/checks.md)\n',
    'guides/getting-started.md': '# Getting Started\n\nInstall it.\n',
    'maintainers/README.md': '# Maintainers\n\nFor contributors.\n',
    'maintainers/local-development.md': '# Local Development\n\nClone it.\n',
    'architecture/README.md': '# Architecture\n\nSee the [guide](../guides/getting-started.md).\n',
    'architecture/testing/checks.md': '# Contributor checks\n\nRun them.\n',
    'posts/README.md': '# Posts\n',
    'posts/hello.md': '---\ntitle: Hello\n---\nSee [configuration](https://github.com/itlackey/akm/blob/main/docs/configuration.md).\n',
    'reference/configuration.md': '# Configuration\n\nSettings.\n',
  });
  try {
    const guides = await read('docs/guides/README.md');
    expect(guides).toContain('Getting Started');
    expect(guides).not.toContain('Local Development');
    expect(guides).not.toContain('Testing');
    expect(await read('docs/README.md')).toContain('Use AKM to find, load, and improve');
    // Moved, and its relative link still reaches the guide from the new folder.
    expect(await read('docs/maintainers/architecture/README.md')).toContain('[guide](/docs/guides/getting-started.md)');
    expect(await read('docs/architecture/README.html')).toContain('url=/docs/maintainers/architecture/README.html');
    expect(await read('docs/maintainers/README.md')).toContain('/docs/maintainers/testing/checks.md');
    expect(await read('docs/posts/README.md')).toContain('[Hello](/docs/posts/hello.md)');
    // A link to a page's old upstream address reaches the page where it lives now.
    expect(await read('docs/posts/hello.md')).toContain('[configuration](/docs/reference/configuration.md)');
    expect(has('docs/guides/getting-started.md')).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
