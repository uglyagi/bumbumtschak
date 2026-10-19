import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdventure, startAdventure, tickAdventure, FINISH_DISTANCE, SUN_HOLIDAY_DURATION, crashVibration } from '../rocket-adventure.js';
import { sunHolidayPose, sunHolidayMarkup } from '../sun-holiday.js';
import { worldMarkup } from '../art.js';

function arrive(width = 1200, height = 700) {
  const game = createAdventure(width, height); startAdventure(game); game.progress = FINISH_DISTANCE;
  assert.equal(tickAdventure(game, .016), 'sun-arrived'); return game;
}

test('Sun arrival freezes hazards and waits for landing, carrying, sunglasses and sunbathing before winning', () => {
  const game = arrive(), progress = game.progress;
  assert.equal(game.phase, 'sun-finale'); assert.equal(game.sunTime, 0); assert.equal(game.meteors.length, 0);
  assert(sunHolidayPose(game).airborne); assert(!sunHolidayPose(game).actorVisible);
  game.sunTime = 3.2; let pose = sunHolidayPose(game);
  assert(!pose.airborne && !pose.pilot && pose.actorVisible && pose.foldedChair && !pose.chairVisible);
  game.sunTime = 5.3; pose = sunHolidayPose(game); assert(!pose.foldedChair && pose.chairVisible && pose.chairOpen > .1);
  game.sunTime = 6.1; pose = sunHolidayPose(game); assert(pose.glasses && pose.glassesY > -48 && pose.glassesY < -25);
  game.sunTime = 7.5; pose = sunHolidayPose(game); assert.equal(pose.actor.angle, -62); assert.equal(pose.glassesY, -48);
  assert.equal(game.phase, 'sun-finale', 'the relaxed scene is visible before the dialog');
  while (game.sunTime < SUN_HOLIDAY_DURATION - .05) assert.equal(tickAdventure(game, .016, 1, 1), null);
  let result = null; while (game.phase === 'sun-finale') result = tickAdventure(game, .016);
  assert.equal(result, 'win'); assert.equal(game.sunTime, SUN_HOLIDAY_DURATION); assert.equal(game.progress, progress);
  tickAdventure(game, .05); assert.equal(game.sunTime, SUN_HOLIDAY_DURATION);
  startAdventure(game); assert.equal(game.sunTime, null); assert.equal(game.sunFrom, null); assert.equal(game.progress, 0);
});

test('all four animals use their actual artwork, leave an empty cockpit, and wear sunglasses on the lounger', () => {
  for (const animal of ['cat', 'dog', 'horse', 'monkey']) {
    const game = arrive(); game.sunTime = 8;
    const svg = sunHolidayMarkup(game, animal);
    assert(svg.includes(`<use href="#animal-${animal}" x="-34" y="-77" width="68" height="82"/>`));
    assert(new RegExp(`<use id="rocket-pilot"[^>]*hidden=""`).test(svg), 'the animal is no longer visible inside the rocket');
    assert(svg.includes('id="sun-sunglasses" transform="translate(0 -48)" >'));
    assert(!/id="sun-lounger"[^>]*hidden=/.test(svg));
    assert(/id="sun-folded-chair"[^>]*hidden=/.test(svg));
    const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]); assert.equal(ids.length, new Set(ids).size);
    for (const id of [...svg.matchAll(/(?:href="#|url\(#)([^"\)]+)/g)].map(match => match[1])) assert(ids.includes(id), `missing ${id}`);
  }
});

test('landing rotates the hull once, keeps the pilot upright and fits the Sun scene on a phone', () => {
  const game = arrive(390, 580); game.sunTime = 1.1;
  const pose = sunHolidayPose(game), svg = sunHolidayMarkup(game, 'cat');
  assert.equal(pose.shuttle.angle, 45);
  assert(/id="sun-shuttle" transform="[^"]*rotate\(0\.00\)/.test(svg));
  assert(svg.includes('id="rocket-hull" transform="rotate(45 0 -86)"'));
  assert(svg.includes('id="rocket-pilot-upright" transform="rotate(-45 0 -86)"'));
  game.sunTime = 8; const relaxed = sunHolidayPose(game);
  assert(relaxed.shuttle.x - 45 * relaxed.scale > 0);
  assert(relaxed.chair.x + 80 * relaxed.scale < game.width);
  assert(relaxed.actor.y < game.height && relaxed.actor.x > 0);
});

test('a shared crash vibration moves the complete rocket and pilot and respects reduced motion', () => {
  assert.notEqual(crashVibration(.1), crashVibration(.12));
  assert.equal(crashVibration(1, true), 'translate(0 0) rotate(0 0 -86)');
  const svg = worldMarkup({}, false, 'sky', { position: { x: 365, y: -500 }, riding: true, airborne: true, damaged: true, angle: 180 }, 'dog');
  const vibration = svg.slice(svg.indexOf('id="rocket-vibration"'), svg.indexOf('id="destination-marker"'));
  assert(vibration.includes('id="rocket-hull"')); assert(vibration.includes('id="rocket-pilot-upright"')); assert(vibration.includes('id="rocket-pilot"'));
});
