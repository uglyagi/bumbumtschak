import test from 'node:test';
import assert from 'node:assert/strict';
import { HAT_HIDEOUTS, HAT_STAND, HAT_WEAR_SECONDS, HAT_FLIGHT_SECONDS, HAT_RETURN_SECONDS, createHatQuest, savedHatQuest, startHatQuest, tickHatQuest, wearsHat, hatSpot, hatInteraction, findHat, toggleHat, paintHat, hatMarkup, colorHatMarkup, returnHat, hatReturnPose, hatEffectsMarkup, isHatTrack } from '../hat-quest.js';
import { canStand, planPath, WORLD_SPAWN } from '../game-core.js';
import { ROOM_SPAWN } from '../rooms.js';
import { ANIMALS } from '../content.js';
import { animalSymbols } from '../cover-art.js';
import { worldMarkup } from '../art.js';
import { roomMarkup } from '../room-art.js';
import { adventureMarkup } from '../adventure-art.js';
import { createAdventure, startAdventure, tickAdventure, FINISH_DISTANCE, SUN_TRANSITION_DURATION, SUN_STORY_START } from '../rocket-adventure.js';
import { bucketColors } from '../painting.js';

test('only playing Hut starts the quest; wind removes the worn hat and hides it', () => {
  assert(isHatTrack({ id: 'hut', title: 'Unser Lied' })); assert(isHatTrack({ id: 'new', title: ' HUT ' })); assert(!isHatTrack(null));
  const q = createHatQuest();
  assert(!startHatQuest(q, { id: 'hut' }, false)); assert(!startHatQuest(q, { id: 'tanzen' }, true));
  assert(startHatQuest(q, { id: 'hut' }, true, () => .5)); assert(wearsHat(q));
  assert(!startHatQuest(q, { id: 'hut' }, true, () => 0), 'replaying cannot restart a pending search');
  const origin = { x: 700, y: 600 };
  for (let i = 0; i < 200 && q.phase === 'perched'; i++) tickHatQuest(q, .05, 'radio', origin);
  assert.equal(q.phase, 'flying'); assert(!wearsHat(q)); assert.equal(q.flight.scene, 'radio');
  assert(hatEffectsMarkup(q, 'radio').includes('id="flying-hat"'));
  const resumed = createHatQuest(savedHatQuest(q)); assert.equal(resumed.phase, 'lost'); assert.equal(resumed.spot, q.spot, 'reloading during flight retains a recoverable destination');
  for (let i = 0; i < 100 && q.phase === 'flying'; i++) tickHatQuest(q, .05, 'radio', origin);
  assert.equal(q.phase, 'lost'); assert(hatSpot(q)); assert.equal(q.flight, null);
  assert(HAT_WEAR_SECONDS >= 3 && HAT_FLIGHT_SECONDS >= 1);
});

test('a fresh Hut playback puts a found hat back on, removes wardrobe access and starts another search', () => {
  for (const wearing of [false, true]) {
    const q = createHatQuest({ phase: 'unlocked', wearing, spot: 'flowers' });
    assert(q.discovered);
    assert(!startHatQuest(q, { id: 'hut' }, true, () => 0), 'resuming the current playback keeps the found hat');
    assert(!startHatQuest(q, { id: 'hut' }, false, () => 0, true));
    assert(startHatQuest(q, { id: 'hut' }, true, () => 0, true));
    assert.equal(q.phase, 'perched'); assert(wearsHat(q)); assert(!q.wearing); assert(q.discovered);
    assert.notEqual(q.spot, 'flowers'); assert.equal(hatInteraction(q, 'wardrobe', HAT_STAND), null);
    const room = roomMarkup('wardrobe', 0, undefined, 'cat', { hat: q });
    const rack = room.slice(room.indexOf('id="home-hat-stand"'), room.indexOf('data-home-slot='));
    assert(rack); assert(!rack.includes('scale(.8)')); assert(!rack.includes('data-hat-target='));
    const reload = createHatQuest(savedHatQuest(q)); assert(reload.discovered); assert.equal(reload.phase, 'perched');
    while (q.phase !== 'lost') tickHatQuest(q, .05, 'radio', { x: 800, y: 700 });
    assert(!toggleHat(q)); assert(findHat(q, hatSpot(q).scene, hatSpot(q)));
    assert(wearsHat(q)); assert.equal(hatInteraction(q, 'wardrobe', HAT_STAND).kind, 'return-hat');
  }
});

