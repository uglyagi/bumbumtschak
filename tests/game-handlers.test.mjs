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
const wreckage = await import(new URL(`rocket-wreckage.${extension}`, root));
const holiday = await import(new URL(`sun-holiday.${extension}`, root));
const hats = await import(new URL(`hat-quest.${extension}`, root));
const reception = await import(new URL(`reception.${extension}`, root));
const chocolate = await import(new URL(`chocolate.${extension}`, root));
const chocolateArt = await import(new URL(`chocolate-art.${extension}`, root));
const friends = await import(new URL(`friends-game.${extension}`, root));
const friendsArt = await import(new URL(`friends-art.${extension}`, root));
const bike = await import(new URL(`bike-race.${extension}`, root));
const animalViews = await import(new URL(`animal-views.${extension}`, root));
const bikeArt = await import(new URL(`bike-art.${extension}`, root));
const touchControls = await import(new URL(`touch-controls.${extension}`, root));
const fullscreen = await import(new URL(`fullscreen.${extension}`, root));
const gameDialog = await import(new URL(`game-dialog.${extension}`, root));

// Exercise the application's real registered handlers with DOM test doubles.
// This checks app behavior, not browser rendering or native default actions.
const source = await fs.readFile(new URL(`app.${extension}`, root), 'utf8');
async function harness(preview = false, savedAnimal = '', savedDrawing = null, damaged = false, savedHat = null, savedChocolates = null, savedFriendCamp = null, savedBikes = null, savedBikeScores = null, touchScreen = false) {
  const opened = [];
  const stored = new Map(savedAnimal ? [['bbt-animal', savedAnimal]] : []);
  if (savedDrawing) stored.set(preview ? 'bbt-paint-preview' : 'bbt-paint-world', JSON.stringify(savedDrawing));
  if (savedHat) stored.set(preview ? 'bbt-hat-preview' : 'bbt-hat-world', JSON.stringify(savedHat));
  if (damaged) stored.set(preview ? 'bbt-rocket-preview-damaged' : 'bbt-rocket-damaged', '1');
  if (savedChocolates) stored.set(preview ? 'bbt-chocolate-preview' : 'bbt-chocolate-world', JSON.stringify(savedChocolates));
  if (savedFriendCamp) stored.set(preview ? 'bbt-friends-preview' : 'bbt-friends-world', JSON.stringify(savedFriendCamp));
  if (savedBikes) stored.set(preview ? 'bbt-bikes-preview' : 'bbt-bikes-world', JSON.stringify(savedBikes));
  if (savedBikeScores) stored.set(preview ? 'bbt-bike-tour-scores-preview' : 'bbt-bike-tour-scores-world', JSON.stringify(savedBikeScores));
  const nodes = new Map(), windowHandlers = new Map(), documentHandlers = new Map();
  const add = (map, name, callback) => map.set(name, [...(map.get(name) || []), callback]);
  const doc = { activeElement: null, hidden: false, baseURI: 'https://uglyagi.github.io/bumbumtschak/' };
  class Element {
    constructor(name = '', tag = 'div', dataset = {}) {
      this.name = name; this.tag = tag; this.dataset = dataset;
      this.handlers = new Map(); this.attrs = new Map(); this.writes = new Map(); this.style = {};
      this.captures = new Set();
      this.hidden = false; this.open = false; this.innerHTML = ''; this.clicks = 0;
      this.parentElement = { setAttribute() {} };
      const classes = new Set();
      this.classList = { add: (...x) => x.forEach(v => classes.add(v)), remove: (...x) => x.forEach(v => classes.delete(v)), toggle: (x, force) => force ? classes.add(x) : classes.delete(x), contains: value => classes.has(value) };
    }
    addEventListener(name, cb) { add(this.handlers, name, cb); }
    append() {}
    scrollBy() {}
    setAttribute(name, value) { this.attrs.set(name, value); this.writes.set(name,(this.writes.get(name)||0)+1); }
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
    setPointerCapture(id) { this.captures.add(id); }
    hasPointerCapture(id) { return this.captures.has(id); }
    releasePointerCapture(id) { this.captures.delete(id); for (const cb of this.handlers.get('lostpointercapture') || []) cb({ pointerId: id }); }
    show() { this.open = true; }
    showModal() { throw new Error('Game windows must not enter the native top layer and leave fullscreen'); }
    close() { if (!this.open) return; this.open = false; for (const cb of this.handlers.get('close') || []) cb({}); }
    matches(selector) { return selector === 'input[type=range]' && this.tag === 'input'; }
    closest(selector) {
      for (const part of selector.split(',')) {
        if (part === '[data-bicycle]' && this.dataset.bicycle) return this;
        if (part === '[data-character]' && this.dataset.character) return this;
        if (part === '[data-member]' && this.dataset.member) return this;
        if (part === '[data-signpost]' && this.dataset.signpost) return this;
        if (part === '[data-station]' && this.dataset.station) return this;
        if (part === '[data-room-target]' && this.dataset.roomTarget) return this;
        if (part === '[data-social]' && this.dataset.social) return this;
        if (part === '[data-paint-target]' && this.dataset.paintTarget) return this;
        if (part === '[data-friends-tent]' && Object.hasOwn(this.dataset, 'friendsTent')) return this;
        if (part === '[data-hat-target]' && this.dataset.hatTarget) return this;
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
  const bodyClasses = new Set();
  doc.body = { prepend() {}, classList: { add: (...names) => names.forEach(name => bodyClasses.add(name)), remove: name => bodyClasses.delete(name), contains: name => bodyClasses.has(name) } };
  doc.documentElement = new Element('html', 'html');
  const game = get('#game'), modal = get('#modal'), modalContent = get('#modal-content'), audio = get('#audio');
  for (const node of [audio, get('#member-audio'), get('#camp-audio'), get('#bike-audio')]) Object.assign(node, { paused: true, ended: false, currentTime: 0, pause() { this.paused = true; }, play() { this.paused = false; this.ended = false; return Promise.resolve(); }, load() {} });
  const context = vm.createContext({
    ...core, ...content, ...art, ...roomArt, ...rooms, ...social, ...painting, ...connection, ...sky, ...dance, ...studio, ...adventure, ...adventureArt, ...toolbox, ...wreckage, ...holiday, ...hats, ...reception, ...chocolate, ...chocolateArt, ...friends, ...friendsArt, ...bike, ...bikeArt, ...animalViews, ...touchControls, ...fullscreen, ...gameDialog,
    loadContent: async () => ({ ok: true }), document: doc,
    window: { innerWidth: 1200, matchMedia: query => ({ matches: touchScreen && query === '(any-pointer: coarse)' }), addEventListener: (n, cb) => add(windowHandlers, n, cb), open(...args) { opened.push(args); } },
    location: { search: preview ? '?preview=1' : '' }, localStorage: { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) },
    URLSearchParams, URL, Intl, console,
    DOMPoint: class { constructor(x = 0, y = 0) { this.x = x; this.y = y; } matrixTransform(m) { return { x: m.a * this.x + m.c * this.y + m.e, y: m.b * this.x + m.d * this.y + m.f }; } },
    fetch: async () => ({ ok: false }), clearTimeout() {}, setTimeout: () => 1,
    ResizeObserver: class { observe() {} }, requestAnimationFrame() {},
  });
  const app = await new vm.Script(`(async () => {${source.replace(/^import .*;\n/gm, '')}\nreturn {state, enterRoom, leaveRoom, showPanel, closePanel, goToStation, frame, resize, renderScene, renderPanel, loadRecording, checkWorldTouch, currentInteraction};})()`).runInContext(context);
  const event = (key, code, target, repeat = false) => ({ key, code, target, repeat, prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } });
  function press(handlers, e) { for (const cb of handlers.get('keydown') || []) cb(e); return e; }
  return { ...app, window: context.window, opened, stored, get, game, modal, modalContent, Element, event, press, documentHandlers, windowHandlers, doc };
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
more.enterRoom('social'); more.state.position = social.socialPads('social').find(p => p.id === 'email'); more.game.focus();
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
  h.enterRoom('social');
  const facebook = social.socialPads('social').find(p => p.id === 'facebook'); h.state.position = { ...facebook };
  const pad = new h.Element('Facebook', 'g', { social: 'facebook' });
  for (const callback of h.game.handlers.get('click')) callback({ target: pad });
  assert.equal(h.opened.length, 0, 'clicking a symbol walks there without opening its link');
  h.press(h.windowHandlers, h.event(key, code, h.game));
  assert.equal(h.opened.at(-1)[0], facebook.url);
  const email = social.socialPads('social').find(p => p.id === 'email'); h.state.position = { ...email };
  h.press(h.windowHandlers, h.event(key, code, h.game));
  assert.equal(h.state.modal, 'letter'); assert.equal(h.state.scene, 'social');
  const count = h.opened.length;
  h.press(h.documentHandlers, h.event(key, code, h.get('#modal-content')));
  assert.equal(h.modal.open, false); assert.equal(h.opened.length, count);
  assert.equal(h.state.position.x, email.x); assert.equal(h.state.position.y, email.y);
}
assert.equal(rooms.roomFor('social'), 'social'); assert.equal(rooms.roomFor('grownups'), null);
assert.equal(social.socialPads('social').length, 5); assert.equal(social.socialPads('world').length, 0);
const index = await fs.readFile(new URL('index.html', root), 'utf8');
assert(!index.includes('class="scene-heading"')); assert(!index.includes('class="keyboard-hint"'));
assert(art.worldMarkup().includes('data-station="help"'));
console.log('PASS: automatic door entry/exit, wall rejection, office/help require nearby confirmation, no automatic reopening, all three confirmation keys close inspections, Escape close, inactive empty ground, contact-room pads and letter without external navigation.');
for (const id of ['radio', 'concerts', 'wardrobe', 'grownups', 'help', 'social']) {
  const h = await harness(); h.state.started = true; h.closePanel(); h.game.focus(); h.goToStation(id);
  let tick = 0;
  while (tick < 1500 && !h.modal.open && h.state.scene === 'world' && h.state.path.length) h.frame(++tick * 16);
  h.frame(++tick * 16);
  if (['radio', 'concerts', 'wardrobe'].includes(id)) assert.equal(h.state.scene, id, 'wayfinding walks through the actual entrance');
  else if (id === 'social') { assert.equal(h.state.scene, 'world'); assert.equal(h.modal.open, false); assert.equal(h.opened.length, 0); h.press(h.windowHandlers, h.event('Enter', 'Enter', h.game)); assert.equal(h.state.scene, 'social'); }
  else {
    assert.equal(h.modal.open, false, 'wayfinding reaches the object without opening it');
    h.press(h.windowHandlers, h.event('Enter', 'Enter', h.game));
    assert.equal(h.state.modal, id, 'confirmation after arriving opens the object');
  }
}
console.log('PASS: walking routes to all three entrances, desk, relocated hint sign and outdoor contact area.');

for (const [key, code] of [['Enter', 'Enter'], [' ', 'Space'], ['Enter', 'NumpadEnter']]) {
  const h = await harness(false, 'dog'); h.enterRoom('wardrobe'); let clock = 0;
  const carried = content.TRACKS[0].id; h.state.tapes.carrying = carried;
  for (const spot of rooms.ANIMAL_SPOTS) {
    h.state.position = { x: spot.x + 52, y: spot.y + 30 }; h.game.focus(); h.frame(++clock * 16);
    const previousAnimal = h.state.animal, previousPosition = { ...h.state.position };
    h.press(h.windowHandlers, h.event(key, code, h.game, true));
    assert.equal(h.state.animal, previousAnimal, 'holding confirmation does not change the character');
    h.press(h.windowHandlers, h.event(key, code, h.game));
    assert.equal(h.state.animal, spot.id); assert.equal(h.stored.get('bbt-animal'), spot.id);
    assert.equal(h.state.scene, 'wardrobe'); assert.equal(h.modal.open, false);
    assert.equal(h.state.position.x, spot.x); assert.equal(h.state.position.y, spot.y);
    assert.equal(h.state.tapes.carrying, carried, 'changing characters preserves the carried cassette');
    assert(!h.game.innerHTML.includes(`id="home-animal-${spot.id}"`), 'the controlled animal has no duplicate NPC');
    assert.equal((h.game.innerHTML.match(/id="home-animal-/g) || []).length, 3);
    assert.equal((h.game.innerHTML.match(/data-home-slot=/g) || []).length, 4, 'all four labels stay visible when a figure is selected');
    assert.equal(h.get('#player-use').attrs.get('href'), `#animal-${spot.id}`);
    const returning = h.state.homeReturns.find(animal => animal.id === previousAnimal);
    assert(returning); assert.deepEqual({ ...returning.position }, previousPosition, 'the old animal starts its walk where the player left it');
    h.frame(++clock * 16); assert(Math.hypot(returning.position.x - previousPosition.x, returning.position.y - previousPosition.y) > 0);
    let returnFrames = 0; while (h.state.homeReturns.length && returnFrames++ < 220) h.frame(++clock * 16);
    assert.equal(h.state.homeReturns.length, 0); assert(h.game.innerHTML.includes(`data-room-target="animal:${previousAnimal}"`));
    for (let i = 0; i < 15; i++) h.frame(++clock * 16);
    assert.deepEqual({ ...h.state.position }, { x: spot.x, y: spot.y }, 'the newly selected animal stays at its selection position until moved');
    assert.equal(h.currentInteraction(), null, 'the now-empty selection spot cannot select the same animal again');
  }
  h.state.position = { ...rooms.ROOM_SPAWN }; h.game.focus();
  const cat = new h.Element('cat choice', 'g', { roomTarget: 'animal:cat' });
  h.press(h.game.handlers, h.event(key, code, cat));
  let tick = 0;
  while (h.state.path.length && tick++ < 1000) h.frame(++clock * 16);
  assert.equal(h.state.animal, 'monkey', 'walking to a different animal does not select it automatically');
  h.press(h.game.handlers, h.event(key, code, cat));
  assert.equal(h.state.animal, 'cat', 'confirmation on a focused nearby animal selects it');
  assert.deepEqual({ ...h.state.position }, { x: rooms.ANIMAL_SPOTS[0].x, y: rooms.ANIMAL_SPOTS[0].y });
  const standing = { ...h.state.position }; h.state.keys.add('ArrowDown'); h.frame(++clock * 16); h.state.keys.clear();
  assert(h.state.position.y > standing.y, 'direction keys move the newly controlled animal');
  h.press(h.windowHandlers, h.event('Escape', 'Escape', h.game));
  assert.equal(h.state.scene, 'world'); assert.equal(h.state.animal, 'cat');
}
const restored = await harness(false, 'monkey');
assert.equal(restored.state.animal, 'monkey'); assert.equal(restored.state.started, true);
assert(core.canStand(restored.state.position.x, restored.state.position.y));
assert.equal(core.worldTouch(restored.state.position), null, 'initial spawn does not enter a house automatically');
assert(art.worldMarkup().includes('data-station="wardrobe"'));
console.log('PASS: all four characters switch at their exact selection positions, the previous animal walks home, no selected NPC is duplicated, the new player waits for movement, carried items survive and all confirmation keys work.');

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
  assert.equal(Object.keys(h.state.paint).length, painting.BUCKET_SURFACES.length); assert.equal(h.currentInteraction(), null);
  assert(!h.game.innerHTML.includes('data-room-target="paint-reset"'), 'the reset button is removed from the house');
  assert.equal(h.stored.get('bbt-paint-world'), JSON.stringify(h.state.paint));
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
  assert.equal(h.state.paintPage, 0); assert(!h.game.innerHTML.includes('Orange'));
  assert.equal(painting.paintSlots(content.PALETTE).length, 6);
  assert(!h.game.innerHTML.includes('data-room-target="paint-next"'));
  h.state.position = { ...rooms.PICTURE_SPOT }; h.frame(16);
  assert.equal(h.state.scene, 'painting');
  h.state.position = { ...studio.STUDIO_CONTROLS.next }; h.game.focus();
  h.press(h.windowHandlers, h.event('Enter', 'Enter', h.game));
  assert.equal(h.state.studio.page, 1); assert(h.game.innerHTML.includes('Orange'));
  h.state.position = { ...studio.studioColors(content.PALETTE, 1)[0] }; h.game.focus();
  h.press(h.windowHandlers, h.event(' ', 'Space', h.game));
  assert.equal(h.state.studio.color, 'orange', 'new CMS colors are available in the picture only');
  assert.equal(h.state.paintCan, null);
} finally { content.PALETTE.splice(0, content.PALETTE.length, ...basePalette); }
console.log('PASS: taking, carrying and returning paint cans, all trees and flowers, rejecting every large picture surface, local save/reload, Escape, removed house reset and extra picture colors kept out of buckets through the real keyboard handlers.');

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
  assert.equal(node('grass').getAttribute('fill'), '#b5ed9b'); assert.equal(h.currentInteraction(), null);
  h.state.position = { ...flower.walk }; h.frame(48); h.showPanel('help');
  assert.equal(node(flower.id).style.color, '#ff3935', 'opening a panel clears the preview');
  h.closePanel(); h.frame(64); assert.equal(node(flower.id).style.color, '#fff20b');
  h.press(h.windowHandlers, h.event(key, code, h.game, true)); assert.equal(h.state.paint[flower.id], '#ff3935');
  h.press(h.windowHandlers, h.event(key, code, h.game));
  assert.equal(h.state.paint[flower.id], '#fff20b'); assert.equal(JSON.parse(h.stored.get('bbt-paint-world'))[flower.id], '#fff20b');
  h.state.position = { ...painting.BUCKET_SURFACES.find(surface => surface.id === 'tree-0').walk }; h.frame(80);
  assert.equal(node('tree-0').style.color, '#fff20b');
  h.press(h.windowHandlers, h.event('Escape', 'Escape', h.game));
  assert.equal(node('tree-0').style.color, '#4acb59'); assert.equal(h.state.paint['tree-0'], undefined);
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
  h.enterRoom('wardrobe'); h.state.position = { ...painting.paintSlots(content.PALETTE).find(color => color.id === 'yellow') }; h.game.focus();
  h.press(h.windowHandlers, h.event(key, code, h.game)); h.leaveRoom();
  h.state.position = { ...sky.GROUND_ROCKET }; h.game.focus(); h.press(h.windowHandlers, h.event(key, code, h.game));
  h.state.keys.add('ArrowUp'); let clock = 0, firstSpace = null;
  let departureMarkup;
  while (!h.state.adventure && clock < 520) { departureMarkup=h.game.innerHTML; h.frame(++clock * 16); if (clock * 16 < 6000) assert.notEqual(h.state.scene, 'space'); if (h.state.scene === 'space' && firstSpace === null) firstSpace = clock * 16; }
  assert.equal(h.state.adventure.phase, 'intro'); assert(!h.modal.open); assert.equal(h.game.innerHTML,departureMarkup,'the old outdoor space view remains in place during departure');assert(!h.game.innerHTML.includes('id="adventure-course"'));
  const startingPose = adventureArt.adventureShipPose(h.state.adventure); assert.deepEqual({ ...startingPose }, { ...h.state.adventure.entry });
  h.showPanel('space-launch'); assert(!h.modal.open, 'the choice cannot open before the transition finishes');
  new h.Element('early difficulty', 'button', { difficulty: 'profi' }).click(); assert.equal(h.state.adventure.phase, 'intro');
  for (let i = 0; i < 35; i++) h.frame(++clock * 16);
  const departingPose = adventureArt.adventureShipPose(h.state.adventure);
  assert.equal(h.state.adventure.phase, 'intro'); assert(!h.modal.open); assert.equal(departingPose.scale, startingPose.scale); assert.equal(departingPose.x, startingPose.x); assert(departingPose.y < startingPose.y);
  assert.equal(h.game.innerHTML,departureMarkup);assert.equal(h.state.adventure.angle,0);assert.equal(h.state.adventure.meteors.length,0);assert(h.get('#rocket').getAttribute('transform').includes('translate('));
  while (h.state.adventure.phase === 'intro' && clock < 800) h.frame(++clock * 16);
  assert(firstSpace >= 6000 && firstSpace <= 7000, String(firstSpace));
  assert.equal(h.state.adventure.phase,'ready');assert.equal(h.state.modal,'space-launch');assert(!h.state.adventure.departure);assert(h.game.innerHTML.includes('id="adventure-course" opacity="1"'));assert(h.game.innerHTML.includes('id="bum-planet-crop"'));
  assert(h.modalContent.innerHTML.includes('Zurück zur Wiese')); assert.equal((h.modalContent.innerHTML.match(/<button\b/g) || []).length, 4); assert(!h.modalContent.innerHTML.includes('data-action="space-start"'));
  assert.equal(h.state.adventure.width, 1200); assert.equal(h.state.paintCan, 'yellow'); assert.equal(h.state.animal, 'monkey');
  assert(!h.get('#adventure-course').attrs.has('hidden')); assert.equal(h.get('#adventure-course').getAttribute('opacity'), '1.000'); assert(h.get('#rocket-paint').innerHTML.includes('#fff20b'));
  assert.equal(h.state.adventure.angle, 90, 'the choice already shows the sideways rocket in its starting position');
  const readyPose = adventureArt.adventureShipPose(h.state.adventure);
  const start = new h.Element('choose easy and start', 'button', { difficulty: 'leicht' }); h.press(h.documentHandlers, h.event(key, code, start));
  assert.deepEqual(adventureArt.adventureShipPose(h.state.adventure), readyPose, 'selecting a difficulty keeps the rocket in exactly the same place');
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
  h.frame(++clock * 16); assert.equal(h.state.adventure.phase, 'sun-finale'); assert(!h.modal.open, 'arrival does not show congratulations immediately');
  assert(h.game.innerHTML.includes('id="sun-holiday"')); assert.equal(h.state.adventure.meteors.length, 0);
  h.showPanel('space-win'); assert(!h.modal.open, 'the finale cannot open an early congratulations window');
  new h.Element('premature replay', 'button', { difficulty: 'profi' }).click(); assert.equal(h.state.adventure.phase, 'sun-finale');
  const flightProgress = h.state.adventure.progress;
  assert(h.game.innerHTML.includes('id="sun-flight-background" opacity="1"'));
  while (h.state.adventure.sunTime < adventure.SUN_EXIT_DURATION) h.frame(++clock * 16);
  const departed = holiday.sunHolidayPose(h.state.adventure);assert(departed.shuttle.x>h.state.adventure.width&&departed.shuttle.y<0);
  assert(h.get('#sun-actor').attrs.has('hidden'));assert(!h.get('#rocket-pilot').attrs.has('hidden'));
  assert.equal(h.get('#sun-surface-background').getAttribute('opacity'),'0.000');
  while(h.state.adventure.sunTime<adventure.SUN_TRANSITION_DURATION)h.frame(++clock*16);
  assert.equal(h.get('#sun-surface-background').getAttribute('opacity'),'1.000');
  while (h.state.adventure.sunTime < adventure.SUN_TRANSITION_DURATION + 3.2 - adventure.SUN_STORY_START) h.frame(++clock * 16);
  assert(h.get('#rocket-pilot').attrs.has('hidden')); assert(!h.get('#sun-actor').attrs.has('hidden')); assert(!h.get('#sun-folded-chair').attrs.has('hidden'));
  while (h.state.adventure.sunTime < adventure.SUN_TRANSITION_DURATION + 5.3 - adventure.SUN_STORY_START) h.frame(++clock * 16);
  assert(h.get('#sun-folded-chair').attrs.has('hidden')); assert(!h.get('#sun-lounger').attrs.has('hidden'));
  while (h.state.adventure.sunTime < adventure.SUN_TRANSITION_DURATION + 6.2 - adventure.SUN_STORY_START) h.frame(++clock * 16);
  assert(!h.get('#sun-sunglasses').attrs.has('hidden')); assert(!h.modal.open);
  while (h.state.adventure.sunTime < adventure.SUN_TRANSITION_DURATION + 8 - adventure.SUN_STORY_START) h.frame(++clock * 16);
  assert(h.get('#sun-actor').getAttribute('transform').includes('rotate(-62.00)')); assert(!h.modal.open, 'the player sunbathes before being congratulated');
  assert.equal(h.state.adventure.progress, flightProgress);
  h.doc.hidden = true; const sunPaused = h.state.adventure.sunTime; h.frame(++clock * 16); assert.equal(h.state.adventure.sunTime, sunPaused); h.doc.hidden = false;
  while (h.state.adventure.phase === 'sun-finale') h.frame(++clock * 16);
  assert.equal(h.state.modal, 'space-win'); assert(h.modalContent.innerHTML.includes('Herzlichen Glückwunsch'));

  h.press(h.documentHandlers, h.event(key, code, new h.Element('replay at medium', 'button', { difficulty: 'mittel' })));
  assert.equal(h.state.adventure.phase, 'playing'); assert.equal(h.state.adventure.progress, 0); assert(!h.modal.open);
  const ship = h.state.adventure.ship; h.state.adventure.meteors = [{ id: 1, x: ship.x + 1, y: ship.y, radius: 18, vx: -250, vy: 0, angle: 0, spin: 0 }];
  h.frame(++clock * 16); assert.equal(h.state.adventure, null); assert(h.state.rocket.damaged && h.state.landing);
  assert.equal(h.stored.get('bbt-rocket-damaged'), '1');
  assert.equal(h.state.rocket.angle, 180, 'a crash points the rocket nose down');
  assert(h.game.innerHTML.includes('id="rocket-hull" transform="rotate(180 0 -86)"'));
  assert(h.game.innerHTML.includes('id="rocket-pilot-upright" transform="rotate(-180 0 -86)"'));
  assert(!h.state.rocket.broken, 'the rocket stays whole until impact');
  h.frame(++clock * 16); const firstShake = h.get('#rocket-vibration').getAttribute('transform');
  h.frame(++clock * 16); assert.notEqual(h.get('#rocket-vibration').getAttribute('transform'), firstShake, 'the shared rocket and pilot group vibrates during the crash');
  const scenes = new Set(); while (h.state.landing && clock < 2200) { h.frame(++clock * 16); scenes.add(h.state.scene); }
  assert(scenes.has('space') && scenes.has('sky') && scenes.has('world'));
  assert(!h.state.rocket.riding && !h.state.rocket.airborne); assert.equal(h.state.paintCan, 'yellow'); assert.equal(h.state.paint.path, '#ff3935');
  assert(h.state.rocket.broken && h.state.rocket.impact === 0);
  assert(h.game.innerHTML.includes('id="rocket-wreckage"'));
  assert(!h.game.innerHTML.includes('id="rocket-hull"'));
  for (let i = 0; i < 55; i++) h.frame(++clock * 16);
  assert(h.state.rocket.impact >= .8); assert.notEqual(h.get('#rocket-debris-nose').getAttribute('transform'), null, 'pieces scatter after impact');
  h.enterRoom('wardrobe'); h.leaveRoom();
  assert(h.game.innerHTML.includes('id="rocket-wreckage"'), 'room changes keep the wreckage');
  h.state.position = { ...h.state.rocket.position }; h.game.focus(); h.press(h.windowHandlers, h.event(key, code, h.game));
  assert(!h.state.rocket.riding && h.state.rocket.damaged, 'the damaged rocket cannot restart');
  const reload = await harness(false, 'cat', null, true); assert(reload.state.rocket.damaged && reload.state.rocket.broken, 'the repair is still needed after reloading');
  assert(reload.game.innerHTML.includes('id="rocket-wreckage"'));
  h.enterRoom('wardrobe'); assert(h.game.innerHTML.includes('data-room-target="toolbox"'));
  h.state.position = { ...rooms.TOOLBOX_SPOT }; h.game.focus(); h.press(h.windowHandlers, h.event(key, code, h.game));
  assert(h.state.toolbox); assert(h.get('#carried-toolbox').innerHTML.includes('#ff3935'));
  h.leaveRoom(); h.state.position = { ...h.state.rocket.position }; h.game.focus(); assert.equal(h.currentInteraction().kind, 'rocket-repair');
  h.press(h.windowHandlers, h.event(key, code, h.game));
  assert(h.state.rocket.damaged && h.state.rocket.broken && !h.state.rocket.riding); assert.equal(h.state.rocket.repair, 0);
  assert(!h.state.toolbox, 'the tool is consumed when repair starts');
  const oldNose = h.get('#rocket-debris-nose').getAttribute('transform');
  for(let i=0;i<30;i++) h.frame(++clock*16);
  assert(h.state.rocket.damaged && h.state.rocket.broken, 'the ship stays damaged while parts are moving');
  assert.notEqual(h.get('#rocket-debris-nose').getAttribute('transform'), oldNose);
  h.press(h.windowHandlers,h.event(key,code,h.game)); assert(!h.state.rocket.riding, 'repair cannot be interrupted by boarding');
  const repairDeadline=clock+180; while(h.state.rocket.repair != null && clock<repairDeadline) h.frame(++clock*16);
  assert(!h.state.rocket.damaged && !h.state.rocket.broken && !h.state.rocket.riding); assert.equal(h.stored.get('bbt-rocket-damaged'), '0');
  assert(!h.state.toolbox, 'using the toolbox removes it from the player');
  assert(h.get('#carried-toolbox').attrs.has('hidden')); assert.equal(h.get('#carried-toolbox').innerHTML, '');
  assert(!h.game.innerHTML.includes('id="rocket-wreckage"')); assert(h.game.innerHTML.includes('id="rocket-hull"'));
  h.press(h.windowHandlers, h.event(key, code, h.game)); assert(h.state.rocket.riding, 'repair makes the rocket startable');
  h.press(h.windowHandlers, h.event(key, code, h.game)); assert(!h.state.rocket.riding);
  h.enterRoom('wardrobe'); h.state.position = { ...rooms.TOOLBOX_SPOT }; h.game.focus(); h.press(h.windowHandlers, h.event(key, code, h.game)); assert(h.state.toolbox, 'a fresh toolbox is available at home for the next repair');
  h.press(h.windowHandlers, h.event(key, code, h.game)); assert(!h.state.toolbox);
}
const choosingLand = await harness(false, 'dog');
choosingLand.state.rocket.riding = choosingLand.state.rocket.airborne = true;
choosingLand.state.position = { x: 365, y: sky.SPACE.bottom - 2 }; choosingLand.state.rocket.position = { ...choosingLand.state.position };
choosingLand.state.scene = 'sky'; choosingLand.state.keys.add('ArrowUp'); choosingLand.frame(16); choosingLand.frame(32);
for (let time = 48; time < 4500; time += 16) choosingLand.frame(time);
assert.equal(choosingLand.state.modal, 'space-launch'); choosingLand.closePanel();
assert(choosingLand.state.landing && !choosingLand.state.rocket.damaged, 'Escape at the launch choice lands safely');
for (let time = 4500; time < 10000; time += 16) choosingLand.frame(time);
assert.equal(choosingLand.state.scene, 'world'); assert(!choosingLand.state.rocket.riding && !choosingLand.state.rocket.damaged);
console.log('PASS: space entry at 6–7 seconds, original-size straight upward departure in the unchanged world, one cut into the fully visible horizontal starting scene, only three difficulties and return to meadow, immediate start on difficulty choice, four-direction flight, upright pilot, pause, Sun landing, carried/unfolded lounger, sunglasses, sunbathing before congratulations, replay, vibrating nose-down crash, scattering wreckage, persistent damage, consuming and replacing the toolbox, repair and restart work with Enter, Space and NumpadEnter.');

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
  const firstBeam = h.get('#party-beam-0').getAttribute('transform');
  let partyTick = 0;
  for (let i = 0; i < 400; i++) h.frame(++partyTick * 16);
  assert.equal(h.get('#party-dancer-cat').getAttribute('transform'), 'translate(700.00 620.00)');
  assert(h.get('#party-dancer-monkey').classList.contains('has-arrived'));
  assert.notEqual(h.get('#party-beam-0').getAttribute('transform'), firstBeam, 'spotlights sweep through the room');
  assert.equal(h.get('#party-head-0').getAttribute('transform'), h.get('#party-beam-0').getAttribute('transform'));
  h.get('#audio').pause(); for (const callback of h.get('#audio').handlers.get('pause')) callback({});
  assert.equal(layer.classList.contains('is-dancing'), false, 'audio pause stops the dance and lights');
  const pausedAt = h.state.party.elapsed, frozenBeam = h.get('#party-beam-0').getAttribute('transform');
  for (let i = 0; i < 10; i++) h.frame(++partyTick * 16);
  assert.equal(h.get('#party-beam-0').getAttribute('transform'), frozenBeam);
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
  const h = await harness(false, 'monkey', { 'tree-0': '#ff3935', 'flower-0': '#fff20b' }); h.enterRoom('wardrobe');
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
    h.state.position = { x: studio.CANVAS.x + (p.x - core.WORLD.left) * studio.CANVAS.scale, y: studio.CANVAS.y + (p.y + 380) * studio.CANVAS.scale };
    assert.equal(h.currentInteraction()?.id, surface.id);
    const before = h.state.paint[surface.id];
    h.press(h.windowHandlers, h.event(key, code, h.game, true)); assert.equal(h.state.paint[surface.id], before, 'holding a confirmation key does not paint repeatedly');
    h.press(h.windowHandlers, h.event(key, code, h.game)); assert.equal(h.state.paint[surface.id], blue.color);
  }
  assert.equal(h.state.paint['tree-0'], '#ff3935'); assert.equal(h.state.paint['flower-0'], '#fff20b');
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

for (const [key, code] of [['Enter', 'Enter'], [' ', 'Space']]) {
  const h = await harness(false, 'cat'); h.enterRoom('wardrobe'); h.state.position = { ...rooms.PICTURE_SPOT }; h.frame(16);
  assert.equal(h.state.scene, 'painting');
  for (const color of studio.studioColors(content.PALETTE)) {
    h.state.position = { ...color }; h.game.focus(); h.press(h.windowHandlers, h.event(key, code, h.game));
    assert.equal(h.state.studio.color, color.id);
    h.state.position = { x: studio.CANVAS.x + (1000 - core.WORLD.left) * studio.CANVAS.scale, y: studio.CANVAS.y + 1080 * studio.CANVAS.scale };
    h.press(h.windowHandlers, h.event(key, code, h.game));
    assert.equal(h.state.paint.grass, color.color, color.name + ' paints through the actual keyboard handler');
  }
  h.press(h.windowHandlers, h.event('Escape', 'Escape', h.game));
  assert.equal((h.game.innerHTML.match(/data-room-target="paint:/g) || []).length, 6);
  h.state.position = { ...painting.paintSlots(content.PALETTE).find(color => color.id === 'white') }; h.game.focus();
  h.press(h.windowHandlers, h.event(key, code, h.game)); assert.equal(h.state.paintCan, 'white');
}
console.log('PASS: all eighteen picture colors can be taken and confirmed with Enter and Space; five base buckets plus white appear in the house and the white bucket can be picked up.');

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
preciseBrush.state.position = { x: studio.CANVAS.x + (1000 - core.WORLD.left) * studio.CANVAS.scale, y: studio.CANVAS.y + 1080 * studio.CANVAS.scale };
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

const hutTrack = content.TRACKS.find(track => track.id === 'hut'), previousHutAudio = hutTrack.src;
try {
  hutTrack.src = 'uploads/hut.mp3';
  for (const [key, code] of [['Enter','Enter'], [' ','Space'], ['Enter','NumpadEnter']]) {
    const h = await harness(false, 'cat'); h.enterRoom('radio'); h.state.tapes.loaded = 'hut'; h.loadRecording(); let clock = 0;
    assert(h.state.hatActive); assert.equal(h.state.hat.phase, 'perched'); assert.equal(h.get('#player-use').getAttribute('href'), '#dressed-cat');
    const spot = hats.HAT_HIDEOUTS.find(spot => spot.id === 'concert-corner'); h.state.hat.spot = spot.id;
    while (h.state.hat.phase === 'perched' && clock < 400) h.frame(++clock * 16);
    assert.equal(h.state.hat.phase, 'flying'); assert(h.get('#hat-effects').innerHTML.includes('id="flying-hat"'));
    h.get('#audio').pause(); for (const callback of h.get('#audio').handlers.get('pause')) callback({});
    const frozen = h.state.hat.elapsed;
    for (let i = 0; i < 100; i++) h.frame(++clock * 16);
    assert.equal(h.state.hat.elapsed, frozen); assert.equal(h.get('#hat-effects').innerHTML, '');
    await h.get('#audio').play(); for (const callback of h.get('#audio').handlers.get('play')) callback({});
    while (h.state.hat.phase === 'flying' && clock < 800) h.frame(++clock * 16);
    assert.equal(h.state.hat.phase, 'lost'); assert(!h.get('#hat-effects').innerHTML.includes('scale(.38)'), 'the hat is not hidden in the music house');
    h.enterRoom(spot.scene); assert(h.get('#hat-effects').innerHTML.includes('scale(.38)'));
    h.state.position = { ...spot }; h.game.focus();
    h.press(h.windowHandlers, h.event(key, code, h.game, true)); assert.equal(h.state.hat.phase, 'lost');
    const hatTarget = new h.Element('hidden hat', 'g', {hatTarget:'lost-hat'});
    for (const callback of h.game.handlers.get('click')) callback({ target:hatTarget, clientX:spot.x,clientY:spot.y });
    assert.equal(h.state.hat.phase, 'lost', 'mouse navigation does not collect the hat');
    h.state.tapes.loaded = 'tanzen'; h.loadRecording();
    assert(!h.state.hatActive); assert.equal(h.get('#hat-effects').innerHTML, '');
    h.game.focus(); h.press(h.game.handlers, h.event(key, code, hatTarget)); assert.equal(h.state.hat.phase, 'lost', 'a stale focused hat cannot be collected during another song');
    h.state.tapes.loaded = 'hut'; h.loadRecording(); assert(h.state.hatActive); assert.equal(h.state.hat.spot, spot.id);
    h.get('#audio').ended = true; h.get('#audio').paused = true;
    for (const callback of h.get('#audio').handlers.get('ended')) callback({});
    h.press(h.windowHandlers, h.event(key, code, h.game)); assert.equal(h.state.hat.phase, 'lost', 'the song ending disables collection');
    await h.get('#audio').play(); for (const callback of h.get('#audio').handlers.get('play')) callback({});
    h.game.focus(); h.press(h.game.handlers, h.event(key, code, hatTarget));
    assert.equal(h.state.hat.phase, 'unlocked'); assert(h.state.hat.wearing); assert.equal(h.get('#player-use').getAttribute('href'), '#dressed-cat'); assert(h.get('#hat-effects').innerHTML.includes('id="hat-fireworks"'));
    assert.equal(JSON.parse(h.stored.get('bbt-hat-world')).phase, 'unlocked'); assert(JSON.parse(h.stored.get('bbt-hat-world')).wearing);
    h.enterRoom('wardrobe'); assert(h.game.innerHTML.includes('data-hat-target="hat-stand"'));
    h.state.position = { ...hats.HAT_STAND }; h.game.focus();
    h.press(h.windowHandlers, h.event(key, code, h.game)); assert(!h.state.hat.wearing); assert.equal(h.get('#player-use').getAttribute('href'), '#animal-cat');
    h.press(h.windowHandlers, h.event(key, code, h.game)); assert(h.state.hat.wearing); assert.equal(h.get('#player-use').getAttribute('href'), '#dressed-cat');
    const saved = JSON.parse(h.stored.get('bbt-hat-world')), reload = await harness(false, 'cat', null, false, saved);
    assert(reload.state.hat.wearing); assert.equal(reload.get('#player-use').getAttribute('href'), '#dressed-cat');
    h.press(h.windowHandlers, h.event(key, code, h.game)); assert(!h.state.hat.wearing); assert.equal(h.get('#player-use').getAttribute('href'), '#animal-cat');
    h.press(h.windowHandlers, h.event(key, code, h.game)); assert(h.state.hat.wearing);
    const dog = rooms.ANIMAL_SPOTS.find(spot => spot.id === 'dog'); h.state.position = { x: dog.x + 52, y: dog.y + 30 }; h.game.focus();
    const oldPosition = { ...h.state.position };
    h.press(h.windowHandlers, h.event(key, code, h.game)); assert.equal(h.state.animal, 'dog'); assert.equal(h.get('#player-use').getAttribute('href'), '#animal-dog');
    assert(!h.state.hat.wearing); assert(h.state.hat.returning); assert(h.get('#hat-effects').innerHTML.includes('id="returning-hat"'));
    assert(Math.abs(h.state.hat.returning.x - oldPosition.x) < 1); assert(h.state.hat.returning.y < oldPosition.y);
    const rack = () => h.game.innerHTML.slice(h.game.innerHTML.indexOf('id="home-hat-stand"'), h.game.innerHTML.indexOf('data-home-slot='));
    assert(!rack().includes('scale(.8)')); assert(!rack().includes('data-hat-target=')); assert(!JSON.parse(h.stored.get('bbt-hat-world')).wearing);
    while (h.state.hat.returning && clock < 1000) h.frame(++clock * 16);
    assert.equal(h.state.hat.returning, null); assert(!h.get('#hat-effects').innerHTML.includes('id="returning-hat"')); assert(rack().includes('scale(.8)'));
    assert(!h.game.innerHTML.includes('href="#dressed-cat"'), 'the previous figure returns home without the hat');
    h.state.position = { ...hats.HAT_STAND }; h.game.focus(); h.press(h.windowHandlers, h.event(key, code, h.game));
    assert(h.state.hat.wearing); assert.equal(h.get('#player-use').getAttribute('href'), '#dressed-dog');
    h.leaveRoom(); h.state.position={...sky.GROUND_ROCKET}; h.game.focus(); h.press(h.windowHandlers,h.event(key,code,h.game));
    assert(h.game.innerHTML.includes('id="rocket-pilot" href="#dressed-dog"'));
    h.state.keys.add('ArrowUp'); while(!h.state.adventure && clock < 1800)h.frame(++clock*16);
    assert(h.state.adventure); assert(h.game.innerHTML.includes('id="rocket-pilot" href="#dressed-dog"'));
    while(h.state.adventure.phase === 'intro' && clock < 2200)h.frame(++clock*16);
    new h.Element('start easy','button',{difficulty:'leicht'}).click();
    h.state.adventure.progress=adventure.FINISH_DISTANCE;h.state.adventure.meteors=[];h.state.adventure.nextMeteor=Infinity;
    h.frame(++clock*16);assert.equal(h.state.adventure.phase,'sun-finale');
    h.state.adventure.sunTime=adventure.SUN_TRANSITION_DURATION+8-adventure.SUN_STORY_START;h.frame(++clock*16);
    assert.equal(h.get('#sun-actor-use').getAttribute('href'),'#dressed-dog');
    assert(h.state.hat.wearing && h.state.hat.phase==='unlocked', 'continuing the same recording keeps the found hat');
  }
  for (const spot of hats.HAT_HIDEOUTS.filter(spot=>['sky','world','wardrobe'].includes(spot.scene))) {
    const h=await harness(false,'horse',null,false,{phase:'lost',spot:spot.id});
    if(spot.scene==='wardrobe')h.enterRoom('wardrobe');else {h.state.scene=spot.scene;if(spot.scene==='sky'){h.state.rocket.riding=true;h.state.rocket.airborne=true;}}
    h.state.tapes.loaded='hut';h.loadRecording();h.state.position={...spot};h.game.focus();
    h.press(h.windowHandlers,h.event('Enter','Enter',h.game));assert.equal(h.state.hat.phase,'unlocked',spot.id+' can be found through the real handler');assert(h.state.hat.wearing);assert.equal(h.get('#player-use').getAttribute('href'),'#dressed-horse');
  }
  const preview=await harness(true,'cat',null,false,{phase:'unlocked',wearing:false});preview.enterRoom('wardrobe');preview.state.position={...hats.HAT_STAND};preview.game.focus();
  preview.press(preview.windowHandlers,preview.event(' ','Space',preview.game));assert(JSON.parse(preview.stored.get('bbt-hat-preview')).wearing);assert(!preview.stored.has('bbt-hat-world'));
} finally {hutTrack.src=previousHutAudio;}
console.log('PASS: Hut starts only during playback, hides outside the music house, pauses on pause/switch/end, is worn immediately when found with Enter/Space/NumpadEnter, flies from the old figure to its empty stand on a keyboard character change, can be worn again and stays on through rocket zoom and the Sun holiday; preview progress is separate.');

for (const [i, animal] of content.ANIMALS.entries()) {
  const h = await harness(false, animal.id, null, false, { phase: 'unlocked', wearing: true });
  new h.Element('same figure', 'button', { character: animal.id }).click(); assert(h.state.hat.wearing); assert.equal(h.state.hat.returning, null);
  const next = content.ANIMALS[(i + 1) % content.ANIMALS.length];
  new h.Element('another figure', 'button', { character: next.id }).click();
  assert.equal(h.state.animal, next.id); assert(!h.state.hat.wearing); assert(h.state.hat.returning); assert.equal(h.state.hat.returning.scene, 'world');
  h.enterRoom('wardrobe'); assert(!h.game.innerHTML.includes('scale(.8)'));
  let clock = 0; while (h.state.hat.returning && clock < 120) h.frame(++clock * 16);
  assert.equal(h.state.hat.returning, null); assert(h.game.innerHTML.includes('scale(.8)')); assert(!h.state.hat.wearing);
}
console.log('PASS: changing away from any of the four animals returns its worn hat even without music; selecting the same figure keeps it on and entering Home during flight does not duplicate it.');

for (const [key, code] of [['Enter', 'Enter'], [' ', 'Space'], ['Enter', 'NumpadEnter']]) {
  const h = await harness(false, 'cat', null, false, { phase: 'unlocked', wearing: false }); h.enterRoom('wardrobe');
  let clock = 0;
  for (const color of painting.paintSlots(content.PALETTE)) {
    h.state.position = { ...color }; h.game.focus(); h.press(h.windowHandlers, h.event(key, code, h.game)); assert.equal(h.state.paintCan, color.id);
    h.state.position = { ...hats.HAT_STAND }; h.frame(++clock * 16); assert.equal(h.currentInteraction()?.kind, 'paint-hat'); assert(h.get('#interact').hidden);
    const before = h.state.hat.color, stand = new h.Element('hat stand', 'g', { hatTarget: 'hat-stand' });
    for (const callback of h.game.handlers.get('click')) callback({ target: stand });
    assert.equal(h.state.hat.color, before, 'mouse navigation cannot paint the hat');
    for (const callback of h.get('#interact').handlers.get('click')) callback({}); assert.equal(h.state.hat.color, before, 'a hidden interaction button cannot paint it');
    h.press(h.windowHandlers, h.event(key, code, h.game, true)); assert.equal(h.state.hat.color, before);
    h.press(h.windowHandlers, h.event(key, code, h.game)); assert.equal(h.state.hat.color, color.color); assert(!h.state.hat.wearing); assert.equal(h.state.paintCan, color.id);
    assert.equal(JSON.parse(h.stored.get('bbt-hat-world')).color, color.color);
    assert(h.game.innerHTML.includes(`data-hat-color="" fill="${color.color}"`)); assert(!h.game.innerHTML.includes('data-hat-color="" fill="#1d55ff"') || color.color === '#1d55ff');
  }
  assert.equal(h.state.paintCan, 'white'); assert.equal(h.state.hat.color, '#ffffff');
  h.press(h.windowHandlers, h.event('Escape', 'Escape', h.game)); assert.equal(h.state.paintCan, null);
  h.press(h.windowHandlers, h.event(key, code, h.game)); assert(h.state.hat.wearing); assert.equal(h.get('#player-use').getAttribute('href'), '#dressed-cat');
  const saved = JSON.parse(h.stored.get('bbt-hat-world')), reload = await harness(false, 'cat', null, false, saved);
  assert(reload.state.hat.wearing); assert.equal(reload.state.hat.color, '#ffffff'); assert(reload.game.innerHTML.includes('data-hat-color="" fill="#ffffff"'));
  const dog = rooms.ANIMAL_SPOTS.find(spot => spot.id === 'dog'); h.state.position = { x: dog.x + 52, y: dog.y + 30 }; h.game.focus(); h.press(h.windowHandlers, h.event(key, code, h.game));
  assert(h.state.hat.returning); assert(h.get('#hat-effects').innerHTML.includes('data-hat-color="" fill="#ffffff"')); assert(!h.state.hat.wearing);
  while (h.state.hat.returning && clock < 200) h.frame(++clock * 16);
  assert.equal(h.state.hat.returning, null); assert.equal(h.state.hat.color, '#ffffff');
}
console.log('PASS: all six buckets paint only the resting hat through Enter/Space/NumpadEnter; clicks and repeats cannot paint, the bucket remains carried, and a white hat retains its color when worn, reloaded and flown back.');

try {
 hutTrack.src='uploads/hut.mp3';
 for(const wearing of [false,true]) {
  const h=await harness(false,'cat',null,false,{phase:'unlocked',wearing,spot:'flowers'});h.enterRoom('wardrobe');h.state.tapes.loaded='hut';h.loadRecording();
  assert.equal(h.state.hat.phase,'perched');assert.equal(h.get('#player-use').getAttribute('href'),'#dressed-cat');
  const rack=()=>h.game.innerHTML.slice(h.game.innerHTML.indexOf('id="home-hat-stand"'),h.game.innerHTML.indexOf('data-home-slot='));
  assert(rack().includes('Noch unterwegs'));assert(!rack().includes('scale(.8)'));assert(!rack().includes('data-hat-target='));
  h.state.position={...hats.HAT_STAND};h.game.focus();h.press(h.windowHandlers,h.event('Enter','Enter',h.game));assert.equal(h.state.hat.phase,'perched');
  let clock=0;for(let i=0;i<50;i++)h.frame(++clock*16);const elapsed=h.state.hat.elapsed;
  h.get('#audio').pause();for(const cb of h.get('#audio').handlers.get('pause'))cb({});
  await h.get('#audio').play();for(const cb of h.get('#audio').handlers.get('play'))cb({});assert.equal(h.state.hat.elapsed,elapsed);
  while(h.state.hat.phase!=='lost'&&clock<700)h.frame(++clock*16);
  const spot=hats.hatSpot(h.state.hat);if(['radio','concerts','wardrobe'].includes(spot.scene))h.enterRoom(spot.scene);else {h.leaveRoom();h.state.scene=spot.scene;}
  h.state.position={...spot};if(spot.scene==='sky'){h.state.rocket.riding=true;h.state.rocket.airborne=true;}h.game.focus();h.press(h.windowHandlers,h.event(' ','Space',h.game));assert.equal(h.state.hat.phase,'unlocked');
  h.get('#audio').pause();for(const cb of h.get('#audio').handlers.get('pause'))cb({});await h.get('#audio').play();for(const cb of h.get('#audio').handlers.get('play'))cb({});assert.equal(h.state.hat.phase,'unlocked','pause/resume after finding does not start a new run');
  h.get('#audio').ended=true;h.get('#audio').paused=true;for(const cb of h.get('#audio').handlers.get('ended'))cb({});
  await h.get('#audio').play();for(const cb of h.get('#audio').handlers.get('play'))cb({});assert.equal(h.state.hat.phase,'perched','replaying a finished song starts the next search');assert.notEqual(h.state.hat.spot,spot.id);
 }
} finally {hutTrack.src=previousHutAudio;}
console.log('PASS: restarting Hut retrieves a stored or worn hat, keeps its stand empty and unusable until the next find, pauses without resetting and starts another search when the ended song is played again.');

for(const level of ['leicht','mittel','profi']) {
 const h=await harness(false,'cat');h.state.scene='space';h.state.position={x:365,y:sky.SPACE.bottom-50};h.state.rocket.position={...h.state.position};h.state.rocket.riding=true;h.state.rocket.airborne=true;
 h.state.adventure=adventure.createAdventure(1200,700);h.state.adventure.phase='ready';h.state.adventure.nextDifficulty=h.state.difficulty;h.showPanel('space-launch');
 assert(h.modalContent.innerHTML.includes('Raumfahrprofi'));assert(h.modalContent.innerHTML.includes('data-difficulty="leicht"'));
 const choice=new h.Element('difficulty','button',{difficulty:level});h.press(h.documentHandlers,h.event('Enter','Enter',choice));assert.equal(h.state.adventure.nextDifficulty,level);assert.equal(h.stored.get('bbt-adventure-difficulty'),level);
 assert.equal(h.state.adventure.phase,'playing','a difficulty choice starts immediately');assert.equal(h.state.adventure.difficulty,level);assert(!h.modal.open);
 new h.Element('cannot change during flight','button',{difficulty:'profi'}).click();assert.equal(h.state.adventure.difficulty,level);
 let clock=1;h.frame(clock*16);h.state.adventure.progress=adventure.FINISH_DISTANCE;h.state.adventure.meteors=[];h.state.adventure.nextMeteor=Infinity;h.frame(++clock*16);
 h.state.adventure.sunTime=adventure.sunHolidayDuration(h.state.adventure)-.01;h.frame(++clock*16);assert.equal(h.state.adventure.phase,'won');assert.equal(h.state.adventure.completedDifficulty,level);
 new h.Element('land','button',{action:'space-land'}).click();assert.equal(h.state.landing.success,level==='profi');
 while(h.state.landing&&clock<500)h.frame(++clock*16);
 assert(!h.state.landing);assert.equal(h.state.scene,'world');
 if(level==='profi'){
  assert(h.state.reception);assert.equal(h.state.reception.phase,'celebrating');assert(h.state.rocket.riding);assert(!h.state.rocket.airborne);assert(!h.game.classList.contains('is-reception'));assert(h.get('#player').attrs.has('hidden'));assert(h.game.innerHTML.includes('id="rocket-pilot" href="#animal-cat"'));assert(h.get('#reception-effects').innerHTML.includes('reception-fireworks'));
  for(let i=0;i<700;i++)h.frame(++clock*16);assert.equal(reception.receptionAway(h.state.reception).length,3);assert(h.state.rocket.riding);assert(h.get('#reception-effects').innerHTML.includes('reception-fireworks'),'fireworks last beyond several original bursts while seated');
  h.game.focus();h.press(h.windowHandlers,h.event('Enter','Enter',h.game));assert(!h.state.rocket.riding);assert(!h.get('#player').attrs.has('hidden'));assert(!h.get('#reception-effects').innerHTML.includes('reception-fireworks'));assert.equal(h.state.reception.phase,'celebrating');
  const departureDeadline=clock+200;h.state.keys.add('ArrowDown');while(h.state.reception.phase==='celebrating'&&clock<departureDeadline)h.frame(++clock*16);h.state.keys.clear();assert.equal(h.state.reception.phase,'leaving');
  h.enterRoom('wardrobe');assert.equal((h.game.innerHTML.match(/id="home-animal-/g)||[]).length,0);
  const homeDeadline=clock+1200;while(h.state.reception&&clock<homeDeadline)h.frame(++clock*16);assert.equal(h.state.reception,null);assert.equal((h.game.innerHTML.match(/id="home-animal-/g)||[]).length,3);
 }else {assert.equal(h.state.reception,null,'only the actually completed pro level earns the reception');assert(!h.state.rocket.riding,'other returns retain automatic exit');}
}
console.log('PASS: all three levels are keyboard selectable, preserve their completed result and only pro success leaves the pilot aboard with repeating fireworks until Enter exits; walking away still sends every guest home without duplicate figures.');

for (const [key, code] of [[' ', 'Space'], ['Enter', 'NumpadEnter']]) {
  const h = await harness(false, 'dog'); h.state.scene = 'space'; h.state.position = { x: 365, y: sky.SPACE.bottom - 50 }; h.state.rocket.position = { ...h.state.position }; h.state.rocket.riding = true; h.state.rocket.airborne = true;
  h.state.adventure = adventure.createAdventure(1200, 700); h.state.adventure.phase = 'won'; h.state.adventure.completedDifficulty = 'profi';
  new h.Element('land', 'button', { action: 'space-land' }).click(); let clock = 0;
  while (h.state.landing && clock < 500) h.frame(++clock * 16);
  assert(h.state.rocket.riding); assert(!h.state.rocket.airborne); assert(h.state.reception.fireworks);
  h.game.focus(); h.press(h.windowHandlers, h.event(key, code, h.game, true)); assert(h.state.rocket.riding);
  h.press(h.windowHandlers, h.event(key, code, h.game)); assert(!h.state.rocket.riding); assert(!h.get('#reception-effects').innerHTML.includes('reception-fireworks')); assert.equal(h.state.reception.phase, 'celebrating');
}
console.log('PASS: Space and Numpad Enter also leave the parked pro rocket and end fireworks, while held confirmation does not cause an automatic exit.');

try {
 dancingTrack.src='uploads/tanzen.mp3';const h=await harness(false,'cat');h.enterRoom('radio');h.state.tapes.loaded='tanzen';h.loadRecording();
 const before=h.get('#party-beam-0').writes.get('transform')||0;for(let i=1;i<=100;i++)h.frame(i*16);
 const updates=(h.get('#party-beam-0').writes.get('transform')||0)-before;assert(updates<=34&&updates>=25,'lights update at about twenty frames per second');
 const x=h.state.position.x;h.state.keys.add('ArrowRight');for(let i=101;i<=111;i++)h.frame(i*16);h.state.keys.clear();assert(h.state.position.x>x+25,'player movement remains independent of the slower light updates');
}finally{dancingTrack.src=originalDanceAudio;}
console.log('PASS: disco spotlights use about twenty updates per second while player movement retains its normal frame rate.');


const chocolateTrack = { id: 'schokolade', title: 'Schokolade', src: 'uploads/schokolade.mp3', color: '#ff87ce', image: 'assets/hut.png' };
content.TRACKS.push(chocolateTrack);
try {
  const h = await harness(false, 'monkey'); h.enterRoom('radio'); h.state.tapes.loaded = chocolateTrack.id; h.loadRecording();
  assert(h.state.chocolate.active); assert(h.game.innerHTML.includes('data-room-target="choco-door"'));
  h.state.position = { x: chocolate.CHOCOLATE_DOOR.x, y: 550 }; h.game.focus(); h.state.keys.add('ArrowUp');
  let clock = 0;
  while (h.state.scene === 'radio' && clock < 100) h.frame(++clock * 16);
  assert.equal(h.state.scene, 'chocolate'); assert.equal(h.state.chocolate.run.collected.length, 0); assert.equal(h.state.keys.size, 0);
  assert.equal((h.game.innerHTML.match(/id="maze-chocolate-[1-5]"/g) || []).length, 5);
  const locked = await harness(false, 'cat'); locked.enterRoom('wardrobe'); assert(!locked.game.innerHTML.includes('data-room-target="chocolate-drawer"'));
  for (const bar of chocolate.MAZE_CHOCOLATES) {
    h.state.path = core.planPath(h.state.position, bar, 'chocolate'); assert(h.state.path.length);
    const deadline = clock + 4000;
    while (!h.state.chocolate.run.collected.includes(bar.id) && clock < deadline) { h.frame(++clock * 16); assert(chocolate.canStandChocolate(h.state.position.x, h.state.position.y)); }
    assert(h.state.chocolate.run.collected.includes(bar.id)); assert(h.get('#maze-' + bar.id).attrs.has('hidden'));
    assert.equal(h.get('#chocolate-status').textContent, content.text('choco_count', { anzahl: h.state.chocolate.run.collected.length }), 'the visible SVG counter updates for every collected bar');
    assert.equal(h.get('#chocolate-progress').textContent, h.get('#chocolate-status').textContent, 'both visible counters agree');
  }
  assert.equal(h.state.chocolate.run.phase, 'celebrate'); assert(h.state.chocolate.unlocked); assert(JSON.parse(h.stored.get('bbt-chocolate-world')).unlocked);
  h.frame(++clock * 16); assert(h.get('#chocolate-celebration').innerHTML.includes('chocolate-confetti'));
  while (h.state.chocolate.run.phase === 'celebrate') h.frame(++clock * 16);
  assert.equal(h.state.chocolate.run.phase, 'leaving'); h.state.keys.add('ArrowRight');
  const deadline = clock + 3000; while (h.state.scene === 'chocolate' && clock < deadline) h.frame(++clock * 16);
  assert.equal(h.state.scene, 'radio'); assert.deepEqual({ ...h.state.position }, { ...chocolate.CHOCOLATE_RETURN }); assert.equal(h.state.chocolate.run, null); assert(h.state.chocolate.active);
  for (let i = 0; i < 10; i++) h.frame(++clock * 16); assert.equal(h.state.scene, 'radio', 'return point does not immediately enter the door again');
  h.enterRoom('wardrobe'); assert(h.game.innerHTML.includes('data-room-target="chocolate-drawer"'));
  h.state.position = { ...chocolate.CHOCOLATE_DRAWER }; h.game.focus();
  h.press(h.windowHandlers, h.event('Enter', 'Enter', h.game, true)); assert(!h.state.chocolate.carrying);
  h.press(h.windowHandlers, h.event('Enter', 'Enter', h.game)); assert(h.state.chocolate.carrying); assert.equal(h.state.chocolate.boost, 0);
  h.press(h.windowHandlers, h.event('Enter', 'Enter', h.game)); assert(!h.state.chocolate.carrying); assert.equal(h.state.chocolate.boost, 19.65);
  h.leaveRoom(); h.state.position = { x: 650, y: 650 }; h.game.focus(); h.state.keys.add('ArrowRight');
  const before = { ...h.state.position }; h.frame(++clock * 16);
  assert(Math.abs(h.state.position.x - before.x - core.WORLD.speed * .016 * 2) < 1e-8);
  h.state.keys.clear(); h.frame(clock * 16 + 19651); assert.equal(h.state.chocolate.boost, 0); assert.equal(chocolate.chocolateSpeed(h.state.chocolate), 1);
  const reload = await harness(false, 'cat', null, false, null, JSON.parse(h.stored.get('bbt-chocolate-world'))); reload.enterRoom('wardrobe');
  assert(reload.game.innerHTML.includes('data-room-target="chocolate-drawer"')); assert(!reload.state.chocolate.carrying); assert.equal(reload.state.chocolate.boost, 0);
  console.log('PASS: Schokolade changes only the left speaker into a door, walking enters without confirmation, five reachable bars collect by touch, confetti plays, the figure walks itself out, the drawer persists, separate presses take/eat and the 19.65-second boost gradually returns to normal speed.');

  for (const reason of ['ended', 'changed', 'escape']) {
    const h = await harness(false, 'dog'); h.enterRoom('radio'); h.state.tapes.loaded = chocolateTrack.id; h.loadRecording();
    h.state.position = { ...chocolate.CHOCOLATE_DOOR }; h.game.focus(); let clock = 0; h.frame(++clock * 16);
    assert.equal(h.state.scene, 'chocolate'); h.state.path = core.planPath(h.state.position, chocolate.MAZE_CHOCOLATES[0], 'chocolate');
    for (let i = 0; i < 200; i++) h.frame(++clock * 16);
    if (reason === 'ended') { h.get('#audio').ended = true; h.get('#audio').paused = true; for (const cb of h.get('#audio').handlers.get('ended')) cb({}); }
    if (reason === 'changed') { h.state.tapes.loaded = 'tanzen'; h.loadRecording(); }
    if (reason === 'escape') h.press(h.windowHandlers, h.event('Escape', 'Escape', h.game));
    assert.equal(h.state.chocolate.run.phase, 'leaving');
    const deadline = clock + 2000; while (h.state.scene === 'chocolate' && clock < deadline) h.frame(++clock * 16);
    assert.equal(h.state.scene, 'radio'); assert(!h.state.chocolate.unlocked); assert.equal(h.state.chocolate.run, null);
  }
  console.log('PASS: song ending, changing songs and Escape each trigger an automatic collision-free walk to the maze exit, without unlocking an unfinished reward.');

  for (const [key, code] of [[' ', 'Space'], ['Enter', 'NumpadEnter']]) {
    const h = await harness(true, 'horse', null, false, null, { unlocked: true }); h.enterRoom('wardrobe'); h.state.position = { ...chocolate.CHOCOLATE_DRAWER }; h.game.focus();
    h.press(h.windowHandlers, h.event(key, code, h.game)); assert(h.state.chocolate.carrying); assert.equal(h.state.chocolate.boost, 0);
    h.press(h.windowHandlers, h.event(key, code, h.game, true)); assert(h.state.chocolate.carrying);
    h.press(h.windowHandlers, h.event(key, code, h.game)); assert(!h.state.chocolate.carrying); assert.equal(h.state.chocolate.boost, 19.65);
    assert(h.stored.has('bbt-chocolate-preview')); assert(!h.stored.has('bbt-chocolate-world'));
  }
  console.log('PASS: Space and Numpad Enter take and eat a single bar in two distinct presses; held keys do not eat it and preview rewards are separate.');

  const paused = await harness(false, 'cat'); paused.enterRoom('radio'); paused.state.tapes.loaded = chocolateTrack.id; paused.loadRecording(); paused.state.position = { ...chocolate.CHOCOLATE_DOOR }; paused.game.focus(); paused.frame(16);
  assert.equal(paused.state.scene, 'chocolate'); paused.get('#audio').pause(); for (const cb of paused.get('#audio').handlers.get('pause')) cb({});
  const waiting = { ...paused.state.position }; paused.state.keys.add('ArrowRight');
  for (let frame = 2; frame < 20; frame++) paused.frame(frame * 16);
  assert.deepEqual({ ...paused.state.position }, waiting); assert.equal(paused.state.chocolate.run.phase, 'search');
  await paused.get('#audio').play(); for (const cb of paused.get('#audio').handlers.get('play')) cb({});
  paused.frame(20 * 16); assert(paused.state.position.x > waiting.x);
  paused.press(paused.windowHandlers, paused.event('Escape', 'Escape', paused.game)); assert.equal(paused.state.chocolate.run.phase, 'leaving');
  console.log('PASS: pausing Schokolade freezes exploration without losing the run, resuming restores walking, and Escape still starts a safe automatic return.');
} finally { content.TRACKS.splice(content.TRACKS.indexOf(chocolateTrack), 1); }

for (const [key, code] of [['Enter', 'Enter'], [' ', 'Space']]) {
  const h = await harness(false, 'cat'); h.enterRoom('wardrobe');
  h.state.position = { ...painting.paintSlots(content.PALETTE).find(color => color.id === 'red') }; h.game.focus();
  h.press(h.windowHandlers, h.event(key, code, h.game)); h.leaveRoom(); let clock = 0;
  for (const surface of painting.BUCKET_SURFACES.filter(surface => surface.bucket)) {
    h.state.paintTarget = null; h.state.position = { ...surface.walk }; h.game.focus(); h.frame(++clock * 16);
    assert.equal(h.currentInteraction()?.id, surface.id, 'nearby keyboard painting selects ' + surface.id);
    assert.equal(h.currentInteraction()?.kind, 'paint'); assert.equal(h.state.paint[surface.id], undefined, 'approach is only a preview');
    const nodes = h.game.querySelectorAll('[data-paint-target="' + surface.id + '"]');
    for (const node of nodes) assert.equal(node.getAttribute(node.dataset.paintProperty), '#ff3935');
    h.state.position = { x: 1000, y: 600 }; h.frame(++clock * 16);
    for (const node of nodes) assert.notEqual(node.getAttribute(node.dataset.paintProperty), '#ff3935', 'walking away restores ' + surface.id);
    h.state.position = { ...surface.walk }; h.frame(++clock * 16); h.press(h.windowHandlers, h.event(key, code, h.game));
    assert.equal(h.state.paint[surface.id], '#ff3935'); assert.equal(h.state.scene, 'world'); assert(!h.modal.open);
  }
  const mailbox = painting.PAINT_SURFACES.find(surface => surface.id === 'mailbox');
  h.state.paintTarget = null; h.state.position = { ...mailbox.walk }; h.game.focus(); h.frame(++clock * 16);
  assert.equal(h.currentInteraction(), null); h.press(h.windowHandlers, h.event(key, code, h.game)); assert.equal(h.state.paint.mailbox, undefined);
  h.enterRoom('wardrobe'); h.state.position = { ...rooms.PICTURE_SPOT }; h.frame(++clock * 16);
  h.state.position = { ...studio.studioColors(content.PALETTE).find(color => color.id === 'gray') }; h.game.focus();
  h.press(h.windowHandlers, h.event(key, code, h.game));
  const point = { x: mailbox.bounds.x + mailbox.bounds.w / 2, y: mailbox.bounds.y + 40 };
  h.state.position = { x: studio.CANVAS.x + (point.x - core.WORLD.left) * studio.CANVAS.scale, y: studio.CANVAS.y + (point.y + 380) * studio.CANVAS.scale };
  assert.equal(h.currentInteraction()?.id, 'mailbox'); h.press(h.windowHandlers, h.event(key, code, h.game));
  assert.equal(h.state.paint.mailbox, '#969ba5'); assert.equal(h.state.paintCan, 'red');
  const reload = await harness(false, 'cat', JSON.parse(h.stored.get('bbt-paint-world'))); assert.equal(reload.state.paint.mailbox, '#969ba5');
}
console.log('PASS: nearby Enter/Space previews and confirms every requested house detail and sign without opening rooms, walking away restores unconfirmed color, buckets leave the mailbox alone and the brush colors and saves its body, flag and post.');

for (const bucket of [null, ...painting.bucketColors(content.PALETTE)]) {
  const h = await harness(false, 'dog'); h.state.paintCan = bucket?.id || null; h.game.focus();
  let clock = flyIntoSky(h); h.state.keys.add('ArrowUp');
  while (!h.state.adventure && clock < 2000) h.frame(++clock * 16);
  h.state.keys.clear(); assert(h.state.adventure); assert.equal(h.state.adventure.trailColor, bucket?.color || null);
  while (h.state.adventure.phase === 'intro') h.frame(++clock * 16);
  new h.Element('easy flight', 'button', { difficulty: 'leicht' }).click();
  h.state.adventure.nextMeteor = Infinity; h.state.keys.add('ArrowUp');
  for (let i = 0; i < 20; i++) h.frame(++clock * 16); h.state.keys.clear();
  const path = h.get('#adventure-paint-trail').getAttribute('d');
  if (bucket) {
    assert(path.startsWith('M')); assert(path.includes('L')); assert(h.game.innerHTML.includes('stroke="' + bucket.color + '" stroke-width="6"'));
    h.press(h.windowHandlers, h.event('Escape', 'Escape', h.game)); const frozen = JSON.stringify(h.state.adventure.paintTrail);
    h.frame(++clock * 16); assert.equal(JSON.stringify(h.state.adventure.paintTrail), frozen); assert.equal(h.get('#adventure-paint-trail').getAttribute('d'), path);
  } else assert.equal(path, '');
}
console.log('PASS: flying into space captures each carried bucket color, draws and updates the actual SVG path during play, pauses it with the game, and omits the line when no bucket is carried.');

const boostTrack = { id: 'schokolade', title: 'Schokolade', src: 'uploads/schokolade.mp3', color: '#ff87ce', image: 'assets/hut.png' };
const originalBoostCassette = content.TRACKS[1].src; content.TRACKS[1].src = 'uploads/tanzen.mp3'; content.TRACKS.push(boostTrack);
try {
  for (const [key, code] of [['Enter', 'Enter'], [' ', 'Space'], ['Enter', 'NumpadEnter']]) {
    for (const previousMode of ['empty', 'paused', 'playing']) {
      const h = await harness(false, 'cat', null, false, null, { unlocked: true });
      if (previousMode !== 'empty') {
        h.state.tapes.loaded = 'tanzen'; h.loadRecording(); h.get('#audio').currentTime = 37.5;
        if (previousMode === 'paused') { h.get('#audio').pause(); for (const cb of h.get('#audio').handlers.get('pause')) cb({}); }
      }
      const before = JSON.stringify(h.state.tapes); h.enterRoom('wardrobe'); h.state.position = { ...chocolate.CHOCOLATE_DRAWER }; h.game.focus();
      h.press(h.windowHandlers, h.event(key, code, h.game)); h.press(h.windowHandlers, h.event(key, code, h.game));
      assert.equal(h.state.chocolate.boost, 19.65); assert.equal(h.get('#audio').src, boostTrack.src); assert(h.state.playing);
      assert.equal(h.state.boostMusic.id, boostTrack.id); assert.equal(JSON.stringify(h.state.tapes), before, 'bonus music does not relocate any cassette');
      assert(!h.state.party.active); assert(!h.state.hatActive); assert(!h.state.chocolate.active); assert(!h.state.chocolate.session);
      h.enterRoom('radio'); assert(!h.game.innerHTML.includes('data-room-target="choco-door"'), 'treat music alone keeps the speaker closed');
      h.state.position = { ...chocolate.CHOCOLATE_DOOR }; h.frame(16); assert.equal(h.state.scene, 'radio', 'walking into the speaker during a boost cannot enter the maze');
      h.frame(18666); assert(h.state.boostMusic); assert.equal(h.state.chocolate.boost, 1);
      h.frame(19667); assert.equal(h.state.boostMusic, null); assert.equal(h.state.chocolate.boost, 0); assert.equal(h.get('#audio').loop, false);
      if (previousMode === 'empty') assert(h.get('#audio').paused);
      else {
        assert.equal(h.get('#audio').src, 'uploads/tanzen.mp3'); assert.equal(h.get('#audio').currentTime, 37.5);
        assert.equal(h.get('#audio').paused, previousMode === 'paused'); assert.equal(h.state.party.active, previousMode === 'playing');
      }
    }
  }
  const renewed = await harness(false, 'cat', null, false, null, { unlocked: true }); renewed.state.tapes.loaded = 'tanzen'; renewed.loadRecording(); renewed.get('#audio').currentTime = 18;
  renewed.enterRoom('wardrobe'); renewed.state.position = { ...chocolate.CHOCOLATE_DRAWER }; renewed.game.focus();
  for (let press = 0; press < 2; press++) renewed.press(renewed.windowHandlers, renewed.event('Enter', 'Enter', renewed.game));
  renewed.frame(16); renewed.frame(5016);
  for (let press = 0; press < 2; press++) renewed.press(renewed.windowHandlers, renewed.event('Enter', 'Enter', renewed.game));
  assert.equal(renewed.state.chocolate.boost, 19.65); assert.equal(renewed.state.boostMusic.previous.time, 18); assert.equal(renewed.get('#audio').currentTime, 0);
  renewed.frame(24667); assert.equal(renewed.state.boostMusic, null); assert.equal(renewed.get('#audio').src, 'uploads/tanzen.mp3'); assert.equal(renewed.get('#audio').currentTime, 18);
  renewed.state.position = { ...chocolate.CHOCOLATE_DRAWER };
  for (let press = 0; press < 2; press++) renewed.press(renewed.windowHandlers, renewed.event('Enter', 'Enter', renewed.game));
  renewed.state.tapes.loaded = 'freundschaft'; const chosen = content.TRACKS.find(track => track.id === 'freundschaft'), oldSrc = chosen.src; chosen.src = 'uploads/freunde.mp3'; renewed.loadRecording();
  assert.equal(renewed.state.boostMusic, null); renewed.frame(43018); assert.equal(renewed.get('#audio').src, chosen.src, 'choosing another cassette cancels automatic music return');
  chosen.src = oldSrc;

  const alreadyPlaying = await harness(false, 'dog', null, false, null, { unlocked: true }); alreadyPlaying.state.tapes.loaded = boostTrack.id; alreadyPlaying.loadRecording(); alreadyPlaying.get('#audio').currentTime = 43;
  alreadyPlaying.enterRoom('wardrobe'); alreadyPlaying.state.position = { ...chocolate.CHOCOLATE_DRAWER }; alreadyPlaying.game.focus();
  alreadyPlaying.press(alreadyPlaying.windowHandlers, alreadyPlaying.event('Enter', 'Enter', alreadyPlaying.game)); alreadyPlaying.press(alreadyPlaying.windowHandlers, alreadyPlaying.event('Enter', 'Enter', alreadyPlaying.game));
  assert.equal(alreadyPlaying.state.boostMusic.continuing, true); assert.equal(alreadyPlaying.get('#audio').currentTime, 43, 'Schokolade already playing continues smoothly until it fades out');
  assert(alreadyPlaying.state.chocolate.active && alreadyPlaying.state.chocolate.session, 'a Schokolade cassette that is already playing keeps its own doorway');
  alreadyPlaying.enterRoom('radio'); assert(alreadyPlaying.game.innerHTML.includes('data-room-target="choco-door"'));

  const endedCassette = await harness(false, 'dog', null, false, null, { unlocked: true });
  endedCassette.state.tapes.loaded = boostTrack.id; endedCassette.loadRecording();
  endedCassette.get('#audio').ended = true; endedCassette.get('#audio').paused = true;
  for (const cb of endedCassette.get('#audio').handlers.get('ended')) cb({});
  assert(!endedCassette.state.chocolate.session);
  endedCassette.enterRoom('wardrobe'); endedCassette.state.position = { ...chocolate.CHOCOLATE_DRAWER }; endedCassette.game.focus();
  for (let press = 0; press < 2; press++) endedCassette.press(endedCassette.windowHandlers, endedCassette.event('Enter', 'Enter', endedCassette.game));
  assert(endedCassette.state.boostMusic && endedCassette.state.playing); assert(!endedCassette.state.chocolate.active && !endedCassette.state.chocolate.session, 'eating does not reopen an ended Schokolade cassette');
  endedCassette.enterRoom('radio'); assert(!endedCassette.game.innerHTML.includes('data-room-target="choco-door"'));

  const insertDuringBoost = await harness(false, 'cat', null, false, null, { unlocked: true });
  insertDuringBoost.enterRoom('wardrobe'); insertDuringBoost.state.position = { ...chocolate.CHOCOLATE_DRAWER }; insertDuringBoost.game.focus();
  for (let press = 0; press < 2; press++) insertDuringBoost.press(insertDuringBoost.windowHandlers, insertDuringBoost.event(' ', 'Space', insertDuringBoost.game));
  insertDuringBoost.enterRoom('radio'); assert(!insertDuringBoost.game.innerHTML.includes('data-room-target="choco-door"'));
  insertDuringBoost.state.tapes.carrying = boostTrack.id; insertDuringBoost.state.position = { ...rooms.RADIO }; insertDuringBoost.game.focus();
  insertDuringBoost.press(insertDuringBoost.windowHandlers, insertDuringBoost.event(' ', 'Space', insertDuringBoost.game));
  assert.equal(insertDuringBoost.state.tapes.loaded, boostTrack.id); assert.equal(insertDuringBoost.state.boostMusic, null);
  assert(insertDuringBoost.state.chocolate.active && insertDuringBoost.game.innerHTML.includes('data-room-target="choco-door"'), 'physically inserting the cassette opens the maze even during a boost');
} finally { content.TRACKS.splice(content.TRACKS.indexOf(boostTrack), 1); content.TRACKS[1].src = originalBoostCassette; }
console.log('PASS: eating with Enter, Space or Numpad Enter plays Schokolade for the 19.65-second boost, restores an empty, paused or playing radio at its saved position, leaves cassettes in place, supports repeated treats, never opens a maze from bonus music alone and respects a newly inserted cassette.');

const returnTrack = { id: 'schokolade', title: 'Schokolade', src: 'uploads/schokolade.mp3', color: '#ff87ce', image: 'assets/hut.png' };
content.TRACKS.push(returnTrack);
try {
  const h = await harness(false, 'dog'); h.enterRoom('radio'); h.state.tapes.loaded = returnTrack.id; h.loadRecording(); h.game.focus(); let clock = 0;
  const step = () => h.frame(++clock * 16);
  const enter = () => { h.state.position = { ...chocolate.CHOCOLATE_DOOR }; step(); assert.equal(h.state.scene, 'chocolate'); };
  const leave = () => { h.press(h.windowHandlers, h.event('Escape', 'Escape', h.game)); const deadline = clock + 3500; while (h.state.scene === 'chocolate' && clock < deadline) step(); assert.equal(h.state.scene, 'radio'); };
  const visibleBars = () => [...h.game.innerHTML.matchAll(/<g id="maze-chocolate-[1-5]"[^>]*>/g)].filter(match => !match[0].includes('hidden=""')).length;
  enter();
  h.state.position = { ...chocolate.MAZE_CHOCOLATES[0] }; step(); assert.equal(h.state.chocolate.collected.length, 1); leave();
  assert(h.game.innerHTML.includes('data-room-target="choco-door"'), 'the door stays open after returning while the song is playing');
  enter(); assert.equal(visibleBars(), 4); assert.equal(h.get('#chocolate-status').textContent, content.text('choco_count', { anzahl: 1 }));
  for (const bar of chocolate.MAZE_CHOCOLATES.slice(1)) { h.state.position = { ...bar }; step(); }
  assert.equal(h.state.chocolate.run.phase, 'celebrate'); const deadline = clock + 3500;
  while (h.state.scene === 'chocolate' && clock < deadline) step();
  assert.equal(h.state.scene, 'radio'); assert(h.game.innerHTML.includes('data-room-target="choco-door"'));
  enter(); assert.equal(visibleBars(), 0); assert.equal(h.state.chocolate.run.collected.length, 5); assert.equal(h.state.chocolate.run.phase, 'search', 'a completed collection does not replay confetti');
  leave(); h.get('#audio').pause(); for (const cb of h.get('#audio').handlers.get('pause')) cb({});
  assert(h.game.innerHTML.includes('data-room-target="choco-door"'), 'pausing does not turn the doorway back into a speaker');
  await h.get('#audio').play(); for (const cb of h.get('#audio').handlers.get('play')) cb({});
  enter(); assert.equal(visibleBars(), 0);
  h.get('#audio').ended = true; h.get('#audio').paused = true; for (const cb of h.get('#audio').handlers.get('ended')) cb({});
  while (h.state.scene === 'chocolate' && clock < deadline + 3500) step();
  assert.equal(h.state.scene, 'radio'); assert(!h.game.innerHTML.includes('data-room-target="choco-door"'));
  await h.get('#audio').play(); for (const cb of h.get('#audio').handlers.get('play')) cb({});
  enter(); assert.equal(visibleBars(), 0, 'replaying without removing the cassette does not replenish bars'); leave();
  h.state.position = { ...rooms.RADIO }; h.game.focus(); h.press(h.windowHandlers, h.event('Enter', 'Enter', h.game));
  assert.equal(h.state.tapes.loaded, null); assert.equal(h.state.tapes.carrying, returnTrack.id); assert(!h.game.innerHTML.includes('data-room-target="choco-door"'));
  h.press(h.windowHandlers, h.event('Enter', 'Enter', h.game)); assert.equal(h.state.tapes.loaded, returnTrack.id);
  assert(h.game.innerHTML.includes('data-room-target="choco-door"')); enter(); assert.equal(visibleBars(), 5); assert.equal(h.state.chocolate.run.collected.length, 0);
} finally { content.TRACKS.splice(content.TRACKS.indexOf(returnTrack), 1); }
console.log('PASS: returning from the maze keeps the speaker doorway open, collected bars and 0/5–5/5 counts persist across visits and replay, pause preserves the doorway, song end closes it, and physically ejecting/reinserting the cassette alone restores all five bars.');

const friendsTrack = content.TRACKS.find(track => track.id === 'freundschaft'), previousFriendsSrc = friendsTrack.src;
try {
  friendsTrack.src = 'uploads/beste-freunde.mp3';
  const h = await harness(false, 'cat'); h.enterRoom('radio'); h.state.tapes.loaded = friendsTrack.id; h.loadRecording(); h.game.focus(); let clock = 0;
  const step = () => h.frame(++clock * 16);
  assert.equal(h.state.friends.phase, 'meeting'); assert(!h.state.friendsExit);
  assert(h.get('#friends-room').innerHTML.includes('friend-dog'));
  const meetingLimit = clock + 1500; while (!h.modal.open && clock < meetingLimit) step();
  assert.equal(h.state.modal, 'friends-choice'); assert(h.modalContent.innerHTML.includes('FANGENSPIELEN'));
  new h.Element('catch', 'button', {friendsMode:'catch'}).click();
  assert(h.state.friendsExit); assert.equal(h.state.friends.phase, 'leaving');
  assert.equal(h.state.friends.actors.length, 3); assert(!h.state.friends.actors.some(actor => actor.id === h.state.animal));
  const exitLimit = clock + 700;
  while (h.state.scene === 'radio' && clock < exitLimit) step();
  assert.equal(h.state.scene, 'world'); assert.equal(h.state.friendsExit, null); assert(!h.modal.open);
  assert.equal(h.state.friends.phase, 'countdown');
  const countOrigin={...h.state.position}; h.state.keys.add('ArrowRight');
  const countLimit=clock+700; while(h.state.friends.phase==='countdown' && clock<countLimit) step();
  h.state.keys.clear(); assert(Math.hypot(h.state.position.x-countOrigin.x,h.state.position.y-countOrigin.y)<4);
  assert.equal(h.state.friends.phase,'chasing'); assert(h.get('#friends-hidden').innerHTML.includes('href="#animal-dog'));
  assert.equal(h.enterRoom('wardrobe'), false); assert.equal(h.state.scene, 'world', 'Home sweet Home stays closed during tag');
  const first = h.state.friends.actors[0]; h.state.position = { x: first.position.x, y: first.position.y + 100 }; step();
  assert.equal(first.status, 'running'); const before = { ...first.position }; step(); assert(Math.hypot(first.position.x - before.x, first.position.y - before.y) > 0);
  h.state.position = { ...first.position }; step(); assert.equal(first.status, 'following'); assert.equal(h.state.friends.caught.length, 1);
  h.get('#audio').pause(); for (const cb of h.get('#audio').handlers.get('pause')) cb({});
  await h.get('#audio').play(); for (const cb of h.get('#audio').handlers.get('play')) cb({});
  assert.equal(h.state.friends.caught.length, 1, 'pause/resume does not start a new chase');
  for (const actor of h.state.friends.actors.slice(1)) { h.state.position = { ...actor.position }; step(); }
  assert.equal(h.state.friends.phase, 'celebrate'); step(); assert(h.get('#friends-confetti').innerHTML.includes('<rect'));
  const campLimit = clock + 2500;
  while (h.state.friends.phase !== 'camping' && clock < campLimit) step();
  assert.equal(h.state.friends.phase, 'camping'); assert(h.state.friends.unlocked); assert(JSON.parse(h.stored.get('bbt-friends-world')).tent);
  assert(h.get('#friends-world').innerHTML.includes('id="friend-tent"')); assert(!h.get('#friend-fire-flame').attrs.has('hidden')); assert(h.game.classList.contains('is-camping'));
  assert(Math.hypot(h.state.position.x - friends.FRIEND_CAMP_PLAYER.x, h.state.position.y - friends.FRIEND_CAMP_PLAYER.y) < 10, 'the player walks to the water with the friends');
  h.state.keys.add('ArrowRight'); const leaveLimit = clock + 160;
  while (h.state.friends.phase === 'camping' && clock < leaveLimit) step(); h.state.keys.clear();
  assert.equal(h.state.friends.phase, 'returning'); assert(h.get('#friend-fire-flame').attrs.has('hidden')); assert(!h.game.classList.contains('is-camping'));
  const homeLimit = clock + 2000; while (h.state.friends.phase !== 'idle' && clock < homeLimit) step();
  assert.equal(h.state.friends.phase, 'idle'); assert(h.state.friends.unlocked); assert.equal(friends.friendsAway(h.state.friends).length, 0);
  h.enterRoom('wardrobe'); assert.equal((h.game.innerHTML.match(/id="home-animal-/g) || []).length, 3); h.leaveRoom();
  h.get('#audio').ended = true; h.get('#audio').paused = true; for (const cb of h.get('#audio').handlers.get('ended')) cb({});
  await h.get('#audio').play(); for (const cb of h.get('#audio').handlers.get('play')) cb({});
  assert.equal(h.state.friends.phase, 'idle'); assert(h.state.friendsRestartPending); h.enterRoom('radio');
  assert.equal(h.state.friends.phase, 'meeting'); assert.equal(h.state.friends.caught.length, 0); assert(h.state.friends.unlocked);
} finally { friendsTrack.src = previousFriendsSrc; }
console.log('PASS: Beste Freunde shows the invitation, walks the player out through the Music House exit, hides the three other animals behind trees, reveals and catches by touch, preserves a paused chase, shows confetti, walks everyone to the water, builds and saves the tent, lights the fire, sends friends home when walking away and starts a new chase on replay.');

for (const [key, code, preview] of [['Enter', 'Enter', false], [' ', 'Space', false], ['Enter', 'NumpadEnter', true]]) {
  const h = await harness(preview, 'dog', null, false, null, null, { tent: true }); h.game.focus(); let clock = 0;
  assert(h.state.friends.unlocked); assert.equal(h.state.friends.phase, 'idle'); assert(h.get('#friends-world').innerHTML.includes('data-friends-tent'));
  h.state.position = { x: friends.FRIEND_TENT.x, y: friends.FRIEND_TENT.y - 75 };
  assert.equal(h.currentInteraction()?.kind, 'friends-camp');
  h.press(h.windowHandlers, h.event(key, code, h.game, true)); assert.equal(h.state.friends.phase, 'idle');
  h.press(h.windowHandlers, h.event(key, code, h.game)); assert.equal(h.state.friends.phase, 'gathering');
  for (const actor of h.state.friends.actors) assert.deepEqual({ ...actor.position }, { ...core.HOUSE_DOORS.find(door => door.id === 'wardrobe').outside });
  const deadline = clock + 1800; while (h.state.friends.phase !== 'camping' && clock < deadline) h.frame(++clock * 16);
  assert.equal(h.state.friends.phase, 'camping'); assert(!h.get('#friend-fire-flame').attrs.has('hidden'));
  h.press(h.windowHandlers, h.event(key, code, h.game)); assert.equal(h.state.friends.phase, 'camping', 'confirmation at a burning camp does not duplicate or reset guests');
  h.enterRoom('wardrobe'); h.frame(++clock * 16); assert.equal(h.state.friends.phase, 'returning');
  assert.equal((h.game.innerHTML.match(/id="home-animal-/g) || []).length, 0);
  const homeLimit = clock + 1800; while (h.state.friends.phase !== 'idle' && clock < homeLimit) h.frame(++clock * 16);
  assert.equal(h.state.friends.phase, 'idle'); assert.equal((h.game.innerHTML.match(/id="home-animal-/g) || []).length, 3);
  assert(h.state.friends.unlocked); h.leaveRoom(); assert(h.get('#friends-world').innerHTML.includes('id="friend-tent"'));
}
console.log('PASS: a saved tent works with Enter, Space and Numpad Enter, calls exactly three friends out of Home sweet Home, lights a shared fire after their walk, ignores held or repeated invitations, and restores the home animals after the player leaves.');

const beforeCampSrc = friendsTrack.src;
try {
  friendsTrack.src = 'uploads/beste-freunde.mp3';
  for (const [key, code] of [['Enter', 'Enter'], [' ', 'Space'], ['Enter', 'NumpadEnter']]) {
    const h = await harness(false, 'dog', null, false, null, null, { tent: true }); h.game.focus();
    h.state.position = { x: friends.FRIEND_TENT.x, y: friends.FRIEND_TENT.y - 75 };
    h.press(h.windowHandlers, h.event(key, code, h.game));
    const camp = h.get('#camp-audio');
    assert.equal(camp.src, friendsTrack.src); assert.equal(camp.paused, false); assert(camp.loop); assert(h.get('#audio').paused);
    assert.equal(h.state.friends.phase, 'gathering', 'camp music does not restart tag');
    camp.currentTime = 12; h.press(h.windowHandlers, h.event(key, code, h.game, true)); assert.equal(camp.currentTime, 12);
    h.state.viewport = { w: 390, h: 700 };
    let clock = 16; h.frame(clock);
    while (h.state.friends.phase !== 'camping' && clock < 30000) {
      h.frame(clock += 16);
      const [x, y, w, height] = h.get('#world-svg').getAttribute('viewBox').split(' ').map(Number);
      for (const position of [h.state.position, ...h.state.friends.actors.map(actor => actor.position)]) {
        assert(position.x - 34 >= x - .02 && position.x + 34 <= x + w + .02);
        assert(position.y - 77 >= y - .02 && position.y + 12 <= y + height + .02, 'the complete group stays in view on each walking frame');
      }
    }
    assert.equal(h.state.friends.phase, 'camping');
    h.state.position = { x: 1100, y: 750 }; h.frame(clock += 16);
    assert.equal(h.state.friends.phase, 'returning'); assert.equal(h.state.campMusic.fadeRemaining, 5);
    h.frame(clock += 2500); assert(Math.abs(camp.volume - .3) < 1e-9); assert(!camp.paused);
    h.state.volume = .8; h.frame(clock); assert(Math.abs(camp.volume - .4) < 1e-9, 'the fade respects the volume control');
    h.frame(clock += 2501); assert.equal(h.state.campMusic, null); assert(camp.paused); assert.equal(camp.loop, false);
  }
  const h = await harness(false, 'cat', null, false, null, null, { tent: true });
  h.state.position = { x: friends.FRIEND_TENT.x, y: friends.FRIEND_TENT.y - 75 }; h.game.focus();
  h.press(h.windowHandlers, h.event('Enter', 'Enter', h.game)); assert(!h.get('#camp-audio').paused);
  h.state.tapes.loaded = friendsTrack.id; h.loadRecording();
  assert(h.get('#camp-audio').paused); assert.equal(h.state.campMusic, null); assert(h.state.friendsRestartPending); h.enterRoom('radio'); assert.equal(h.state.friends.phase, 'meeting', 'the invitation begins inside the music house');
} finally { friendsTrack.src = beforeCampSrc; }
console.log('PASS: Enter, Space and Numpad Enter invite camp friends with Beste Freunde without restarting tag; the whole group stays on screen, leaving fades the music over five seconds and a chosen cassette stops camp music.');

{
  const h = await harness(false, 'cat'); let clock = 16;
  for (const position of [core.WORLD_SPAWN, { x: 960, y: 1020 }]) {
    h.state.position = { ...position };
    for (let frame = 0; frame < 180; frame++) h.frame(clock += 16);
    const [, y, , height] = h.get('#world-svg').getAttribute('viewBox').split(' ').map(Number);
    assert(Math.abs(y + height / 2 - (h.state.position.y - core.WORLD.cameraOffsetY)) < .02, 'the animal body is centered even beside the lower shoreline');
  }
  assert(h.game.innerHTML.includes('V11100H' + core.WORLD.left + 'Z'), 'the water continues beneath the camera without an empty edge');
}
console.log('PASS: the outdoor camera centers the controlled animal at the start and beside the lower shoreline.');

const assertClose = (actual, expected, message) => assert(Math.abs(actual - expected) < 1e-9, message || actual + ' is close to ' + expected);
const fadingTrack = { id: 'schokolade', title: 'Schokolade', src: 'uploads/schokolade.mp3', color: '#ff87ce', image: 'assets/hut.png' };
const preFadeTanzen = content.TRACKS[1].src; content.TRACKS[1].src = 'uploads/tanzen.mp3'; content.TRACKS.push(fadingTrack);
try {
  for (const mode of ['empty', 'other', 'schokolade']) {
    const h = await harness(false, 'cat', null, false, null, { unlocked: true });
    if (mode !== 'empty') { h.state.tapes.loaded = mode === 'other' ? 'tanzen' : fadingTrack.id; h.loadRecording(); }
    h.enterRoom('wardrobe'); h.state.position = { ...chocolate.CHOCOLATE_DRAWER }; h.game.focus();
    h.press(h.windowHandlers, h.event('Enter', 'Enter', h.game)); h.press(h.windowHandlers, h.event('Enter', 'Enter', h.game));
    h.leaveRoom(); h.state.position = { x: 650, y: 650 }; h.frame(16);
    assertClose(h.get('#audio').volume, .6); assertClose(chocolate.chocolateSpeed(h.state.chocolate), 2);
    h.frame(15666); assertClose(h.state.chocolate.boost, 4); assertClose(h.get('#audio').volume, .6);
    h.frame(17666); assertClose(h.state.chocolate.boost, 2); assertClose(h.get('#audio').volume, .3); assertClose(chocolate.chocolateSpeed(h.state.chocolate), 1.5);
    const volume = new h.Element('volume', 'input'); volume.id = 'volume'; volume.value = '.8';
    for (const cb of h.documentHandlers.get('input') || []) cb({ target: volume });
    assertClose(h.get('#audio').volume, .4, 'the fade follows the selected master volume');
    h.showPanel('panda'); assertClose(h.get('#audio').volume, .4, 'closing or opening a biography does not reset the fade'); h.closePanel(); h.game.focus();
    h.state.keys.add('ArrowRight'); const x = h.state.position.x; h.frame(17682); h.state.keys.clear();
    const travelled = h.state.position.x - x; assert(travelled > core.WORLD.speed * .016 && travelled < core.WORLD.speed * .016 * 2);
    h.frame(19667); assertClose(h.state.chocolate.boost, 0); assertClose(chocolate.chocolateSpeed(h.state.chocolate), 1);
    if (mode === 'other') { assert.equal(h.get('#audio').src, 'uploads/tanzen.mp3'); assert(!h.get('#audio').paused); assertClose(h.get('#audio').volume, .8); }
    else assert(h.get('#audio').paused, 'Schokolade ends quietly after the boost, including when its cassette was already playing');
  }
} finally { content.TRACKS.splice(content.TRACKS.indexOf(fadingTrack), 1); content.TRACKS[1].src = preFadeTanzen; }
console.log('PASS: the boost keeps full speed and volume for 15.65 seconds, fades volume and walking smoothly for the final four seconds, follows volume controls, ends at normal speed and silence, and restores a different previously playing cassette.');

const uncutFriendsSrc = friendsTrack.src;
try {
  friendsTrack.src = 'uploads/beste-freunde.mp3';
  const h = await harness(false, 'cat', null, false, null, null, { tent: true });
  h.state.tapes.loaded = friendsTrack.id; h.loadRecording();
  friends.releaseFriends(h.state.friends);
  h.state.position = { x: friends.FRIEND_TENT.x, y: friends.FRIEND_TENT.y - 75 }; h.game.focus();
  const radio = h.get('#audio'); radio.currentTime = 37;
  h.press(h.windowHandlers, h.event('Enter', 'Enter', h.game));
  assert.equal(h.state.friends.phase, 'gathering');
  assert.equal(h.state.campMusic, null, 'a playing Beste Freunde cassette is not replaced by camp music');
  assert.equal(radio.currentTime, 37); assert(!radio.paused); assert(h.get('#camp-audio').paused);
  h.frame(16); h.state.position = { x: 1100, y: 750 }; h.frame(32);
  assert.equal(h.state.friends.phase, 'returning'); assert.equal(h.state.campMusic, null);
  h.frame(6032);
  assert(!radio.paused); assert.equal(radio.volume, .6, 'leaving the camp never fades or pauses the playing cassette');
  assert.equal(radio.currentTime, 37, 'the cassette is not restarted or repositioned');
} finally { friendsTrack.src = uncutFriendsSrc; }
console.log('PASS: the playing Beste Freunde cassette stays at full volume and at its current position when inviting camp friends and when walking away.');

for (const [key, code] of [['Enter', 'Enter'], [' ', 'Space'], ['Enter', 'NumpadEnter']]) {
  const h = await harness(false, 'cat'); h.game.focus(); let clock = 16;
  h.state.position = { x: 1375, y: 867 }; h.frame(clock);
  assert.equal(h.state.scene, 'world', 'standing in front of the mailbox never enters automatically');
  assert(!h.game.innerHTML.includes('data-social='), 'contact symbols are absent outdoors');
  h.press(h.windowHandlers, h.event(key, code, h.game, true)); assert.equal(h.state.scene, 'world');
  h.press(h.windowHandlers, h.event(key, code, h.game)); assert.equal(h.state.scene, 'social');
  assert.equal((h.game.innerHTML.match(/data-social=/g)||[]).length, 5);
  assert(!h.modal.open);
  for (const link of social.socialPads('social').filter(link => link.id !== 'email')) {
    h.state.position = { x: link.x, y: link.y };
    h.press(h.windowHandlers, h.event(key, code, h.game));
    assert.equal(h.opened.at(-1)[0], link.url);
  }
  h.state.position = { ...social.socialPads('social').find(link => link.id === 'email') };
  h.press(h.windowHandlers, h.event(key, code, h.game)); assert.equal(h.state.modal, 'letter');
  assert(h.renderPanel('letter').includes(content.CONTACT.email)); h.closePanel();
  h.state.position = { x: 800, y: 960 }; h.state.keys.add('ArrowDown');
  while(h.state.scene === 'social' && clock < 2000) h.frame(clock += 16);
  h.state.keys.clear(); assert.equal(h.state.scene, 'world'); assert(!h.modal.open);
  assert.equal(h.state.position.x, 1375); assert.equal(h.state.position.y, 905);
}
console.log('PASS: the mailbox requires a fresh Enter/Space/Numpad press, contains five working contact symbols and a letter, and has a visible automatic walking exit.');

{
  const h = await harness(false, 'cat');
  h.state.adventure = adventure.createAdventure(1200, 700); h.state.adventure.phase = 'ready';
  h.showPanel('space-launch');
  const choices = ['leicht', 'mittel', 'profi'].map(difficulty => new h.Element(difficulty, 'button', { difficulty }));
  choices.push(new h.Element('land', 'button', { action: 'space-land' }));
  const originalQuery = h.modalContent.querySelectorAll;
  h.modalContent.querySelectorAll = () => choices;
  choices[0].focus();
  for (let i = 1; i < 4; i++) {
    h.press(h.modalContent.handlers, h.event('ArrowDown', 'ArrowDown', choices[i - 1]));
    assert.equal(h.doc.activeElement, choices[i]);
  }
  h.press(h.modalContent.handlers, h.event('ArrowUp', 'ArrowUp', choices[3]));
  assert.equal(h.doc.activeElement, choices[2]);
  assert.equal(h.state.adventure.phase, 'ready', 'arrow navigation does not launch before confirmation');
  h.press(h.documentHandlers, h.event(' ', 'Space', choices[2]));
  assert.equal(h.state.adventure.phase, 'playing'); assert.equal(h.state.adventure.difficulty, 'profi');
  h.modalContent.querySelectorAll = originalQuery;
}
{
  const h = await harness(false, 'cat'); let clock = 16;
  h.state.position = { ...h.state.rocket.position }; h.game.focus();
  h.press(h.windowHandlers, h.event('Enter', 'Enter', h.game));
  h.state.keys.add('ArrowUp'); h.frame(clock);
  while (!h.state.adventure && clock < 10000) {
    const wasDark = sky.spaceViewIsDark(h.state.camera, h.state.viewport);
    h.frame(clock += 16);
    if (h.state.adventure) assert(wasDark, 'the entire previous outdoor view is already dark before space begins');
  }
  assert(h.state.adventure); assert(clock >= 6400 && clock <= 7100, 'the smooth transition keeps the six-to-seven-second climb');
}
console.log('PASS: the flight choices navigate vertically with Up/Down and launch only on confirmation; the space transition waits for a fully dark view.');

{
  const h = await harness(false, 'cat');
  friends.startFriends(h.state.friends, content.ANIMALS, h.state.animal, h.state.position);
  h.game.focus();
  for (const id of ['radio', 'concerts', 'wardrobe', 'social']) {
    assert.equal(h.enterRoom(id), false); assert.equal(h.state.scene, 'world');
  }
  for (const door of core.HOUSE_DOORS) {
    h.state.position = { x: door.x, y: (door.top + door.bottom) / 2 };
    h.checkWorldTouch(); assert.equal(h.state.scene, 'world', 'automatic doors stay closed during tag');
  }
  h.state.position = { x: 1375, y: 867 };
  for (const [key, code] of [['Enter', 'Enter'], [' ', 'Space']]) {
    h.press(h.windowHandlers, h.event(key, code, h.game)); assert.equal(h.state.scene, 'world', 'confirmation cannot enter the mailbox during tag');
  }
  for (const phase of ['celebrate', 'to-camp', 'building']) {
    h.state.friends.phase = phase; assert.equal(h.enterRoom('radio'), false);
  }
  h.state.friends.phase = 'camping'; assert(h.enterRoom('social')); assert.equal(h.state.scene, 'social');
}
console.log('PASS: every building and the mailbox stay closed throughout tag and the group walk; normal entry returns at the campfire.');

const savedCycleTrack=content.TRACKS.find(track=>track.id==='fahrradfahren').src;
content.TRACKS.find(track=>track.id==='fahrradfahren').src='uploads/cycling.mp3';
for (const [key, code, level] of [['Enter','Enter','leicht'], [' ','Space','mittel'], ['Enter','NumpadEnter','schwer']]) {
  const h=await harness(false,'cat');
  h.enterRoom('radio');h.state.tapes.carrying='fahrradfahren';h.state.position={...rooms.RADIO};h.game.focus();
  h.press(h.windowHandlers,h.event(key,code,h.game));
  assert.equal(h.state.tapes.loaded,'fahrradfahren');assert(h.state.bikeDoor);
  assert(h.game.innerHTML.includes('data-room-target="bike-door"'));assert(h.game.innerHTML.includes('Wettrennen'));
  h.state.position={...bike.BIKE_DOOR};h.frame(1000);
  assert.equal(h.state.modal,'bike-launch');assert(h.state.race && h.modal.open);
  for(const choice of ['leicht','mittel','schwer'])assert(h.modalContent.innerHTML.includes('data-bike-level="'+choice+'"'));assert(!h.modalContent.innerHTML.includes('data-character'));
  const start=new h.Element('start','button',{bikeLevel:level});
  h.press(h.documentHandlers,h.event(key,code,start));
  assert.equal(h.state.race.phase,'racing');assert.equal(h.state.race.difficulty,level);assert.equal(h.state.race.player.id,'cat');assert(!h.modal.open);
  assert(h.state.race.riders.slice(1).every(friend=>!friend.active));assert.equal(h.get('#bike-friends').textContent,'0 / 3');
  for(const friend of h.state.race.riders.slice(1))assert.equal(h.get('#bike-rider-'+friend.id).getAttribute('hidden'),'');
  assert.equal(h.get('#audio').volume,0);assert(h.state.bikeMusic);assert.equal(h.get('#bike-audio').src,'uploads/cycling.mp3');
  h.game.focus();h.press(h.windowHandlers,h.event('ArrowUp','ArrowUp',h.game));
  assert.equal(h.state.race.player.lane,1);
  h.press(h.windowHandlers,h.event('ArrowUp','ArrowUp',h.game,true));assert.equal(h.state.race.player.lane,1,'holding an arrow changes only one lane');
  h.press(h.windowHandlers,h.event('ArrowDown','ArrowDown',h.game));assert.equal(h.state.race.player.lane,2);
  h.press(h.windowHandlers,h.event('ArrowRight','ArrowRight',h.game));h.frame(1100);assert(h.state.race.player.speed>0);
  h.state.keys.clear();h.press(h.windowHandlers,h.event('ArrowLeft','ArrowLeft',h.game));h.frame(1200);assert.equal(h.state.race.player.speed,0);
  h.state.keys.clear();h.press(h.windowHandlers,h.event('Escape','Escape',h.game));
  assert.equal(h.state.modal,'bike-pause');const clock=h.state.race.elapsed;h.frame(2200);assert.equal(h.state.race.elapsed,clock);
  new h.Element('continue','button',{action:'bike-continue'}).click();assert(!h.modal.open);
  new h.Element('exit','button',{action:'bike-exit'}).click();
  assert.equal(h.state.race,null);assert.equal(h.state.scene,'radio');assert.deepEqual({...h.state.position},bike.BIKE_RETURN);
  assert.equal(h.state.bikeMusic,null);assert.equal(h.get('#audio').volume,h.state.volume);
  h.state.position={...rooms.RADIO};h.press(h.windowHandlers,h.event(key,code,h.game));
  assert.equal(h.state.tapes.loaded,null);assert(!h.state.bikeDoor);assert(!h.game.innerHTML.includes('data-room-target="bike-door"'));
}
console.log('PASS: race cassette door, all three difficulty choices with the current animal, acceleration/braking/four lanes, no repeated lane changes, pause/continue and exit/ejection work with Enter and Space.');
for (const [id,level] of [['cat','leicht'],['dog','mittel'],['horse','schwer'],['monkey','leicht']]) {
  const h=await harness(false,id,null,false,{phase:'unlocked',wearing:true});
  h.enterRoom('radio');h.state.tapes.loaded='fahrradfahren';h.loadRecording();h.state.position={...bike.BIKE_DOOR};h.frame(1000);
  new h.Element('start','button',{bikeLevel:level}).click();
  assert.equal(h.state.race.player.id,id);assert(h.game.innerHTML.includes('href="#dressed-'+id+'-right"'));
  assert.equal(new Set(h.state.race.riders.map(r=>r.id)).size,4);assert(!h.modalContent.innerHTML.includes('data-character'));
  h.state.race.player.x=bike.BIKE_FINISH-.5;h.state.race.player.speed=320;h.state.race.elapsed=41.2;h.state.race.stones=[];
  h.frame(1020);assert.equal(h.state.modal,'bike-win');assert(!h.modalContent.innerHTML.includes('gewonnenes Fahrrad'));
  h.get('#bike-racer-name').value='<Rad & Pferd>';new h.Element('save','button',{action:'bike-save'}).click();
  assert.equal(h.state.bikeScores[level].length,1);assert(h.state.race.saved);assert(h.modalContent.innerHTML.includes('&lt;Rad &amp; Pferd&gt;'));
  new h.Element('duplicate','button',{action:'bike-save'}).click();assert.equal(h.state.bikeScores[level].length,1);
  assert.equal(JSON.parse(h.stored.get('bbt-bike-tour-scores-world'))[level][0].name,'<Rad & Pferd>');
  new h.Element('again','button',{bikeLevel:level}).click();assert.equal(h.state.race.phase,'racing');assert.equal(h.state.race.difficulty,level);assert.equal(h.state.race.player.id,id);assert(!h.modal.open);
  new h.Element('exit','button',{action:'bike-exit'}).click();h.leaveRoom();
  assert(!h.game.innerHTML.includes('data-bicycle'));assert(!Object.hasOwn(h.state,'garage'));assert(!h.stored.has('bbt-bikes-world'));
}
const cycleReload=await harness(false,'monkey',null,false,null,null,null,{unlocked:['leicht','mittel','schwer']},{leicht:[{name:'Katze',time:1591}]});
assert(!cycleReload.game.innerHTML.includes('data-bicycle'));assert(!Object.hasOwn(cycleReload.state,'garage'));assert.equal(cycleReload.state.bikeScores.leicht[0].name,'Katze');
const cyclePreview=await harness(true,'dog',null,false,null,null,null,{unlocked:['mittel']},{mittel:[{name:'Hund',time:1765}]});
assert(!cyclePreview.game.innerHTML.includes('data-bicycle'));assert.equal(cyclePreview.state.bikeScores.mittel[0].name,'Hund');assert(!cyclePreview.stored.has('bbt-bike-tour-scores-world'));
content.TRACKS.find(track=>track.id==='fahrradfahren').src=savedCycleTrack;
console.log('PASS: all four current figures ride with the hat, results save once, replay is direct, legacy outdoor rewards are ignored and preview/world records stay separate.');
for (const id of ['cat','dog','horse','monkey']) {
  const h=await harness(false,id);h.game.focus();let clock=1000;h.frame(clock);
  for(const [code,view] of [['ArrowRight','right'],['ArrowLeft','left'],['ArrowUp','back'],['ArrowDown','front']]) {
    h.state.position={x:800,y:775};h.state.keys.add(code);h.frame(clock+=20);h.state.keys.clear();
    assert.equal(h.state.facing,view);assert.equal(h.get('#player-use').getAttribute('href'),hats.animalHref(id,false,view));
    h.frame(clock+=20);assert.equal(h.state.facing,view,'standing still retains the last view');
  }
  h.state.hat.phase='unlocked';h.state.hat.wearing=true;
  h.state.position={x:800,y:775};h.state.keys.add('ArrowRight');h.frame(clock+=20);h.state.keys.clear();
  assert.equal(h.get('#player-use').getAttribute('href'),'#dressed-'+id+'-right');
  h.enterRoom('concerts');h.state.position={x:800,y:700};h.game.focus();h.state.keys.add('ArrowUp');h.frame(clock+=20);h.state.keys.clear();
  assert.equal(h.get('#player-use').getAttribute('href'),'#dressed-'+id+'-back');
  h.state.position={x:800,y:775};h.state.keys.add('ArrowDown');h.frame(clock+=20);h.state.keys.clear();
  assert.equal(h.get('#player-use').getAttribute('href'),'#dressed-'+id);
}
console.log('PASS: all four animals show right/left/back/front while walking, remember their view when stopped, and keep the hat in rooms and outdoors.');
content.TRACKS.find(track=>track.id==='fahrradfahren').src='uploads/cycling.mp3';
const levelNav=await harness(false,'horse');
levelNav.enterRoom('radio');levelNav.state.tapes.loaded='fahrradfahren';levelNav.loadRecording();levelNav.state.position={...bike.BIKE_DOOR};levelNav.frame(1000);
const levelButtons=['leicht','mittel','schwer'].map(level=>new levelNav.Element(level,'button',{bikeLevel:level}));
const levelExit=new levelNav.Element('exit','button',{action:'bike-exit'});
levelNav.modalContent.querySelectorAll=()=>[...levelButtons,levelExit];levelButtons[0].focus();
levelNav.press(levelNav.modalContent.handlers,levelNav.event('ArrowDown','ArrowDown',levelButtons[0]));assert.equal(levelNav.doc.activeElement,levelButtons[1]);
levelNav.press(levelNav.modalContent.handlers,levelNav.event('ArrowDown','ArrowDown',levelButtons[1]));assert.equal(levelNav.doc.activeElement,levelButtons[2]);
levelNav.press(levelNav.documentHandlers,levelNav.event(' ','Space',levelButtons[2]));assert.equal(levelNav.state.race.difficulty,'schwer');assert(!levelNav.modal.open);
const sameRace=levelNav.state.race;levelNav.press(levelNav.documentHandlers,levelNav.event(' ','Space',levelButtons[2],true));assert.equal(levelNav.state.race,sameRace);
levelNav.state.race.stones=[];levelNav.state.race.ramps=[];levelNav.state.race.player.speed=544;
levelNav.frame(1020);assert.equal(levelNav.get('#bike-speed').textContent,'30 km/h');
levelNav.state.race.player.x=bike.BIKE_FINISH-.5;levelNav.frame(1040);assert.equal(levelNav.state.modal,'bike-win');assert(!/Platz\s+[1-4]\s*\/\s*4/.test(levelNav.modalContent.innerHTML));assert(!levelNav.modalContent.innerHTML.includes('{platz}'));assert(levelNav.modalContent.innerHTML.includes('Bestenliste · Schwer'));
const resultMenu=levelNav.modalContent.innerHTML.match(/<div class="difficulty-options"[^>]*>([\s\S]*?)<\/div>/)[1];
assert.deepEqual([...resultMenu.matchAll(/data-bike-level="([^"]+)"|data-action="([^"]+)"/g)].map(m=>m[1]||m[2]),['leicht','mittel','schwer','bike-world']);
assert(resultMenu.includes('Zurück zur BumBumWelt'));assert(!levelNav.modalContent.innerHTML.includes('data-action="bike-again"'));assert(!levelNav.modalContent.innerHTML.includes('data-action="bike-levels"'));
assert.equal(levelNav.doc.activeElement.name,'#modal-content [data-bike-level="leicht"]','finish focuses the first difficulty instead of the score form');
new levelNav.Element('easy','button',{bikeLevel:'leicht'}).click();assert.equal(levelNav.state.race.difficulty,'leicht');
levelNav.state.race.stones=[];levelNav.state.race.ramps=[];levelNav.state.race.player.speed=320;levelNav.frame(1060);assert.equal(levelNav.get('#bike-speed').textContent,'15 km/h');
levelNav.state.race.player.x=900;levelNav.frame(1080);assert(levelNav.state.race.riders[1].active);assert.equal(levelNav.get('#bike-rider-'+levelNav.state.race.riders[1].id).getAttribute('hidden'),null);
assert.equal(levelNav.get('#bike-rider-'+levelNav.state.race.riders[2].id).getAttribute('hidden'),'');
levelNav.state.race.player.x=8100;levelNav.frame(1100);assert(levelNav.state.race.riders[2].active);assert.equal(levelNav.get('#bike-rider-'+levelNav.state.race.riders[2].id).getAttribute('hidden'),null);
new levelNav.Element('leave','button',{action:'bike-exit'}).click();assert.equal(levelNav.state.scene,'radio');assert.equal(levelNav.state.race,null);
console.log('PASS: difficulty choices work vertically with arrows and Space, repeated confirmation is ignored, all difficulty speed caps and separate encounter visibility update in the actual HUD, and finishing allows a different level without switching character.');

for(const [key,code]of [['Enter','Enter'],[' ','Space'],['Enter','NumpadEnter']]){
 const h=await harness(false,'dog');h.enterRoom('radio');const outside={...h.state.returnPosition};
 h.state.tapes.loaded='fahrradfahren';h.loadRecording();h.state.position={...bike.BIKE_DOOR};h.frame(1000);
 new h.Element('start','button',{bikeLevel:'leicht'}).click();h.state.race.stones=[];h.state.race.player.x=bike.BIKE_FINISH-.5;h.state.race.player.speed=320;h.frame(1020);
 assert.equal(h.state.modal,'bike-win');
 const levels=['leicht','mittel','schwer'].map(bikeLevel=>new h.Element(bikeLevel,'button',{bikeLevel}));
 const back=new h.Element('world','button',{action:'bike-world'}),name=new h.Element('name','input'),save=new h.Element('save','button',{action:'bike-save'});
 h.modalContent.querySelectorAll=selector=>selector.startsWith('[data-bike-level]')?[...levels,back]:[name,save,...levels,back];levels[0].focus();
 for(let i=0;i<3;i++){h.press(h.modalContent.handlers,h.event('ArrowDown','ArrowDown',h.doc.activeElement));assert.equal(h.doc.activeElement,[...levels,back][i+1]);}
 h.press(h.modalContent.handlers,h.event('ArrowDown','ArrowDown',back));assert.equal(h.doc.activeElement,levels[0],'the four-choice menu wraps without entering the score form');
 h.press(h.modalContent.handlers,h.event('ArrowUp','ArrowUp',levels[0]));assert.equal(h.doc.activeElement,back);
 h.press(h.documentHandlers,h.event(key,code,back));assert.equal(h.state.race,null);assert.equal(h.state.scene,'world');assert.deepEqual({...h.state.position},outside);
 assert(!h.modal.open);assert.equal(h.state.bikeMusic,null);assert.equal(h.get('#audio').volume,h.state.volume);assert.equal(h.state.animal,'dog');
}
console.log('PASS: finish offers exactly easy, medium, hard and return in vertical keyboard order; Enter, Space and NumpadEnter return directly to the BumBumWelt while keeping results and cassette playback.');

content.TRACKS.find(track=>track.id==='fahrradfahren').src=savedCycleTrack;

for(const id of ['cat','dog','horse','monkey']){
 const h=await harness(false,id,null,false,{phase:'unlocked',wearing:true});h.game.focus();let time=1000;h.frame(time);
 for(const [horizontal,vertical,view]of [['ArrowRight','ArrowUp','right'],['ArrowLeft','ArrowUp','left'],['ArrowRight','ArrowDown','right'],['ArrowLeft','ArrowDown','left']]){
  h.state.position={x:1050,y:850};h.state.keys.clear();h.state.keys.add(horizontal);h.state.keys.add(vertical);
  for(let i=0;i<24;i++){
   h.frame(time+=16);assert.equal(h.state.facing,view);assert.equal(h.get('#player-use').getAttribute('href'),'#dressed-'+id+'-'+view);
  }
  h.state.keys.delete(horizontal);h.frame(time+=16);assert.equal(h.state.facing,vertical==='ArrowUp'?'back':'front');h.state.keys.clear();
 }
 h.enterRoom('concerts');h.state.position={x:800,y:700};h.game.focus();h.state.keys.add('ArrowLeft');h.state.keys.add('ArrowUp');
 for(let i=0;i<20;i++){h.frame(time+=16);assert.equal(h.state.facing,'left');}
 h.state.keys.clear();h.leaveRoom();h.state.position={x:896,y:655};h.game.focus();h.state.keys.add('ArrowLeft');h.state.keys.add('ArrowUp');
 for(let i=0;i<20;i++){h.frame(time+=16);assert.equal(h.state.facing,'left','diagonal input stays sideways while sliding along the house wall');}
}
console.log('PASS: every dressed animal keeps the correct side view throughout all four keyboard diagonals in the world and rooms, and returns to front/back as soon as horizontal input is released.');

const crashSong=content.TRACKS.find(track=>track.id==='fahrradfahren'),previousCrashSong=crashSong.src;
try{
 crashSong.src='uploads/cycling.mp3';
 const h=await harness(false,'monkey');h.enterRoom('radio');h.state.tapes.loaded=crashSong.id;h.loadRecording();h.state.position={...bike.BIKE_DOOR};let time=1000;h.frame(time);
 new h.Element('easy','button',{bikeLevel:'leicht'}).click();
 const race=h.state.race;race.riders.slice(1).forEach(r=>{r.departed=true;r.active=false;});race.ramps=[];const stones=race.stones;race.stones=[];
 h.game.focus();h.press(h.windowHandlers,h.event('ArrowRight','ArrowRight',h.game));for(let i=0;i<60;i++)h.frame(time+=16);
 h.state.keys.clear();const momentum=race.player.speed;
 for(let i=0;i<60;i++){h.frame(time+=16);assert.equal(race.player.speed,momentum,'releasing the key preserves exact velocity');}
 race.stones=stones;race.player.x=760;race.player.y=333;race.player.lane=0;race.player.speed=180;h.frame(time+=20);
 assert(race.player.fall>0);assert.equal(race.player.speed,0);h.frame(time+=250);
 const machine=h.get('#bike-machine-monkey').getAttribute('transform'),body=h.get('#bike-body-monkey').getAttribute('transform');
 assert.notEqual(machine,body);assert(/^translate\(-/.test(body));assert(!/^translate\(-/.test(machine));
 const frozen=JSON.stringify({fall:race.player.fall,machine,body});h.press(h.windowHandlers,h.event('Escape','Escape',h.game));h.frame(time+=500);
 assert.equal(JSON.stringify({fall:race.player.fall,machine:h.get('#bike-machine-monkey').getAttribute('transform'),body:h.get('#bike-body-monkey').getAttribute('transform')}),frozen);
 new h.Element('continue','button',{action:'bike-continue'}).click();
 for(let i=0;i<190;i++)h.frame(time+=16);assert.equal(race.player.fall,0);assert.equal(h.get('#bike-machine-monkey').getAttribute('transform'),'translate(0 0)');assert.equal(race.player.speed,0);
 h.game.focus();h.press(h.windowHandlers,h.event('ArrowRight','ArrowRight',h.game));h.frame(time+=16);assert(race.player.speed>0);
}finally{crashSong.src=previousCrashSong;}
console.log('PASS: actual race input keeps its speed on release, animates separate rolling figure/bicycle groups, freezes the crash on pause, remounts after three seconds and accelerates again.');

{
 const h=await harness(false,'cat');h.state.position={...h.state.rocket.position};h.game.focus();h.press(h.windowHandlers,h.event('Enter','Enter',h.game));h.state.keys.add('ArrowUp');let time=0;
 while(!h.state.adventure && time<10000)h.frame(time+=16);
 assert(h.state.adventure?.departure);const original=h.game.innerHTML,viewBox=h.get('#world-svg').getAttribute('viewBox');
 const origin={...h.state.adventure.departure};h.game.getBoundingClientRect=()=>({width:600,height:350,left:0,top:0});
 h.get('#world-svg').getScreenCTM=()=>({a:.5,b:0,c:0,d:.5,e:0,f:175-origin.y*.5});
 h.resize();assert.equal(h.game.innerHTML,original);assert.equal(h.get('#world-svg').getAttribute('viewBox'),viewBox);assert.equal(h.state.adventure.entry.scale,.5);
 assert.equal(h.state.adventure.angle,0);assert.equal(h.state.adventure.width,600);
 while(h.state.adventure.phase==='intro')h.frame(time+=16);
 assert.equal(h.state.modal,'space-launch');assert.equal(h.get('#world-svg').getAttribute('viewBox'),'0 0 600 350');assert.equal(h.state.adventure.angle,90);
 assert(h.game.innerHTML.includes('id="bum-planet-crop"'));assert(h.game.innerHTML.includes('id="adventure-course" opacity="1"'));
}
console.log('PASS: resizing during the vertical departure preserves the old space background and upright rocket until one cut to the resized horizontal starting scene.');

function thumbEvent(h,type,clientX,clientY,pointerId=1,pointerType='touch') {
 const pad=h.get('#thumb-pad'),event={clientX,clientY,pointerId,pointerType,button:0,target:pad,prevented:false,preventDefault(){this.prevented=true;}};
 for(const callback of pad.handlers.get(type)||[])callback(event);return event;
}
function startThumb(h,dx=0,dy=0,pointerId=1,pointerType='touch') {
 const rect=h.game.getBoundingClientRect(),x=(rect.left||0)+56,y=(rect.top||0)+rect.height-60;
 const event=thumbEvent(h,'pointerdown',x,y,pointerId,pointerType);
 if(dx||dy)thumbEvent(h,'pointermove',x+dx,y+dy,pointerId,pointerType);return event;
}
function moveThumb(h,dx,dy,pointerId=1) { const origin=h.state.touch.origin;return thumbEvent(h,'pointermove',origin.x+dx,origin.y+dy,pointerId); }
function releaseThumb(h,type='pointerup',pointerId=1) { return thumbEvent(h,type,0,0,pointerId); }
function tapAction(h) { for(const callback of h.get('#interact').handlers.get('click')||[])callback({target:h.get('#interact')}); }
for(const [width,height,scale]of [[390,700,.55],[1024,768,.9],[844,390,.7]]){
 const h=await harness(false,'cat',null,false,null,null,null,null,null,true);let time=1000;
 h.state.position={x:1050,y:850};h.game.getBoundingClientRect=()=>({width,height,left:8,top:64});
 h.get('#world-svg').getScreenCTM=()=>({a:scale,b:0,c:0,d:scale,e:8+width/2-1050*scale,f:64+height/2-814*scale});h.frame(time);
 assert(h.state.touchMode && h.doc.body.classList.contains('touch-controls'));assert(h.get('#game-instructions').textContent.includes('Daumen'));
 for(const cb of h.game.handlers.get('pointerdown')||[])cb({pointerType:'touch',clientX:250,clientY:200});
 assert.equal(h.state.touch,null,'touching the scenery cannot start movement');
 const before={...h.state.position},down=startThumb(h);assert(down.prevented);assert(h.get('#thumb-pad').hasPointerCapture(1));h.frame(time+=16);assert.deepEqual({...h.state.position},before,'resting the thumb is neutral');
 moveThumb(h,4,0);h.frame(time+=16);assert.deepEqual({...h.state.position},before,'small thumb tremors stay in the neutral zone');moveThumb(h,12,0);for(let i=0;i<5;i++)h.frame(time+=16);assert(h.state.position.x>before.x);assert.equal(h.state.position.y,before.y);assert.equal(h.state.facing,'right');
 startThumb(h,-8,0,2);releaseThumb(h,'pointerup',2);assert.equal(h.state.touch.id,1,'a second finger cannot steal the platform');
 moveThumb(h,-8,-8);const turned={...h.state.position};h.frame(time+=16);assert(h.state.position.x<turned.x && h.state.position.y<turned.y);assert.equal(h.state.facing,'left');
 releaseThumb(h);const stopped={...h.state.position};assert.equal(h.state.touch,null);assert(!h.get('#thumb-pad').hasPointerCapture(1));assert(!h.get('#thumb-pad').classList.contains('is-held'));assert.equal(h.get('#thumb-knob').style.transform,'translate(0px, 0px)');
 for(const cb of h.game.handlers.get('click')||[])cb({pointerType:'touch',target:h.game,clientX:250,clientY:200});for(let i=0;i<12;i++)h.frame(time+=16);assert.deepEqual({...h.state.position},stopped);assert.equal(h.state.path.length,0);
 for(const interruption of ['pointercancel','lostpointercapture','blur','orientationchange','visibilitychange','menu']){
  startThumb(h,8,0);h.frame(time+=16);
  if(interruption==='pointercancel'||interruption==='lostpointercapture')releaseThumb(h,interruption);
  else if(interruption==='menu'){h.showPanel('help');h.closePanel();}
  else if(interruption==='visibilitychange'){h.doc.hidden=true;for(const cb of h.documentHandlers.get(interruption)||[])cb({});h.doc.hidden=false;}
  else for(const cb of h.windowHandlers.get(interruption)||[])cb({});
  const still={...h.state.position};h.frame(time+=16);assert.equal(h.state.touch,null,interruption);assert.deepEqual({...h.state.position},still,interruption+' must stop walking');
 }
}
console.log('PASS: the fixed thumb pad ignores tiny movements and works with deliberate thumb movements on phone, tablet and landscape screens, is independent of the camera, is neutral on contact, follows diagonals, ignores a second finger and stops on release, cancellation, lost capture, blur, rotation, backgrounding or menus.');

{
 const h=await harness(false,'dog');let time=1000;h.state.position={x:1050,y:850};h.frame(time);assert(!h.state.touchMode);
 startThumb(h,8,0,1,'pen');assert(h.state.touchMode);h.frame(time+=16);assert(h.state.position.x>1050);releaseThumb(h);
 h.state.keys.add('ArrowUp');const old={...h.state.position};h.frame(time+=16);assert(h.state.position.y<old.y);h.state.keys.clear();
 h.enterRoom('radio');h.state.position={...rooms.TAPE_SLOTS[0]};h.frame(time+=16);assert(!h.get('#interact').hidden);tapAction(h);assert.equal(h.state.tapes.carrying,content.TRACKS[0].id);
 h.state.position={...rooms.RADIO};h.frame(time+=16);tapAction(h);assert.equal(h.state.tapes.loaded,content.TRACKS[0].id);assert.equal(h.state.tapes.carrying,null);
 h.leaveRoom();h.state.position={x:1050,y:850};h.frame(time+=16);assert(h.get('#interact').hidden);
 h.enterRoom('wardrobe');h.state.position={...painting.paintSlots(content.PALETTE).find(c=>c.id==='red')};h.frame(time+=16);tapAction(h);assert.equal(h.state.paintCan,'red');h.leaveRoom();
 const surface=painting.BUCKET_SURFACES.find(s=>s.bucket);h.state.position={...surface.walk};h.frame(time+=16);assert.equal(h.currentInteraction()?.kind,'paint');assert(!h.get('#interact').hidden);assert.equal(h.get('#interact').innerHTML,'Anmalen');assert.equal(h.state.paint[surface.id],undefined);tapAction(h);assert.equal(h.state.paint[surface.id],'#ff3935');
 h.enterRoom('wardrobe');h.state.position={...rooms.PICTURE_SPOT};h.frame(time+=16);assert.equal(h.state.scene,'painting');
 h.state.position={...studio.studioColors(content.PALETTE).find(c=>c.id==='blue')};h.frame(time+=16);tapAction(h);assert.equal(h.state.studio.color,'blue');h.state.position={x:300,y:400};h.frame(time+=16);
 const target=h.currentInteraction();assert.equal(target?.kind,'studio-paint');tapAction(h);assert.equal(h.state.paint[target.id],content.PALETTE.find(c=>c.id==='blue').color);
 const brush={...h.state.position};startThumb(h,8,0);h.frame(time+=16);assert(h.state.position.x>brush.x);releaseThumb(h);
}
console.log('PASS: keyboard controls remain available after using the thumb pad; touch action still takes and inserts cassettes, confirms bucket and brush painting and selects palette colours.');

{
 const h=await harness(false,'horse',null,false,null,null,null,null,null,true);let time=1000;h.frame(time);h.state.position={...h.state.rocket.position};h.frame(time+=16);tapAction(h);assert(h.state.rocket.riding);
 startThumb(h,0,-8);for(let i=0;i<60;i++)h.frame(time+=16);assert(h.state.rocket.airborne);const flying={...h.state.position};releaseThumb(h);h.frame(time+=16);assert.deepEqual({...h.state.position},flying);
 startThumb(h,0,-8);while(!h.state.adventure && time<13000)h.frame(time+=16);assert(h.state.adventure);assert.equal(h.state.touch,null);startThumb(h,0,-8);assert.equal(h.state.touch,null);
 while(h.state.adventure.phase==='intro')h.frame(time+=16);assert(h.modal.open);new h.Element('easy space','button',{difficulty:'leicht'}).click();assert.equal(h.state.adventure.phase,'playing');assert(!h.get('#touch-pause').hidden);
 const ship={...h.state.adventure.ship};startThumb(h,8,-8);for(let i=0;i<5;i++)h.frame(time+=16);assert(h.state.adventure.ship.x>ship.x && h.state.adventure.ship.y<ship.y);releaseThumb(h);
 const released={...h.state.adventure.ship},progress=h.state.adventure.progress;h.frame(time+=16);assert.deepEqual({...h.state.adventure.ship},released);assert(h.state.adventure.progress>progress);
 startThumb(h,8,0);new h.Element('touch pause','button',{action:'touch-pause'}).click();assert.equal(h.state.modal,'space-pause');assert.equal(h.state.touch,null);
 const paused={...h.state.adventure.ship};h.frame(time+=100);assert.deepEqual({...h.state.adventure.ship},paused);new h.Element('continue','button',{action:'space-continue'}).click();h.frame(time+=16);assert.deepEqual({...h.state.adventure.ship},paused);
}
console.log('PASS: the thumb pad steers the rocket upwards into the space game, stops manual flight on release, preserves scripted transitions and works with pause/resume.');

function bikeTouchEvent(h,control,type,pointerId=11) {
 const button=h.get('#bike-touch-'+control),event={pointerId,pointerType:'touch',button:0,target:button,preventDefault(){}};
 for(const cb of button.handlers.get(type)||[])cb(event);return button;
}
{
 const track=content.TRACKS.find(t=>t.id==='fahrradfahren'),oldSrc=track.src;track.src='uploads/cycling.mp3';
 try{
  const h=await harness(false,'monkey',null,false,null,null,null,null,null,true);let time=1000;h.enterRoom('radio');h.state.tapes.loaded=track.id;h.loadRecording();h.state.position={...bike.BIKE_DOOR};h.frame(time);
  assert(h.modalContent.innerHTML.includes('Links unten'));new h.Element('easy','button',{bikeLevel:'leicht'}).click();const race=h.state.race;race.stones=[];race.ramps=[];race.riders.slice(1).forEach(r=>{r.departed=true;r.active=false;});
  assert(h.get('#thumb-pad').hidden);assert(!h.get('#bike-touch-controls').hidden);startThumb(h,12,0);assert.equal(h.state.touch,null,'the world joystick is disabled while cycling');
  const gas=bikeTouchEvent(h,'gas','pointerdown');for(let i=0;i<60;i++)h.frame(time+=16);assert(race.player.speed>80);assert(gas.hasPointerCapture(11));
  const lane=race.player.lane;bikeTouchEvent(h,'up','pointerdown',22);assert.equal(race.player.lane,lane-1);
  for(let i=0;i<40;i++)h.frame(time+=16);assert.equal(race.player.lane,lane-1,'one steering press selects exactly one lane, even while held');
  bikeTouchEvent(h,'up','pointerup',22);assert(h.state.bikeTouch.has(11),'releasing a steering finger does not release the gas');assert(!h.get('#bike-touch-up').hasPointerCapture(22));
  bikeTouchEvent(h,'down','pointerdown',22);assert.equal(race.player.lane,lane);bikeTouchEvent(h,'down','pointerup',22);
  const fast=race.player.speed;bikeTouchEvent(h,'brake','pointerdown',33);for(let i=0;i<12;i++)h.frame(time+=16);assert(race.player.speed<fast,'braking takes priority when both pedals are held');
  bikeTouchEvent(h,'gas','pointerup');assert(h.state.bikeTouch.has(33));bikeTouchEvent(h,'brake','pointerup',33);const coasting=race.player.speed;
  for(let i=0;i<10;i++)h.frame(time+=16);assert.equal(race.player.speed,coasting,'release preserves momentum');
  bikeTouchEvent(h,'gas','pointerdown');bikeTouchEvent(h,'gas','pointercancel');assert.equal(h.state.bikeTouch.size,0);
  for(const interrupt of ['blur','orientationchange','visibilitychange','pause']){
   bikeTouchEvent(h,'gas','pointerdown');bikeTouchEvent(h,'up','pointerdown',22);
   if(interrupt==='pause')new h.Element('pause','button',{action:'touch-pause'}).click();
   else if(interrupt==='visibilitychange'){h.doc.hidden=true;for(const cb of h.documentHandlers.get(interrupt)||[])cb({});h.doc.hidden=false;}
   else for(const cb of h.windowHandlers.get(interrupt)||[])cb({});
   assert.equal(h.state.bikeTouch.size,0,interrupt);assert(!gas.hasPointerCapture(11));assert(!h.get('#bike-touch-up').hasPointerCapture(22));
   if(interrupt==='pause'){const elapsed=race.elapsed;h.frame(time+=100);assert.equal(race.elapsed,elapsed);new h.Element('continue','button',{action:'bike-continue'}).click();}
  }
  race.player.lane=2;for(const cb of h.get('#bike-touch-up').handlers.get('click')||[])cb({detail:0});assert.equal(race.player.lane,1);
  for(const cb of h.get('#bike-touch-up').handlers.get('click')||[])cb({detail:1,pointerType:'touch'});assert.equal(race.player.lane,1,'a compatibility click cannot change another lane');
  new h.Element('exit','button',{action:'bike-exit'}).click();assert(!h.get('#thumb-pad').hidden);assert(h.get('#bike-touch-controls').hidden);
 }finally{track.src=oldSrc;}
}
console.log('PASS: cycling has independent left-side up/down buttons and right-side gas/brake holds, supports simultaneous steering and throttle, one lane per press, brake priority, coasting, cancellation, pause and keyboard activation without stuck pedals.');

{
 const track={id:'schokolade-touch-test',title:'Schokolade',src:'uploads/chocolate.mp3',image:'assets/hut.png',color:'#b37339',published:true};content.TRACKS.push(track);
 try{
  const h=await harness(false,'cat',null,false,null,null,null,null,null,true);let time=1000;h.enterRoom('radio');h.state.tapes.loaded=track.id;h.loadRecording();h.state.position={...chocolate.CHOCOLATE_DOOR};h.frame(time);assert.equal(h.state.scene,'chocolate');const start={...h.state.position};
  const destination=[{x:start.x+40,y:start.y},{x:start.x-40,y:start.y},{x:start.x,y:start.y-40},{x:start.x,y:start.y+40}].find(p=>core.canStand(p,'chocolate'));assert(destination);
  startThumb(h,Math.sign(destination.x-start.x)*8,Math.sign(destination.y-start.y)*8);for(let i=0;i<5;i++)h.frame(time+=16);assert(Math.hypot(h.state.position.x-start.x,h.state.position.y-start.y)>1);releaseThumb(h);
  const stopped={...h.state.position};for(let i=0;i<5;i++)h.frame(time+=16);assert.deepEqual({...h.state.position},stopped);assert.equal(h.state.chocolate.run.phase,'search');
 }finally{content.TRACKS.splice(content.TRACKS.indexOf(track),1);}
}
console.log('PASS: the thumb pad also explores the chocolate maze and stops immediately when released.');

{
 const h=await harness(false,'cat',null,false,null,null,null,null,null,true);h.state.position={x:1050,y:850};h.frame(1000);
 assert.equal(h.get('#fullscreen-toggle').getAttribute('aria-pressed'),'false');startThumb(h,8,0);h.frame(1016);new h.Element('fullscreen','button',{action:'fullscreen'}).click();
 assert(h.doc.body.classList.contains('game-fullscreen'));assert.equal(h.get('#fullscreen-toggle').getAttribute('aria-pressed'),'true');assert.equal(h.get('#fullscreen-toggle').getAttribute('aria-label'),'Vollbild schließen');assert.equal(h.state.touch,null);assert(!h.get('#thumb-pad').hasPointerCapture(1));
 new h.Element('exit fullscreen','button',{action:'fullscreen'}).click();assert(!h.doc.body.classList.contains('game-fullscreen'));assert.equal(h.get('#fullscreen-toggle').getAttribute('aria-pressed'),'false');
 new h.Element('fullscreen again','button',{action:'fullscreen'}).click();h.press(h.windowHandlers,h.event('Escape','Escape',h.game));assert(!h.doc.body.classList.contains('game-fullscreen'));assert(!h.modal.open);
 let requests=0,exits=0;h.doc.documentElement.requestFullscreen=function(){requests++;assert.equal(this,h.doc.documentElement);h.doc.fullscreenElement=this;for(const cb of h.documentHandlers.get('fullscreenchange')||[])cb({});return Promise.resolve();};
 h.doc.exitFullscreen=function(){exits++;h.doc.fullscreenElement=null;for(const cb of h.documentHandlers.get('fullscreenchange')||[])cb({});return Promise.resolve();};
 new h.Element('native fullscreen','button',{action:'fullscreen'}).click();await Promise.resolve();assert.equal(requests,1);assert(h.doc.body.classList.contains('game-fullscreen'));
 h.showPanel('help');const focused=h.doc.activeElement;h.doc.fullscreenElement=null;for(const cb of h.documentHandlers.get('fullscreenchange')||[])cb({});
 assert(!h.doc.body.classList.contains('game-fullscreen'));assert(h.modal.open);assert.equal(h.doc.activeElement,focused,'a browser fullscreen exit must not steal focus from a dialog');h.closePanel();
 h.state.landing={};new h.Element('full during landing','button',{action:'fullscreen'}).click();assert(h.doc.body.classList.contains('game-fullscreen'));new h.Element('leave during landing','button',{action:'fullscreen'}).click();assert(!h.doc.body.classList.contains('game-fullscreen'));assert.equal(exits,1);h.state.landing=null;
}
console.log('PASS: fullscreen works by its real click handler, clears a held thumb, updates the exit label, supports the layout fallback and native root API, exits with Escape or the browser gesture, preserves modal focus and can be closed during landing.');

{
 const h=await harness(false,'cat',null,false,null,null,null,null,null,true);let time=1000;h.enterRoom('radio');h.state.position={...rooms.TAPE_SLOTS[0]};h.frame(time);
 startThumb(h,12,0);tapAction(h);assert.equal(h.state.tapes.carrying,content.TRACKS[0].id);assert.equal(h.state.touch?.id,1);assert(h.get('#thumb-pad').hasPointerCapture(1));
 const carrying={...h.state.position};h.frame(time+=16);assert(h.state.position.x>carrying.x,'the left thumb keeps working while the right finger takes a cassette');releaseThumb(h);
 h.state.position={...rooms.RADIO};h.frame(time+=16);startThumb(h);tapAction(h);assert.equal(h.state.tapes.loaded,content.TRACKS[0].id);assert.equal(h.state.touch?.id,1);moveThumb(h,0,8);
 h.leaveRoom();assert.equal(h.state.scene,'world');assert.equal(h.state.touch?.id,1);const outside={...h.state.position};h.frame(time+=16);assert(h.state.position.y>outside.y);releaseThumb(h);
 h.enterRoom('wardrobe');startThumb(h,0,-8);assert(h.get('#thumb-pad').hasPointerCapture(1));h.enterRoom('radio');assert.equal(h.state.touch?.id,1);assert(h.get('#thumb-pad').hasPointerCapture(1));
 h.showPanel('help');assert.equal(h.state.touch,null);assert(!h.get('#thumb-pad').hasPointerCapture(1));
}
console.log('PASS: a held left thumb remains usable while the right finger takes or inserts a cassette and when crossing room entrances/exits; dialogs still stop the controls.');


{
 const h=await harness(false,'cat',null,false,null,null,null,null,null,true);let time=1000;h.state.position={x:1050,y:850};h.frame(time);
 h.window.innerWidth=390;h.window.innerHeight=844;h.game.getBoundingClientRect=()=>({left:8,top:20,width:390,height:844});
 new h.Element('portrait fullscreen','button',{action:'fullscreen'}).click();assert(h.state.landscapeTurn);assert(h.doc.body.classList.contains('landscape-turn'));assert(h.state.viewport.w>h.state.viewport.h);
 const before={...h.state.position};startThumb(h,0,12);h.frame(time+=16);assert(h.state.position.x>before.x);assert.equal(h.state.position.y,before.y,'a physical vertical gesture maps into landscape horizontal movement');
 const right={...h.state.position};moveThumb(h,12,0);h.frame(time+=16);assert(h.state.position.y<right.y);assert.equal(h.state.position.x,right.x);releaseThumb(h);
 h.state.adventure=adventure.createAdventure(844,390);h.state.adventure.phase='ready';h.state.scene='space';h.renderScene();h.showPanel('space-launch');new h.Element('easy','button',{difficulty:'leicht'}).click();
 assert.equal(h.state.adventure.width,844);assert.equal(h.state.adventure.height,390);assert.equal(h.get('#world-svg').getAttribute('viewBox'),'0 0 844 390');
 const ship={...h.state.adventure.ship};startThumb(h,0,12);h.frame(time+=16);assert(h.state.adventure.ship.x>ship.x);assert.equal(h.state.adventure.ship.y,ship.y);
 h.window.innerWidth=844;h.window.innerHeight=390;h.game.getBoundingClientRect=()=>({left:8,top:20,width:844,height:390});for(const cb of h.windowHandlers.get('resize')||[])cb({});
 assert(!h.state.landscapeTurn);assert(!h.doc.body.classList.contains('landscape-turn'));assert.equal(h.state.touch,null);assert.equal(h.state.adventure.width,844);assert.equal(h.state.adventure.height,390);
 new h.Element('normal view','button',{action:'fullscreen'}).click();assert(!h.doc.body.classList.contains('game-fullscreen'));assert(!h.state.landscapeTurn);
}
console.log('PASS: portrait fullscreen presents a landscape game, remaps thumb axes and space dimensions correctly, switches cleanly after physical rotation and restores the normal view on exit.');

{
 const h=await harness(false,'cat',null,false,null,null,null,null,null,true);let requests=0,exits=0;
 h.doc.documentElement.requestFullscreen=function(){requests++;h.doc.fullscreenElement=this;for(const cb of h.documentHandlers.get('fullscreenchange')||[])cb({});return Promise.resolve();};
 h.doc.exitFullscreen=function(){exits++;h.doc.fullscreenElement=null;for(const cb of h.documentHandlers.get('fullscreenchange')||[])cb({});return Promise.resolve();};
 new h.Element('fullscreen','button',{action:'fullscreen'}).click();await Promise.resolve();
 const check=()=>{assert.equal(h.doc.fullscreenElement,h.doc.documentElement);assert(h.doc.body.classList.contains('game-fullscreen'));assert.equal(exits,0);assert.equal(requests,1);};
 for(const id of ['help','grownups','letter','panda','characters']){
  h.showPanel(id);check();assert(h.modal.open);assert(h.get('.app').inert);assert(!h.get('#modal-backdrop').hidden);
  h.closePanel();check();assert(!h.modal.open);assert(!h.get('.app').inert);assert(h.get('#modal-backdrop').hidden);
 }
 h.state.race=bike.createBikeRace('cat',content.ANIMALS);bike.startBikeRace(h.state.race);h.state.race.obstacles=[];h.state.race.player.x=bike.BIKE_FINISH-1;h.state.race.player.speed=320;h.renderScene();
 h.frame(1000);h.frame(1020);assert.equal(h.state.race.phase,'finished');assert.equal(h.state.modal,'bike-win');assert(h.modal.open);check();
 new h.Element('race again','button',{bikeLevel:'mittel'}).click();assert.equal(h.state.race.phase,'racing');assert(!h.modal.open);check();
 h.showPanel('bike-pause');const escape=h.press(h.documentHandlers,h.event('Escape','Escape',h.modal));assert(escape.prevented&&escape.stopped);assert(!h.modal.open);check();
 new h.Element('back','button',{action:'bike-exit'}).click();assert(!h.state.race);check();
 h.state.adventure=adventure.createAdventure(1200,700);h.state.adventure.phase='ready';h.state.scene='space';h.renderScene();h.showPanel('space-launch');assert(h.modal.open);check();
 new h.Element('space easy','button',{difficulty:'leicht'}).click();assert.equal(h.state.adventure.phase,'playing');assert(!h.modal.open);check();
}
console.log('PASS: the actual cycling finish, retry/pause menus, space difficulty menu and information windows keep native fullscreen; Escape closes the window and restores background interaction.');

try {
 dancingTrack.src='uploads/tanzen.mp3';
 for(const id of ['cat','dog','horse','monkey']){
  const h=await harness(false,id,null,false,{phase:'unlocked',wearing:true},null,null,null,null,true);h.enterRoom('radio');h.state.position={x:800,y:780};h.state.tapes.loaded='tanzen';h.loadRecording();h.frame(1000);
  assert(!h.get('#dance-toggle').hidden);h.game.focus();h.press(h.windowHandlers,h.event('t','KeyT',h.game));assert.equal(h.state.modal,'dance');
  for(const style of dance.PLAYER_DANCES)assert(h.modalContent.innerHTML.includes('data-dance-style="'+style+'"'));
  new h.Element('moonwalk','button',{danceStyle:'moonwalk'}).click();assert(!h.modal.open);assert.equal(h.state.playerDance.style,'moonwalk');
  assert(h.get('#player-use').attrs.has('hidden'));assert(!h.get('#player-dance').attrs.has('hidden'));assert.equal(h.get('#player-dance-upper-use').getAttribute('href'),'#dressed-'+id+'-right');
  const origin={...h.state.position},first=h.get('#player-dance-motion').getAttribute('transform');for(let i=1;i<=20;i++)h.frame(1000+i*16);
  assert.notEqual(h.get('#player-dance-motion').getAttribute('transform'),first);assert.deepEqual({...h.state.position},origin,'dancing never changes collision coordinates');
  new h.Element('choose dance','button',{action:'dance-picker'}).click();const elapsed=h.state.playerDance.elapsed;h.frame(1340);assert.equal(h.state.playerDance.elapsed,elapsed,'opening a menu freezes the selected dance');
  new h.Element('robot','button',{danceStyle:'robot'}).click();assert.equal(h.state.playerDance.style,'robot');assert.equal(h.get('#player-dance-upper-use').getAttribute('href'),'#dressed-'+id);
  h.press(h.windowHandlers,h.event('ArrowRight','ArrowRight',h.game));h.frame(1360);h.state.keys.clear();assert.equal(h.state.playerDance.style,'robot');assert(!h.get('#player-use').attrs.has('hidden'));
  h.frame(1380);assert.equal(h.state.playerDance.style,'robot');assert(h.get('#player-use').attrs.has('hidden'));assert(!h.get('#player-dance').attrs.has('hidden'));
  new h.Element('choose again','button',{action:'dance-picker'}).click();new h.Element('party','button',{danceStyle:'party'}).click();assert.equal(h.state.playerDance.style,'party');
  new h.Element('choose stop','button',{action:'dance-picker'}).click();new h.Element('stop','button',{danceStyle:'stop'}).click();assert.equal(h.state.playerDance.style,null);assert(!h.modal.open);
  new h.Element('choose before end','button',{action:'dance-picker'}).click();h.get('#audio').ended=true;for(const cb of h.get('#audio').handlers.get('ended')||[])cb({});assert(!h.modal.open);assert(h.get('#dance-toggle').hidden);assert.equal(h.state.playerDance.style,null);
  h.loadRecording();new h.Element('choose restarted','button',{action:'dance-picker'}).click();new h.Element('moonwalk again','button',{danceStyle:'moonwalk'}).click();h.leaveRoom();assert(h.get('#dance-toggle').hidden);assert.equal(h.state.playerDance.style,null);
 }
}finally{dancingTrack.src=originalDanceAudio;}
console.log('PASS: every original avatar can choose moonwalk, robot and party by keyboard/touch, keeps its hat, pauses dancing on movement, resumes when stopping, and stops on song ending, and retains the existing three disco guests.');

for(const [width,height] of [[390,844],[844,390],[932,430]]) {
 const h=await harness(false,'cat');h.window.innerWidth=width;h.window.innerHeight=height;
 h.game.getBoundingClientRect=()=>({left:0,top:0,width,height});h.resize();const original={...h.state.viewport};
 startThumb(h);releaseThumb(h);assert(h.state.touchMode,'first touch also activates the phone camera');
 assertClose(h.state.viewport.w,original.w/.75);assertClose(h.state.viewport.h,original.h/.75);
 const view=h.get('#world-svg').getAttribute('viewBox').split(' ').map(Number);
 assert(Math.abs(view[2]-original.w/.75)<.01 && Math.abs(view[3]-original.h/.75)<.01);
 assert(view[0]>=core.WORLD.left && view[0]+view[2]<=core.WORLD.right+.01);
 h.state.scene='sky';h.resize();assertClose(h.state.viewport.w,original.w/.75);
 for(const scene of ['radio','concerts','wardrobe']) { h.state.scene=scene;h.resize();assertClose(h.state.viewport.w,original.w/.75,'houses match the outdoor phone scale'); }
 h.state.scene='social'; h.state.touchMode=false; h.resize(); const contact={...h.state.viewport};h.state.touchMode=true;h.resize(); assertClose(h.state.viewport.w,contact.w/.75);assertClose(h.state.viewport.h,contact.h/.75);
}
{
 const h=await harness(false,'cat',null,false,null,null,null,null,null,true);h.window.innerWidth=390;h.window.innerHeight=844;
 h.game.getBoundingClientRect=()=>({left:0,top:0,width:390,height:844});new h.Element('fullscreen','button',{action:'fullscreen'}).click();
 assert(h.state.landscapeTurn);const turned={...h.state.viewport};
 h.window.innerWidth=844;h.window.innerHeight=390;h.game.getBoundingClientRect=()=>({left:0,top:0,width:844,height:390});h.resize();
 assert(!h.state.landscapeTurn);assertClose(h.state.viewport.w,turned.w);assertClose(h.state.viewport.h,turned.h);
 h.state.touchMode=false;h.resize();assertClose(h.state.viewport.w/turned.w,.75,'the phone uses exactly 75% of the former scale in fullscreen');
}
{
 const h=await harness(false,'cat');h.window.innerWidth=1024;h.window.innerHeight=768;
 h.game.getBoundingClientRect=()=>({left:0,top:0,width:1024,height:768});h.resize();const original={...h.state.viewport};h.state.touchMode=true;h.resize();
 assertClose(h.state.viewport.w,original.w);assertClose(h.state.viewport.h,original.h,'larger tablets retain their current framing');
}
console.log('PASS: smartphones show the outdoor world and sky at 75% scale in portrait, landscape and rotated fullscreen, including on first touch; houses use the same phone zoom while world bounds and larger tablet framing are preserved.');

try {
 friendsTrack.src='uploads/freunde.mp3';
 for(const [key,code] of [['Enter','Enter'],[' ','Space'],['Enter','NumpadEnter']]) {
  const h=await harness(false,'cat',null,false,null,null,null,null,null,true);let clock=1000;const step=()=>h.frame(clock+=50);
  new h.Element('fullscreen','button',{action:'fullscreen'}).click();const screen=h.doc.fullscreenElement;
  h.enterRoom('radio');h.state.position={x:800,y:550};h.state.tapes.loaded=friendsTrack.id;h.loadRecording();
  for(let i=0;i<300&&!h.modal.open;i++)step();assert.equal(h.state.modal,'friends-choice');assert.equal(h.doc.fullscreenElement,screen);
  const hide=new h.Element('hide','button',{friendsMode:'hide'});h.press(h.documentHandlers,h.event(key,code,hide));
  assert(!h.modal.open);assert.equal(h.state.friends.mode,'hide');
  for(let i=0;i<300&&h.state.scene==='radio';i++)step();assert.equal(h.state.scene,'world');assert.equal(h.state.friends.phase,'hide-countdown');
  assert.equal(h.enterRoom('wardrobe'),false);h.state.position={x:550,y:960};h.game.focus();
  assert.equal(h.currentInteraction()?.kind,'friends-hide');h.press(h.windowHandlers,h.event(key,code,h.game));assert(h.state.friends.hidden);assert(h.get('#player').attrs.has('hidden'));assert(h.get('#friends-hidden').innerHTML.includes('opacity=".65"'));
  h.press(h.windowHandlers,h.event(key,code,h.game));assert(!h.state.friends.hidden);
  for (const cb of h.get('#interact').handlers.get('click') || []) cb({});
  assert(h.state.friends.hidden,'the touch action button also hides the player');
  h.state.keys.add('ArrowRight');step();h.state.keys.clear();assert(!h.state.friends.hidden);
  for(let i=0;i<220&&h.state.friends.phase==='hide-countdown';i++)step();assert.equal(h.state.friends.phase,'hiding');
  h.state.friends.actors[0].position={...h.state.position};step();assert.equal(h.state.modal,'friends-hide-lost');assert.equal(h.doc.fullscreenElement,screen);
  new h.Element('retry catch','button',{friendsMode:'catch'}).click();assert.equal(h.state.friends.phase,'countdown');assert(!h.modal.open);
  const p={...h.state.position};h.state.keys.add('ArrowRight');step();h.state.keys.clear();assert.deepEqual({...h.state.position},p);assert(h.get('#friends-round').innerHTML.includes('<ellipse'));
  h.state.friends.phase='hide-won';h.showPanel('friends-hide-won');new h.Element('leave','button',{action:'friends-stop'}).click();assert.equal(h.state.friends.phase,'idle');assert(!h.modal.open);assert.equal(h.doc.fullscreenElement,screen);assert(!h.get('#player').attrs.has('hidden'));
 }
 const h=await harness(false,'cat');h.enterRoom('radio');h.state.tapes.loaded=friendsTrack.id;h.loadRecording();assert.equal(h.state.friends.phase,'meeting');h.state.tapes.loaded=null;h.loadRecording();assert.equal(h.state.friends.phase,'idle');assert(!h.state.friendsExit);
} finally {friendsTrack.src=previousFriendsSrc;}
console.log('PASS: hide choice, tree concealment and revealing, loss/retry/exit, building lock and eye-cover countdown work with Enter/Space/Numpad Enter while preserving fullscreen; ejecting cancels an unfinished invitation.');
