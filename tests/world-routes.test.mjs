import assert from 'node:assert/strict';
import { WORLD, STATIONS, OBSTACLES, canStand, move, nearestStation, planPath } from '../game-core.js';

const spawn = { x: 800, y: 650 };
assert(canStand(spawn.x, spawn.y));
for (const s of STATIONS) {
  assert(canStand(s.x, s.y), `${s.id}: arrival must be walkable`);
  assert.equal(nearestStation(s)?.id, s.id, `${s.id}: correct interaction`);
}
const straight = move(spawn, 1, 0, .04), diagonal = move(spawn, 1, 1, .04);
assert(Math.abs(Math.hypot(diagonal.x - spawn.x, diagonal.y - spawn.y) - (straight.x - spawn.x)) < 1e-8, 'diagonals must not be faster');
assert.deepEqual(move(spawn, 0, 0, .04), spawn);
for (const o of OBSTACLES) assert(!canStand(o.x + o.w / 2, o.y + o.h / 2), 'solid prop');
assert(!canStand(0, 0)); assert(!canStand(1600, 1100));

assert.equal(planPath(spawn, { x: 300, y: 400 }).length, 0, 'do not route into radio');

function follow(start, destination) {
  const path = planPath(start, destination);
  assert(path.length, `path ${JSON.stringify(start)} -> ${destination.id || JSON.stringify(destination)}`);
  let position = { ...start }, frames = 0;
  while (path.length && frames++ < 2500) {
    const p = path[0];
    const distance = Math.hypot(p.x - position.x, p.y - position.y);
    if (distance < 5) { path.shift(); continue; }
    position = move(position, p.x - position.x, p.y - position.y, Math.min(.05, distance / WORLD.speed));
    assert(canStand(position.x, position.y), 'never enter a solid prop');
  }
  assert(!path.length, `route stalled: ${JSON.stringify(start)} -> ${destination.id || JSON.stringify(destination)} at ${JSON.stringify(position)}`);
  assert(Math.hypot(position.x - destination.x, position.y - destination.y) < 5, 'reach exact destination');
}
let routes = 0;
for (const start of [spawn, ...STATIONS]) for (const end of STATIONS) { follow(start, end); routes++; }
for (let x = 100; x < 1600; x += 175) for (let y = 100; y < 1050; y += 155) {
  if (!canStand(x, y)) continue;
  for (const end of STATIONS) { follow({ x, y }, end); routes++; }
}
console.log(`PASS: ${routes} complete walking routes, obstacle collisions, bounds, normalized diagonal speed and all eight station destinations.`);
