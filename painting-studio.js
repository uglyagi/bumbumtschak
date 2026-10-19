import { landscapeMarkup } from './art.js';
import { PAINT_SURFACES, onPath } from './painting.js';
import { text } from './content.js';
import { escapeXML as esc } from './utils.js';

export const CANVAS = { x: 75, y: 115, scale: .64, w: 1024, h: 947.2 };
export const STUDIO_PAGE_SIZE = 18;
export const studioPages = palette => Math.max(1, Math.ceil(palette.length / STUDIO_PAGE_SIZE));
export const studioColors = (palette, page = 0) => palette.slice(page * STUDIO_PAGE_SIZE, (page + 1) * STUDIO_PAGE_SIZE).map((color, i) => ({ ...color, x: 1240 + i % 3 * 115, y: 275 + Math.floor(i / 3) * 90 }));
export const STUDIO_CONTROLS = { next: { x: 1355, y: 815 }, reset: { x: 1355, y: 895 }, close: { x: 1355, y: 990 } };
export const largeSurfaces = PAINT_SURFACES.filter(surface => !/^(tree|flower)-/.test(surface.id));
export function canvasPoint(position) { return { x: (position.x - CANVAS.x) / CANVAS.scale, y: (position.y - CANVAS.y) / CANVAS.scale - 380 }; }
export function studioSurfaceAt(position) {
  const point = canvasPoint(position);
  if (point.x < 0 || point.x > 1600 || point.y < -380 || point.y > 1100) return null;
  const surface = largeSurfaces.filter(s => s.bounds).sort((a, b) => Number(b.id.endsWith('roof')) - Number(a.id.endsWith('roof'))).find(s => point.x >= s.bounds.x && point.x <= s.bounds.x + s.bounds.w && point.y >= s.bounds.y && point.y <= s.bounds.y + s.bounds.h);
  return surface || largeSurfaces.find(s => s.id === (point.y < 12 ? 'sky' : point.y > 1040 ? 'water' : onPath(point) ? 'path' : 'grass'));
}
export function studioInteraction(position, palette, page = 0) {
  const color = studioColors(palette, page).find(c => Math.hypot(c.x - position.x, c.y - position.y) < 40);
  if (color) return { ...color, kind: 'studio-color', label: text('studio_take_color', { farbe: color.name }) };
  for (const [id, point] of Object.entries(STUDIO_CONTROLS)) if ((id !== 'next' || studioPages(palette) > 1) && Math.abs(point.x - position.x) < 140 && Math.abs(point.y - position.y) < 30) return { id, kind: 'studio-control', label: text(id === 'close' ? 'studio_close' : id === 'reset' ? 'paint_reset' : 'paint_next') };
  const surface = studioSurfaceAt(position);
  return surface ? { ...surface, kind: 'studio-paint', label: text(surface.key) } : null;
}
const label = (x, y, value, size = 20, extra = '') => `<text x="${x}" y="${y}" font-size="${size}" font-weight="800" ${extra}>${esc(value)}</text>`;
export function studioMarkup(paint, palette, studio) {
  const selected = palette.find(c => c.id === studio.color), colors = studioColors(palette, studio.page);
  return `<svg id="world-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1100" font-family="Trebuchet MS,Arial,sans-serif" aria-label="${esc(text('studio_title'))}">
    <rect width="1600" height="1100" fill="#fff6da"/>${label(75, 53, text('studio_title'), 29)}
    <rect x="60" y="100" width="1054" height="977" rx="8" fill="#d69c5b" stroke="#101014" stroke-width="7"/>
    ${landscapeMarkup(paint, 'studio-landscape', CANVAS.x, CANVAS.y, CANVAS.w)}
    <rect x="1170" y="100" width="380" height="977" rx="32" fill="#fffcee" stroke="#101014" stroke-width="5"/>
    ${label(1210, 151, text('studio_palette'), 24)}
    <circle cx="1235" cy="188" r="12" fill="${selected?.color || '#fffcee'}" stroke="#101014" stroke-width="2"/>
    ${label(1260, 194, selected?.name || text('studio_choose'), Math.min(16, 260 / ((selected?.name || text('studio_choose')).length * .6 || 1)))}
    ${studio.page === 0 ? ['studio_dark', 'studio_normal', 'studio_light'].map((key, i) => label(1240 + i * 115, 226, text(key), 15, 'text-anchor="middle"')).join('') : ''}
    ${colors.map(color => `<g data-studio-color="${color.id}" tabindex="0" role="button" aria-pressed="${selected?.id === color.id}" aria-label="${esc(text('studio_take_color', { farbe: color.name }))}"><circle cx="${color.x}" cy="${color.y}" r="29" fill="${color.color}" stroke="#101014" stroke-width="${selected?.id === color.id ? 6 : 3}"/>${label(color.x, color.y + 48, color.name, Math.min(14, 106 / (color.name.length * .6 || 1)), 'text-anchor="middle"')}</g>`).join('')}
    ${Object.entries(STUDIO_CONTROLS).filter(([id]) => id !== 'next' || studioPages(palette) > 1).map(([id,p]) => `<g data-studio-control="${id}" tabindex="0" role="button" aria-label="${esc(text(id === 'close' ? 'studio_close' : id === 'reset' ? 'paint_reset' : 'paint_next'))}"><rect x="${p.x - 150}" y="${p.y - 30}" width="300" height="60" rx="13" fill="${id === 'close' ? '#fff20b' : '#e8e0f6'}" stroke="#101014" stroke-width="3"/>${label(p.x, p.y + 7, text(id === 'close' ? 'studio_close' : id === 'reset' ? 'paint_reset' : 'paint_next'), 18, 'text-anchor="middle"')}</g>`).join('')}
    ${label(75, 84, text('studio_keys'), 16)}
    <g id="destination-marker" hidden=""></g><g id="player" class="studio-brush" pointer-events="none"><use id="player-use" hidden=""/>
      <circle r="16" fill="none" stroke="#ffffff" stroke-width="6"/><circle r="16" fill="none" stroke="#101014" stroke-width="2"/>
      <g transform="rotate(36)"><path d="M-7-28v-74q7-13 14 0v74Z" fill="#fff20b" stroke="#101014" stroke-width="3"/><path d="M-9-30h18v15H-9Z" fill="#c9ced4" stroke="#101014" stroke-width="3"/><path d="M-9-15Q-18 0 0 7q18-7 9-22Z" fill="${selected?.color || '#ffffff'}" stroke="#101014" stroke-width="3"/></g></g>
  </svg>`;
}
