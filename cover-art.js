// Resolve the published/draft member images each time a scene is rendered.
// Uniform fitting keeps replacement artwork in its original proportions.
import { BAND, ANIMALS } from './content.js';
import { escapeXML } from './utils.js';
import { dressedAnimalSymbol } from './hat-quest.js';
export const bandSymbols = () => BAND.map(member => `<symbol id="band-${member.id}" viewBox="0 0 170 190"><image href="${escapeXML(member.image)}" width="170" height="190" preserveAspectRatio="xMidYMax meet"/></symbol>`).join('');
export const animalSymbols = () => ANIMALS.map(animal => `<symbol id="animal-${animal.id}" viewBox="0 0 100 120"><image href="${escapeXML(animal.image)}" width="100" height="120" preserveAspectRatio="xMidYMax meet"/></symbol>${dressedAnimalSymbol(animal.id)}`).join('');
