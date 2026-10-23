export const OUTHOUSE = { x: -100, y: 520, outside: { x: -100, y: 559 } };
export const EARTH_SCREEN = 1000;
export const EARTH_LENGTH = EARTH_SCREEN * 10;
export const EARTH_SPEED = 245;
export const earthModulo = x => (x % EARTH_LENGTH + EARTH_LENGTH) % EARTH_LENGTH;
export const nearOuthouse = p => Math.abs(p.x - OUTHOUSE.x) < 26 && p.y >= 505 && p.y <= 538;
export function createEarthVisit(origin) {
  return { phase: 'landing', elapsed: 0, time: 0, position: { x: 215, y: 505 }, origin: { ...origin }, paper: null, paperTaken: false, facing: 'front', walking: false, target: null };
}
export function earthStroller(earth, cycle = 0) {
  return { x: cycle * EARTH_LENGTH + 4450 + Math.sin(earth.time * .13) * 115, y: 500 };
}
export function earthRocketNear(position) {
  const x = earthModulo(position.x);
  return Math.hypot(Math.min(Math.abs(x - 180), EARTH_LENGTH - Math.abs(x - 180)), position.y - 490) < 90;
}
export function earthInteraction(earth, carrying) {
  if (!earth || earth.phase !== 'walking') return null;
  if (earthRocketNear(earth.position)) return 'earth-launch';
  if (earth.paper?.phase === 'ground' && Math.hypot(earth.paper.x - earth.position.x, earth.paper.y - earth.position.y) < 65) return 'earth-paper';
  const cycle = Math.floor(earth.position.x / EARTH_LENGTH), stroller = earthStroller(earth, cycle);
  if (!carrying && !earth.paperTaken && !earth.paper && Math.hypot(stroller.x - earth.position.x, stroller.y - earth.position.y) < 95) return 'earth-stroller';
  return null;
}
export function releaseEarthPaper(earth) {
  if (earth.paper || earth.paperTaken) return false;
  const stroller = earthStroller(earth, Math.floor(earth.position.x / EARTH_LENGTH));
  earth.paper = { phase: 'flying', elapsed: 0, fromX: stroller.x, x: stroller.x, y: stroller.y - 40 };
  return true;
}
export function takeEarthPaper(earth) {
  if (earth.paper?.phase !== 'ground') return false;
  earth.paper = null; earth.paperTaken = true; return true;
}
export function tickEarth(earth, seconds, dx = 0, dy = 0, reduced = false) {
  const dt = Math.min(.05, Math.max(0, seconds));earth.time += dt;earth.elapsed += dt;earth.walking = false;
  if (earth.phase === 'landing' || earth.phase === 'launching') {
    if (earth.elapsed >= (reduced ? .3 : 1.6)) { const event = earth.phase === 'landing' ? 'landed' : 'launched';earth.phase = earth.phase === 'landing' ? 'walking' : 'done';earth.elapsed = 0;return event; }
    return null;
  }
  if (earth.phase !== 'walking') return null;
  if (earth.paper?.phase === 'flying') {
    const paper = earth.paper;paper.elapsed += dt;const t = Math.min(1, paper.elapsed / .9);
    paper.x = paper.fromX + 90 * t;paper.y = 500 - Math.sin(t * Math.PI) * 135;
    if (t === 1) paper.phase = 'ground';
  }
  if (dx || dy) {
    const length = Math.hypot(dx,dy), old = { ...earth.position };
    earth.position.x += dx / length * EARTH_SPEED * dt;
    earth.position.y = Math.max(455, Math.min(575, earth.position.y + dy / length * EARTH_SPEED * dt));
    earth.walking = Math.hypot(old.x-earth.position.x,old.y-earth.position.y)>.01;
    earth.facing = dx ? dx > 0 ? 'right' : 'left' : dy < 0 ? 'back' : 'front';
  }
  return null;
}
