import test from 'node:test';
import assert from 'node:assert/strict';
import { ANIMALS, text } from '../content.js';
import { WORLD, WORLD_SPAWN, HOUSE_DOORS, canStand, planPath, move, worldTouch } from '../game-core.js';
import { createFriends, savedFriends, isFriendsTrack, startFriends, releaseFriends, friendsAway, friendsTentNear, gatherFriends, swapFriendsPlayer, tickFriends, friendsCameraView, FRIEND_HIDEOUTS, FRIEND_CAMP, FRIEND_TENT, FRIEND_CAMP_PLAYER, FRIEND_CAMP_SPOTS } from '../friends-game.js';
import { friendsHiddenMarkup, friendsWorldMarkup, friendsCampfireMarkup, friendsConfettiMarkup } from '../friends-art.js';
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
  assert(friendsCampfireMarkup(friends).includes('friend-fire-flame'));
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

test('the campsite keeps the tent clear of the water and the flame clear of every seated character', () => {
  assert(FRIEND_TENT.x > 1400 && FRIEND_TENT.y < 1025, 'the tent sits at the far-right shore');
  assert(FRIEND_TENT.y + 14 < 1025, 'even the pegs stay above the water');
  const flame = { left: FRIEND_CAMP.x - 24, right: FRIEND_CAMP.x + 24, top: FRIEND_CAMP.y - 50, bottom: FRIEND_CAMP.y + 20 };
  for (const spot of [FRIEND_CAMP_PLAYER, ...FRIEND_CAMP_SPOTS]) {
    assert(canStand(spot.x, spot.y));
    assert(spot.x + 34 < flame.left || spot.x - 34 > flame.right || spot.y + 12 < flame.top || spot.y - 77 > flame.bottom, 'no seated figure covers the flame');
  }
  const world = worldMarkup();
  assert(world.indexOf('id="friends-fire"') < world.indexOf('id="player"'), 'the controlled animal is drawn in front of the fire');
});

test('the camping camera immediately fits the complete group on wide and narrow screens', () => {
  const friends = createFriends({ tent: true });
  gatherFriends(friends, ANIMALS, 'cat', { x: FRIEND_TENT.x, y: FRIEND_TENT.y - 75 });
  const player = { x: 120, y: 1010 };
  friends.actors.forEach((actor, i) => { actor.position = [{ x: 1480, y: 280 }, { x: 400, y: 480 }, { x: 960, y: 1020 }][i]; });
  for (const phase of ['celebrate', 'to-camp', 'gathering', 'building', 'camping']) {
    friends.phase = phase;
    for (const [w, h] of [[1480, 850], [390, 700], [1400, 360]]) {
      const view = friendsCameraView(friends, player, { w, h });
      assert(Math.abs(view.w / view.h - w / h) < 1e-9);
      assert(Math.abs(view.y + view.h / 2 - (player.y - WORLD.cameraOffsetY)) < 1e-9, 'the controlled animal stays centered while its friends remain visible');
      for (const point of [player, ...friends.actors.map(actor => actor.position)]) {
        assert(point.x - 34 >= view.x && point.x + 34 <= view.x + view.w);
        assert(point.y - 77 >= view.y && point.y + 12 <= view.y + view.h);
      }
      assert(FRIEND_TENT.x - 89 >= view.x && FRIEND_TENT.x + 119 <= view.x + view.w);
      assert(FRIEND_TENT.y - 94 >= view.y && FRIEND_TENT.y + 14 <= view.y + view.h);
    }
  }
  friends.phase = 'chasing'; assert.equal(friendsCameraView(friends, player, { w: 600, h: 700 }), null);
});

test('the expanded meadow is reachable on both sides while indoor walls keep their original bounds', () => {
  for (const point of [{ x: -120, y: 600 }, { x: 1730, y: 600 }]) {
    assert(canStand(point.x, point.y));
    const path = planPath(WORLD_SPAWN, point); assert(path.length, 'a walking route reaches the added meadow');
    for (const position of path) assert(canStand(position.x, position.y));
    assert(!canStand(point.x, point.y, WORLD.radius, 'radio'));
    assert(!canStand(point.x, point.y, WORLD.radius, 'wardrobe'));
    assert(!canStand(point.x, point.y, WORLD.radius, 'concerts'));
  }
  assert(!canStand(WORLD.left, 600)); assert(!canStand(WORLD.right, 600));
  let position = { x: 60, y: 600 };
  for (let i = 0; i < 80; i++) position = move(position, -1, 0, .016);
  assert(position.x < 0 && position.x > WORLD.left);
  const friends = createFriends(); startFriends(friends, ANIMALS, 'cat', WORLD_SPAWN);
  const actor = friends.actors[0]; actor.position = { x: -50, y: 600 }; actor.status = 'running';
  tickFriends(friends, .05, 'world', { x: 20, y: 600 });
  assert(actor.position.x < -50, 'a fleeing animal can actually use the new left meadow');
});

