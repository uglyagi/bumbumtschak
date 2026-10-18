import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
const extension = 'js';
const [core, content, art, roomArt, rooms, social, painting] = await Promise.all(
  ['game-core', 'content', 'art', 'room-art', 'rooms', 'social', 'painting'].map(name => import(new URL(`${name}.${extension}`, root))));
const connection = await import(new URL(`connection.${extension}`, root));
const sky = await import(new URL(`sky-world.${extension}`, root));
const dance = await import(new URL(`dance-party.${extension}`, root));

// Exercise the application's real registered handlers with DOM test doubles.
// This checks app behavior, not browser rendering or native default actions.
const source = await fs.readFile(new URL(`app.${extension}`, root), 'utf8');
async function harness(preview = false, savedAnimal = '', savedDrawing = null) {
  const opened = [];
  const stored = new Map(savedAnimal ? [['bbt-animal', savedAnimal]] : []);
  if (savedDrawing) stored.set(preview ? 'bbt-paint-preview' : 'bbt-paint-world', JSON.stringify(savedDrawing));
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
      this.classList = { add: (...x) => x.forEach(v => classes.add(v)), remove: (...x) => x.forEach(v => classes.delete(v)), toggle: (x, force) => force ? classes.add(x) : classes.delete(x), contains: value => classes.has(value) };
    }
    addEventListener(name, cb) { add(this.handlers, name, cb); }
    append() {}
    scrollBy() {}
    setAttribute(name, value) { this.attrs.set(name, value); }
    getAttribute(name) { return this.attrs.get(name) ?? null; }
    removeAttribute(name) { this.attrs.delete(name); }
    toggleAttribute(name, value) { value ? this.attrs.set(name, '') : this.attrs.delete(name); }
    focus() { doc.activeElement = this; }
    contains(other) { return other === this || other?.parent === this; }
    querySelector(selector) { return get(`${this.name} ${selector}`); }
    get innerHTML() { return this.markup || ''; }
    set innerHTML(value) {
      this.markup = value;
      if (this.name !== '#game') return;
      this.paintNodes = [];
      for (const match of value.matchAll(/<([a-z]+)\b([^>]*\bdata-paint-(?:target|ink)="[^"]+"[^>]*)>/g)) {
        const attributes = [...match[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(attribute => [attribute[1], attribute[2]]);
        const node = new Element('paint node', match[1]); node.attrs = new Map(attributes);
        node.dataset = { paintTarget: node.getAttribute('data-paint-target'), paintProperty: node.getAttribute('data-paint-property'), paintInk: node.getAttribute('data-paint-ink') };
        node.style.color = node.getAttribute('style')?.match(/color:([^;]+)/)?.[1] || '';
        this.paintNodes.push(node);
      }
    }
    querySelectorAll(selector) {
      const match = selector?.match(/^\[data-paint-(target|ink)="([^"]+)"\]$/);
      return this.name === '#game' && match ? (this.paintNodes || []).filter(node => node.dataset[match[1] === 'target' ? 'paintTarget' : 'paintInk'] === match[2]) : [];
    }
    getBoundingClientRect() { return { width: 1200, height: 700 }; }
    getScreenCTM() { return { inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) }; }
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
        if (part === '[data-paint-target]' && this.dataset.paintTarget) return this;
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
    ...core, ...content, ...art, ...roomArt, ...rooms, ...social, ...painting, ...connection, ...sky, ...dance,
    loadContent: async () => ({ ok: true }), document: doc,
    window: { innerWidth: 1200, matchMedia: () => ({ matches: false }), addEventListener: (n, cb) => add(windowHandlers, n, cb), open(...args) { opened.push(args); } },
    location: { search: preview ? '?preview=1' : '' }, localStorage: { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) },
    URLSearchParams, URL, Intl, console,
    DOMPoint: class { constructor(x = 0, y = 0) { this.x = x; this.y = y; } matrixTransform(m) { return { x: m.a * this.x + m.c * this.y + m.e, y: m.b * this.x + m.d * this.y + m.f }; } },
    fetch: async () => ({ ok: false }), clearTimeout() {}, setTimeout: () => 1,
    ResizeObserver: class { observe() {} }, requestAnimationFrame() {},
  });
  const app = await new vm.Script(`(async () => {${source.replace(/^import .*;\n/gm, '')}\nreturn {state, enterRoom, leaveRoom, showPanel, closePanel, goToStation, frame, renderPanel, loadRecording, checkWorldTouch, currentInteraction};})()`).runInContext(context);
  const event = (key, code, target, repeat = false) => ({ key, code, target, repeat, prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } });
  function press(handlers, e) { for (const cb of handlers.get('keydown') || []) cb(e); return e; }
  return { ...app, opened, stored, get, game, modal, modalContent, Element, event, press, documentHandlers, windowHandlers };
}

