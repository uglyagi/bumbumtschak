import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const extension = 'js';
const [core, content, art, roomArt, rooms, social] = await Promise.all(
  ['game-core', 'content', 'art', 'room-art', 'rooms', 'social'].map(name => import(new URL(`${name}.${extension}`, root))));
const connection = await import(new URL(`connection.${extension}`, root));

// Exercise the application's real registered handlers with DOM test doubles.
// This checks app behavior, not browser rendering or native default actions.
const source = await fs.readFile(new URL(`app.${extension}`, root), 'utf8');
async function harness(preview = false) {
  const opened = [];
  const nodes = new Map(), windowHandlers = new Map(), documentHandlers = new Map();
  const add = (map, name, callback) => map.set(name, [...(map.get(name) || []), callback]);
  const doc = { activeElement: null, hidden: false, baseURI: 'https://uglyagi.github.io/bumbumtschak/' };
  class Element {
    constructor(name = '', tag = 'div', dataset = {}) {
      this.name = name; this.tag = tag; this.dataset = dataset;
      this.handlers = new Map(); this.attrs = new Map(); this.style = {};
      this.hidden = false; this.open = false; this.innerHTML = ''; this.clicks = 0;
      this.parentElement = { setAttribute() {} };
      const classes = new Set();
      this.classList = { add: (...x) => x.forEach(v => classes.add(v)), remove: (...x) => x.forEach(v => classes.delete(v)), toggle: (x, force) => force ? classes.add(x) : classes.delete(x) };
    }
    addEventListener(name, cb) { add(this.handlers, name, cb); }
    append() {}
    setAttribute(name, value) { this.attrs.set(name, value); }
    removeAttribute(name) { this.attrs.delete(name); }
    toggleAttribute(name, value) { value ? this.attrs.set(name, '') : this.attrs.delete(name); }
    focus() { doc.activeElement = this; }
    contains(other) { return other === this || other?.parent === this; }
    querySelector(selector) { return get(`${this.name} ${selector}`); }
    querySelectorAll() { return []; }
    getBoundingClientRect() { return { width: 1200, height: 700 }; }
    getClientRects() { return [{}]; }
    showModal() { this.open = true; }
    close() { if (!this.open) return; this.open = false; for (const cb of this.handlers.get('close') || []) cb({}); }
    matches(selector) { return selector === 'input[type=range]' && this.tag === 'input'; }
    closest(selector) {
      for (const part of selector.split(',')) {
        if (part === '[data-character]' && this.dataset.character) return this;
        if (part === '[data-member]' && this.dataset.member) return this;
        if (part === '[data-signpost]' && this.dataset.signpost) return this;
        if (part === '[data-station]' && this.dataset.station) return this;
        if (part === '[data-room-target]' && this.dataset.roomTarget) return this;
        if (part === '[data-social]' && this.dataset.social) return this;
        if (part.startsWith('button') && this.tag === 'button' && !this.disabled) return this;
        if (part === 'a[href]' && this.tag === 'a') return this;
      }
      return null;
    }
    click() { this.clicks++; for (const cb of documentHandlers.get('click') || []) cb({ target: this, detail: 0 }); }
  }
  function get(name) { if (!nodes.has(name)) nodes.set(name, new Element(name)); return nodes.get(name); }
  Object.assign(doc, { querySelector: get, querySelectorAll: () => [], addEventListener: (n, cb) => add(documentHandlers, n, cb) });
  doc.createElement = tag => new Element(tag);
  doc.body = { prepend() {}, classList: { add() {} } };
  const game = get('#game'), modal = get('#modal'), modalContent = get('#modal-content'), audio = get('#audio');
  Object.assign(audio, { paused: true, ended: false, pause() { this.paused = true; }, play() { this.paused = false; return Promise.resolve(); }, load() {} });
  const context = vm.createContext({
    ...core, ...content, ...art, ...roomArt, ...rooms, ...social, ...connection,
    loadContent: async () => ({ ok: true }), document: doc,
    window: { innerWidth: 1200, matchMedia: () => ({ matches: false }), addEventListener: (n, cb) => add(windowHandlers, n, cb), open(...args) { opened.push(args); } },
    location: { search: preview ? '?preview=1' : '' }, localStorage: { getItem: () => null, setItem() {} },
    URLSearchParams, URL, Intl, console,
    fetch: async () => ({ ok: false }), clearTimeout() {}, setTimeout: () => 1,
    ResizeObserver: class { observe() {} }, requestAnimationFrame() {},
  });
  const app = await new vm.Script(`(async () => {${source.replace(/^import .*;\n/gm, '')}\nreturn {state, enterRoom, closePanel, goToStation, frame, renderPanel, loadRecording};})()`).runInContext(context);
  const event = (key, code, target, repeat = false) => ({ key, code, target, repeat, prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } });
  function press(handlers, e) { for (const cb of handlers.get('keydown') || []) cb(e); return e; }
  return { ...app, opened, get, game, modal, modalContent, Element, event, press, documentHandlers, windowHandlers };
}

