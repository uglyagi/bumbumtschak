import test from 'node:test';
import assert from 'node:assert/strict';
import { resumeFromEarth, COURSE, ADVENTURE_PLANETS, SUN_DIAMETER, FINISH_DISTANCE, createAdventure, startAdventure, resizeAdventure, tickAdventure, meteorHits, landingPose, SUN_HOLIDAY_DURATION, INTRO_DURATION, INTRO_DEPARTURE_DURATION } from '../rocket-adventure.js';
import { CSS_PIXELS_PER_CM } from '../solar-system.js';
import { GROUND_ROCKET } from '../sky-world.js';
import { adventureMarkup, adventureShipPose, adventureCourseOpacity, adventureTrailPath, meteorMarkup } from '../adventure-art.js';

test('the journey visits every planet from Neptune to Mercury at an Earth 1 cm body scale', () => {
  assert.deepEqual(ADVENTURE_PLANETS.map(p => p.id), ['neptune', 'uranus', 'saturn', 'jupiter', 'mars', 'earth', 'venus', 'mercury']);
  const earth = ADVENTURE_PLANETS.find(p => p.id === 'earth'); assert.equal(earth.diameter, CSS_PIXELS_PER_CM);
  for (const planet of ADVENTURE_PLANETS) assert(Math.abs(planet.diameter / earth.diameter - planet.radiusKm / earth.radiusKm) < 1e-10);
  for (let i = 1; i < COURSE.length; i++) assert(COURSE[i].x - COURSE[i].diameter / 2 > COURSE[i - 1].x + COURSE[i - 1].diameter / 2);
  assert(SUN_DIAMETER / earth.diameter > 109 && SUN_DIAMETER / earth.diameter < 110);
});

test('the vertical departure waits for a difficulty; playing scrolls automatically and arrows move at a normalized speed', () => {
  const game = createAdventure(1200, 700, 13);
  for (let i = 0; i < 20; i++) tickAdventure(game, .05, 1, 1);
  assert.equal(game.phase, 'intro'); assert.equal(game.progress, 0); assert.equal(game.angle, 0);
  while (game.introTime < INTRO_DURATION) tickAdventure(game, .05);
  assert.equal(game.phase, 'ready'); assert.equal(game.angle, 90);
  tickAdventure(game, .05); assert.equal(game.progress, 0);
  startAdventure(game); const ship = { ...game.ship };
  tickAdventure(game, .05); assert(game.progress > 0); assert.deepEqual(game.ship, ship);
  tickAdventure(game, .05, 1, 1); assert(Math.abs(Math.hypot(game.ship.x - ship.x, game.ship.y - ship.y) - 15) < 1e-10);
  for (let i = 0; i < 20; i++) tickAdventure(game, .05);
  assert.equal(game.angle, 90);
  const pos = { ...game.ship }; resizeAdventure(game, 600, 350);
  assert.equal(game.ship.x, pos.x / 2); assert.equal(game.ship.y, pos.y / 2);
  assert.equal(ADVENTURE_PLANETS.find(p => p.id === 'earth').diameter, CSS_PIXELS_PER_CM, 'resizing the scene preserves physical planet diameters');
});

test('meteors vary in size, collide along their swept path and freeze a completed run', () => {
  const game = createAdventure(1200, 700, 7); startAdventure(game);
  const radii = [];
  for (let i = 0; i < 700; i++) {
    tickAdventure(game, .05);
    for (const meteor of game.meteors) radii.push(meteor.radius);
    game.meteors = [];
  }
  assert(Math.min(...radii) >= 20 && Math.min(...radii) < 32 && Math.max(...radii) > 56 && Math.max(...radii) <= 70);
  assert(meteorHits({ x: 80, y: 0 }, { x: -80, y: 0 }, 10), 'fast crossings cannot pass through the ship');
  assert(!meteorHits({ x: 80, y: 30 }, { x: -80, y: 30 }, 10));
  game.meteors = [{ id: 1, x: game.ship.x + 45, y: game.ship.y, radius: 10, vx: -1500, vy: 0, angle: 0, spin: 0 }];
  assert.equal(tickAdventure(game, .05), 'crash'); assert.equal(game.phase, 'crashed');
  const progress = game.progress; tickAdventure(game, .05, 1, 1); assert.equal(game.progress, progress);
  startAdventure(game); assert.equal(game.meteors.length, 0); assert.equal(game.progress, 0);
  game.progress = FINISH_DISTANCE; assert.equal(tickAdventure(game, .05), 'sun-arrived'); assert.equal(game.phase, 'sun-finale');
  assert.equal(game.sunTime, 0); assert.equal(game.meteors.length, 0);
  while (game.phase === 'sun-finale') tickAdventure(game, .05); assert.equal(game.phase, 'won'); assert.equal(game.sunTime, SUN_HOLIDAY_DURATION);
});

