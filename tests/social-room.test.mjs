import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLD, canStand, planPath, worldTouch } from '../game-core.js';
import { socialPads, contactLinks } from '../social.js';
import { ROOMS, nearbyInteraction, createCassetteState, throughExit } from '../rooms.js';
import { worldMarkup } from '../art.js';
import { roomMarkup } from '../room-art.js';

test('contacts live only in the compact mailbox room and keep every configured link', () => {
  assert.equal(socialPads('world').length, 0);
  assert.deepEqual(socialPads('social').map(pad => pad.id), contactLinks().map(link => link.id));
  assert(!worldMarkup().includes('data-social='));
  assert.equal((roomMarkup('social').match(/data-social=/g) || []).length, 5);
  assert.equal(worldTouch({ x: 1375, y: 867 }), null);
  assert.equal(nearbyInteraction('world', { x: 1375, y: 867 }, createCassetteState()).kind, 'enter-room');
});

test('every contact and the exit can be reached inside the small room without crossing a wall', () => {
  for (const pad of socialPads('social')) {
    assert(canStand(pad.x, pad.y, WORLD.radius, 'social'));
    assert(planPath(ROOMS.social.spawn, pad, 'social').length);
    const interaction = nearbyInteraction('social', pad, createCassetteState());
    assert.equal(interaction.id, pad.id);
    assert.equal(interaction.kind, pad.id === 'email' ? 'email' : 'external');
  }
  assert(!canStand(500, 800, WORLD.radius, 'social'));
  assert(!canStand(1100, 800, WORLD.radius, 'social'));
  assert(!canStand(800, 600, WORLD.radius, 'social'));
  assert(planPath(ROOMS.social.spawn, { x: 800, y: 1020 }, 'social').length);
  assert(throughExit('social', { x: 800, y: 1020 }));
});