test('every small hiding spot is reachable outdoors, inside a house or by rocket in the sky, never in space', () => {
  assert.equal(new Set(HAT_HIDEOUTS.map(spot => spot.id)).size, HAT_HIDEOUTS.length);
  assert(HAT_HIDEOUTS.some(spot => spot.scene === 'world')); assert(HAT_HIDEOUTS.some(spot => spot.scene === 'sky'));
  for (const scene of ['concerts', 'wardrobe']) assert(HAT_HIDEOUTS.some(spot => spot.scene === scene));
  assert(!HAT_HIDEOUTS.some(spot => spot.scene === 'radio'), 'the music house is never a hiding place');
  for (const spot of HAT_HIDEOUTS) {
    assert.notEqual(spot.scene, 'space'); assert(canStand(spot.x, spot.y, undefined, spot.scene), spot.id);
    if (spot.scene !== 'sky') assert(planPath(spot.scene === 'world' ? WORLD_SPAWN : ROOM_SPAWN, spot, spot.scene).length, spot.id);
    const q = createHatQuest({ phase: 'lost', spot: spot.id }), svg = hatEffectsMarkup(q, spot.scene);
    assert(svg.includes('scale(.38)')); assert(!svg.includes('<text')); assert(!svg.includes('sparkle'));
    assert.equal(hatInteraction(q, spot.scene, spot).kind, 'find-hat');
    assert.equal(hatInteraction(q, spot.scene, { x: spot.x + 100, y: spot.y }), null);
    assert(!hatEffectsMarkup(q, 'space').includes('data-hat-target'));
  }
  assert(canStand(HAT_STAND.x, HAT_STAND.y, undefined, 'wardrobe'));
  assert(planPath(ROOM_SPAWN, HAT_STAND, 'wardrobe').length);
});

