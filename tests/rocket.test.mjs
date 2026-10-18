import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD, WORLD_SPAWN, canStand, canLandRocket, rocketExitPosition, planPath, move } from '../game-core.js';
import { SKY, GROUND_ROCKET, moveRocket } from '../sky-world.js';
import { PAINT_SURFACES, canPaintSurface, nearbyPaintSurface } from '../painting.js';
import { worldMarkup } from '../art.js';

test('walking stops at the horizon; only the rocket can cross into the sky', () => {
  let walking = { x: 800, y: 70 }, flying = { ...walking };
  for (let i = 0; i < 100; i++) { walking = move(walking, 0, -1, .016); flying = moveRocket(flying, 0, -1, .016); }
  assert(walking.y >= WORLD.radius + 45); assert(flying.y < 0);
  assert.equal(planPath(WORLD_SPAWN, SKY.spawn).length, 0);
  assert.equal(canStand(SKY.spawn.x, SKY.spawn.y), false);
  const sky = PAINT_SURFACES.filter(surface => surface.sky);
  for (const surface of sky) assert.equal(canPaintSurface(walking, surface), false);
  assert.equal(nearbyPaintSurface({ x: 800, y: -400 }).id, 'sky');
  assert.equal(canPaintSurface(flying, PAINT_SURFACES.find(surface => surface.id === 'grass')), false);
});

test('landing requires free grass and a reachable place to step out', () => {
  assert.equal(canLandRocket({ x: 800, y: -100 }), false);
  assert.equal(canLandRocket({ x: 800, y: 1040 }), false, 'water cannot be a landing site');
  assert.equal(canLandRocket({ x: 800, y: 300 }), false, 'the stage cannot be a landing site');
  assert.equal(canLandRocket({ x: 305, y: 430 }), false, 'the music house cannot be a landing site');
  for (const point of [GROUND_ROCKET, { x: 800, y: 70 }, { x: 1100, y: 650 }, { x: 120, y: 450 }]) {
    assert(canLandRocket(point), JSON.stringify(point));
    const exit = rocketExitPosition(point);
    assert(exit && canStand(exit.x, exit.y, WORLD.radius, 'world', point));
  }
  const parked = { x: 800, y: 70 };
  assert(canStand(1130, 270, WORLD.radius, 'world', parked), 'the former launch site has no invisible rocket after landing elsewhere');
});

test('the rendered flight keeps the selected animal inside and disables ground destinations', () => {
  const rocket = { position: { x: 600, y: -200 }, riding: true, airborne: true };
  const svg = worldMarkup({}, true, 'sky', rocket, 'monkey');
  assert(svg.includes('<use id="rocket-pilot" href="#animal-monkey"'));
  assert(!svg.includes('data-station="panda"')); assert(!svg.includes('data-social="facebook"'));
  const interactive = [...svg.matchAll(/data-paint-target="([^"]+)"[^>]*tabindex="0"/g)].map(match => match[1]);
  assert.deepEqual(interactive.sort(), ['sky', 'sun', 'cloud-0', 'cloud-1'].sort());
});
