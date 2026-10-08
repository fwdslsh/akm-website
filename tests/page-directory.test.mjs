import { test, expect } from 'bun:test';
import { entriesOf, labelOf, sectionOf, filterEntries } from '../site/assets/page-directory.js';

test('documents are grouped beneath their actual documentation section', () => {
  expect(sectionOf('/docs/maintainers/testing/testing-workflow.html')).toBe('Maintainers');
  expect(sectionOf('/docs/guides/getting-started.html')).toBe('Guides');
  expect(sectionOf('/docs/README.html')).toBe('Documentation');
});

test('a shared layout title never becomes a page label', () => {
  expect(labelOf({ path: '/docs/migration/release-notes/0.0.13.html', head: { title: '· AKM docs' } })).toBe('0.0.13');
  expect(labelOf({ path: '/docs/example.html', head: { title: 'Useful topic · AKM docs' } })).toBe('Useful topic');
});

test('filtering uses meaningful headings and handles whitespace', () => {
  const entries = entriesOf({ baseUrl: 'https://akm.fwdslsh.dev/', pages: [{ path: '/docs/maintainers/testing/testing-workflow.html', body: { headings: [{ level: 1, text: 'Testing Workflow' }] } }] });
  expect(filterEntries(entries, 'testing\tworkflow')).toHaveLength(1);
  expect(filterEntries(entries, 'unrelated')).toHaveLength(0);
});
