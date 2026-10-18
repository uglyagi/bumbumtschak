import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadContent, TRACKS, BAND, text } from '../content.js';
import { adminURL } from '../connection.js';
const root = new URL('../', import.meta.url);
const defaults = JSON.parse(await readFile(new URL('data/content.json', root)));

test('the public world loads only its local GitHub content file', async () => {
  const before = globalThis.fetch; const requests = [];
  globalThis.fetch = async (url, options) => { requests.push({ url, options }); return Response.json(defaults); };
  try {
    assert.deepEqual(await loadContent(), { ok: true });
    assert.equal(requests.length, 1); assert.equal(requests[0].url, new URL('data/content.json', root).href);
    assert.equal(requests[0].options.credentials, 'omit'); assert.equal(requests[0].options.cache, 'no-store');
    assert.equal(TRACKS.length, 4); assert.equal(BAND.length, 3); assert(text('grown_title'));
    assert.equal(adminURL, new URL('verwaltung/', root).href);
  } finally { globalThis.fetch = before; }
});
test('all browser imports resolve within the project and the old service is absent', async () => {
  const files = [...(await readdir(root)).filter(name => name.endsWith('.js')), ...(await readdir(new URL('verwaltung/', root))).filter(name => name.endsWith('.js')).map(name => 'verwaltung/' + name)];
  for (const path of files) {
    const source = await readFile(new URL(path, root), 'utf8');
    assert(!source.includes('.chatgpt.site'), path); assert(!source.includes('/api/admin/'), path);
    for (const match of source.matchAll(/from ['"]([^'"]+)['"]/g)) {
      const target = new URL(match[1], new URL(path, root));
      assert(target.href.startsWith(root.href)); await access(fileURLToPath(target));
    }
  }
  const home = await readFile(new URL('index.html', root), 'utf8');
  const admin = await readFile(new URL('verwaltung/index.html', root), 'utf8');
  assert(home.includes('href="verwaltung/"')); assert(!home.includes('.chatgpt.site'));
  assert(!admin.includes('http-equiv="refresh"')); assert(!admin.includes('Mit ChatGPT anmelden'));
  assert(admin.includes('type="password"')); assert(admin.includes('Only select repositories'));
  assert(!/script[^>]+src="https?:/.test(admin));
  await access(new URL('.nojekyll', root));
});

test('updated control instructions replace only former defaults and keep custom text', async () => {
  const { COPY_FIELDS, normalizeTexts } = await import('../copy-defaults.js');
  for (const key of ['help_step3_body', 'world_instructions', 'grown_how_body']) {
    const field = COPY_FIELDS.find(field => field.key === key);
    for (const previousValue of field.previousValues) {
      const normalized = normalizeTexts({ [key]: previousValue, grown_intro: 'Unsere selbst geschriebene Geschichte', help_board_label: 'SPIELTIPPS' });
      assert.equal(normalized[key], field.value);
      assert.equal(normalized.grown_intro, 'Unsere selbst geschriebene Geschichte');
      assert.equal(normalized.help_board_label, 'SPIELTIPPS');
    }
    assert.equal(normalizeTexts({ [key]: 'Unser eigener Erklärungstext' })[key], 'Unser eigener Erklärungstext');
  }
});
