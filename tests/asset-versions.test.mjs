import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { browserModules, importsIn, versionedPage, projectRoot } from '../scripts/version-assets.mjs';

const root = new URL('../', import.meta.url);
const [page, modules, stylesheet] = await Promise.all([
  readFile(new URL('index.html', root), 'utf8'), browserModules(), readFile(new URL('styles.css', root), 'utf8'),
]);

test('every browser import and stylesheet uses the current release, including nested imports', () => {
  assert.equal(page, versionedPage(page, modules, stylesheet), 'Run npm run version-assets after changing the game.');
  const map = JSON.parse(page.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  const entry = page.match(/<script type="module" src="([^"]+)"/)[1];
  const version = new URL(entry, root).search;
  assert(version.startsWith('?v='));
  assert(page.indexOf('type="importmap"') < page.indexOf('type="module"'));
  assert.equal(new URL(page.match(/href="(styles\.css[^"]*)"/)[1], root).search, version);
  const normalized = new Map(Object.entries(map).map(([from, to]) => [new URL(from, root).href, new URL(to, root)]));
  for (const [name, source] of modules) {
    const loaded = normalized.get(new URL(name, root).href);
    assert.equal(loaded.search, version, name);
    for (const specifier of importsIn(source).filter(s => s.startsWith('.'))) {
      const resolved = normalized.get(new URL(specifier, loaded).href);
      assert(resolved, `${name} → ${specifier} must not fall back to an older cached module`);
      assert.equal(resolved.search, version);
    }
  }
  for (const path of ['app.js', 'room-art.js', 'dance-party.js', 'content.js']) assert(map[`./${path}`]);
});

test('administration modules refresh together and its import map is allowed by the existing strict CSP', async () => {
  const [html, modules, css] = await Promise.all([readFile(new URL('verwaltung/index.html', root), 'utf8'), browserModules(projectRoot, 'verwaltung/admin.js'), readFile(new URL('verwaltung/styles.css', root), 'utf8')]);
  assert.equal(html, versionedPage(html, modules, css, { entry: 'admin.js', prefix: '../', csp: true }));
  const mapText = html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1];
  assert(html.includes(`script-src 'self' 'sha256-${createHash('sha256').update(mapText).digest('base64')}'`));
  assert(!/script-src[^;]*unsafe-inline/.test(html));
  const imports = JSON.parse(mapText).imports, base = new URL('verwaltung/', root);
  const normalized = new Map(Object.entries(imports).map(([from, to]) => [new URL(from, base).href, new URL(to, base)]));
  for (const [name, source] of modules) for (const specifier of importsIn(source).filter(s => s.startsWith('.'))) assert(normalized.has(new URL(specifier, new URL(name, root)).href));
  assert(imports['../verwaltung/schema.js']); assert(imports['../band-defaults.js']);
});

test('a change to the dance scene or stylesheet refreshes the whole game without losing content', () => {
  const changed = new Map(modules);
  changed.set('dance-party.js', changed.get('dance-party.js') + '\n// next dance scene');
  const updated = versionedPage(page, changed, stylesheet);
  assert.notEqual(updated, page);
  assert.notEqual(updated.match(/src="app\.js[^\"]+"/)[0], page.match(/src="app\.js[^\"]+"/)[0]);
  assert.notEqual(versionedPage(page, modules, stylesheet + '\n/* next lights */'), page);
  const map = JSON.parse(updated.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  assert(!Object.keys(map).some(path => path.startsWith('./data/') || path.startsWith('./uploads/')));
});
