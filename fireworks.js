export const FIREWORK_SECONDS = 2.8;
export function fireworksMarkup(celebration, reduced = false, id = 'fireworks') {
  if (!celebration || celebration.time >= FIREWORK_SECONDS) return '';
  const sparks = Array.from({ length: 36 }, (_, i) => {
    const burst = i % 3, t = Math.max(0, celebration.time - burst * .35), angle = Math.floor(i / 3) / 12 * Math.PI * 2 + burst * .2, distance = reduced ? 42 : Math.min(105, t * 85);
    const x = (burst - 1) * 70 + Math.cos(angle) * distance, y = -25 - burst % 2 * 35 + Math.sin(angle) * distance + (reduced ? 0 : t * t * 12);
    return `<path d="M-3 0h6M0-3v6" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${i * 31})" stroke="${['#fff20b', '#ff87ce', '#1d55ff', '#ffffff', '#ff3935'][i % 5]}" stroke-width="3.5" stroke-linecap="round" opacity="${t <= 0 || t > 1.9 ? 0 : Math.max(0, 1 - t / 1.9).toFixed(2)}"/>`;
  }).join('');
  return `<g id="${id}" pointer-events="none" aria-hidden="true" transform="translate(${celebration.x} ${celebration.y})">${sparks}</g>`;
}