test('friends enter the music house before a choice and leave only after a mode is selected', async () => {
  const { beginFriendsMeeting, chooseFriendsMode, beginFriendsOutside, friendsPlayerLocked, friendsBlockBuildings } = await import('../friends-game.js');
  const f=createFriends(), player={x:800,y:550};
  beginFriendsMeeting(f,ANIMALS,'cat',player);
  assert.equal(f.phase,'meeting');assert(friendsPlayerLocked(f));assert(friendsBlockBuildings(f));
  assert(f.actors.every(a=>a.scene==='radio'&&a.position.y>1000));
  let ready=false;
  for(let i=0;i<300;i++) {
    const events=tickFriends(f,.05,'radio',player);ready ||=events.some(e=>e.type==='choice');
    for(const a of f.actors) assert(canStand(a.position.x,a.position.y,WORLD.radius,'radio'));
    if(ready) break;
  }
  assert(ready); assert.equal(f.phase,'choice');assert(f.actors.every(a=>dist(a.position,player)<145));
  assert(!chooseFriendsMode(f,'invalid'));assert(chooseFriendsMode(f,'catch'));
  for(let i=0;i<100;i++) tickFriends(f,.05,'radio',player);
  assert(f.actors.every(a=>a.position.y>1000));
  beginFriendsOutside(f,HOUSE_DOORS.find(d=>d.id==='radio').outside);
  for(let i=0;i<190;i++)tickFriends(f,.05,'world',player);
  assert.equal(f.phase,'countdown');assert(friendsPlayerLocked(f));
  for(let i=0;i<12;i++)tickFriends(f,.05,'world',player);
  assert.equal(f.phase,'chasing');assert(!friendsPlayerLocked(f));
});

test('caught friends consume the same corners and backtracking segments with 76/114 unit gaps', () => {
  const f=createFriends();let player={x:1000,y:800};startFriends(f,ANIMALS,'cat',player);
  f.actors[0].position={...player};f.actors[1].position={...player};
  tickFriends(f,.02,'world',player);assert.equal(f.caught.length,2);
  // A tight right-angle route followed in small steps, then reversed.
  const points=[{x:1100,y:800},{x:1100,y:1000},{x:1100,y:800},{x:1000,y:800}];
  const path=[{...player}], followers=f.actors.slice(0,2);
  for(const end of points) while(dist(player,end)>.1) {
    const d=dist(player,end), step=Math.min(4,d); player={x:player.x+(end.x-player.x)*step/d,y:player.y+(end.y-player.y)*step/d};path.push({...player});
    tickFriends(f,.02,'world',player);
    for(const a of followers) assert(path.some(p=>dist(p,a.position)<4.1),'followers remain on an actually walked segment');
  }
  for(let i=0;i<100;i++)tickFriends(f,.02,'world',player);
  assert(Math.abs(f.trail.at(-1).s-followers[0].progress-76)<.01);
  assert(Math.abs(followers[0].progress-followers[1].progress-38)<.01);
});

test('hiding has a ten-second head start, tree-only cover, an observant faster catcher and timed results', async () => {
  const {beginFriendsMeeting,chooseFriendsMode,beginFriendsOutside,toggleFriendsHide,friendsHidingRound}=await import('../friends-game.js');
  const f=createFriends();beginFriendsMeeting(f,ANIMALS,'cat',{x:800,y:550});f.phase='choice';chooseFriendsMode(f,'hide');
  let player={x:550,y:960};beginFriendsOutside(f,player);
  assert(friendsHidingRound(f));assert(!toggleFriendsHide(f,{x:1000,y:800}));assert(toggleFriendsHide(f,player));assert(!f.hidden.known);
  for(let i=0;i<202;i++) tickFriends(f,.05,'world',player);
  assert.equal(f.phase,'hiding');assert(f.hidden);
  const seeker=f.actors[0];seeker.position={x:1000,y:800};seeker.path=[];seeker.rethink=0;
  player={x:1100,y:800};const before={...seeker.position};tickFriends(f,.05,'world',player);
  assert(!f.hidden,'walking away reveals the player');assert(dist(before,seeker.position)>WORLD.speed*.05);
  seeker.position={...player};assert(tickFriends(f,.05,'world',player).some(e=>e.type==='hide-lost'));assert.equal(f.phase,'hide-lost');
  beginFriendsOutside(f,player);f.phase='hiding';seeker.position={x:500,y:960};player={x:550,y:960};
  assert(toggleFriendsHide(f,player));assert(f.hidden.known,'a nearby watching seeker remembers the hiding place');
  toggleFriendsHide(f,player);f.elapsed=44.99;seeker.position={x:1400,y:300};player={x:1000,y:800};
  assert(tickFriends(f,.02,'world',player).some(e=>e.type==='hide-won'));assert.equal(f.phase,'hide-won');
  releaseFriends(f);assert(!f.hidden);assert.equal(f.actors.length,0);
});
