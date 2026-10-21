import { ANIMAL_IMAGE_KEYS } from '../animal-views.js';
import { COPY_GROUPS, normalizeTexts } from '../copy-defaults.js';
import { DEFAULT_BAND, bandMembers } from '../band-defaults.js';
import { DEFAULT_ANIMALS, playableAnimals } from '../animal-defaults.js';
import { paletteColors, PALETTE_LIMIT, DEFAULT_PALETTE, BUCKET_COLOR_IDS } from '../painting.js';
import { GitHubStore, REPOSITORY } from './github-store.js';
import { readDraft, writeDraft, clearDraft, fileReferences } from './drafts.js';
import { validateContent, validateUpload, checkMagic } from './schema.js';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const state = { document: null, contentSha: '', tab: 'concerts', dirty: false, hasDraft: false, busy: false, uploads: new Set(), files: new Map(), store: null, savedDraft: null };
const fileURLs = new Map();
const assetRelease = new URL(import.meta.url).searchParams.get('v');
function fileURL(value) {
  if (fileURLs.has(value)) return fileURLs.get(value);
  if (/^(?:assets|uploads)\/[a-zA-Z0-9._-]+$/.test(value || '')) {
    const url = new URL('../' + value, import.meta.url);
    if (assetRelease && value.startsWith('assets/')) url.searchParams.set('v', assetRelease);
    return url.href;
  }
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}
function message(text, error = false) { const node = $('#message'); node.textContent = text; node.hidden = !text; node.classList.toggle('error', error); }
function status() {
  if (!state.document) return;
  $('#panel').inert = state.busy;
  const text = state.busy ? 'Bitte warten …' : state.uploads.size ? 'Datei wird vorbereitet …' : state.dirty ? 'Ungespeicherte Änderungen' : state.hasDraft ? 'Entwurf in diesem Browser gespeichert · noch nicht veröffentlicht' : 'Veröffentlichten Stand geladen';
  $('#save-state').textContent = text;
  $('#save-state').classList.toggle('dirty', state.dirty || state.hasDraft);
  for (const id of ['save', 'preview', 'publish', 'logout', 'restore-draft', 'discard-draft']) $(`#${id}`).disabled = state.busy || state.uploads.size > 0;
  $('#concert-count').textContent = state.document.concerts.length;
  $('#music-count').textContent = state.document.tracks.length;
}
function pruneFiles() {
  const used = fileReferences(state.document);
  for (const path of state.files.keys()) if (!used.has(path)) {
    state.files.delete(path); URL.revokeObjectURL(fileURLs.get(path)); fileURLs.delete(path);
  }
}
function changed() { state.dirty = true; pruneFiles(); message(''); status(); }

