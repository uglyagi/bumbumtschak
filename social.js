import { SOCIAL_LINKS, CONTACT, text } from './content.js';
import { escapeXML as escape } from './utils.js';

const marks = {
  email: '<circle cx="12" cy="12" r="11" fill="#fff20b"/><rect x="4.5" y="7" width="15" height="11" rx="2" fill="white" stroke="#101014" stroke-width="1.5"/><path d="m5 8 7 5 7-5" fill="none" stroke="#101014" stroke-width="1.5"/>',
  facebook: '<circle cx="12" cy="12" r="11" fill="#1877f2"/><path d="M13.5 22v-8.6h2.9l.5-3.3h-3.4V8c0-1 .3-1.8 1.8-1.8H17V3.3c-.8-.1-1.7-.3-2.6-.3-2.7 0-4.6 1.7-4.6 4.7v2.4H7v3.3h2.8V22Z" fill="white"/>',
  instagram: '<rect x="1" y="1" width="22" height="22" rx="6" fill="#e4408d"/><rect x="5" y="5" width="14" height="14" rx="4" fill="none" stroke="white" stroke-width="1.8"/><circle cx="12" cy="12" r="3.5" fill="none" stroke="white" stroke-width="1.8"/><circle cx="16.8" cy="7.5" r="1.1" fill="white"/>',
  youtube: '<rect x="1" y="4" width="22" height="16" rx="5" fill="#ff0033"/><path d="m10 8 7 4-7 4Z" fill="white"/>',
  spotify: '<circle cx="12" cy="12" r="11" fill="#1ed760"/><g fill="none" stroke="#101014" stroke-linecap="round"><path d="M5.7 8.6q7-2.2 13 1" stroke-width="2"/><path d="M6.5 12q5.7-1.8 11.4.9" stroke-width="1.8"/><path d="M7.2 15.2q4.5-1.5 9.7.7" stroke-width="1.5"/></g>',
};
export const brandSymbols = Object.entries(marks).map(([id, mark]) => `<symbol id="brand-${id}" viewBox="0 0 24 24">${mark}</symbol>`).join('');
export const brandIcon = id => `<svg class="brand-icon" viewBox="0 0 24 24" aria-hidden="true">${marks[id] || ''}</svg>`;
export function contactLinks() {
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(CONTACT.email) ? CONTACT.email : '';
  return [...SOCIAL_LINKS, ...(email ? [{ id: 'email', label: text('email_label'), email, url: `mailto:${email}`, color: '#fff20b' }] : [])];
}
export function socialPads(scene) {
  const links = contactLinks();
  if (scene === 'world') return links.map((l, i) => ({ ...l, x: 1170 + i * 70, y: 935, radius: 31, reach: 30 }));
  return [];
}
export function socialPadsMarkup(scene) {
  return socialPads(scene).map(p => `<g class="social-pad" data-social="${p.id}" role="link" tabindex="0" aria-label="${escape(p.id === 'email' ? text('action_email', { adresse: p.email }) : text('action_external', { kanal: p.label }))}" transform="translate(${p.x} ${p.y})"><ellipse cy="${p.radius + 5}" rx="${p.radius * .82}" ry="8" fill="#101014" opacity=".12"/><circle r="${p.radius}" fill="#fffcee" stroke="#101014" stroke-width="${scene === 'world' ? 3 : 5}"/><use href="#brand-${p.id}" x="${-p.radius * .73}" y="${-p.radius * .73}" width="${p.radius * 1.46}" height="${p.radius * 1.46}"/>${scene === 'social' ? `<text y="${p.radius + 34}" text-anchor="middle" font-size="22" font-weight="900">${escape(p.label)}</text><text y="${p.radius + 56}" text-anchor="middle" font-size="${p.id === 'email' ? 17 : 13}">${escape(p.id === 'email' ? p.email : text('social_pad_hint'))}</text>` : ''}</g>`).join('');
}
