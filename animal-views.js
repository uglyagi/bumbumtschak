// All views share the original 100 × 120 frame and foot baseline.
export const ANIMAL_IMAGE_KEYS = ['image', 'imageRight', 'imageBack', 'imageSeated'];
export const ANIMAL_DIRECTIONS = ['front', 'right', 'left', 'back'];
export function movementFacing(previous, next, current = 'front', direction = null) {
  const dx=next.x-previous.x, dy=next.y-previous.y;
  if (Math.hypot(dx,dy)<=.05) return current;
  // Horizontal input wins on diagonals, including when a wall blocks that axis.
  const horizontal=direction?.x ?? dx, vertical=direction?.y ?? dy;
  if (Math.abs(horizontal)>.00001) return horizontal<0?'left':'right';
  return vertical<0?'back':'front';
}