const field = (label, path, value, { type = 'text', max = 180, hint = '', full = false, required = false } = {}) => `<label class="field${full ? ' full' : ''}">${label}<input type="${type}" data-path="${path}" value="${esc(value)}" maxlength="${max}" ${required ? 'required' : ''}>${hint ? `<small>${hint}</small>` : ''}</label>`;
const textarea = (label, path, value, rows = 3, max = 1800) => `<label class="field full">${label}<textarea data-path="${path}" rows="${rows}" maxlength="${max}">${esc(value)}</textarea></label>`;
const visible = (path, checked) => `<label class="checkbox"><input type="checkbox" data-path="${path}" ${checked !== false ? 'checked' : ''}> In der Spielwelt sichtbar</label>`;
const removeButton = (collection, index) => `<button class="button small danger" data-remove="${collection}" data-index="${index}" aria-label="Eintrag entfernen">Entfernen</button>`;
function concerts() {
  const items = state.document.concerts;
  return `<div class="section-heading"><div><h2>Wann macht’s wieder Bum?</h2><p>Die Termine erscheinen auf der Konzerttafel. Datum und Uhrzeit gelten für Österreich (Europe/Vienna). Vergangene Termine werden in der Spielwelt ausgeblendet.</p></div><button class="button primary" data-add="concerts">+ Konzert hinzufügen</button></div>${items.length ? `<div class="cards">${items.map((item, index) => `<article class="card"><div class="card-top"><div class="card-title"><span class="number">${String(index + 1).padStart(2, '0')}</span><h3 data-heading="concerts.${index}.title">${esc(item.title || 'Neues Konzert')}</h3></div><div class="actions">${visible(`concerts.${index}.published`, item.published)}${removeButton('concerts', index)}</div></div><div class="fields">${field('Veranstaltung *', `concerts.${index}.title`, item.title, { max: 120, required: true })}${field('Ort / Veranstaltungsstätte *', `concerts.${index}.place`, item.place, { required: true })}${field('Datum und Uhrzeit *', `concerts.${index}.localDateTime`, item.localDateTime, { type: 'datetime-local', required: true })}${field('Infos / Ticketlink', `concerts.${index}.url`, item.url, { type: 'url', max: 2048, hint: 'Optional. Ein vollständiger Link mit https://.' })}</div></article>`).join('')}</div>` : '<div class="empty"><strong>Noch steht die Bühne frei.</strong><p>Trage euren nächsten Auftritt ein – mit Ort, Uhrzeit und einem Link zu weiteren Infos.</p><button class="button primary" data-add="concerts">+ Erstes Konzert eintragen</button></div>'}`;
}
function music() {
  return `<div class="section-heading"><div><h2>Ein Song. Eine Kassette.</h2><p>Das Cover hilft Kindern beim Aussuchen. Die Aufnahme spielt, wenn sie die Kassette ins Radio legen. Zehn Kassetten passen ins Haus: sechs rechts und vier links. Weitere Songs erscheinen automatisch auf zusätzlichen Regalseiten. Die Reihenfolge bestimmt nur die Startposition; Kinder können Kassetten später auf jeden freien Platz zurücklegen.</p></div><button class="button primary" data-add="tracks">+ Song hinzufügen</button></div><div class="cards">${state.document.tracks.map((track, index) => `<article class="card"><div class="card-top"><div class="card-title"><span class="number" style="background:${track.color}">${String(index + 1).padStart(2, '0')}</span><h3 data-heading="tracks.${index}.title">${esc(track.title || 'Neuer Song')}</h3></div><div class="actions"><button class="button small" data-move="${index}" data-direction="-1" aria-label="Song nach oben" ${index === 0 ? 'disabled' : ''}>↑</button><button class="button small" data-move="${index}" data-direction="1" aria-label="Song nach unten" ${index === state.document.tracks.length - 1 ? 'disabled' : ''}>↓</button>${visible(`tracks.${index}.published`, track.published)}${removeButton('tracks', index)}</div></div><div class="music-layout"><div class="cover-column"><div class="cover-frame" id="cover-${track.id}">${track.image ? `<img src="${esc(fileURL(track.image))}" alt="Cover von ${esc(track.title)}">` : '<span>Hier kommt<br>euer Cover hin.</span>'}</div><label class="upload">Cover auswählen<input type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" data-upload="image" data-track="${track.id}" aria-label="Cover für ${esc(track.title)} hochladen"></label><p class="file-hint">JPG, PNG oder WebP · bis 12 MB<br>Am besten quadratisch.</p><p class="file-status" id="upload-image-${track.id}" role="status"></p><details><summary>Cover über einen Link angeben</summary>${field('Coverlink', `tracks.${index}.image`, track.image, { max: 2048 })}</details></div><div class="fields">${field('Songtitel *', `tracks.${index}.title`, track.title, { max: 80, required: true })}${field('Kassettenfarbe', `tracks.${index}.color`, track.color, { type: 'color' })}${textarea('Worum geht es im Lied?', `tracks.${index}.description`, track.description, 2, 500)}<div class="field full">Audioaufnahme<label class="upload">Aufnahme auswählen<input type="file" accept="audio/wav,audio/x-wav,audio/mpeg,audio/mp4,audio/ogg,.wav,.mp3,.m4a,.ogg" data-upload="src" data-track="${track.id}" aria-label="Aufnahme für ${esc(track.title)} hochladen"></label><small>WAV, MP3, M4A oder OGG · bis 50 MB. MP3 lädt schneller. Die Aufnahme wird direkt mit dieser Kassette verbunden.</small><p class="file-status" id="upload-src-${track.id}" role="status"></p><div id="audio-${track.id}">${track.src ? `<audio controls preload="none" src="${esc(fileURL(track.src))}" aria-label="${esc(track.title)} probehören"></audio>` : '<p class="file-hint">Noch keine Aufnahme hinterlegt.</p>'}</div><details><summary>Audio über einen Link angeben</summary>${field('Audiolink', `tracks.${index}.src`, track.src, { max: 2048 })}</details></div></div></div></article>`).join('')}</div>${!state.document.tracks.length ? '<div class="empty"><strong>Platz für eure Lieder.</strong><p>Füge einen Song hinzu und gib ihm ein Cover und eine Aufnahme.</p><button class="button primary" data-add="tracks">+ Ersten Song hinzufügen</button></div>' : ''}`;
}
function memberEditor(member, index) {
  const path = `info.members.${index}`;
  return `<article class="card member-editor"><div class="card-top"><div class="card-title"><span class="number">${String(index + 1).padStart(2, '0')}</span><h3 data-heading="${path}.name">${esc(member.name)}</h3></div></div><div class="music-layout"><div class="cover-column"><div class="cover-frame member-frame" id="member-cover-${member.id}"><img src="${esc(fileURL(member.image))}" alt="${esc(member.name)}"></div><label class="upload">Bandgrafik auswählen<input type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" data-upload="image" data-member="${member.id}" aria-label="Grafik für ${esc(member.name)} hochladen"></label><p class="file-hint">PNG mit transparentem Hintergrund ist ideal.<br>Auch JPG / WebP · bis 12 MB.</p><p class="file-status" id="member-upload-image-${member.id}" role="status"></p><button class="button small" data-reset-member="${member.id}">Originalgrafik verwenden</button><details><summary>Grafik über einen Link angeben</summary>${field('Bildlink', `${path}.image`, member.image, { max: 2048 })}</details></div><div class="fields">${field('Name *', `${path}.name`, member.name, { max: 60, required: true })}${field('Instrument / Aufgabe', `${path}.role`, member.role, { max: 80 })}${field('Ausruf, z. B. BUM! BUM!', `${path}.sound`, member.sound, { max: 60, hint: 'Erscheint auf dem Schild und beim Bandmitglied. Ein leeres Feld blendet den Ausruf aus.' })}${field('Akzentfarbe', `${path}.color`, member.color, { type: 'color' })}${textarea('Was erzählt dieses Bandmitglied?', `${path}.intro`, member.intro, 4)}${memberAudioEditor(member, path)}</div></div></article>`;
}
function memberAudioEditor(member, path) {
  return `<div class="field full"><strong>Eigene Melodie / Lied</strong><p class="hint">Diese Aufnahme spielt, wenn das Bandmitglied auf der Bühne ausgewählt wird. Sie gehört zu diesem Bandmitglied und ist unabhängig von den Kassetten.</p><label class="upload">Melodie auswählen<input type="file" accept="audio/wav,audio/x-wav,audio/mpeg,audio/mp4,audio/ogg,.wav,.mp3,.m4a,.ogg" data-upload="audio" data-member="${member.id}" aria-label="Melodie für ${esc(member.name)} hochladen"></label><small>WAV, MP3, M4A oder OGG · bis 50 MB. MP3 lädt schneller.</small><p class="file-status" id="member-upload-audio-${member.id}" role="status"></p><div id="member-audio-${member.id}">${member.audio ? `<audio controls preload="none" src="${esc(fileURL(member.audio))}" aria-label="Melodie von ${esc(member.name)} probehören"></audio>` : '<p class="file-hint">Noch keine Melodie hinterlegt.</p>'}</div><button class="button small" data-remove-member-audio="${member.id}">Melodie entfernen</button><details><summary>Melodie über einen Link angeben</summary>${field('Audiolink', `${path}.audio`, member.audio, { max: 2048 })}</details></div>`;
}

