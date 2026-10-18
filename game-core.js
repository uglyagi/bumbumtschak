export const WORLD = { width: 1600, height: 1100, radius: 18, speed: 205 };
export const OBSTACLES = [
  { x: 530, y: 110, w: 555, h: 223 },
  { x: 170, y: 345, w: 270, h: 145 },
  { x: 1150, y: 320, w: 260, h: 170 },
  { x: 1207, y: 723, w: 120, h: 87 },
  { x: 176, y: 742, w: 247, h: 77 },
  { x: 55, y: 110, w: 112, h: 140 },
  { x: 1420, y: 140, w: 110, h: 150 },
  { x: 1460, y: 745, w: 85, h: 135 },
  { x: 55, y: 900, w: 100, h: 120 },
  { x: 520, y: 830, w: 75, h: 100 },
];
export const STATIONS = [
  { id: 'radio', label: 'Kassettenradio', short: 'Musik hören', x: 305, y: 543, color: '#ff87ce' },
  { id: 'concerts', label: 'Konzerttafel', short: 'Konzerte entdecken', x: 1280, y: 548, color: '#fff20b' },
  { id: 'panda', label: 'Der Panda', short: 'Schlagzeug · BUM!', x: 640, y: 382, color: '#1d55ff' },
  { id: 'parrot', label: 'Der Papagei', short: 'Bass & Gesang', x: 815, y: 382, color: '#ff3935' },
  { id: 'croc', label: 'Das Krokodil', short: 'E-Gitarre · TSCHAK!', x: 1005, y: 382, color: '#40cea1' },
  { id: 'social', label: 'Social Media', short: 'Mit uns verbunden bleiben', x: 1265, y: 867, color: '#ff87ce' },
  { id: 'grownups', label: 'Für Große', short: 'Eltern & Veranstalter', x: 300, y: 875, color: '#fff20b' },
];
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const isActionKey = event => event.key === 'Enter' || event.key === ' ' || event.code === 'Space';
const WALLS = [{ x: 125, y: 100, w: 1350, h: 145 }, { x: 125, y: 210, w: 35, h: 860 }, { x: 1440, y: 210, w: 35, h: 860 }, { x: 125, y: 1000, w: 615, h: 80 }, { x: 860, y: 1000, w: 615, h: 80 }];
export function sceneObstacles(scene = 'world') {
  if (scene === 'world') return OBSTACLES;
  const props = scene === 'radio' ? [{ x: 615, y: 285, w: 370, h: 180 }, { x: 215, y: 300, w: 355, h: 195 }, { x: 980, y: 275, w: 420, h: 60 }] : [{ x: 500, y: 280, w: 600, h: 200 }];
  return [...WALLS, ...props];
}
export function canStand(x, y, radius = WORLD.radius, scene = 'world') {
  if (x < radius + 24 || x > WORLD.width - radius - 24 || y < radius + 45 || y > WORLD.height - radius - 35) return false;
  if (scene !== 'world' && (x < 160 + radius || x > 1440 - radius || y < 245 + radius)) return false;
  return !sceneObstacles(scene).some(o => {
    const dx = x - clamp(x, o.x, o.x + o.w);
    const dy = y - clamp(y, o.y, o.y + o.h);
    return dx * dx + dy * dy < radius * radius;
  });
}
export function move(position, dx, dy, dt, scene = 'world') {
  const length = Math.hypot(dx, dy);
  if (!length) return { ...position };
  const distance = WORLD.speed * Math.min(dt, .05);
  const next = { ...position };
  const nx = position.x + dx / length * distance;
  if (canStand(nx, next.y, WORLD.radius, scene)) next.x = nx;
  const ny = position.y + dy / length * distance;
  if (canStand(next.x, ny, WORLD.radius, scene)) next.y = ny;
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
export function planPath(start, end, scene = 'world') {
  const free = (x, y, radius = WORLD.radius) => canStand(x, y, radius, scene);
  if (!free(start.x, start.y) || !free(end.x, end.y)) return [];
  const step = 28, cols = Math.ceil(WORLD.width / step), rows = Math.ceil(WORLD.height / step);
  const margin = WORLD.radius + 7;
  const clearSegment = (a, b, radius = WORLD.radius) => {
    const samples = Math.max(1, Math.ceil(Math.hypot(a.x - b.x, a.y - b.y) / 5));
    for (let i = 0; i <= samples; i++) if (!free(a.x + (b.x - a.x) * i / samples, a.y + (b.y - a.y) * i / samples, radius)) return false;
    return true;
  };
  const cell = point => {
    const cx = Math.round(point.x / step), cy = Math.round(point.y / step), candidates = [];
    for (let dx = -3; dx <= 3; dx++) for (let dy = -3; dy <= 3; dy++) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || x >= cols || y < 0 || y >= rows || !free(x * step, y * step, margin)) continue;
      candidates.push({ x, y, distance: Math.hypot(x * step - point.x, y * step - point.y) });
    }
    candidates.sort((a, b) => a.distance - b.distance);
    return candidates.find(p => clearSegment(point, { x: p.x * step, y: p.y * step }));
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
      if (q.x < 0 || q.x >= cols || q.y < 0 || q.y >= rows || previous.has(key(q)) || !free(q.x * step, q.y * step, margin)) continue;
      if (!clearSegment({ x: p.x * step, y: p.y * step }, { x: q.x * step, y: q.y * step }, margin)) continue;
      previous.set(key(q), p); queue.push(q);
    }
  }
  if (!found) return [];
  const path = [];
  for (let p = found; p; p = previous.get(key(p))) path.push({ x: p.x * step, y: p.y * step });
  path.reverse();
  const simplified = path.filter((p, i) => i === 0 || i === path.length - 1 || ((p.x - path[i - 1].x) !== (path[i + 1].x - p.x)) || ((p.y - path[i - 1].y) !== (path[i + 1].y - p.y)));
  simplified.push({ ...end });
  return simplified;
}
