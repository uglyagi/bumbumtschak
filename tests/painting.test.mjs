import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { DEFAULT_ANIMALS, playableAnimals } from '../animal-defaults.js';
import { PAINT_SURFACES, DEFAULT_PALETTE, PALETTE_LIMIT, PAINT_RESET, PAINT_NEXT, paintSlots, cleanPaint, canPaintSurface, createPaintPreview } from '../painting.js';
import { worldMarkup } from '../art.js';
import { roomMarkup } from '../room-art.js';
import { ANIMALS, PALETTE, applyContent, text } from '../content.js';
import { validateContent } from '../verwaltung/schema.js';
import { draftPreview, fileReferences } from '../verwaltung/drafts.js';
import { WORLD, WORLD_SPAWN, canStand, planPath, move } from '../game-core.js';
import { ROOM_SPAWN, refreshBandWayfinding } from '../rooms.js';
import { SKY, GROUND_ROCKET, moveRocket } from '../sky-world.js';
const document = JSON.parse(await readFile(new URL('../data/content.json', import.meta.url)));

test('every requested color surface changes while all black outlines and their geometry stay identical', () => {
  const original = worldMarkup(), paint = Object.fromEntries(PAINT_SURFACES.map(surface => [surface.id, '#ff3935']));
  const painted = worldMarkup(paint);
  const blackEdges = svg => [...svg.matchAll(/<([a-z]+)\b([^>]*\bstroke="#101014"[^>]*)>/g)].map(match => {
    const attrs = Object.fromEntries([...match[2].matchAll(/([\w-]+)="([^"]*)"/g)].map(attr => [attr[1], attr[2]]));
    return [match[1], ...['stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'd', 'x', 'y', 'width', 'height', 'rx', 'ry', 'transform'].map(key => attrs[key])];
  });
  assert.deepEqual(blackEdges(painted), blackEdges(original));
  for (const surface of PAINT_SURFACES) {
    const matches = [...painted.matchAll(new RegExp('data-paint-target="' + surface.id + '"[^>]*', 'g'))];
    assert(matches.length, surface.id + ' exists in the rendered world');
    for (const match of matches) assert(match[0].includes('#ff3935'), surface.id + ' receives its new color');
  }
  assert(!original.includes('M800 755v65')); assert(!original.includes('Kassettenhaus')); assert(!original.includes('Konzerthaus'));
  assert(original.includes('Musikhaus')); assert(original.includes('Home sweet Home')); assert(original.includes('Büro'));
  assert.equal(text('nav_grownups'), 'für Eltern und Veranstalter');
  assert(!original.includes('mapLabel(1280'));
});

test('ground painting spots can be walked to; sky objects require a flight above the horizon', () => {
  function walk(start, end, scene) {
    const path = planPath(start, end, scene); assert(path.length, scene + ': ' + JSON.stringify(end));
    let position = { ...start }, frames = 0;
    while (path.length && frames++ < 3000) {
      const point = path[0], distance = Math.hypot(point.x - position.x, point.y - position.y);
      if (distance < 5) { path.shift(); continue; }
      position = move(position, point.x - position.x, point.y - position.y, Math.min(.05, distance / WORLD.speed), scene);
    }
    assert.equal(path.length, 0, 'reach ' + JSON.stringify(end));
  }
  for (const surface of PAINT_SURFACES) {
    assert(canPaintSurface(surface.walk, surface));
    if (surface.sky) {
      assert.equal(canStand(surface.walk.x, surface.walk.y), false);
      assert.equal(planPath(WORLD_SPAWN, surface.walk, 'world').length, 0);
      assert(!canPaintSurface(WORLD_SPAWN, surface));
      let position = { ...GROUND_ROCKET }, frames = 0;
      while (Math.hypot(position.x - surface.walk.x, position.y - surface.walk.y) > 1 && frames++ < 1000) {
        const dx = surface.walk.x - position.x, dy = surface.walk.y - position.y;
        position = moveRocket(position, dx, dy, Math.min(.05, Math.hypot(dx, dy) / 255));
      }
      assert(canPaintSurface(position, surface)); assert(position.y < 0 && position.y > SKY.top);
    } else {
      assert(canStand(surface.walk.x, surface.walk.y)); walk(WORLD_SPAWN, surface.walk, 'world');
      assert(!canPaintSurface(SKY.spawn, surface));
    }
  }
  for (const control of [...paintSlots(DEFAULT_PALETTE), PAINT_RESET, PAINT_NEXT]) walk(ROOM_SPAWN, control, 'wardrobe');
});

test('legacy content gains editable characters and palette while custom names survive', async () => {
  const legacy = structuredClone(document); delete legacy.info.animals; delete legacy.info.palette; legacy.info.texts.cat_name = 'Meine Katze';
  const valid = validateContent(legacy);
  assert.equal(valid.info.animals.length, 4); assert.equal(valid.info.animals[0].name, 'Meine Katze');
  assert.equal(valid.info.palette.length, DEFAULT_PALETTE.length);
  for (const animal of DEFAULT_ANIMALS) await access(new URL('../' + animal.image, import.meta.url));
  valid.info.palette.push({ id: 'orange', name: 'Orange', color: '#ff9900' });
  assert.equal(validateContent(valid).info.palette.length, DEFAULT_PALETTE.length + 1);
  valid.info.palette[DEFAULT_PALETTE.length].id = valid.info.palette[0].id; assert.throws(() => validateContent(valid), /doppelt/);
  valid.info.palette = Array.from({ length: PALETTE_LIMIT + 1 }, (_, i) => ({ id: 'paint-' + i, name: 'Farbe', color: '#abcdef' }));
  assert.throws(() => validateContent(valid), /Farben/);
  valid.info.palette = [{ id: 'bad', name: 'Bad', color: 'url(javascript:bad)' }]; assert.throws(() => validateContent(valid), /Kanisterfarbe/);
});

test('custom character images and names reach every avatar and staged previews', () => {
  const custom = structuredClone(document); custom.info.animals = playableAnimals(); custom.info.animals[0].name = 'Unsere Katze'; custom.info.animals[0].image = 'uploads/cat.png';
  custom.info.palette = [...DEFAULT_PALETTE, { id: 'orange', name: 'Orange', color: '#ff9900' }];
  const staged = draftPreview({ document: custom, files: [{ path: 'uploads/cat.png', file: new Blob(['image']) }] }, () => 'blob:local-cat');
  assert.equal(staged.info.animals[0].image, 'blob:local-cat'); assert.equal(custom.info.animals[0].image, 'uploads/cat.png');
  assert(fileReferences(custom).has('uploads/cat.png'));
  try {
    applyContent(staged); refreshBandWayfinding();
    const world = worldMarkup(), room = roomMarkup('wardrobe', 0, undefined, 'cat', { page: 1 });
    assert(world.includes('href="blob:local-cat" width="100" height="120" preserveAspectRatio="xMidYMax meet"'));
    assert(room.includes('Unsere Katze')); assert(room.includes('Orange')); assert.equal(PALETTE.length, DEFAULT_PALETTE.length + 1); assert.equal(ANIMALS[0].name, 'Unsere Katze');
    assert.equal(text('sign_radio'), 'Musikhaus'); assert.equal(text('sign_social'), 'Kontakt');
  } finally { applyContent(document); refreshBandWayfinding(); }
});

test('saved drawings accept only known surfaces and hexadecimal colors', () => {
  assert.deepEqual(cleanPaint({ path: '#ff9900', sun: '#abcdef', 'unknown-world': '#123456', grass: 'url(javascript:bad)' }), { path: '#ff9900', sun: '#abcdef' });
  assert.deepEqual(cleanPaint(null), {}); assert.deepEqual(cleanPaint([]), {});
});

test('temporary previews restore each original fill, tree color and readable label without changing outlines', () => {
  const node = (property, color) => {
    const attrs = new Map([['stroke', '#101014'], [property, color]]);
    return { dataset: { paintProperty: property }, style: { color }, getAttribute: key => attrs.get(key) ?? null,
      setAttribute: (key, value) => attrs.set(key, value), removeAttribute: key => attrs.delete(key) };
  };
  const frame = node('fill', '#fff20b'), wall = node('fill', '#1d55ff'), label = node('fill', '#ffffff'), tree = node('color', '#ff87ce');
  const root = { querySelectorAll: selector => selector === '[data-paint-target="concert-wall"]' ? [frame, wall]
    : selector === '[data-paint-ink="concert-wall"]' ? [label] : selector === '[data-paint-target="tree-0"]' ? [tree] : [] };
  const restore = createPaintPreview(root, 'concert-wall', '#ffffff');
  assert.equal(frame.getAttribute('fill'), '#ffffff'); assert.equal(wall.getAttribute('fill'), '#ffffff'); assert.equal(label.getAttribute('fill'), '#101014');
  assert.equal(wall.getAttribute('stroke'), '#101014');
  restore(); restore();
  assert.equal(frame.getAttribute('fill'), '#fff20b'); assert.equal(wall.getAttribute('fill'), '#1d55ff'); assert.equal(label.getAttribute('fill'), '#ffffff');
  const restoreTree = createPaintPreview(root, 'tree-0', '#ffffff'); assert.equal(tree.style.color, '#ffffff');
  restoreTree(); assert.equal(tree.style.color, '#ff87ce'); assert.equal(tree.getAttribute('stroke'), '#101014');
});
