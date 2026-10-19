import test from 'node:test';
import assert from 'node:assert/strict';
import { largeSurfaces, CANVAS, studioSurfaceAt, studioInteraction, studioColors, STUDIO_CONTROLS, studioMarkup } from '../painting-studio.js';
import { landscapeMarkup } from '../art.js';
import { roomMarkup } from '../room-art.js';
import { ANIMALS, PALETTE } from '../content.js';
import { ANIMAL_SPOTS, PICTURE_SPOT, ROOM_SPAWN } from '../rooms.js';
import { canStand, planPath } from '../game-core.js';
export const inCanvas = point => ({ x: CANVAS.x + point.x * CANVAS.scale, y: CANVAS.y + (point.y + 380) * CANVAS.scale });

test('the brush can address every large color surface, while trees and flowers remain separate', () => {
  for (const surface of largeSurfaces) {
    const p = surface.bounds ? { x: surface.bounds.x + surface.bounds.w / 2, y: surface.bounds.y + surface.bounds.h / 2 } : surface.id === 'path' ? { x: 650, y: 475 } : surface.id === 'grass' ? { x: 1000, y: 700 } : { x: 900, y: -150 };
    assert.equal(studioSurfaceAt(inCanvas(p))?.id, surface.id, surface.id);
    assert.equal(studioInteraction(inCanvas(p), PALETTE)?.kind, 'studio-paint');
  }
  assert(largeSurfaces.every(surface => !/^(tree|flower)-/.test(surface.id)));
  assert.equal(studioSurfaceAt({ x: 15, y: 50 }), null);
  for (const color of studioColors(PALETTE)) assert.equal(studioInteraction(color, PALETTE).id, color.id);
  assert.equal(studioInteraction(STUDIO_CONTROLS.close, PALETTE).id, 'close');
});

test('the picture is the actual world, with isolated SVG references and identical black outlines after painting', () => {
  const original = landscapeMarkup({}, 'studio-landscape', 75, 115, 1024);
  const paint = Object.fromEntries(largeSurfaces.map(s => [s.id, '#ff3935']));
  const painted = landscapeMarkup(paint, 'studio-landscape', 75, 115, 1024);
  const black = svg => [...svg.matchAll(/<[^>]*\bstroke="#101014"[^>]*>/g)].map(match => match[0].replace(/data-paint-target="[^"]+"[^>]*?(?=stroke-width|\/?>)/, ''));
  assert.deepEqual(black(painted), black(original));
  assert(!original.includes('id="player"')); assert(!original.includes('id="rocket"'));
  for (const id of [...original.matchAll(/(?:href="#|url\(#)([^"\)]+)/g)].map(m => m[1])) assert(original.includes(`id="${id}"`), id);
  const room = roomMarkup('wardrobe', 0, undefined, 'cat', { world: paint });
  const ids = [...room.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'thumbnail definitions do not collide with the room or character symbols');
  assert(studioMarkup(paint, PALETTE, { color: 'blue', page: 0 }).includes('data-studio-control="close"'));
});

test('home animals match the player size, remain in the upper left and all new destinations are reachable', () => {
  const room = roomMarkup('wardrobe');
  for (const animal of ANIMALS) assert(room.includes(`<use href="#animal-${animal.id}" x="-34" y="-77" width="68" height="82"/>`));
  for (const point of [...ANIMAL_SPOTS, PICTURE_SPOT]) {
    assert(canStand(point.x, point.y, undefined, 'wardrobe')); assert(planPath(ROOM_SPAWN, point, 'wardrobe').length);
  }
  assert(ANIMAL_SPOTS.every(spot => spot.x < 600 && spot.y < 650));
  assert(studioColors(PALETTE).length <= 6);
});
