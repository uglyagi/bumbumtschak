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
    scrollBy() {}
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
  const app = await new vm.Script(`(async () => {${source.replace(/^import .*;\n/gm, '')}\nreturn {state, enterRoom, leaveRoom, showPanel, closePanel, goToStation, frame, renderPanel, loadRecording, checkWorldTouch};})()`).runInContext(context);
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
more.leaveRoom(); more.state.position = social.socialPads('world').find(p => p.id === 'email'); more.game.focus();
more.press(more.windowHandlers, more.event(' ', 'Space', more.game));
assert.equal(more.state.modal, 'letter'); assert.equal(more.opened.length, 0);
assert(more.renderPanel('letter').includes(content.CONTACT.email)); more.closePanel();
const before = { ...content.TEXTS };
content.TEXTS.grown_title = 'Unsere eigenen Infos <b>Hallo</b>';
content.TEXTS.grown_intro = 'Ein eigener Text mit & und Zeilenumbrüchen.\nZweite Zeile.';
assert(more.renderPanel('grownups').includes('Unsere eigenen Infos &lt;b&gt;Hallo&lt;/b&gt;'));
assert(more.renderPanel('grownups').includes('Ein eigener Text mit &amp;'));
assert(!more.renderPanel('grownups').includes('<b>Hallo</b>'));
assert(!more.renderPanel('radio').toLowerCase().includes('spotify'));
assert(more.renderPanel('letter').includes(content.CONTACT.email));
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

