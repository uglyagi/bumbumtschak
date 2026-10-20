import { escapeXML } from './utils.js';
import { fireworksMarkup, FIREWORK_SECONDS } from './fireworks.js';

export const HAT_STAND = { id: 'hat-stand', scene: 'wardrobe', x: 700, y: 435 };
export const HAT_HIDEOUTS = [
  { id: 'left-tree', scene: 'world', x: 210, y: 275 },
  { id: 'flowers', scene: 'world', x: 1060, y: 610 },
  { id: 'river', scene: 'world', x: 1130, y: 995 },
  { id: 'right-tree', scene: 'world', x: 1370, y: 280 },
  { id: 'meadow', scene: 'world', x: 440, y: 855 },
  { id: 'path', scene: 'world', x: 1015, y: 870 },
  { id: 'stage-side', scene: 'world', x: 1130, y: 200 },
  { id: 'concert-corner', scene: 'concerts', x: 430, y: 755 },
  { id: 'home-corner', scene: 'wardrobe', x: 915, y: 585 },
  { id: 'cloud-side', scene: 'sky', x: 650, y: -220 },
  { id: 'high-sky', scene: 'sky', x: 1260, y: -620 },
];
export const HAT_WEAR_SECONDS = 4.5;
export const HAT_FLIGHT_SECONDS = 2.4;
export const HAT_RETURN_SECONDS = 1.15;
export const DEFAULT_HAT_COLOR = '#1d55ff';
export const HAT_FIREWORK_SECONDS = FIREWORK_SECONDS;
export const isHatTrack = track => !!track && (track.id === 'hut' || track.title?.trim().toLocaleLowerCase('de') === 'hut');
export const hatSpot = quest => HAT_HIDEOUTS.find(spot => spot.id === quest.spot) || null;
export const wearsHat = (quest, searchActive = true) => quest?.phase === 'perched' && searchActive || quest?.phase === 'unlocked' && quest.wearing;
export const animalHref = (animal, wearing = false) => `#${wearing ? 'dressed' : 'animal'}-${animal}`;
export function createHatQuest(saved) {
  const spot = HAT_HIDEOUTS.find(spot => spot.id === saved?.spot) || (['music-corner', 'music-left'].includes(saved?.spot) ? HAT_HIDEOUTS.find(spot => spot.id === 'meadow') : null);
  const phase = saved?.phase === 'unlocked' ? 'unlocked' : spot && ['perched', 'flying', 'lost'].includes(saved?.phase) ? saved.phase === 'flying' ? 'lost' : saved.phase : 'idle';
  return { phase, wearing: phase === 'unlocked' && saved.wearing === true, discovered: phase === 'unlocked' || saved?.discovered === true, color: /^#[a-f0-9]{6}$/i.test(saved?.color) ? saved.color : DEFAULT_HAT_COLOR, spot: spot?.id || null, elapsed: 0, flight: null, returning: null, celebration: null };
}
export const savedHatQuest = quest => ({ phase: quest.phase === 'flying' ? 'lost' : quest.phase, wearing: quest.phase === 'unlocked' && quest.wearing, discovered: quest.discovered, color: quest.color, spot: quest.spot });
export function startHatQuest(quest, track, playing, random = Math.random, restart = false) {
  if (!(quest.phase === 'idle' || quest.phase === 'unlocked' && restart) || !playing || !isHatTrack(track)) return false;
  const choices = quest.phase === 'unlocked' ? HAT_HIDEOUTS.filter(spot => spot.id !== quest.spot) : HAT_HIDEOUTS;
  quest.phase = 'perched'; quest.elapsed = 0; quest.wearing = false; quest.flight = null; quest.returning = null; quest.celebration = null;
  quest.spot = choices[Math.min(choices.length - 1, Math.max(0, Math.floor(random() * choices.length)))].id;
  return true;
}
export function tickHatQuest(quest, seconds, scene, origin, searchActive = true) {
  const dt = Math.max(0, Math.min(.05, seconds));
  if (quest.celebration) { quest.celebration.time += dt; if (quest.celebration.time >= HAT_FIREWORK_SECONDS) quest.celebration = null; }
  if (quest.returning) {
    quest.returning.time += dt;
    if (quest.returning.time >= HAT_RETURN_SECONDS) { quest.returning = null; return 'returned'; }
  }
  if (!searchActive || !['perched', 'flying'].includes(quest.phase)) return null;
  quest.elapsed += dt;
  if (quest.phase === 'perched' && quest.elapsed >= HAT_WEAR_SECONDS) {
    quest.phase = 'flying'; quest.elapsed = 0; quest.flight = { scene, x: origin.x, y: origin.y, direction: origin.x < 800 ? 1 : -1 }; return 'flying';
  }
  if (quest.phase === 'flying' && quest.elapsed >= HAT_FLIGHT_SECONDS) {
    quest.phase = 'lost'; quest.elapsed = 0; quest.flight = null; return 'lost';
  }
  return null;
}
export function hatInteraction(quest, scene, position, searchActive = true) {
  if (quest.returning) return null;
  if (quest.phase !== 'unlocked' && !searchActive) return null;
  const spot = quest.phase === 'lost' ? hatSpot(quest) : quest.phase === 'unlocked' ? HAT_STAND : null;
  if (!spot || spot.scene !== scene || Math.hypot(spot.x - position.x, spot.y - position.y) > (quest.phase === 'lost' ? 48 : 65)) return null;
  return { ...spot, id: quest.phase === 'lost' ? 'lost-hat' : HAT_STAND.id, kind: quest.phase === 'lost' ? 'find-hat' : quest.wearing ? 'return-hat' : 'wear-hat' };
}
export function findHat(quest, scene, position, searchActive = true) {
  if (hatInteraction(quest, scene, position, searchActive)?.kind !== 'find-hat') return false;
  quest.phase = 'unlocked'; quest.wearing = true; quest.discovered = true; quest.flight = null;
  quest.celebration = { scene, x: position.x, y: position.y - 75, time: 0 }; return true;
}
export function toggleHat(quest) { if (quest.phase !== 'unlocked' || quest.returning) return false; quest.wearing = !quest.wearing; return true; }
export function paintHat(quest, color) {
  if (quest.phase !== 'unlocked' || quest.wearing || quest.returning || !/^#[a-f0-9]{6}$/i.test(color)) return false;
  quest.color = color; return true;
}
export function returnHat(quest, scene, origin, destination = { x: HAT_STAND.x, y: HAT_STAND.y - 43 }) {
  if (quest.phase !== 'unlocked' || !quest.wearing) return false;
  quest.wearing = false;
  quest.returning = { scene, x: origin.x, y: origin.y, targetX: destination.x, targetY: destination.y, time: 0 };
  return true;
}
export function hatReturnPose(quest, reduced = false) {
  const flight = quest.returning;
  if (!flight) return null;
  const progress = Math.min(1, flight.time / HAT_RETURN_SECONDS), p = progress * progress * (3 - 2 * progress);
  if (reduced) return { x: flight.x, y: flight.y, angle: 0, scale: .62, opacity: 1 - p };
  return { x: flight.x + (flight.targetX - flight.x) * p, y: flight.y + (flight.targetY - flight.y) * p - Math.sin(progress * Math.PI) * 90, angle: Math.sin(progress * Math.PI * 2) * 16, scale: .62 + .18 * p, opacity: 1 };
}
// Blue hat and yellow band echo the Hut single cover. The brim sits at y = 0.
export const hatMarkup = (color = DEFAULT_HAT_COLOR) => `<g data-hat-color="" fill="${/^#[a-f0-9]{6}$/i.test(color) ? color : DEFAULT_HAT_COLOR}" stroke="#101014" stroke-width="3.5" stroke-linejoin="round"><ellipse cy="1" rx="32" ry="8"/><path d="M-21-1-17-24Q-9-33 0-24q10-9 18 0l4 23Z"/><path d="M-21-7Q0-2 21-7L22-1Q0 5-21-1Z" fill="#fff20b"/><path d="M-11-23q5-3 9 0" fill="none" stroke="#82c6ff" stroke-width="2" stroke-linecap="round"/></g>`;
export const colorHatMarkup = (markup, color) => markup.replace(/data-hat-color="" fill="#[a-f0-9]{6}"/gi, `data-hat-color="" fill="${/^#[a-f0-9]{6}$/i.test(color) ? color : DEFAULT_HAT_COLOR}"`);
export const HAT_HEADS = { cat: { x: 49, y: 27, scale: .9 }, dog: { x: 50, y: 29, scale: .9 }, horse: { x: 49, y: 29, scale: .84 }, monkey: { x: 50, y: 29, scale: .9 } };
export function dressedAnimalSymbol(animal) {
  const p = HAT_HEADS[animal];
  return `<symbol id="dressed-${animal}" viewBox="0 0 100 120"><use href="#animal-${animal}" width="100" height="120"/><g data-worn-hat="${animal}" transform="translate(${p.x} ${p.y}) scale(${p.scale})">${hatMarkup()}</g></symbol>`;
}
export function hatFlightPose(quest, reduced = false) {
  if (!quest.flight) return null;
  const t = quest.elapsed, p = quest.flight;
  return { x: p.x + p.direction * (t * 180 + Math.sin(t * 4) * 20), y: p.y - t * 120 - Math.sin(t * 2) * 30, angle: reduced ? 0 : p.direction * t * 180, scale: .62 * (1 - .65 * Math.min(1, t / HAT_FLIGHT_SECONDS)) };
}
const sameView = (a, b) => a === b || ['world', 'sky'].includes(a) && ['world', 'sky'].includes(b);
export function hatEffectsMarkup(quest, scene, reduced = false, findLabel = 'Hut aufheben', searchActive = true) {
  let result = '';
  const spot = hatSpot(quest);
  if (searchActive && quest.phase === 'lost' && spot && sameView(spot.scene, scene)) result += `<g data-hat-target="lost-hat" role="button" tabindex="0" aria-label="${escapeXML(findLabel)}" transform="translate(${spot.x} ${spot.y}) rotate(-14) scale(.38)">${hatMarkup(quest.color)}</g>`;
  const flying = hatFlightPose(quest, reduced);
  if (searchActive && flying && sameView(quest.flight.scene, scene)) result += `<g id="flying-hat" pointer-events="none" transform="translate(${flying.x.toFixed(2)} ${flying.y.toFixed(2)}) rotate(${flying.angle.toFixed(2)}) scale(${flying.scale.toFixed(3)})">${hatMarkup(quest.color)}</g>`;
  const returning = hatReturnPose(quest, reduced);
  if (returning && sameView(quest.returning.scene, scene)) result += `<g id="returning-hat" pointer-events="none" opacity="${returning.opacity.toFixed(3)}" transform="translate(${returning.x.toFixed(2)} ${returning.y.toFixed(2)}) rotate(${returning.angle.toFixed(2)}) scale(${returning.scale.toFixed(3)})">${hatMarkup(quest.color)}</g>`;
  const celebration = quest.celebration;
  if (celebration && sameView(celebration.scene, scene)) {
    result += fireworksMarkup(celebration, reduced, 'hat-fireworks');
  }
  return result;
}
