import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdventure, startAdventure, tickAdventure, FINISH_DISTANCE, SUN_HOLIDAY_DURATION, SUN_TRANSITION_DURATION, SUN_ZOOM_IN, SUN_BACKGROUND_SWAP, SUN_ZOOM_OUT_START, sunTransitionDuration, sunHolidayDuration, resizeAdventure, crashVibration } from '../rocket-adventure.js';
import { sunHolidayPose, sunHolidayMarkup } from '../sun-holiday.js';
import { adventureMarkup, adventureShipPose } from '../adventure-art.js';
import { worldMarkup } from '../art.js';

function arrive(width = 1200, height = 700) {
  const game = createAdventure(width, height); startAdventure(game); game.progress = FINISH_DISTANCE;
  assert.equal(tickAdventure(game, .016), 'sun-arrived'); return game;
}

test('Sun arrival freezes hazards and waits for landing, carrying, sunglasses and sunbathing before winning', () => {
  const game = arrive(), progress = game.progress;
  assert.equal(game.phase, 'sun-finale'); assert.equal(game.sunTime, 0); assert.equal(game.meteors.length, 0);
  assert(sunHolidayPose(game).airborne); assert(!sunHolidayPose(game).actorVisible);
  game.sunTime = SUN_TRANSITION_DURATION + 3.2; let pose = sunHolidayPose(game);
  assert(!pose.airborne && !pose.pilot && pose.actorVisible && pose.foldedChair && !pose.chairVisible);
  game.sunTime = SUN_TRANSITION_DURATION + 5.3; pose = sunHolidayPose(game); assert(!pose.foldedChair && pose.chairVisible && pose.chairOpen > .1);
  game.sunTime = SUN_TRANSITION_DURATION + 6.1; pose = sunHolidayPose(game); assert(pose.glasses && pose.glassesY > -48 && pose.glassesY < -25);
  game.sunTime = SUN_TRANSITION_DURATION + 7.5; pose = sunHolidayPose(game); assert.equal(pose.actor.angle, -62); assert.equal(pose.glassesY, -48);
  assert.equal(game.phase, 'sun-finale', 'the relaxed scene is visible before the dialog');
  while (game.sunTime < SUN_HOLIDAY_DURATION - .05) assert.equal(tickAdventure(game, .016, 1, 1), null);
  let result = null; while (game.phase === 'sun-finale') result = tickAdventure(game, .016);
  assert.equal(result, 'win'); assert.equal(game.sunTime, SUN_HOLIDAY_DURATION); assert.equal(game.progress, progress);
  tickAdventure(game, .05); assert.equal(game.sunTime, SUN_HOLIDAY_DURATION);
  startAdventure(game); assert.equal(game.sunTime, null); assert.equal(game.sunFrom, null); assert.equal(game.progress, 0);
});

test('all four animals use their actual artwork, leave an empty cockpit, and wear sunglasses on the lounger', () => {
  for (const animal of ['cat', 'dog', 'horse', 'monkey']) {
    const game = arrive(); game.sunTime = SUN_TRANSITION_DURATION + 8;
    const svg = sunHolidayMarkup(game, animal);
    assert(svg.includes(`<use href="#animal-${animal}" x="-34" y="-77" width="68" height="82" id="sun-actor-use"/>`));
    assert(new RegExp(`<use id="rocket-pilot"[^>]*hidden=""`).test(svg), 'the animal is no longer visible inside the rocket');
    assert(svg.includes('id="sun-sunglasses" transform="translate(0 -48)" >'));
    assert(!/id="sun-lounger"[^>]*hidden=/.test(svg));
    assert(/id="sun-folded-chair"[^>]*hidden=/.test(svg));
    const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]); assert.equal(ids.length, new Set(ids).size);
    for (const id of [...svg.matchAll(/(?:href="#|url\(#)([^"\)]+)/g)].map(match => match[1])) assert(ids.includes(id), `missing ${id}`);
  }
});

