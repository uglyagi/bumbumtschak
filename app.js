import { WORLD, WORLD_SPAWN, STATIONS, clamp, move, planPath, isActionKey, HOUSE_DOORS, worldTouch, canLandRocket, rocketExitPosition } from './game-core.js';
import { ANIMALS, BAND, TRACKS, CONCERTS, CONTACT, INFO, PALETTE, loadContent, text } from './content.js';
import { PAINT_SURFACES, PAINT_RESET, PAINT_NEXT, paintSlots, paintPages, nearbyPaintSurface, canPaintSurface, cleanPaint, paintCanMarkup, createPaintPreview } from './painting.js';
import { icon, avatar, memberArt, worldMarkup } from './art.js';
import { cassetteMarkup, cassetteSVG, roomMarkup, slotContents, slotDescription } from './room-art.js';
import { ROOMS, ROOM_SPAWN, EXIT, RADIO, TAPE_SLOTS, SHELF_SWITCH, ROOM_PROPS, ANIMAL_SPOTS, slotsOnPage, tapePages, findTapeSlot, refreshBandWayfinding, roomFor, createCassetteState, tapeLocation, cassetteAction, nearbyInteraction, throughExit, nextMenuIndex } from './rooms.js';
import { brandIcon, socialPads, contactLinks } from './social.js';
import { adminURL } from './connection.js';
import { SKY, GROUND_ROCKET, moveRocket, outsideScene } from './sky-world.js';

const previewMode = new URLSearchParams(location.search).get('preview') === '1';
const contentStatus = await loadContent(previewMode);
refreshBandWayfinding();

