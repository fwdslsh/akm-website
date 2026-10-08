import { test, expect } from 'bun:test';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const importer = new URL('../scripts/import-docs.mjs', import.meta.url).pathname;

test('user guides exclude contributor links and architecture publishes under Maintainers', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'akm-site-import-'));
  try {
    const source = path.join(root, 'upstream');
    const fixture = {
      'README.md': '# Documentation\n',
      'guides/README.md': '# Guides\n\n- [Getting Started](getting-started.md)\n- [Local Development](../maintainers/local-development.md)\n- [Testing](../architecture/testing/checks.md)\n',
      'guides/getting-started.md': '# Getting Started\n',
      'maintainers/README.md': '# Maintainers\n',
      'maintainers/local-development.md': '# Local Development\n',
      'architecture/README.md': '# Architecture\n',
      'architecture/testing/checks.md': '# Contributor checks\n',
    };
    for (const [name, content] of Object.entries(fixture)) {
      await mkdir(path.dirname(path.join(source, name)), { recursive: true });
      await writeFile(path.join(source, name), content);
    }
    const process = Bun.spawn(['bun', importer], { cwd: root, env: { ...Bun.env, AKM_DOCS_DIR: source }, stdout: 'pipe', stderr: 'pipe' });
    expect(await process.exited).toBe(0);
    const guides = await readFile(path.join(root, 'site/docs/guides/README.md'), 'utf8');
    expect(guides).toContain('Getting Started');
    expect(guides).not.toContain('Local Development');
    expect(guides).not.toContain('Testing');
    expect(await readFile(path.join(root, 'site/docs/maintainers/architecture/README.md'), 'utf8')).toContain('# Architecture');
    expect(await readFile(path.join(root, 'site/docs/architecture/README.html'), 'utf8')).toContain('/docs/maintainers/architecture/README.html');
    const hub = await readFile(path.join(root, 'site/docs/README.md'), 'utf8');
    expect(hub).not.toContain('Local Development');
    expect(hub).not.toContain('Runtime Boundary');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
