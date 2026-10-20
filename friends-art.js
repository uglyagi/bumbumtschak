import { FRIEND_CAMP, FRIEND_TENT } from './friends-game.js';
import { text } from './content.js';
import { escapeXML as escape } from './utils.js';

function animalMarkup(actor) {
  return '<g id="friend-' + actor.id + '" class="friend-guest' + (actor.status === 'camping' ? ' is-sitting' : '') + '" pointer-events="none" transform="translate(' + actor.position.x.toFixed(2) + ' ' + actor.position.y.toFixed(2) + ')"><ellipse rx="25" ry="9" fill="#101014" opacity=".16"/><g class="friend-body" style="--camp-delay:' + (actor.index * -.65) + 's"><use href="#animal-' + escape(actor.id) + '" x="-34" y="-77" width="68" height="82"/></g>' + '</g>';
}
export function friendsHiddenMarkup(friends) {
  return friends.actors.filter(actor => actor.status === 'hidden').map(animalMarkup).join('');
}
export function friendsWorldMarkup(friends) {
  const tent = friends.unlocked ? '<g data-friends-tent="" role="button" tabindex="0" aria-label="' + escape(text('friends_meet')) + '"><title>' + escape(text('friends_tent')) + '</title><g id="friend-tent" transform="translate(' + FRIEND_TENT.x + ' ' + FRIEND_TENT.y + ')"><ellipse rx="92" ry="12" fill="#101014" opacity=".15"/><g id="friend-tent-fabric" stroke="#101014" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M-76 0-12-94l79 19 42 75Z" fill="#ff87ce"/><path d="M-76 0-12-94 38 0Z" fill="#fff20b"/><path d="M-52 0-12-65 15 0Z" fill="#1d55ff"/><path d="m-12-65 4 65" fill="none"/><path d="m67-75 48 68m-191 7-13 9m127-9 11 9m60-9 10 9" fill="none"/><path d="M-89 5v9m139-9v9m69-9v9" stroke-width="5"/></g></g></g>' : '';
  return tent + friends.actors.filter(actor => !['hidden', 'home'].includes(actor.status)).map(animalMarkup).join('') + '<g id="friends-confetti"></g>';
}
export function friendsCampfireMarkup(friends) {
  return friends.unlocked ? '<g transform="translate(' + FRIEND_CAMP.x + ' ' + FRIEND_CAMP.y + ')" pointer-events="none"><ellipse cy="7" rx="37" ry="15" fill="#101014" opacity=".1"/><g stroke="#101014" stroke-width="2.5" stroke-linejoin="round">' + Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return '<ellipse cx="' + (Math.cos(a) * 29).toFixed(1) + '" cy="' + (Math.sin(a) * 11 + 5).toFixed(1) + '" rx="8" ry="5" fill="#b9b9bc"/>'; }).join('') + '<path d="m-19 10 35-13 5 8-35 13Z" fill="#ad6a47"/><path d="m-15-2 35 12-5 8-35-13Z" fill="#784128"/><g id="friend-fire-flame" hidden=""><path d="M-19 6Q-30-10-13-23q-2 12 4 12 0-17 12-33-1 20 12 26 16 13 5 24Z" fill="#ff6c35"/><path d="M-8 9Q-17-3 1-21q-1 11 9 14 9 10 0 16Z" fill="#fff20b" stroke-width="2"/></g></g></g>' : '';
}
export function friendsConfettiMarkup(time, position, reduced = false) {
  if (!position || time < 0 || time >= 2.4) return '';
  return '<g pointer-events="none" aria-hidden="true">' + Array.from({ length: 36 }, (_, i) => {
    const t = Math.max(0, time - i % 6 * .055), x = position.x + Math.sin(i * 2.4) * 155 * Math.min(1, t * 2);
    const y = reduced ? position.y - 65 : position.y - 140 + t * 125 + Math.cos(i * 1.8) * 60;
    return '<rect x="-4" y="-7" width="8" height="14" rx="1" transform="translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ') rotate(' + (reduced ? 0 : i * 23 + t * 75).toFixed(2) + ')" fill="' + ['#fff20b', '#ff87ce', '#1d55ff', '#4acb59', '#ffffff', '#ff3935'][i % 6] + '" stroke="#101014" stroke-width="1" opacity="' + (t <= 0 ? 0 : Math.max(0, 1 - t / 2.4).toFixed(2)) + '"/>';
  }).join('') + '</g>';
}
