import { text } from './content.js';
import { escapeXML as escape } from './utils.js';

const pieces = [
  { id: 'nose', x: -67, y: 1, angle: -58, art: '<path d="M-18 12Q-12-12 0-24q14 12 18 36Z" fill="#1d55ff"/><path d="m-10 0 9-5 9 9" fill="none"/>' },
  { id: 'cabin', x: -9, y: -2, angle: 18, art: '<path d="m-26-27 13 5 8-7 11 6 17-4 3 41-12 8-10-7-13 5-17-10Z" fill="#d3d2c7"/><circle cy="-5" r="16" fill="#bde7ff"/><path d="m-18 15 12-3 7 7M8-23l-5 9" fill="none" stroke-width="3"/>' },
  { id: 'left-fin', x: 56, y: 9, angle: 38, art: '<path d="M-16-18q33 7 34 33l-29-9Z" fill="#ff87ce"/>' },
  { id: 'right-fin', x: 23, y: 33, angle: -43, art: '<path d="M-14-16q-23 10-23 31l33-11Z" fill="#ff87ce"/>' },
  { id: 'engine', x: -38, y: 32, angle: -17, art: '<path d="M-19-12h38v15h-38Z" fill="#fff20b"/><path d="M-14 4-22 14h8M14 4l8 10h-8" fill="none"/>' },
  { id: 'panel', x: -95, y: 24, angle: -23, art: '<path d="m-10-7 16-3 5 12-18 6Z" fill="#ffffff"/><path d="m-4-2 8 2" stroke="#1d55ff" stroke-width="3"/>' },
  { id: 'bolt', x: 87, y: 0, angle: 26, art: '<path d="M-5-7H5l4 7-4 7H-5l-4-7Z" fill="#b6b9bb" stroke-width="3"/><circle r="2" fill="#101014" stroke="none"/>' },
];
export function wreckageTransforms(seconds = 1) {
  const t = Math.max(0, Math.min(1, seconds / .8)), ease = 1 - (1 - t) ** 3;
  return pieces.map(piece => ({ id: piece.id, transform: `translate(${(piece.x * ease).toFixed(2)} ${(-28 * (1 - ease) + piece.y * ease - Math.sin(t * Math.PI) * 22).toFixed(2)}) rotate(${(piece.angle * ease).toFixed(2)})` }));
}

export const ROCKET_REPAIR_SECONDS = 2;
const repairTargets = {
  nose: { x: 0, y: -123 }, cabin: { x: 0, y: -81 }, 'left-fin': { x: 28, y: -42 },
  'right-fin': { x: -25, y: -42 }, engine: { x: 0, y: -23 }, panel: { x: 0, y: -51 }, bolt: { x: 0, y: -68 },
};
export const rocketRepairOpacity = seconds => Math.max(0, Math.min(1, (seconds - 1.65) / .35));
export function rocketRepairTransforms(seconds) {
  return pieces.map((piece, i) => {
    const progress = Math.max(0, Math.min(1, (seconds - i * .13) / .9)), amount = progress * progress * (3 - 2 * progress), target = repairTargets[piece.id];
    const x = piece.x + (target.x - piece.x) * amount, y = piece.y + (target.y - piece.y) * amount - Math.sin(progress * Math.PI) * 20;
    return { id: piece.id, transform: 'translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ') rotate(' + (piece.angle * (1 - amount)).toFixed(2) + ')' };
  });
}

export function rocketWreckageMarkup(seconds = 1, repairing = null) {
  const transforms = repairing == null ? wreckageTransforms(seconds) : rocketRepairTransforms(repairing);
  return `<g id="rocket-wreckage" opacity="${repairing == null ? 1 : 1 - rocketRepairOpacity(repairing)}" role="img" aria-label="${escape(text('rocket_wreckage'))}" stroke="#101014" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"><ellipse cy="22" rx="111" ry="20" fill="#101014" stroke="none" opacity=".12"/>${pieces.map((piece, i) => `<g id="rocket-debris-${piece.id}" transform="${transforms[i].transform}">${piece.art}</g>`).join('')}</g>`;
}
