import test from 'node:test';
import assert from 'node:assert/strict';
import { thumbDirection, thumbOffset, thumbBikeInput, THUMB_TRAVEL } from '../touch-controls.js';

test('a resting thumb is neutral and small movements steer in every direction', () => {
  const origin = { x: 160, y: 220 };
  assert.deepEqual(thumbDirection({ clientX: 164, clientY: 220 }, origin), { x: 1, y: 0 });
  assert.deepEqual(thumbDirection({ clientX: 160, clientY: 216 }, origin), { x: 0, y: -1 });
  assert.deepEqual(thumbDirection({ clientX: 161, clientY: 221 }, origin), { x: 0, y: 0 });
  assert.deepEqual(thumbDirection({ clientX: 161, clientY: 120 }, origin), { x: 0, y: -1 });
  const diagonal = thumbDirection({ clientX: 260, clientY: 320 }, origin);
  assert(Math.abs(diagonal.x - Math.SQRT1_2) < 1e-10); assert.equal(diagonal.x, diagonal.y);
  assert.deepEqual(thumbDirection(null, origin), { x: 0, y: 0 });
  assert.deepEqual(thumbDirection({ clientX: NaN, clientY: 120 }, origin), { x: 0, y: 0 });
});

test('thumb directions do not depend on the game camera and never speed up diagonals', () => {
  const finger = { clientX: 280, clientY: 170 };
  for (const origin of [{ x: 40, y: 170 }, { x: 400, y: 170 }, { x: 280, y: 350 }]) {
    const direction = thumbDirection(finger, origin); assert.equal(Math.hypot(direction.x, direction.y), 1);
    assert.equal(Math.sign(direction.x), Math.sign(finger.clientX - origin.x));
    assert.equal(Math.sign(direction.y), Math.sign(finger.clientY - origin.y));
  }
});

test('cycling keeps throttle, braking and lane steering distinct', () => {
  assert.deepEqual(thumbBikeInput({ x: 1, y: 0 }), { right: true, left: false, lane: 0 });
  assert.deepEqual(thumbBikeInput({ x: -1, y: 0 }), { right: false, left: true, lane: 0 });
  assert.deepEqual(thumbBikeInput({ x: .7, y: -.7 }), { right: true, left: false, lane: -1 });
  assert.deepEqual(thumbBikeInput({ x: .99, y: -.05 }), { right: true, left: false, lane: -1 });
  assert.deepEqual(thumbBikeInput({ x: 0, y: 1 }), { right: false, left: false, lane: 1 });
  assert.deepEqual(thumbBikeInput({ x: 0, y: 0 }), { right: false, left: false, lane: 0 });
});

test('the visible knob stays inside the small platform even when the finger leaves it', () => {
  const origin = { x: 55, y: 330 };
  assert.deepEqual(thumbOffset({ clientX: 55, clientY: 330 }, origin), { x: 0, y: 0 });
  assert.deepEqual(thumbOffset({ clientX: 61, clientY: 330 }, origin), { x: 6, y: 0 });
  for (const [dx, dy] of [[100, 0], [-100, 100], [0, -900]]) {
    const offset = thumbOffset({ clientX: origin.x + dx, clientY: origin.y + dy }, origin);
    assert(Math.abs(Math.hypot(offset.x, offset.y) - THUMB_TRAVEL) < 1e-10);
  }
});
