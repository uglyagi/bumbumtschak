import { WORLD, WORLD_SPAWN, STATIONS, clamp, move, planPath, isActionKey, HOUSE_DOORS, worldTouch, canLandRocket, rocketExitPosition, touchingHomePicture, sceneHorizontalBounds, canStand } from './game-core.js';
import { ANIMALS, BAND, TRACKS, CONCERTS, CONTACT, INFO, PALETTE, loadContent, text } from './content.js';
import { PAINT_SURFACES, BUCKET_SURFACES, PAINT_NEXT, paintSlots, paintPages, bucketColors, nearbyPaintSurface, canPaintSurface, cleanPaint, paintCanMarkup, createPaintPreview } from './painting.js';
import { icon, avatar, memberArt, worldMarkup } from './art.js';
import { cassetteMarkup, cassetteSVG, roomMarkup, slotContents, slotDescription } from './room-art.js';
import { ROOMS, ROOM_SPAWN, EXIT, RADIO, TAPE_SLOTS, SHELF_SWITCH, ROOM_PROPS, ANIMAL_SPOTS, PICTURE_SPOT, TOOLBOX_SPOT, slotsOnPage, tapePages, findTapeSlot, refreshBandWayfinding, roomFor, createCassetteState, tapeLocation, cassetteAction, nearbyInteraction, throughExit, nextMenuIndex } from './rooms.js';
import { brandIcon, socialPads, contactLinks } from './social.js';
import { adminURL } from './connection.js';
import { SPACE, ROCKET_SPEED, GROUND_ROCKET, moveRocket, outsideScene, flightScene, spaceViewIsDark } from './sky-world.js';
import { createParty, syncParty, tickParty, guestPose, guestExitPose, dancePartyMarkup, discoLightPoses } from './dance-party.js';
import { studioMarkup, studioInteraction, studioColors, studioPages, STUDIO_CONTROLS, largeSurfaces } from './painting-studio.js';
import { createAdventure, startAdventure, resizeAdventure, tickAdventure, FINISH_DISTANCE, landingPose, crashVibration, DIFFICULTIES } from './rocket-adventure.js';
import { adventureMarkup, adventureShipPose, adventureCourseOpacity, adventureTrailPath, meteorMarkup } from './adventure-art.js';
import { toolboxMarkup } from './toolbox.js';
import { wreckageTransforms, rocketRepairTransforms, rocketRepairOpacity, ROCKET_REPAIR_SECONDS } from './rocket-wreckage.js';
import { sunHolidayPose, holidayTransform } from './sun-holiday.js';
import { createHatQuest, savedHatQuest, startHatQuest, tickHatQuest, hatInteraction, findHat, toggleHat, paintHat, returnHat, wearsHat, animalHref, colorHatMarkup, hatEffectsMarkup, isHatTrack, hatSpot, HAT_STAND, HAT_HEADS } from './hat-quest.js';
import { createReception, landReception, stopReceptionFireworks, tickReception, receptionMarkup, receptionAway, swapReceptionPilot } from './reception.js';
import { createChocolate, savedChocolate, chocolateSpeed, chocolateMusicGain, tickChocolate, takeChocolate, eatChocolate, newChocolateRun, collectChocolate, beginChocolateExit, advanceChocolateExit, isChocolateTrack, touchingChocolateDoor, CHOCOLATE_DOOR, CHOCOLATE_RETURN, CHOCOLATE_DRAWER, MAZE_SPAWN, MAZE_EXIT, MAZE_CHOCOLATES, chocolateBarMarkup, chocolateConfetti } from './chocolate.js';
import { chocolateMazeMarkup } from './chocolate-art.js';
import { createFriends, savedFriends, isFriendsTrack, startFriends, releaseFriends, swapFriendsPlayer, friendsAway, friendsBlockBuildings, friendsTentNear, gatherFriends, tickFriends, friendsCameraView, FRIEND_CAMP_FADE_SECONDS, FRIEND_CAMP_PLAYER, FRIEND_TENT } from './friends-game.js';
import { friendsHiddenMarkup, friendsWorldMarkup, friendsCampfireMarkup, friendsConfettiMarkup } from './friends-art.js';
import { BIKE_WIDTH, BIKE_HEIGHT, BIKE_FINISH, BIKE_LEVELS, BIKE_DOOR, BIKE_RETURN, isBikeTrack, touchingBikeDoor, bikeTime, bikeKmh, bikeEncounterCount, createBikeRace, startBikeRace, changeBikeLane, tickBikeRace, cleanBikeScores, addBikeScore } from './bike-race.js';
import { bikeRaceMarkup, bikeTerrainMarkup, bikeObstaclesMarkup, bikeRiderPose } from './bike-art.js';
import { movementFacing } from './animal-views.js';

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
const rocketStorageKey = previewMode ? 'rocket-preview-damaged' : 'rocket-damaged';
const savedRocketDamage = storage.get(rocketStorageKey, '0') === '1';
const savedDifficulty = storage.get('adventure-difficulty', 'leicht');
const hatStorageKey = previewMode ? 'hat-preview' : 'hat-world';
const chocolateStorageKey = previewMode ? 'chocolate-preview' : 'chocolate-world';
const friendsStorageKey = previewMode ? 'friends-preview' : 'friends-world';
const bikeScoreKey = previewMode ? 'bike-tour-scores-preview' : 'bike-tour-scores-world';
let savedBikeScores = null;
try { savedBikeScores = JSON.parse(storage.get(bikeScoreKey, 'null')); } catch { /* An invalid local leaderboard starts empty. */ }
let savedFriendCamp = null;
try { savedFriendCamp = JSON.parse(storage.get(friendsStorageKey, 'null')); } catch { /* A missing or damaged local campsite starts locked. */ }
let savedChocolates = null;
try { savedChocolates = JSON.parse(storage.get(chocolateStorageKey, 'null')); } catch { /* A damaged local reward starts locked. */ }
let savedHat = null;
try { savedHat = JSON.parse(storage.get(hatStorageKey, 'null')); } catch { /* An invalid local quest starts afresh. */ }
let savedPaint = {};
try { savedPaint = cleanPaint(JSON.parse(storage.get(paintStorageKey, '{}')), PALETTE); } catch { /* A damaged local drawing starts with the original colors. */ }
const state = {
  animal: ANIMALS.some(a => a.id === savedAnimal) ? savedAnimal : 'cat', facing: 'front',
  scene: 'world', returnPosition: null, tapes: createCassetteState(), shelfPage: 0,
  started: ANIMALS.some(a => a.id === savedAnimal),
  position: { ...WORLD_SPAWN },
  camera: { x: 800, y: 520 },
  viewport: { w: 1480, h: 850 },
  keys: new Set(), pad: new Map(), path: [], destination: null,
  near: null, modal: null, playing: false, memberMelody: null, boostMusic: null,
  paint: savedPaint, paintCan: null, paintPage: 0, paintTarget: null,
  studio: null, pictureTouch: false,
  rocket: { position: { ...GROUND_ROCKET }, riding: false, airborne: false, damaged: savedRocketDamage, broken: savedRocketDamage, impact: null },
  adventure: null, landing: null, toolbox: false, homeReturns: [],
  race: null, bikeScores: cleanBikeScores(savedBikeScores), bikeDoor: false, bikeMusic: null,
  party: createParty(), chocolate: createChocolate(savedChocolates),
  friends: createFriends(savedFriendCamp), friendsRestartPending: false, friendsExit: null, campMusic: null,
  hat: createHatQuest(savedHat), hatActive: false, hatRestartPending: false,
  difficulty: Object.hasOwn(DIFFICULTIES, savedDifficulty) ? savedDifficulty : 'leicht', reception: null,
  volume: clamp(Number(storage.get('volume', '.6')) || 0, 0, 1),
  reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
};
const game = $('#game'), modal = $('#modal'), modalContent = $('#modal-content'), audio = $('#audio'), memberAudio = $('#member-audio'), campAudio = $('#camp-audio'), bikeAudio = $('#bike-audio');
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
let previousFocus = null, toastTimer, lastTime = 0, stuckTime = 0, paintPreview = null, memberRequest = 0, discoFrame = null, friendsRenderKey = '', friendsEffectFrame = -1, bikeTerrainStep = -1;

