import test from 'node:test';
import assert from 'node:assert/strict';
import { ANIMALS, text } from '../content.js';
import { WORLD, WORLD_SPAWN, HOUSE_DOORS, canStand, planPath, move, worldTouch } from '../game-core.js';
import { createFriends, savedFriends, isFriendsTrack, startFriends, releaseFriends, friendsAway, friendsTentNear, gatherFriends, swapFriendsPlayer, tickFriends, FRIEND_HIDEOUTS, FRIEND_CAMP, FRIEND_TENT, FRIEND_CAMP_PLAYER, FRIEND_CAMP_SPOTS } from '../friends-game.js';
import { friendsHiddenMarkup, friendsWorldMarkup, friendsConfettiMarkup } from '../friends-art.js';
import { worldMarkup } from '../art.js';

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function catchAll(friends) {
  for (const actor of friends.actors) tickFriends(friends, .016, 'world', { ...actor.position });
  assert.equal(friends.phase, 'celebrate');
}
function waitFor(friends, condition, player = FRIEND_CAMP_PLAYER, scene = 'world') {
  let steps = 0;
  while (!condition() && steps++ < 2500) tickFriends(friends, .05, scene, player);
  assert(condition(), friends.phase + ' finishes without blocked routes');
}
test('Beste Freunde starts with exactly the three other animals behind reachable tree trunks', () => {
  assert(isFriendsTrack({ id: 'freundschaft' })); assert(isFriendsTrack({ title: ' Beste Freunde ' })); assert(!isFriendsTrack({ id: 'hut' })); assert(!isFriendsTrack(null));
  for (const player of ANIMALS) {
    const friends = createFriends(); startFriends(friends, ANIMALS, player.id, WORLD_SPAWN);
    assert.deepEqual(friendsAway(friends), ANIMALS.filter(animal => animal.id !== player.id).map(animal => animal.id));
    assert.equal(friends.actors.length, 3); assert(friends.actors.every(actor => actor.status === 'hidden'));
    for (const actor of friends.actors) { assert(canStand(actor.position.x, actor.position.y)); assert(planPath(WORLD_SPAWN, actor.position).length); }
    assert(!friendsHiddenMarkup(friends).includes('href="#animal-' + player.id + '"'));
  }
  const world = worldMarkup(); assert(world.indexOf('id="friends-hidden"') < world.indexOf('href="#tree"'), 'hiding friends are painted behind the trunks');
});

test('normal walking can catch all three fleeing friends without walls, doors or unreachable edge pockets', () => {
  const friends = createFriends(); let player = { x: 305, y: 565 };
  startFriends(friends, ANIMALS, 'cat', player);
  for (const target of friends.actors) {
    let path = [], frames = 0, ran = false;
    while (!friends.caught.includes(target.id) && frames++ < 2000) {
      if (frames % 12 === 1 || !path.length) path = planPath(player, target.position);
      while (path.length && dist(player, path[0]) < 2) path.shift();
      if (path.length) { const p = path[0]; player = move(player, p.x - player.x, p.y - player.y, Math.min(.033, dist(player, p) / WORLD.speed)); }
      tickFriends(friends, .033, 'world', player);
      ran ||= target.status === 'running' && target.walking;
      assert.equal(worldTouch(player), null, 'chasing does not accidentally enter a house');
      for (const actor of friends.actors) assert(canStand(actor.position.x, actor.position.y), actor.id + ' respects collision bounds');
    }
    assert(ran, target.id + ' runs away on approach'); assert(friends.caught.includes(target.id), target.id + ' can be caught at ordinary walking speed');
  }
  assert.equal(friends.phase, 'celebrate'); assert.equal(friends.caught.length, 3);
  assert(friendsConfettiMarkup(.5, friends.celebration).includes('<rect'));
});

