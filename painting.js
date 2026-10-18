import { escapeXML } from './utils.js';
import { SKY } from './sky-world.js';

export const DEFAULT_PALETTE = [
  { id: 'yellow', name: 'Gelb', color: '#fff20b' },
  { id: 'blue', name: 'Blau', color: '#1d55ff' },
  { id: 'green', name: 'Grün', color: '#40cea1' },
  { id: 'red', name: 'Rot', color: '#ff3935' },
  { id: 'pink', name: 'Rosa', color: '#ff87ce' },
  { id: 'white', name: 'Weiß', color: '#ffffff' },
];
export const PALETTE_LIMIT = 30;
export const PAINT_PAGE_SIZE = 6;
export const PAINT_RESET = { x: 1250, y: 940 };
export const PAINT_NEXT = { x: 350, y: 940 };
export function paletteColors(saved) {
  return (Array.isArray(saved) ? saved : DEFAULT_PALETTE).slice(0, PALETTE_LIMIT).map((item, i) => ({
    id: /^[a-z0-9][a-z0-9-]{0,63}$/.test(item?.id) ? item.id : `color-${i}`,
    name: typeof item?.name === 'string' ? item.name : '', color: /^#[a-f0-9]{6}$/i.test(item?.color) ? item.color : '#fff20b',
  }));
}
export const paintSlots = (palette, page = 0) => palette.slice(page * PAINT_PAGE_SIZE, (page + 1) * PAINT_PAGE_SIZE).map((color, i) => ({ ...color, x: 300 + i * 200, y: 850 }));
export const paintPages = palette => Math.max(1, Math.ceil(palette.length / PAINT_PAGE_SIZE));
export const FLOWERS = [
  [445, 560, '#ff87ce', 35], [105, 610, '#fff20b', 43], [1090, 595, '#ff87ce', 40],
  [1385, 600, '#fff20b', 33], [1030, 920, '#fff20b', 44], [710, 915, '#ff87ce', 36],
  [400, 940, '#ff87ce', 36], [1410, 960, '#ff87ce', 50], [450, 255, '#fff20b', 38],
  [1200, 150, '#ff87ce', 40], [120, 350, '#ff87ce', 32],
  [245, 165, '#fff20b', 30], [430, 100, '#ff87ce', 28], [505, 390, '#fff20b', 28],
  [665, 540, '#ff87ce', 32], [1115, 735, '#fff20b', 32], [880, 870, '#ff87ce', 30],
  [185, 825, '#fff20b', 28], [1460, 425, '#ff87ce', 32],
];
export const TREES = [[35, 85, 150, 210, '#ff87ce'], [1390, 105, 170, 225, '#fff20b'], [1440, 700, 130, 210, '#ff87ce'], [30, 850, 145, 210, '#1d55ff'], [500, 805, 110, 155, '#ff87ce']];
export const CLOUDS = [[356, -310, 140, 60], [1155, -285, 145, 60]];
export const WORLD_PATH = 'M300 1020Q255 900 300 750T315 560Q280 466 440 475L1110 475Q1320 440 1280 610L1265 850Q1150 945 910 810T670 670Q560 610 570 500M815 500V320M800 665Q840 660 895 695';
const rect = (x, y, w, h) => ({ x, y, w, h });
export const PAINT_SURFACES = [
  { id: 'radio-wall', key: 'paint_music_wall', bounds: rect(182, 365, 247, 105), walk: { x: 235, y: 525 } },
  { id: 'radio-roof', key: 'paint_music_roof', bounds: rect(182, 342, 247, 23), walk: { x: 305, y: 300 } },
  { id: 'concert-wall', key: 'paint_concert_wall', bounds: rect(1151, 340, 263, 138), walk: { x: 1200, y: 530 } },
  { id: 'concert-roof', key: 'paint_concert_roof', bounds: rect(1144, 304, 277, 25), walk: { x: 1280, y: 275 } },
  { id: 'home-wall', key: 'paint_home_wall', bounds: rect(722, 610, 156, 108), walk: { x: 800, y: 795 } },
  { id: 'home-roof', key: 'paint_home_roof', bounds: rect(712, 578, 176, 32), walk: { x: 800, y: 550 } },
  { id: 'stage-wall', key: 'paint_stage_wall', bounds: rect(530, 150, 555, 193), walk: { x: 640, y: 382 } },
  { id: 'stage-roof', key: 'paint_stage_roof', bounds: rect(530, 96, 555, 57), walk: { x: 800, y: 70 } },
  { id: 'sun', key: 'paint_sun', bounds: rect(190, -300, 102, 106), walk: { x: 241, y: -159 }, reach: 55, sky: true },
  ...CLOUDS.map(([x, y, w, h], i) => ({ id: `cloud-${i}`, key: 'paint_cloud', bounds: rect(x, y, w, h), walk: { x: x + w / 2, y: y + h + 38 }, reach: 60, sky: true })),
  ...TREES.map(([x, y, w, h], i) => ({ id: `tree-${i}`, key: 'paint_tree', bounds: rect(x, y, w, h * .71), walk: [{ x: 215, y: 200 }, { x: 1350, y: 215 }, { x: 1390, y: 790 }, { x: 205, y: 950 }, { x: 470, y: 875 }][i], reach: 65 })),
  ...FLOWERS.map(([x, y, , size], i) => ({ id: `flower-${i}`, key: 'paint_flower', bounds: rect(x, y, size, size * .7), walk: { x: x + size / 2, y: y + size + 20 }, reach: 42 })),
  { id: 'water', key: 'paint_water', bounds: rect(0, 1025, 1600, 75), walk: { x: 800, y: 1005 }, reach: 55 },
  { id: 'path', key: 'paint_path', walk: { x: 650, y: 650 }, ground: true },
  { id: 'grass', key: 'paint_grass', walk: { x: 1000, y: 600 }, ground: true },
  { id: 'sky', key: 'paint_sky', walk: { x: 800, y: SKY.top + 230 }, ground: true, sky: true },
];
export function cleanPaint(saved) {
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
  return Object.fromEntries(PAINT_SURFACES.filter(surface => /^#[a-f0-9]{6}$/i.test(saved[surface.id])).map(surface => [surface.id, saved[surface.id]]));
}
export const surfaceDistance = (position, surface) => surface.ground ? 0 : Math.hypot(position.x - Math.max(surface.bounds.x, Math.min(surface.bounds.x + surface.bounds.w, position.x)), position.y - Math.max(surface.bounds.y, Math.min(surface.bounds.y + surface.bounds.h, position.y)));
export const canPaintSurface = (position, surface) => !!surface && !!surface.sky === (position.y < 0) && surfaceDistance(position, surface) <= (surface.reach ?? 85);
const pathSegments = [];
const line = (a, b) => pathSegments.push([a, b]);
const curve = (a, c, b) => { let previous = a; for (let i = 1; i <= 30; i++) { const t = i / 30, u = 1 - t, next = { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }; line(previous, next); previous = next; } };
curve({ x: 300, y: 1020 }, { x: 255, y: 900 }, { x: 300, y: 750 });
curve({ x: 300, y: 750 }, { x: 345, y: 600 }, { x: 315, y: 560 });
curve({ x: 315, y: 560 }, { x: 280, y: 466 }, { x: 440, y: 475 });
line({ x: 440, y: 475 }, { x: 1110, y: 475 });
curve({ x: 1110, y: 475 }, { x: 1320, y: 440 }, { x: 1280, y: 610 });
line({ x: 1280, y: 610 }, { x: 1265, y: 850 });
curve({ x: 1265, y: 850 }, { x: 1150, y: 945 }, { x: 910, y: 810 });
curve({ x: 910, y: 810 }, { x: 670, y: 675 }, { x: 670, y: 670 });
curve({ x: 670, y: 670 }, { x: 560, y: 610 }, { x: 570, y: 500 });
line({ x: 815, y: 500 }, { x: 815, y: 320 });
curve({ x: 800, y: 665 }, { x: 840, y: 660 }, { x: 895, y: 695 });
function onPath(position) {
  return pathSegments.some(([a, b]) => {
    const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((position.x - a.x) * dx + (position.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(position.x - a.x - t * dx, position.y - a.y - t * dy) < 53;
  });
}
export function nearbyPaintSurface(position) {
  return PAINT_SURFACES.filter(surface => !surface.ground && canPaintSurface(position, surface)).sort((a, b) => surfaceDistance(position, a) - surfaceDistance(position, b))[0]
    || PAINT_SURFACES.find(surface => surface.id === (position.y < 0 ? 'sky' : onPath(position) ? 'path' : 'grass'));
}
export function paintAttributes(id, original, paint = {}, interactive = false, property = 'fill', label = '') {
  const color = /^#[a-f0-9]{6}$/i.test(paint[id]) ? paint[id] : original;
  return `data-paint-target="${id}" data-paint-property="${property}" ${property === 'color' ? `style="color:${color}"` : `${property}="${color}"`}${interactive ? ` tabindex="0" role="button" aria-label="${escapeXML(label)}" class="paint-surface"` : ''}`;
}
export function readableInk(color) {
  const rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722 > .3 ? '#101014' : '#ffffff';
}
export function createPaintPreview(root, id, color) {
  const undo = [];
  if (!PAINT_SURFACES.some(surface => surface.id === id) || !/^#[a-f0-9]{6}$/i.test(color)) return () => {};
  const change = (node, property, value) => {
    if (property === 'color') {
      const previous = node.style.color; node.style.color = value; undo.push(() => { node.style.color = previous; });
    } else {
      const previous = node.getAttribute(property); node.setAttribute(property, value);
      undo.push(() => { if (previous === null) node.removeAttribute(property); else node.setAttribute(property, previous); });
    }
  };
  for (const node of root.querySelectorAll(`[data-paint-target="${id}"]`)) {
    const property = node.dataset.paintProperty;
    if (['fill', 'stroke', 'color'].includes(property)) change(node, property, color);
  }
  for (const node of root.querySelectorAll(`[data-paint-ink="${id}"]`)) change(node, 'fill', readableInk(color));
  return () => { while (undo.length) undo.pop()(); };
}
export function paintCanMarkup(color) {
  return `<g stroke="#101014" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"><path d="M18 30V20q22-30 44 0v10" fill="none"/><path d="m10 25 7 58q23 10 46 0l7-58Z" fill="${color}"/><ellipse cx="40" cy="25" rx="30" ry="9" fill="#fffcee"/><ellipse cx="40" cy="25" rx="23" ry="5" fill="${color}" stroke-width="2"/><path d="M23 44v21" stroke="#ffffff" stroke-width="5" opacity=".7"/><path d="M48 40q-13 15 0 20 13-5 0-20Z" fill="#fffcee" stroke-width="2"/></g>`;
}
