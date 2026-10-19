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
const studio = await import(new URL(`painting-studio.${extension}`, root));
const adventure = await import(new URL(`rocket-adventure.${extension}`, root));
const adventureArt = await import(new URL(`adventure-art.${extension}`, root));
const toolbox = await import(new URL(`toolbox.${extension}`, root));

// Exercise the application's real registered handlers with DOM test doubles.
// This checks app behavior, not browser rendering or native default actions.
const source = await fs.readFile(new URL(`app.${extension}`, root), 'utf8');
async function harness(preview = false, savedAnimal = '', savedDrawing = null, damaged = false) {
  const opened = [];
  const stored = new Map(savedAnimal ? [['bbt-animal', savedAnimal]] : []);
  if (savedDrawing) stored.set(preview ? 'bbt-paint-preview' : 'bbt-paint-world', JSON.stringify(savedDrawing));
  if (damaged) stored.set(preview ? 'bbt-rocket-preview-damaged' : 'bbt-rocket-damaged', '1');
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
    getScreenCTM() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) }; }
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
        if (part === '[data-studio-color]' && this.dataset.studioColor) return this;
        if (part === '[data-studio-control]' && this.dataset.studioControl) return this;
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
  for (const node of [audio, get('#member-audio')]) Object.assign(node, { paused: true, ended: false, currentTime: 0, pause() { this.paused = true; }, play() { this.paused = false; this.ended = false; return Promise.resolve(); }, load() {} });
  const context = vm.createContext({
    ...core, ...content, ...art, ...roomArt, ...rooms, ...social, ...painting, ...connection, ...sky, ...dance, ...studio, ...adventure, ...adventureArt, ...toolbox,
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
  return { ...app, opened, stored, get, game, modal, modalContent, Element, event, press, documentHandlers, windowHandlers, doc };
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
  assert.equal(h.currentInteraction(), null, 'a bucket cannot preview or paint the path');
  h.press(h.windowHandlers, h.event(key, code, h.game));
  assert.equal(h.state.paint.path, undefined);
  for (const surface of painting.BUCKET_SURFACES) {
    h.state.position = { ...surface.walk }; h.game.focus();
    assert(core.canStand(h.state.position.x, h.state.position.y), surface.id + ' has an accessible painting spot');
    const target = new h.Element(surface.id, 'g', { paintTarget: surface.id });
    h.press(h.game.handlers, h.event(key, code, target));
    assert.equal(h.state.paint[surface.id], blue.color, surface.id + ' is painted through the real keyboard handler');
  }
  for (const surface of painting.PAINT_SURFACES.filter(surface => !painting.BUCKET_SURFACES.includes(surface))) {
    h.state.position = { ...surface.walk }; h.game.focus();
    h.press(h.game.handlers, h.event(key, code, new h.Element(surface.id, 'g', { paintTarget: surface.id })));
    assert.equal(h.state.paint[surface.id], undefined, surface.id + ' stays exclusive to the landscape picture');
    assert.equal(h.state.path.length, 0, 'focused large surfaces cannot bypass the bucket restriction');
  }
  h.state.position = { ...sky.GROUND_ROCKET }; flyIntoSky(h, key, code);
  assert.equal(h.state.paintCan, 'blue', 'the bucket stays with the pilot');
  assert.equal(h.currentInteraction(), null, 'buckets cannot recolor sky objects');
  landAndExit(h, key, code);
  const drawing = JSON.parse(h.stored.get('bbt-paint-world'));
  const reload = await harness(false, 'cat', drawing);
  assert.equal(Object.keys(reload.state.paint).length, painting.BUCKET_SURFACES.length);
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
console.log('PASS: taking, carrying and returning paint cans, all trees and flowers, rejecting every large picture surface, local save/reload, Escape, reset and newly added palette colors through the real keyboard handlers.');

for (const [key, code] of [['Enter', 'Enter'], [' ', 'Space']]) {
  const h = await harness(false, 'cat', { path: '#ff3935', 'flower-0': '#ff3935' });
  const node = id => h.game.querySelectorAll(`[data-paint-target="${id}"]`)[0];
  h.enterRoom('wardrobe'); h.state.position = { ...painting.paintSlots(content.PALETTE).find(color => color.id === 'yellow') }; h.game.focus();
  h.press(h.windowHandlers, h.event(key, code, h.game)); h.leaveRoom();
  const flower = painting.BUCKET_SURFACES.find(surface => surface.id === 'flower-0');
  h.state.position = { ...flower.walk }; h.frame(16);
  assert.equal(node(flower.id).style.color, '#fff20b', 'standing near a flower previews the held color');
  assert.equal(h.state.paint[flower.id], '#ff3935');
  h.state.position = { x: 1000, y: 600 }; h.frame(32);
  assert.equal(node(flower.id).style.color, '#ff3935', 'walking away restores the confirmed color');
  assert.equal(node('grass').getAttribute('fill'), '#40cea1'); assert.equal(h.currentInteraction(), null);
  h.state.position = { ...flower.walk }; h.frame(48); h.showPanel('help');
  assert.equal(node(flower.id).style.color, '#ff3935', 'opening a panel clears the preview');
  h.closePanel(); h.frame(64); assert.equal(node(flower.id).style.color, '#fff20b');
  h.press(h.windowHandlers, h.event(key, code, h.game, true)); assert.equal(h.state.paint[flower.id], '#ff3935');
  h.press(h.windowHandlers, h.event(key, code, h.game));
  assert.equal(h.state.paint[flower.id], '#fff20b'); assert.equal(JSON.parse(h.stored.get('bbt-paint-world'))[flower.id], '#fff20b');
  h.state.position = { ...painting.BUCKET_SURFACES.find(surface => surface.id === 'tree-0').walk }; h.frame(80);
  assert.equal(node('tree-0').style.color, '#fff20b');
  h.press(h.windowHandlers, h.event('Escape', 'Escape', h.game));
  assert.equal(node('tree-0').style.color, '#ff87ce'); assert.equal(h.state.paint['tree-0'], undefined);
  assert.equal(h.state.paint.path, '#ff3935', 'bucket previews preserve the saved picture drawing');
}
console.log('PASS: bucket previews cover only trees and flowers, restore on movement and panels, commit on Enter/Space, reject repeated keys and clear on Escape.');

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
  assert(h.state.rocket.riding && h.state.rocket.airborne, 'confirmation in the air does not exit the rocket');
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
assert.equal(mousePaint.state.paint.grass, undefined, 'the bucket cannot paint grass even through confirmation');
console.log('PASS: holding a paint bucket makes mouse clicks steer to the actual transformed point, without selecting or committing colors or displaying contextual paint actions; grass stays exclusive to the picture.');

for (const [key, code] of [['Enter', 'Enter'], [' ', 'Space'], ['Enter', 'NumpadEnter']]) {
  const h = await harness(false, 'monkey', { path: '#ff3935' });
  h.enterRoom('wardrobe'); h.state.position = { ...painting.paintSlots(content.PALETTE).find(color => color.id === 'white') }; h.game.focus();
  h.press(h.windowHandlers, h.event(key, code, h.game)); h.leaveRoom();
  h.state.position = { ...sky.GROUND_ROCKET }; h.game.focus(); h.press(h.windowHandlers, h.event(key, code, h.game));
  h.state.keys.add('ArrowUp'); let clock = 0, firstSpace = null;
  while (clock < 520) { h.frame(++clock * 16); if (clock * 16 < 6000) assert.notEqual(h.state.scene, 'space'); if (h.state.scene === 'space' && firstSpace === null) firstSpace = clock * 16; }
  assert(firstSpace >= 6000 && firstSpace <= 7000, String(firstSpace));
  assert.equal(h.state.adventure.phase, 'ready'); assert.equal(h.state.modal, 'space-launch');
  assert(h.modalContent.innerHTML.includes('Weltraumabenteuer starten')); assert(h.modalContent.innerHTML.includes('Landen'));
  assert.equal(h.state.adventure.width, 1200); assert.equal(h.state.paintCan, 'white'); assert.equal(h.state.animal, 'monkey');
  assert(h.game.innerHTML.includes('data-planet="neptune"')); assert(h.get('#rocket-paint').innerHTML.includes('#ffffff'));
  const start = new h.Element('start adventure', 'button', { action: 'space-start' }); h.press(h.documentHandlers, h.event(key, code, start));
  assert.equal(h.state.adventure.phase, 'playing'); assert.equal(h.modal.open, false);
  const initialShip = { ...h.state.adventure.ship }; h.state.keys.add('ArrowRight'); h.state.keys.add('ArrowUp');
  for (let i = 0; i < 55; i++) h.frame(++clock * 16);
  h.state.keys.clear(); assert(h.state.adventure.ship.x > initialShip.x && h.state.adventure.ship.y < initialShip.y);
  assert.equal(h.state.adventure.angle, 90); assert.equal(h.get('#rocket-hull').getAttribute('transform'), 'rotate(90.00 0 -86)');
  assert.equal(h.get('#rocket-pilot-upright').getAttribute('transform'), 'rotate(-90 0 -86)', 'the pilot counter-rotates inside the cockpit');
  h.press(h.windowHandlers, h.event('Escape', 'Escape', h.game)); assert.equal(h.state.modal, 'space-pause');
  const frozen = h.state.adventure.progress; h.frame(++clock * 16); assert.equal(h.state.adventure.progress, frozen, 'the flight pauses with its menu');
  h.press(h.documentHandlers, h.event(key, code, new h.Element('continue flight', 'button', { action: 'space-continue' })));
  assert(!h.modal.open); h.state.adventure.progress = adventure.FINISH_DISTANCE; h.state.adventure.meteors = []; h.state.adventure.nextMeteor = Infinity;
  h.frame(++clock * 16); assert.equal(h.state.modal, 'space-win'); assert(h.modalContent.innerHTML.includes('Glückwunsch, du hast es geschafft!'));
  h.press(h.documentHandlers, h.event(key, code, new h.Element('replay', 'button', { action: 'space-replay' })));
  assert.equal(h.state.adventure.phase, 'playing'); assert.equal(h.state.adventure.progress, 0); assert(!h.modal.open);
  const ship = h.state.adventure.ship; h.state.adventure.meteors = [{ id: 1, x: ship.x + 1, y: ship.y, radius: 18, speed: 250, drift: 0, angle: 0, spin: 0 }];
  h.frame(++clock * 16); assert.equal(h.state.adventure, null); assert(h.state.rocket.damaged && h.state.landing);
  assert.equal(h.stored.get('bbt-rocket-damaged'), '1');
  const scenes = new Set(); while (h.state.landing && clock < 1200) { h.frame(++clock * 16); scenes.add(h.state.scene); }
  assert(scenes.has('space') && scenes.has('sky') && scenes.has('world'));
  assert(!h.state.rocket.riding && !h.state.rocket.airborne); assert.equal(h.state.paintCan, 'white'); assert.equal(h.state.paint.path, '#ff3935');
  assert(h.game.innerHTML.includes('class="rocket-smoke"'));
  h.state.position = { ...h.state.rocket.position }; h.game.focus(); h.press(h.windowHandlers, h.event(key, code, h.game));
  assert(!h.state.rocket.riding && h.state.rocket.damaged, 'the damaged rocket cannot restart');
  const reload = await harness(false, 'cat', null, true); assert(reload.state.rocket.damaged, 'the repair is still needed after reloading');
  h.enterRoom('wardrobe'); assert(h.game.innerHTML.includes('data-room-target="toolbox"'));
  h.state.position = { ...rooms.TOOLBOX_SPOT }; h.game.focus(); h.press(h.windowHandlers, h.event(key, code, h.game));
  assert(h.state.toolbox); assert(h.get('#carried-toolbox').innerHTML.includes('#ff3935'));
  h.leaveRoom(); h.state.position = { ...h.state.rocket.position }; h.game.focus(); assert.equal(h.currentInteraction().kind, 'rocket-repair');
  h.press(h.windowHandlers, h.event(key, code, h.game)); assert(!h.state.rocket.damaged && !h.state.rocket.riding); assert.equal(h.stored.get('bbt-rocket-damaged'), '0');
  h.press(h.windowHandlers, h.event(key, code, h.game)); assert(h.state.rocket.riding, 'repair makes the rocket startable');
  h.press(h.windowHandlers, h.event(key, code, h.game)); assert(!h.state.rocket.riding);
  h.enterRoom('wardrobe'); h.state.position = { ...rooms.TOOLBOX_SPOT }; h.game.focus(); h.press(h.windowHandlers, h.event(key, code, h.game)); assert(!h.state.toolbox);
}
const choosingLand = await harness(false, 'dog');
choosingLand.state.rocket.riding = choosingLand.state.rocket.airborne = true;
choosingLand.state.position = { x: 365, y: sky.SPACE.bottom - 2 }; choosingLand.state.rocket.position = { ...choosingLand.state.position };
choosingLand.state.scene = 'sky'; choosingLand.state.keys.add('ArrowUp'); choosingLand.frame(16); choosingLand.frame(32);
for (let time = 48; time < 1200; time += 16) choosingLand.frame(time);
assert.equal(choosingLand.state.modal, 'space-launch'); choosingLand.closePanel();
assert(choosingLand.state.landing && !choosingLand.state.rocket.damaged, 'Escape at the launch choice lands safely');
for (let time = 1200; time < 6500; time += 16) choosingLand.frame(time);
assert.equal(choosingLand.state.scene, 'world'); assert(!choosingLand.state.rocket.riding && !choosingLand.state.rocket.damaged);
console.log('PASS: space entry at 6–7 seconds, zoom and launch/land choices, four-direction flight, upright pilot, pause, win, replay, crash descent, persistent damage, tool pickup/return, repair and restart work with Enter, Space and NumpadEnter.');

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
  const pausedAt = h.state.party.elapsed;
  for (let i = 0; i < 10; i++) h.frame(++partyTick * 16);
  assert.equal(h.state.party.elapsed, pausedAt, 'the guest entrance also pauses with the recording');
  await h.get('#audio').play(); for (const callback of h.get('#audio').handlers.get('play')) callback({});
  assert(layer.classList.contains('is-dancing'));
  h.showPanel('radio-info'); h.closePanel(); assert(layer.classList.contains('is-dancing'), 'the party resumes when a menu closes');
  h.state.position = { x: 800, y: 970 }; h.state.keys.add('ArrowDown');
  while (h.state.scene === 'radio' && partyTick < 450) h.frame(++partyTick * 16);
  assert.equal(h.state.scene, 'world', 'dancing guests never block the exit'); assert.equal(h.state.party.active, true);
  const beforeReturn = h.state.party.elapsed;
  for (let i = 0; i < 100; i++) h.frame(++partyTick * 16);
  h.enterRoom('radio'); assert(h.state.party.active); assert(h.state.party.elapsed > beforeReturn, 'the entrance clock continues outside');
  assert.equal(h.get('#party-dancer-cat').getAttribute('transform'), 'translate(700.00 620.00)', 'returning preserves the dance positions instead of replaying the entrance');
  new h.Element('horse selection', 'button', { character: 'horse' }).click();
  assert.equal(h.state.party.castKey, 'cat,dog,monkey', 'guest images follow a changed player selection');
  h.state.position = { ...rooms.RADIO }; h.game.focus(); h.press(h.windowHandlers, h.event('Enter', 'Enter', h.game));
  assert.equal(h.state.party.active, false); assert(h.state.party.departing);
  assert.equal(h.get('#party-effects').getAttribute('hidden'), '', 'the room immediately returns to its usual colors');
  for (let i = 0; i < 400; i++) h.frame(++partyTick * 16);
  assert(!h.state.party.departing); assert.equal(layer.getAttribute('hidden'), '', 'the guests walk out and disappear');
  h.state.position = { ...rooms.TAPE_SLOTS[1] }; h.press(h.windowHandlers, h.event('Enter', 'Enter', h.game));
  h.state.position = { ...rooms.TAPE_SLOTS[0] }; h.press(h.windowHandlers, h.event('Enter', 'Enter', h.game));
  h.state.position = { ...rooms.RADIO }; h.press(h.windowHandlers, h.event(' ', 'Space', h.game));
  assert.notEqual(h.state.tapes.loaded, 'tanzen'); assert.equal(h.state.party.active, false, 'other songs do not keep the dance effect');
} finally { dancingTrack.src = originalDanceAudio; }
console.log('PASS: Tanzen guests continue dancing across room changes, pause/resume with the song, retain their positions on return, then walk out while disco effects turn off on cassette removal.');

try {
  dancingTrack.src = 'uploads/tanzen.mp3';
  const h = await harness(false, 'cat'); h.enterRoom('radio'); h.state.tapes.loaded = 'tanzen'; h.loadRecording();
  for (let i = 1; i <= 500; i++) h.frame(i * 16);
  h.get('#audio').ended = true; h.get('#audio').paused = true;
  for (const callback of h.get('#audio').handlers.get('ended')) callback({});
  assert(!h.state.party.active && h.state.party.departing); assert.equal(h.get('#party-effects').getAttribute('hidden'), '');
  for (let i = 501; i <= 1000; i++) h.frame(i * 16);
  assert(!h.state.party.departing); h.leaveRoom(); h.enterRoom('radio');
  assert(!h.state.party.active); assert.equal(h.get('#dance-party').getAttribute('hidden'), '');
} finally { dancingTrack.src = originalDanceAudio; }
console.log('PASS: the native song-ended event removes the disco and sends all guests out; returning cannot restart a finished song party.');

for (const [key, code] of [['Enter', 'Enter'], [' ', 'Space'], ['Enter', 'NumpadEnter']]) {
  const h = await harness(false, 'monkey', { 'tree-0': '#123456', 'flower-0': '#abcdef' }); h.enterRoom('wardrobe');
  h.state.position = { ...rooms.PICTURE_SPOT }; h.frame(16);
  assert.equal(h.state.scene, 'painting', 'walking to the picture opens the brush view');
  assert(h.game.innerHTML.includes('class="studio-brush"')); assert.equal(h.state.animal, 'monkey');
  const blue = studio.studioColors(content.PALETTE).find(color => color.id === 'blue');
  h.state.position = { ...blue }; h.game.focus(); h.press(h.windowHandlers, h.event(key, code, h.game));
  assert.equal(h.state.studio.color, 'blue');
  h.state.keys.add('ArrowLeft'); const beforeBrush = h.state.position.x; h.frame(32); h.frame(48); h.state.keys.clear();
  assert(h.state.position.x < beforeBrush, 'direction keys move the brush');
  for (const surface of studio.largeSurfaces) {
    const p = surface.bounds ? { x: surface.bounds.x + surface.bounds.w / 2, y: surface.bounds.y + surface.bounds.h / 2 } : surface.id === 'path' ? { x: 650, y: 475 } : surface.id === 'grass' ? { x: 1000, y: 700 } : { x: 900, y: -150 };
    h.state.position = { x: studio.CANVAS.x + p.x * studio.CANVAS.scale, y: studio.CANVAS.y + (p.y + 380) * studio.CANVAS.scale };
    assert.equal(h.currentInteraction()?.id, surface.id);
    const before = h.state.paint[surface.id];
    h.press(h.windowHandlers, h.event(key, code, h.game, true)); assert.equal(h.state.paint[surface.id], before, 'holding a confirmation key does not paint repeatedly');
    h.press(h.windowHandlers, h.event(key, code, h.game)); assert.equal(h.state.paint[surface.id], blue.color);
  }
  assert.equal(h.state.paint['tree-0'], '#123456'); assert.equal(h.state.paint['flower-0'], '#abcdef');
  h.press(h.windowHandlers, h.event('Escape', 'Escape', h.game));
  assert.equal(h.state.scene, 'wardrobe'); assert.equal(h.state.position.x, rooms.PICTURE_SPOT.x);
  for (let i = 0; i < 10; i++) h.frame(64 + i * 16);
  assert.equal(h.state.scene, 'wardrobe', 'closing the picture does not immediately reopen it');
  h.leaveRoom(); assert.equal(h.state.scene, 'world');
  assert(h.game.innerHTML.includes(`data-paint-target="path" data-paint-property="stroke" stroke="${blue.color}"`));
  assert.equal(JSON.parse(h.stored.get('bbt-paint-world')).grass, blue.color);
  h.enterRoom('wardrobe'); h.state.position = { ...rooms.PICTURE_SPOT }; h.game.focus(); h.press(h.windowHandlers, h.event(key, code, h.game));
  assert.equal(h.state.scene, 'painting');
  const close = new h.Element('picture exit', 'g', { studioControl: 'close' });
  h.press(h.game.handlers, h.event(key, code, close)); assert.equal(h.state.scene, 'wardrobe');
}
console.log('PASS: the picture opens on approach, all three action keys take palette colors and paint every large object, arrows move the brush, Enter on the visible exit or Escape returns safely, and confirmed world colors persist without changing trees or flowers.');

const originalMelodies = content.BAND.map(member => member.audio);
const originalCassetteAudio = content.TRACKS[0].src;
try {
  content.TRACKS[0].src = 'uploads/hut.mp3';
  for (const member of content.BAND) member.audio = `uploads/${member.id}.mp3`;
  const h = await harness(false, 'cat'); h.state.tapes.loaded = 'hut'; h.loadRecording(); h.get('#audio').currentTime = 23;
  for (const member of content.BAND) {
    h.showPanel(member.id); assert.equal(h.state.memberMelody, member.id);
    assert.equal(h.get('#member-audio').src, member.audio); assert.equal(h.get('#member-audio').paused, false);
    assert.equal(h.get('#audio').paused, false); assert.equal(h.get('#audio').currentTime, 23, 'a biography melody never restarts the cassette');
    assert.equal(h.get('#audio').volume, h.state.volume * .2); assert(h.renderPanel(member.id).includes(`data-melody="${member.id}"`));
  }
  h.closePanel(); assert.equal(h.get('#member-audio').paused, true); assert.equal(h.get('#audio').volume, h.state.volume);
  h.showPanel('panda'); for (const cb of h.get('#member-audio').handlers.get('ended')) cb({});
  assert.equal(h.state.memberMelody, null); assert.equal(h.get('#audio').volume, h.state.volume);
  content.BAND[0].audio = 'blob:https://uglyagi.github.io/melody-preview';
  const preview = await harness(true, 'cat'); preview.showPanel('panda'); assert.equal(preview.get('#member-audio').src, content.BAND[0].audio);
  const publicGame = await harness(false, 'cat'); publicGame.showPanel('panda'); assert.equal(publicGame.get('#member-audio').paused, true, 'blob melodies remain local preview only');
} finally { content.BAND.forEach((member, i) => { member.audio = originalMelodies[i]; }); content.TRACKS[0].src = originalCassetteAudio; }
console.log('PASS: all three band members play their assigned melody, biography changes replace it, closing/stopping restores the cassette volume, and local preview audio stays private.');

const carriedStudio = await harness(false, 'dog');
carriedStudio.state.paintCan = 'red'; carriedStudio.enterRoom('wardrobe'); carriedStudio.state.position = { ...rooms.PICTURE_SPOT }; carriedStudio.frame(16);
assert.equal(carriedStudio.state.scene, 'painting'); assert.equal(carriedStudio.state.paintCan, 'red');
assert.equal(carriedStudio.get('#paint-indicator').hidden, true);
new carriedStudio.Element('picture close', 'button', { action: 'exit-walk' }).click();
assert.equal(carriedStudio.state.scene, 'wardrobe'); assert.equal(carriedStudio.state.paintCan, 'red');
carriedStudio.leaveRoom(); assert.equal(carriedStudio.state.paintCan, 'red');
console.log('PASS: painting keeps a carried bucket, hides its indicator while the brush is active and returns to the house through the visible close button.');

const preciseBrush = await harness(false, 'cat'); preciseBrush.enterRoom('wardrobe'); preciseBrush.state.position = { ...rooms.PICTURE_SPOT }; preciseBrush.frame(16);
preciseBrush.state.position = { x: studio.CANVAS.x + 1000 * studio.CANVAS.scale, y: studio.CANVAS.y + 1080 * studio.CANVAS.scale };
const flowerHit = new preciseBrush.Element('flower', 'use', { paintTarget: 'flower-0' });
const roofHit = new preciseBrush.Element('roof', 'path', { paintTarget: 'home-roof' });
let screenPoint;
preciseBrush.doc.elementsFromPoint = (x, y) => { screenPoint = { x, y }; return [flowerHit, roofHit]; };
assert.equal(preciseBrush.currentInteraction().id, 'home-roof', 'the rendered surface under the brush takes priority over rectangular approximations');
assert.equal(screenPoint.x, preciseBrush.state.position.x); assert.equal(screenPoint.y, preciseBrush.state.position.y);
console.log('PASS: brush selection uses the rendered SVG surface at its actual screen position and skips the separately painted flowers.');

for (const [start, direction, away] of [
  [{ x: 1110, y: 575 }, 'ArrowUp', 'ArrowDown'],
  [{ x: 950, y: 400 }, 'ArrowRight', 'ArrowLeft'],
  [{ x: 1270, y: 400 }, 'ArrowLeft', 'ArrowRight'],
]) {
  const h = await harness(false, 'cat'); h.enterRoom('wardrobe'); h.state.position = { ...start }; h.game.focus();
  h.state.keys.add(direction); let frame = 0;
  while (h.state.scene === 'wardrobe' && frame < 100) h.frame(++frame * 16);
  assert.equal(h.state.scene, 'painting', 'touching the actual picture opens painting from either side and from below without confirmation');
  assert(core.touchingHomePicture(h.state.studio.returnPosition));
  h.press(h.windowHandlers, h.event('Escape', 'Escape', h.game));
  for (let i = 0; i < 10; i++) h.frame(++frame * 16);
  assert.equal(h.state.scene, 'wardrobe', 'closing painting waits until the animal leaves the picture');
  h.state.keys.add(away); for (let i = 0; i < 30; i++) h.frame(++frame * 16); h.state.keys.clear();
  assert(!core.touchingHomePicture(h.state.position));
  h.state.keys.add(direction);
  while (h.state.scene === 'wardrobe' && frame < 220) h.frame(++frame * 16);
  assert.equal(h.state.scene, 'painting', 'touching the picture again reopens painting');
}
console.log('PASS: walking into the small picture from the left, right or below opens painting automatically, closes safely, and opens again after leaving and touching it anew.');