function animalEditor(animal, index) {
  const path = `info.animals.${index}`;
  const labels = { image: 'Vorderansicht', imageRight: 'Seitenansicht', imageBack: 'Rückenansicht' };
  const graphics = ANIMAL_IMAGE_KEYS.filter(key => key !== 'imageSeated').map(key => `<details class="animal-view-editor" ${key === 'image' ? 'open' : ''}><summary>${labels[key]}</summary><div class="cover-frame member-frame animal-frame" id="animal-cover-${animal.id}${key === 'image' ? '' : '-' + key}"><img src="${esc(fileURL(animal[key]))}" alt="${esc(animal.name)} – ${labels[key]}"></div><label class="upload">${labels[key]} auswählen<input type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" data-upload="${key}" data-animal="${animal.id}" aria-label="${labels[key]} für ${esc(animal.name)} hochladen"></label><p class="file-status" id="animal-upload-${key}-${animal.id}" role="status"></p>${field('Bildlink', `${path}.${key}`, animal[key], { max: 2048 })}</details>`).join('');
  return `<article class="card member-editor"><div class="card-top"><h3 data-heading="${path}.name">Spielfigur: ${esc(animal.name)}</h3></div><div class="music-layout"><div class="cover-column">${graphics}<p class="file-hint">PNG mit transparentem Hintergrund ist ideal. JPG / WebP · bis 12 MB. Das ganze Tier einschließlich Schwanz soll im Bild sein. Die linke Seitenansicht wird automatisch gespiegelt. Auf dem Fahrrad erscheint dieselbe vollständige Seitenansicht mit den normalen Körperproportionen.</p><button class="button small" data-reset-animal="${animal.id}">Originalgrafiken verwenden</button></div><div class="fields">${field('Name *', `${path}.name`, animal.name, { max: 40, required: true })}${field('Akzentfarbe', `${path}.color`, animal.color, { type: 'color' })}${textarea('Kurzbeschreibung', `${path}.trait`, animal.trait, 2, 180)}<p class="hint">Die Vorderansicht erscheint beim Aussuchen. Beim Laufen wechseln die Ansichten mit der Richtung; im Rennen wird dieselbe Seitenansicht verwendet.</p></div></div></article>`;
}
function paletteEditor() {
  return `<article class="card palette-editor"><div class="card-top"><h3>Farben & Malen</h3><button class="button small primary" data-add-color>+ Farbe hinzufügen</button></div><p class="hint">Im Landschaftsbild gibt es fünf Farben in dunkel, normal und hell sowie Schwarz, Grau und Weiß. Die fünf normalen Farben sind zusätzlich als Kübel für Bäume und Blumen verfügbar. Ändert hier Namen und Farbwerte oder ergänzt weitere Bildfarben (insgesamt bis ${PALETTE_LIMIT}). Die 18 Grundfarben bleiben erhalten. Die Ausgangsfarben der Welt verwenden dieselben Farbwerte. Gemalte Welten werden nur im Browser des jeweiligen Kindes gespeichert.</p><div class="palette-rows">${state.document.info.palette.map((color, index) => `<div class="palette-row">${field('Farbname *', `info.palette.${index}.name`, color.name, { max: 40, required: true })}${field('Farbe', `info.palette.${index}.color`, color.color, { type: 'color' })}${DEFAULT_PALETTE.some(base => base.id === color.id) ? `<span class="palette-use">${BUCKET_COLOR_IDS.includes(color.id) ? 'Bild + Farbkübel' : 'Nur im Bild'}</span>` : `<button class="button small danger" data-remove-color="${index}" aria-label="${esc(color.name)} entfernen">Entfernen</button>`}</div>`).join('')}</div></article>`;
}
function textEditor() {
  return `<article class="card homepage-copy"><h3>Texte der Homepage</h3><p class="hint">Hier ändert ihr Überschriften, Absätze, Menüs, Schilder, Anleitungen und Spielmeldungen. Titel und Beschreibungen der Songs und Bandgeschichten bearbeitet ihr weiterhin bei Musik bzw. den Bandmitgliedern. Veröffentlichen gilt auch für diese Texte.</p><label class="field copy-search">Text oder Bereich suchen<input type="search" data-copy-search placeholder="z. B. Eltern, Überschrift, Musikhaus" aria-label="Homepage-Texte durchsuchen"></label><div class="copy-groups">${COPY_GROUPS.map(group => ({ ...group, fields: group.fields.filter(field => !DEFAULT_ANIMALS.some(animal => [animal.id + '_name', animal.id + '_trait'].includes(field.key))) })).map(group => `<details class="copy-group" data-copy-group ${group.id === 'grownups' ? 'open' : ''}><summary>${esc(group.label)} <span>${group.fields.length} Texte</span></summary><div class="fields">${group.fields.map(item => {
    const tokens = [...new Set(item.value.match(/\{\w+\}/g) || [])];
    const hint = tokens.length ? `Diese Wörter werden beim Spielen ersetzt: ${tokens.join(', ')}. Ihr könnt sie im Text verwenden.` : '';
    return `<div class="copy-field${item.max > 500 ? ' full' : ''}" data-copy-field data-search="${esc((group.label + ' ' + item.label + ' ' + item.value).toLocaleLowerCase('de'))}">${item.max > 500 ? textarea(item.label, `info.texts.${item.key}`, state.document.info.texts[item.key], 3, item.max) : field(item.label, `info.texts.${item.key}`, state.document.info.texts[item.key], { max: item.max, full: true })}${hint ? `<p class="hint token-hint">${esc(hint)}</p>` : ''}</div>`;
  }).join('')}</div></details>`).join('')}</div><p class="hint" data-copy-no-results hidden>Kein passender Text gefunden.</p></article>`;
}
function info() {
  const item = state.document.info;
  return `<div class="section-heading"><div><h2>Das seid ihr.</h2><p>Hier ändert ihr eure Geschichte, die Bandmitglieder und Kontaktdaten. Namen, Ausrufe und Grafiken erscheinen auf der Bühne und in den Gesprächen. Alle weiteren Texte könnt ihr im Bereich „Texte der Homepage“ bearbeiten.</p></div></div><div class="info-stack"><article class="card"><h3>Band & Kontakt</h3><div class="fields">${field('Untertitel der Band', 'info.tagline', item.tagline, { max: 100 })}${field('E-Mail für Booking & Kontakt', 'info.email', item.email, { type: 'email' })}${textarea('Eure Bandgeschichte', 'info.about', item.about, 5, 6000)}</div><p class="hint" style="margin-top:16px">Die E-Mail-Adresse erscheint bei „Kontakt“ und unter „für Eltern und Veranstalter“. Die Bandgeschichte steht bei den Bandmitgliedern. Die Texte von „für Eltern und Veranstalter“ bearbeitet ihr unten separat.</p></article>${textEditor()}${item.members.map(memberEditor).join('')}<article class="card"><h3>Spielfiguren</h3><p class="hint">Hier ändert ihr Namen, Beschreibungen, Akzentfarben und Grafiken der vier Spielfiguren.</p></article>${item.animals.map(animalEditor).join('')}${paletteEditor()}<article class="card"><h3>Kontakt</h3><p class="hint" style="margin-bottom:20px">Diese Links öffnen sich über die Symbole in der Spielwelt. Ein leeres Feld blendet das jeweilige Symbol aus.</p><div class="fields">${item.social.map((network, index) => field(network.label, `info.social.${index}.url`, network.url, { type: 'url', max: 2048 })).join('')}</div></article></div>`;
}
function render() {
  $('#panel').innerHTML = state.tab === 'concerts' ? concerts() : state.tab === 'music' ? music() : info();
  $('#panel').setAttribute('aria-labelledby', `tab-${state.tab}`);
  for (const tab of document.querySelectorAll('[data-tab]')) { const active = tab.dataset.tab === state.tab; tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1; }
  status();
}
function setPath(path, value) {
  const keys = path.split('.'); let current = state.document;
  for (const key of keys.slice(0, -1)) current = current[key];
  current[keys.at(-1)] = value;
}
$('#panel').addEventListener('input', event => {
  const input = event.target;
  if (input.matches('[data-copy-search]')) {
    const query = input.value.trim().toLocaleLowerCase('de'); let matches = 0;
    for (const group of $('#panel').querySelectorAll('[data-copy-group]')) {
      let found = 0;
      for (const field of group.querySelectorAll('[data-copy-field]')) { field.hidden = !!query && !(field.dataset.search + ' ' + (field.querySelector('input,textarea')?.value || '').toLocaleLowerCase('de')).includes(query); if (!field.hidden) found++; }
      group.hidden = !found; if (query && found) group.open = true; matches += found;
    }
    $('#panel').querySelector('[data-copy-no-results]').hidden = !!matches;
    return;
  }
  if (!input.dataset.path) return;
  setPath(input.dataset.path, input.type === 'checkbox' ? input.checked : input.value);
  const heading = [...document.querySelectorAll('[data-heading]')].find(node => node.dataset.heading === input.dataset.path);
  if (heading) heading.textContent = input.value || 'Neuer Eintrag';
  changed();
});
async function ask(title, text, action) {
  const dialog = $('#confirm'); $('#confirm-title').textContent = title; $('#confirm-text').textContent = text; $('#confirm-button').textContent = action;
  dialog.returnValue = 'cancel'; dialog.showModal();
  return new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true }));
}
document.addEventListener('click', async event => {
  const button = event.target.closest('button'); if (!button) return;
  if (state.busy) return;
  if (button.dataset.resetAnimal) {
    if (state.uploads.size) return;
    const animal = state.document.info.animals.find(item => item.id === button.dataset.resetAnimal);
    const original = DEFAULT_ANIMALS.find(item => item.id === animal.id); for (const key of ANIMAL_IMAGE_KEYS) animal[key] = original[key];
    changed(); render(); $(`[data-reset-animal="${animal.id}"]`).focus(); return;
  }
  if (button.dataset.addColor !== undefined) {
    if (state.document.info.palette.length >= PALETTE_LIMIT) { message(`Höchstens ${PALETTE_LIMIT} Farben sind möglich.`, true); return; }
    state.document.info.palette.push({ id: `paint-${crypto.randomUUID()}`, name: 'Neue Farbe', color: '#a855f7' }); changed(); render(); return;
  }
  if (button.dataset.removeColor !== undefined) {
    const index = Number(button.dataset.removeColor);
    if (DEFAULT_PALETTE.some(color => color.id === state.document.info.palette[index]?.id)) return;
    state.document.info.palette.splice(index, 1); changed(); render(); return;
  }
  if (button.dataset.resetMember) {
    if (state.uploads.size) return;
    const member = state.document.info.members.find(item => item.id === button.dataset.resetMember);
    member.image = DEFAULT_BAND.find(item => item.id === member.id).image;
    changed(); render(); $(`[data-reset-member="${member.id}"]`).focus(); return;
  }
  if (button.dataset.removeMemberAudio) {
    const member = state.document.info.members.find(item => item.id === button.dataset.removeMemberAudio);
    member.audio = ''; changed(); render(); return;
  }
  if (button.dataset.tab) {
    if (state.uploads.size) { message('Bitte den laufenden Upload abwarten.'); return; }
    state.tab = button.dataset.tab; render(); return;
  }
  if (button.dataset.add) {
    if (state.uploads.size) return;
    const collection = button.dataset.add;
    if (state.document[collection].length >= (collection === 'tracks' ? 48 : 200)) { message('Die maximale Anzahl ist erreicht.', true); return; }
    state.document[collection].push(collection === 'tracks' ? { id: `song-${crypto.randomUUID()}`, title: '', image: '', src: '', description: '', color: '#fff20b', published: true } : { id: `concert-${crypto.randomUUID()}`, title: '', place: '', localDateTime: '', url: '', published: true });
    changed(); render(); $('#panel .card:last-child input')?.focus(); return;
  }
  if (button.dataset.remove) {
    if (state.uploads.size) return;
    const collection = button.dataset.remove, index = Number(button.dataset.index), item = state.document[collection][index];
    if (await ask('Eintrag entfernen?', `„${item.title || 'Neuer Eintrag'}“ wird aus diesem Entwurf entfernt. Die Spielwelt ändert sich erst nach dem Veröffentlichen.`, 'Entfernen')) { state.document[collection].splice(index, 1); changed(); render(); }
    return;
  }
  if (button.dataset.move !== undefined) {
    if (state.uploads.size) return;
    const from = Number(button.dataset.move), to = from + Number(button.dataset.direction), list = state.document.tracks;
    if (to < 0 || to >= list.length) return;
    [list[from], list[to]] = [list[to], list[from]]; changed(); render();
    $(`[data-move="${to}"][data-direction="${button.dataset.direction}"]`)?.focus();
  }
});
$('.tabs').addEventListener('keydown', event => {
  const keys = ['concerts', 'music', 'info']; const index = keys.indexOf(state.tab);
  const next = event.key === 'ArrowRight' ? (index + 1) % 3 : event.key === 'ArrowLeft' ? (index + 2) % 3 : event.key === 'Home' ? 0 : event.key === 'End' ? 2 : -1;
  if (next < 0 || state.uploads.size) return;
  event.preventDefault(); state.tab = keys[next]; render(); $(`#tab-${state.tab}`).focus();
});
function validFields() {
  const invalid = [...$('#panel').querySelectorAll('input,textarea')].find(input => !input.checkValidity());
  if (invalid) { invalid.reportValidity(); return false; } return true;
}

