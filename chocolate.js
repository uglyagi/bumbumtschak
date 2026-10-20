export const CHOCOLATE_SPEED_SECONDS = 19;
export const CHOCOLATE_FADE_SECONDS = 4;
export const CHOCOLATE_DOOR = { x: 679, y: 494 };
export const CHOCOLATE_RETURN = { x: 679, y: 550 };
export const CHOCOLATE_DRAWER = { id: 'chocolate-drawer', x: 815, y: 320 };
export const MAZE = { x: 128, y: 144, cell: 64, cols: 21, rows: 13 };
const at = (col, row) => ({ x: MAZE.x + (col + .5) * MAZE.cell, y: MAZE.y + (row + .5) * MAZE.cell });
export const MAZE_SPAWN = at(1, 11);
export const MAZE_EXIT = at(1, 12);
function makeRows() {
  const grid = Array.from({ length: MAZE.rows }, () => Array(MAZE.cols).fill(1)), stack = [[1, 11]];
  let seed = 72819; grid[11][1] = 0;
  while (stack.length) {
    const [x, y] = stack[stack.length - 1], choices = [[2, 0], [-2, 0], [0, 2], [0, -2]].map(([dx, dy]) => [x + dx, y + dy, dx, dy]).filter(([nx, ny]) => nx > 0 && nx < MAZE.cols - 1 && ny > 0 && ny < MAZE.rows - 1 && grid[ny][nx]);
    if (!choices.length) { stack.pop(); continue; }
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const [nx, ny, dx, dy] = choices[Math.floor(seed / 4294967296 * choices.length)];
    grid[y + dy / 2][x + dx / 2] = 0; grid[ny][nx] = 0; stack.push([nx, ny]);
  }
  grid[12][1] = 0;
  return grid.map(row => row.join(''));
}
export const CHOCOLATE_ROWS = makeRows();
const cellOf = point => ({ col: Math.floor((point.x - MAZE.x) / MAZE.cell), row: Math.floor((point.y - MAZE.y) / MAZE.cell) });
const free = (col, row) => CHOCOLATE_ROWS[row]?.[col] === '0';
const key = (col, row) => row * MAZE.cols + col;
function distances(point) {
  const first = cellOf(point), queue = [first], found = new Map([[key(first.col, first.row), 0]]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const col = p.col + dx, row = p.row + dy, id = key(col, row);
      if (free(col, row) && !found.has(id)) { found.set(id, found.get(key(p.col, p.row)) + 1); queue.push({ col, row }); }
    }
  }
  return found;
}
function makeTreats() {
  const candidates = [];
  for (let row = 1; row < MAZE.rows - 1; row += 2) for (let col = 1; col < MAZE.cols - 1; col += 2) {
    const neighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => free(col + dx, row + dy));
    if (neighbours.length === 1 && Math.hypot(at(col, row).x - MAZE_SPAWN.x, at(col, row).y - MAZE_SPAWN.y) > MAZE.cell) candidates.push({ ...at(col, row), col, row });
  }
  const result = [], maps = [distances(MAZE_SPAWN)];
  while (result.length < 5) {
    const sorted = candidates.filter(p => !result.includes(p)).sort((a, b) => Math.min(...maps.map(map => map.get(key(b.col, b.row)))) - Math.min(...maps.map(map => map.get(key(a.col, a.row)))));
    const chosen = sorted[0]; result.push(chosen); maps.push(distances(chosen));
  }
  return result.map((point, i) => ({ ...point, id: 'chocolate-' + (i + 1) }));
}
export const MAZE_CHOCOLATES = makeTreats();
export function canStandChocolate(x, y, radius = 18) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < MAZE.x + radius || x > MAZE.x + MAZE.cols * MAZE.cell - radius || y < MAZE.y + radius || y > MAZE.y + MAZE.rows * MAZE.cell - radius) return false;
  const point = cellOf({ x, y });
  for (let row = point.row - 1; row <= point.row + 1; row++) for (let col = point.col - 1; col <= point.col + 1; col++) {
    if (free(col, row)) continue;
    const left = MAZE.x + col * MAZE.cell, top = MAZE.y + row * MAZE.cell;
    const dx = x - Math.max(left, Math.min(left + MAZE.cell, x)), dy = y - Math.max(top, Math.min(top + MAZE.cell, y));
    if (dx * dx + dy * dy < radius * radius) return false;
  }
  return true;
}
export function chocolatePath(start, end) {
  if (!canStandChocolate(start.x, start.y) || !canStandChocolate(end.x, end.y)) return [];
  const a = cellOf(start), b = cellOf(end), queue = [a], previous = new Map([[key(a.col, a.row), null]]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]; if (p.col === b.col && p.row === b.row) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const col = p.col + dx, row = p.row + dy, id = key(col, row);
      if (free(col, row) && !previous.has(id)) { previous.set(id, p); queue.push({ col, row }); }
    }
  }
  if (!previous.has(key(b.col, b.row))) return [];
  const path = [];
  for (let p = b; p; p = previous.get(key(p.col, p.row))) path.push(at(p.col, p.row));
  return [...path.reverse(), { ...end }];
}
export const isChocolateTrack = track => !!track && (['schokolade', 'song-66d899a2-18b0-4eba-ac96-b41a7aedc6ed'].includes(track.id) || track.title?.trim().toLocaleLowerCase('de') === 'schokolade');
export const touchingChocolateDoor = position => Math.abs(position.x - CHOCOLATE_DOOR.x) <= 29 && position.y >= 482 && position.y <= 510;
export function createChocolate(saved) { return { unlocked: saved?.unlocked === true, carrying: false, boost: 0, active: false, session: false, collected: [], run: null }; }
export const savedChocolate = chocolate => ({ unlocked: chocolate.unlocked });
export const chocolateSpeed = chocolate => 1 + Math.min(1, Math.max(0, chocolate.boost) / CHOCOLATE_FADE_SECONDS);
export const chocolateMusicGain = chocolate => Math.min(1, Math.max(0, chocolate.boost) / CHOCOLATE_FADE_SECONDS);
export function tickChocolate(chocolate, elapsed) { chocolate.boost = Math.max(0, chocolate.boost - Math.max(0, elapsed)); }
export function takeChocolate(chocolate) { if (!chocolate.unlocked || chocolate.carrying) return false; chocolate.carrying = true; return true; }
export function eatChocolate(chocolate) { if (!chocolate.carrying) return false; chocolate.carrying = false; chocolate.boost = CHOCOLATE_SPEED_SECONDS; return true; }
export function newChocolateRun(collected = []) {
  const found = [...new Set(Array.isArray(collected) ? collected : [])].filter(id => MAZE_CHOCOLATES.some(treat => treat.id === id));
  return { phase: 'search', collected: found, celebration: 0, exitPath: [], exitReason: null };
}
export function collectChocolate(run, position) {
  if (!run || run.phase !== 'search') return null;
  const treat = MAZE_CHOCOLATES.find(treat => !run.collected.includes(treat.id) && Math.hypot(treat.x - position.x, treat.y - position.y) < 27);
  if (!treat) return null;
  run.collected.push(treat.id);
  if (run.collected.length === 5) { run.phase = 'celebrate'; run.celebration = 0; return 'complete'; }
  return 'collected';
}
export function beginChocolateExit(run, position, reason = 'manual') {
  if (!run || run.phase === 'leaving') return false;
  run.phase = 'leaving'; run.exitReason = reason; run.exitPath = chocolatePath(position, MAZE_EXIT);
  return true;
}
export function advanceChocolateExit(run, position, seconds) {
  let point = { ...position }, remaining = 330 * Math.min(.05, Math.max(0, seconds));
  while (run.exitPath.length && remaining > 0) {
    const target = run.exitPath[0], distance = Math.hypot(target.x - point.x, target.y - point.y);
    if (distance < .01) { run.exitPath.shift(); continue; }
    const amount = Math.min(distance, remaining);
    point = { x: point.x + (target.x - point.x) / distance * amount, y: point.y + (target.y - point.y) / distance * amount }; remaining -= amount;
  }
  return { position: point, done: !run.exitPath.length };
}
export const chocolateBarMarkup = () => '<g stroke="#101014" stroke-width="3" stroke-linejoin="round"><rect x="-19" y="-27" width="38" height="56" rx="4" fill="#784128"/><path d="M-16-8h32m-32 18h32M0-24v51" stroke="#3d231d" stroke-width="2"/><path d="M-22 5h44v25h-44Z" fill="#ff87ce"/><path d="m-22 5 7-5 7 5 8-5 8 5 7-5 7 5" fill="#fff20b"/><path d="m-8 17 5 6 12-12" fill="none" stroke="#ffffff"/></g>';
export function chocolateConfetti(time, x, y, reduced = false) {
  if (time < 0 || time > 2.4) return '';
  return '<g id="chocolate-confetti" pointer-events="none" aria-hidden="true">' + Array.from({ length: 36 }, (_, i) => {
    const delay = i % 6 * .065, t = Math.max(0, time - delay), spread = Math.sin(i * 2.4) * 140;
    const px = x + spread * Math.min(1, t * 2), py = reduced ? y - 65 : y - 150 + t * 130 + Math.cos(i * 1.8) * 60;
    return '<rect x="-4" y="-7" width="8" height="14" rx="1" transform="translate(' + px.toFixed(2) + ' ' + py.toFixed(2) + ') rotate(' + (reduced ? 0 : i * 23 + t * 75).toFixed(2) + ')" fill="' + ['#fff20b', '#ff87ce', '#1d55ff', '#4acb59', '#ffffff', '#ff3935'][i % 6] + '" stroke="#101014" stroke-width="1" opacity="' + (t <= 0 ? 0 : Math.max(0, 1 - t / 2.4).toFixed(2)) + '"/>';
  }).join('') + '</g>';
}
