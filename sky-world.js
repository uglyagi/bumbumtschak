export const SKY = { top: -650, bottom: 0, color: '#bde7ff', spawn: { x: 1060, y: -125 } };
export const GROUND_ROCKET = { x: 1130, y: 350 };
export const ROCKET_REACH = 65;
export const outsideScene = scene => scene === 'world' || scene === 'sky';
export const rocketBody = position => ({ x: position.x - 19, y: position.y - 140, w: 38, h: 112 });
export function moveRocket(position, dx, dy, dt) {
  const length = Math.hypot(dx, dy);
  if (!length) return { ...position };
  const distance = 255 * Math.min(dt, .05), limit = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
  return { x: limit(position.x + dx / length * distance, 65, 1535), y: limit(position.y + dy / length * distance, SKY.top + 160, 1040) };
}