function flyIntoSky(h, key = 'Enter', code = 'Enter', clock = 1000) {
  h.state.position = { ...h.state.rocket.position }; h.game.focus();
  h.press(h.windowHandlers, h.event(key, code, h.game));
  assert(h.state.rocket.riding && !h.state.rocket.airborne, 'confirmation seats the selected animal in the parked rocket');
  assert(h.game.innerHTML.includes(`href="#animal-${h.state.animal}"`));
  assert.equal(h.state.scene, 'world', 'boarding is not a teleport');
  h.state.keys.add('ArrowUp');
  while (h.state.position.y > -180 && clock < 3000) h.frame(++clock * 16);
  h.state.keys.clear();
  assert.equal(h.state.scene, 'sky'); assert(h.state.rocket.riding && h.state.rocket.airborne);
  return clock;
}
function landAndExit(h, key = 'Enter', code = 'Enter', clock = 3100) {
  const button = new h.Element('land', 'button', { action: 'exit-walk' }); button.click();
  while (h.state.rocket.airborne && clock < 5000) h.frame(++clock * 16);
  assert.equal(h.state.scene, 'world'); assert(h.state.rocket.riding && !h.state.rocket.airborne);
  h.game.focus(); h.press(h.windowHandlers, h.event(key, code, h.game));
  assert.equal(h.state.rocket.riding, false); assert.equal(h.state.scene, 'world');
  return clock;
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
  h.state.position = { x: door.x - 65, y: door.outside.y }; h.state.keys.add('ArrowUp');
  for (let i = 0; i < 50; i++) h.frame(++tick * 16);
  assert.equal(h.state.scene, 'world', 'touching a wall outside the doorway does not enter');
}
for (const [id, start, direction] of [['grownups', { x: 300, y: 850 }, 'ArrowUp'], ['help', { x: 1000, y: 690 }, 'ArrowDown']]) {
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
    h.state.position = { ...core.WORLD_SPAWN }; h.frame(++tick * 16);
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
  h.state.position = { ...core.WORLD_SPAWN };
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
console.log('PASS: automatic door entry/exit, wall rejection, office/help require nearby confirmation, no automatic reopening, all three confirmation keys close inspections, Escape close, inactive empty ground, outdoor contact pads and letter without navigation.');
for (const id of ['radio', 'concerts', 'wardrobe', 'grownups', 'help', 'social']) {
  const h = await harness(); h.state.started = true; h.closePanel(); h.game.focus(); h.goToStation(id);
  let tick = 0;
  while (tick < 1500 && !h.modal.open && h.state.scene === 'world' && h.state.path.length) h.frame(++tick * 16);
  h.frame(++tick * 16);
  if (['radio', 'concerts', 'wardrobe'].includes(id)) assert.equal(h.state.scene, id, 'wayfinding walks through the actual entrance');
  else if (id === 'social') { assert.equal(h.state.scene, 'world'); assert.equal(h.modal.open, false); assert.equal(h.opened.length, 0); }
  else {
    assert.equal(h.modal.open, false, 'wayfinding reaches the object without opening it');
    h.press(h.windowHandlers, h.event('Enter', 'Enter', h.game));
    assert.equal(h.state.modal, id, 'confirmation after arriving opens the object');
  }
}
console.log('PASS: walking routes to all three entrances, desk, relocated hint sign and outdoor contact area.');

for (const [key, code] of [['Enter', 'Enter'], [' ', 'Space'], ['Enter', 'NumpadEnter']]) {
  const h = await harness(); h.state.started = true; h.closePanel(); h.enterRoom('wardrobe');
  const carried = content.TRACKS[0].id; h.state.tapes.carrying = carried;
  for (const spot of rooms.ANIMAL_SPOTS) {
    h.state.position = { ...spot }; h.game.focus(); h.frame(16);
    const previousAnimal = h.state.animal;
    h.press(h.windowHandlers, h.event(key, code, h.game, true));
    assert.equal(h.state.animal, previousAnimal, 'holding confirmation does not change the character');
    h.press(h.windowHandlers, h.event(key, code, h.game));
    assert.equal(h.state.animal, spot.id); assert.equal(h.stored.get('bbt-animal'), spot.id);
    assert.equal(h.state.scene, 'wardrobe'); assert.equal(h.modal.open, false);
    assert.equal(h.state.position.x, spot.x); assert.equal(h.state.position.y, spot.y);
    assert.equal(h.state.tapes.carrying, carried, 'changing characters preserves the carried cassette');
    assert(h.game.innerHTML.includes(`data-room-target="animal:${spot.id}"`));
    assert.equal((h.game.innerHTML.match(/aria-pressed="true"/g) || []).length, 1);
    assert.equal(h.get('#player-use').attrs.get('href'), `#animal-${spot.id}`);
  }
  h.state.position = { ...rooms.ROOM_SPAWN }; h.game.focus();
  const cat = new h.Element('cat choice', 'g', { roomTarget: 'animal:cat' });
  h.press(h.game.handlers, h.event(key, code, cat));
  let tick = 0;
  while (h.state.path.length && tick < 1000) h.frame(++tick * 16);
  assert.equal(h.state.animal, 'monkey', 'walking to a different animal does not select it automatically');
  h.press(h.game.handlers, h.event(key, code, cat));
  assert.equal(h.state.animal, 'cat', 'confirmation on a focused nearby animal selects it');
  h.press(h.windowHandlers, h.event('Escape', 'Escape', h.game));
  assert.equal(h.state.scene, 'world'); assert.equal(h.state.animal, 'cat');
}
const restored = await harness(false, 'monkey');
assert.equal(restored.state.animal, 'monkey'); assert.equal(restored.state.started, true);
assert(core.canStand(restored.state.position.x, restored.state.position.y));
assert.equal(core.worldTouch(restored.state.position), null, 'initial spawn does not enter a house automatically');
assert(art.worldMarkup().includes('data-station="wardrobe"'));
console.log('PASS: all four characters switch inside the house with Enter, Space or Numpad Enter, focused targets walk before confirming, selected sprite and saved choice update, cassette state survives, Escape exits and the initial spawn is safe.');

for (const [key, code] of [['Enter', 'Enter'], [' ', 'Space'], ['Enter', 'NumpadEnter']]) {
  const h = await harness(); h.state.started = true; h.closePanel(); h.enterRoom('wardrobe');
  assert.equal(h.currentInteraction(), null, 'the house entrance leaves all cans visible and selects no action automatically');
  const blue = painting.paintSlots(content.PALETTE).find(color => color.id === 'blue');
  h.state.position = { ...blue }; h.game.focus();
  h.press(h.windowHandlers, h.event(key, code, h.game, true));
  assert.equal(h.state.paintCan, null, 'repeated confirmation does not pick up a can');
  h.press(h.windowHandlers, h.event(key, code, h.game));
  assert.equal(h.state.paintCan, 'blue');
  assert(h.get('#carried-paint').innerHTML.includes(blue.color));
  h.leaveRoom(); h.state.position = { x: 700, y: 475 }; h.game.focus();
  assert.equal(h.currentInteraction().id, 'path');
  h.press(h.windowHandlers, h.event(key, code, h.game));
  assert.equal(h.state.paint.path, blue.color);
  assert.equal(JSON.parse(h.stored.get('bbt-paint-world')).path, blue.color);
  const water = new h.Element('water', 'g', { paintTarget: 'water' });
  h.press(h.game.handlers, h.event(key, code, water));
  assert.equal(h.state.paint.water, undefined, 'a distant ground surface requires walking there first');
  let tick = 0;
  while (h.state.path.length && tick < 1500) h.frame(++tick * 16);
  assert.equal(h.state.scene, 'world'); assert.equal(h.state.paint.water, undefined);
  h.press(h.windowHandlers, h.event(key, code, h.game));
  assert.equal(h.state.paint.water, blue.color, 'confirmation after walking paints the selected surface');
  for (const surface of painting.PAINT_SURFACES.filter(surface => !surface.sky)) {
    h.state.position = { ...surface.walk }; h.game.focus();
    assert(core.canStand(h.state.position.x, h.state.position.y), surface.id + ' has an accessible painting spot');
    assert(painting.canPaintSurface(h.state.position, surface), surface.id + ' can be reached from its painting spot');
    const target = new h.Element(surface.id, 'g', { paintTarget: surface.id });
    h.press(h.game.handlers, h.event(key, code, target));
    assert.equal(h.state.paint[surface.id], blue.color, surface.id + ' is painted through the real keyboard handler');
  }
  const sun = new h.Element('sun', 'g', { paintTarget: 'sun' });
  h.press(h.game.handlers, h.event(key, code, sun));
  assert.equal(h.state.path.length, 0, 'a focused sky target cannot bypass the rocket');
  assert.equal(h.state.paint.sun, undefined);
  flyIntoSky(h, key, code);
  assert.equal(h.state.paintCan, 'blue', 'the paint can stays with the pilot');
  for (const surface of painting.PAINT_SURFACES.filter(surface => surface.sky)) {
    h.state.position = { ...surface.walk }; h.state.rocket.position = { ...surface.walk }; h.game.focus();
    const target = new h.Element(surface.id, 'g', { paintTarget: surface.id });
    h.press(h.game.handlers, h.event(key, code, target));
    assert.equal(h.state.paint[surface.id], blue.color, surface.id + ' can be painted from inside the flying rocket');
  }
  landAndExit(h, key, code); assert.equal(h.state.paintCan, 'blue');
  const drawing = JSON.parse(h.stored.get('bbt-paint-world'));
  const reload = await harness(false, 'cat', drawing);
  assert.equal(Object.keys(reload.state.paint).length, painting.PAINT_SURFACES.length);
  h.press(h.windowHandlers, h.event('Escape', 'Escape', h.game));
  assert.equal(h.state.paintCan, null); assert.equal(h.modal.open, false); assert.equal(h.state.scene, 'world');
  h.enterRoom('wardrobe'); h.state.position = { ...painting.PAINT_RESET }; h.game.focus();
  h.press(h.windowHandlers, h.event(key, code, h.game));
  assert.equal(Object.keys(h.state.paint).length, 0); assert.equal(h.stored.get('bbt-paint-world'), '{}');
  h.state.position = { ...blue }; h.game.focus();
  h.press(h.windowHandlers, h.event(key, code, h.game));
  h.press(h.windowHandlers, h.event(key, code, h.game));
  assert.equal(h.state.paintCan, null, 'confirming at the same spot returns the carried can');
}
const basePalette = [...content.PALETTE];
try {
  content.PALETTE.push({ id: 'orange', name: 'Orange', color: '#ff9900' });
  const h = await harness(); h.state.started = true; h.closePanel(); h.enterRoom('wardrobe');
  h.state.position = { ...painting.PAINT_NEXT }; h.game.focus();
  h.press(h.windowHandlers, h.event(' ', 'Space', h.game));
  assert.equal(h.state.paintPage, 1); assert(h.game.innerHTML.includes('Orange'));
  h.state.position = { ...painting.paintSlots(content.PALETTE, 1)[0] }; h.game.focus();
  h.press(h.windowHandlers, h.event('Enter', 'Enter', h.game));
  assert.equal(h.state.paintCan, 'orange', 'a newly added color is usable on the next page');
} finally { content.PALETTE.splice(0, content.PALETTE.length, ...basePalette); }
console.log('PASS: taking, carrying and returning paint cans, walking to distant surfaces, all paintable surfaces, local save/reload, Escape, reset and newly added palette colors through the real keyboard handlers.');

for (const [key, code] of [['Enter', 'Enter'], [' ', 'Space']]) {
  const h = await harness(false, 'cat', { path: '#ff3935' });
  const node = id => h.game.querySelectorAll(`[data-paint-target="${id}"]`)[0];
  const pick = id => {
    h.enterRoom('wardrobe'); h.state.position = { ...painting.paintSlots(content.PALETTE).find(color => color.id === id) }; h.game.focus();
    h.press(h.windowHandlers, h.event(key, code, h.game)); h.leaveRoom();
  };
  pick('yellow'); h.state.position = { x: 700, y: 475 }; h.frame(16);
  assert.equal(node('path').getAttribute('stroke'), '#fff20b', 'standing on the path previews the held yellow color');
  assert.equal(h.state.paint.path, '#ff3935'); assert.equal(JSON.parse(h.stored.get('bbt-paint-world')).path, '#ff3935');
  h.state.position = { x: 1000, y: 600 }; h.frame(32);
  assert.equal(node('path').getAttribute('stroke'), '#ff3935', 'leaving the path restores its last confirmed color');
  assert.equal(node('grass').getAttribute('fill'), '#fff20b'); assert.equal(h.state.paint.grass, undefined);
  h.showPanel('help'); assert.equal(node('grass').getAttribute('fill'), '#40cea1', 'opening a panel clears the temporary preview');
  h.closePanel(); h.frame(48); assert.equal(node('grass').getAttribute('fill'), '#fff20b');
  h.press(h.windowHandlers, h.event('Escape', 'Escape', h.game));
  assert.equal(node('grass').getAttribute('fill'), '#40cea1'); assert.equal(h.state.paint.path, '#ff3935');
  pick('yellow'); h.state.position = { x: 700, y: 475 }; h.frame(64);
  const path = new h.Element('path', 'path', { paintTarget: 'path' });
  for (const callback of h.game.handlers.get('click')) callback({ target: path });
  assert.equal(h.state.paint.path, '#ff3935', 'clicking only selects the preview and never commits a color');
  h.press(h.windowHandlers, h.event(key, code, h.game, true)); assert.equal(h.state.paint.path, '#ff3935');
  h.press(h.windowHandlers, h.event(key, code, h.game));
  assert.equal(h.state.paint.path, '#fff20b'); assert.equal(JSON.parse(h.stored.get('bbt-paint-world')).path, '#fff20b');
  pick('blue'); h.state.position = { x: 700, y: 475 }; h.frame(80);
  assert.equal(node('path').getAttribute('stroke'), '#1d55ff');
  flyIntoSky(h, key, code);
  h.state.position = { ...painting.PAINT_SURFACES.find(surface => surface.id === 'cloud-0').walk }; h.frame(48000);
  assert.equal(node('cloud-0').style.color, '#1d55ff'); assert.equal(h.state.paint['cloud-0'], undefined);
  h.press(h.windowHandlers, h.event('Escape', 'Escape', h.game));
  assert.equal(node('cloud-0').style.color, '#ffffff', 'unconfirmed cloud colors are restored when the can is put down');
  assert.equal(node('path').getAttribute('stroke'), '#fff20b', 'discarding a later preview keeps the previously confirmed yellow');
  assert.equal(JSON.parse(h.stored.get('bbt-paint-world')).path, '#fff20b');
  landAndExit(h, key, code);
  pick('white'); flyIntoSky(h, key, code);
  h.state.position = { ...painting.PAINT_SURFACES.find(surface => surface.id === 'cloud-0').walk }; h.frame(48000);
  assert.equal(node('cloud-0').style.color, '#ffffff'); assert.equal(h.state.paint['cloud-0'], undefined);
  h.press(h.windowHandlers, h.event(key, code, h.game)); assert.equal(h.state.paint['cloud-0'], '#ffffff');
}
console.log('PASS: temporary color previews follow movement, restore confirmed colors, do not save on click or key repeat, commit only on Enter/Space, clear on Escape and panels, and include white clouds.');

for (const animal of ['cat', 'dog', 'horse', 'monkey']) {
  const h = await harness(false, animal), can = painting.paintSlots(content.PALETTE).find(color => color.id === 'red');
  h.enterRoom('wardrobe'); h.state.position = { ...can }; h.game.focus();
  h.press(h.windowHandlers, h.event('Enter', 'Enter', h.game)); h.leaveRoom();
  let clock = flyIntoSky(h);
  assert(h.game.innerHTML.includes(`<use id="rocket-pilot" href="#animal-${animal}"`));
  assert(h.get('#rocket-paint').innerHTML.includes(can.color), 'the carried bucket is visible on the rocket');
  const inAir = { ...h.state.position };
  new h.Element('music shortcut', 'button', { open: 'radio' }).click();
  assert.equal(h.state.scene, 'sky'); assert(h.state.rocket.riding && h.state.rocket.airborne);
  assert.deepEqual({ ...h.state.position }, inAir, 'house shortcuts cannot make the pilot leave a rocket in the air');
  h.game.focus(); h.press(h.windowHandlers, h.event(' ', 'Space', h.game));
  assert(h.state.rocket.riding && h.state.rocket.airborne, 'confirmation in the air paints rather than exiting');
  assert.equal(h.state.paintCan, 'red');
  h.state.keys.add('ArrowLeft');
  for (let i = 0; i < 15; i++) h.frame(++clock * 16);
  h.state.keys.clear(); assert(h.state.position.x < inAir.x - 40, 'direction keys steer the flying rocket');
  h.state.keys.add('ArrowRight');
  for (let i = 0; i < 15; i++) h.frame(++clock * 16);
  h.state.keys.clear(); h.state.keys.add('ArrowDown');
  while (h.state.rocket.airborne && clock < 3000) h.frame(++clock * 16);
  assert.equal(h.state.scene, 'world'); assert(h.state.rocket.riding && !h.state.rocket.airborne);
  assert(h.state.position.y >= 63, 'touching the grass lands the rocket without teleporting');
  assert.equal(h.currentInteraction().kind, 'rocket-exit');
  h.game.focus(); h.press(h.windowHandlers, h.event(' ', 'Space', h.game));
  assert.equal(h.state.rocket.riding, false); assert.equal(h.state.paintCan, 'red');
  assert(core.canStand(h.state.position.x, h.state.position.y, core.WORLD.radius, 'world', h.state.rocket.position));
  assert.equal(h.state.animal, animal);
  assert.equal(h.currentInteraction().kind, 'rocket-board', 'the rocket stays at its landing site and can be boarded again');
  h.press(h.windowHandlers, h.event('Enter', 'NumpadEnter', h.game));
  assert(h.state.rocket.riding && !h.state.rocket.airborne);
}
console.log('PASS: all four animals sit visibly inside, fly with their bucket using direction keys, cannot exit through house shortcuts while airborne, land on grass, step out and reboard at the landing site.');

const returning = await harness(false, 'cat');
returning.state.rocket.riding = true; returning.state.rocket.airborne = true;
returning.state.position = { x: 1100, y: 650 }; returning.state.rocket.position = { ...returning.state.position };
new returning.Element('return from a flight over the meadow', 'button', { action: 'exit-walk' }).click();
let returnClock = 0;
while (returning.state.rocket.airborne && returnClock < 500) returning.frame(++returnClock * 16);
assert(!returning.state.rocket.airborne && returning.state.rocket.riding, 'the return button also lands when approaching its destination from below');

const mousePaint = await harness(false, 'cat', { path: '#ff3935' });
mousePaint.enterRoom('wardrobe'); mousePaint.state.position = { ...painting.paintSlots(content.PALETTE).find(color => color.id === 'blue') }; mousePaint.game.focus();
mousePaint.press(mousePaint.windowHandlers, mousePaint.event('Enter', 'Enter', mousePaint.game)); mousePaint.leaveRoom();
mousePaint.state.position = { x: 700, y: 475 }; mousePaint.state.paintTarget = 'path'; mousePaint.frame(16);
assert.equal(mousePaint.get('#interact').hidden, true, 'paint surfaces do not display a contextual action button');
assert.equal(mousePaint.get('#interact').innerHTML, '');
mousePaint.get('#world-svg').getScreenCTM = () => ({ inverse: () => ({ a: .5, b: 0, c: 0, d: .5, e: -10, f: -20 }) });
for (const callback of mousePaint.game.handlers.get('click')) callback({ target: new mousePaint.Element('grass', 'path', { paintTarget: 'grass' }), clientX: 2120, clientY: 1320 });
assert.equal(mousePaint.state.paintTarget, null, 'pointer movement never selects a paint surface');
assert.equal(mousePaint.state.path.at(-1).x, 1050); assert.equal(mousePaint.state.path.at(-1).y, 640, 'the clicked point is transformed into world coordinates');
assert.equal(mousePaint.state.paint.path, '#ff3935'); assert.equal(mousePaint.state.paint.grass, undefined);
let mouseClock = 1;
while (mousePaint.state.path.length && mouseClock < 1000) mousePaint.frame(++mouseClock * 16);
assert(Math.hypot(mousePaint.state.position.x - 1050, mousePaint.state.position.y - 640) < 5, 'the pointer steers the animal to the actual clicked spot');
assert.equal(mousePaint.get('#interact').hidden, true); assert.equal(mousePaint.state.paint.grass, undefined);
for (const callback of mousePaint.get('#interact').handlers.get('click')) callback({});
assert.equal(mousePaint.state.paint.grass, undefined, 'even a stale mouse action cannot commit a color');
mousePaint.game.focus(); mousePaint.press(mousePaint.windowHandlers, mousePaint.event(' ', 'Space', mousePaint.game));
assert.equal(mousePaint.state.paint.grass, '#1d55ff', 'confirmation by keyboard still commits the preview');
console.log('PASS: holding a paint bucket makes mouse clicks steer to the actual transformed point, without selecting or committing colors or displaying contextual paint actions; Space still paints.');

const spaceFlight = await harness(false, 'monkey', { path: '#ff3935' });
spaceFlight.enterRoom('wardrobe'); spaceFlight.state.position = { ...painting.paintSlots(content.PALETTE).find(color => color.id === 'white') }; spaceFlight.game.focus();
spaceFlight.press(spaceFlight.windowHandlers, spaceFlight.event('Enter', 'Enter', spaceFlight.game)); spaceFlight.leaveRoom();
spaceFlight.state.position = { ...sky.GROUND_ROCKET }; spaceFlight.game.focus();
spaceFlight.press(spaceFlight.windowHandlers, spaceFlight.event('Enter', 'Enter', spaceFlight.game));
spaceFlight.state.keys.add('ArrowUp');
let spaceTick = 0, firstSpace = null;
while (spaceTick < 450) {
  spaceFlight.frame(++spaceTick * 16);
  if (spaceTick * 16 < 6000) assert.notEqual(spaceFlight.state.scene, 'space');
  if (spaceFlight.state.scene === 'space' && firstSpace === null) firstSpace = spaceTick * 16;
}
assert(firstSpace >= 6000 && firstSpace <= 7000, String(firstSpace));
assert.equal(spaceFlight.state.scene, 'space'); assert.equal(spaceFlight.state.viewport.w, 1200, 'space uses one world unit per CSS pixel at this viewport');
assert.equal(spaceFlight.state.paintCan, 'white'); assert.equal(spaceFlight.state.animal, 'monkey');
assert(spaceFlight.game.innerHTML.includes('data-planet="neptune"'));
spaceFlight.state.keys.clear(); spaceFlight.game.focus(); spaceFlight.press(spaceFlight.windowHandlers, spaceFlight.event(' ', 'Space', spaceFlight.game));
assert(spaceFlight.state.rocket.riding && spaceFlight.state.rocket.airborne, 'the pilot cannot leave in space');
spaceFlight.state.keys.add('ArrowUp');
while (spaceFlight.state.position.y > -6750 && spaceTick < 2400) spaceFlight.frame(++spaceTick * 16);
spaceFlight.state.keys.clear(); assert(spaceFlight.state.position.y < -6700, 'the flight reaches beyond all eight planets');
new spaceFlight.Element('return from deep space', 'button', { action: 'exit-walk' }).click();
const returnScenes = new Set();
while (spaceFlight.state.rocket.airborne && spaceTick < 6000) { spaceFlight.frame(++spaceTick * 16); returnScenes.add(spaceFlight.state.scene); }
assert(returnScenes.has('space') && returnScenes.has('sky') && returnScenes.has('world'));
assert(!spaceFlight.state.rocket.airborne && spaceFlight.state.rocket.riding);
spaceFlight.game.focus(); spaceFlight.press(spaceFlight.windowHandlers, spaceFlight.event('Enter', 'Enter', spaceFlight.game));
assert.equal(spaceFlight.state.rocket.riding, false); assert.equal(spaceFlight.state.paintCan, 'white');
assert.equal(spaceFlight.state.paint.path, '#ff3935');
console.log('PASS: real Up handlers enter space after ' + firstSpace + ' ms, retain the pilot, bucket and drawing, reach every planet and return through sky to a safe landing and exit.');

const dancingTrack = content.TRACKS.find(track => track.id === 'tanzen'), originalDanceAudio = dancingTrack.src;
try {
  dancingTrack.src = 'uploads/tanzen.mp3';
  const h = await harness(false, 'dog'); h.enterRoom('radio');
  h.state.position = { ...rooms.findTapeSlot(h.state.tapes, 'tanzen') }; h.game.focus();
  h.press(h.windowHandlers, h.event('Enter', 'Enter', h.game)); h.state.position = { ...rooms.RADIO };
  h.press(h.windowHandlers, h.event(' ', 'Space', h.game));
  assert.equal(h.state.tapes.loaded, 'tanzen'); assert(h.state.party.active && h.state.playing);
  const layer = h.get('#dance-party');
  assert(layer.innerHTML.includes('id="disco-ball"')); assert.equal(h.state.party.castKey, 'cat,horse,monkey');
  assert(!layer.innerHTML.includes('data-party-guest="dog"')); assert(layer.classList.contains('is-dancing'));
  assert.equal(h.get('#party-dancer-cat').getAttribute('transform'), 'translate(800.00 1040.00)');
  let partyTick = 0;
  for (let i = 0; i < 400; i++) h.frame(++partyTick * 16);
  assert.equal(h.get('#party-dancer-cat').getAttribute('transform'), 'translate(700.00 620.00)');
  assert(h.get('#party-dancer-monkey').classList.contains('has-arrived'));
  h.get('#audio').pause(); for (const callback of h.get('#audio').handlers.get('pause')) callback({});
  assert.equal(layer.classList.contains('is-dancing'), false, 'audio pause stops the dance and lights');
  await h.get('#audio').play(); for (const callback of h.get('#audio').handlers.get('play')) callback({});
  assert(layer.classList.contains('is-dancing'));
  h.showPanel('radio-info'); h.closePanel(); assert(layer.classList.contains('is-dancing'), 'the party resumes when a menu closes');
  h.state.position = { x: 800, y: 970 }; h.state.keys.add('ArrowDown');
  while (h.state.scene === 'radio' && partyTick < 450) h.frame(++partyTick * 16);
  assert.equal(h.state.scene, 'world', 'dancing guests never block the exit'); assert.equal(h.state.party.active, false);
  h.enterRoom('radio'); assert(h.state.party.active); assert.equal(h.state.party.elapsed, 0);
  new h.Element('horse selection', 'button', { character: 'horse' }).click();
  assert.equal(h.state.party.castKey, 'cat,dog,monkey', 'guest images follow a changed player selection');
  h.state.position = { ...rooms.RADIO }; h.game.focus(); h.press(h.windowHandlers, h.event('Enter', 'Enter', h.game));
  assert.equal(h.state.party.active, false); assert.equal(layer.getAttribute('hidden'), '');
  h.state.position = { ...rooms.TAPE_SLOTS[1] }; h.press(h.windowHandlers, h.event('Enter', 'Enter', h.game));
  h.state.position = { ...rooms.TAPE_SLOTS[0] }; h.press(h.windowHandlers, h.event('Enter', 'Enter', h.game));
  h.state.position = { ...rooms.RADIO }; h.press(h.windowHandlers, h.event(' ', 'Space', h.game));
  assert.notEqual(h.state.tapes.loaded, 'tanzen'); assert.equal(h.state.party.active, false, 'other songs do not keep the dance effect');
} finally { dancingTrack.src = originalDanceAudio; }
console.log('PASS: inserting Tanzen starts the guest entrance, dancing and disco ball; pause/resume, selection changes, cassette removal/song changes and walking out all behave correctly.');
