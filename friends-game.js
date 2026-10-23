import { WORLD, HOUSE_DOORS, canStand, move, planPath } from './game-core.js';
import { GROUND_ROCKET } from './sky-world.js';
import { TREES } from './painting.js';

export const FRIEND_HIDEOUTS = [{ x: 105, y: 280 }, { x: 1475, y: 270 }, { x: 550, y: 960 }];
export const FRIEND_CAMP = { x: 1625, y: 940 };
export const FRIEND_TENT = { x: 1450, y: 965 };
export const FRIEND_CAMP_PLAYER = { x: 1710, y: 1020 };
export const FRIEND_CAMP_SPOTS = [{ x: 1550, y: 980 }, { x: 1620, y: 860 }, { x: 1715, y: 920 }];
export const FRIEND_CAMP_FADE_SECONDS = 5;
export const FRIEND_CATCH_RADIUS = 34;
export const FRIEND_NOTICE_RADIUS = 125;
const home = HOUSE_DOORS.find(door => door.id === 'wardrobe');
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const isFriendsTrack = track => !!track && (track.id === 'freundschaft' || /^(beste\s+freunde|freundschaft)$/i.test(track.title?.trim() || ''));
export const savedFriends = friends => ({ tent: friends.unlocked });
export function createFriends(saved) {
  return { phase: 'idle', unlocked: saved?.tent === true, actors: [], caught: [], trail: [], elapsed: 0, celebration: null, pilot: null, campBuild: 1 };
}
export const friendsBlockBuildings = friends => ['meeting', 'choice', 'leaving', 'countdown', 'hide-countdown', 'hiding', 'hide-won', 'hide-lost', 'chasing', 'celebrate', 'to-camp', 'building'].includes(friends?.phase);
export const friendsPlayerLocked = friends => ['meeting', 'choice', 'countdown', 'hide-won', 'hide-lost'].includes(friends?.phase);
export const friendsHidingRound = friends => ['hide-countdown', 'hiding'].includes(friends?.phase);
export const FRIEND_FOLLOW_GAP = 76;
export const FRIEND_CHAIN_GAP = 38;
export const friendsAway = friends => friends?.actors.filter(actor => actor.status !== 'home').map(actor => actor.id) || [];
function actorFor(id, position, status, index) {
  return { id, position: { ...position }, status, index, path: [], goal: null, rethink: 0, runningTime: 0, walking: false, delay: 0 };
}
export function startFriends(friends, animals, pilot, position) {
  friends.phase = 'chasing'; friends.hidden = null; friends.pilot = pilot; friends.elapsed = 0; friends.caught = []; friends.celebration = null; friends.trail = [{ ...position, s: 0 }];
  friends.actors = animals.filter(animal => animal.id !== pilot).slice(0, 3).map((animal, i) => actorFor(animal.id, FRIEND_HIDEOUTS[i], 'hidden', i));
}
export function releaseFriends(friends) {
  friends.phase = 'idle'; friends.hidden = null; friends.actors = []; friends.caught = []; friends.trail = []; friends.celebration = null;
}
export function swapFriendsPlayer(friends, previous, selected) {
  if (previous === selected) return;
  const actor = friends.actors.find(actor => actor.id === selected);
  if (actor) {
    actor.id = previous;
    friends.caught = friends.caught.map(id => id === selected ? previous : id);
  }
  friends.pilot = selected;
}
export function friendsTentNear(friends, position) {
  if (!friends.unlocked) return false;
  const dx = position.x - Math.max(FRIEND_TENT.x - 76, Math.min(FRIEND_TENT.x + 109, position.x));
  const dy = position.y - Math.max(FRIEND_TENT.y - 94, Math.min(FRIEND_TENT.y, position.y));
  return Math.hypot(dx, dy) <= 45;
}
function moveActor(actor, dx, dy, amount, rocket, scene = 'world') {
  let remaining = amount;
  while (remaining > .01) {
    const step = Math.min(remaining, WORLD.speed * .025), old = actor.position;
    actor.position = move(old, dx, dy, step / WORLD.speed, scene, rocket);
    if (distance(old, actor.position) < .01) break;
    remaining -= step;
  }
}
function followPath(actor, amount, rocket, scene = 'world') {
  const before = { ...actor.position };
  while (actor.path.length && amount > .01) {
    const point = actor.path[0], d = distance(point, actor.position);
    if (d < 2) { actor.path.shift(); continue; }
    const step = Math.min(amount, d, WORLD.speed * .025), old = actor.position;
    moveActor(actor, point.x - old.x, point.y - old.y, step, rocket, scene);
    if (distance(old, actor.position) < .01) { actor.rethink = 0; break; }
    amount -= step;
  }
  actor.walking = distance(before, actor.position) > .05;
}
function route(actor, point, rocket) {
  actor.goal = { ...point }; actor.path = planPath(actor.position, point, 'world', rocket); actor.rethink = .5;
}
function flee(actor, player, dt, rocket) {
  const before = actor.position, angle = Math.atan2(before.y - player.y, before.x - player.x);
  let best = null, score = -Infinity;
  for (const turn of [0, .45, -.45, .9, -.9, 1.5, -1.5, 2.2, -2.2, Math.PI]) {
    const dx = Math.cos(angle + turn), dy = Math.sin(angle + turn);
    const next = move(before, dx, dy, dt * .66, 'world', rocket), moved = distance(before, next);
    const inDoor = HOUSE_DOORS.some(door => Math.abs(next.x - door.x) <= door.halfWidth + WORLD.radius + 3 && next.y >= door.top - WORLD.radius - 3 && next.y <= door.bottom + WORLD.radius + 3);
    if (inDoor || !canStand(next.x, next.y, WORLD.radius + 7, 'world', rocket)) continue;
    const value = distance(next, player) + moved * .25 - Math.abs(turn) * .2;
    if (moved > .01 && value > score) { best = next; score = value; }
  }
  if (best) actor.position = best;
  actor.walking = !!best; actor.runningTime += dt;
}
export function beginFriendsMeeting(friends, animals, pilot, player) {
  releaseFriends(friends);
  friends.phase = 'meeting'; friends.pilot = pilot; friends.elapsed = 0;
  const offsets = [{ x: -65, y: 70 }, { x: 65, y: 70 }, { x: 0, y: 125 }];
  friends.actors = animals.filter(animal => animal.id !== pilot).slice(0, 3).map((animal, i) => {
    const actor = actorFor(animal.id, { x: 800, y: 1035 }, 'meeting', i);
    actor.scene = 'radio'; actor.delay = i * .55;
    const candidates = [offsets[i], { x: (i - 1) * 65, y: -90 }, { x: (i - 1) * 65, y: 0 }];
    for (const offset of candidates) {
      const target = { x: player.x + offset.x, y: player.y + offset.y };
      if (!canStand(target.x, target.y, WORLD.radius, 'radio')) continue;
      const path = planPath(actor.position, target, 'radio');
      if (path.length) { actor.goal = target; actor.path = path; break; }
    }
    if (!actor.goal) { actor.goal = { x: 735 + i * 65, y: 900 }; actor.path = planPath(actor.position, actor.goal, 'radio'); }
    return actor;
  });
}
export function chooseFriendsMode(friends, mode) {
  if (friends.phase !== 'choice' || !['catch', 'hide'].includes(mode)) return false;
  friends.mode = mode; friends.phase = 'leaving'; friends.elapsed = 0;
  for (const actor of friends.actors) {
    actor.status = 'leaving'; actor.path = planPath(actor.position, { x: 800, y: 1045 }, 'radio');
  }
  return true;
}
export function beginFriendsOutside(friends, player, rocket = GROUND_ROCKET) {
  friends.phase = friends.mode === 'hide' ? 'hide-countdown' : 'countdown';
  friends.elapsed = 0; friends.hidden = null; friends.caught = []; friends.trail = [{ ...player, s: 0 }];
  const exit = HOUSE_DOORS.find(door => door.id === 'radio').outside;
  friends.actors.forEach((actor, i) => {
    actor.scene = 'world'; actor.position = { ...exit }; actor.status = friends.mode === 'hide' && i === 0 ? 'seeker' : 'escaping';
    actor.searchIndex = 0; actor.lastSeen = null;
    route(actor, FRIEND_HIDEOUTS[i], rocket);
  });
}
export function friendHideSpot(player, rocket = GROUND_ROCKET) {
  return TREES.map(([x, y, w, h], i) => ({ x: x + w / 2, y: y + h - 8, tree: i }))
    .find(point => distance(player, point) < 85 && canStand(player.x, player.y, WORLD.radius, 'world', rocket)) || null;
}
function visible(a, b, rocket) {
  const d = distance(a, b);
  if (d > 360) return false;
  for (let s = 15; s < d - 18; s += 15) {
    if (!canStand(a.x + (b.x - a.x) * s / d, a.y + (b.y - a.y) * s / d, 3, 'world', rocket)) return false;
  }
  return true;
}
export function toggleFriendsHide(friends, player, rocket = GROUND_ROCKET) {
  if (!friendsHidingRound(friends)) return false;
  if (friends.hidden) { friends.hidden = null; return true; }
  const spot = friendHideSpot(player, rocket);
  if (!spot) return false;
  const seeker = friends.actors[0];
  friends.hidden = { ...player, tree: spot.tree, known: friends.phase === 'hiding' && visible(seeker.position, player, rocket) };
  return true;
}
function tickFriendsRound(friends, dt, scene, player, rocket, events) {
  if (['meeting', 'choice', 'leaving'].includes(friends.phase)) {
    if (scene !== 'radio') { releaseFriends(friends); return true; }
    if (friends.phase === 'choice') return true;
    for (const actor of friends.actors) {
      if (friends.elapsed >= actor.delay) followPath(actor, WORLD.speed * 1.15 * dt, rocket, 'radio');
    }
    if (friends.phase === 'meeting' && friends.actors.every(actor => !actor.path.length)) {
      friends.phase = 'choice'; events.push({ type: 'choice' });
    }
    return true;
  }
  if (['countdown', 'hide-countdown'].includes(friends.phase)) {
    for (const actor of friends.actors) {
      if (actor.status !== 'seeker') followPath(actor, WORLD.speed * 1.3 * dt, rocket);
    }
    if (friends.elapsed >= 10) {
      friends.phase = friends.mode === 'hide' ? 'hiding' : 'chasing'; friends.elapsed = 0;
      for (const actor of friends.actors) if (actor.status !== 'seeker') actor.status = 'hidden';
      events.push({ type: 'round-start' });
    }
    return true;
  }
  if (['hide-lost', 'hide-won'].includes(friends.phase)) return true;
  if (friends.phase !== 'hiding') return false;
  const seeker = friends.actors[0];
  if (friends.hidden && distance(player, friends.hidden) > 3) friends.hidden = null;
  const seen = !friends.hidden && visible(seeker.position, player, rocket) || friends.hidden?.known;
  if (seen) seeker.lastSeen = { ...player };
  if (!seeker.rethink) {
    let target = seeker.lastSeen;
    if (!target || distance(seeker.position, target) < 20) {
      seeker.lastSeen = null;
      const tree = TREES[seeker.searchIndex % TREES.length];
      target = { x: tree[0] + tree[2] / 2, y: tree[1] + tree[3] + 20 };
      if (distance(seeker.position, target) < 45) seeker.searchIndex++;
    }
    route(seeker, target, rocket);
  }
  followPath(seeker, WORLD.speed * 1.14 * dt, rocket);
  if (distance(seeker.position, player) < FRIEND_CATCH_RADIUS) {
    friends.phase = 'hide-lost'; friends.hidden = null; events.push({ type: 'hide-lost' });
  } else if (friends.elapsed >= 45) {
    friends.phase = 'hide-won'; friends.hidden = null; friends.celebration = { ...player }; friends.elapsed = 0; events.push({ type: 'hide-won' });
  }
  return true;
}
function recordTrail(friends, player) {
  const last = friends.trail.at(-1);
  if (!last) friends.trail.push({ ...player, s: 0 });
  else if (distance(last, player) > .001) friends.trail.push({ ...player, s: (last.s || 0) + distance(last, player) });
}
function followRecordedTrail(friends, actor, dt) {
  const tail = friends.trail.at(-1), index = friends.caught.indexOf(actor.id);
  const target = tail.s - FRIEND_FOLLOW_GAP - index * FRIEND_CHAIN_GAP;
  let amount = WORLD.speed * 1.4 * dt;
  const before = { ...actor.position };
  // Join at the point where the friend was caught, then consume the actual
  // recorded segments in order. Never plan a shortcut to a trailing target.
  if (actor.join) {
    const d = distance(actor.position, actor.join), step = Math.min(d, amount);
    if (d > .001) { actor.position.x += (actor.join.x - actor.position.x) * step / d; actor.position.y += (actor.join.y - actor.position.y) * step / d; amount -= step; }
    if (d <= step + .001) actor.join = null;
  }
  while (!actor.join && amount > .001 && actor.progress < target) {
    const next = friends.trail.find(point => point.s > actor.progress + .001);
    if (!next) break;
    const step = Math.min(amount, next.s - actor.progress, target - actor.progress);
    const d = distance(actor.position, next);
    if (d > .001) { actor.position.x += (next.x - actor.position.x) * step / d; actor.position.y += (next.y - actor.position.y) * step / d; }
    actor.progress += step; amount -= step;
  }
  actor.walking = distance(before, actor.position) > .05;
}