async function save(publish = false) {
  if (state.busy || state.uploads.size || !state.store || (publish && !validFields())) return false;
  state.busy = true; status();
  try {
    const document = publish ? validateContent(state.document) : structuredClone(state.document);
    const files = [...state.files].map(([path, file]) => ({ path, file }));
    await writeDraft({ document: state.document, contentSha: state.contentSha, files });
    state.savedDraft = null; $('#draft-notice').hidden = true;
    state.hasDraft = true; state.dirty = false;
    if (!publish) { message('Der Entwurf ist in diesem Browser gespeichert. In der Vorschau kannst du ihn ansehen.'); return true; }
    const result = await state.store.publish(document, files, state.contentSha, text => message(text));
    state.document = document; state.contentSha = result.contentSha;
    state.files.clear(); for (const url of fileURLs.values()) URL.revokeObjectURL(url); fileURLs.clear();
    state.hasDraft = false; state.savedDraft = null; $('#draft-notice').hidden = true;
    await clearDraft().catch(() => {});
    render();
    message(result.changed ? 'Auf GitHub gespeichert! Die Homepage wird automatisch aktualisiert. Das kann einige Minuten dauern; danach die Spielwelt neu laden.' : 'Die Inhalte stimmen bereits mit der Veröffentlichung auf GitHub überein.');
    return true;
  } catch (error) { message(error.message, true); return false; }
  finally { state.busy = false; status(); }
}
$('#save').addEventListener('click', () => save());
$('#publish').addEventListener('click', async () => {
  if (!validFields()) return;
  if (await ask('Bereit für die Spielwelt?', 'Diese Inhalte und die ausgewählten Dateien werden öffentlich im GitHub-Repository gespeichert. GitHub aktualisiert anschließend die Homepage.', 'Jetzt veröffentlichen')) await save(true);
});
$('#preview').addEventListener('click', async () => {
  const preview = window.open('about:blank', '_blank');
  if (!preview) { message('Bitte Pop-ups für die Vorschau erlauben und erneut klicken.', true); return; }
  preview.opener = null;
  if (!await save()) { preview.close(); return; }
  preview.location.href = new URL('../?preview=1', import.meta.url).href;
});
$('#panel').addEventListener('change', async event => {
  const input = event.target; if (!input.dataset.upload || !input.files?.[0] || state.busy) return;
  const member = input.dataset.member ? state.document.info.members.find(item => item.id === input.dataset.member) : null;
  const animal = input.dataset.animal ? state.document.info.animals.find(item => item.id === input.dataset.animal) : null;
  const track = !member && !animal ? state.document.tracks.find(item => item.id === input.dataset.track) : null;
  const item = member || animal || track, key = input.dataset.upload;
  if (!item) return;
  const statusId = member ? `#member-upload-${key}-${member.id}` : animal ? `#animal-upload-${key}-${animal.id}` : `#upload-${key}-${track.id}`;
  const indicator = $(statusId), file = input.files[0];
  state.uploads.add(item.id + ':' + key); input.disabled = true; status();
  try {
    const info = validateUpload({ filename: file.name, size: file.size });
    if (info.kind !== (['src', 'audio'].includes(key) ? 'audio' : 'image')) throw new Error('Bitte das passende Bild- oder Audioformat auswählen.');
    checkMagic(await file.slice(0, 24).arrayBuffer(), info.mime);
    const path = `uploads/${crypto.randomUUID()}.${info.extension}`;
    state.files.set(path, file); fileURLs.set(path, URL.createObjectURL(file)); item[key] = path; changed();
    indicator.textContent = 'Ausgewählt. Wird beim Veröffentlichen auf GitHub gespeichert.';
    if (member && key === 'audio') $(`#member-audio-${member.id}`).innerHTML = `<audio controls preload="none" src="${esc(fileURL(path))}" aria-label="Melodie von ${esc(member.name)} probehören"></audio>`;
    else if (member) $(`#member-cover-${member.id}`).innerHTML = `<img src="${esc(fileURL(path))}" alt="${esc(member.name)}">`;
    else if (animal) $(`#animal-cover-${animal.id}${key === 'image' ? '' : '-' + key}`).innerHTML = `<img src="${esc(fileURL(path))}" alt="${esc(animal.name)}">`;
    else if (key === 'image') $(`#cover-${track.id}`).innerHTML = `<img src="${esc(fileURL(path))}" alt="Cover von ${esc(track.title)}">`;
    else $(`#audio-${track.id}`).innerHTML = `<audio controls preload="none" src="${esc(fileURL(path))}" aria-label="${esc(track.title)} probehören"></audio>`;
    const fieldPath = member ? `info.members.${state.document.info.members.indexOf(member)}.${key}` : animal ? `info.animals.${state.document.info.animals.indexOf(animal)}.${key}` : `tracks.${state.document.tracks.indexOf(track)}.${key}`;
    const linkInput = [...$('#panel').querySelectorAll('[data-path]')].find(node => node.dataset.path === fieldPath);
    if (linkInput) linkInput.value = path;
  } catch (error) { indicator.textContent = 'Die Datei wurde nicht zugeordnet.'; message(error.message, true); }
  finally { state.uploads.delete(item.id + ':' + key); input.disabled = false; input.value = ''; status(); }
});

