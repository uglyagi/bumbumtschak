export const THUMB_TRAVEL = 18;
// A fixed thumb pad uses only a few screen pixels, independent of the camera.
export function thumbDirection(finger, origin) {
  if (!finger || !origin || ![finger.clientX, finger.clientY, origin.x, origin.y].every(Number.isFinite)) return { x: 0, y: 0 };
  let x = finger.clientX - origin.x, y = finger.clientY - origin.y;
  if (Math.hypot(x, y) < 3) return { x: 0, y: 0 };
  if (Math.abs(x) < 2) x = 0;
  if (Math.abs(y) < 2) y = 0;
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}
export function thumbOffset(finger, origin) {
  if (!finger || !origin || ![finger.clientX, finger.clientY, origin.x, origin.y].every(Number.isFinite)) return { x: 0, y: 0 };
  const x = finger.clientX - origin.x, y = finger.clientY - origin.y;
  const scale = Math.min(1, THUMB_TRAVEL / (Math.hypot(x, y) || 1));
  return { x: x * scale, y: y * scale };
}
export const thumbBikeInput = direction => ({
  right: direction.x > .2, left: direction.x < -.2,
  lane: direction.y < 0 ? -1 : direction.y > 0 ? 1 : 0,
});
