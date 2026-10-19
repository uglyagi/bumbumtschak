import test from 'node:test';
import assert from 'node:assert/strict';
import { SPACE, SKY, GROUND_ROCKET, flightScene, moveRocket } from '../sky-world.js';
import { PLANETS, CSS_PIXELS_PER_CM } from '../solar-system.js';
import { spaceMarkup, STARS } from '../space-art.js';
import { worldMarkup } from '../art.js';

test('eight named planets share the Mercury 1 cm diameter scale', () => {
  assert.deepEqual(PLANETS.map(p => p.id), ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']);
  assert.equal(PLANETS[0].diameter, CSS_PIXELS_PER_CM);
  assert(Math.abs(PLANETS[4].diameter / CSS_PIXELS_PER_CM - 28.65204918032787) < 1e-10);
  assert(PLANETS[2].diameter > PLANETS[1].diameter && PLANETS[6].diameter > PLANETS[7].diameter);
  const svg = spaceMarkup();
  for (const planet of PLANETS) {
    assert(svg.includes(`data-planet="${planet.id}"`));
    assert(svg.includes(`transform="scale(${planet.diameter / 2})"`));
    assert(planet.y - planet.diameter / 2 > SPACE.top && planet.y + planet.diameter / 2 < SPACE.bottom);
  }
  assert(STARS.length >= 500); assert(STARS.every(star => star.y < SPACE.bottom));
});

test('holding Up from the launch site reaches space in six to seven seconds', () => {
  let position = { ...GROUND_ROCKET }, seconds = 0;
  while (flightScene(position.y) !== 'space' && seconds < 8) { position = moveRocket(position, 0, -1, .01); seconds += .01; }
  assert(seconds >= 6 && seconds <= 7, String(seconds));
  assert.equal(flightScene(GROUND_ROCKET.y - 255 * 6), 'sky');
  assert.equal(flightScene(GROUND_ROCKET.y - 255 * 7), 'space');
  assert.equal(flightScene(SKY.spawn.y), 'sky');
});

test('the extended flight can reach past Neptune and descend through space, sky and ground', () => {
  let position = { ...GROUND_ROCKET };
  for (let i = 0; i < 3000; i++) position = moveRocket(position, 0, -1, .016);
  assert(position.y < PLANETS.at(-1).y); assert(position.y >= SPACE.top + 160);
  const scenes = new Set();
  for (let i = 0; i < 3000 && position.y < 70; i++) { position = moveRocket(position, 0, 1, .016); scenes.add(flightScene(position.y)); }
  assert.deepEqual([...scenes], ['space', 'sky', 'world']);
});


test('the climb and return flight reveal stars without any planets from the old vertical scene', () => {
  for (const scene of ['world', 'sky', 'space']) {
    const svg = worldMarkup({}, false, scene, { position: { x: 365, y: SPACE.bottom }, riding: true, airborne: true }, 'cat');
    assert(!svg.includes('data-planet=')); assert(svg.includes('id="space-world"'));
  }
});