const $ = selector => document.querySelector(selector);
const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const T = (key, variables) => escape(text(key, variables));
const safeURL = value => { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
const storage = {
  get(key, fallback) { try { return localStorage.getItem(`bbt-${key}`) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(`bbt-${key}`, value); } catch { /* The world also works without storage. */ } },
};
const savedAnimal = storage.get('animal', '');
const paintStorageKey = previewMode ? 'paint-preview' : 'paint-world';
let savedPaint = {};
try { savedPaint = cleanPaint(JSON.parse(storage.get(paintStorageKey, '{}'))); } catch { /* A damaged local drawing starts with the original colors. */ }
const state = {
  animal: ANIMALS.some(a => a.id === savedAnimal) ? savedAnimal : 'cat',
  scene: 'world', returnPosition: null, tapes: createCassetteState(), shelfPage: 0,
  started: ANIMALS.some(a => a.id === savedAnimal),
  position: { ...WORLD_SPAWN },
  camera: { x: 800, y: 520 },
  viewport: { w: 1480, h: 850 },
  keys: new Set(), pad: new Map(), path: [], destination: null,
  near: null, modal: null, playing: false,
  paint: savedPaint, paintCan: null, paintPage: 0, paintTarget: null,
  rocket: { position: { ...GROUND_ROCKET }, riding: false, airborne: false },
  volume: clamp(Number(storage.get('volume', '.6')) || 0, 0, 1),
  reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
};
const game = $('#game'), modal = $('#modal'), modalContent = $('#modal-content'), audio = $('#audio');
game.innerHTML = worldMarkup();
let world = $('#world-svg'), player = $('#player'), playerUse = $('#player-use'), marker = $('#destination-marker');
$('#radio-shortcut').innerHTML = icon('music');
$('#help-button').innerHTML = icon('help');
$('.wayfinder').innerHTML = `${icon('map')} ${T('wayfinder')}`;
$('.brand-caption').textContent = INFO.tagline;
for (const node of document.querySelectorAll('[data-copy]')) node.textContent = text(node.dataset.copy);
for (const node of document.querySelectorAll('[data-copy-aria]')) node.setAttribute('aria-label', text(node.dataset.copyAria));
document.title = text('page_title');
document.querySelector('meta[name=description]')?.setAttribute('content', text('page_description'));
audio.volume = state.volume;
let previousFocus = null, toastTimer, lastTime = 0, stuckTime = 0, paintPreview = null;

function announce(message) { $('#announcement').textContent = message; }
function toast(message) { clearTimeout(toastTimer); const el = $('#toast'); el.textContent = message; el.hidden = false; toastTimer = setTimeout(() => { el.hidden = true; }, 3500); }
function updateAnimal() {
  const animal = ANIMALS.find(a => a.id === state.animal);
  playerUse.setAttribute('href', `#animal-${animal.id}`);
  $('#rocket-pilot')?.setAttribute('href', `#animal-${animal.id}`);
  $('#player-chip').innerHTML = `${avatar(animal.id)}<span><strong>${animal.name}</strong><small>${T('character_change')}</small></span>`;
  $('#player-chip').setAttribute('aria-label', text('player_label', { tier: animal.name }));
}
function characterPanel() {
  return `<div class="modal-wrap welcome">${state.started ? closeButton() : ''}
    <div class="modal-kicker"><span class="welcome-sticker">${T('welcome_kicker')}</span></div><h2 id="modal-title">${T('welcome_title')}</h2>
    <p class="modal-intro editable-prose">${T('welcome_intro')}</p><div class="character-grid" role="group" aria-label="${T('animal_group')}">${ANIMALS.map(a => `<button class="character-option" data-character="${a.id}" style="--animal-color:${a.color}" aria-pressed="${state.animal === a.id}"><span class="character-check">${icon('check')}</span>${avatar(a.id)}<strong>${escape(a.name)}</strong><small>${escape(a.trait)}</small></button>`).join('')}</div>
    <div class="modal-actions"><button class="primary-button" data-action="start">${T(state.started ? 'welcome_resume' : 'welcome_start')} ${icon('arrow')}</button><button class="text-button" data-action="start-radio">${T('welcome_radio')}</button></div>
    ${state.started ? exitWay() : ''}<div class="welcome-foot"><span>${T('welcome_keys')}</span><span>${icon('music')} ${T('welcome_music')}</span></div></div>`;
}
const inspectionPanels = new Set(['grownups', 'letter', 'help']);
const backLabel = () => text(state.scene === 'sky' ? 'back_flight' : state.scene === 'world' ? 'back_world' : 'back_room');
const closeButton = () => `<button class="modal-close" data-action="close" aria-label="${escape(backLabel())}">${icon('close')}</button>`;
function exitWay() {
  return `<div class="modal-exitway"><button class="secondary-button" data-action="close">↩ ${escape(backLabel())}</button>${state.scene !== 'world' ? `<button class="text-button" data-action="leave">${T('back_direct')}</button>` : ''}<small>${T(inspectionPanels.has(state.modal) ? 'inspect_close_hint' : 'menu_keys')}</small></div>`;
}
function wrap(kicker, title, contents, className = '') {
  return `<div class="modal-wrap ${className}">${closeButton()}<div class="modal-kicker">${kicker}</div><h2 id="modal-title">${escape(title)}</h2>${contents}${exitWay()}</div>`;
}
function radioPanel() {
  const track = TRACKS.find(t => t.id === state.tapes.loaded);
  return wrap(`${icon('cassette')} ${T('radio_kicker')}`, text('radio_title'), `<p class="modal-intro editable-prose">${T('radio_intro')}</p>
    <div class="radio-layout"><div><div class="boombox ${state.playing ? 'is-playing' : ''}"><div class="radio-handle"></div><div class="radio-topline"><span>${T('radio_name')}</span><span class="radio-lights" aria-hidden="true"><i></i><i></i><i></i></span></div>
    <div class="radio-speakers" aria-hidden="true"><div class="speaker"></div><div class="tape-window"><strong>${track ? escape(track.title) : T('radio_empty')}</strong><div class="reels"><span class="reel"></span><span class="reel"></span></div></div><div class="speaker"></div></div>
    <div class="radio-controls"><button class="play-button" data-action="play" ${!track?.src ? 'disabled' : ''} aria-label="${T(state.playing ? 'pause_label' : track?.src ? 'play_label' : 'missing_audio_label')}">${icon(state.playing ? 'pause' : 'play')}</button><label class="volume-label">${T('radio_volume')} <input id="volume" type="range" min="0" max="1" step=".05" value="${state.volume}" aria-label="${T('radio_volume')}"></label></div></div>
    <div class="now-playing"><div class="track-category">${T(track ? 'radio_loaded' : 'radio_how')}</div><h3>${track ? escape(track.title) : T('radio_how_title')}</h3><p class="editable-prose">${track ? escape(track.description) : T('radio_how_body')}</p>${track && !track.src ? `<p class="audio-notice">${T('radio_no_audio')}</p>` : ''}</div></div>
    <div class="tape-shelf" role="group" aria-label="${T('radio_tape_group')}">${TRACKS.map((t, i) => `<button class="tape-card physical-tape-card" data-track="${t.id}" style="--tape-color:${t.color};--tape-tilt:${i % 2 ? '2deg' : '-2deg'}" aria-label="${T('walk_tape', { lied: t.title })}">${cassetteSVG(t)}<strong>${escape(t.title)}</strong><small>${icon('arrow')} ${T(state.tapes.loaded === t.id ? 'radio_walk' : state.tapes.carrying === t.id ? 'slot_walk' : 'tape_walk')}</small></button>`).join('')}</div></div><p class="radio-note editable-prose">${T('radio_note')}</p>`);
}
function concertsPanel() {
  const events = CONCERTS.filter(c => c.date && c.title && new Date(c.date).getTime() > Date.now() - 6 * 60 * 60 * 1000).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  return wrap(`${icon('calendar')} ${T('concert_kicker')}`, text('concert_title'), `<p class="modal-intro editable-prose">${T('concert_intro')}</p>${events.length ? `<div class="concert-list">${events.map(c => {
    const date = new Date(c.date), opts = { timeZone: c.timeZone || 'Europe/Vienna' };
    return `<article class="concert-row"><div class="concert-date"><strong>${new Intl.DateTimeFormat('de-AT', { ...opts, day: '2-digit' }).format(date)}</strong><small>${new Intl.DateTimeFormat('de-AT', { ...opts, month: 'short' }).format(date)}</small></div><div><h3>${escape(c.title)}</h3><p>${escape(c.place || '')} · ${new Intl.DateTimeFormat('de-AT', { ...opts, hour: '2-digit', minute: '2-digit' }).format(date)} ${T('concert_time')}</p></div>${safeURL(c.url) ? `<a href="${escape(safeURL(c.url))}" target="_blank" rel="noopener noreferrer">${T('concert_tickets')}</a>` : ''}</article>`;
  }).join('')}</div>` : `<div class="chalkboard"><span class="chalk-star" aria-hidden="true">✦</span><h3>${T('concert_empty_title')}</h3><p class="editable-prose">${T('concert_empty_body')}</p></div>`}<div class="modal-actions"><button class="secondary-button" data-open="radio">${T('concert_radio')} ${icon('arrow')}</button></div>`);
}
function bandPanel(id) {
  const member = BAND.find(b => b.id === id) || BAND[0];
  return wrap(T('band_kicker'), text('band_title'), `<div class="member-tabs" role="tablist" aria-label="${T('band_group')}">${BAND.map(b => `<button class="member-tab" id="tab-${b.id}" data-member="${b.id}" style="--member-color:${b.color}" role="tab" aria-controls="member-panel" aria-selected="${member.id === b.id}" tabindex="${member.id === b.id ? '0' : '-1'}">${escape(b.name)}</button>`).join('')}</div>
    <div id="member-panel" class="band-layout" role="tabpanel" aria-labelledby="tab-${member.id}"><div class="member-portrait" style="--member-color:${member.color}">${memberArt(member.id)}${member.sound ? `<span class="sound-sticker">${escape(member.sound)}</span>` : ''}</div><div class="member-story"><div class="member-role">${escape(member.role)}</div><h3>${escape(member.name)}</h3><p class="editable-prose">${escape(member.intro)}</p></div></div>
    <div class="band-story"><h3>${T('band_story_title')}</h3><p class="editable-prose">${escape(INFO.about)}</p></div><div class="modal-actions"><button class="secondary-button" data-open="radio">${T('band_radio')} ${icon('arrow')}</button><button class="text-button" data-open="concerts">${T('band_concert')}</button></div>`);
}
function grownupsPanel() {
  const email = contactLinks().find(l => l.id === 'email');
  return wrap(T('grown_kicker'), text('grown_title'), `<div class="desk-surface"><div class="desk-pencil" aria-hidden="true"></div><div class="desk-cup" aria-hidden="true"></div>
    <article class="desk-paper desk-intro"><p class="editable-prose">${T('grown_intro')}</p></article>
    <article class="desk-paper desk-music"><h3>${T('grown_music_title')}</h3><p class="editable-prose">${T('grown_music_body')}</p></article>
    <article class="desk-paper desk-contact"><h3>${T('grown_contact_title')}</h3><p class="editable-prose">${T(email ? 'grown_contact_body' : 'grown_contact_empty')}</p>${email ? `<strong class="desk-address">${escape(email.email)}</strong>` : ''}</article>
    <article class="desk-paper desk-how"><h3>${T('grown_how_title')}</h3><p class="editable-prose">${T('grown_how_body')}</p></article></div>`, 'desk-view');
}
function letterPanel() {
  const email = contactLinks().find(l => l.id === 'email');
  return wrap(brandIcon('email'), text('email_title'), `<div class="letter-envelope"><div class="letter-sheet"><span class="letter-stamp" aria-hidden="true">♥</span><p class="editable-prose">${T('email_letter_body')}</p><address>${email ? escape(email.email) : T('grown_contact_empty')}</address></div></div>`, 'letter-view');
}
function mapPanel() {
  return wrap(`${icon('map')} ${T('map_kicker')}`, text('map_title'), `<p class="modal-intro editable-prose">${T('map_intro')}</p><div class="map-grid">${STATIONS.map((s, i) => `<button class="map-destination" data-goto="${s.id}" style="--station-color:${s.color}"><span class="destination-dot">${i + 1}</span><span><strong>${escape(s.label)}</strong><small>${escape(s.short)}</small></span>${icon('arrow')}</button>`).join('')}</div>`);
}
function helpPanel() {
  return wrap(`${icon('help')} ${T('help_kicker')}`, text('help_title'), `<div class="help-board"><div class="help-list">${[1, 2, 3].map(i => `<div class="help-row"><span class="help-number">${i}</span><div><strong>${T('help_step' + i + '_title')}</strong><p class="editable-prose">${T('help_step' + i + '_body')}</p></div></div>`).join('')}</div></div>`, 'help-sign-view');
}
function renderPanel(id) {
  if (id === 'characters') return characterPanel();
  if (id === 'radio' || id === 'radio-info') return radioPanel();
  if (id === 'pause') return pausePanel();
  if (id === 'concerts') return concertsPanel();
  if (BAND.some(b => b.id === id)) return bandPanel(id);
  if (id === 'letter') return letterPanel();
  if (id === 'grownups') return grownupsPanel();
  if (id === 'map') return mapPanel();
  return helpPanel();
}
function pausePanel() {
  const options = [['map', 'map_open'], ['characters', 'pause_character'], ['radio', 'pause_radio'], ['concerts', 'pause_concerts'], ['panda', 'pause_band'], ['social', 'pause_social'], ['grownups', 'nav_grownups'], ['help', 'help_open']];
  return wrap(`${icon('map')} ${T('pause_kicker')}`, text('pause_title'), `<p class="modal-intro editable-prose">${T('pause_intro')}</p><div class="map-grid"><button class="map-destination" data-action="close"><span class="destination-dot">↩</span><strong>${T('pause_continue')}</strong></button>${options.map(([id, key]) => `<button class="map-destination" data-open="${id}"><strong>${T(key)}</strong></button>`).join('')}</div>`);
}
function clearInput() { state.keys.clear(); state.pad.clear(); $('#dpad').querySelectorAll('button').forEach(b => b.classList.remove('pressed')); }
function stopWalking() { clearInput(); state.path = []; state.destination = null; marker?.setAttribute('hidden', ''); }
function refreshCassettes() {
  if (state.scene === 'radio') for (const slot of slotsOnPage(state.shelfPage)) {
    const ground = $(`#tape-slot-${slot.slot}`);
    if (ground) { ground.innerHTML = slotContents(state.tapes, slot.slot); ground.setAttribute('aria-label', slotDescription(state.tapes, slot.slot)); }
  }
  const carried = TRACKS.find(t => t.id === state.tapes.carrying);
  const carriedGroup = $('#carried-tape');
  if (carriedGroup) { carriedGroup.toggleAttribute('hidden', !carried); carriedGroup.innerHTML = carried ? cassetteMarkup(carried) : ''; }
  const indicator = $('#carry-indicator');
  indicator.hidden = !carried;
  if (carried) indicator.innerHTML = `<img class="carry-cover" src="${escape(carried.image)}" alt=""><span><small>${T('carry_title')}</small><strong>${escape(carried.title)}</strong><span>${T('carry_hint')}</span></span>`;
  const loaded = TRACKS.find(t => t.id === state.tapes.loaded), slot = $('#radio-tape');
  if (slot) { slot.toggleAttribute('hidden', !loaded); slot.innerHTML = loaded ? cassetteMarkup(loaded) : ''; slot.classList.toggle('is-playing', state.playing); }
  refreshPaint();
}
function refreshPaint() {
  const color = PALETTE.find(color => color.id === state.paintCan), carried = $('#carried-paint');
  if (carried) { carried.toggleAttribute('hidden', !color); carried.innerHTML = color ? paintCanMarkup(color.color) : ''; }
  const rocketPaint = $('#rocket-paint');
  if (rocketPaint) { rocketPaint.toggleAttribute('hidden', !color || !state.rocket.riding); rocketPaint.innerHTML = color ? paintCanMarkup(color.color) : ''; }
  const indicator = $('#paint-indicator'); indicator.hidden = !color;
  if (color) indicator.innerHTML = `<svg viewBox="0 0 80 94" aria-hidden="true">${paintCanMarkup(color.color)}</svg><span><strong>${escape(color.name)}</strong><small>${T('paint_carry_hint')}</small><button data-action="put-paint">${T('paint_put_down')}</button></span>`;
}
function renderScene() {
  clearPaintPreview();
  game.innerHTML = outsideScene(state.scene) ? worldMarkup(state.paint, !!state.paintCan, state.scene, state.rocket, state.animal) : roomMarkup(state.scene, state.shelfPage, state.tapes, state.animal, { can: state.paintCan, page: state.paintPage });
  world = $('#world-svg'); player = $('#player'); playerUse = $('#player-use'); marker = $('#destination-marker');
  game.setAttribute('aria-label', state.scene === 'sky' ? text('sky_title') : state.scene === 'world' ? text('world_title') : ROOMS[state.scene].title);
  $('.wayfinder').hidden = state.scene !== 'world' || state.rocket.riding;
  $('.exit-room').hidden = state.scene === 'world' && !state.rocket.riding;
  $('.exit-room').textContent = text(state.rocket.riding ? state.rocket.airborne ? 'rocket_land_button' : 'rocket_exit' : 'exit_button');
  game.classList.toggle('in-room', !outsideScene(state.scene));
  player.toggleAttribute('hidden', state.rocket.riding);
  state.near = null; updateAnimal(); refreshCassettes(); resize(); updateNear();
  player.setAttribute('transform', `translate(${state.position.x} ${state.position.y})`);
}
function showPanel(id, focusSelector = '') {
  stopWalking(); clearPaintPreview(); state.modal = id; game.classList.add('paused');
  modalContent.innerHTML = renderPanel(id);
  if (!modal.open) modal.showModal();
  if (focusSelector) modalContent.querySelector(focusSelector)?.focus();
  else if (id === 'characters') modalContent.querySelector('[aria-pressed=true]')?.focus();
  else modalContent.querySelector('button:not(.modal-close):not([disabled]), a[href], .modal-close')?.focus();
}
function closePanel() { if (modal.open) modal.close(); }
modal.addEventListener('close', () => {
  if (modal.open) return;
  state.modal = null; game.classList.remove('paused'); clearInput();
  if (!state.started) beginWorld(false);
  game.focus({ preventScroll: true });
});
modal.addEventListener('cancel', e => { e.preventDefault(); closePanel(); });
modal.addEventListener('click', e => {
  if (e.target !== modal) return;
  const b = modal.getBoundingClientRect();
  if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) closePanel();
});
function beginWorld(close = true) {
  state.started = true; storage.set('animal', state.animal); updateAnimal();
  if (close) closePanel(); game.focus({ preventScroll: true });
  announce(text('now_animal', { tier: ANIMALS.find(a => a.id === state.animal).name }));
}
function enterRoom(id) {
  const room = roomFor(id); if (!room) return;
  if (state.rocket.riding) { closePanel(); toast(text('rocket_land_first')); return false; }
  if (!state.started) beginWorld(false);
  state.returnPosition = { ...HOUSE_DOORS.find(door => door.id === room).outside };
  stopWalking(); closePanel(); state.paintTarget = null; state.scene = room; state.position = { ...(ROOMS[room].spawn || ROOM_SPAWN) };
  renderScene(); game.focus({ preventScroll: true });
  announce(text('entered_room', { haus: ROOMS[room].title }));
  return true;
}
function leaveRoom() {
  if (state.rocket.riding) { closePanel(); if (state.rocket.airborne) returnToGround(); else exitRocket(); return; }
  stopWalking(); closePanel();
  if (state.scene !== 'world') {
    state.scene = 'world'; state.position = { ...(state.returnPosition || WORLD_SPAWN) }; renderScene();
  }
  game.focus({ preventScroll: true }); announce(text('left_room'));
}
function visit(id) { if (id === 'social') goToStation('social'); else if (roomFor(id)) enterRoom(id); else showPanel(id); }
function checkWorldTouch() {
  if (state.scene !== 'world' || state.rocket.riding || modal.open || !state.started) return;
  const touch = worldTouch(state.position);
  if (touch) enterRoom(touch.id);
}
function refreshPlayback() {
  state.playing = !audio.paused && !audio.ended;
  $('#radio-shortcut').setAttribute('aria-label', text('room_radio'));
  $('#radio-shortcut').style.background = state.playing ? 'var(--yellow)' : '';
  $('#radio-tape')?.classList.toggle('is-playing', state.playing);
  if (['radio', 'radio-info'].includes(state.modal)) {
    $('.boombox')?.classList.toggle('is-playing', state.playing);
    const btn = modalContent.querySelector('[data-action=play]');
    if (btn && !btn.disabled) { btn.innerHTML = icon(state.playing ? 'pause' : 'play'); btn.setAttribute('aria-label', text(state.playing ? 'pause_label' : 'play_label')); }
  }
}
function loadRecording() {
  audio.pause(); state.playing = false;
  const track = TRACKS.find(t => t.id === state.tapes.loaded);
  const recordingURL = track?.src ? new URL(track.src, document.baseURI) : null;
  if (recordingURL && (safeURL(recordingURL.href) || (previewMode && recordingURL.protocol === 'blob:'))) {
    audio.src = track.src; audio.play().catch(() => toast(text('audio_start')));
  } else { audio.removeAttribute('src'); audio.load(); }
  refreshPlayback();
}
for (const event of ['play', 'pause', 'ended']) audio.addEventListener(event, refreshPlayback);
audio.addEventListener('error', () => { refreshPlayback(); toast(text('audio_error')); });
document.addEventListener('input', e => { if (e.target.id === 'volume') { state.volume = Number(e.target.value); audio.volume = state.volume; storage.set('volume', state.volume); } });
function currentInteraction() {
  if (state.rocket.riding && !state.rocket.airborne) return { id: 'rocket', kind: 'rocket-exit', label: text('rocket_exit') };
  if (state.rocket.riding && state.scene !== 'sky') return null;
  const interaction = nearbyInteraction(state.scene, state.position, state.tapes, state.shelfPage, { can: state.paintCan, page: state.paintPage }, state.rocket.position);
  if (interaction?.kind === 'rocket-board') return interaction;
  const color = PALETTE.find(color => color.id === state.paintCan);
  if (outsideScene(state.scene) && color) {
    const selected = PAINT_SURFACES.find(surface => surface.id === state.paintTarget);
    const surface = canPaintSurface(state.position, selected) ? selected : nearbyPaintSurface(state.position);
    return { ...surface, kind: 'paint', label: text('paint_action', { flaeche: text(surface.key), farbe: color.name }) };
  }
  return interaction;
}
function boardRocket() {
  stopWalking(); state.paintTarget = null; state.rocket.riding = true; state.rocket.airborne = false;
  state.position = { ...state.rocket.position }; renderScene(); game.focus({ preventScroll: true });
  toast(text('rocket_boarded')); announce(text('rocket_boarded'));
}
function exitRocket() {
  if (!state.rocket.riding || state.rocket.airborne) return;
  const exit = rocketExitPosition(state.rocket.position); if (!exit) return;
  stopWalking(); state.rocket.riding = false; state.scene = 'world'; state.position = exit; state.paintTarget = null;
  renderScene(); game.focus({ preventScroll: true }); announce(text('rocket_exited'));
}
function returnToGround() {
  if (!state.rocket.riding) return;
  if (!state.rocket.airborne) { exitRocket(); return; }
  navigateTo(GROUND_ROCKET.x, GROUND_ROCKET.y, { kind: 'land-rocket' }); announce(text('rocket_returning'));
}
function landRocket() {
  stopWalking(); state.rocket.airborne = false; state.scene = 'world'; state.paintTarget = null;
  renderScene(); toast(text('rocket_landed')); announce(text('rocket_landed'));
}
function putPaintDown() { state.paintCan = null; state.paintTarget = null; stopWalking(); renderScene(); game.focus({ preventScroll: true }); }
function clearPaintPreview() { paintPreview?.restore(); paintPreview = null; }
function refreshPaintPreview(near) {
  const color = state.started && outsideScene(state.scene) && !modal.open && near?.kind === 'paint' ? PALETTE.find(color => color.id === state.paintCan) : null;
  if (color && paintPreview?.id === near.id && paintPreview.color === color.color) return;
  clearPaintPreview();
  if (color) paintPreview = { id: near.id, color: color.color, restore: createPaintPreview(game, near.id, color.color) };
}
function paintSurface(id) {
  const surface = PAINT_SURFACES.find(surface => surface.id === id), color = PALETTE.find(color => color.id === state.paintCan);
  if (!color || !outsideScene(state.scene) || state.rocket.riding && state.scene !== 'sky' || !canPaintSurface(state.position, surface)) return;
  stopWalking(); state.paint[id] = color.color; state.paintTarget = id;
  storage.set(paintStorageKey, JSON.stringify(state.paint)); renderScene(); game.focus({ preventScroll: true });
  announce(text('paint_done', { flaeche: text(surface.key), farbe: color.name }));
}
function activatePaintSurface(id, confirm = true) {
  const surface = PAINT_SURFACES.find(surface => surface.id === id); if (!surface) return;
  if (!!surface.sky !== (state.scene === 'sky')) { toast(text(surface.sky ? 'rocket_first' : 'rocket_land_first')); return; }
  if (state.rocket.riding && state.scene !== 'sky') return;
  if (confirm && canPaintSurface(state.position, surface)) paintSurface(id);
  else {
    state.paintTarget = id;
    if (canPaintSurface(state.position, surface)) updateNear(); else navigateTo(surface.walk.x, surface.walk.y);
  }
}
function performInteraction() {
  const near = currentInteraction();
  if (!near) return;
  stopWalking();
  if (near.kind === 'rocket-board') { boardRocket(); return; }
  if (near.kind === 'rocket-exit') { exitRocket(); return; }
  if (near.kind === 'paint') { paintSurface(near.id); return; }
  if (near.kind === 'take-paint' || near.kind === 'return-paint') {
    state.paintCan = near.kind === 'take-paint' ? near.id : null; state.paintTarget = null; renderScene();
    announce(text(state.paintCan ? 'paint_taken' : 'paint_returned', { farbe: near.name })); return;
  }
  if (near.kind === 'paint-page') { state.paintPage = (state.paintPage + 1) % paintPages(PALETTE); renderScene(); return; }
  if (near.kind === 'reset-paint') {
    state.paint = {}; state.paintCan = null; state.paintTarget = null; storage.set(paintStorageKey, '{}'); renderScene();
    announce(text('paint_reset_done')); return;
  }
  if (near.kind === 'shelf') { state.shelfPage = (state.shelfPage + 1) % tapePages(state.tapes); renderScene(); toast(text('shelf_changed', { seite: state.shelfPage + 1, anzahl: tapePages(state.tapes) })); return; }
  if (['external', 'email'].includes(near.kind)) { openSocial(near.id); return; }
  if (near.kind === 'enter') { enterRoom(near.id); return; }
  if (near.kind === 'exit') { leaveRoom(); return; }
  if (near.kind === 'read') { showPanel(near.id); return; }
  if (near.kind === 'change-character') {
    chooseAnimal(near.id); storage.set('animal', state.animal); renderScene(); game.focus({ preventScroll: true });
    announce(text('now_animal', { tier: ANIMALS.find(animal => animal.id === state.animal).name })); return;
  }
  if (near.kind === 'radio-help') { showPanel('radio-info'); return; }
  const old = state.tapes; state.tapes = cassetteAction(old, { type: near.kind, id: near.id, slot: near.slot });
  if (old === state.tapes) return;
  const track = TRACKS.find(t => t.id === near.id);
  if (near.kind === 'insert' || near.kind === 'eject') loadRecording();
  refreshCassettes(); state.near = null; updateNear();
  let message = '';
  if (near.kind === 'pickup') message = text('tape_taken', { lied: track.title });
  if (near.kind === 'return') message = text('tape_returned', { lied: track.title });
  if (near.kind === 'eject') message = text('tape_ejected', { lied: track.title });
  if (near.kind === 'insert') {
    message = text('tape_inserted', { lied: track.title }) + (!track.src ? ' ' + text('tape_no_audio') : '');
    if (state.tapes.carrying) message += ' ' + text('tape_swap', { lied: TRACKS.find(t => t.id === state.tapes.carrying).title });
  }
  toast(message); announce(message);
}
function openSocial(id) {
  const link = contactLinks().find(l => l.id === id), url = link?.id === 'email' ? link.url : safeURL(link?.url || '');
  if (!url) return;
  stopWalking();
  if (id === 'email') { showPanel('letter'); return; }
  window.open(url, '_blank', 'noopener,noreferrer');
  announce(id === 'email' ? text('email_note') : text('social_opened', { kanal: link.label }));
}
function activateSocial(id) {
  const p = socialPads(state.scene).find(p => p.id === id); if (!p) return;
  if (Math.hypot(p.x - state.position.x, p.y - state.position.y) <= p.reach) openSocial(id);
  else navigateTo(p.x, p.y);
}
function navigateTo(x, y, destination = null) {
  const path = state.rocket.riding ? [{ x: clamp(x, 65, 1535), y: clamp(y, SKY.top + 160, 1040) }] : planPath(state.position, { x, y }, state.scene, state.rocket.position);
  if (!path.length) { toast(text('walk_blocked')); return; }
  state.path = path; state.destination = destination; stuckTime = 0;
  marker.removeAttribute('hidden'); marker.setAttribute('transform', `translate(${x} ${y})`); game.focus({ preventScroll: true });
}
function goToStation(id) {
  const station = STATIONS.find(s => s.id === id); if (!station) return;
  if (state.rocket.riding) { closePanel(); toast(text('rocket_land_first')); return; }
  const s = id === 'rocket' ? { ...station, ...state.rocket.position } : station;
  if (!state.started) beginWorld(false);
  if (state.scene !== 'world') leaveRoom(); else closePanel();
  navigateTo(s.x, s.y, BAND.some(member => member.id === id) ? { kind: 'station', id } : null); announce(text('walk_target', { ziel: s.label }));
}
function goToTape(id) {
  if (!TRACKS.some(t => t.id === id)) return;
  if (state.rocket.riding) { closePanel(); toast(text('rocket_land_first')); return; }
  if (state.scene !== 'radio') enterRoom('radio'); else closePanel();
  if (state.tapes.loaded === id) { navigateTo(RADIO.x, RADIO.y); toast(text('tape_already_loaded')); return; }
  let target = findTapeSlot(state.tapes, id);
  if (state.tapes.carrying === id) {
    const free = state.tapes.slots.flatMap((value, index) => value ? [] : [{ ...TAPE_SLOTS[index % 10], slot: index, page: Math.floor(index / 10) }]);
    free.sort((a, b) => (a.page !== state.shelfPage) - (b.page !== state.shelfPage) || Math.hypot(a.x - state.position.x, a.y - state.position.y) - Math.hypot(b.x - state.position.x, b.y - state.position.y));
    target = free[0]; toast(text('tape_carrying'));
  }
  if (!target) return;
  if (state.shelfPage !== target.page) { state.shelfPage = target.page; renderScene(); }
  navigateTo(target.x, target.y);
  if (state.tapes.carrying !== id) announce(text('tape_walk_hint'));
}
// Confirm buttons and links on keydown so both action keys behave alike,
// including links whose native Space action would otherwise scroll the page.
document.addEventListener('keydown', e => {
  if (!isActionKey(e)) return;
  if (modal.open && inspectionPanels.has(state.modal)) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) closePanel(); return; }
  const control = e.target.closest('button:not([disabled]),a[href]');
  if (!control) return;
  e.preventDefault(); e.stopPropagation();
  if (!e.repeat) control.click();
});
document.addEventListener('click', e => {
  const btn = e.target.closest('button'); if (!btn) return;
  if (btn.dataset.open) { visit(btn.dataset.open); return; }
  if (btn.dataset.character) { chooseAnimal(btn.dataset.character); return; }
  if (btn.dataset.member) { showPanel(btn.dataset.member, `[data-member="${btn.dataset.member}"]`); return; }
  if (btn.dataset.track) { goToTape(btn.dataset.track); return; }
  if (btn.dataset.goto) { goToStation(btn.dataset.goto); return; }
  const action = btn.dataset.action;
  if (action === 'put-paint') { putPaintDown(); return; }
  if (action === 'close') closePanel();
  if (action === 'leave') leaveRoom();
  if (action === 'exit-walk') { if (state.rocket.riding) returnToGround(); else navigateTo(EXIT.x, 1020, { kind: 'exit' }); }
  if (action === 'start') beginWorld();
  if (action === 'start-radio') { beginWorld(false); enterRoom('radio'); }
  if (action === 'world') { if (state.scene !== 'world') leaveRoom(); else { closePanel(); if (!state.started) showPanel('characters'); else game.focus(); } }
  if (action === 'radio-info') showPanel('radio-info');
  if (action === 'play') { if (state.playing) audio.pause(); else audio.play().catch(() => toast(text('audio_play_error'))); }
});
function chooseAnimal(id) {
  state.animal = id; updateAnimal();
  modalContent.querySelectorAll('[data-character]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.character === id)));
}
modalContent.addEventListener('keydown', e => {
  if (inspectionPanels.has(state.modal)) {
    if (isActionKey(e)) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) closePanel(); return; }
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
      e.preventDefault(); e.stopPropagation();
      if (e.key === 'Home') modal.scrollTop = 0;
      else if (e.key === 'End') modal.scrollTop = modal.scrollHeight;
      else modal.scrollBy({ top: (['ArrowUp', 'PageUp'].includes(e.key) ? -1 : 1) * (e.key.startsWith('Page') ? modal.clientHeight * .8 : 55) });
      return;
    }
  }
  const animal = e.target.closest('[data-character]');
  if (animal && isActionKey(e)) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) { chooseAnimal(animal.dataset.character); beginWorld(); } return; }
  if (animal && e.key.startsWith('Arrow')) {
    e.preventDefault(); const i = ANIMALS.findIndex(a => a.id === animal.dataset.character);
    const columns = window.innerWidth <= 480 ? 2 : 4;
    if (e.key === 'ArrowDown' && i >= ANIMALS.length - columns) { modalContent.querySelector('[data-action=start]').focus(); return; }
    const next = nextMenuIndex(i, e.key, ANIMALS.length, columns);
    chooseAnimal(ANIMALS[next].id); modalContent.querySelector(`[data-character="${ANIMALS[next].id}"]`).focus(); return;
  }
  const tab = e.target.closest('[data-member]');
  if (tab && ['ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault(); const i = BAND.findIndex(b => b.id === tab.dataset.member), next = nextMenuIndex(i, e.key, BAND.length);
    showPanel(BAND[next].id, `[data-member="${BAND[next].id}"]`); return;
  }
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  if (e.target.matches('input[type=range]') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
  e.preventDefault();
  const controls = [...modalContent.querySelectorAll('button:not([disabled]),a[href],input:not([disabled])')].filter(el => !el.hidden && el.getClientRects().length);
  controls[nextMenuIndex(controls.indexOf(document.activeElement), e.key, controls.length)]?.focus();
});
function activateRoomTarget(id) {
  if (id.startsWith('paint:') || ['paint-reset', 'paint-next'].includes(id)) {
    if (state.scene !== 'wardrobe') return;
    const target = id === 'paint-reset' ? PAINT_RESET : id === 'paint-next' ? PAINT_NEXT : paintSlots(PALETTE, state.paintPage).find(color => color.id === id.slice(6));
    if (!target) return;
    const near = currentInteraction(), wanted = id.startsWith('paint:') ? id.slice(6) : id;
    if (near?.id === wanted) performInteraction(); else navigateTo(target.x, target.y); return;
  }
  if (id === 'shelf') {
    const near = currentInteraction();
    if (near?.kind === 'shelf') performInteraction(); else navigateTo(SHELF_SWITCH.x, SHELF_SWITCH.y);
    return;
  }
  if (id === 'exit') { navigateTo(EXIT.x, 1020, { kind: 'exit' }); return; }
  if (id.startsWith('animal:')) {
    const spot = ANIMAL_SPOTS.find(spot => spot.id === id.slice(7)); if (!spot) return;
    const near = currentInteraction();
    if (near?.kind === 'change-character' && near.id === spot.id) performInteraction(); else navigateTo(spot.x, spot.y);
    return;
  }
  if (id.startsWith('slot:')) {
    const index = Number(id.slice(5)), slot = slotsOnPage(state.shelfPage).find(s => s.slot === index);
    if (!slot) return;
    const near = currentInteraction();
    if (near?.slot === index) performInteraction(); else navigateTo(slot.x, slot.y);
    return;
  }
  const target = id === 'radio' ? RADIO : (ROOM_PROPS[state.scene] || []).find(p => p.id === id);
  if (!target) return;
  const near = currentInteraction();
  if (near && (near.id === id || id === 'radio' && ['insert', 'eject', 'radio-help'].includes(near.kind))) performInteraction();
  else navigateTo(target.x, target.y);
}
game.addEventListener('click', e => {
  if (modal.open || !state.started) return;
  if (state.paintCan && outsideScene(state.scene)) { state.paintTarget = null; walkToPointer(e); return; }
  const social = e.target.closest('[data-social]');
  if (social) { const pad = socialPads(state.scene).find(p => p.id === social.dataset.social); if (pad) navigateTo(pad.x, pad.y); return; }
  const station = e.target.closest('[data-station]');
  if (station) { const s = STATIONS.find(s => s.id === station.dataset.station); if (!s) return; if (BAND.some(member => member.id === s.id) && Math.hypot(s.x - state.position.x, s.y - state.position.y) < 110) visit(s.id); else goToStation(s.id); return; }
  const prop = e.target.closest('[data-room-target]');
  if (prop) { activateRoomTarget(prop.dataset.roomTarget); return; }
  walkToPointer(e);
});
function walkToPointer(event) {
  const matrix = world.getScreenCTM(); if (!matrix) return;
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  navigateTo(point.x, point.y);
}
game.addEventListener('keydown', e => {
  if (!isActionKey(e)) return;
  const surface = e.target.closest('[data-paint-target]');
  if (state.paintCan && outsideScene(state.scene) && surface) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) activatePaintSurface(surface.dataset.paintTarget); return; }
  const social = e.target.closest('[data-social]');
  if (social) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) activateSocial(social.dataset.social); return; }
  const station = e.target.closest('[data-station]'), prop = e.target.closest('[data-room-target]');
  if (!station && !prop) return;
  e.preventDefault(); e.stopPropagation(); if (e.repeat) return;
  if (station) {
    const near = currentInteraction();
    if (['read', 'rocket-board'].includes(near?.kind) && near.id === station.dataset.station) performInteraction();
    else goToStation(station.dataset.station);
  } else activateRoomTarget(prop.dataset.roomTarget);
});
const directions = new Map([['ArrowUp', [0, -1]], ['KeyW', [0, -1]], ['ArrowDown', [0, 1]], ['KeyS', [0, 1]], ['ArrowLeft', [-1, 0]], ['KeyA', [-1, 0]], ['ArrowRight', [1, 0]], ['KeyD', [1, 0]]]);
window.addEventListener('keydown', e => {
  if (modal.open || !state.started) return;
  if (e.key === 'Escape') { e.preventDefault(); if (!e.repeat) { if (state.paintCan) putPaintDown(); else outsideScene(state.scene) ? showPanel('pause') : leaveRoom(); } return; }
  if (!(document.activeElement === game || game.contains(document.activeElement))) {
    if (e.key.startsWith('Arrow') && e.target.closest('.header,.footer')) {
      e.preventDefault(); const controls = [...document.querySelectorAll('.header a,.header button,.footer button')];
      controls[nextMenuIndex(controls.indexOf(document.activeElement), e.key, controls.length)]?.focus();
    }
    return;
  }
  if (directions.has(e.code)) { e.preventDefault(); state.paintTarget = null; state.keys.add(e.code); state.path = []; state.destination = null; marker.setAttribute('hidden', ''); }
  else if (isActionKey(e) || e.code === 'KeyE') { e.preventDefault(); if (!e.repeat) performInteraction(); }
});
window.addEventListener('keyup', e => { state.keys.delete(e.code); });
window.addEventListener('blur', clearInput);
document.addEventListener('visibilitychange', () => { if (document.hidden) clearInput(); });
const padVectors = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
$('#dpad').querySelectorAll('button').forEach(btn => {
  btn.addEventListener('pointerdown', e => {
    if (!state.started || modal.open) return;
    e.preventDefault(); btn.setPointerCapture(e.pointerId); state.paintTarget = null; state.pad.set(e.pointerId, btn.dataset.direction); btn.classList.add('pressed'); state.path = []; state.destination = null; marker.setAttribute('hidden', ''); game.focus({ preventScroll: true });
  });
  const release = e => { state.pad.delete(e.pointerId); btn.classList.remove('pressed'); };
  btn.addEventListener('pointerup', release); btn.addEventListener('pointercancel', release); btn.addEventListener('lostpointercapture', release);
  btn.addEventListener('click', e => { if (e.detail === 0 && state.started && !modal.open) { const [dx, dy] = padVectors[btn.dataset.direction]; navigateTo(state.position.x + dx * 28, state.position.y + dy * 28); } });
});
$('#interact').addEventListener('click', () => { if (currentInteraction()?.kind !== 'paint') performInteraction(); });
function updateNear() {
  const near = currentInteraction();
  refreshPaintPreview(near);
  if (near?.kind === state.near?.kind && near?.id === state.near?.id && near?.slot === state.near?.slot) return;
  state.near = near; const btn = $('#interact'); btn.hidden = !near || near.kind === 'paint';
  if (near?.kind === 'paint') btn.innerHTML = '';
  else if (near) {
    const label = near.label;
    btn.innerHTML = `<kbd aria-hidden="true">↵ / ␣</kbd>${escape(label)}`; announce(text('action_hint', { aktion: label }));
  }
}
function resize() {
  const r = game.getBoundingClientRect(); if (!r.width || !r.height) return;
  let w = clamp(r.width * 1.24, 600, 1520), h = w / (r.width / r.height);
  if (h > 1050) { h = 1050; w = h * r.width / r.height; }
  state.viewport = { w, h }; updateCamera(1, true);
}
function updateCamera(dt, snap = false) {
  const { w, h } = state.viewport;
  const top = outsideScene(state.scene) ? WORLD.top : 0;
  const tx = clamp(state.position.x, w / 2, WORLD.width - w / 2), ty = clamp(state.position.y - (outsideScene(state.scene) ? 240 : 130), top + h / 2, WORLD.height - h / 2);
  const amount = snap || state.reduced ? 1 : Math.min(1, dt * 9);
  state.camera.x += (tx - state.camera.x) * amount; state.camera.y += (ty - state.camera.y) * amount;
  world.setAttribute('viewBox', `${clamp(state.camera.x - w / 2, 0, WORLD.width - w).toFixed(2)} ${clamp(state.camera.y - h / 2, top, WORLD.height - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);
}
function frame(time) {
  const dt = Math.min(.05, Math.max(0, (time - (lastTime || time)) / 1000)); lastTime = time;
  let walking = false;
  if (state.started && !modal.open && !document.hidden) {
    let dx = 0, dy = 0;
    for (const code of state.keys) { const v = directions.get(code); if (v) { dx += v[0]; dy += v[1]; } }
    for (const direction of state.pad.values()) { const v = padVectors[direction]; dx += v[0]; dy += v[1]; }
    if (!dx && !dy && state.path.length) {
      let p = state.path[0];
      if (Math.hypot(p.x - state.position.x, p.y - state.position.y) < 5) { state.path.shift(); p = state.path[0]; }
      if (p) { dx = p.x - state.position.x; dy = p.y - state.position.y; }
      else {
        marker.setAttribute('hidden', ''); const destination = state.destination; state.destination = null;
        if (destination?.kind === 'station') visit(destination.id);
        if (destination?.kind === 'exit') leaveRoom();
        if (destination?.kind === 'land-rocket' && state.rocket.riding && canLandRocket(state.position)) landRocket();
      }
    }
    if (dx || dy) {
      const old = state.position, stepTime = state.path.length ? Math.min(dt, Math.hypot(dx, dy) / (state.rocket.riding ? 255 : WORLD.speed)) : dt;
      if (state.rocket.riding) {
        if (!state.rocket.airborne && dy < 0) { state.rocket.airborne = true; renderScene(); announce(text('rocket_flying')); }
        if (state.rocket.airborne) {
          state.position = moveRocket(old, dx, dy, stepTime); state.rocket.position = { ...state.position };
          const scene = state.position.y < 0 ? 'sky' : 'world';
          if (scene !== state.scene) { state.scene = scene; state.paintTarget = null; renderScene(); }
          if (dy > 0 && canLandRocket(state.position)) {
            landRocket();
          }
        }
      } else state.position = move(old, dx, dy, stepTime, state.scene, state.rocket.position);
      walking = Math.hypot(state.position.x - old.x, state.position.y - old.y) > .05;
      if (state.path.length) {
        stuckTime = walking ? 0 : stuckTime + dt;
        if (stuckTime > .8) { state.path = []; state.destination = null; marker.setAttribute('hidden', ''); toast(text('walk_stuck')); }
      }
    }
    if (throughExit(state.scene, state.position)) leaveRoom();
    checkWorldTouch();
    updateNear(); updateCamera(dt);
  }
  player.classList.toggle('is-moving', walking); player.setAttribute('transform', `translate(${state.position.x.toFixed(2)} ${state.position.y.toFixed(2)})`);
  if (outsideScene(state.scene) && state.rocket.riding) $('#rocket')?.setAttribute('transform', `translate(${state.position.x.toFixed(2)} ${state.position.y.toFixed(2)})`);
  requestAnimationFrame(frame);
}
renderScene(); new ResizeObserver(resize).observe(game); requestAnimationFrame(frame);
if (previewMode) {
  const banner = document.createElement('div'); banner.className = 'preview-banner';
  banner.textContent = contentStatus.ok ? text('preview_label') + ' ' : text('preview_error', { fehler: contentStatus.error }) + ' ';
  const back = document.createElement('a'); back.href = adminURL; back.textContent = text('preview_back'); banner.append(back); document.body.prepend(banner);
  document.body.classList.add('preview-mode');
}
$('#admin-link').href = adminURL;
$('#admin-link').hidden = false;
if (!state.started) showPanel('characters'); else { game.focus(); announce(text('welcome_back')); }
