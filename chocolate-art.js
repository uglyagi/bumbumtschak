import { defs } from './art.js';
import { playerMarkup } from './room-art.js';
import { text } from './content.js';
import { escapeXML as escape } from './utils.js';
import { MAZE, CHOCOLATE_ROWS, MAZE_EXIT, MAZE_CHOCOLATES, chocolateBarMarkup } from './chocolate.js';
export function chocolateMazeMarkup(run) {
  const walls = [], floor = [];
  for (let row = 0; row < MAZE.rows; row++) {
    for (let col = 0; col < MAZE.cols; col++) {
      if (CHOCOLATE_ROWS[row][col] !== '0') continue;
      const x = MAZE.x + col * MAZE.cell, y = MAZE.y + row * MAZE.cell;
      floor.push('<rect x="' + x + '" y="' + y + '" width="64" height="64" fill="' + ['#fff6a3', '#ffd0e8', '#b5ed9b'][(col + row) % 3] + '"/><circle cx="' + (x + 10) + '" cy="' + (y + 12) + '" r="2.5" fill="#ad6a47" opacity=".35"/>');
    }
    for (let col = 0; col < MAZE.cols;) {
      if (CHOCOLATE_ROWS[row][col] !== '1') { col++; continue; }
      const start = col; while (col < MAZE.cols && CHOCOLATE_ROWS[row][col] === '1') col++;
      const x = MAZE.x + start * MAZE.cell, y = MAZE.y + row * MAZE.cell, width = (col - start) * MAZE.cell;
      walls.push('<g><rect x="' + x + '" y="' + y + '" width="' + width + '" height="64" rx="9" fill="' + ['#ff87ce', '#1d55ff', '#4acb59', '#fff20b'][(row + start) % 4] + '" stroke="#101014" stroke-width="5"/><path d="M' + (x + 12) + ' ' + (y + 14) + 'h' + (width - 24) + '" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity=".4"/><path d="M' + (x + 10) + ' ' + (y + 53) + 'h' + (width - 20) + '" stroke="#784128" stroke-width="7" stroke-linecap="round" opacity=".4"/></g>');
    }
  }
  return '<svg id="world-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1100" font-family="Trebuchet MS,Arial,sans-serif" aria-label="' + escape(text('choco_title')) + '">' + defs()
    + '<rect width="1600" height="1100" fill="#bde7ff"/><path d="M0 100Q160 65 320 105T640 95 960 105 1280 90 1600 110V1100H0Z" fill="#ff87ce" stroke="#101014" stroke-width="5"/><rect x="112" y="128" width="1376" height="864" rx="20" fill="#784128" stroke="#101014" stroke-width="6"/>'
    + '<text x="800" y="70" text-anchor="middle" font-size="40" font-weight="900" fill="#101014">' + escape(text('choco_title')) + '</text><text id="chocolate-status" x="800" y="112" text-anchor="middle" font-size="21" font-weight="900" fill="#101014">' + escape(text('choco_count', { anzahl: run.collected.length })) + '</text>'
    + floor.join('') + walls.join('')
    + MAZE_CHOCOLATES.map(treat => '<g id="maze-' + treat.id + '" transform="translate(' + treat.x + ' ' + (treat.y - 4) + ') scale(.66)"' + (run.collected.includes(treat.id) ? ' hidden=""' : '') + '><ellipse cy="26" rx="29" ry="10" fill="#101014" opacity=".12"/>' + chocolateBarMarkup() + '</g>').join('')
    + '<g data-room-target="chocolate-exit" role="button" tabindex="0" aria-label="' + escape(text('choco_back')) + '"><path d="M' + MAZE_EXIT.x + ' ' + (MAZE_EXIT.y - 20) + 'v37m-11-12 11 12 11-12" fill="none" stroke="#101014" stroke-width="5" stroke-linecap="round"/><rect x="128" y="1000" width="300" height="46" rx="12" fill="#fff20b" stroke="#101014" stroke-width="4"/><text x="278" y="1030" text-anchor="middle" font-size="18" font-weight="900">' + escape(text('choco_back')) + '</text></g>'
    + '<g id="chocolate-celebration"></g><g id="destination-marker" hidden=""></g>'
    + playerMarkup.replace('x="-34" y="-77" width="68" height="82"', 'x="-24" y="-52" width="48" height="58"') + '</svg>';
}
