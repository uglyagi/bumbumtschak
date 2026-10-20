import { WORLD, HOUSE_DOORS, canStand, move, planPath } from './game-core.js';
import { GROUND_ROCKET } from './sky-world.js';

export const FRIEND_HIDEOUTS = [{ x: 105, y: 280 }, { x: 1475, y: 270 }, { x: 550, y: 960 }];
export const FRIEND_CAMP = { x: 875, y: 940 };
export const FRIEND_TENT = { x: 700, y: 965 };
export const FRIEND_CAMP_PLAYER = { x: 960, y: 1020 };
export const FRIEND_CAMP_SPOTS = [{ x: 800, y: 980 }, { x: 870, y: 860 }, { x: 965, y: 920 }];
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
export const friendsAway = friends => friends?.actors.filter(actor => actor.status !== 'home').map(actor => actor.id) || [];
function actorFor(id, position, status, index) {
  return { id, position: { ...position }, status, index, path: [], goal: null, rethink: 0, runningTime: 0, walking: false, delay: 0 };
}
export function startFriends(friends, animals, pilot, position) {
  friends.phase = 'chasing'; friends.pilot = pilot; friends.elapsed = 0; friends.caught = []; friends.celebration = null; friends.trail = [{ ...position }];
  friends.actors = animals.filter(animal => animal.id !== pilot).slice(0, 3).map((animal, i) => actorFor(animal.id, FRIEND_HIDEOUTS[i], 'hidden', i));
}
export function releaseFriends(friends) {
  friends.phase = 'idle'; friends.actors = []; friends.caught = []; friends.trail = []; friends.celebration = null;
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
function moveActor(actor, dx, dy, amount, rocket) {
  let remaining = amount;
  while (remaining > .01) {
    const step = Math.min(remaining, WORLD.speed * .025), old = actor.position;
    actor.position = move(old, dx, dy, step / WORLD.speed, 'world', rocket);
    if (distance(old, actor.position) < .01) break;
    remaining -= step;
  }
}
function followPath(actor, amount, rocket) {
  const before = { ...actor.position };
  while (actor.path.length && amount > .01) {
    const point = actor.path[0], d = distance(point, actor.position);
    if (d < 2) { actor.path.shift(); continue; }
    const step = Math.min(amount, d, WORLD.speed * .025), old = actor.position;
    moveActor(actor, point.x - old.x, point.y - old.y, step, rocket);
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
function trailPoint(friends, length) {
  let remaining = length;
  for (let i = friends.trail.length - 1; i > 0; i--) {
    const a = friends.trail[i], b = friends.trail[i - 1], d = distance(a, b);
    if (d >= remaining) return { x: a.x + (b.x - a.x) * remaining / (d || 1), y: a.y + (b.y - a.y) * remaining / (d || 1) };
    remaining -= d;
  }
  return friends.trail[0];
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
    if (!friends.trail.length || distance(player, friends.trail.at(-1)) >= 8) friends.trail.push({ ...player });
    friends.trail = friends.trail.slice(-240);
    for (const actor of friends.actors) {
      if (actor.status === 'hidden' && distance(player, actor.position) <= FRIEND_NOTICE_RADIUS) {
        actor.status = 'running'; actor.runningTime = 0; events.push({ type: 'revealed', id: actor.id });
      }
      if (actor.status === 'running') {
        if (distance(player, actor.position) <= FRIEND_CATCH_RADIUS) {
          actor.status = 'following'; actor.path = []; actor.goal = null; friends.caught.push(actor.id);
          events.push({ type: 'caught', id: actor.id });
        } else if (distance(player, actor.position) < 280) flee(actor, player, dt, rocket);
      }
      if (actor.status === 'following') {
        const index = friends.caught.indexOf(actor.id), target = trailPoint(friends, (index + 1) * 62) || player;
        if (distance(actor.position, target) > 12) {
          if (!actor.rethink && (!actor.goal || distance(actor.goal, target) > 35 || !actor.path.length)) route(actor, target, rocket);
          followPath(actor, WORLD.speed * (distance(actor.position, player) > 200 ? 2.5 : 1.35) * dt, rocket);
        }
      }
    }
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
  const x = Math.max(Math.min(0, WORLD.width - w), Math.min(Math.max(0, WORLD.width - w), (left + right - w) / 2));
  const y = Math.max(WORLD.top, Math.min(WORLD.height - h / 2, focusY - h / 2));
  return { x, y, w, h };
}