test('a pause or music change freezes the quest and removes the hidden hat until Hut resumes', () => {
  const q = createHatQuest(); startHatQuest(q, { id: 'hut' }, true, () => 0);
  tickHatQuest(q, .05, 'radio', { x: 700, y: 600 }); const elapsed = q.elapsed;
  for (let i = 0; i < 150; i++) tickHatQuest(q, .05, 'radio', { x: 700, y: 600 }, false);
  assert.equal(q.elapsed, elapsed); assert(!wearsHat(q, false));
  q.phase = 'lost'; const spot = hatSpot(q);
  assert.equal(hatInteraction(q, spot.scene, spot, false), null);
  assert(!findHat(q, spot.scene, spot, false)); assert.equal(hatEffectsMarkup(q, spot.scene, false, 'Aufheben', false), '');
  assert.equal(hatInteraction(q, spot.scene, spot, true).kind, 'find-hat'); assert(findHat(q, spot.scene, spot, true));
  assert.equal(q.phase, 'unlocked'); assert(q.celebration);
  assert(hatEffectsMarkup(q, spot.scene, false, 'Aufheben', false).includes('id="hat-fireworks"'));
  q.celebration.time = .8;
  const sparks = [...hatEffectsMarkup(q, spot.scene).matchAll(/transform="translate\(([^)]+)\) rotate/g)].map(match => match[1]);
  assert.equal(sparks.length, 36); assert(new Set(sparks).size > 30, 'the little fireworks spread in all directions');
});

test('finding unlocks a persistent wardrobe item that can be worn and returned independently of music', () => {
  const q = createHatQuest({ phase: 'lost', spot: HAT_HIDEOUTS[0].id }), spot = hatSpot(q);
  assert(!toggleHat(q)); assert(findHat(q, spot.scene, spot)); assert(wearsHat(q));
  assert(!startHatQuest(q, { id: 'hut' }, true));
  assert.equal(hatInteraction(q, 'wardrobe', HAT_STAND, false).kind, 'return-hat');
  assert(toggleHat(q)); assert(!wearsHat(q, false));
  assert(toggleHat(q)); assert(wearsHat(q, false));
  const reload = createHatQuest(savedHatQuest(q)); assert(wearsHat(reload, false)); assert.equal(reload.celebration, null);
  assert.equal(hatInteraction(reload, 'wardrobe', HAT_STAND, false).kind, 'return-hat');
  assert(toggleHat(reload)); assert(!wearsHat(reload));
  for (let i = 0; i < 100; i++) tickHatQuest(q, .05, spot.scene, spot, false);
  assert.equal(q.celebration, null); assert.equal(q.phase, 'unlocked');
  assert.equal(createHatQuest({ phase: 'lost', spot: 'space' }).phase, 'idle');
});

test('a worn hat flies back to its empty stand, remains unique and can then be worn again', () => {
  const q = createHatQuest({ phase: 'unlocked', wearing: true }), origin = { x: 390, y: 440 };
  assert(returnHat(q, 'wardrobe', origin)); assert(!wearsHat(q));
  assert.deepEqual(hatReturnPose(q), { ...origin, angle: 0, scale: .62, opacity: 1 });
  assert.equal(hatInteraction(q, 'wardrobe', HAT_STAND, false), null); assert(!toggleHat(q));
  assert(!returnHat(q, 'wardrobe', origin), 'a second switch cannot duplicate or restart the same flight');
  const rack = () => { const room = roomMarkup('wardrobe', 0, undefined, 'dog', { hat: q }); return room.slice(room.indexOf('id="home-hat-stand"'), room.indexOf('data-home-slot=')); };
  assert(!rack().includes('scale(.8)')); assert(!rack().includes('data-hat-target='));
  assert(hatEffectsMarkup(q, 'wardrobe', false, 'Aufheben', false).includes('id="returning-hat"'));
  assert(!hatEffectsMarkup(q, 'world').includes('id="returning-hat"'));
  const reloaded = createHatQuest(savedHatQuest(q)); assert(!reloaded.wearing); assert.equal(hatInteraction(reloaded, 'wardrobe', HAT_STAND).kind, 'wear-hat');
  q.returning.time = HAT_RETURN_SECONDS / 2;
  const middle = hatReturnPose(q); assert(middle.x > origin.x && middle.x < HAT_STAND.x); assert(middle.y < HAT_STAND.y - 43);
  const reduced = hatReturnPose(q, true); assert.equal(reduced.x, origin.x); assert.equal(reduced.y, origin.y); assert.equal(reduced.angle, 0); assert(reduced.opacity < 1);
  q.returning.time = HAT_RETURN_SECONDS;
  const end = hatReturnPose(q); assert.equal(end.x, HAT_STAND.x); assert(Math.abs(end.y - (HAT_STAND.y - 43)) < 1e-8);
  assert.equal(tickHatQuest(q, .01, 'world', origin, false), 'returned');
  assert.equal(q.returning, null); assert(!hatEffectsMarkup(q, 'wardrobe').includes('id="returning-hat"'));
  assert(rack().includes('scale(.8)')); assert.equal(hatInteraction(q, 'wardrobe', HAT_STAND, false).kind, 'wear-hat');
  assert(toggleHat(q)); assert(wearsHat(q));
  assert(!returnHat(createHatQuest(), 'wardrobe', origin));
});

test('old searches saved inside the music house resume outside and fresh searches exclude that house', () => {
  for (const spot of ['music-corner', 'music-left']) {
    for (const phase of ['perched', 'flying', 'lost']) {
      const q = createHatQuest({ phase, spot });
      assert.equal(q.phase, phase === 'flying' ? 'lost' : phase); assert.equal(hatSpot(q).scene, 'world');
      assert.equal(savedHatQuest(q).spot, 'meadow');
    }
  }
  for (let i = 0; i <= 100; i++) {
    const q = createHatQuest(); assert(startHatQuest(q, { id: 'hut' }, true, () => i / 100));
    assert.notEqual(hatSpot(q).scene, 'radio');
  }
});

test('only a hat resting on its stand can be painted, preserving outlines and its color through saving, wearing and another search', () => {
  const q = createHatQuest({ phase: 'unlocked', wearing: false });
  for (const color of bucketColors()) {
    assert(paintHat(q, color.color)); assert.equal(q.color, color.color); assert(!wearsHat(q));
    const svg = hatMarkup(q.color); assert(svg.includes(`data-hat-color="" fill="${color.color}"`)); assert(svg.includes('stroke="#101014"')); assert(svg.includes('fill="#fff20b"'));
    const room = roomMarkup('wardrobe', 0, undefined, 'cat', { hat: q });
    const rack = room.slice(room.indexOf('id="home-hat-stand"'), room.indexOf('data-home-slot=')); assert(rack.includes(`data-hat-color="" fill="${color.color}"`));
    const reload = createHatQuest(savedHatQuest(q)); assert.equal(reload.color, color.color);
    assert(toggleHat(reload)); assert(!paintHat(reload, '#123456')); assert.equal(reload.color, color.color);
    const worn = colorHatMarkup(animalSymbols(), reload.color); assert.equal((worn.match(new RegExp(`data-hat-color="" fill="${color.color}"`, 'g')) || []).length, 20);
    assert(returnHat(reload, 'wardrobe', { x: 390, y: 440 })); assert(!paintHat(reload, '#123456'));
    assert(hatEffectsMarkup(reload, 'wardrobe').includes(`data-hat-color="" fill="${color.color}"`));
    assert(startHatQuest(reload, { id: 'hut' }, true, () => 0, true)); assert.equal(reload.returning, null); assert.equal(reload.color, color.color);
    while (reload.phase !== 'lost') tickHatQuest(reload, .05, 'radio', { x: 800, y: 700 });
    assert(!paintHat(reload, '#123456')); assert(hatEffectsMarkup(reload, hatSpot(reload).scene).includes(`data-hat-color="" fill="${color.color}"`));
    assert(findHat(reload, hatSpot(reload).scene, hatSpot(reload))); assert(wearsHat(reload)); assert.equal(reload.color, color.color);
  }
  assert(!paintHat(q, 'url(https://example.com)')); assert(!paintHat(q, '#fff" onload="bad'));
  assert.equal(createHatQuest({ phase: 'unlocked', color: 'red' }).color, '#1d55ff');
});

test('the hat follows every animal into the rocket, space zoom and Sun holiday without dressing NPCs', () => {
  const symbols = animalSymbols();
  for (const animal of ANIMALS) {
    assert(symbols.includes(`id="dressed-${animal.id}"`));
    const world = worldMarkup({}, false, 'sky', { riding: true, airborne: true, hat: true }, animal.id);
    assert(world.includes(`id="rocket-pilot" href="#dressed-${animal.id}"`));
    const game = createAdventure(1200, 700);
    assert(adventureMarkup(game, animal.id, {}, true).includes(`id="rocket-pilot" href="#dressed-${animal.id}"`));
    startAdventure(game); game.progress = FINISH_DISTANCE; tickAdventure(game, 0); game.sunTime = SUN_TRANSITION_DURATION + 8 - SUN_STORY_START;
    const holiday = adventureMarkup(game, animal.id, {}, true);
    assert(holiday.includes(`<use href="#dressed-${animal.id}" x="-34" y="-77" width="68" height="82" id="sun-actor-use"`));
    assert(!roomMarkup('wardrobe', 0, undefined, animal.id, { hat: { phase: 'unlocked', wearing: true } }).includes('href="#dressed-'));
  }
});
