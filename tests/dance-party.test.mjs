import test from 'node:test';
import assert from 'node:assert/strict';
import { ANIMALS } from '../content.js';
import { canStand, WORLD } from '../game-core.js';
import { isDanceTrack, danceGuests, guestPose, dancePartyMarkup } from '../dance-party.js';
import { roomMarkup } from '../room-art.js';

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

test('the real music room already contains the disco scene and the three correct guest graphics', () => {
  for (const animal of ANIMALS) {
    const room = roomMarkup('radio', 0, undefined, animal.id);
    assert.equal([...room.matchAll(/id="dance-party"/g)].length, 1);
    assert(room.includes('id="disco-ball"'));
    const guests = [...room.matchAll(/data-party-guest="([^"]+)"/g)].map(match => match[1]);
    assert.deepEqual(guests, danceGuests(ANIMALS, animal.id).map(guest => guest.id));
    for (const id of guests) assert(room.includes(`id="animal-${id}"`), 'guest graphics exist in the same SVG');
  }
  assert(!roomMarkup('concerts').includes('id="dance-party"'));
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