function goHome(friends, rocket) {
  friends.phase = 'returning'; friends.elapsed = 0;
  for (const actor of friends.actors) {
    if (actor.status === 'home') continue;
    actor.status = 'returning'; actor.delay = 0; route(actor, home, rocket);
  }
}
function campRoutes(friends, rocket) {
  friends.actors.forEach((actor, i) => {
    actor.status = 'to-camp'; actor.delay = i * .18; route(actor, FRIEND_CAMP_SPOTS[i], rocket);
  });
}
export function gatherFriends(friends, animals, pilot, position, rocket = GROUND_ROCKET) {
  if (!friendsTentNear(friends, position) || ['gathering', 'to-camp', 'building', 'camping'].includes(friends.phase)) return false;
  const old = friends.actors;
  friends.phase = 'gathering'; friends.pilot = pilot; friends.elapsed = 0; friends.campBuild = 1; friends.celebration = null; friends.caught = [];
  friends.actors = animals.filter(animal => animal.id !== pilot).slice(0, 3).map((animal, i) => {
    const existing = old.find(actor => actor.id === animal.id && actor.status !== 'home');
    return actorFor(animal.id, existing?.position || home.outside, 'to-camp', i);
  });
  campRoutes(friends, rocket); return true;
}
export function tickFriends(friends, seconds, scene, player, riding = false, rocket = GROUND_ROCKET, reduced = false) {
  const dt = Math.max(0, Math.min(.05, seconds)), events = [];
  if (!dt || friends.phase === 'idle') return events;
  friends.elapsed += dt;
  for (const actor of friends.actors) { actor.walking = false; actor.rethink = Math.max(0, actor.rethink - dt); }
  if (tickFriendsRound(friends, dt, scene, player, rocket, events)) return events;
  if (['gathering', 'building', 'camping'].includes(friends.phase) && (scene !== 'world' || riding || distance(player, FRIEND_CAMP) > 235)) {
    goHome(friends, rocket); events.push({ type: 'leaving' });
  }
  if (friends.phase === 'returning') {
    for (const actor of friends.actors) {
      if (actor.status === 'home') continue;
      if (!actor.path.length && distance(actor.position, home) > 5 && !actor.rethink) route(actor, home, rocket);
      followPath(actor, WORLD.speed * 1.15 * dt, rocket);
      if (distance(actor.position, home) < 5) { actor.status = 'home'; actor.walking = false; }
    }
    if (friends.actors.every(actor => actor.status === 'home')) { friends.phase = 'idle'; events.push({ type: 'home' }); }
    return events;
  }
  if (scene !== 'world' || riding) return events;
  if (friends.phase === 'chasing') {
    recordTrail(friends, player);
    for (const actor of friends.actors) {
      if (actor.status === 'hidden' && distance(player, actor.position) <= FRIEND_NOTICE_RADIUS) {
        actor.status = 'running'; actor.runningTime = 0; events.push({ type: 'revealed', id: actor.id });
      }
      if (actor.status === 'running') {
        if (distance(player, actor.position) <= FRIEND_CATCH_RADIUS) {
          actor.status = 'following'; actor.path = []; actor.goal = null; actor.progress = friends.trail.at(-1).s; actor.join = { ...player }; friends.caught.push(actor.id);
          events.push({ type: 'caught', id: actor.id });
        } else if (distance(player, actor.position) < 280) flee(actor, player, dt, rocket);
      }
      if (actor.status === 'following') {
        followRecordedTrail(friends, actor, dt);
      }
    }
    const minimum = Math.min(friends.trail.at(-1).s - 500, ...friends.actors.filter(actor => actor.status === 'following').map(actor => actor.progress));
    while (friends.trail.length > 2 && friends.trail[1].s < minimum) friends.trail.shift();
    if (friends.caught.length === 3) {
      friends.phase = 'celebrate'; friends.elapsed = 0; friends.celebration = { ...player };
      events.push({ type: 'complete' });
    }
    return events;
  }
  if (friends.phase === 'celebrate') {
    if (friends.elapsed >= (reduced ? .8 : 2.4)) {
      friends.phase = 'to-camp'; friends.elapsed = 0; friends.campBuild = friends.unlocked ? 1 : 0;
      campRoutes(friends, rocket); events.push({ type: 'camp-walk' });
    }
    return events;
  }
  if (['to-camp', 'gathering'].includes(friends.phase)) {
    for (const actor of friends.actors) {
      if (friends.elapsed < actor.delay) continue;
      const target = FRIEND_CAMP_SPOTS[actor.index];
      if (!actor.path.length && distance(actor.position, target) > 5 && !actor.rethink) route(actor, target, rocket);
      followPath(actor, WORLD.speed * 1.2 * dt, rocket);
      if (distance(actor.position, target) < 5) { actor.status = 'camping'; actor.walking = false; }
    }
    if (friends.actors.every(actor => actor.status === 'camping') && distance(player, FRIEND_CAMP) < 190) {
      friends.phase = friends.unlocked ? 'camping' : 'building'; friends.elapsed = 0;
      if (!friends.unlocked) {
        friends.unlocked = true; friends.campBuild = 0; events.push({ type: 'tent-unlocked' });
      } else events.push({ type: 'camp-ready' });
    }
    return events;
  }
  if (friends.phase === 'building') {
    friends.campBuild = Math.min(1, friends.elapsed / (reduced ? .25 : 2.4));
    if (friends.campBuild === 1) { friends.phase = 'camping'; friends.elapsed = 0; events.push({ type: 'camp-ready' }); }
  }
  return events;
}