test('a caught friend follows the route around buildings while the other two remain in their hiding places', () => {
  const friends = createFriends(); let player = { ...FRIEND_HIDEOUTS[0] };
  startFriends(friends, ANIMALS, 'cat', player); tickFriends(friends, .016, 'world', player);
  assert.equal(friends.actors[0].status, 'following'); const origin = { ...friends.actors[0].position };
  const destination = { x: 500, y: 650 }, path = planPath(player, destination);
  let steps = 0;
  while (path.length && steps++ < 2000) {
    while (path.length && dist(player, path[0]) < 2) path.shift();
    if (!path.length) break;
    const p = path[0]; player = move(player, p.x - player.x, p.y - player.y, Math.min(.033, dist(player, p) / WORLD.speed));
    tickFriends(friends, .033, 'world', player);
    assert(canStand(friends.actors[0].position.x, friends.actors[0].position.y));
  }
  for (let i = 0; i < 100; i++) tickFriends(friends, .033, 'world', player);
  assert(dist(origin, friends.actors[0].position) > 200); assert(dist(player, friends.actors[0].position) < 100);
  assert.equal(friends.actors[1].status, 'hidden'); assert.equal(friends.actors[2].status, 'hidden');
});

test('after confetti, every friend walks to the water and builds a persistent tent with a campfire', () => {
  const friends = createFriends(); startFriends(friends, ANIMALS, 'horse', WORLD_SPAWN); catchAll(friends);
  waitFor(friends, () => friends.phase === 'building');
  assert(friends.unlocked); assert.equal(friends.campBuild, 0);
  waitFor(friends, () => friends.phase === 'camping');
  assert.equal(friends.campBuild, 1);
  for (const [i, actor] of friends.actors.entries()) assert(dist(actor.position, FRIEND_CAMP_SPOTS[i]) < 5);
  assert.deepEqual(savedFriends(friends), { tent: true });
  assert(friendsWorldMarkup(friends).includes('data-friends-tent'));
  assert(friendsWorldMarkup(friends).includes('friend-fire-flame'));
  const reloaded = createFriends(savedFriends(friends));
  assert(reloaded.unlocked); assert.equal(reloaded.phase, 'idle'); assert.equal(reloaded.actors.length, 0);
  assert(friendsWorldMarkup(reloaded).includes('friend-tent')); assert(!friendsTentNear(reloaded, WORLD_SPAWN));
});

test('walking away sends the friends home, and the tent invites them along real routes again', () => {
  const friends = createFriends({ tent: true }), player = { x: FRIEND_TENT.x, y: FRIEND_TENT.y - 75 };
  assert(friendsTentNear(friends, player)); assert(gatherFriends(friends, ANIMALS, 'dog', player)); assert(!gatherFriends(friends, ANIMALS, 'dog', player));
  const home = HOUSE_DOORS.find(door => door.id === 'wardrobe');
  for (const actor of friends.actors) assert.deepEqual(actor.position, home.outside);
  waitFor(friends, () => friends.phase === 'camping', player);
  assert.equal(friendsAway(friends).length, 3);
  tickFriends(friends, .05, 'world', { x: 1100, y: 850 }); assert.equal(friends.phase, 'returning');
  waitFor(friends, () => friends.phase === 'idle', { x: 1100, y: 850 });
  assert.equal(friendsAway(friends).length, 0); assert(friends.unlocked);
  assert(gatherFriends(friends, ANIMALS, 'dog', player)); waitFor(friends, () => friends.phase === 'camping', player);
  tickFriends(friends, .05, 'wardrobe', { x: 800, y: 740 }); assert.equal(friends.phase, 'returning');
});

test('changing the player never duplicates an animal and leaving another adventure keeps the earned tent', () => {
  const friends = createFriends({ tent: true }); startFriends(friends, ANIMALS, 'cat', WORLD_SPAWN);
  const first = friends.actors[0].id; swapFriendsPlayer(friends, 'cat', first);
  assert(!friends.actors.some(actor => actor.id === first)); assert(friends.actors.some(actor => actor.id === 'cat'));
  releaseFriends(friends); assert.equal(friends.phase, 'idle'); assert.equal(friendsAway(friends).length, 0); assert(friends.unlocked);
  assert.equal(createFriends({ tent: 'true' }).unlocked, false); assert.equal(createFriends(null).unlocked, false);
});
