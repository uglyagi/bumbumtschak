import { bandMembers, DEFAULT_BAND } from '../band-defaults.js';
import { COPY_FIELDS } from '../copy-defaults.js';
import { DEFAULT_ANIMALS, playableAnimals } from '../animal-defaults.js';
import { paletteColors, PALETTE_LIMIT } from '../painting.js';
export const PART_SIZE = 8 * 1024 * 1024;
export class CMSIssue extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
function str(value, max, name, required = false) {
  const result = typeof value === 'string' ? value.trim() : '';
  if (result.length > max || (required && !result)) throw new CMSIssue(`${name}: Bitte einen gültigen Wert eingeben (höchstens ${max} Zeichen).`);
  return result;
}
function id(value) {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(value)) throw new CMSIssue('Die Kennung ist ungültig.');
  return value;
}
function url(value, media = false) {
  const result = str(value, 2048, 'Link');
  if (!result) return '';
  if (media && (/^uploads\/[a-z0-9-]+\.(?:png|jpg|jpeg|webp|wav|mp3|m4a|ogg)$/.test(result) || /^assets\/[a-zA-Z0-9._-]+$/.test(result))) return result;
  try { const parsed = new URL(result); if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) return parsed.href; } catch {}
  throw new CMSIssue('Links müssen mit https:// beginnen.');
}
function viennaParts(date) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Vienna', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  return Object.fromEntries(parts.map(part => [part.type, part.value]));
}
export function localToISO(value) {
  if (!/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new CMSIssue('Bitte Datum und Uhrzeit eintragen.');
  const [year, month, day, hour, minute] = value.match(/\d+/g).map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let stamp = desired;
  for (let i = 0; i < 3; i++) {
    const p = viennaParts(new Date(stamp));
    stamp += desired - Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  }
  const p = viennaParts(new Date(stamp));
  if (`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}` !== value) throw new CMSIssue('Diese Uhrzeit existiert nicht. Bitte die Sommerzeitumstellung beachten.');
  return new Date(stamp).toISOString();
}
const networks = [
  ['facebook', 'Facebook', '#1877f2'], ['instagram', 'Instagram', '#d62976'],
  ['youtube', 'YouTube', '#ff0033'], ['spotify', 'Spotify', '#1ed760'],
];
export function validateContent(input) {
  if (!input || !Array.isArray(input.tracks) || !Array.isArray(input.concerts) || !input.info) throw new CMSIssue('Der Inhalt ist unvollständig.');
  if (input.tracks.length > 48 || input.concerts.length > 200) throw new CMSIssue('Höchstens 48 Songs und 200 Konzerte sind möglich.');
  const used = new Set();
  const unique = value => { const result = id(value); if (used.has(result)) throw new CMSIssue('Eine Kennung kommt doppelt vor.'); used.add(result); return result; };
  const tracks = input.tracks.map(track => ({
    id: unique(track.id), title: str(track.title, 80, 'Songtitel', true), description: str(track.description, 500, 'Songbeschreibung'),
    image: url(track.image, true), src: url(track.src, true),
    color: /^#[a-f0-9]{6}$/i.test(track.color) ? track.color : '#fff20b', published: track.published !== false,
  }));
  used.clear();
  const concerts = input.concerts.map(concert => {
    const localDateTime = str(concert.localDateTime, 16, 'Konzertdatum', true);
    return { id: unique(concert.id), title: str(concert.title, 120, 'Konzerttitel', true), place: str(concert.place, 180, 'Veranstaltungsort', true), localDateTime, date: localToISO(localDateTime), timeZone: 'Europe/Vienna', url: url(concert.url), published: concert.published !== false };
  });
  const email = str(input.info.email, 180, 'E-Mail');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new CMSIssue('Bitte eine gültige E-Mail-Adresse eintragen.');
  const suppliedTexts = input.info.texts;
  if (suppliedTexts !== undefined && (!suppliedTexts || typeof suppliedTexts !== 'object' || Array.isArray(suppliedTexts))) throw new CMSIssue('Die Homepage-Texte sind ungültig.');
  const texts = Object.fromEntries(COPY_FIELDS.map(field => {
    const value = suppliedTexts?.[field.key];
    if (value !== undefined && typeof value !== 'string') throw new CMSIssue(`${field.label}: Bitte einen Text eingeben.`);
    return [field.key, str(value ?? field.value, field.max, field.label)];
  }));
  if (input.info.animals !== undefined && (!Array.isArray(input.info.animals) || input.info.animals.length !== 4 || new Set(input.info.animals.map(animal => animal?.id)).size !== 4 || input.info.animals.some(animal => !DEFAULT_ANIMALS.some(base => base.id === animal?.id)))) throw new CMSIssue('Bitte die vier Spielfiguren beibehalten.');
  if (input.info.palette !== undefined && (!Array.isArray(input.info.palette) || input.info.palette.length > PALETTE_LIMIT)) throw new CMSIssue(`Höchstens ${PALETTE_LIMIT} Farben sind möglich.`);
  used.clear();
  const palette = (input.info.palette ?? paletteColors()).map(color => {
    if (!/^#[a-f0-9]{6}$/i.test(color.color)) throw new CMSIssue('Bitte einen gültigen Farbwert auswählen.');
    return { id: unique(color.id), name: str(color.name, 40, 'Farbname', true), color: color.color };
  });
  return { schemaVersion: 1, tracks, concerts, info: {
    toiletAudio: url(input.info.toiletAudio, true),
    tagline: str(input.info.tagline, 100, 'Untertitel'), about: str(input.info.about, 6000, 'Bandgeschichte'), email, texts,
    animals: playableAnimals(input.info.animals, texts).map((animal, index) => ({ id: animal.id, article: DEFAULT_ANIMALS[index].article,
      name: str(animal.name, 40, 'Name der Spielfigur', true), trait: str(animal.trait, 180, 'Beschreibung der Spielfigur'),
      image: url(animal.image || DEFAULT_ANIMALS[index].image, true), imageRight: url(animal.imageRight || DEFAULT_ANIMALS[index].imageRight, true), imageBack: url(animal.imageBack || DEFAULT_ANIMALS[index].imageBack, true), imageSeated: url(animal.imageSeated || DEFAULT_ANIMALS[index].imageSeated, true), color: /^#[a-f0-9]{6}$/i.test(animal.color) ? animal.color : DEFAULT_ANIMALS[index].color })),
    palette: paletteColors(palette),
    members: bandMembers(input.info.members).map((member, index) => ({
      id: member.id,
      name: str(member.name, 60, 'Name des Bandmitglieds', true),
      role: str(member.role, 80, 'Instrument / Aufgabe'),
      sound: str(member.sound, 60, 'Ausruf'),
      image: url(member.image || DEFAULT_BAND[index].image, true),
      audio: url(member.audio, true),
      color: /^#[a-f0-9]{6}$/i.test(member.color) ? member.color : DEFAULT_BAND[index].color,
      intro: str(member.intro, 1800, 'Bandmitglied'),
    })),
    social: networks.map(([networkId, label, color]) => ({ id: networkId, label, color, url: url(input.info.social?.find(s => s.id === networkId)?.url) })),
  } };
}
const formats = { png: ['image/png', 'image'], jpg: ['image/jpeg', 'image'], jpeg: ['image/jpeg', 'image'], webp: ['image/webp', 'image'], wav: ['audio/wav', 'audio'], mp3: ['audio/mpeg', 'audio'], m4a: ['audio/mp4', 'audio'], ogg: ['audio/ogg', 'audio'] };
export function validateUpload(input) {
  const filename = str(input.filename, 180, 'Dateiname', true).replace(/[\r\n/\\]/g, '-');
  const extension = filename.split('.').at(-1).toLowerCase();
  const format = formats[extension];
  if (!format) throw new CMSIssue('Bitte JPG, PNG, WebP, WAV, MP3, M4A oder OGG auswählen.');
  const [mime, kind] = format;
  const size = Number(input.size);
  const limit = (kind === 'audio' ? 50 : 12) * 1024 * 1024;
  if (!Number.isSafeInteger(size) || size < 16 || size > limit) throw new CMSIssue(`Die Datei muss kleiner als ${kind === 'audio' ? 50 : 12} MB sein.`);
  return { filename, extension, mime, kind, size };
}
export function checkMagic(buffer, mime) {
  const bytes = new Uint8Array(buffer);
  const at = (text, offset = 0) => [...text].every((char, index) => bytes[offset + index] === char.charCodeAt(0));
  const valid = mime === 'image/png' ? bytes[0] === 137 && at('PNG\r\n\x1a\n', 1)
    : mime === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : mime === 'image/webp' ? at('RIFF') && at('WEBP', 8)
    : mime === 'audio/wav' ? at('RIFF') && at('WAVE', 8)
    : mime === 'audio/mpeg' ? at('ID3') || (bytes[0] === 255 && (bytes[1] & 224) === 224)
    : mime === 'audio/mp4' ? at('ftyp', 4)
    : mime === 'audio/ogg' ? at('OggS') : false;
  if (!valid) throw new CMSIssue('Der Dateiinhalt passt nicht zum Dateiformat.');
}