for (const [key, code] of [['Enter', 'Enter'], [' ', 'Space'], ['Enter', 'NumpadEnter']]) {
  const h = await harness();
  const monkey = new h.Element('monkey choice', 'button', { character: 'monkey' });
  const start = h.press(h.modalContent.handlers, h.event(key, code, monkey));
  assert(start.prevented && start.stopped, 'prevent native double activation');
  assert.equal(h.state.animal, 'monkey', 'confirm the focused animal, including after Tab navigation');
  assert(h.state.started && !h.modal.open);
  for (const station of core.STATIONS.filter(s => ['panda', 'parrot', 'croc'].includes(s.id))) {
    h.state.position = { x: station.x, y: station.y }; h.game.focus();
    const sceneHTML = h.game.innerHTML;
    h.press(h.windowHandlers, h.event(key, code, h.game));
    assert.equal(h.state.scene, 'world');
    assert.equal(h.state.modal, station.id);
    assert.equal(h.game.innerHTML, sceneHTML, 'talking must preserve the outdoor world');
    h.closePanel();
    assert.equal(h.state.position.x, station.x); assert.equal(h.state.position.y, station.y);
  }
  const link = new h.Element('social link', 'a');
  assert(h.press(h.documentHandlers, h.event(key, code, link)).prevented);
  assert.equal(link.clicks, 1);
  h.press(h.documentHandlers, h.event(key, code, link, true));
  assert.equal(link.clicks, 1, 'holding an action key must not activate repeatedly');
  h.enterRoom('radio'); h.state.position = { ...rooms.TAPE_SLOTS[0] }; h.game.focus();
  h.press(h.windowHandlers, h.event(key, code, h.game));
  assert.equal(h.state.tapes.carrying, content.TRACKS[0].id);
  h.state.position = { ...rooms.RADIO };
  h.press(h.windowHandlers, h.event(key, code, h.game));
  assert.equal(h.state.tapes.loaded, content.TRACKS[0].id);
  assert.equal(h.state.tapes.carrying, null);
}
const walk = await harness();
walk.press(walk.modalContent.handlers, walk.event(' ', 'Space', new walk.Element('cat', 'button', { character: 'cat' })));
walk.goToStation('panda');
let frames = 0;
while (!walk.modal.open && frames++ < 1200) walk.frame(frames * 16);
assert.equal(walk.state.scene, 'world'); assert.equal(walk.state.modal, 'panda', 'wayfinder arrival must open the biography outdoors');
walk.closePanel();
const panda = new walk.Element('panda', 'g', { station: 'panda' });
for (const cb of walk.game.handlers.get('click')) cb({ target: panda });
assert.equal(walk.state.scene, 'world'); assert.equal(walk.state.modal, 'panda', 'clicking a nearby member opens its story');
console.log('PASS: actual app handlers for Enter, Space and Numpad Enter; focused animal selection; three outdoor biographies and return positions; link activation without repeats; cassette pickup/insert; wayfinder arrival and direct stage clicks.');

const more = await harness();
more.press(more.modalContent.handlers, more.event(' ', 'Space', new more.Element('cat', 'button', { character: 'cat' })));
more.enterRoom('radio'); more.state.position = { ...rooms.TAPE_SLOTS[0] }; more.game.focus();
more.press(more.windowHandlers, more.event(' ', 'Space', more.game));
const carried = more.state.tapes.carrying;
more.state.position = { ...rooms.TAPE_SLOTS[6] };
more.press(more.windowHandlers, more.event(' ', 'Space', more.game));
assert.equal(more.state.tapes.carrying, null); assert.equal(more.state.tapes.slots[6], carried);
more.press(more.windowHandlers, more.event('Enter', 'Enter', more.game));
assert.equal(more.state.tapes.carrying, carried, 'pick up a relocated tape from its new slot');
more.enterRoom('social'); more.state.position = social.socialPads('social').find(p => p.id === 'email'); more.game.focus();
more.press(more.windowHandlers, more.event(' ', 'Space', more.game));
assert.equal(more.opened.at(-1)[0], 'mailto:bumbumtschakband@gmail.com');
const before = { ...content.TEXTS };
content.TEXTS.grown_title = 'Unsere eigenen Infos <b>Hallo</b>';
content.TEXTS.grown_intro = 'Ein eigener Text mit & und Zeilenumbrüchen.\nZweite Zeile.';
assert(more.renderPanel('grownups').includes('Unsere eigenen Infos &lt;b&gt;Hallo&lt;/b&gt;'));
assert(more.renderPanel('grownups').includes('Ein eigener Text mit &amp;'));
assert(!more.renderPanel('grownups').includes('<b>Hallo</b>'));
assert(!more.renderPanel('radio').toLowerCase().includes('spotify'));
assert(more.renderPanel('social').includes('mailto:bumbumtschakband@gmail.com'));
Object.assign(content.TEXTS, before);
console.log('PASS: relocation and pickup through real Enter/Space handlers; email action; custom page heading and paragraph; safe text rendering; no Spotify control in radio panel.');

const originalRecording = content.TRACKS[0].src;
try {
  content.TRACKS[0].src = 'blob:https://uglyagi.github.io/local-preview';
  const preview = await harness(true); preview.state.tapes.loaded = content.TRACKS[0].id; preview.loadRecording();
  assert.equal(preview.get('#audio').src, content.TRACKS[0].src);
  assert.equal(preview.get('#audio').paused, false);
  const publicWorld = await harness(); publicWorld.state.tapes.loaded = content.TRACKS[0].id; publicWorld.loadRecording();
  assert.equal(publicWorld.get('#audio').paused, true, 'local blob audio is only enabled in the explicit preview');
  content.TRACKS[0].src = 'uploads/recording.mp3'; publicWorld.loadRecording();
  assert.equal(publicWorld.get('#audio').src, 'uploads/recording.mp3');
  assert.equal(publicWorld.get('#audio').paused, false);
} finally { content.TRACKS[0].src = originalRecording; }
console.log('PASS: local preview audio and published project-relative MP3 playback.');