function announce(message) { $('#announcement').textContent = message; }
function toast(message) { clearTimeout(toastTimer); const el = $('#toast'); el.textContent = message; el.hidden = false; toastTimer = setTimeout(() => { el.hidden = true; }, 3500); }
function updateAnimal() {
  const animal = ANIMALS.find(a => a.id === state.animal);
  const hat = wearsHat(state.hat, state.hatActive), href = animalHref(animal.id, hat, state.facing);
  playerUse.setAttribute('href', href);
  $('#rocket-pilot')?.setAttribute('href', animalHref(animal.id, hat));
  $('#sun-actor-use')?.setAttribute('href', animalHref(animal.id, hat));
  $('#player-chip').innerHTML = `${avatar(animal.id, '', hat)}<span><strong>${animal.name}</strong><small>${T('character_change')}</small></span>`;
  $('#player-chip').setAttribute('aria-label', text('player_label', { tier: animal.name }));
  if (state.scene === 'radio') refreshDanceParty();
}
function faceMovement(previous, next) {
  if (state.scene === 'painting' || state.rocket.riding || state.race) return;
  const facing = movementFacing(previous, next, state.facing);
  if (facing === state.facing) return;
  state.facing = facing;
  playerUse.setAttribute('href', animalHref(state.animal, wearsHat(state.hat, state.hatActive), facing));
}
function characterPanel() {
  return `<div class="modal-wrap welcome">${state.started ? closeButton() : ''}
    <div class="modal-kicker"><span class="welcome-sticker">${T('welcome_kicker')}</span></div><h2 id="modal-title">${T('welcome_title')}</h2>
    <p class="modal-intro editable-prose" data-game-hint>${T('welcome_intro')}</p><div class="character-grid" role="group" aria-label="${T('animal_group')}">${ANIMALS.map(a => `<button class="character-option" data-character="${a.id}" style="--animal-color:${a.color}" aria-pressed="${state.animal === a.id}"><span class="character-check">${icon('check')}</span>${avatar(a.id)}<strong>${escape(a.name)}</strong><small>${escape(a.trait)}</small></button>`).join('')}</div>
    <div class="modal-actions"><button class="primary-button" data-action="start">${T(state.started ? 'welcome_resume' : 'welcome_start')} ${icon('arrow')}</button><button class="text-button" data-action="start-radio">${T('welcome_radio')}</button></div>
    ${state.started ? exitWay() : ''}<div class="welcome-foot"><span>${T('welcome_keys')}</span><span>${icon('music')} ${T('welcome_music')}</span></div></div>`;
}
const inspectionPanels = new Set(['grownups', 'letter', 'help']);
const backLabel = () => text(state.rocket.riding ? 'back_flight' : state.scene === 'world' ? 'back_world' : 'back_room');
const closeButton = () => `<button class="modal-close" data-action="close" aria-label="${escape(backLabel())}">${icon('close')}</button>`;
function exitWay() {
  return `<div class="modal-exitway"><button class="secondary-button" data-action="close">↩ ${escape(backLabel())}</button>${state.scene !== 'world' ? `<button class="text-button" data-action="leave">${T('back_direct')}</button>` : ''}<small>${T(inspectionPanels.has(state.modal) ? 'inspect_close_hint' : 'menu_keys')}</small></div>`;
}
function wrap(kicker, title, contents, className = '') {
  return `<div class="modal-wrap ${className}">${closeButton()}<div class="modal-kicker">${kicker}</div><h2 id="modal-title">${escape(title)}</h2>${contents}${exitWay()}</div>`;
}
function radioPanel() {
  const track = playbackTrack();
  return wrap(`${icon('cassette')} ${T('radio_kicker')}`, text('radio_title'), `<p class="modal-intro editable-prose" data-game-hint>${T('radio_intro')}</p>
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
    ${member.audio ? `<button class="secondary-button" data-melody="${member.id}">${icon('music')} ${T('member_listen')}</button>` : ''}<div class="band-story"><h3>${T('band_story_title')}</h3><p class="editable-prose">${escape(INFO.about)}</p></div><div class="modal-actions"><button class="secondary-button" data-open="radio">${T('band_radio')} ${icon('arrow')}</button><button class="text-button" data-open="concerts">${T('band_concert')}</button></div>`);
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
  if (id.startsWith('bike-')) return bicyclePanel(id);
  if (id.startsWith('space-')) return adventurePanel(id);
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
function adventurePanel(id) {
  const win = id === 'space-win', pause = id === 'space-pause';
  const difficulty = pause ? '' : `<div class="difficulty-picker"><p>${T('adventure_difficulty')}</p><div class="difficulty-options" role="group" aria-label="${T('adventure_difficulty')}">${Object.keys(DIFFICULTIES).map(level => `<button data-difficulty="${level}"><strong>${T('difficulty_' + level)}</strong><small>${T('difficulty_' + level + '_hint')}</small></button>`).join('')}</div></div>`;
  return `<div class="modal-wrap adventure-dialog"><div class="modal-kicker">✦ ${T('adventure_title')}</div><h2 id="modal-title">${T(win ? 'adventure_win' : pause ? 'adventure_pause' : 'adventure_ready')}</h2><p class="modal-intro editable-prose" ${win ? '' : 'data-game-hint'}>${T(win ? 'adventure_win_body' : pause ? 'adventure_keys' : 'adventure_choice_hint')}</p>${difficulty}<div class="modal-actions">${pause ? `<button class="primary-button" data-action="space-continue">${T('adventure_continue')} ${icon('arrow')}</button>` : ''}<button class="secondary-button" data-action="space-land">${T(win ? 'adventure_back' : 'adventure_land')}</button></div></div>`;
}
function bicyclePanel(id) {
  const race = state.race, won = id === 'bike-win', pause = id === 'bike-pause';
  if (!race) return '';
  const level = text('bike_level_' + race.difficulty), scores = state.bikeScores[race.difficulty];
  const choices = !won && !pause ? '<div class="difficulty-picker"><p>' + T('bike_choose') + '</p><div class="difficulty-options" role="group" aria-label="' + T('bike_choose') + '">' + Object.keys(BIKE_LEVELS).map(difficulty => '<button type="button" data-bike-level="' + difficulty + '"><strong>' + T('bike_level_' + difficulty) + '</strong><small>' + T('bike_hint_' + difficulty) + '</small></button>').join('') + '</div></div>' : '';
  const board = '<h3>' + T('bike_board', { stufe: level }) + '</h3><p class="bike-board-local">' + T('bike_board_local') + '</p>'
    + (scores.length ? '<ol class="bike-board">' + scores.map(item => '<li>' + escape(item.name) + '<strong>' + bikeTime(item.time / 10) + '</strong></li>').join('') + '</ol>' : '<p>' + T('bike_board_empty') + '</p>');
  const result = won ? '<div class="bike-results"><strong>' + T('bike_result', { stufe: level, zeit: bikeTime(race.elapsed), anzahl: race.falls, spruenge: race.jumps }) + '</strong></div>'
    + (race.saved ? '<p role="status">' + T('bike_saved') + '</p>' : '<div class="bike-score-entry"><label for="bike-racer-name">' + T('bike_name') + '<input id="bike-racer-name" maxlength="18" autocomplete="off" value="' + escape(storage.get('bike-name', '')) + '"></label><button type="button" class="primary-button" data-action="bike-save">' + T('bike_save') + '</button></div>') + board : '';
  return '<div class="modal-wrap bike-dialog"><div class="modal-kicker">' + T('bike_title') + (pause ? ' · ' + escape(level) : '') + '</div><h2 id="modal-title">' + T(won ? 'bike_win' : pause ? 'bike_pause' : 'bike_ready') + '</h2>'
    + (!won ? '<p class="modal-intro editable-prose">' + T('bike_keys') + '</p>' : '') + result + choices
    + '<div class="modal-actions">' + (pause ? '<button class="primary-button" data-action="bike-continue">' + T('bike_continue') + '</button>' : won ? '<button class="primary-button" data-action="bike-again">' + T('bike_again') + '</button><button class="secondary-button" data-action="bike-levels">' + T('bike_other_level') + '</button>' : '')
    + '<button class="secondary-button" data-action="bike-exit">' + T('bike_back') + '</button></div></div>';
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
  indicator.hidden = !carried || state.scene === 'painting' || !!state.adventure;
  if (carried) indicator.innerHTML = `<img class="carry-cover" src="${escape(carried.image)}" alt=""><span><small>${T('carry_title')}</small><strong>${escape(carried.title)}</strong><span>${T('carry_hint')}</span></span>`;
  const loaded = TRACKS.find(t => t.id === state.tapes.loaded), slot = $('#radio-tape');
  if (slot) { slot.toggleAttribute('hidden', !loaded); slot.innerHTML = loaded ? cassetteMarkup(loaded) : ''; slot.classList.toggle('is-playing', state.playing); }
  refreshPaint();
  refreshDanceParty();
}
function refreshDanceParty() {
  syncParty(state.party, playbackTrack(), state.playing, audio.ended || !!audio.error, ANIMALS, state.animal, state.reduced);
  const layer = $('#dance-party'), visible = state.scene === 'radio' && (state.party.active || state.party.departing);
  if (!layer || state.scene !== 'radio') return;
  const castKey = state.party.castKey;
  if (visible && (layer.dataset.castKey !== castKey || !layer.innerHTML)) { layer.innerHTML = dancePartyMarkup(ANIMALS, state.animal, state.party.cast, state.party.elapsed, state.reduced); layer.dataset.castKey = castKey; }
  layer.toggleAttribute('hidden', !visible); layer.setAttribute('aria-hidden', String(!visible));
  $('#party-effects')?.toggleAttribute('hidden', !state.party.active);
  layer.classList.toggle('is-dancing', state.party.active && state.playing && !document.hidden);
  layer.classList.toggle('is-departing', state.party.departing);
  updateDanceGuests(true);
}
function updateDanceGuests(force = false) {
  if (state.scene !== 'radio') return;
  const lightFrame = Math.floor(state.party.elapsed * 20);
  if (state.party.active && (force || lightFrame !== discoFrame)) {
    discoFrame = lightFrame;
    const lights = discoLightPoses(state.party.elapsed, state.reduced);
    lights.beams.forEach((light, i) => {
      for (const id of ['beam', 'head']) $(`#party-${id}-${i}`)?.setAttribute('transform', `rotate(${light.angle.toFixed(2)})`);
    });
    lights.pools.forEach((light, i) => { $(`#party-pool-${i}`)?.setAttribute('cx', light.x.toFixed(2)); $(`#party-pool-${i}`)?.setAttribute('cy', light.y.toFixed(2)); });
  }
  state.party.cast.forEach((id, i) => {
    const node = $(`#party-dancer-${id}`); if (!node) return;
    const pose = state.party.active ? guestPose(i, state.party.elapsed, state.reduced) : guestExitPose(state.party.exits[i], i, state.party.exitElapsed, state.reduced);
    const transform = `translate(${pose.x.toFixed(2)} ${pose.y.toFixed(2)})`;
    if (node.getAttribute('transform') !== transform) node.setAttribute('transform', transform);
    node.toggleAttribute('hidden', !pose.visible); node.classList.toggle('has-arrived', pose.arrived);
  });
}
function refreshPaint() {
  const color = bucketColors(PALETTE).find(color => color.id === state.paintCan), carried = $('#carried-paint');
  if (carried) { carried.toggleAttribute('hidden', !color); carried.innerHTML = color ? paintCanMarkup(color.color) : ''; }
  const rocketPaint = $('#rocket-paint');
  if (rocketPaint) { rocketPaint.toggleAttribute('hidden', !color || !state.rocket.riding); rocketPaint.innerHTML = color ? paintCanMarkup(color.color) : ''; }
  const indicator = $('#paint-indicator'); indicator.hidden = !color || state.scene === 'painting' || !!state.adventure;
  if (color) indicator.innerHTML = `<svg viewBox="0 0 80 94" aria-hidden="true">${paintCanMarkup(color.color)}</svg><span><strong>${escape(color.name)}</strong><small>${T('paint_carry_hint')}</small><button data-action="put-paint">${T('paint_put_down')}</button></span>`;
  for (const id of ['carried-toolbox', 'rocket-toolbox']) {
    const node = $(`#${id}`);
    if (node) { node.toggleAttribute('hidden', !state.toolbox || id === 'rocket-toolbox' && !state.rocket.riding); node.innerHTML = state.toolbox ? toolboxMarkup() : ''; }
  }
}
function saveHat() { storage.set(hatStorageKey, JSON.stringify(savedHatQuest(state.hat))); }
function refreshHatEffects() {
  const layer = $('#hat-effects');
  if (layer) layer.innerHTML = state.adventure || state.landing || state.scene === 'painting' ? '' : hatEffectsMarkup(state.hat, state.scene, state.reduced, text('hat_find'), state.hatActive);
}
function refreshHatQuest() {
  const active = state.playing && !audio.ended && !audio.error && isHatTrack(playbackTrack());
  const changed = active !== state.hatActive; state.hatActive = active;
  const started = startHatQuest(state.hat, playbackTrack(), state.started && active, Math.random, state.hatRestartPending);
  if (state.started && active) state.hatRestartPending = false;
  if (started) { saveHat(); toast(text('hat_started')); announce(text('hat_started')); }
  if (started && state.scene === 'wardrobe') renderScene();
  else if (changed || started) { updateAnimal(); refreshHatEffects(); state.near = null; updateNear(true); }
}
function hatOrigin() {
  const head = HAT_HEADS[state.animal];
  return { x: state.position.x + (head.x - 50) * .68, y: state.position.y + (state.rocket.riding ? -100 : -77 + head.y * 82 / 120) };
}
function tickHats(dt) {
  const before = !!(state.hat.celebration || state.hat.returning);
  const event = tickHatQuest(state.hat, dt, state.scene, hatOrigin(), state.hatActive);
  if (event) {
    saveHat(); updateAnimal(); state.near = null;
    if (event === 'flying') { toast(text('hat_flew')); announce(text('hat_flew')); }
    if (event === 'returned') { if (state.scene === 'wardrobe') renderScene(); announce(text('hat_returned')); }
  }
  if (event || state.hat.phase === 'flying' || state.hat.returning || state.hat.celebration || before) refreshHatEffects();
}
function awayAnimals() { return [...new Set([...receptionAway(state.reception), ...friendsAway(state.friends)])]; }
function refreshReceptionEffects() {
  const layer = $('#reception-effects');
  game.classList.toggle('is-reception', state.scene === 'world' && state.reception?.phase === 'celebrating' && state.reception.partyTime < 4.5 && !state.reduced && !state.rocket.riding && !state.keys.size && !state.path.length);
  if (layer) layer.innerHTML = state.adventure ? '' : receptionMarkup(state.reception, state.scene, state.reduced);
}
function updateReception(dt) {
  if (!state.reception) return;
  const away = awayAnimals().join(',');
  tickReception(state.reception, dt, state.scene, state.position, state.rocket.riding, state.rocket.airborne);
  if (state.reception.phase === 'done') state.reception = null;
  if (state.scene === 'wardrobe' && away !== awayAnimals().join(',')) renderScene();
  else refreshReceptionEffects();
}
function refreshFriendsPlayback() {
  if (!state.started || !state.friendsRestartPending || !state.playing || audio.ended || audio.error || !isFriendsTrack(playbackTrack())) return;
  state.friendsRestartPending = false;
  const start = state.scene === 'world' ? state.position : HOUSE_DOORS.find(door => door.id === 'radio').outside;
  startFriends(state.friends, ANIMALS, state.animal, start);
  state.reception = null; state.homeReturns = [];
  stopWalking(); closePanel();
  if (state.scene === 'radio') state.friendsExit = { path: planPath(state.position, { x: EXIT.x, y: 1025 }, 'radio') };
  renderScene(); game.focus({ preventScroll: true });
  toast(text('friends_start')); announce(text('friends_start'));
}
function frameFriendsExit(dt) {
  if (!state.friendsExit) return false;
  if (state.scene !== 'radio') { state.friendsExit = null; return false; }
  if (!state.started || modal.open || document.hidden) return true;
  const path = state.friendsExit.path; let amount = WORLD.speed * dt;
  while (path.length && amount > .01) {
    const point = path[0], distance = Math.hypot(point.x - state.position.x, point.y - state.position.y);
    if (distance < 2) { path.shift(); continue; }
    const step = Math.min(amount, distance, WORLD.speed * .025), previous = state.position;
    state.position = move(previous, point.x - previous.x, point.y - previous.y, step / WORLD.speed, 'radio'); faceMovement(previous, state.position);
    if (Math.hypot(previous.x - state.position.x, previous.y - state.position.y) < .01) break;
    amount -= step;
  }
  player.classList.toggle('is-moving', true);
  player.setAttribute('transform', 'translate(' + state.position.x.toFixed(2) + ' ' + state.position.y.toFixed(2) + ')');
  updateCamera(dt);
  if (throughExit('radio', state.position) || !path.length) {
    state.friendsExit = null; leaveRoom(); announce(text('friends_start')); toast(text('friends_start'));
  }
  return true;
}
function refreshFriendsWorld(force = false) {
  const friends = state.friends, badge = $('#friends-progress');
  const showing = state.scene === 'world' && !state.rocket.riding;
  game.classList.toggle('is-camping', showing && friends.phase === 'camping' && !state.reduced);
  const active = ['chasing', 'celebrate', 'to-camp', 'building'].includes(friends.phase);
  badge.hidden = !showing || !active;
  const count = text('friends_progress', { anzahl: friends.caught.length });
  if (badge.textContent !== count) badge.textContent = count;
  if (state.scene !== 'world') return;
  const key = friends.phase + ':' + friends.unlocked + ':' + friends.actors.map(actor => actor.id + '-' + actor.status).join(',');
  if (force || key !== friendsRenderKey) {
    $('#friends-hidden').innerHTML = friendsHiddenMarkup(friends);
    $('#friends-world').innerHTML = friendsWorldMarkup(friends);
    $('#friends-fire').innerHTML = friendsCampfireMarkup(friends);
    friendsRenderKey = key; friendsEffectFrame = -1;
  }
  for (const actor of friends.actors) {
    if (actor.status === 'home') continue;
    const node = $('#friend-' + actor.id), transform = 'translate(' + actor.position.x.toFixed(2) + ' ' + actor.position.y.toFixed(2) + ')';
    if (node?.getAttribute('transform') !== transform) node?.setAttribute('transform', transform);
    node?.classList.toggle('is-walking', actor.walking && !state.reduced);
    node?.querySelector('use')?.setAttribute('href', animalHref(actor.id, false, actor.facing));
  }
  $('#friend-tent-fabric')?.setAttribute('transform', 'scale(1 ' + (friends.phase === 'building' ? Math.max(.03, friends.campBuild) : 1).toFixed(3) + ')');
  const fire = friends.phase === 'camping' || friends.phase === 'building' && friends.campBuild > .65;
  $('#friend-fire-flame')?.toggleAttribute('hidden', !fire);
  const effectFrame = Math.floor(friends.elapsed * 20);
  if (force || effectFrame !== friendsEffectFrame) {
    friendsEffectFrame = effectFrame;
    if (fire) $('#friend-fire-flame')?.setAttribute('transform', state.reduced ? 'scale(1 1)' : 'scale(' + (1 + Math.sin(friends.elapsed * 8) * .05).toFixed(3) + ' ' + (1 + Math.sin(friends.elapsed * 11) * .08).toFixed(3) + ')');
    $('#friends-confetti').innerHTML = friends.phase === 'celebrate' ? friendsConfettiMarkup(friends.elapsed, friends.celebration, state.reduced) : '';
  }
}
function updateFriends(dt) {
  const previousAway = awayAnimals().join(',');
  const positions = new Map(state.friends.actors.map(actor => [actor.id, { ...actor.position }]));
  const events = tickFriends(state.friends, dt, state.scene, state.position, state.rocket.riding, state.rocket.position, state.reduced);
  for (const actor of state.friends.actors) actor.facing = movementFacing(positions.get(actor.id) || actor.position, actor.position, actor.facing);
  for (const event of events) {
    if (event.type === 'leaving') fadeCampMusic();
    if (event.type === 'caught') {
      const name = ANIMALS.find(animal => animal.id === event.id)?.name || '';
      toast(text('friends_caught', { name })); announce(text('friends_caught', { name }));
    }
    if (event.type === 'complete') { stopWalking(); toast(text('friends_complete')); announce(text('friends_complete')); }
    if (event.type === 'camp-walk') {
      stopWalking(); navigateTo(FRIEND_CAMP_PLAYER.x, FRIEND_CAMP_PLAYER.y);
      announce(text('friends_to_water'));
    }
    if (event.type === 'tent-unlocked') storage.set(friendsStorageKey, JSON.stringify(savedFriends(state.friends)));
    if (event.type === 'camp-ready') { toast(text('friends_camp_ready')); announce(text('friends_camp_ready')); }
  }
  if (state.scene === 'wardrobe' && previousAway !== awayAnimals().join(',')) renderScene();
  else refreshFriendsWorld();
}
function inviteFriends() {
  if (state.scene !== 'world' || state.rocket.riding) return;
  if (gatherFriends(state.friends, ANIMALS, state.animal, state.position, state.rocket.position)) {
    state.reception = null; state.homeReturns = [];
    startCampMusic();
    renderScene(); announce(text('friends_invited')); toast(text('friends_invited'));
  }
}

function refreshChocolateItems() {
  const chocolate = state.chocolate, carry = $('#chocolate-carry');
  if (carry) {
    carry.toggleAttribute('hidden', !chocolate.carrying || state.rocket.riding || !!state.race || !!state.adventure || state.scene === 'painting');
    carry.setAttribute('transform', 'translate(' + (state.position.x + 17).toFixed(2) + ' ' + (state.position.y - 30).toFixed(2) + ') scale(' + (state.scene === 'chocolate' ? '.3' : '.42') + ')');
  }
  const badge = $('#chocolate-boost'), seconds = Math.ceil(chocolate.boost);
  badge.hidden = !seconds || state.rocket.riding || !!state.race || !!state.adventure || state.scene === 'painting';
  const boostLabel = text('choco_boost', { sekunden: seconds });
  if (badge.textContent !== boostLabel) badge.textContent = boostLabel;
  const progress = $('#chocolate-progress'); progress.hidden = state.scene !== 'chocolate';
  if (!progress.hidden && chocolate.run) {
    const run = chocolate.run, label = text(run.phase === 'leaving' ? 'choco_leaving' : run.phase === 'celebrate' ? 'choco_count' : !chocolate.active ? 'choco_paused' : 'choco_count', { anzahl: run.collected.length });
    if (progress.textContent !== label) progress.textContent = label;
    const counter = $('#chocolate-status'), count = text('choco_count', { anzahl: run.collected.length });
    if (counter && counter.textContent !== count) counter.textContent = count;
  }
}
function refreshChocolatePlayback() {
  const chocolate = state.chocolate, track = playbackTrack(), previous = chocolate.active, previousDoor = chocolate.session;
  chocolate.active = state.playing && !audio.ended && !audio.error && isChocolateTrack(track);
  if (chocolate.active) chocolate.session = true;
  if (!isChocolateTrack(track) || audio.ended || audio.error) {
    chocolate.session = false;
    if (state.scene === 'chocolate') requestChocolateExit('song');
  }
  if ((previous !== chocolate.active || previousDoor !== chocolate.session) && state.scene === 'radio') renderScene();
  refreshChocolateItems();
}
function enterChocolateMaze() {
  if (state.scene !== 'radio' || !state.chocolate.active) return false;
  stopWalking(); closePanel(); state.chocolate.run = newChocolateRun(state.chocolate.collected);
  state.scene = 'chocolate'; state.position = { ...MAZE_SPAWN };
  renderScene(); game.focus({ preventScroll: true }); announce(text('choco_collect_hint')); return true;
}
function requestChocolateExit(reason = 'manual') {
  if (state.scene !== 'chocolate' || !state.chocolate.run) return;
  closePanel(); stopWalking();
  beginChocolateExit(state.chocolate.run, state.position, reason);
  $('#chocolate-celebration').innerHTML = '';
  refreshChocolateItems(); announce(text('choco_leaving'));
}
function finishChocolateExit() {
  stopWalking(); state.chocolate.run = null; state.scene = 'radio'; state.position = { ...CHOCOLATE_RETURN };
  renderScene(); game.focus({ preventScroll: true }); announce(text('choco_returned'));
}
function frameChocolate(dt) {
  const previousPosition = { ...state.position };
  const run = state.chocolate.run;
  if (!run || !state.started || modal.open || document.hidden) return;
  let walking = false;
  if (run.phase === 'celebrate') {
    run.celebration += dt;
    $('#chocolate-celebration').innerHTML = chocolateConfetti(run.celebration, state.position.x, state.position.y, state.reduced);
    if (run.celebration >= 2.4) requestChocolateExit('complete');
  } else if (run.phase === 'leaving') {
    const old = state.position, next = advanceChocolateExit(run, old, dt);
    state.position = next.position; walking = Math.hypot(old.x - next.position.x, old.y - next.position.y) > .05;
    if (next.done) { finishChocolateExit(); return; }
  } else if (state.chocolate.active) {
    let dx = 0, dy = 0;
    for (const code of state.keys) { const direction = directions.get(code); if (direction) { dx += direction[0]; dy += direction[1]; } }
    for (const direction of state.pad.values()) { const vector = padVectors[direction]; dx += vector[0]; dy += vector[1]; }
    if (!dx && !dy && state.path.length) {
      while (state.path.length && Math.hypot(state.path[0].x - state.position.x, state.path[0].y - state.position.y) < 2) state.path.shift();
      if (state.path.length) { dx = state.path[0].x - state.position.x; dy = state.path[0].y - state.position.y; }
    }
    if (dx || dy) {
      const old = state.position, speed = chocolateSpeed(state.chocolate);
      const step = state.path.length ? Math.min(dt, Math.hypot(dx, dy) / (WORLD.speed * speed)) : dt;
      state.position = move(old, dx, dy, step, 'chocolate', null, speed); walking = Math.hypot(old.x - state.position.x, old.y - state.position.y) > .05;
    }
    const collected = collectChocolate(run, state.position);
    if (collected) {
      state.chocolate.collected = [...run.collected];
      for (const treat of MAZE_CHOCOLATES) if (run.collected.includes(treat.id)) $('#maze-' + treat.id)?.setAttribute('hidden', '');
      announce(text('choco_count', { anzahl: run.collected.length }));
      if (collected === 'complete') {
        state.chocolate.unlocked = true; storage.set(chocolateStorageKey, JSON.stringify(savedChocolate(state.chocolate)));
        stopWalking(); toast(text('choco_complete')); announce(text('choco_complete'));
      }
    }
    if (run.phase === 'search' && Math.hypot(state.position.x - MAZE_EXIT.x, state.position.y - MAZE_EXIT.y) < 20) { finishChocolateExit(); return; }
  }
  faceMovement(previousPosition, state.position);
  player.classList.toggle('is-moving', walking);
  player.setAttribute('transform', 'translate(' + state.position.x.toFixed(2) + ' ' + state.position.y.toFixed(2) + ')');
  updateNear(); updateCamera(dt); refreshChocolateItems();
}

function renderScene() {
  clearPaintPreview();
  const hat = wearsHat(state.hat, state.hatActive);
  let artwork = state.race ? bikeRaceMarkup(state.race, state.animal, state.paint, hat, state.reduced) : state.adventure ? adventureMarkup(state.adventure, state.animal, state.paint, hat) : state.scene === 'chocolate' ? chocolateMazeMarkup(state.chocolate.run) : state.scene === 'painting' ? studioMarkup(state.paint, PALETTE, state.studio) : outsideScene(state.scene) ? worldMarkup(state.paint, !!state.paintCan, state.scene, { ...state.rocket, hat }, state.animal) : roomMarkup(state.scene, state.shelfPage, state.tapes, state.animal, { can: state.paintCan, page: state.paintPage, world: state.paint, toolbox: state.toolbox, returns: state.homeReturns, hat: state.hat, away: awayAnimals(), chocolate: state.chocolate, bikeDoor: state.bikeDoor });
  const markup = colorHatMarkup(artwork, state.hat.color);
  const end = markup.lastIndexOf('</svg>');
  game.innerHTML = markup.slice(0, end) + '<g id="hat-effects"></g><g id="reception-effects"></g><g id="chocolate-carry" pointer-events="none" hidden="">' + chocolateBarMarkup() + '</g>' + markup.slice(end);
  world = $('#world-svg'); player = $('#player'); playerUse = $('#player-use'); marker = $('#destination-marker');
  game.setAttribute('aria-label', state.race ? text('bike_title') : state.adventure?.sunTime != null ? text('sun_holiday_title') : state.scene === 'chocolate' ? text('choco_title') : state.scene === 'painting' ? text('studio_title') : state.scene === 'space' ? text('space_title') : state.scene === 'sky' ? text('sky_title') : state.scene === 'world' ? text('world_title') : ROOMS[state.scene].title);
  $('.wayfinder').hidden = state.scene !== 'world' || state.rocket.riding;
  $('.exit-room').hidden = !!state.landing || state.adventure?.phase === 'intro' || !state.race && state.scene === 'world' && !state.rocket.riding;
  $('.exit-room').textContent = text(state.race ? 'bike_back' : state.adventure?.sunTime != null ? 'adventure_back' : state.scene === 'chocolate' ? 'choco_back' : state.scene === 'painting' ? 'studio_close' : state.rocket.riding ? state.rocket.airborne ? 'rocket_land_button' : 'rocket_exit' : 'exit_button');
  game.classList.toggle('in-room', !outsideScene(state.scene));
  player.toggleAttribute('hidden', state.rocket.riding || !!state.race);
  state.near = null; updateAnimal(); refreshCassettes(); refreshHatEffects(); refreshReceptionEffects(); resize(); updateNear(true);
  player.setAttribute('transform', `translate(${state.position.x} ${state.position.y})`);
  refreshChocolateItems(); refreshFriendsWorld(true); game.classList.toggle('is-bike-race', !!state.race);
  bikeTerrainStep = -1; if (state.race) updateBicycleRace();
}
function showPanel(id, focusSelector = '') {
  if (state.race && !id.startsWith('bike-')) id = state.race.phase === 'finished' ? 'bike-win' : state.race.phase === 'ready' ? 'bike-launch' : 'bike-pause';
  if (state.scene === 'chocolate') { requestChocolateExit(); return; }
  if (state.landing || ['intro', 'sun-finale'].includes(state.adventure?.phase)) return;
  if (state.adventure && !id.startsWith('space-')) id = state.adventure.phase === 'won' ? 'space-win' : state.adventure.phase === 'playing' ? 'space-pause' : 'space-launch';
  stopWalking(); clearPaintPreview(); state.modal = id; game.classList.add('paused');
  modal.classList.toggle('space-choice', id.startsWith('space-') || id.startsWith('bike-'));
  modalContent.innerHTML = renderPanel(id);
  if (BAND.some(member => member.id === id)) playMemberMelody(id); else stopMemberMelody();
  if (!modal.open) modal.showModal();
  if (focusSelector) modalContent.querySelector(focusSelector)?.focus();
  else if (id === 'characters') modalContent.querySelector('[aria-pressed=true]')?.focus();
  else modalContent.querySelector('button:not(.modal-close):not([disabled]), a[href], .modal-close')?.focus();
}
function closePanel() {
  if (state.race && ['ready', 'finished'].includes(state.race.phase)) { exitBicycleRace(); return; }
  if (state.adventure && ['intro', 'ready', 'won'].includes(state.adventure.phase)) { landFromAdventure(); return; }
  if (modal.open) modal.close();
}
modal.addEventListener('close', () => {
  if (modal.open) return;
  state.modal = null; game.classList.remove('paused'); clearInput();
  stopMemberMelody();
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
  if (state.race) { showPanel('bike-pause'); return false; }
  if (friendsBlockBuildings(state.friends)) return false;
  if (state.scene === 'chocolate') { requestChocolateExit(); return false; }
  const room = roomFor(id); if (!room) return;
  if (state.scene === 'painting') closePainting();
  if (state.rocket.riding) { closePanel(); toast(text('rocket_land_first')); return false; }
  if (!state.started) beginWorld(false);
  state.returnPosition = { ...(HOUSE_DOORS.find(door => door.id === room)?.outside || ROOMS[room].outside || WORLD_SPAWN) };
  stopWalking(); closePanel(); state.paintTarget = null; state.scene = room; state.position = { ...(ROOMS[room].spawn || ROOM_SPAWN) };
  renderScene(); game.focus({ preventScroll: true });
  announce(text('entered_room', { haus: ROOMS[room].title }));
  return true;
}
function leaveRoom() {
  if (state.race) { exitBicycleRace(); return; }
  if (state.scene === 'chocolate') { requestChocolateExit(); return; }
  if (state.landing) return;
  if (state.adventure) { landFromAdventure(); return; }
  if (state.scene === 'painting') { closePainting(); return; }
  if (state.rocket.riding) { closePanel(); if (state.rocket.airborne) returnToGround(); else exitRocket(); return; }
  stopWalking(); closePanel();
  if (state.scene !== 'world') {
    state.scene = 'world'; state.position = { ...(state.returnPosition || WORLD_SPAWN) }; renderScene();
  }
  game.focus({ preventScroll: true }); announce(text('left_room'));
}
function visit(id) { if (roomFor(id)) enterRoom(id); else showPanel(id); }
function checkWorldTouch() {
  if (state.scene !== 'world' || state.rocket.riding || modal.open || !state.started) return;
  const touch = worldTouch(state.position);
  if (touch) enterRoom(touch.id);
}
function refreshAudioVolume() {
  const campGain = state.campMusic?.fadeRemaining == null ? 1 : state.campMusic.fadeRemaining / FRIEND_CAMP_FADE_SECONDS;
  const fading = state.chocolate.boost > 0 && isChocolateTrack(playbackTrack());
  const volume = state.volume * (state.bikeMusic ? 0 : 1) * (state.memberMelody ? .2 : 1) * (fading ? chocolateMusicGain(state.chocolate) : 1);
  if (audio.volume !== volume) audio.volume = volume;
  campAudio.volume = state.volume * (state.bikeMusic ? 0 : 1) * (state.memberMelody ? .2 : 1) * campGain;
  bikeAudio.volume = state.volume * (state.memberMelody ? .2 : 1);
}
function refreshPlayback() {
  refreshAudioVolume();
  state.playing = !audio.paused && !audio.ended;
  refreshDanceParty();
  refreshHatQuest();
  refreshChocolatePlayback();
  refreshFriendsPlayback();
  refreshBicycleDoor();
  $('#radio-shortcut').setAttribute('aria-label', text('room_radio'));
  $('#radio-shortcut').style.background = state.playing ? 'var(--yellow)' : '';
  $('#radio-tape')?.classList.toggle('is-playing', state.playing);
  if (['radio', 'radio-info'].includes(state.modal)) {
    $('.boombox')?.classList.toggle('is-playing', state.playing);
    const btn = modalContent.querySelector('[data-action=play]');
    if (btn && !btn.disabled) { btn.innerHTML = icon(state.playing ? 'pause' : 'play'); btn.setAttribute('aria-label', text(state.playing ? 'pause_label' : 'play_label')); }
  }
}
function playbackTrack() {
  return TRACKS.find(track => track.id === (state.boostMusic?.id || state.tapes.loaded));
}
function validRecording(track) {
  if (!track?.src) return false;
  try {
    const url = new URL(track.src, document.baseURI);
    return !!safeURL(url.href) || previewMode && url.protocol === 'blob:';
  } catch { return false; }
}
function playRecording(track, time = 0, playing = true) {
  audio.pause(); state.playing = false; audio.loop = !!state.boostMusic;
  if (validRecording(track)) {
    audio.src = track.src; audio.currentTime = Math.max(0, Number.isFinite(time) ? time : 0);
    if (playing) audio.play().catch(() => toast(text('audio_start')));
  } else { audio.removeAttribute('src'); audio.load(); }
  refreshPlayback();
}
function loadRecording() {
  stopCampMusic();
  // Only inserting or ejecting a cassette replenishes the maze, never a room visit.
  state.chocolate.collected = []; state.chocolate.session = false;
  state.boostMusic = null;
  const track = playbackTrack();
  state.hatRestartPending = isHatTrack(track);
  state.friendsRestartPending = isFriendsTrack(track);
  playRecording(track);
}
function startChocolateMusic() {
  const track = TRACKS.find(track => isChocolateTrack(track) && validRecording(track));
  if (!track) return;
  stopCampMusic();
  const previous = state.boostMusic?.previous || { id: state.tapes.loaded, time: audio.currentTime || 0, playing: state.playing };
  const continuing = !state.boostMusic && isChocolateTrack(playbackTrack()) && state.playing;
  state.boostMusic = { id: track.id, previous, continuing };
  if (!continuing) playRecording(track); else { audio.loop = true; refreshAudioVolume(); }
}
function finishChocolateMusic() {
  if (!state.boostMusic) return;
  const { previous, continuing } = state.boostMusic; state.boostMusic = null;
  if (continuing) { audio.pause(); audio.loop = false; refreshPlayback(); }
  else playRecording(playbackTrack(), previous.time, previous.playing && !isChocolateTrack(playbackTrack()));
}
for (const event of ['play', 'pause', 'ended']) audio.addEventListener(event, () => {
  if (event === 'play' && state.campMusic) stopCampMusic();
  if (event === 'ended' && isHatTrack(playbackTrack())) state.hatRestartPending = true;
  if (event === 'ended' && isFriendsTrack(playbackTrack())) state.friendsRestartPending = true;
  refreshPlayback();
});
audio.addEventListener('error', () => { refreshPlayback(); toast(text('audio_error')); });
function stopCampMusic() {
  state.campMusic = null; campAudio.pause(); campAudio.loop = false; campAudio.removeAttribute('src'); campAudio.load();
}
function startCampMusic() {
  // A playing cassette keeps its own position and volume, even beside the tent.
  if (state.playing && !state.boostMusic && isFriendsTrack(playbackTrack())) return;
  const track = TRACKS.find(track => isFriendsTrack(track) && validRecording(track));
  if (!track) return;
  stopCampMusic(); state.boostMusic = null; audio.pause(); audio.loop = false; state.playing = false;
  state.friendsRestartPending = false;
  state.campMusic = { track: track.id, fadeRemaining: null };
  const session = state.campMusic;
  campAudio.src = track.src; campAudio.currentTime = 0; campAudio.loop = true;
  refreshPlayback(); refreshAudioVolume();
  campAudio.play().catch(() => { if (state.campMusic === session) { stopCampMusic(); announce(text('audio_error')); } });
}
function fadeCampMusic() {
  if (state.campMusic && state.campMusic.fadeRemaining === null) state.campMusic.fadeRemaining = FRIEND_CAMP_FADE_SECONDS;
}
function tickCampMusic(elapsed) {
  if (!state.campMusic || state.campMusic.fadeRemaining === null) return;
  state.campMusic.fadeRemaining = Math.max(0, state.campMusic.fadeRemaining - Math.max(0, elapsed));
  if (!state.campMusic.fadeRemaining) stopCampMusic();
}
campAudio.addEventListener('error', () => { if (state.campMusic) stopCampMusic(); });
function stopMemberMelody() {
  memberRequest++; state.memberMelody = null; memberAudio.pause(); memberAudio.removeAttribute('src'); memberAudio.load(); refreshAudioVolume();
}
function playMemberMelody(id) {
  stopMemberMelody();
  const member = BAND.find(member => member.id === id), url = member?.audio ? new URL(member.audio, document.baseURI) : null;
  if (!url || !(safeURL(url.href) || previewMode && url.protocol === 'blob:')) return;
  const request = ++memberRequest;
  state.memberMelody = id; memberAudio.src = member.audio; memberAudio.volume = state.volume;
  refreshAudioVolume();
  memberAudio.play().catch(() => { if (memberRequest === request) { stopMemberMelody(); toast(text('member_audio_error')); } });
}
for (const event of ['ended', 'error']) memberAudio.addEventListener(event, () => { if (state.memberMelody) stopMemberMelody(); });
document.addEventListener('input', e => { if (e.target.id === 'volume') { state.volume = Number(e.target.value); memberAudio.volume = state.volume; refreshAudioVolume(); storage.set('volume', state.volume); } });
function refreshBicycleDoor() {
  const open = state.playing && !audio.ended && !audio.error && isBikeTrack(playbackTrack());
  if (open === state.bikeDoor) return;
  state.bikeDoor = open;
  if (state.scene === 'radio' && !state.race) renderScene();
}
function startBicycleMusic() {
  if (state.bikeMusic) return;
  const track = TRACKS.find(track => isBikeTrack(track) && validRecording(track));
  if (!track) return;
  stopCampMusic(); state.bikeMusic = track.id;
  bikeAudio.src = track.src; bikeAudio.currentTime = isBikeTrack(playbackTrack()) ? audio.currentTime || 0 : 0; bikeAudio.loop = true;
  refreshAudioVolume();
  bikeAudio.play().catch(() => { stopBicycleMusic(); announce(text('audio_error')); });
}
function stopBicycleMusic() {
  state.bikeMusic = null; bikeAudio.pause(); bikeAudio.loop = false; bikeAudio.removeAttribute('src'); bikeAudio.load();
  refreshAudioVolume();
}
bikeAudio.addEventListener('error', () => { if (state.bikeMusic) stopBicycleMusic(); });
function enterBicycleRace() {
  if (state.scene !== 'radio' || !state.bikeDoor || state.race) return false;
  stopWalking(); closePanel(); state.race = createBikeRace(state.animal, ANIMALS);
  startBicycleMusic(); renderScene(); showPanel('bike-launch'); return true;
}
function launchBicycleRace(difficulty = state.race?.difficulty) {
  if (!state.race || !['ready', 'finished'].includes(state.race.phase)) return;
  if (!Object.hasOwn(BIKE_LEVELS, difficulty)) return;
  state.race = createBikeRace(state.animal, ANIMALS, difficulty); startBikeRace(state.race);
  startBicycleMusic(); closePanel(); renderScene(); game.focus({ preventScroll: true }); announce(text('bike_keys'));
}
function exitBicycleRace() {
  if (!state.race) return;
  state.race = null; stopWalking(); stopBicycleMusic(); if (modal.open) modal.close();
  state.scene = 'radio'; state.position = { ...BIKE_RETURN }; state.facing = 'front';
  renderScene(); game.focus({ preventScroll: true });
}
function saveBicycleResult() {
  const race = state.race; if (!race || race.phase !== 'finished' || race.saved) return;
  const name = $('#bike-racer-name')?.value || ANIMALS.find(animal => animal.id === state.animal).name;
  state.bikeScores = addBikeScore(state.bikeScores, race.difficulty, name, race.elapsed);
  storage.set(bikeScoreKey, JSON.stringify(state.bikeScores)); storage.set('bike-name', String(name).slice(0, 18)); race.saved = true;
  showPanel('bike-win'); announce(text('bike_saved'));
}
function updateBicycleRace() {
  const race = state.race; if (!race) return;
  const stamp = Math.floor(race.elapsed * 30);
  if (stamp !== bikeTerrainStep) {
    $('#bike-terrain').innerHTML = bikeTerrainMarkup(race, state.paint); $('#bike-obstacles').innerHTML = bikeObstaclesMarkup(race); bikeTerrainStep = stamp;
  }
  for (const rider of race.riders) {
    const p = bikeRiderPose(race, rider, state.reduced), id = rider.id;
    $('#bike-rider-' + id)?.toggleAttribute('hidden', rider.ai && !rider.active);
    $('#bike-rider-' + id)?.setAttribute('transform', p.transform);
    $('#bike-fly-' + id)?.setAttribute('transform', p.lift);
    for (const wheel of ['back', 'front']) $('#bike-wheel-' + wheel + '-' + id)?.setAttribute('transform', 'rotate(' + p.angle + ')');
    $('#bike-crank-' + id)?.setAttribute('transform', 'rotate(' + p.angle + ')');
    $('#bike-body-' + id)?.setAttribute('transform', p.body);
  }
  const values = { 'bike-clock': bikeTime(race.elapsed), 'bike-speed': bikeKmh(race) + ' km/h', 'bike-friends': bikeEncounterCount(race) + ' / 3', 'bike-jumps': String(race.jumps) };
  for (const [id, value] of Object.entries(values)) { const node = $('#' + id); if (node && node.textContent !== value) node.textContent = value; }
  $('#bike-progress')?.setAttribute('width', (676 * Math.min(1, race.player.x / BIKE_FINISH)).toFixed(1));
  $('#bike-recovery')?.toggleAttribute('hidden', !race.player.fall);
  if (race.player.fall) $('#bike-recovery-text').textContent = text('bike_recover', { sekunden: (Math.ceil(race.player.fall * 10) / 10).toFixed(1).replace('.', ',') });
}
function frameBicycleRace(elapsed, input = {}) {
  if (!state.race || state.race.phase !== 'racing') return;
  const event = tickBikeRace(state.race, elapsed, input); updateBicycleRace();
  if (event === 'fall') announce(text('bike_recover', { sekunden: '3,0' }));
  if (event === 'finish') { stopWalking(); showPanel('bike-win'); announce(text('bike_win')); }
}

function currentInteraction() {
  if (state.race || state.adventure || state.landing) return null;
  if (state.chocolate.carrying && state.scene !== 'painting' && !state.rocket.riding && state.chocolate.run?.phase !== 'leaving') return { id: 'eat-chocolate', kind: 'eat-chocolate', label: text('choco_eat') };
  if (state.scene === 'chocolate') return null;
  if (state.scene === 'wardrobe' && state.chocolate.unlocked && Math.hypot(state.position.x - CHOCOLATE_DRAWER.x, state.position.y - CHOCOLATE_DRAWER.y) < 75) return { ...CHOCOLATE_DRAWER, kind: 'take-chocolate', label: text('choco_take') };
  if (state.scene === 'painting') {
    const interaction = studioInteraction(state.position, PALETTE, state.studio.page), matrix = world.getScreenCTM();
    if (interaction?.kind !== 'studio-paint' || !document.elementsFromPoint || !matrix) return interaction;
    const point = new DOMPoint(state.position.x, state.position.y).matrixTransform(matrix);
    const surface = document.elementsFromPoint(point.x, point.y).map(node => node.closest('[data-paint-target]')).map(node => largeSurfaces.find(surface => surface.id === node?.dataset.paintTarget)).find(Boolean);
    return surface ? { ...surface, kind: 'studio-paint', label: text(surface.key) } : null;
  }
  const hat = hatInteraction(state.hat, state.scene, state.position, state.hatActive);
  if (hat) {
    if (hat.kind === 'wear-hat' && bucketColors(PALETTE).some(color => color.id === state.paintCan)) return { ...hat, kind: 'paint-hat', label: text('hat_paint') };
    return { ...hat, label: text(hat.kind === 'find-hat' ? 'hat_find' : hat.kind === 'wear-hat' ? 'hat_wear' : 'hat_return') };
  }
  if (state.rocket.riding && !state.rocket.airborne) return { id: 'rocket', kind: 'rocket-exit', label: text('rocket_exit') };
  if (state.rocket.riding && state.scene !== 'sky') return null;
  const interaction = nearbyInteraction(state.scene, state.position, state.tapes, state.shelfPage, { can: state.paintCan, page: state.paintPage, toolbox: state.toolbox, animal: state.animal, returns: state.homeReturns, away: awayAnimals() }, state.rocket.position);
  if (interaction?.kind === 'rocket-board' && state.rocket.repair != null) return null;
  if (interaction?.kind === 'rocket-board') return state.rocket.damaged ? { ...interaction, kind: state.toolbox ? 'rocket-repair' : 'rocket-damaged', label: text(state.toolbox ? 'rocket_repair' : 'rocket_needs_tools') } : interaction;
  const color = bucketColors(PALETTE).find(color => color.id === state.paintCan);
  if (outsideScene(state.scene) && color) {
    const selected = BUCKET_SURFACES.find(surface => surface.id === state.paintTarget);
    const surface = canPaintSurface(state.position, selected) ? selected : nearbyPaintSurface(state.position);
    if (surface) return { ...surface, kind: 'paint', label: text('paint_action', { flaeche: text(surface.key), farbe: color.name }) };
  }
  if (state.scene === 'world' && !state.rocket.riding && friendsTentNear(state.friends, state.position)) return { id: 'friends-tent', kind: 'friends-camp', label: text('friends_meet') };
  return interaction;
}
function boardRocket() {
  if (state.race || state.rocket.damaged || state.rocket.repair != null || state.landing || state.adventure) return;
  stopWalking(); state.paintTarget = null; state.rocket.riding = true; state.rocket.airborne = false;
  state.position = { ...state.rocket.position }; renderScene(); game.focus({ preventScroll: true });
  toast(text('rocket_boarded')); announce(text('rocket_boarded'));
}
function exitRocket() {
  if (!state.rocket.riding || state.rocket.airborne) return;
  const exit = rocketExitPosition(state.rocket.position); if (!exit) return;
  stopReceptionFireworks(state.reception);
  stopWalking(); state.rocket.riding = false; state.scene = 'world'; state.position = exit; state.paintTarget = null;
  renderScene(); game.focus({ preventScroll: true }); announce(text('rocket_exited'));
}
function returnToGround() {
  if (state.landing) return;
  if (state.adventure) { landFromAdventure(); return; }
  if (!state.rocket.riding) return;
  if (!state.rocket.airborne) { exitRocket(); return; }
  navigateTo(GROUND_ROCKET.x, GROUND_ROCKET.y, { kind: 'land-rocket' }); announce(text('rocket_returning'));
}
function landRocket() {
  stopWalking(); state.rocket.airborne = false; state.scene = 'world'; state.paintTarget = null;
  renderScene(); toast(text('rocket_landed')); announce(text('rocket_landed'));
}
function enterSpaceAdventure() {
  stopWalking(); state.paintTarget = null;
  const r = game.getBoundingClientRect(), matrix = world.getScreenCTM();
  const point = matrix ? new DOMPoint(state.position.x, state.position.y - 86).matrixTransform(matrix) : null;
  const entry = point ? { x: clamp(point.x - (r.left || 0), 0, r.width), y: clamp(point.y - (r.top || 0), 0, r.height), scale: Math.hypot(matrix.a, matrix.b) || .8 } : null;
  state.adventure = createAdventure(r.width || 1200, r.height || 700, Date.now(), entry, bucketColors(PALETTE).find(color => color.id === state.paintCan)?.color);
  state.adventure.reduced = state.reduced;
  state.adventure.nextDifficulty = state.difficulty;
  state.scene = 'space'; renderScene(); announce(text('space_entered'));
}
function playAdventure() {
  if (!state.adventure || !['ready', 'won'].includes(state.adventure.phase)) return;
  startAdventure(state.adventure, state.adventure.nextDifficulty); closePanel(); renderScene(); game.focus({ preventScroll: true }); announce(text('adventure_keys'));
}
function landFromAdventure(crashed = false) {
  if (!state.adventure) return;
  const success = !crashed && state.adventure.phase === 'won' && state.adventure.completedDifficulty === 'profi';
  if (success) { releaseFriends(state.friends); state.reception = createReception(ANIMALS, state.animal, GROUND_ROCKET); }
  state.adventure = null;
  if (crashed) { state.rocket.damaged = true; state.rocket.broken = false; storage.set(rocketStorageKey, '1'); toast(text('rocket_crashed')); }
  stopWalking(); closePanel();
  state.landing = { from: { ...state.position }, elapsed: 0, crashed, success };
  state.rocket.angle = crashed ? 180 : 0; renderScene(); announce(text(crashed ? 'rocket_crashed' : 'rocket_returning'));
}
function finishAdventureTick(event) {
  if (event === 'ready') showPanel('space-launch');
  if (event === 'sun-arrived') { stopWalking(); renderScene(); state.adventure.sunStage = 'arrival'; announce(text('sun_story_landing')); }
  if (event === 'win') { stopWalking(); showPanel('space-win'); announce(text('adventure_win')); }
  if (event === 'crash') landFromAdventure(true);
}
function updateAdventure() {
  const adventure = state.adventure; if (!adventure) return;
  if (adventure.sunTime !== null) { updateSunHoliday(); return; }
  const pose = adventureShipPose(adventure), angle = adventure.angle;
  const flight = ['playing', 'won'].includes(adventure.phase);
  $('#adventure-course')?.removeAttribute('hidden');
  $('#adventure-course')?.setAttribute('opacity', adventureCourseOpacity(adventure).toFixed(3));
  $('#adventure-hud')?.toggleAttribute('hidden', !flight);
  $('.exit-room').hidden = adventure.phase === 'intro';
  $('#adventure-ship')?.setAttribute('transform', `translate(${pose.x.toFixed(2)} ${pose.y.toFixed(2)}) scale(${pose.scale.toFixed(3)})`);
  $('#rocket-hull')?.setAttribute('transform', `rotate(${angle.toFixed(2)} 0 -86)`);
  $('#rocket-pilot-upright')?.setAttribute('transform', `rotate(${-angle.toFixed(2)} 0 -86)`);
  $('#adventure-course')?.setAttribute('transform', `translate(${adventure.width * .25 - adventure.progress} 0)`);
  $('#adventure-stars')?.setAttribute('transform', `translate(${-adventure.progress * .18 % adventure.width} 0)`);
  $('#adventure-paint-trail')?.setAttribute('d', adventureTrailPath(adventure));
  $('#adventure-meteors').innerHTML = adventure.meteors.map(meteorMarkup).join('');
  $('#adventure-progress')?.setAttribute('width', String(Math.max(110, Math.min(adventure.width - 75, 430)) * (adventure.phase === 'won' ? 1 : Math.min(1, adventure.progress / FINISH_DISTANCE))));
}
function updateSunHoliday() {
  if (!$('#sun-holiday')) return;
  const adventure = state.adventure, p = sunHolidayPose(adventure);
  $('#sun-flight-background')?.setAttribute('opacity', (1 - p.surfaceOpacity).toFixed(3));
  $('#sun-surface-background')?.setAttribute('opacity', p.surfaceOpacity.toFixed(3));
  $('#sun-story')?.toggleAttribute('hidden', !p.storyVisible);
  $('#sun-shuttle')?.setAttribute('opacity', p.shipOpacity.toFixed(3));
  $('#sun-shuttle')?.setAttribute('transform', holidayTransform({ ...p.shuttle, angle: 0 }));
  $('#rocket-hull')?.setAttribute('transform', `rotate(${p.shuttle.angle.toFixed(2)} 0 -86)`);
  $('#rocket-pilot-upright')?.setAttribute('transform', `rotate(${-p.shuttle.angle.toFixed(2)} 0 -86)`);
  $('#rocket-pilot')?.toggleAttribute('hidden', !p.pilot);
  $('#rocket-shadow')?.toggleAttribute('hidden', p.airborne);
  $('#rocket .rocket-flame')?.toggleAttribute('hidden', !p.airborne);
  $('#rocket-paint')?.toggleAttribute('hidden', !state.paintCan || !p.pilot);
  $('#rocket-toolbox')?.toggleAttribute('hidden', !state.toolbox || !p.pilot);
  $('#sun-hatch')?.toggleAttribute('hidden', !p.hatch);
  $('#sun-actor')?.setAttribute('transform', holidayTransform(p.actor));
  $('#sun-actor')?.toggleAttribute('hidden', !p.actorVisible);
  $('#sun-actor-body')?.setAttribute('transform', p.walking && !state.reduced ? `translate(0 ${Math.sin(p.time * 17) * 1.7})` : 'translate(0 0)');
  $('#sun-folded-chair')?.toggleAttribute('hidden', !p.foldedChair);
  $('#sun-lounger')?.setAttribute('transform', holidayTransform(p.chair));
  $('#sun-lounger')?.toggleAttribute('hidden', !p.chairVisible);
  $('#sun-lounger-open')?.setAttribute('transform', `scale(${p.chairOpen.toFixed(3)} 1)`);
  $('#sun-sunglasses')?.setAttribute('transform', `translate(0 ${p.glassesY.toFixed(2)})`);
  $('#sun-sunglasses')?.toggleAttribute('hidden', !p.glasses);
  if (adventure.sunStage !== p.stage) { adventure.sunStage = p.stage; $('#sun-story').textContent = text(p.caption); announce(text(p.caption)); }
}
function putPaintDown() { state.paintCan = null; state.paintTarget = null; stopWalking(); renderScene(); game.focus({ preventScroll: true }); }
function clearPaintPreview() { paintPreview?.restore(); paintPreview = null; }
function refreshPaintPreview(near) {
  const colorId = state.scene === 'painting' ? state.studio?.color : state.paintCan;
  const color = state.started && !modal.open && (outsideScene(state.scene) && near?.kind === 'paint' || state.scene === 'painting' && near?.kind === 'studio-paint') ? (state.scene === 'painting' ? PALETTE : bucketColors(PALETTE)).find(color => color.id === colorId) : null;
  if (color && paintPreview?.id === near.id && paintPreview.color === color.color) return;
  clearPaintPreview();
  if (color) paintPreview = { id: near.id, color: color.color, restore: createPaintPreview(game, near.id, color.color, PALETTE) };
}
function paintSurface(id) {
  const surface = BUCKET_SURFACES.find(surface => surface.id === id), color = bucketColors(PALETTE).find(color => color.id === state.paintCan);
  if (!color || !outsideScene(state.scene) || state.rocket.riding && state.scene !== 'sky' || !canPaintSurface(state.position, surface)) return;
  stopWalking(); state.paint[id] = color.color; state.paintTarget = id;
  storage.set(paintStorageKey, JSON.stringify(state.paint)); renderScene(); game.focus({ preventScroll: true });
  announce(text('paint_done', { flaeche: text(surface.key), farbe: color.name }));
}
function activatePaintSurface(id, confirm = true) {
  const surface = BUCKET_SURFACES.find(surface => surface.id === id); if (!surface) return;
  if (!!surface.sky !== (state.scene === 'sky')) { toast(text(surface.sky ? 'rocket_first' : 'rocket_land_first')); return; }
  if (state.rocket.riding && state.scene !== 'sky') return;
  if (confirm && canPaintSurface(state.position, surface)) paintSurface(id);
  else {
    state.paintTarget = id;
    if (canPaintSurface(state.position, surface)) updateNear(); else navigateTo(surface.walk.x, surface.walk.y);
  }
}
function openPainting() {
  if (state.scene !== 'wardrobe') return;
  stopWalking(); clearPaintPreview(); state.pictureTouch = true;
  state.studio = { color: null, page: 0, returnPosition: { ...state.position } };
  state.scene = 'painting'; state.position = { x: 1260, y: 245 };
  renderScene(); game.focus({ preventScroll: true }); announce(text('studio_keys'));
}
function closePainting() {
  if (state.scene !== 'painting') return;
  stopWalking(); clearPaintPreview(); state.position = { ...state.studio.returnPosition };
  state.studio = null; state.scene = 'wardrobe'; state.pictureTouch = true;
  renderScene(); game.focus({ preventScroll: true });
}
function studioAction(near) {
  stopWalking(); clearPaintPreview();
  if (near?.kind === 'studio-color') state.studio.color = near.id;
  else if (near?.kind === 'studio-control') {
    if (near.id === 'close') { closePainting(); return; }
    if (near.id === 'next') state.studio.page = (state.studio.page + 1) % studioPages(PALETTE);
    if (near.id === 'reset') { state.paint = {}; storage.set(paintStorageKey, '{}'); }
  } else if (near?.kind === 'studio-paint') {
    const color = PALETTE.find(c => c.id === state.studio.color);
    if (!color) { announce(text('studio_choose')); return; }
    state.paint[near.id] = color.color; storage.set(paintStorageKey, JSON.stringify(state.paint));
    announce(text('paint_done', { flaeche: text(near.key), farbe: color.name }));
  } else return;
  renderScene(); game.focus({ preventScroll: true });
}
function checkPictureTouch() {
  if (state.scene !== 'wardrobe') return;
  const touching = touchingHomePicture(state.position);
  if (touching && !state.pictureTouch) openPainting();
  else if (!touching) state.pictureTouch = false;
}
function performInteraction() {
  const near = currentInteraction();
  if (!near) return;
  if (state.scene === 'painting') { studioAction(near); return; }
  stopWalking();
  if (near.kind === 'take-chocolate') { if (takeChocolate(state.chocolate)) { renderScene(); announce(text('choco_taken')); } return; }
  if (near.kind === 'friends-camp') { inviteFriends(); return; }
  if (near.kind === 'enter-room') { enterRoom(near.id); return; }
  if (near.kind === 'eat-chocolate') { if (eatChocolate(state.chocolate)) { startChocolateMusic(); renderScene(); toast(text('choco_eaten')); announce(text('choco_eaten')); } return; }
  if (near.kind === 'find-hat') {
    if (findHat(state.hat, state.scene, state.position, state.hatActive)) { saveHat(); renderScene(); toast(text('hat_found')); announce(text('hat_found')); }
    return;
  }
  if (near.kind === 'paint-hat') {
    const color = bucketColors(PALETTE).find(color => color.id === state.paintCan);
    if (color && paintHat(state.hat, color.color)) { saveHat(); renderScene(); announce(text('hat_painted', { farbe: color.name })); }
    return;
  }
  if (near.kind === 'wear-hat' || near.kind === 'return-hat') {
    if (toggleHat(state.hat)) { saveHat(); renderScene(); announce(text(state.hat.wearing ? 'hat_worn' : 'hat_returned')); }
    return;
  }
  if (near.kind === 'rocket-damaged') { toast(text('rocket_needs_tools')); return; }
  if (near.kind === 'rocket-repair') { stopWalking(); state.toolbox = false; state.rocket.broken = true; state.rocket.repair = 0; renderScene(); return; }
  if (near.kind === 'take-toolbox' || near.kind === 'return-toolbox') { state.toolbox = near.kind === 'take-toolbox'; renderScene(); announce(text(state.toolbox ? 'toolbox_taken' : 'toolbox_returned')); return; }
  if (near.kind === 'rocket-board') { boardRocket(); return; }
  if (near.kind === 'rocket-exit') { exitRocket(); return; }
  if (near.kind === 'paint') { paintSurface(near.id); return; }
  if (near.kind === 'painting') { openPainting(); return; }
  if (near.kind === 'take-paint' || near.kind === 'return-paint') {
    state.paintCan = near.kind === 'take-paint' ? near.id : null; state.paintTarget = null; renderScene();
    announce(text(state.paintCan ? 'paint_taken' : 'paint_returned', { farbe: near.name })); return;
  }
  if (near.kind === 'paint-page') { state.paintPage = (state.paintPage + 1) % paintPages(PALETTE); renderScene(); return; }
  if (near.kind === 'shelf') { state.shelfPage = (state.shelfPage + 1) % tapePages(state.tapes); renderScene(); toast(text('shelf_changed', { seite: state.shelfPage + 1, anzahl: tapePages(state.tapes) })); return; }
  if (['external', 'email'].includes(near.kind)) { openSocial(near.id); return; }
  if (near.kind === 'enter') { enterRoom(near.id); return; }
  if (near.kind === 'exit') { leaveRoom(); return; }
  if (near.kind === 'read') { showPanel(near.id); return; }
  if (near.kind === 'change-character') {
    chooseAnimal(near.id); storage.set('animal', state.animal); game.focus({ preventScroll: true });
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
  const path = state.scene === 'painting' ? [{ x: clamp(x, 30, 1570), y: clamp(y, 110, 1055) }] : state.rocket.riding ? [{ x: clamp(x, WORLD.left + 65, WORLD.right - 65), y: clamp(y, SPACE.top + 160, 1040) }] : planPath(state.position, { x, y }, state.scene, state.rocket.position);
  if (!path.length) { toast(text('walk_blocked')); return; }
  state.path = path; state.destination = destination; stuckTime = 0;
  marker.removeAttribute('hidden'); marker.setAttribute('transform', `translate(${x} ${y})`); game.focus({ preventScroll: true });
}
function goToStation(id) {
  if (state.race) { showPanel('bike-pause'); return; }
  if (state.scene === 'chocolate') { requestChocolateExit(); return; }
  const station = STATIONS.find(s => s.id === id); if (!station) return;
  if (state.rocket.riding) { closePanel(); toast(text('rocket_land_first')); return; }
  const s = id === 'rocket' ? { ...station, ...state.rocket.position } : station;
  if (!state.started) beginWorld(false);
  if (state.scene !== 'world') leaveRoom(); else closePanel();
  navigateTo(s.x, s.y, BAND.some(member => member.id === id) ? { kind: 'station', id } : null); announce(text('walk_target', { ziel: s.label }));
}
function goToTape(id) {
  if (state.race) { showPanel('bike-pause'); return; }
  if (friendsBlockBuildings(state.friends)) return;
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
  const action = btn.dataset.action;
  if (state.landing) return;
  if (btn.dataset.difficulty && state.adventure && ['ready', 'won'].includes(state.adventure.phase) && Object.hasOwn(DIFFICULTIES, btn.dataset.difficulty)) {
    state.difficulty = btn.dataset.difficulty; state.adventure.nextDifficulty = state.difficulty; storage.set('adventure-difficulty', state.difficulty);
    playAdventure(); return;
  }
  if (btn.dataset.bikeLevel) { launchBicycleRace(btn.dataset.bikeLevel); return; }
  if (action === 'bike-levels' && state.race?.phase === 'finished') {
    state.race = createBikeRace(state.animal, ANIMALS); renderScene(); showPanel('bike-launch'); return;
  }
  if (action === 'bike-exit') { exitBicycleRace(); return; }
  if (action === 'bike-continue') { closePanel(); return; }
  if (action === 'bike-again') { launchBicycleRace(); return; }
  if (action === 'bike-save') { saveBicycleResult(); return; }
  if (action === 'space-continue') { closePanel(); return; }
  if (action === 'space-land') { landFromAdventure(); return; }
  if (btn.dataset.open) { visit(btn.dataset.open); return; }
  if (btn.dataset.character) { chooseAnimal(btn.dataset.character); return; }
  if (btn.dataset.member) { showPanel(btn.dataset.member, `[data-member="${btn.dataset.member}"]`); return; }
  if (btn.dataset.melody) { playMemberMelody(btn.dataset.melody); return; }
  if (btn.dataset.track) { goToTape(btn.dataset.track); return; }
  if (btn.dataset.goto) { goToStation(btn.dataset.goto); return; }
  if (action === 'put-paint') { putPaintDown(); return; }
  if (action === 'close') closePanel();
  if (action === 'leave') leaveRoom();
  if (action === 'exit-walk') { if (state.race) exitBicycleRace(); else if (state.scene === 'chocolate') requestChocolateExit(); else if (state.scene === 'painting') closePainting(); else if (state.rocket.riding) returnToGround(); else navigateTo(EXIT.x, 1020, { kind: 'exit' }); }
  if (action === 'start') beginWorld();
  if (action === 'start-radio') { beginWorld(false); enterRoom('radio'); }
  if (action === 'world') { if (state.scene !== 'world') leaveRoom(); else { closePanel(); if (!state.started) showPanel('characters'); else game.focus(); } }
  if (action === 'radio-info') showPanel('radio-info');
  if (action === 'play') { if (state.playing) audio.pause(); else audio.play().catch(() => toast(text('audio_play_error'))); }
});
function chooseAnimal(id) {
  if (state.race) return;
  if (!ANIMALS.some(animal => animal.id === id)) return;
  if (state.scene === 'wardrobe' && (awayAnimals().includes(id) || state.homeReturns.some(animal => animal.id === id))) return;
  const previous = state.animal;
  const destination = state.scene === 'wardrobe' ? undefined : outsideScene(state.scene) ? HOUSE_DOORS.find(door => door.id === 'wardrobe') : EXIT;
  if (id !== previous && returnHat(state.hat, state.scene, hatOrigin(), destination)) { saveHat(); announce(text('hat_returning')); }
  swapReceptionPilot(state.reception, previous, id, state.position, state.scene);
  swapFriendsPlayer(state.friends, previous, id);
  if (state.scene === 'wardrobe' && id !== previous) {
    const nextSpot = ANIMAL_SPOTS.find(spot => spot.id === id), oldSpot = ANIMAL_SPOTS.find(spot => spot.id === previous);
    const position = { ...state.position }, path = planPath(position, oldSpot, 'wardrobe');
    state.homeReturns = state.homeReturns.filter(animal => animal.id !== previous);
    if (Math.hypot(position.x - oldSpot.x, position.y - oldSpot.y) > 3 && path.length) state.homeReturns.push({ id: previous, position, path });
    stopWalking(); state.position = { x: nextSpot.x, y: nextSpot.y };
  }
  state.animal = id; state.facing = 'front'; updateAnimal(); refreshHatEffects();
  if (state.scene === 'wardrobe' && id !== previous) renderScene();
  modalContent.querySelectorAll('[data-character]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.character === id)));
}
function tickHomeReturns(dt) {
  let arrived = false;
  state.homeReturns = state.homeReturns.filter(animal => {
    while (animal.path.length && Math.hypot(animal.path[0].x - animal.position.x, animal.path[0].y - animal.position.y) < 3) animal.path.shift();
    const target = animal.path[0];
    if (!target) { arrived = true; return false; }
    const dx = target.x - animal.position.x, dy = target.y - animal.position.y;
    const previous = animal.position; animal.position = move(animal.position, dx, dy, Math.min(dt, Math.hypot(dx, dy) / WORLD.speed), 'wardrobe'); animal.facing = movementFacing(previous, animal.position, animal.facing);
    if (state.scene === 'wardrobe') {
      const node = $(`#home-animal-${animal.id}`);
      node?.setAttribute('transform', `translate(${animal.position.x.toFixed(2)} ${animal.position.y.toFixed(2)})`);
      node?.querySelector('use')?.setAttribute('href', animalHref(animal.id, false, animal.facing));
    }
    return true;
  });
  if (arrived && state.scene === 'wardrobe') renderScene();
}
modalContent.addEventListener('keydown', e => {
  if (e.target.id === 'bike-racer-name') { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (!e.repeat) saveBicycleResult(); } return; }
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
  if (id === 'bike-door') { if (state.scene === 'radio' && state.bikeDoor) navigateTo(BIKE_DOOR.x, BIKE_DOOR.y); return; }
  if (id === 'choco-door') { if (state.scene === 'radio' && state.chocolate.active) navigateTo(CHOCOLATE_DOOR.x, CHOCOLATE_DOOR.y); return; }
  if (id === 'chocolate-exit') { requestChocolateExit(); return; }
  if (id === 'chocolate-drawer') { if (state.scene !== 'wardrobe' || !state.chocolate.unlocked) return; if (currentInteraction()?.kind === 'take-chocolate') performInteraction(); else navigateTo(CHOCOLATE_DRAWER.x, CHOCOLATE_DRAWER.y); return; }
  if (id === 'toolbox') { if (state.scene !== 'wardrobe') return; if (currentInteraction()?.id === id) performInteraction(); else navigateTo(TOOLBOX_SPOT.x, TOOLBOX_SPOT.y); return; }
  if (id === 'painting') { if (currentInteraction()?.kind === 'painting') openPainting(); else navigateTo(PICTURE_SPOT.x, PICTURE_SPOT.y); return; }
  if (id.startsWith('paint:') || id === 'paint-next') {
    if (state.scene !== 'wardrobe') return;
    const target = id === 'paint-next' ? PAINT_NEXT : paintSlots(PALETTE, state.paintPage).find(color => color.id === id.slice(6));
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
    const spot = ANIMAL_SPOTS.find(spot => spot.id === id.slice(7)); if (!spot || spot.id === state.animal || state.homeReturns.some(animal => animal.id === spot.id)) return;
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
function activateHatTarget(id, walkOnly = false) {
  const spot = id === 'hat-stand' && state.hat.phase === 'unlocked' ? HAT_STAND : id === 'lost-hat' && state.hat.phase === 'lost' && state.hatActive ? hatSpot(state.hat) : null;
  if (!spot || spot.scene !== state.scene) return;
  if (!walkOnly && currentInteraction()?.id === id) performInteraction();
  else navigateTo(spot.x, spot.y);
}
game.addEventListener('click', e => {
  if (modal.open || !state.started || state.race || state.adventure || state.landing) return;
  if (state.scene === 'painting') {
    const matrix = world.getScreenCTM(); if (!matrix) return;
    const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
    state.path = [{ x: clamp(point.x, 30, 1570), y: clamp(point.y, 110, 1055) }]; game.focus({ preventScroll: true }); return;
  }
  if (state.paintCan && outsideScene(state.scene)) { state.paintTarget = null; walkToPointer(e); return; }
  const tent = e.target.closest('[data-friends-tent]');
  if (tent && state.scene === 'world') { navigateTo(FRIEND_TENT.x, FRIEND_TENT.y - 75); return; }
  const hat = e.target.closest('[data-hat-target]');
  if (hat) { activateHatTarget(hat.dataset.hatTarget, true); return; }
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
  if (state.race || state.adventure || state.landing) return;
  if (!isActionKey(e)) return;
  if (state.scene === 'painting') {
    const color = e.target.closest('[data-studio-color]'), control = e.target.closest('[data-studio-control]');
    const point = color ? studioColors(PALETTE, state.studio.page).find(c => c.id === color.dataset.studioColor) : control ? STUDIO_CONTROLS[control.dataset.studioControl] : null;
    if (point) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) { state.position = { x: point.x, y: point.y }; studioAction(currentInteraction()); } }
    return;
  }
  const tent = e.target.closest('[data-friends-tent]');
  if (tent && state.scene === 'world') { e.preventDefault(); e.stopPropagation(); if (!e.repeat) { if (currentInteraction()?.kind === 'friends-camp') inviteFriends(); else navigateTo(FRIEND_TENT.x, FRIEND_TENT.y - 75); } return; }
  const hat = e.target.closest('[data-hat-target]');
  if (hat) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) activateHatTarget(hat.dataset.hatTarget); return; }
  const surface = e.target.closest('[data-paint-target]');
  if (state.paintCan && outsideScene(state.scene) && surface) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) activatePaintSurface(surface.dataset.paintTarget); return; }
  const social = e.target.closest('[data-social]');
  if (social) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) activateSocial(social.dataset.social); return; }
  const station = e.target.closest('[data-station]'), prop = e.target.closest('[data-room-target]');
  if (!station && !prop) return;
  e.preventDefault(); e.stopPropagation(); if (e.repeat) return;
  if (station) {
    const near = currentInteraction();
    if (['read', 'rocket-board', 'rocket-repair', 'rocket-damaged'].includes(near?.kind) && near.id === station.dataset.station) performInteraction();
    else goToStation(station.dataset.station);
  } else activateRoomTarget(prop.dataset.roomTarget);
});
const directions = new Map([['ArrowUp', [0, -1]], ['KeyW', [0, -1]], ['ArrowDown', [0, 1]], ['KeyS', [0, 1]], ['ArrowLeft', [-1, 0]], ['KeyA', [-1, 0]], ['ArrowRight', [1, 0]], ['KeyD', [1, 0]]]);
window.addEventListener('keydown', e => {
  if (modal.open || !state.started || state.landing) return;
  if (state.race) {
    if (e.key === 'Escape') { e.preventDefault(); if (!e.repeat) showPanel('bike-pause'); return; }
    if (directions.has(e.code) && (document.activeElement === game || game.contains(document.activeElement))) {
      e.preventDefault(); const [dx, dy] = directions.get(e.code);
      if (dy && !e.repeat) changeBikeLane(state.race, dy); else if (dx) state.keys.add(e.code);
    } else if (e.key.startsWith('Arrow') || isActionKey(e)) e.preventDefault();
    return;
  }
  if (state.adventure && e.key === 'Escape') { e.preventDefault(); if (!e.repeat) { if (['intro', 'sun-finale'].includes(state.adventure.phase)) landFromAdventure(); else showPanel(state.adventure.phase === 'playing' ? 'space-pause' : state.adventure.phase === 'won' ? 'space-win' : 'space-launch'); } return; }
  if (state.scene === 'painting' && e.key === 'Escape') { e.preventDefault(); if (!e.repeat) closePainting(); return; }
  if (e.key === 'Escape') { e.preventDefault(); if (!e.repeat) { if (state.scene === 'chocolate') requestChocolateExit(); else if (state.paintCan) putPaintDown(); else outsideScene(state.scene) ? showPanel('pause') : leaveRoom(); } return; }
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
document.addEventListener('visibilitychange', () => { if (document.hidden) clearInput(); refreshDanceParty(); });
const padVectors = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
$('#dpad').querySelectorAll('button').forEach(btn => {
  btn.addEventListener('pointerdown', e => {
    if (!state.started || modal.open || state.landing) return;
    e.preventDefault(); btn.setPointerCapture(e.pointerId); if (state.race && ['up', 'down'].includes(btn.dataset.direction)) changeBikeLane(state.race, btn.dataset.direction === 'up' ? -1 : 1); state.paintTarget = null; state.pad.set(e.pointerId, btn.dataset.direction); btn.classList.add('pressed'); state.path = []; state.destination = null; marker.setAttribute('hidden', ''); game.focus({ preventScroll: true });
  });
  const release = e => { state.pad.delete(e.pointerId); btn.classList.remove('pressed'); };
  btn.addEventListener('pointerup', release); btn.addEventListener('pointercancel', release); btn.addEventListener('lostpointercapture', release);
  btn.addEventListener('click', e => { if (e.detail === 0 && state.started && !modal.open && !state.landing) { const [dx, dy] = padVectors[btn.dataset.direction]; if (state.race?.phase === 'racing') { if (dy) changeBikeLane(state.race, dy); else frameBicycleRace(.05, { right: dx > 0, left: dx < 0 }); } else if (state.adventure?.phase === 'playing') { const event = tickAdventure(state.adventure, .05, dx, dy); updateAdventure(); finishAdventureTick(event); } else if (!state.adventure && !state.race) navigateTo(state.position.x + dx * 28, state.position.y + dy * 28); } });
});
$('#interact').addEventListener('click', () => { if (!['paint', 'paint-hat'].includes(currentInteraction()?.kind)) performInteraction(); });
function updateNear(force = false) {
  const near = currentInteraction();
  refreshPaintPreview(near);
  if (!force && near?.kind === state.near?.kind && near?.id === state.near?.id && near?.slot === state.near?.slot) return;
  state.near = near; const btn = $('#interact'); btn.hidden = !near || ['paint', 'paint-hat'].includes(near.kind) || state.scene === 'painting';
  if (['paint', 'paint-hat'].includes(near?.kind)) btn.innerHTML = '';
  else if (near) {
    const label = near.label;
    btn.innerHTML = `<kbd aria-hidden="true">↵ / ␣</kbd>${escape(label)}`; announce(text('action_hint', { aktion: label }));
  }
}
function resize() {
  const r = game.getBoundingClientRect(); if (!r.width || !r.height) return;
  if (state.race) { world.setAttribute('viewBox', `0 0 ${BIKE_WIDTH} ${BIKE_HEIGHT}`); return; }
  if (state.adventure) {
    if (state.adventure.width !== r.width || state.adventure.height !== r.height) { resizeAdventure(state.adventure, r.width, r.height); renderScene(); }
    world.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`); return;
  }
  const roomCamera = ROOMS[state.scene]?.camera;
  if (roomCamera) { const aspect = r.width / r.height, w = Math.max(roomCamera.w, roomCamera.h * aspect); state.viewport = { w, h: w / aspect }; updateCamera(1, true); return; }
  if (state.scene === 'painting') { state.viewport = { w: 1600, h: 1100 }; world.setAttribute('viewBox', '0 0 1600 1100'); return; }
  if (state.scene === 'space') {
    const w = Math.min(r.width, WORLD.width);
    state.viewport = { w, h: w * r.height / r.width }; updateCamera(1, true); return;
  }
  let w = clamp(r.width * 1.24, 600, 1520), h = w / (r.width / r.height);
  if (h > 1050) { h = 1050; w = h * r.width / r.height; }
  state.viewport = { w, h }; updateCamera(1, true);
}
function updateCamera(dt, snap = false) {
  if (state.scene === 'painting' || state.adventure || state.race) return;
  const roomCamera = ROOMS[state.scene]?.camera;
  if (roomCamera) {
    const { w, h } = state.viewport; state.camera.x = roomCamera.x; state.camera.y = roomCamera.y;
    const viewBox = [roomCamera.x - w / 2, roomCamera.y - h / 2, w, h].map(value => value.toFixed(2)).join(' ');
    if (world.getAttribute('viewBox') !== viewBox) world.setAttribute('viewBox', viewBox);
    return;
  }
  const group = state.scene === 'world' && !state.rocket.riding ? friendsCameraView(state.friends, state.position, state.viewport) : null;
  if (group) {
    state.camera.x = group.x + group.w / 2; state.camera.y = group.y + group.h / 2;
    const viewBox = [group.x, group.y, group.w, group.h].map(value => value.toFixed(2)).join(' ');
    if (world.getAttribute('viewBox') !== viewBox) world.setAttribute('viewBox', viewBox);
    return;
  }
  const { w, h } = state.viewport;
  const outside = outsideScene(state.scene), top = outside ? WORLD.top : 0, bounds = sceneHorizontalBounds(state.scene);
  const bottom = WORLD.height - h + (outside ? h / 2 : 0);
  const tx = clamp(state.position.x, bounds.left + w / 2, bounds.right - w / 2), ty = clamp(state.position.y - (outside ? WORLD.cameraOffsetY : 130), top + h / 2, bottom + h / 2);
  const amount = snap || state.reduced ? 1 : Math.min(1, dt * 9);
  state.camera.x += (tx - state.camera.x) * amount; state.camera.y += (ty - state.camera.y) * amount;
  const viewBox = `${clamp(state.camera.x - w / 2, bounds.left, bounds.right - w).toFixed(2)} ${clamp(state.camera.y - h / 2, top, bottom).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`;
  if (world.getAttribute('viewBox') !== viewBox) world.setAttribute('viewBox', viewBox);
}
function tickRocketRepair(dt) {
  if (state.rocket.repair == null) return;
  state.rocket.repair = Math.min(ROCKET_REPAIR_SECONDS, state.rocket.repair + dt);
  if (outsideScene(state.scene)) {
    for (const piece of rocketRepairTransforms(state.rocket.repair)) $('#rocket-debris-' + piece.id)?.setAttribute('transform', piece.transform);
    const opacity = rocketRepairOpacity(state.rocket.repair);
    $('#rocket-repaired')?.setAttribute('opacity', opacity.toFixed(3));
    $('#rocket-wreckage')?.setAttribute('opacity', (1 - opacity).toFixed(3));
  }
  if (state.rocket.repair >= ROCKET_REPAIR_SECONDS) {
    state.rocket.repair = null; state.rocket.damaged = false; state.rocket.broken = false; state.rocket.impact = null; state.rocket.angle = 0;
    storage.set(rocketStorageKey, '0'); if (outsideScene(state.scene)) renderScene();
    announce(text('rocket_repaired'));
  }
}

function frame(time) {
  const elapsed = Math.max(0, (time - (lastTime || time)) / 1000), dt = Math.min(.05, elapsed); lastTime = time;
  tickChocolate(state.chocolate, elapsed); tickCampMusic(elapsed);
  if (!state.chocolate.boost && state.boostMusic) finishChocolateMusic();
  refreshAudioVolume(); refreshChocolateItems();
  if (state.started && !document.hidden && !modal.open) tickRocketRepair(dt);
  if (state.started && !document.hidden) {
    if (!modal.open && state.homeReturns.length) tickHomeReturns(dt);
    if (!modal.open) { tickHats(dt); updateReception(dt); updateFriends(dt); }
    const departing = state.party.departing;
    tickParty(state.party, dt, state.playing, state.reduced);
    updateDanceGuests();
    if (departing && !state.party.departing) refreshDanceParty();
  }
  if (state.race) {
    if (!modal.open && !document.hidden) {
      const input = { right: state.keys.has('ArrowRight') || state.keys.has('KeyD') || [...state.pad.values()].includes('right'), left: state.keys.has('ArrowLeft') || state.keys.has('KeyA') || [...state.pad.values()].includes('left') };
      frameBicycleRace(elapsed, input);
    }
    requestAnimationFrame(frame); return;
  }
  if (frameFriendsExit(dt)) { requestAnimationFrame(frame); return; }
  if (state.scene === 'chocolate') { frameChocolate(dt); requestAnimationFrame(frame); return; }
  if (state.rocket.broken && state.rocket.repair == null && state.rocket.impact !== null && state.rocket.impact < .8 && !document.hidden) {
    state.rocket.impact += dt;
    for (const piece of wreckageTransforms(state.rocket.impact)) $(`#rocket-debris-${piece.id}`)?.setAttribute('transform', piece.transform);
  }
  if (state.adventure) {
    if (!modal.open && !document.hidden) {
      let dx = 0, dy = 0;
      for (const code of state.keys) { const v = directions.get(code); if (v) { dx += v[0]; dy += v[1]; } }
      for (const direction of state.pad.values()) { const v = padVectors[direction]; dx += v[0]; dy += v[1]; }
      const event = tickAdventure(state.adventure, dt, dx, dy);
      updateAdventure();
      finishAdventureTick(event);
    }
    requestAnimationFrame(frame); return;
  }
  if (state.landing) {
    if (!document.hidden) {
      state.landing.elapsed += dt;
      const pose = landingPose(state.landing.from, state.landing.elapsed);
      state.position = { x: pose.x, y: pose.y }; state.rocket.position = { ...state.position };
      const scene = flightScene(pose.y);
      if (scene !== state.scene) { state.scene = scene; renderScene(); }
      $('#rocket')?.setAttribute('transform', `translate(${pose.x.toFixed(2)} ${pose.y.toFixed(2)})`);
      if (state.landing.crashed) $('#rocket-vibration')?.setAttribute('transform', crashVibration(state.landing.elapsed, state.reduced));
      updateCamera(dt);
      if (pose.done) {
        const crashed = state.landing.crashed, success = state.landing.success; state.landing = null;
        if (crashed) { state.rocket.broken = true; state.rocket.impact = state.reduced ? .8 : 0; }
        landRocket(); if (!success) exitRocket();
        if (success) { landReception(state.reception); refreshReceptionEffects(); toast(text('reception_cheer')); announce(text('reception_cheer')); }
        if (crashed) { toast(text('rocket_wrecked')); announce(text('rocket_wrecked')); }
      }
    }
    requestAnimationFrame(frame); return;
  }
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
      const old = state.position, stepTime = state.path.length ? Math.min(dt, Math.hypot(dx, dy) / (state.scene === 'painting' ? 400 : state.rocket.riding ? ROCKET_SPEED : WORLD.speed * chocolateSpeed(state.chocolate))) : dt;
      if (state.rocket.riding) {
        if (!state.rocket.airborne && dy < 0) { state.rocket.airborne = true; renderScene(); announce(text('rocket_flying')); }
        if (state.rocket.airborne) {
          state.position = moveRocket(old, dx, dy, stepTime); state.rocket.position = { ...state.position };
          let scene = flightScene(state.position.y);
          if (scene === 'space') {
            if (spaceViewIsDark(state.camera, state.viewport)) { enterSpaceAdventure(); requestAnimationFrame(frame); return; }
            scene = 'sky';
          }
          if (scene !== state.scene) {
            state.scene = scene; state.paintTarget = null;
            renderScene();
          }
          if (dy > 0 && canLandRocket(state.position)) {
            landRocket();
          }
        }
      } else if (state.scene === 'painting') { const length = Math.hypot(dx, dy); state.position = { x: clamp(old.x + dx / length * 400 * stepTime, 30, 1570), y: clamp(old.y + dy / length * 400 * stepTime, 110, 1055) }; }
      else state.position = move(old, dx, dy, stepTime, state.scene, state.rocket.position, chocolateSpeed(state.chocolate));
      faceMovement(old, state.position);
      walking = Math.hypot(state.position.x - old.x, state.position.y - old.y) > .05;
      if (state.path.length) {
        stuckTime = walking ? 0 : stuckTime + dt;
        if (stuckTime > .8) { state.path = []; state.destination = null; marker.setAttribute('hidden', ''); toast(text('walk_stuck')); }
      }
    }
    if (throughExit(state.scene, state.position)) leaveRoom();
    checkWorldTouch();
    checkPictureTouch();
    if (state.scene === 'radio' && state.chocolate.active && touchingChocolateDoor(state.position)) enterChocolateMaze();
    if (state.scene === 'radio' && state.bikeDoor && touchingBikeDoor(state.position)) { enterBicycleRace(); requestAnimationFrame(frame); return; }
    updateNear(); updateCamera(dt);
  }
  player.classList.toggle('is-moving', walking); player.setAttribute('transform', `translate(${state.position.x.toFixed(2)} ${state.position.y.toFixed(2)})`);
  refreshChocolateItems();
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
