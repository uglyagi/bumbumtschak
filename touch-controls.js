// Work in screen pixels so the same finger gesture works at every SVG zoom.
export function fingerDirection(finger, origin) {
  if (!finger || !origin || ![finger.clientX, finger.clientY, origin.x, origin.y].every(Number.isFinite)) return { x: 0, y: 0 };
  let x = finger.clientX - origin.x, y = finger.clientY - origin.y;
  if (Math.hypot(x, y) < 18) return { x: 0, y: 0 };
  // A little finger jitter should not turn an upward walk into a sideways walk.
  if (Math.abs(x) < 10) x = 0;
  if (Math.abs(y) < 10) y = 0;
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}
export const fingerBikeInput = direction => ({
  right: direction.x > .2, left: direction.x < -.2,
  lane: direction.y < 0 ? -1 : direction.y > 0 ? 1 : 0,
});
