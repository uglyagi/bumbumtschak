import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { GitHubStore } from '../verwaltung/github-store.js';
import { COPY_GROUPS, normalizeTexts } from '../copy-defaults.js';
import { DEFAULT_BAND, bandMembers } from '../band-defaults.js';
import { fileReferences } from '../verwaltung/drafts.js';
import { validateContent, validateUpload, checkMagic } from '../verwaltung/schema.js';
import { RepositoryFixture, TEST_TOKEN } from './github-fixture.mjs';
const defaults = JSON.parse(await readFile(new URL('../data/content.json', import.meta.url)));
const source = (await readFile(new URL('../verwaltung/admin.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '').replaceAll('import.meta.url', JSON.stringify(new URL('../verwaltung/admin.js', import.meta.url).href));

async function harness(saved = null) {
  const repo = new RepositoryFixture(defaults), nodes = new Map(), documentHandlers = new Map(), windowHandlers = new Map(), opened = [];
  let draft = saved;
  const add = (map, name, callback) => { if (!map.has(name)) map.set(name, []); map.get(name).push(callback); };
  class Element {
    constructor(name, dataset = {}) { this.name = name; this.dataset = dataset; this.handlers = new Map(); this.value = ''; this.hidden = false; this.disabled = false; this.innerHTML = ''; this.textContent = ''; this.type = 'text'; this.files = []; this.classList = { toggle() {} }; }
    addEventListener(name, callback) { add(this.handlers, name, callback); }
    setAttribute() {}
    focus() { doc.activeElement = this; }
    matches(selector) { return selector === '[data-copy-search]' && this.dataset.copySearch !== undefined; }
    closest() { return this; }
    querySelectorAll(selector) { return [...nodes.values()].filter(node => selector === '[data-path]' ? node.dataset.path : selector === 'input,textarea' ? node.dataset.path : false); }
    querySelector() { return null; }
    checkValidity() { return true; }
    reportValidity() {}
    showModal() { queueMicrotask(() => { this.returnValue = 'ok'; for (const callback of this.handlers.get('close') || []) callback(); }); }
  }
  const get = name => { if (!nodes.has(name)) nodes.set(name, new Element(name)); return nodes.get(name); };
  const doc = { querySelector: get, querySelectorAll: selector => selector === '[data-tab]' ? ['concerts', 'music', 'info'].map(id => get('#tab-' + id)) : [], addEventListener: (name, callback) => add(documentHandlers, name, callback) };
  for (const id of ['concerts', 'music', 'info']) get('#tab-' + id).dataset.tab = id;
  get('#editor').hidden = true;
  const context = vm.createContext({
    COPY_GROUPS, normalizeTexts, DEFAULT_BAND, bandMembers, fileReferences, validateContent, validateUpload, checkMagic,
    REPOSITORY: 'uglyagi/bumbumtschak', GitHubStore: class extends GitHubStore { constructor(token) { super(token, repo.fetch); } },
    readDraft: async () => structuredClone(draft),
    writeDraft: async ({ document, contentSha, files }) => { draft = structuredClone({ document, contentSha, files, savedAt: '2026-10-18T09:00:00Z' }); },
    clearDraft: async () => { draft = null; },
    document: doc, window: { addEventListener: (name, callback) => add(windowHandlers, name, callback), open() { const tab = { location: {}, close() { this.closed = true; } }; opened.push(tab); return tab; } },
    URL, crypto: globalThis.crypto, Blob, structuredClone, queueMicrotask, console,
  });
  const app = await new vm.Script(`(async () => {${source}\nreturn { state, save, render, changed, fileURLs };})()`).runInContext(context);
  async function fire(selector, event, target = get(selector)) {
    for (const callback of get(selector).handlers.get(event) || []) await callback({ target, preventDefault() {} });
  }
  async function click(button) { for (const callback of documentHandlers.get('click') || []) await callback({ target: button }); }
  async function login() { get('#token').value = TEST_TOKEN; await fire('#login', 'submit'); }
  return { ...app, repo, get, fire, click, login, Element, opened, windowHandlers, draft: () => draft };
}

test('login clears the password field and opens all existing editorial forms', async () => {
  const h = await harness(); await h.login();
  assert.equal(h.get('#token').value, ''); assert.equal(h.get('#gate').hidden, true); assert.equal(h.get('#editor').hidden, false);
  await h.click(h.get('#tab-info'));
  assert(h.get('#panel').innerHTML.includes('info.texts.grown_title'));
  assert(h.get('#panel').innerHTML.includes('info.members.0.name'));
  assert(h.get('#panel').innerHTML.includes('info.members.0.image'));
  assert(!h.get('#panel').innerHTML.includes(TEST_TOKEN));
  assert(!JSON.stringify(h.state).includes(TEST_TOKEN));
});
test('selected audio is local until publish, then content and file are committed together', async () => {
  const h = await harness(); await h.login();
  const input = new h.Element('audio upload', { upload: 'src', track: 'hut' });
  const wav = new Uint8Array(128); wav.set(new TextEncoder().encode('RIFF')); wav.set(new TextEncoder().encode('WAVE'), 8);
  input.files = [new File([wav], 'Hut.wav', { type: 'audio/wav' })];
  await h.fire('#panel', 'change', input);
  assert(h.state.document.tracks[0].src.startsWith('uploads/')); assert.equal(h.state.files.size, 1);
  assert.equal(h.repo.document().tracks[0].src, '');
  h.state.document.info.texts.grown_title = 'Neue Überschrift';
  assert(await h.save()); assert.equal(h.state.hasDraft, true);
  assert.equal(h.draft().files.length, 1); assert(!JSON.stringify(h.draft()).includes(TEST_TOKEN));
  assert(!h.repo.requests.some(r => r.method === 'POST'));
  assert(await h.save(true));
  assert.equal(h.repo.document().info.texts.grown_title, 'Neue Überschrift');
  const path = h.repo.document().tracks[0].src;
  assert.deepEqual(h.repo.blobs.get(h.repo.currentTree().get(path)), Buffer.from(wav));
  assert.equal(h.state.files.size, 0); assert.equal(h.draft(), null);
  assert(h.get('#message').textContent.includes('einige Minuten'));
});
test('preview saves locally and opens the project-relative game without a token', async () => {
  const h = await harness(); await h.login();
  h.state.document.info.members[0].name = 'Mein Panda'; h.changed();
  await h.fire('#preview', 'click');
  assert.equal(h.draft().document.info.members[0].name, 'Mein Panda');
  assert(h.opened[0].location.href.endsWith('/?preview=1'));
  assert.equal(h.opened[0].opener, null);
  assert(!h.repo.requests.some(r => r.method === 'POST'));
});
test('a restored local draft is kept when newer content causes a conflict', async () => {
  const fixture = new RepositoryFixture(defaults);
  const old = { document: structuredClone(defaults), contentSha: fixture.currentContentSha(), files: [], savedAt: '2026-10-18T09:00:00Z' };
  old.document.info.tagline = 'My local draft';
  const h = await harness(old);
  const fresh = structuredClone(defaults); fresh.info.tagline = 'A bandmate published';
  h.repo.amend('data/content.json', Buffer.from(JSON.stringify(fresh)));
  await h.login(); assert.equal(h.get('#draft-notice').hidden, false);
  await h.fire('#restore-draft', 'click');
  assert.equal(h.state.document.info.tagline, 'My local draft');
  assert.equal(await h.save(true), false);
  assert.equal(h.repo.document().info.tagline, 'A bandmate published');
  assert.equal(h.draft().document.info.tagline, 'My local draft');
});
test('logout removes the key and the public world remains unchanged', async () => {
  const h = await harness(); await h.login();
  const store = h.state.store;
  h.state.document.info.tagline = 'Keep my draft'; h.changed();
  await h.fire('#logout', 'click');
  assert.equal(h.state.store, null); assert.equal(h.get('#editor').hidden, true);
  assert.equal(h.draft().document.info.tagline, 'Keep my draft');
  await assert.rejects(store.load(), { status: 401 });
  assert.equal(h.repo.document().info.tagline, defaults.info.tagline);
});