test('the full course is survivable by steering and ends on the Sun, with a safe gradual descent', () => {
  const game = createAdventure(1200, 700, 42); startAdventure(game);
  const passed = new Set();
  for (let i = 0; i < 12000 && game.phase === 'playing'; i++) {
    const directions = [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]];
    let best = -Infinity, chosen = [0, 0];
    for (const [dx, dy] of directions) {
      const length = Math.hypot(dx, dy) || 1, vx = dx / length * 300, vy = dy / length * 300;
      let clearance = 200;
      for (let t = .1; t <= 1.6; t += .1) {
        const travel = Math.min(t, .8), x = Math.max(65, Math.min(game.width - 65, game.ship.x + vx * travel)), y = Math.max(105, Math.min(game.height - 55, game.ship.y + vy * travel));
        for (const meteor of game.meteors) clearance = Math.min(clearance, Math.hypot(meteor.x + meteor.vx * t - x, meteor.y + meteor.vy * t - y) - meteor.radius - 24);
      }
      clearance -= .008 * (Math.abs(game.ship.x + vx * .4 - game.width * .35) + Math.abs(game.ship.y + vy * .4 - game.height * .5));
      if (clearance > best) { best = clearance; chosen = [dx, dy]; }
    }
    tickAdventure(game, .016, ...chosen);
    if(game.phase==='earth')resumeFromEarth(game);
    for (const planet of COURSE) if (game.progress > planet.x) passed.add(planet.id);
  }
  assert.equal(game.phase, 'sun-finale'); assert.equal(passed.size, 8);
  while (game.phase === 'sun-finale') tickAdventure(game, .05); assert.equal(game.phase, 'won');
  const from = { x: 900, y: -1600 }, first = landingPose(from, 0), halfway = landingPose(from, 2.25), end = landingPose(from, 4.5);
  assert.deepEqual(first, { ...from, done: false }); assert(halfway.y > from.y && halfway.y < GROUND_ROCKET.y);
  assert.deepEqual(end, { ...GROUND_ROCKET, done: true });
});

test('the rendered adventure contains all bodies, an upright pilot and isolated landscape references', () => {
  const game = createAdventure(1200, 700); startAdventure(game); game.angle = 90;
  const svg = adventureMarkup(game, 'monkey', { path: '#ff3935' });
  for (const planet of COURSE) assert(svg.includes(`data-planet="${planet.id}"`));
  assert(svg.includes('data-planet="sun"')); assert(svg.includes('id="rocket-hull" transform="rotate(90 0 -86)"'));
  assert(svg.includes('id="rocket-pilot-upright" transform="rotate(-90 0 -86)"'));
  const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]); assert.equal(ids.length, new Set(ids).size);
  for (const id of [...svg.matchAll(/(?:href="#|url\(#)([^"\)]+)/g)].map(m => m[1])) assert(ids.includes(id), `missing ${id}`);
});


test('meteors spawn twice as often with doubled sizes and all eight incoming directions', () => {
  const game = createAdventure(1200, 700, 33); startAdventure(game);
  assert.equal(game.nextMeteor, 2, 'the first meteor arrives in half the previous four-second wait');
  const directions = new Set();
  for (let i = 0; i < 24; i++) {
    game.nextMeteor = 0; game.meteors = []; tickAdventure(game, .016);
    assert.equal(game.meteors.length, 1);
    const meteor = game.meteors[0], interval = game.nextMeteor - game.time;
    assert(meteor.radius >= 20 && meteor.radius <= 70, 'the previous 10–35 pixel radii double');
    assert(interval >= .675 && interval <= 1.2, 'the previous 1.35–2.4 second intervals halve');
    directions.add([Math.sign(meteor.vx), Math.sign(meteor.vy)].join(','));
    let enters = false;
    for (let seconds = 0; seconds < 8; seconds += .05) {
      const x = meteor.x + meteor.vx * seconds, y = meteor.y + meteor.vy * seconds;
      if (x > 0 && x < game.width && y > 0 && y < game.height) enters = true;
    }
    assert(enters, 'each spawned trajectory crosses visible space');
    assert.equal([...meteorMarkup(meteor).matchAll(/<path /g)].length, 1, 'only the stone contour is drawn; there is no trailing path');
  }
  assert.deepEqual([...directions].sort(), ['-1,0', '1,0', '0,1', '0,-1', '-1,1', '1,-1', '1,1', '-1,-1'].sort());
});

test('collisions work from every direction and departed meteors are removed beyond every edge', () => {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, 1], [0, -1], [-1, 1], [1, -1], [1, 1], [-1, -1]]) {
    const game = createAdventure(1200, 700); startAdventure(game);
    game.meteors = [{ id: 1, x: game.ship.x - dx * 80, y: game.ship.y - dy * 80, radius: 20, vx: dx * 2200, vy: dy * 2200, angle: 0, spin: 0 }];
    assert.equal(tickAdventure(game, .05), 'crash', `incoming ${dx},${dy}`);
  }
  const game = createAdventure(1200, 700); startAdventure(game); game.nextMeteor = Infinity;
  game.meteors = [[-100, 350, -200, 0], [1300, 350, 200, 0], [600, -100, 0, -200], [600, 800, 0, 200]].map(([x, y, vx, vy], id) => ({ id, x, y, vx, vy, radius: 20, angle: 0, spin: 0 }));
  tickAdventure(game, .05); assert.equal(game.meteors.length, 0);
});


