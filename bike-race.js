// Deterministic cycling course and browser-local rewards. Rendering and audio live separately.
export const BIKE_LEVELS = {
  leicht: { speed: 105, rocks: 16, halfWidth: 150, color: '#fff20b' },
  mittel: { speed: 145, rocks: 28, halfWidth: 138, color: '#1d55ff' },
  schwer: { speed: 185, rocks: 42, halfWidth: 126, color: '#ff3935' },
};
export const BIKE_FINISH = 6200;
export const BIKE_RIDER_Y = 225;
export const BIKE_DOOR = { x: 924, y: 493 };
export const BIKE_RETURN = { x: 924, y: 550 };
export const BIKE_PARKING = {
  leicht: { x: 700, y: 820 }, mittel: { x: 800, y: 850 }, schwer: { x: 900, y: 820 },
};
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const isBikeTrack = track => !!track && /fah?rr?ad|fahrradfahrn|radfahr/i.test(String(track.id || '') + ' ' + String(track.title || ''));
export const touchingBikeDoor = position => Math.abs(position.x - BIKE_DOOR.x) < 36 && position.y < 516 && position.y > 465;
export const bikeRoadCenter = distance => 500 + Math.sin(distance * .0018) * 114 + Math.sin(distance * .0042) * 42;
export const bikeWorldSpeed = level => ({ leicht: 330, mittel: 375, schwer: 420 }[level] || 375);
export const bikeTime = seconds => (Math.round(Math.max(0, Number.isFinite(seconds) ? seconds : 0) * 10) / 10).toFixed(1).replace('.', ',') + ' s';
function randomSource(seed) {
  let value = (Number(seed) || 1) >>> 0;
  return () => { value = (Math.imul(1664525, value) + 1013904223) >>> 0; return value / 4294967296; };
}
export function createBikeRace(level = 'leicht', seed = 1) {
  const difficulty = Object.hasOwn(BIKE_LEVELS, level) ? level : 'leicht', settings = BIKE_LEVELS[difficulty];
  const random = randomSource(seed);
  const rocks = Array.from({ length: settings.rocks }, (_, id) => {
    const distance = 370 + id * (BIKE_FINISH - 680) / settings.rocks + random() * 45;
    return { id, distance, x: bikeRoadCenter(distance) + (random() * 1.4 - .7) * settings.halfWidth, radius: 17 + random() * 9 };
  });
  return { difficulty, phase: 'ready', elapsed: 0, progress: 0, x: bikeRoadCenter(0), fall: 0, falls: 0, invulnerable: 0, hit: [], rocks, saved: false };
}
export function startBikeRace(race) {
  if (!race || race.phase !== 'ready') return false;
  race.phase = 'racing'; return true;
}
export function tickBikeRace(race, elapsed, steering = 0) {
  if (!race || race.phase !== 'racing' || !Number.isFinite(elapsed) || elapsed <= 0) return null;
  let remaining = Math.min(elapsed, .5), event = null;
  const settings = BIKE_LEVELS[race.difficulty], input = clamp(Number(steering) || 0, -1, 1);
  while (remaining > 1e-8 && race.phase === 'racing') {
    const dt = Math.min(remaining, .01); remaining -= dt;
    if (race.fall > 0) {
      const waiting = Math.min(dt, race.fall);
      race.elapsed += waiting; race.fall = Math.max(0, race.fall - waiting);
      if (race.fall < 1e-8) { race.fall = 0; race.x = bikeRoadCenter(race.progress); race.invulnerable = .8; }
      // The last fraction of a recovery frame also belongs to the stopwatch.
      if (dt > waiting) race.elapsed += dt - waiting;
      continue;
    }
    const movingTime = Math.min(dt, (BIKE_FINISH - race.progress) / settings.speed);
    race.elapsed += movingTime;
    race.progress = Math.min(BIKE_FINISH, race.progress + settings.speed * movingTime);
    race.x += input * 265 * movingTime;
    race.invulnerable = Math.max(0, race.invulnerable - movingTime);
    const offRoad = Math.abs(race.x - bikeRoadCenter(race.progress)) + 19 > settings.halfWidth;
    const rock = race.rocks.find(rock => !race.hit.includes(rock.id) && Math.abs(rock.distance - race.progress) < rock.radius + 10 && Math.abs(rock.x - race.x) < rock.radius + 12);
    if (!race.invulnerable && (offRoad || rock)) {
      race.fall = 3; race.falls++; if (rock) race.hit.push(rock.id); event = 'fall';
    } else if (race.progress >= BIKE_FINISH) {
      race.phase = 'finished'; event = 'finish';
    }
  }
  return event;
}
export function createBikeGarage(saved) {
  return { unlocked: Object.keys(BIKE_LEVELS).filter(level => Array.isArray(saved?.unlocked) && saved.unlocked.includes(level)),
    positions: Object.fromEntries(Object.entries(BIKE_PARKING).map(([level, point]) => [level, { ...point }])),
    riding: null, fall: 0 };
}
export const savedBikeGarage = garage => ({ unlocked: [...garage.unlocked] });
export function unlockBicycle(garage, level) {
  if (!Object.hasOwn(BIKE_LEVELS, level)) return false;
  if (!garage.unlocked.includes(level)) garage.unlocked.push(level);
  return true;
}
export function nearbyBicycle(garage, position) {
  if (garage.riding || garage.fall > 0) return null;
  return garage.unlocked.map(level => ({ level, ...garage.positions[level] }))
    .filter(bike => Math.hypot(bike.x - position.x, bike.y - position.y) < 64)
    .sort((a, b) => Math.hypot(a.x - position.x, a.y - position.y) - Math.hypot(b.x - position.x, b.y - position.y))[0] || null;
}
export function moveWorldBicycle(garage, position, dx, dy, elapsed, isFree) {
  if (!garage.riding || !Math.hypot(dx, dy)) return { position: { ...position }, crashed: false };
  const level = garage.riding, length = Math.hypot(dx, dy), speed = bikeWorldSpeed(level);
  const distance = speed * Math.min(.05, Math.max(0, elapsed)), steps = Math.max(1, Math.ceil(distance / 3));
  let point = { ...position };
  for (let i = 0; i < steps; i++) {
    const next = { x: point.x + dx / length * distance / steps, y: point.y + dy / length * distance / steps };
    if (!isFree(next)) {
      garage.riding = null; garage.positions[level] = { ...point }; garage.fall = 1.1;
      return { position: point, crashed: true };
    }
    point = next;
  }
  garage.positions[level] = { ...point };
  return { position: point, crashed: false };
}
export function cleanBikeScores(saved) {
  return Object.fromEntries(Object.keys(BIKE_LEVELS).map(level => [level,
    (Array.isArray(saved?.[level]) ? saved[level] : [])
      .filter(item => typeof item?.name === 'string' && Number.isFinite(item.time) && item.time > 0 && item.time < 864000)
      .map(item => ({ name: item.name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 18) || 'Gast', time: Math.max(1, Math.round(item.time)) }))
      .sort((a, b) => a.time - b.time).slice(0, 10)]));
}
export function addBikeScore(scores, level, name, seconds) {
  const clean = cleanBikeScores(scores);
  if (!Object.hasOwn(BIKE_LEVELS, level) || !Number.isFinite(seconds) || seconds <= 0) return clean;
  clean[level].push({ name: typeof name === 'string' ? name : 'Gast', time: Math.max(1, Math.round(seconds * 10)) });
  return cleanBikeScores(clean);
}
