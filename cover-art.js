// Resolve the published/draft member images each time a scene is rendered.
// Uniform fitting keeps replacement artwork in its original proportions.
import { BAND, ANIMALS } from './content.js';
import { escapeXML } from './utils.js';
import { dressedAnimalSymbol } from './hat-quest.js';
const release = new URL(import.meta.url).searchParams.get('v');
const imageSource = source => release && source.startsWith('assets/') ? source + '?v=' + release : source;
export const bandSymbols = () => BAND.map(member => `<symbol id="band-${member.id}" viewBox="0 0 170 190"><image href="${escapeXML(member.image)}" width="170" height="190" preserveAspectRatio="xMidYMax meet"/></symbol>`).join('');
export const animalSymbols = () => ANIMALS.map(animal => {
  const image = (id, source) => `<symbol id="animal-${animal.id}${id}" viewBox="0 0 100 120"><image href="${escapeXML(imageSource(source))}" width="100" height="120" preserveAspectRatio="xMidYMax meet"/></symbol>`;
  return image('', animal.image) + image('-right', animal.imageRight) + image('-back', animal.imageBack) + image('-seated', animal.imageSeated)
    + `<symbol id="animal-${animal.id}-left" viewBox="0 0 100 120"><use href="#animal-${animal.id}-right" width="100" height="120" transform="translate(100 0) scale(-1 1)"/></symbol>`
    + ['front', 'right', 'left', 'back', 'seated'].map(facing => dressedAnimalSymbol(animal.id, facing)).join('');
}).join('');
