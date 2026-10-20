import test from 'node:test';
import assert from 'node:assert/strict';
import { MAZE, CHOCOLATE_ROWS, MAZE_SPAWN, MAZE_EXIT, MAZE_CHOCOLATES, canStandChocolate, chocolatePath, createChocolate, savedChocolate, chocolateSpeed, tickChocolate, takeChocolate, eatChocolate, newChocolateRun, collectChocolate, beginChocolateExit, advanceChocolateExit, isChocolateTrack, touchingChocolateDoor, CHOCOLATE_DOOR } from '../chocolate.js';
import { move, canStand, planPath, WORLD } from '../game-core.js';
import { chocolateMazeMarkup } from '../chocolate-art.js';
import { roomMarkup } from '../room-art.js';

test('the colorful maze has five distinct reachable bars and one permanently reachable exit', () => {
  assert.equal(MAZE_CHOCOLATES.length, 5); assert.equal(new Set(MAZE_CHOCOLATES.map(treat => treat.id)).size, 5);
  for (let row = 0; row < MAZE.rows; row++) for (let col = 0; col < MAZE.cols; col++) {
    const point = { x: MAZE.x + (col + .5) * MAZE.cell, y: MAZE.y + (row + .5) * MAZE.cell };
    if (CHOCOLATE_ROWS[row][col] === '1') { assert(!canStand(point.x, point.y, 18, 'chocolate')); continue; }
    assert(canStandChocolate(point.x, point.y)); assert(chocolatePath(point, MAZE_EXIT).length);
  }
  for (const treat of MAZE_CHOCOLATES) assert(planPath(MAZE_SPAWN, treat, 'chocolate').length > 10);
});

test('ordinary and double-speed walking follow every maze route without crossing walls', () => {
  for (const speed of [1, 2]) {
    let position = { ...MAZE_SPAWN };
    for (const treat of MAZE_CHOCOLATES) {
      const path = planPath(position, treat, 'chocolate'); let frames = 0;
      while (path.length && frames++ < 5000) {
        const point = path[0], distance = Math.hypot(point.x - position.x, point.y - position.y);
        if (distance < .1) { path.shift(); continue; }
        position = move(position, point.x - position.x, point.y - position.y, Math.min(.05, distance / (WORLD.speed * speed)), 'chocolate', null, speed);
        assert(canStandChocolate(position.x, position.y));
      }
      assert.equal(path.length, 0); assert(Math.hypot(position.x - treat.x, position.y - treat.y) < .1);
    }
  }
  assert(!canStandChocolate(MAZE.x - 1, MAZE.y)); assert(!canStandChocolate(NaN, 0));
});

test('each bar can be collected once and five bars freeze collection for the celebration', () => {
  const run = newChocolateRun();
  assert.equal(collectChocolate(run, MAZE_SPAWN), null);
  for (const [i, bar] of MAZE_CHOCOLATES.entries()) {
    assert.equal(collectChocolate(run, bar), i === 4 ? 'complete' : 'collected');
    assert.equal(collectChocolate(run, bar), null); assert.equal(run.collected.length, i + 1);
  }
  assert.equal(run.phase, 'celebrate');
});

test('automatic returns follow a clear maze path to the exit even when the music has stopped', () => {
  for (const start of [MAZE_SPAWN, ...MAZE_CHOCOLATES]) {
    const run = newChocolateRun(); assert(beginChocolateExit(run, start, 'song')); assert(!beginChocolateExit(run, start, 'song'));
    let position = { ...start }, done = false, frames = 0;
    while (!done && frames++ < 2000) { const next = advanceChocolateExit(run, position, .05); position = next.position; done = next.done; assert(canStandChocolate(position.x, position.y)); }
    assert(done); assert(Math.hypot(position.x - MAZE_EXIT.x, position.y - MAZE_EXIT.y) < .01);
  }
});

test('the drawer reward persists, one confirmation takes a bar, the next eats it and refreshes exactly twenty seconds at double speed', () => {
  const locked = createChocolate(); assert(!takeChocolate(locked)); assert(!eatChocolate(locked));
  const chocolate = createChocolate({ unlocked: true }); assert(takeChocolate(chocolate)); assert(!takeChocolate(chocolate)); assert.equal(chocolateSpeed(chocolate), 1);
  assert(eatChocolate(chocolate)); assert(!eatChocolate(chocolate)); assert.equal(chocolate.boost, 20); assert.equal(chocolateSpeed(chocolate), 2);
  tickChocolate(chocolate, 19.9); assert.equal(chocolateSpeed(chocolate), 2); assert(takeChocolate(chocolate)); assert(eatChocolate(chocolate)); assert.equal(chocolate.boost, 20);
  tickChocolate(chocolate, 20); assert.equal(chocolateSpeed(chocolate), 1); assert.equal(chocolate.boost, 0);
  assert.deepEqual(savedChocolate(chocolate), { unlocked: true });
  const reload = createChocolate(savedChocolate(chocolate)); assert(reload.unlocked); assert(!reload.carrying); assert.equal(reload.boost, 0);
});

test('only Schokolade opens the speaker; all collected graphics disappear and the reward chest is hidden before completion', () => {
  assert(isChocolateTrack({ id: 'schokolade' })); assert(isChocolateTrack({ title: ' SCHOKOLADE ' })); assert(isChocolateTrack({ id: 'song-66d899a2-18b0-4eba-ac96-b41a7aedc6ed', title: 'Neuer Name' })); assert(!isChocolateTrack({ id: 'hut' }));
  assert(touchingChocolateDoor(CHOCOLATE_DOOR)); assert(!touchingChocolateDoor({ x: 800, y: 550 }));
  const closed = roomMarkup('radio'), open = roomMarkup('radio', 0, undefined, 'cat', { chocolate: { active: true } });
  assert(!closed.includes('data-room-target="choco-door"')); assert(open.includes('data-room-target="choco-door"')); assert(open.includes('Schoko!'));
  assert(!roomMarkup('wardrobe').includes('data-room-target="chocolate-drawer"'));
  assert(roomMarkup('wardrobe', 0, undefined, 'cat', { chocolate: { unlocked: true } }).includes('data-room-target="chocolate-drawer"'));
  const run = newChocolateRun(), svg = chocolateMazeMarkup(run);
  const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]); assert.equal(ids.length, new Set(ids).size);
  for (const color of ['#ff87ce', '#1d55ff', '#4acb59', '#fff20b']) assert(svg.includes(color));
  collectChocolate(run, MAZE_CHOCOLATES[0]); assert(chocolateMazeMarkup(run).includes('id="maze-chocolate-1" transform="translate(' + MAZE_CHOCOLATES[0].x + ' ' + (MAZE_CHOCOLATES[0].y - 4) + ') scale(.66)" hidden=""'));
});
