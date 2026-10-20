export const WORLD_BOUNDS = { left: -240, right: 1840, width: 2080 };
export const ROCKET_SPEED = 255;
export const SPACE_FLIGHT_SECONDS = 6.5;
export const GROUND_ROCKET = { x: 365, y: 70 };
export const SPACE = { top: -7200, bottom: GROUND_ROCKET.y - ROCKET_SPEED * SPACE_FLIGHT_SECONDS, color: '#10152d' };
export const SPACE_DARK_START = SPACE.bottom + 600;
export const SKY = { top: SPACE_DARK_START + 240, bottom: 0, color: '#bde7ff', spawn: { x: 1060, y: -125 } };
export const ROCKET_REACH = 65;
export const spaceViewIsDark = (camera, viewport) => camera.y + viewport.h / 2 <= SPACE_DARK_START;
export const outsideScene = scene => ['world', 'sky', 'space'].includes(scene);
export const flightScene = y => y <= SPACE.bottom ? 'space' : y < 0 ? 'sky' : 'world';
export const rocketBody = position => ({ x: position.x - 19, y: position.y - 140, w: 38, h: 112 });
export function moveRocket(position, dx, dy, dt) {
  const length = Math.hypot(dx, dy);
  if (!length) return { ...position };
  const distance = ROCKET_SPEED * Math.min(dt, .05), limit = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
  return { x: limit(position.x + dx / length * distance, WORLD_BOUNDS.left + 65, WORLD_BOUNDS.right - 65), y: limit(position.y + dy / length * distance, SPACE.top + 160, 1040) };
}