function normalize(document) {
  document.info.members = bandMembers(document.info.members);
  document.info.texts = normalizeTexts(document.info.texts);
  document.info.animals = playableAnimals(document.info.animals, document.info.texts);
  document.info.palette = paletteColors(document.info.palette);
  return document;
}
$('#login').addEventListener('submit', async event => {
  event.preventDefault();
  const token = $('#token').value; $('#token').value = '';
  $('#login-button').disabled = true; $('#gate-message').textContent = 'Inhalte von GitHub laden …';
  let store;
  try {
    store = new GitHubStore(token);
    const current = await store.load();
    state.store = store; state.document = normalize(current.document); state.contentSha = current.contentSha;
    state.hasDraft = false; state.dirty = false;
    $('#account').textContent = `GitHub · ${REPOSITORY}`;
    $('#gate').hidden = true; $('#editor').hidden = false; $('#logout').hidden = false;
    render(); $('#tab-concerts').focus();
    try { state.savedDraft = await readDraft(); }
    catch { state.savedDraft = null; message('Der Browser erlaubt keine lokalen Entwürfe. Bitte den Browserspeicher für diese Website freigeben.', true); }
    if (state.savedDraft?.document) {
      const stamp = new Date(state.savedDraft.savedAt).toLocaleString('de-AT');
      const stale = state.savedDraft.contentSha !== state.contentSha;
      $('#draft-description').textContent = `In diesem Browser liegt ein Entwurf vom ${stamp}. ${stale ? 'Inzwischen wurden andere Inhalte veröffentlicht. Bitte vor einer erneuten Veröffentlichung die Änderungen vergleichen.' : 'Du kannst ihn laden oder mit dem veröffentlichten Stand weiterarbeiten.'}`;
      $('#draft-notice').hidden = false;
    }
  } catch (error) {
    store?.logout(); state.store = null;
    $('#gate-message').textContent = error.message;
  } finally { $('#login-button').disabled = false; }
});
$('#restore-draft').addEventListener('click', async () => {
  if (!state.savedDraft || state.busy) return;
  if (state.dirty && !await ask('Entwurf laden?', 'Die gerade geänderten Formularfelder werden durch den gespeicherten Entwurf ersetzt.', 'Entwurf laden')) return;
  for (const url of fileURLs.values()) URL.revokeObjectURL(url); fileURLs.clear(); state.files.clear();
  state.document = normalize(structuredClone(state.savedDraft.document));
  state.contentSha = state.savedDraft.contentSha;
  for (const item of state.savedDraft.files || []) {
    state.files.set(item.path, item.file); fileURLs.set(item.path, URL.createObjectURL(item.file));
  }
  pruneFiles(); state.hasDraft = true; state.dirty = false; $('#draft-notice').hidden = true;
  render(); message('Der lokale Entwurf ist geladen. Die öffentliche Spielwelt ist unverändert.');
});
$('#discard-draft').addEventListener('click', async () => {
  if (!await ask('Gespeicherten Entwurf verwerfen?', 'Der lokale Entwurf einschließlich ausgewählter Dateien wird gelöscht. Bereits veröffentlichte Inhalte bleiben erhalten.', 'Entwurf verwerfen')) return;
  try { await clearDraft(); state.savedDraft = null; $('#draft-notice').hidden = true; }
  catch (error) { message(error.message, true); }
});
$('#logout').addEventListener('click', async () => {
  if (state.busy || state.uploads.size) return;
  if (state.dirty && !await save()) return;
  state.store?.logout(); state.store = null;
  for (const url of fileURLs.values()) URL.revokeObjectURL(url); fileURLs.clear(); state.files.clear();
  state.document = null; $('#editor').hidden = true; $('#gate').hidden = false; $('#logout').hidden = true;
  $('#draft-notice').hidden = true; $('#gate-message').textContent = 'Du bist abgemeldet. Ein gespeicherter Entwurf bleibt nur in diesem Browser erhalten.';
  $('#token').focus();
});
window.addEventListener('beforeunload', event => {
  if (state.dirty || state.busy || state.uploads.size) { event.preventDefault(); event.returnValue = ''; }
});