test('landing rotates the hull once, keeps the pilot upright and fits the Sun scene on a phone', () => {
  const game = arrive(390, 580); game.sunTime = SUN_TRANSITION_DURATION + 1.1;
  const pose = sunHolidayPose(game), svg = sunHolidayMarkup(game, 'cat');
  assert.equal(pose.shuttle.angle, 0);
  assert(/id="sun-shuttle" transform="[^"]*rotate\(0\.00\)/.test(svg));
  assert(svg.includes('id="rocket-hull" transform="rotate(0 0 -86)"'));
  assert(svg.includes('id="rocket-pilot-upright" transform="rotate(0 0 -86)"'));
  game.sunTime = SUN_TRANSITION_DURATION + 8; const relaxed = sunHolidayPose(game);
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

test('Sun approach starts at the flight pose and switches backgrounds only inside a full-screen cockpit close-up', () => {
  for (const [width, height] of [[1200, 700], [390, 580]]) for (const [x, y] of [[.2, .25], [.8, .8]]) {
    const game = createAdventure(width, height); startAdventure(game);
    game.ship = { x: width * x, y: height * y }; game.progress = FINISH_DISTANCE + width;
    game.meteors = [{ id: 1, x: 0, y: 0, radius: 25, vx: 100, vy: 0, angle: 10, spin: 20 }];
    const flight = adventureShipPose(game);
    assert.equal(tickAdventure(game, 0), 'sun-arrived');
    let pose = sunHolidayPose(game);
    assert.deepEqual(pose.shuttle, { ...flight, angle: 90 });
    assert.equal(pose.surfaceOpacity, 0); assert(pose.pilot && !pose.actorVisible && !pose.storyVisible);
    assert.equal(game.sunMeteors.length, 1, 'frozen hazards remain in the old backdrop until hidden by the zoom');
    const svg = adventureMarkup(game, 'dog');
    assert(svg.includes('id="sun-flight-background" opacity="1"')); assert(svg.includes('id="sun-surface-background" opacity="0"'));
    assert(!svg.includes('id="adventure-course" hidden=""'), 'the previous flight view stays visible at first');
    const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]); assert.equal(ids.length, new Set(ids).size);
    assert.equal((svg.match(/id="rocket-pilot"/g) || []).length, 1, 'the same pilot remains in the same cockpit');
    game.sunTime = SUN_BACKGROUND_SWAP - .001; assert.equal(sunHolidayPose(game).surfaceOpacity, 0);
    game.sunTime = SUN_BACKGROUND_SWAP; pose = sunHolidayPose(game); assert.equal(pose.surfaceOpacity, 1);
    for (const [cx, cy] of [[0, 0], [width, 0], [0, height], [width, height]]) {
      assert(Math.hypot(cx - pose.shuttle.x, cy - pose.shuttle.y) < 17 * pose.shuttle.scale, 'the cockpit covers every corner when scenery changes');
    }
    for (const boundary of [SUN_ZOOM_IN, SUN_BACKGROUND_SWAP, SUN_ZOOM_OUT_START, SUN_TRANSITION_DURATION]) {
      game.sunTime = boundary - 1e-6; const before = sunHolidayPose(game).shuttle;
      game.sunTime = boundary + 1e-6; const after = sunHolidayPose(game).shuttle;
      for (const key of ['x', 'y', 'scale', 'angle']) assert(Math.abs(before[key] - after[key]) < .01, key + ' remains continuous');
    }
    game.sunTime = SUN_TRANSITION_DURATION; pose = sunHolidayPose(game);
    assert(!pose.transitioning && pose.airborne && pose.pilot && !pose.actorVisible);
    const normalized = pose.shuttle.x / width; resizeAdventure(game, width * 1.2, height * .9);
    assert(Math.abs(sunHolidayPose(game).shuttle.x / game.width - normalized) < 1e-10);
    startAdventure(game); assert.equal(game.sunMeteors.length, 0);
  }
});

test('reduced motion uses a short gentle dissolve and still waits for the complete Sun story', () => {
  const game = arrive(390, 580); game.reduced = true; game.sunTime = sunTransitionDuration(game) / 2;
  let pose = sunHolidayPose(game);
  assert(pose.surfaceOpacity > 0 && pose.surfaceOpacity < 1);
  assert(pose.shuttle.scale <= 1.25 && pose.pilot && !pose.actorVisible);
  game.sunTime = sunTransitionDuration(game) + 8; pose = sunHolidayPose(game);
  assert(pose.glasses && pose.chairVisible && pose.actorVisible && !pose.pilot);
  while (game.phase === 'sun-finale') tickAdventure(game, .05);
  assert.equal(game.sunTime, sunHolidayDuration(game)); assert.equal(game.phase, 'won');
});
