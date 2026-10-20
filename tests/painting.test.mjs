import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { DEFAULT_ANIMALS, playableAnimals } from '../animal-defaults.js';
import { PAINT_SURFACES, BUCKET_SURFACES, FLOWERS, DEFAULT_PALETTE, PALETTE_LIMIT, PAINT_RESET, PAINT_NEXT, paintSlots, bucketColors, paletteColors, WORLD_COLOR_IDS, paintColor, cleanPaint, canPaintSurface, createPaintPreview } from '../painting.js';
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
  for (const svg of [original, painted]) assert(svg.includes('<path d="M530 305h556v38H530Z" fill="#101014" stroke-width="5"/>'), 'the stage floor remains solid black after repainting every surface');
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
  valid.info.palette = [{ id: 'bad', name: 'Bad', color: 'url(javascript:bad)' }]; assert.throws(() => validateContent(valid), /Farbwert/);
});

test('custom character images and names reach every avatar and staged previews', () => {
  const custom = structuredClone(document); custom.info.animals = playableAnimals(); custom.info.animals[0].name = 'Unsere Katze'; custom.info.animals[0].image = 'uploads/cat.png';
  custom.info.palette = [...DEFAULT_PALETTE, { id: 'orange', name: 'Orange', color: '#ff9900' }];
  const staged = draftPreview({ document: custom, files: [{ path: 'uploads/cat.png', file: new Blob(['image']) }] }, () => 'blob:local-cat');
  assert.equal(staged.info.animals[0].image, 'blob:local-cat'); assert.equal(custom.info.animals[0].image, 'uploads/cat.png');
  assert(fileReferences(custom).has('uploads/cat.png'));
  try {
    applyContent(staged); refreshBandWayfinding();
    const world = worldMarkup(), room = roomMarkup('wardrobe', 0, undefined, 'dog', { page: 0 });
    assert(world.includes('href="blob:local-cat" width="100" height="120" preserveAspectRatio="xMidYMax meet"'));
    assert(room.includes('Unsere Katze')); assert(!room.includes('Orange')); assert.equal(PALETTE.length, DEFAULT_PALETTE.length + 1); assert.equal(ANIMALS[0].name, 'Unsere Katze');
    assert.equal(text('sign_radio'), 'Musikhaus'); assert.equal(text('sign_social'), 'Kontakt');
  } finally { applyContent(document); refreshBandWayfinding(); }
});

test('saved drawings accept only known surfaces and hexadecimal colors', () => {
  assert.deepEqual(cleanPaint({ path: '#ff9900', sun: '#abcdef', 'unknown-world': '#123456', grass: 'url(javascript:bad)' }), { path: '#ff9900', sun: '#abcdef' });
  assert.deepEqual(cleanPaint(null), {}); assert.deepEqual(cleanPaint([]), {});
});

test('the picture has eighteen shades, buckets have five base colors plus white, and original world colors belong to the same pool', () => {
  assert.equal(DEFAULT_PALETTE.length, 18); assert.equal(new Set(DEFAULT_PALETTE.map(color => color.color)).size, 18);
  assert.deepEqual(bucketColors().map(color => color.id), ['yellow', 'red', 'green', 'blue', 'pink', 'white']);
  assert.equal(paintSlots(DEFAULT_PALETTE).length, 6);
  const originals = { sky: 'blue-light', water: 'blue-dark', grass: 'green', path: 'yellow-light', sun: 'yellow' };
  for (const [surface, color] of Object.entries(originals)) assert.equal(WORLD_COLOR_IDS[surface], color);
  for (const [surface, color] of Object.entries(WORLD_COLOR_IDS)) {
    const hex = DEFAULT_PALETTE.find(item => item.id === color).color;
    assert.equal(paintColor(surface), hex);
    for (const node of worldMarkup().matchAll(new RegExp(`data-paint-target="${surface}"[^>]*`, 'g'))) assert(node[0].includes(hex), surface);
  }
  const roofs = Object.entries(WORLD_COLOR_IDS).filter(([id]) => id.endsWith('-roof')).map(([, color]) => color);
  assert(roofs.every(color => color.startsWith('red'))); assert(new Set(roofs).size > 1);
  for (const surface of BUCKET_SURFACES) {
    const node = worldMarkup().match(new RegExp(`data-paint-target="${surface.id}"[^>]*`))[0];
    assert(bucketColors().some(color => node.includes(color.color)), surface.id);
  }
});

test('legacy palettes retain edits, gain missing shades and keep extra colors exclusive to the picture', () => {
  const colors = paletteColors([{ id: 'yellow', name: 'Unser Gelb', color: '#f0dc00' }, { id: 'orange', name: 'Orange', color: '#ff9900' }]);
  assert.equal(colors.length, 19); assert.equal(colors.find(color => color.id === 'yellow').name, 'Unser Gelb');
  assert.equal(bucketColors(colors)[0].color, '#f0dc00');
  assert(!paintSlots(colors).some(color => color.id === 'orange'));
  assert.equal(paintColor('sun', '#fff20b', {}, colors), '#f0dc00');
  assert.equal(paintColor('flower-0', '#fff20b', {}, colors), '#f0dc00');
});

test('old nonbucket plant colors are discarded while permitted plants and saved picture colors survive', () => {
  const saved = { path: '#abcdef', 'tree-0': '#ffffff', 'tree-1': '#000000', 'tree-2': '#969ba5', 'tree-3': '#bde7ff', 'tree-4': '#ff3935', 'flower-0': '#ff87ce' };
  assert.deepEqual(cleanPaint(saved), { 'tree-0': '#ffffff', 'tree-4': '#ff3935', 'flower-0': '#ff87ce', path: '#abcdef' });
  assert.equal(paintColor('tree-0', '#ff87ce', saved), '#ffffff');
  const custom = paletteColors([{ id: 'blue', name: 'Unser Blau', color: '#2149aa' }]);
  assert.deepEqual(cleanPaint({ 'tree-0': '#2149aa', 'flower-0': '#1d55ff' }, custom), { 'tree-0': '#2149aa' });
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
  const restoreTree = createPaintPreview(root, 'tree-0', '#fff20b'); assert.equal(tree.style.color, '#fff20b');
  restoreTree(); assert.equal(tree.style.color, '#ff87ce'); assert.equal(tree.getAttribute('stroke'), '#101014');
});

test('buckets paint plants and selected details while the mailbox stays exclusive to the picture', () => {
  assert.equal(BUCKET_SURFACES.length, 34);
  assert(BUCKET_SURFACES.every(surface => surface.bucket || /^(tree|flower)-/.test(surface.id)));
  assert(!BUCKET_SURFACES.some(surface => surface.id === 'mailbox'));
  assert(!worldMarkup().includes('m212 473-15 35m200-35 15 35'));
  assert(!worldMarkup().includes('M1175 460v56m211-56v56'));
  assert(FLOWERS[7][0] > 1481, 'the moved flower clears the email circle');
  const svg = worldMarkup({}, true);
  const focusable = [...svg.matchAll(/data-paint-target="([^"]+)"[^>]*tabindex="0"/g)].map(match => match[1]);
  assert.deepEqual(focusable.sort(), BUCKET_SURFACES.map(surface => surface.id).sort());
  assert.equal(FLOWERS[0][3], 44); assert.equal(FLOWERS[7][3], 63);
  assert.equal(FLOWERS[0][0] + FLOWERS[0][3] / 2, 445 + 35 / 2);
  assert(Math.abs(FLOWERS[0][1] + FLOWERS[0][3] * 1.2 - (560 + 35 * 1.2)) < 1e-8);
});