for (const door of core.HOUSE_DOORS) {
  const h = await harness(); h.state.started = true; h.closePanel(); h.game.focus();
  h.state.position = { ...door.outside }; h.state.keys.add('ArrowUp');
  let tick = 0;
  while (h.state.scene === 'world' && tick < 100) h.frame(++tick * 16);
  assert.equal(h.state.scene, door.id, 'walking through the doorway automatically enters');
  assert.equal(h.state.modal, null);
  h.state.keys.add('ArrowDown');
  while (h.state.scene !== 'world' && tick < 250) h.frame(++tick * 16);
  assert.equal(h.state.scene, 'world', 'walking out automatically leaves');
  assert.equal(h.state.position.x, door.outside.x); assert.equal(h.state.position.y, door.outside.y);
  for (let i = 0; i < 10; i++) h.frame(++tick * 16);
  assert.equal(h.state.scene, 'world', 'standing outside cannot immediately re-enter');
  h.state.position = { x: door.x - 65, y: 565 }; h.state.keys.add('ArrowUp');
  for (let i = 0; i < 50; i++) h.frame(++tick * 16);
  assert.equal(h.state.scene, 'world', 'touching a wall outside the doorway does not enter');
}
for (const [id, start, direction] of [['grownups', { x: 300, y: 850 }, 'ArrowUp'], ['help', { x: 800, y: 690 }, 'ArrowDown']]) {
  for (const [key, code] of [['Enter', 'Enter'], [' ', 'Space'], ['Enter', 'NumpadEnter']]) {
    const h = await harness(); h.state.started = true; h.closePanel(); h.game.focus();
    h.state.position = { ...start }; h.state.keys.add(direction);
    let tick = 0;
    for (let i = 0; i < 50; i++) h.frame(++tick * 16);
    assert.equal(h.modal.open, false, 'approaching or touching the object must not open it');
    assert.equal(rooms.nearbyInteraction('world', h.state.position, h.state.tapes)?.id, id, 'nearby objects offer a confirmation action');
    h.press(h.windowHandlers, h.event(key, code, h.game));
    assert.equal(h.state.modal, id, 'confirmation near the object opens its enlarged view');
    assert.equal(h.state.scene, 'world');
    const point = { ...h.state.position };
    h.press(h.modalContent.handlers, h.event(key, code, h.get('#modal-content')));
    assert.equal(h.modal.open, false); assert.equal(h.state.position.x, point.x); assert.equal(h.state.position.y, point.y);
    for (let i = 0; i < 8; i++) h.frame(++tick * 16);
    assert.equal(h.modal.open, false, 'standing near the object after closing cannot reopen the overlay');
    h.press(h.windowHandlers, h.event(key, code, h.game, true));
    assert.equal(h.modal.open, false, 'holding the close key cannot reopen the overlay');
    h.press(h.windowHandlers, h.event(key, code, h.game));
    assert.equal(h.state.modal, id, 'a fresh confirmation reopens the object without walking away');
    h.closePanel();
    h.state.position = { x: 800, y: 650 }; h.frame(++tick * 16);
    h.press(h.windowHandlers, h.event(key, code, h.game));
    assert.equal(h.modal.open, false, 'confirmation away from the objects cannot open them');
    h.state.position = point; h.frame(++tick * 16);
    assert.equal(h.modal.open, false, 'moving away and touching again still requires confirmation');
    const object = new h.Element(id, 'g', { station: id });
    h.press(h.game.handlers, h.event(key, code, object));
    assert.equal(h.state.modal, id, 'confirmation on a focused nearby object opens its view');
    for (const callback of h.modal.handlers.get('cancel') || []) callback({ preventDefault() {} });
    assert.equal(h.modal.open, false, 'Escape/native cancel closes the enlarged object');
  }
}
for (const [key, code] of [['Enter', 'Enter'], [' ', 'Space'], ['Enter', 'NumpadEnter']]) {
  const h = await harness(); h.state.started = true; h.closePanel(); h.game.focus();
  h.state.position = { x: 800, y: 650 };
  h.press(h.windowHandlers, h.event(key, code, h.game));
  assert.equal(h.modal.open, false, 'confirmation on empty grass does nothing');
  h.enterRoom('radio'); h.state.position = { x: 800, y: 870 };
  h.press(h.windowHandlers, h.event(key, code, h.game));
  assert.equal(h.modal.open, false, 'confirmation on empty indoor floor does nothing');
  h.leaveRoom(); h.state.position = { x: 1265, y: 867 };
  h.press(h.windowHandlers, h.event(key, code, h.game));
  assert.equal(h.modal.open, false); assert.equal(h.state.scene, 'world'); assert.equal(h.opened.length, 0);
  const facebook = social.socialPads('world').find(p => p.id === 'facebook'); h.state.position = { ...facebook };
  const pad = new h.Element('Facebook', 'g', { social: 'facebook' });
  for (const callback of h.game.handlers.get('click')) callback({ target: pad });
  assert.equal(h.opened.length, 0, 'clicking a symbol walks there without opening its link');
  h.press(h.windowHandlers, h.event(key, code, h.game));
  assert.equal(h.opened.at(-1)[0], facebook.url);
  const email = social.socialPads('world').find(p => p.id === 'email'); h.state.position = { ...email };
  h.press(h.windowHandlers, h.event(key, code, h.game));
  assert.equal(h.state.modal, 'letter'); assert.equal(h.state.scene, 'world');
  const count = h.opened.length;
  h.press(h.documentHandlers, h.event(key, code, h.get('#modal-content')));
  assert.equal(h.modal.open, false); assert.equal(h.opened.length, count);
  assert.equal(h.state.position.x, email.x); assert.equal(h.state.position.y, email.y);
}
assert.equal(rooms.roomFor('social'), null); assert.equal(rooms.roomFor('grownups'), null);
assert.equal(social.socialPads('social').length, 0);
const index = await fs.readFile(new URL('index.html', root), 'utf8');
assert(!index.includes('class="scene-heading"')); assert(!index.includes('class="keyboard-hint"'));
assert(art.worldMarkup().includes('data-station="help"'));
console.log('PASS: automatic door entry/exit, wall rejection, desk/help require nearby confirmation, no automatic reopening, all three confirmation keys close inspections, Escape close, inactive empty ground, outdoor contact pads and letter without navigation.');
for (const id of ['radio', 'concerts', 'grownups', 'help', 'social']) {
  const h = await harness(); h.state.started = true; h.closePanel(); h.game.focus(); h.goToStation(id);
  let tick = 0;
  while (tick < 1500 && !h.modal.open && h.state.scene === 'world' && h.state.path.length) h.frame(++tick * 16);
  h.frame(++tick * 16);
  if (['radio', 'concerts'].includes(id)) assert.equal(h.state.scene, id, 'wayfinding walks through the actual entrance');
  else if (id === 'social') { assert.equal(h.state.scene, 'world'); assert.equal(h.modal.open, false); assert.equal(h.opened.length, 0); }
  else {
    assert.equal(h.modal.open, false, 'wayfinding reaches the object without opening it');
    h.press(h.windowHandlers, h.event('Enter', 'Enter', h.game));
    assert.equal(h.state.modal, id, 'confirmation after arriving opens the object');
  }
}
console.log('PASS: walking routes to both entrances, desk, hint sign and outdoor contact area.');
