import test from 'node:test';
import assert from 'node:assert/strict';
import { worldMarkup } from '../art.js';
import { wreckageTransforms } from '../rocket-wreckage.js';
import { GROUND_ROCKET } from '../sky-world.js';

test('a falling crash points down and keeps its pilot upright until touching the meadow', () => {
  const falling = worldMarkup({}, false, 'sky', { position: { x: 365, y: -500 }, riding: true, airborne: true, damaged: true, broken: false, angle: 180 }, 'monkey');
  assert(falling.includes('id="rocket-hull" transform="rotate(180 0 -86)"'));
  assert(falling.includes('id="rocket-pilot-upright" transform="rotate(-180 0 -86)"'));
  assert(/<path class="rocket-flame"[^>]*hidden=""/.test(falling));
  assert(!falling.includes('id="rocket-wreckage"'));
});

test('impact spreads seven separate rocket pieces and they stay separated until repair', () => {
  const start = wreckageTransforms(0), mid = wreckageTransforms(.4), end = wreckageTransforms(.8);
  assert.equal(start.length, 7); assert(start.every(piece => piece.transform === 'translate(0.00 -28.00) rotate(0.00)'));
  assert.notDeepEqual(mid, start); assert.notDeepEqual(mid, end); assert.deepEqual(wreckageTransforms(5), end);
  assert.equal(new Set(end.map(piece => piece.transform)).size, 7);
  const broken = worldMarkup({}, false, 'world', { position: GROUND_ROCKET, damaged: true, broken: true });
  assert(broken.includes('id="rocket-wreckage"')); assert(!broken.includes('id="rocket-hull"'));
  for (const piece of end) assert(broken.includes(`id="rocket-debris-${piece.id}" transform="${piece.transform}"`));
  assert(broken.includes('data-station="rocket"'), 'the pieces remain an interactable repair target');
  const repaired = worldMarkup({}, false, 'world', { position: GROUND_ROCKET, damaged: false, broken: false });
  assert(repaired.includes('id="rocket-hull"')); assert(!repaired.includes('id="rocket-wreckage"'));
});
