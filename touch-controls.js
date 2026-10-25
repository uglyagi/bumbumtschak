export const THUMB_TRAVEL = 18;
export const THUMB_DEAD_ZONE = 8;
function thumbDelta(finger, origin, turned) {
  if (!finger || !origin || ![finger.clientX, finger.clientY, origin.x, origin.y].every(Number.isFinite)) return { x: 0, y: 0 };
  const x = finger.clientX - origin.x, y = finger.clientY - origin.y;
  return turned ? { x: y, y: -x || 0 } : { x, y };
}
export function thumbDirection(finger, origin, turned = false) {
  let { x, y } = thumbDelta(finger, origin, turned);
  if (Math.hypot(x, y) < THUMB_DEAD_ZONE) return { x: 0, y: 0 };
  if (Math.abs(x) < 5) x = 0;
  if (Math.abs(y) < 5) y = 0;
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}
export function thumbOffset(finger, origin, turned = false) {
  const { x, y } = thumbDelta(finger, origin, turned);
  const scale = Math.min(1, THUMB_TRAVEL / (Math.hypot(x, y) || 1));
  return { x: x * scale, y: y * scale };
}
export const landscapeSize = (rect, turned) => turned ? { width: rect.height, height: rect.width } : { width: rect.width, height: rect.height };
export function screenPointInGame(point, rect, turned = false) {
  const x = point.x - (rect.left || 0), y = point.y - (rect.top || 0);
  return turned ? { x: y, y: rect.width - x } : { x, y };
}

// One-dimensional sticks ignore the other axis, including in rotated fullscreen.
export function axisThumbDirection(finger, origin, axis, turned=false) {
  const delta=thumbDelta(finger,origin,turned)[axis];
  return Math.abs(delta)<THUMB_DEAD_ZONE ? 0 : Math.sign(delta);
}
export function adventureViewport(rect, touchMode, screenWidth, screenHeight) {
  const phone=touchMode && Math.min(screenWidth||rect.width,screenHeight||rect.height)<=600;
  const scale=phone?2:1;
  return {width:rect.width*scale,height:rect.height*scale,scale};
}
