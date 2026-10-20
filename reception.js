import { HOUSE_DOORS, WORLD, move, planPath } from './game-core.js';
import { fireworksMarkup, FIREWORK_SECONDS } from './fireworks.js';

const home = HOUSE_DOORS.find(door => door.id === 'wardrobe');
export const RECEPTION_SPOTS = [{ x: 280, y: 100 }, { x: 440, y: 115 }, { x: 355, y: 185 }];
export const receptionAway = reception => reception?.guests.filter(guest => !guest.home).map(guest => guest.id) || [];
export function createReception(animals, pilot, rocket) {
  return { phase: 'arriving', elapsed: 0, partyTime: 0, fireworks: false, rocket: { ...rocket }, guests: animals.filter(animal => animal.id !== pilot).map((animal, i) => ({
    id: animal.id, position: { ...home.outside }, path: planPath(home.outside, RECEPTION_SPOTS[i], 'world', rocket), arrived: false, home: false, delay: i * .18,
  })) };
}
export function landReception(reception) { if (reception?.phase === 'arriving') { reception.phase = 'celebrating'; reception.partyTime = 0; reception.fireworks = true; } }
export function stopReceptionFireworks(reception) { if (reception) reception.fireworks = false; }
export function swapReceptionPilot(reception, previous, selected, position, scene) {
  const index = reception?.guests.findIndex(guest => guest.id === selected) ?? -1;
  if (index < 0 || previous === selected) return;
  const guest = reception.guests[index]; guest.id = previous; guest.delay = 0;
  if (scene !== 'world') { guest.home = true; guest.arrived = true; guest.path = []; return; }
  guest.home = false; guest.arrived = false; guest.position = { ...position };
  guest.path = planPath(position, reception.phase === 'leaving' ? home : RECEPTION_SPOTS[index], 'world', reception.rocket);
}
export function tickReception(reception, seconds, scene, player, riding = false, airborne = false) {
  if (!reception || reception.phase === 'done') return;
  const dt = Math.max(0, Math.min(.05, seconds)); reception.elapsed += dt;
  if (reception.phase === 'celebrating') {
    reception.partyTime += dt;
    if (!riding) stopReceptionFireworks(reception);
    if (scene !== 'world' || riding && airborne || !riding && Math.hypot(player.x - reception.rocket.x, player.y - reception.rocket.y) > 190) {
      reception.phase = 'leaving';
      for (const guest of reception.guests) { guest.path = planPath(guest.position, home, 'world', reception.rocket); guest.arrived = false; guest.delay = 0; }
    }
  }
  for (const guest of reception.guests) {
    if (guest.home || reception.elapsed < guest.delay) continue;
    let remaining = WORLD.speed * 1.25 * dt;
    while (guest.path.length && remaining > 0) {
      const point = guest.path[0], distance = Math.hypot(point.x - guest.position.x, point.y - guest.position.y);
      if (distance < 3) { guest.path.shift(); continue; }
      const step = Math.min(remaining, distance, WORLD.speed * .025), previous = guest.position;
      guest.position = move(previous, point.x - previous.x, point.y - previous.y, step / WORLD.speed, 'world', reception.rocket);
      if (Math.hypot(guest.position.x - previous.x, guest.position.y - previous.y) < .01) break;
      remaining -= step;
    }
    guest.arrived = !guest.path.length;
    if (guest.arrived && reception.phase === 'leaving') guest.home = true;
  }
  if (reception.phase === 'leaving' && reception.guests.every(guest => guest.home)) reception.phase = 'done';
}
export function receptionMarkup(reception, scene, reduced = false) {
  if (!reception || scene !== 'world') return '';
  const cheer = reception.phase === 'celebrating' && reception.partyTime < 4.5;
  return reception.guests.filter(guest => !guest.home).map(guest => `<g id="reception-${guest.id}" pointer-events="none" transform="translate(${guest.position.x.toFixed(2)} ${guest.position.y.toFixed(2)})" class="reception-guest ${!guest.arrived ? 'is-walking' : cheer && !reduced ? 'is-cheering' : ''}"><ellipse rx="25" ry="9" fill="#101014" opacity=".16"/><g class="reception-body"><use href="#animal-${guest.id}" x="-34" y="-77" width="68" height="82"/></g></g>`).join('')
    + (reception.phase === 'celebrating' && reception.fireworks ? fireworksMarkup({ x: reception.rocket.x, y: reception.rocket.y - 30, time: reception.partyTime % FIREWORK_SECONDS }, reduced, 'reception-fireworks') : '');
}
