import test from 'node:test';
import assert from 'node:assert/strict';
import { ANIMALS } from '../content.js';
import { canStand, WORLD } from '../game-core.js';
import { isDanceTrack, danceGuests, guestPose, dancePartyMarkup } from '../dance-party.js';

test('Tanzen activates the party and every selected animal is excluded from its guest list', () => {
  assert(isDanceTrack({ id: 'tanzen', title: 'Unser Tanzen' })); assert(isDanceTrack({ id: 'other', title: ' TANZEN ' }));
  assert(!isDanceTrack({ id: 'hut', title: 'Hut' })); assert(!isDanceTrack(null));
  for (const animal of ANIMALS) {
    const guests = danceGuests(ANIMALS, animal.id), svg = dancePartyMarkup(ANIMALS, animal.id);
    assert.equal(guests.length, 3); assert(guests.every(guest => guest.id !== animal.id));
    assert(!svg.includes(`data-party-guest="${animal.id}"`));
    for (const guest of guests) assert(svg.includes(`href="#animal-${guest.id}"`));
  }
});

test('three guests enter through the real doorway and reach accessible dance spots', () => {
  assert.deepEqual(guestPose(0, 0), { x: 800, y: 1040, visible: true, arrived: false });
  assert.equal(guestPose(2, .6).visible, false);
  for (let i = 0; i < 3; i++) {
    for (let seconds = 0; seconds <= 8; seconds += .05) {
      const pose = guestPose(i, seconds);
      if (pose.visible) assert(canStand(pose.x, pose.y, WORLD.radius, 'radio'), `${i}: ${seconds}`);
    }
    assert(guestPose(i, 8).arrived); assert(guestPose(i, 0, true).arrived, 'reduced motion skips the walk-in animation');
  }
});
