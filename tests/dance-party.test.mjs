import test from 'node:test';
import assert from 'node:assert/strict';
import { ANIMALS } from '../content.js';
import { canStand, WORLD } from '../game-core.js';
import { isDanceTrack, danceGuests, guestPose, guestExitPose, createParty, syncParty, tickParty, dancePartyMarkup, discoLightPoses } from '../dance-party.js';
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

test('the song owns the party: room changes preserve it, pause freezes it and the ending sends guests out', () => {
  const p = createParty(), song = { id: 'tanzen' };
  syncParty(p, song, true, false, ANIMALS, 'cat'); tickParty(p, 10, true);
  assert(p.active); const elapsed = p.elapsed;
  syncParty(p, song, true, false, ANIMALS, 'cat'); assert.equal(p.elapsed, elapsed);
  syncParty(p, song, false, false, ANIMALS, 'cat'); tickParty(p, 1, false); assert.equal(p.elapsed, elapsed);
  syncParty(p, song, false, true, ANIMALS, 'cat'); assert(!p.active && p.departing);
  for (let i = 0; i < 3; i++) {
    for (let t = 0; t < 8; t += .05) { const pose = guestExitPose(p.exits[i], i, t); if (pose.visible) assert(canStand(pose.x, pose.y, WORLD.radius, 'radio')); }
  }
  tickParty(p, 10, false); assert(!p.departing);
  syncParty(p, song, false, true, ANIMALS, 'cat'); assert(!p.active && !p.departing, 'a finished cassette does not restart the party');
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

test('the spotlight heads, beams and floor pools move gently and respect reduced motion', () => {
  const a = discoLightPoses(0), b = discoLightPoses(2);
  assert.equal(a.beams.length, 4);
  for (let i = 0; i < 4; i++) {
    assert.notEqual(a.beams[i].angle, b.beams[i].angle);
    assert(Math.abs(a.beams[i].angle - b.beams[i].angle) < 50);
    const svg = dancePartyMarkup(ANIMALS, 'cat', undefined, 2);
    for (const part of ['head', 'beam']) assert(svg.includes(`id="party-${part}-${i}"`));
  }
  assert.notDeepEqual(a.pools, b.pools);
  assert.deepEqual(discoLightPoses(0, true), discoLightPoses(100, true));
});
