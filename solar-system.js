import { SPACE } from './sky-world.js';

// Mean radii in km, NASA / Lunar and Planetary Institute:
// https://science.nasa.gov/resource/solar-system-sizes/
// Planet-body diameters share one scale. Travel distances and rings are illustrated.
export const SOLAR_SOURCE = 'https://science.nasa.gov/resource/solar-system-sizes/';
export const CSS_PIXELS_PER_CM = 96 / 2.54;
const bodies = [
  ['mercury', 2440, 365, 330, '#b7b2ad'],
  ['venus', 6052, 520, 660, '#f5c963'],
  ['earth', 6371, 820, 990, '#377df8'],
  ['mars', 3390, 1070, 1290, '#ee784d'],
  ['jupiter', 69911, 800, 2110, '#efc896'],
  ['saturn', 58232, 800, 3460, '#ffe0a3'],
  ['uranus', 25362, 1080, 4420, '#8de3df'],
  ['neptune', 24622, 500, 5090, '#5277f5'],
];
export const PLANETS = bodies.map(([id, radiusKm, x, altitude, color]) => ({
  id, key: `planet_${id}`, radiusKm, x, y: SPACE.bottom - altitude, color,
  diameter: CSS_PIXELS_PER_CM * radiusKm / 2440,
}));
