// These defaults keep the world usable if the published content file is temporarily unavailable.
import { DEFAULT_BAND, bandMembers } from './band-defaults.js';
import { ANIMAL_IMAGE_KEYS } from './animal-views.js';
import { DEFAULT_ANIMALS, playableAnimals } from './animal-defaults.js';
import { DEFAULT_PALETTE, paletteColors } from './painting.js';
import { DEFAULT_TEXTS, normalizeTexts, formatText } from './copy-defaults.js';
import { contentAssetURL } from './connection.js';
import { CONTENT_FILE } from './site-config.js';
import { readDraft, draftPreview } from './verwaltung/drafts.js';
export const TEXTS = { ...DEFAULT_TEXTS };
export const text = (key, variables) => formatText(TEXTS[key] ?? '', variables);
export const TRACKS = [
  { id: 'hut', title: 'Hut', image: 'assets/hut.png', color: '#fff20b', description: 'Ein Papagei, ein Pferd und ein Hut, der davonfliegt.', src: '' },
  { id: 'tanzen', title: 'Tanzen', image: 'assets/tanzen.png', color: '#ff87ce', description: 'Ein Lied für wackelnde Beine und tanzende Flügel.', src: '' },
  { id: 'freundschaft', title: 'Beste Freunde', image: 'assets/freundschaft.png', color: '#40cea1', description: 'Zusammen unterwegs. Ein Lied über Freundschaft.', src: '' },
  { id: 'fahrradfahren', title: 'Fahrradfahrn', image: 'assets/fahrradfahren.jpg', color: '#1d55ff', description: 'Ab auf die Räder! Ein Lied übers Fahrradfahren.', src: '' },
];
// Dates use ISO 8601, with the event's actual time zone offset.
export const CONCERTS = [];
// { label: 'Instagram', url: 'https://…' } — only approved official URLs.
export const SOCIAL_LINKS = [
  { id: 'facebook', label: 'Facebook', url: 'https://www.facebook.com/BumBumTschak.Kinderband', color: '#1877f2' },
  { id: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/bumbumtschakband/', color: '#e4408d' },
  { id: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/@BumBumTschak-Kinderband', color: '#ff0033' },
  { id: 'spotify', label: 'Spotify', url: 'https://open.spotify.com/intl-de/artist/0Yn4gitKAlqg7kDEBLkXWv', color: '#1ed760' },
];
export const SPOTIFY_ARTIST = { url: 'https://open.spotify.com/intl-de/artist/0Yn4gitKAlqg7kDEBLkXWv', embed: 'https://open.spotify.com/embed/artist/0Yn4gitKAlqg7kDEBLkXWv' };
export const CONTACT = { email: 'bumbumtschakband@gmail.com' };
export const INFO = { tagline: 'Die Kinderliederband', about: 'Ein Panda am Schlagzeug, ein Papagei an Bass und Gesang und ein Krokodil an der E-Gitarre: Zusammen sind wir Bum Bum Tschak. Unsere Lieder erzählen vom Tanzen, von Freundschaft, vom Fahrradfahren und von einem Hut, der beim Reiten verloren geht.' };
export const BAND = DEFAULT_BAND.map(member => ({ ...member }));
export const ANIMALS = DEFAULT_ANIMALS.map(animal => ({ ...animal }));
export const PALETTE = DEFAULT_PALETTE.map(color => ({ ...color }));

export function applyContent(document) {
  if (!document || !Array.isArray(document.tracks) || !Array.isArray(document.concerts) || !document.info) throw new Error('Unvollständige Inhalte');
  TRACKS.splice(0, TRACKS.length, ...document.tracks.filter(track => track.published !== false).map(track => ({ ...track, image: contentAssetURL(track.image), src: contentAssetURL(track.src) })));
  CONCERTS.splice(0, CONCERTS.length, ...document.concerts.filter(concert => concert.published !== false));
  SOCIAL_LINKS.splice(0, SOCIAL_LINKS.length, ...document.info.social.filter(link => !!link.url));
  Object.assign(TEXTS, normalizeTexts(document.info.texts));
  for (const link of SOCIAL_LINKS) link.label = text(`network_${link.id}`);
  const animals = playableAnimals(document.info.animals, TEXTS);
  for (const animal of ANIMALS) { const saved = animals.find(saved => saved.id === animal.id); Object.assign(animal, saved, Object.fromEntries(ANIMAL_IMAGE_KEYS.map(key => [key, contentAssetURL(saved[key])]))); }
  PALETTE.splice(0, PALETTE.length, ...paletteColors(document.info.palette));
  CONTACT.email = document.info.email || '';
  INFO.tagline = document.info.tagline || ''; INFO.about = document.info.about || '';
  const members = bandMembers(document.info.members);
  for (const member of BAND) {
    const saved = members.find(item => item.id === member.id);
    Object.assign(member, saved, { image: contentAssetURL(saved.image), audio: contentAssetURL(saved.audio) });
  }
  const spotify = SOCIAL_LINKS.find(link => link.id === 'spotify');
  const artist = spotify?.url.match(/^https:\/\/open\.spotify\.com\/(?:intl-[a-z]+\/)?artist\/([a-zA-Z0-9]+)(?:[/?].*)?$/);
  SPOTIFY_ARTIST.url = artist ? spotify.url : '';
  SPOTIFY_ARTIST.embed = artist ? `https://open.spotify.com/embed/artist/${artist[1]}` : '';
}
export async function loadContent(preview = false) {
  try {
    if (preview) {
      const draft = await readDraft();
      if (!draft?.document) throw new Error('In diesem Browser ist kein Entwurf gespeichert. Bitte zuerst die Bandverwaltung öffnen.');
      applyContent(draftPreview(draft)); return { ok: true };
    }
    const response = await fetch(CONTENT_FILE, { cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(preview && response.status === 401 ? 'Bitte zuerst in der Bandverwaltung anmelden.' : 'Inhalte konnten nicht geladen werden.');
    applyContent(await response.json()); return { ok: true };
  } catch (error) { return { ok: false, error: error.message }; }
}
