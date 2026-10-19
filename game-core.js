import { SPACE, SKY, GROUND_ROCKET, rocketBody } from './sky-world.js';

export const WORLD = { width: 1600, height: 1100, top: SPACE.top, radius: 18, speed: 205 };
export const WORLD_SPAWN = { x: 650, y: 650 };
export const HOME_PICTURE = { x: 1010, y: 270, w: 200, h: 190 };
export function touchingHomePicture(position) {
  // The displayed animal is 68 × 82 units, anchored at its feet.
  return position.x + 34 >= HOME_PICTURE.x && position.x - 34 <= HOME_PICTURE.x + HOME_PICTURE.w
    && position.y + 5 >= HOME_PICTURE.y && position.y - 77 <= HOME_PICTURE.y + HOME_PICTURE.h;
}
export const OBSTACLES = [
  { x: 530, y: 110, w: 555, h: 223 },
  { x: 170, y: 345, w: 270, h: 145 },
  { x: 1150, y: 320, w: 260, h: 170 },
  { x: 1317, y: 723, w: 120, h: 87 },
  { x: 196, y: 690, w: 208, h: 112 },
  { x: 722, y: 610, w: 156, h: 108 },
  { x: 985, y: 726, w: 30, h: 30 },
  { x: 55, y: 110, w: 112, h: 140 },
  { x: 1420, y: 85, w: 110, h: 150 },
  { x: 1460, y: 545, w: 85, h: 135 },
  { x: 55, y: 900, w: 100, h: 120 },
  { x: 520, y: 830, w: 75, h: 100 },
];
export const STATIONS = [
  { id: 'radio', label: 'Musikhaus', short: 'Musik hören', x: 305, y: 526, color: '#ff87ce' },
  { id: 'concerts', label: 'Konzerte', short: 'Konzerte entdecken', x: 1280, y: 526, color: '#fff20b' },
  { id: 'panda', label: 'Der Panda', short: 'Schlagzeug · BUM!', x: 640, y: 382, color: '#1d55ff' },
  { id: 'parrot', label: 'Der Papagei', short: 'Bass & Gesang', x: 815, y: 382, color: '#ff3935' },
  { id: 'croc', label: 'Das Krokodil', short: 'E-Gitarre · TSCHAK!', x: 1005, y: 382, color: '#40cea1' },
  { id: 'social', label: 'Kontakt', short: 'Mit uns verbunden bleiben', x: 1375, y: 867, color: '#c9ced4' },
  { id: 'grownups', label: 'Büro', short: 'Eltern & Veranstalter', x: 300, y: 840, color: '#fff20b' },
  { id: 'wardrobe', label: 'Home sweet Home', short: 'Dein Tier wechseln und malen', x: 800, y: 752, color: '#ff87ce' },
  { id: 'help', label: 'So geht’s', short: 'Die Steuerung entdecken', x: 1000, y: 705, color: '#fff20b' },
  { id: 'rocket', label: 'Zum Himmel', short: 'Mit der Rakete hinauffliegen', x: GROUND_ROCKET.x, y: GROUND_ROCKET.y, color: '#bde7ff' },
];
export const HOUSE_DOORS = [
  { id: 'radio', x: 305, y: 526, halfWidth: 24, top: 506, bottom: 535, outside: { x: 305, y: 565 } },
  { id: 'concerts', x: 1280, y: 526, halfWidth: 23, top: 506, bottom: 535, outside: { x: 1280, y: 565 } },
  { id: 'wardrobe', x: 800, y: 752, halfWidth: 19, top: 733, bottom: 763, outside: { x: 800, y: 803 } },
];
const WORLD_OBJECTS = [
  { id: 'grownups', x: 196, y: 690, w: 208, h: 112 },
  { id: 'help', x: 985, y: 726, w: 30, h: 30 },
];
export function worldTouch(position) {
  const door = HOUSE_DOORS.find(door => Math.abs(position.x - door.x) <= door.halfWidth && position.y >= door.top && position.y <= door.bottom);
  return door ? { id: door.id, kind: 'enter' } : null;
}
export function nearbyWorldObject(position) {
  return WORLD_OBJECTS.map(rect => ({ id: rect.id, distance: Math.hypot(position.x - Math.max(rect.x, Math.min(rect.x + rect.w, position.x)), position.y - Math.max(rect.y, Math.min(rect.y + rect.h, position.y))) }))
    .filter(object => object.distance <= WORLD.radius + 40).sort((a, b) => a.distance - b.distance)[0] || null;
}
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const isActionKey = event => event.key === 'Enter' || event.key === ' ' || event.code === 'Space';
const WALLS = [{ x: 125, y: 100, w: 1350, h: 145 }, { x: 125, y: 210, w: 35, h: 860 }, { x: 1440, y: 210, w: 35, h: 860 }, { x: 125, y: 1000, w: 615, h: 80 }, { x: 860, y: 1000, w: 615, h: 80 }];
export function sceneObstacles(scene = 'world', parkedRocket = GROUND_ROCKET) {
  if (scene === 'world') return parkedRocket ? [...OBSTACLES, rocketBody(parkedRocket)] : OBSTACLES;
  if (scene === 'sky' || scene === 'space') return [];
  const props = scene === 'radio' ? [{ x: 615, y: 285, w: 370, h: 180 }, { x: 215, y: 300, w: 355, h: 195 }, { x: 980, y: 275, w: 420, h: 60 }]
    : scene === 'wardrobe' ? [HOME_PICTURE]
    : [{ x: 500, y: 280, w: 600, h: 200 }];
  return [...WALLS, ...props];
}
export function canStand(x, y, radius = WORLD.radius, scene = 'world', parkedRocket = GROUND_ROCKET) {
  if (scene === 'space') return false;
  if (x < radius + 24 || x > WORLD.width - radius - 24) return false;
  if (scene === 'sky') {
    if (y < SKY.top + radius + 45 || y > SKY.bottom - radius - 27) return false;
  } else {
    if (y < radius + 45 || y > WORLD.height - radius - 35) return false;
    if (scene !== 'world' && (x < 160 + radius || x > 1440 - radius || y < 245 + radius)) return false;
  }
  return !sceneObstacles(scene, parkedRocket).some(o => {
    const dx = x - clamp(x, o.x, o.x + o.w);
    const dy = y - clamp(y, o.y, o.y + o.h);
    return dx * dx + dy * dy < radius * radius;
  });
}
export function canLandRocket(position) {
  if (position.y > 1005) return false;
  if (!canStand(position.x, position.y, WORLD.radius, 'world', null)) return false;
  const body = rocketBody(position);
  return !OBSTACLES.some(o => body.x < o.x + o.w && body.x + body.w > o.x && body.y < o.y + o.h && body.y + body.h > o.y) && !!rocketExitPosition(position);
}
export function rocketExitPosition(position) {
  return [[-55, 25], [55, 25], [-55, 0], [55, 0], [0, 55], [-65, 55], [65, 55]].map(([dx, dy]) => ({ x: position.x + dx, y: position.y + dy }))
    .find(point => canStand(point.x, point.y, WORLD.radius, 'world', position)) || null;
}
export function move(position, dx, dy, dt, scene = 'world', parkedRocket = GROUND_ROCKET) {
  const length = Math.hypot(dx, dy);
  if (!length) return { ...position };
  const distance = WORLD.speed * Math.min(dt, .05);
  const next = { ...position };
  const nx = position.x + dx / length * distance;
  if (canStand(nx, next.y, WORLD.radius, scene, parkedRocket)) next.x = nx;
  const ny = position.y + dy / length * distance;
  if (canStand(next.x, ny, WORLD.radius, scene, parkedRocket)) next.y = ny;
  return next;
}
export function nearestStation(position, range = 110) {
  let nearest = null, distance = range;
  for (const s of STATIONS) {
    const d = Math.hypot(s.x - position.x, s.y - position.y);
    if (d < distance) { nearest = s; distance = d; }
  }
  return nearest;
}
export function planPath(start, end, scene = 'world', parkedRocket = GROUND_ROCKET) {
  const inDoor = (point, door, margin = 0) => Math.abs(point.x - door.x) <= door.halfWidth + margin && point.y >= door.top - margin && point.y <= door.bottom + margin;
  // Walking to another destination must not lead through an automatic entrance.
  const avoidedDoors = scene === 'world' ? HOUSE_DOORS.filter(door => !inDoor(start, door, WORLD.radius + 7) && !inDoor(end, door)) : [];
  const free = (x, y, radius = WORLD.radius) => canStand(x, y, radius, scene, parkedRocket) && !avoidedDoors.some(door => inDoor({ x, y }, door, radius));
  if (!free(start.x, start.y) || !free(end.x, end.y)) return [];
  const originY = scene === 'sky' ? SKY.top : 0;
  const step = 28, cols = Math.ceil(WORLD.width / step), rows = Math.ceil((scene === 'sky' ? -SKY.top : WORLD.height) / step);
  const gridPoint = point => ({ x: point.x * step, y: originY + point.y * step });
  const margin = WORLD.radius + 7;
  const clearSegment = (a, b, radius = WORLD.radius) => {
    const samples = Math.max(1, Math.ceil(Math.hypot(a.x - b.x, a.y - b.y) / 5));
    for (let i = 0; i <= samples; i++) if (!free(a.x + (b.x - a.x) * i / samples, a.y + (b.y - a.y) * i / samples, radius)) return false;
    return true;
  };
  const cell = point => {
    const cx = Math.round(point.x / step), cy = Math.round((point.y - originY) / step), candidates = [];
    for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || x >= cols || y < 0 || y >= rows || !free(x * step, originY + y * step, margin)) continue;
      candidates.push({ x, y, distance: Math.hypot(x * step - point.x, originY + y * step - point.y) });
    }
    candidates.sort((a, b) => a.distance - b.distance);
    return candidates.find(p => clearSegment(point, gridPoint(p)));
  };
  const a = cell(start), b = cell(end);
  if (!a || !b) return [];
  const key = p => p.y * cols + p.x;
  const queue = [a], previous = new Map([[key(a), null]]);
  let found = null;
  for (let head = 0; head < queue.length; head++) {
    const p = queue[head];
    if (p.x === b.x && p.y === b.y) { found = p; break; }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const q = { x: p.x + dx, y: p.y + dy };
      if (q.x < 0 || q.x >= cols || q.y < 0 || q.y >= rows || previous.has(key(q)) || !free(q.x * step, originY + q.y * step, margin)) continue;
      if (!clearSegment(gridPoint(p), gridPoint(q), margin)) continue;
      previous.set(key(q), p); queue.push(q);
    }
  }
  if (!found) return [];
  const path = [];
  for (let p = found; p; p = previous.get(key(p))) path.push(gridPoint(p));
  path.reverse();
  const simplified = path.filter((p, i) => i === 0 || i === path.length - 1 || ((p.x - path[i - 1].x) !== (path[i + 1].x - p.x)) || ((p.y - path[i - 1].y) !== (path[i + 1].y - p.y)));
  simplified.push({ ...end });
  return simplified;
}
