import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { GitHubStore } from '../verwaltung/github-store.js';
import { COPY_GROUPS, normalizeTexts } from '../copy-defaults.js';
import { DEFAULT_BAND, bandMembers } from '../band-defaults.js';
import { DEFAULT_ANIMALS, playableAnimals } from '../animal-defaults.js';
import { paletteColors, PALETTE_LIMIT, DEFAULT_PALETTE, BUCKET_COLOR_IDS } from '../painting.js';
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
    COPY_GROUPS, normalizeTexts, DEFAULT_BAND, bandMembers, DEFAULT_ANIMALS, playableAnimals, paletteColors, PALETTE_LIMIT, DEFAULT_PALETTE, BUCKET_COLOR_IDS, fileReferences, validateContent, validateUpload, checkMagic,
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
  assert(h.get('#panel').innerHTML.includes('info.texts.wardrobe_board'));
  assert(h.get('#panel').innerHTML.includes('info.texts.action_change_character'));
  assert(h.get('#panel').innerHTML.includes('info.members.0.name'));
  assert(h.get('#panel').innerHTML.includes('info.members.0.image'));
  assert(h.get('#panel').innerHTML.includes('info.animals.0.image'));
  assert(h.get('#panel').innerHTML.includes('info.palette.0.color'));
  assert(!h.get('#panel').innerHTML.includes(TEST_TOKEN));
  assert(!JSON.stringify(h.state).includes(TEST_TOKEN));
});
test('selected audio is local until publish, then content and file are committed together', async () => {
  const h = await harness(); await h.login();
  const originalAudio = h.repo.document().tracks[0].src;
  const input = new h.Element('audio upload', { upload: 'src', track: 'hut' });
  const wav = new Uint8Array(128); wav.set(new TextEncoder().encode('RIFF')); wav.set(new TextEncoder().encode('WAVE'), 8);
  input.files = [new File([wav], 'Hut.wav', { type: 'audio/wav' })];
  await h.fire('#panel', 'change', input);
  assert(h.state.document.tracks[0].src.startsWith('uploads/')); assert.equal(h.state.files.size, 1);
  assert.equal(h.repo.document().tracks[0].src, originalAudio);
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

test('playable character graphics and extra paint colors publish with their editable names', async () => {
  const h = await harness(); await h.login(); await h.click(h.get('#tab-info'));
  const originalImage = h.repo.document().info.animals?.[3]?.image;
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aOv0AAAAASUVORK5CYII=', 'base64');
  const input = new h.Element('monkey upload', { upload: 'image', animal: 'monkey' });
  input.files = [new File([png], 'Affe.png', { type: 'image/png' })];
  await h.fire('#panel', 'change', input);
  const imagePath = h.state.document.info.animals[3].image;
  assert(imagePath.startsWith('uploads/')); assert.equal(h.state.files.size, 1);
  assert(fileReferences(h.state.document).has(imagePath));
  assert.equal(h.repo.document().info.animals?.[3]?.image, originalImage);
  const name = new h.Element('monkey name', { path: 'info.animals.3.name' }); name.value = 'Unser Affe';
  await h.fire('#panel', 'input', name);
  const add = new h.Element('add color', { addColor: '' }); await h.click(add);
  assert.equal(h.state.document.info.palette.length, DEFAULT_PALETTE.length + 1);
  for (const [key, value] of [['name', 'Orange'], ['color', '#ff9900']]) {
    const field = new h.Element('extra color', { path: 'info.palette.' + DEFAULT_PALETTE.length + '.' + key }); field.value = value;
    await h.fire('#panel', 'input', field);
  }
  assert(await h.save(true));
  assert.equal(h.repo.document().info.animals[3].name, 'Unser Affe');
  assert.equal(h.repo.document().info.animals[3].image, imagePath);
  assert.deepEqual(h.repo.blobs.get(h.repo.currentTree().get(imagePath)), png);
  assert.equal(h.repo.document().info.palette[DEFAULT_PALETTE.length].name, 'Orange'); assert.equal(h.repo.document().info.palette[DEFAULT_PALETTE.length].color, '#ff9900');
  assert.equal(h.repo.requests.filter(request => request.method === 'PATCH').length, 1, 'image, character and palette publish atomically');
  await h.click(new h.Element('original monkey', { resetAnimal: 'monkey' }));
  assert.equal(h.state.document.info.animals[3].image, DEFAULT_ANIMALS[3].image);
  await h.click(new h.Element('remove orange', { removeColor: String(DEFAULT_PALETTE.length) }));
  assert.equal(h.state.document.info.palette.length, DEFAULT_PALETTE.length);
  await h.click(new h.Element('keep basic color', { removeColor: '0' }));
  assert.equal(h.state.document.info.palette.length, 18, 'the required picture colors cannot be removed accidentally');
  assert(h.get('#panel').innerHTML.includes('Bild + Farbkübel'));
  assert(h.get('#panel').innerHTML.includes('Nur im Bild'));
});

test('each band member can upload, preview, publish and remove an independent melody without replacing its artwork', async () => {
  const h = await harness(); await h.login(); await h.click(h.get('#tab-info'));
  assert(h.get('#panel').innerHTML.includes('info.members.0.audio'));
  assert(h.get('#panel').innerHTML.includes('data-upload="audio" data-member="panda"'));
  const originalTracks = structuredClone(h.state.document.tracks), melodies = [];
  for (const member of h.state.document.info.members) {
    const image = member.image;
    const bytes = new Uint8Array(80); bytes.set(new TextEncoder().encode('ID3')); bytes[20] = melodies.length + 1;
    const input = new h.Element('member melody', { upload: 'audio', member: member.id });
    input.files = [new File([bytes], member.id + '.mp3', { type: 'audio/mpeg' })];
    await h.fire('#panel', 'change', input);
    assert.equal(member.image, image); assert(member.audio.startsWith('uploads/'));
    assert(fileReferences(h.state.document).has(member.audio));
    assert(h.get('#member-audio-' + member.id).innerHTML.includes('<audio controls'));
    melodies.push({ path: member.audio, bytes });
  }
  assert.equal(h.state.files.size, 3); assert.deepEqual(h.state.document.tracks, originalTracks);
  assert(await h.save()); assert.equal(h.draft().files.length, 3);
  assert(h.draft().document.info.members.every(member => member.audio.startsWith('uploads/')));
  assert(await h.save(true));
  for (const [i, member] of h.repo.document().info.members.entries()) {
    assert.equal(member.audio, melodies[i].path);
    assert.deepEqual(h.repo.blobs.get(h.repo.currentTree().get(member.audio)), Buffer.from(melodies[i].bytes));
  }
  assert.equal(h.repo.requests.filter(request => request.method === 'PATCH').length, 1);
  await h.click(new h.Element('remove panda melody', { removeMemberAudio: 'panda' }));
  assert.equal(h.state.document.info.members[0].audio, '');
  assert(h.state.document.info.members[1].audio); assert(h.state.document.info.members[2].audio);
  assert(await h.save(true)); assert.equal(h.repo.document().info.members[0].audio, '');
});
