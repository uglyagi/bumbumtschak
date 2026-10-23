import { FLOWERS, TREES, onPath } from './painting.js';
import { animalHref } from './hat-quest.js';
import { FRIEND_CAMP, FRIEND_TENT } from './friends-game.js';
import { text } from './content.js';
import { escapeXML as escape } from './utils.js';

function animalMarkup(actor) {
  return '<g id="friend-' + actor.id + '" class="friend-guest' + (actor.status === 'camping' ? ' is-sitting' : '') + '" pointer-events="none" transform="translate(' + actor.position.x.toFixed(2) + ' ' + actor.position.y.toFixed(2) + ')"><ellipse rx="25" ry="9" fill="#101014" opacity=".16"/><g class="friend-body" style="--camp-delay:' + (actor.index * -.65) + 's"><use href="' + animalHref(actor.id, false, actor.facing) + '" x="-34" y="-77" width="68" height="82"/></g>' + '</g>';
}
export function friendsHiddenMarkup(friends) {
  return friends.actors.filter(actor => actor.scene !== 'radio' && actor.status === 'hidden').map(animalMarkup).join('');
}
export function friendsWorldMarkup(friends) {
  const tent = friends.unlocked ? '<g data-friends-tent="" role="button" tabindex="0" aria-label="' + escape(text('friends_meet')) + '"><title>' + escape(text('friends_tent')) + '</title><g id="friend-tent" transform="translate(' + FRIEND_TENT.x + ' ' + FRIEND_TENT.y + ')"><ellipse rx="92" ry="12" fill="#101014" opacity=".15"/><g id="friend-tent-fabric" stroke="#101014" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M-76 0-12-94l79 19 42 75Z" fill="#ff87ce"/><path d="M-76 0-12-94 38 0Z" fill="#fff20b"/><path d="M-52 0-12-65 15 0Z" fill="#1d55ff"/><path d="m-12-65 4 65" fill="none"/><path d="m67-75 48 68m-191 7-13 9m127-9 11 9m60-9 10 9" fill="none"/><path d="M-89 5v9m139-9v9m69-9v9" stroke-width="5"/></g></g></g>' : '';
  return (friends.unlocked ? campFlowers : '') + tent + friends.actors.filter(actor => actor.scene !== 'radio' && !['hidden', 'home'].includes(actor.status)).map(animalMarkup).join('') + '<g id="friends-confetti"></g>';
}
// A stable, softly rounded flower meadow, denser at its centre.
// Reserve each complete flower plus a visible gap from all nearby scenery.
const campFlowerObstacles=[
  ...TREES.map(([x,y,w,h])=>[x,y,w,h]),
  ...FLOWERS.map(([x,y,,w])=>[x,y,w,w*1.2]),
  [FRIEND_TENT.x-94,FRIEND_TENT.y-100,220,116],
  [FRIEND_CAMP.x-42,FRIEND_CAMP.y-50,84,73],
  [1315,643,135,205], // Mailbox, sign and stand.
];
const campFlowerPoints=[];
for(let i=0;i<240;i++){
  const angle=i*2.399963229728653, radius=Math.pow((i+.5)/240,.85);
  const x=FRIEND_CAMP.x-20+Math.cos(angle)*215*radius;
  const y=FRIEND_CAMP.y-40+Math.sin(angle)*100*radius;
  if(campFlowerObstacles.some(([a,b,w,h])=>x+10>a-16 && x-10<a+w+16 && y>b-16 && y-22<b+h+16))continue;
  let path=false;
  for(let dx=-18;dx<=18;dx+=6)for(let dy=-30;dy<=8;dy+=6)if(onPath({x:x+dx,y:y+dy}))path=true;
  if(path || campFlowerPoints.some(p=>Math.hypot(p.x-x,p.y-y)<14))continue;
  campFlowerPoints.push({x,y,index:i});
}
// No paint targets, interactions or collision areas: these colours stay fixed.
const campFlowers = '<g id="camp-meadow-flowers" pointer-events="none" aria-hidden="true">' + campFlowerPoints.map(({x,y,index:i})=>{
  const color=['#fff20b','#ff87ce','#ff3935','#7d69e8','#1d55ff','#ffffff','#ffad42'][i%7], size=3.2+i%3*.6;
  return `<g transform="translate(${x} ${y})"><path d="M0 0v-9m0 6-4-3" fill="none" stroke="#287c3e" stroke-width="1.3"/><g fill="${color}" stroke="#101014" stroke-width=".65">${Array.from({length:5},(_,p)=>{const a=p*Math.PI*2/5;return `<circle cx="${(Math.cos(a)*size).toFixed(1)}" cy="${(-12+Math.sin(a)*size).toFixed(1)}" r="${size}"/>`;}).join('')}<circle cy="-12" r="2" fill="#fff20b"/></g></g>`;
}).join('')+'</g>';
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

export function friendsRoomMarkup(friends) {
  return friends.actors.filter(actor => actor.scene === 'radio').map(animalMarkup).join('');
}
export function friendsRoundMarkup(friends, player, animal, scene) {
  if (scene !== 'world') return '';
  const counting = ['countdown', 'hide-countdown'].includes(friends.phase);
  const subject = friends.phase === 'hide-countdown' ? friends.actors[0]?.position : player;
  const hands = '<g stroke="#101014" stroke-width="2.5" fill="#ffffff"><path d="M-26-22Q-34-39-18-49M26-22Q34-39 18-49" fill="none" stroke-width="8"/><ellipse cx="-12" cy="-49" rx="12" ry="10"/><ellipse cx="12" cy="-49" rx="12" ry="10"/></g>';
  if (counting && subject) return '<g transform="translate(' + subject.x + ' ' + subject.y + ')">' + hands + '<rect x="-30" y="-130" width="60" height="42" rx="14" fill="#fff" stroke="#101014" stroke-width="3"/><text y="-100" text-anchor="middle" font-size="30" font-weight="900" fill="#101014">' + Math.max(1, 10 - Math.floor(friends.elapsed)) + '</text></g>';
  if (friends.phase === 'hiding') return '<g transform="translate(' + player.x + ' ' + player.y + ')"><rect x="-37" y="-124" width="74" height="32" rx="12" fill="#fff" stroke="#101014" stroke-width="2"/><text y="-101" text-anchor="middle" font-size="20" font-weight="800" fill="#101014">' + Math.max(0, Math.ceil(45 - friends.elapsed)) + ' s</text></g>';
  return '';
}
