import { STATIONS, nearbyWorldObject } from './game-core.js';
import { socialPads } from './social.js';
import { TRACKS, BAND, ANIMALS, PALETTE, text } from './content.js';
import { paintSlots, paintPages, PAINT_RESET, PAINT_NEXT } from './painting.js';
import { GROUND_ROCKET, ROCKET_REACH } from './sky-world.js';

export const ROOMS = {
  radio: { color: '#ff87ce', station: 'radio' },
  concerts: { color: '#fff20b', station: 'concerts' },
  wardrobe: { color: '#ff87ce', station: 'wardrobe', spawn: { x: 800, y: 740 } },
};
export const ROOM_SPAWN = { x: 800, y: 870 };
export const EXIT = { x: 800, y: 980 };
export const RADIO = { x: 800, y: 550 };
export const SHELF_SWITCH = { id: 'shelf', x: 800, y: 740 };
export const ANIMAL_SPOTS = ['cat', 'dog', 'horse', 'monkey'].map((id, i) => ({ id, x: 300 + i % 2 * 160, y: 430 + Math.floor(i / 2) * 165 }));
export const PICTURE_SPOT = { id: 'painting', x: 1110, y: 690 };
export const SHELF_SIZE = 10;
// Six positions on the right, four on the left. A position belongs to no song.
export const TAPE_SLOTS = [
  { x: 1090, y: 435 }, { x: 1300, y: 435 },
  { x: 1090, y: 620 }, { x: 1300, y: 620 },
  { x: 1090, y: 805 }, { x: 1300, y: 805 },
  { x: 310, y: 630 }, { x: 520, y: 630 },
  { x: 310, y: 805 }, { x: 520, y: 805 },
];
export const slotsOnPage = page => TAPE_SLOTS.map((p, i) => ({ ...p, slot: page * SHELF_SIZE + i, page }));
export const tapePages = tapes => Math.max(1, Math.ceil(tapes.slots.length / SHELF_SIZE));
export function findTapeSlot(tapes, id) {
  const index = tapes.slots.indexOf(id);
  return index < 0 ? null : { ...TAPE_SLOTS[index % SHELF_SIZE], slot: index, page: Math.floor(index / SHELF_SIZE) };
}
export function roomFor(id) { return ROOMS[id] ? id : null; }
export const ROOM_PROPS = {
  radio: [], concerts: [{ id: 'concerts', x: 800, y: 570 }], wardrobe: [],
};
export function refreshBandWayfinding() {
  for (const [id, room] of Object.entries(ROOMS)) { room.title = text(`room_${id}`); room.kicker = text(`kicker_${id}`); }
  for (const station of STATIONS) {
    const member = BAND.find(item => item.id === station.id);
    if (member) { station.label = member.name; station.short = [member.role, member.sound].filter(Boolean).join(' · '); }
    else { station.label = text(`sign_${station.id}`); station.short = text(`station_${station.id}_short`); }
  }
  ROOM_PROPS.concerts[0].label = text('action_concerts');
}
refreshBandWayfinding();
export function createCassetteState() {
  return { carrying: null, loaded: null, slots: Array.from({ length: Math.max(1, Math.ceil(TRACKS.length / SHELF_SIZE)) * SHELF_SIZE }, (_, i) => TRACKS[i]?.id ?? null) };
}
export const tapeLocation = (state, id) => state.carrying === id ? 'carried' : state.loaded === id ? 'loaded' : state.slots.includes(id) ? 'ground' : 'missing';
export function cassetteAction(state, action) {
  const index = action.slot ?? state.slots.indexOf(action.id);
  if (action.type === 'pickup' && !state.carrying && Number.isInteger(index) && index >= 0 && state.slots[index] && (!action.id || state.slots[index] === action.id)) {
    const slots = [...state.slots], carrying = slots[index]; slots[index] = null;
    return { ...state, slots, carrying };
  }
  if (action.type === 'return' && state.carrying && Number.isInteger(action.slot) && action.slot >= 0 && action.slot < state.slots.length && !state.slots[action.slot]) {
    const slots = [...state.slots]; slots[action.slot] = state.carrying;
    return { ...state, slots, carrying: null };
  }
  if (action.type === 'insert' && state.carrying) return { ...state, carrying: state.loaded, loaded: state.carrying };
  if (action.type === 'eject' && state.loaded && !state.carrying) return { ...state, carrying: state.loaded, loaded: null };
  return state;
}
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function nearbyInteraction(scene, position, tapes, shelfPage = 0, paint = {}, rocketPosition = GROUND_ROCKET) {
  if (scene === 'sky') return null;
  const links = socialPads(scene).map(p => ({ ...p, kind: p.id === 'email' ? 'email' : 'external', distance: distance(position, p), label: p.id === 'email' ? text('action_email', { adresse: p.email }) : text('action_external', { kanal: p.label }) })).filter(p => p.distance <= p.reach);
  if (scene === 'world') {
    if (distance(position, rocketPosition) < ROCKET_REACH) return { id: 'rocket', kind: 'rocket-board', label: text('rocket_board') };
    const choices = STATIONS.filter(s => BAND.some(member => member.id === s.id)).map(s => ({ ...s, kind: 'read', label: text('action_member', { name: s.label }), distance: distance(position, s) })).filter(s => s.distance < 110);
    const object = nearbyWorldObject(position);
    if (object) choices.push({ ...object, kind: 'read', label: text(object.id === 'grownups' ? 'action_grownups' : 'sign_help') });
    return [...links, ...choices].sort((a, b) => a.distance - b.distance)[0] || null;
  }
  const candidates = [...links];
  if (distance(position, EXIT) < 95) candidates.push({ kind: 'exit', id: 'exit', label: text('back_world'), distance: distance(position, EXIT) });
  if (scene === 'wardrobe') for (const spot of ANIMAL_SPOTS) {
    const d = distance(position, spot), animal = ANIMALS.find(animal => animal.id === spot.id);
    if (d < 85) candidates.push({ ...spot, kind: 'change-character', label: text('action_change_character', { tier: animal.name }), distance: d });
  }
  if (scene === 'wardrobe') {
    if (distance(position, PICTURE_SPOT) < 85) candidates.push({ ...PICTURE_SPOT, kind: 'painting', label: text('studio_open'), distance: distance(position, PICTURE_SPOT) });
    for (const color of paintSlots(PALETTE, paint.page || 0)) {
      const d = distance(position, color);
      if (d < 70) candidates.push({ ...color, kind: paint.can === color.id ? 'return-paint' : 'take-paint', distance: d, label: text(paint.can === color.id ? 'paint_return' : 'paint_take', { farbe: color.name }) });
    }
    if (distance(position, PAINT_RESET) < 75) candidates.push({ ...PAINT_RESET, id: 'paint-reset', kind: 'reset-paint', label: text('paint_reset'), distance: distance(position, PAINT_RESET) });
    if (paintPages(PALETTE) > 1 && distance(position, PAINT_NEXT) < 75) candidates.push({ ...PAINT_NEXT, id: 'paint-next', kind: 'paint-page', label: text('paint_next'), distance: distance(position, PAINT_NEXT) });
  }
  if (scene === 'radio') {
    if (tapePages(tapes) > 1 && distance(position, SHELF_SWITCH) < 78) candidates.push({ ...SHELF_SWITCH, kind: 'shelf', label: text('action_shelf'), distance: distance(position, SHELF_SWITCH) });
    if (distance(position, RADIO) < 100) candidates.push({ kind: tapes.carrying ? 'insert' : tapes.loaded ? 'eject' : 'radio-help', id: tapes.carrying || tapes.loaded || 'radio', label: text(tapes.carrying ? 'action_insert' : tapes.loaded ? 'action_eject' : 'action_radio_help'), distance: distance(position, RADIO) });
    for (const slot of slotsOnPage(shelfPage)) {
      const d = distance(position, slot); if (d > 72) continue;
      const id = tapes.slots[slot.slot];
      if (tapes.carrying && !id) candidates.push({ kind: 'return', id: tapes.carrying, slot: slot.slot, label: text('action_return', { lied: TRACKS.find(t => t.id === tapes.carrying)?.title || '' }), distance: d });
      else if (!tapes.carrying && id) candidates.push({ kind: 'pickup', id, slot: slot.slot, label: text('action_pickup', { lied: TRACKS.find(t => t.id === id)?.title || '' }), distance: d });
    }
  }
  for (const p of ROOM_PROPS[scene] || []) if (distance(position, p) < 105) candidates.push({ kind: 'read', id: p.id, label: p.label, distance: distance(position, p) });
  return candidates.sort((a, b) => a.distance - b.distance)[0] || null;
}
export const throughExit = (scene, position) => !!ROOMS[scene] && Math.abs(position.x - EXIT.x) < 48 && position.y > 1004;
export function nextMenuIndex(current, key, count, columns = 1) {
  if (!count) return -1;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  const offset = key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : key === 'ArrowDown' ? columns : key === 'ArrowUp' ? -columns : 0;
  return (Math.max(0, current) + offset + count) % count;
}
