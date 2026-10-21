// All views share the original 100 × 120 frame and foot baseline.
export const ANIMAL_IMAGE_KEYS = ['image', 'imageRight', 'imageBack', 'imageSeated'];
export const ANIMAL_DIRECTIONS = ['front', 'right', 'left', 'back'];
export function movementFacing(previous, next, current = 'front') {
  const dx = next.x - previous.x, dy = next.y - previous.y;
  if (Math.hypot(dx, dy) <= .05) return current;
  return Math.abs(dx) >= Math.abs(dy) ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'back' : 'front';
}
