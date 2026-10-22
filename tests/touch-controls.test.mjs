import test from 'node:test';
import assert from 'node:assert/strict';
import { fingerDirection, fingerBikeInput } from '../touch-controls.js';

test('screen-space steering points towards a held finger and stops in the centre', () => {
  const origin = { x: 160, y: 220 };
  assert.deepEqual(fingerDirection({ clientX: 260, clientY: 220 }, origin), { x: 1, y: 0 });
  assert.deepEqual(fingerDirection({ clientX: 160, clientY: 120 }, origin), { x: 0, y: -1 });
  assert.deepEqual(fingerDirection({ clientX: 155, clientY: 226 }, origin), { x: 0, y: 0 });
  assert.deepEqual(fingerDirection({ clientX: 166, clientY: 120 }, origin), { x: 0, y: -1 });
  const diagonal = fingerDirection({ clientX: 260, clientY: 320 }, origin);
  assert(Math.abs(diagonal.x - Math.SQRT1_2) < 1e-10); assert.equal(diagonal.x, diagonal.y);
  assert.deepEqual(fingerDirection(null, origin), { x: 0, y: 0 });
  assert.deepEqual(fingerDirection({ clientX: NaN, clientY: 120 }, origin), { x: 0, y: 0 });
});

test('moving the viewport or the finger updates direction without speeding up diagonals', () => {
  const finger = { clientX: 280, clientY: 170 };
  for (const origin of [{ x: 40, y: 170 }, { x: 400, y: 170 }, { x: 280, y: 350 }]) {
    const direction = fingerDirection(finger, origin); assert.equal(Math.hypot(direction.x, direction.y), 1);
    assert.equal(Math.sign(direction.x), Math.sign(finger.clientX - origin.x));
    assert.equal(Math.sign(direction.y), Math.sign(finger.clientY - origin.y));
  }
});

test('cycling keeps throttle, braking and lane steering distinct', () => {
  assert.deepEqual(fingerBikeInput({ x: 1, y: 0 }), { right: true, left: false, lane: 0 });
  assert.deepEqual(fingerBikeInput({ x: -1, y: 0 }), { right: false, left: true, lane: 0 });
  assert.deepEqual(fingerBikeInput({ x: .7, y: -.7 }), { right: true, left: false, lane: -1 });
  assert.deepEqual(fingerBikeInput({ x: .99, y: -.05 }), { right: true, left: false, lane: -1 });
  assert.deepEqual(fingerBikeInput({ x: 0, y: 1 }), { right: false, left: false, lane: 1 });
  assert.deepEqual(fingerBikeInput({ x: 0, y: 0 }), { right: false, left: false, lane: 0 });
});