export function friendsCameraView(friends, player, viewport) {
  if (!['celebrate', 'to-camp', 'gathering', 'building', 'camping'].includes(friends.phase)) return null;
  const actors = friends.actors.filter(actor => actor.status !== 'home');
  if (!actors.length) return null;
  const points = [player, ...actors.map(actor => actor.position)];
  let left = Math.min(...points.map(point => point.x - 54)), right = Math.max(...points.map(point => point.x + 54));
  let top = Math.min(...points.map(point => point.y - 104)), bottom = Math.max(...points.map(point => point.y + 28));
  if (friends.unlocked) {
    left = Math.min(left, FRIEND_TENT.x - 108); right = Math.max(right, FRIEND_TENT.x + 132);
    top = Math.min(top, FRIEND_TENT.y - 124, FRIEND_CAMP.y - 72); bottom = Math.max(bottom, FRIEND_TENT.y + 28);
  }
  const focusY = player.y - WORLD.cameraOffsetY, aspect = viewport.w / viewport.h;
  const w = Math.max(viewport.w, right - left, Math.max(focusY - top, bottom - focusY) * 2 * aspect), h = w / aspect;
  // Fit the full bodies immediately; easing must never leave a walker outside the view.
  const x = Math.max(Math.min(WORLD.left, WORLD.right - w), Math.min(Math.max(WORLD.left, WORLD.right - w), (left + right - w) / 2));
  const y = Math.max(WORLD.top, Math.min(WORLD.height - h / 2, focusY - h / 2));
  return { x, y, w, h };
}
