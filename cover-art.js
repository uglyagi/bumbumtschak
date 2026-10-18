// Resolve the published/draft member images each time a scene is rendered.
// Uniform fitting keeps replacement artwork in its original proportions.
import { BAND } from './content.js';
import { escapeXML } from './utils.js';
export const bandSymbols = () => BAND.map(member => `<symbol id="band-${member.id}" viewBox="0 0 170 190"><image href="${escapeXML(member.image)}" width="170" height="190" preserveAspectRatio="xMidYMax meet"/></symbol>`).join('');