test('arrival leaves completely upwards, cuts to a fully visible horizontal start and starts without moving that scene', () => {
  for (const [width, height, scale] of [[1200, 700, .806], [390, 580, .65], [800, 450, 1.2]]) {
    const entry = { x: width * .4, y: height * .8, scale }, game = createAdventure(width, height, 1, entry);
    assert.deepEqual(adventureShipPose(game), entry);
    let previousY = entry.y;
    for (let i = 0; i <= 20; i++) {
      game.introTime = INTRO_DEPARTURE_DURATION * i / 20;
      const pose = adventureShipPose(game);
      assert.equal(pose.x, entry.x); assert.equal(pose.scale, entry.scale); assert(pose.y <= previousY);
      previousY = pose.y;assert.equal(adventureCourseOpacity(game),0,'the planet is never faded in while the departing rocket is visible');assert.equal(game.angle,0);
    }
    assert(previousY + 100 * scale < 0, 'the departing rocket is fully outside the image before the sideways entry');
    assert.equal(tickAdventure(game, .01), 'ready'); assert.equal(game.angle, 90);
    assert.equal(adventureCourseOpacity(game),1,'the entire game background appears on the same frame as the horizontal ship');
    const ready = adventureShipPose(game), svg = adventureMarkup(game, 'monkey');
    assert.equal(ready.x, game.ship.x); assert.equal(ready.y, game.ship.y); assert.equal(ready.scale, .72);
    assert(svg.includes('id="adventure-course" opacity="1"'));
    assert(svg.includes('id="bum-planet-crop"'));
    for (let i = 0; i < 100; i++) tickAdventure(game, .05);
    assert.equal(game.progress, 0); assert.equal(game.meteors.length, 0);
    startAdventure(game); assert.equal(game.angle, 90); assert.deepEqual(adventureShipPose(game), ready);
    assert(adventureMarkup(game, 'monkey').includes('id="adventure-course" opacity="1"'));
  }
});

test('reduced motion opens the same visible starting scene without the arrival animation', () => {
  const game = createAdventure(390, 580); game.reduced = true;
  assert.equal(tickAdventure(game, .016), 'ready'); assert.equal(game.angle, 90);
  const pose = adventureShipPose(game); assert.equal(pose.scale, .72); assert.equal(pose.x, game.ship.x); assert.equal(pose.y, game.ship.y); assert.equal(game.meteors.length, 0);
});

test('every bucket color draws a scrolling line along the flown path, while unladen rockets leave none', () => {
  for (const color of ['#fff20b', '#ff3935', '#4acb59', '#1d55ff', '#ff87ce', '#ffffff']) {
    const game = createAdventure(1200, 700, 5, null, color); startAdventure(game);
    game.nextMeteor = Infinity;
    for (let i = 0; i < 20; i++) tickAdventure(game, .05, 0, i < 10 ? -1 : 1);
    assert(game.paintTrail.length > 10); const first = game.paintTrail[0];
    const path = adventureTrailPath(game);
    assert(path.startsWith('M' + (first.x - game.progress).toFixed(1) + ' ' + first.y.toFixed(1)));
    assert(path.endsWith('L' + (game.ship.x - 62).toFixed(1) + ' ' + game.ship.y.toFixed(1)));
    assert(adventureMarkup(game, 'cat').includes('stroke="' + color + '" stroke-width="6"'));
    const frozen = adventureTrailPath(game); game.phase = 'ready'; tickAdventure(game, .05, 1, 1);
    assert.equal(adventureTrailPath(game), frozen, 'a paused flight does not extend its line');
    startAdventure(game); assert.equal(game.paintTrail.length, 1); assert.equal(game.trailColor, color);
  }
  for (const color of [null, 'url(https://example.com/paint)', '#fff']) {
    const game = createAdventure(1200, 700, 1, null, color); startAdventure(game); tickAdventure(game, .05);
    assert.equal(game.trailColor, null); assert.equal(game.paintTrail.length, 0); assert.equal(adventureTrailPath(game), '');
  }
});

test('the colored line stays bounded and survives resizing without affecting collisions', () => {
  const game = createAdventure(5000, 700, 5, null, '#ff3935'); startAdventure(game); game.nextMeteor = Infinity;
  for (let i = 0; i < 700; i++) tickAdventure(game, .05, 0, i % 100 < 50 ? -1 : 1);
  assert.equal(game.phase, 'playing'); assert(game.paintTrail.length <= 400);
  assert(game.paintTrail.every(point => point.x - game.progress >= -100));
  const before = game.paintTrail.map(point => ({ ...point })); resizeAdventure(game, 2500, 350);
  for (const [i, point] of game.paintTrail.entries()) {
    assert.equal(point.x - game.progress, (before[i].x - game.progress) / 2);
    assert.equal(point.y, before[i].y / 2);
  }
  game.meteors = [{ id: 1, x: game.ship.x, y: game.ship.y, radius: 20, vx: 0, vy: 0, angle: 0, spin: 0 }];
  assert.equal(tickAdventure(game, .016), 'crash', 'a bucket trail does not change meteor collisions');
});
