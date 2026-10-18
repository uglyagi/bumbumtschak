const NAME = 'bbt-github-verwaltung-v1';
const STORE = 'drafts';
const KEY = 'uglyagi/bumbumtschak';

function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onerror = () => reject(new Error('Der Browser erlaubt das lokale Speichern des Entwurfs nicht.'));
    request.onsuccess = () => resolve(request.result);
  });
}
async function operation(mode, action) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = transaction.onabort = () => reject(new Error('Der Entwurf konnte nicht lokal gespeichert werden. Eventuell ist der Browserspeicher voll.'));
    });
  } finally { db.close(); }
}
export const readDraft = () => operation('readonly', store => store.get(KEY));
export const clearDraft = () => operation('readwrite', store => store.delete(KEY));
export function writeDraft({ document, contentSha, files }) {
  // The access token is deliberately never part of the stored record.
  return operation('readwrite', store => store.put({ document, contentSha, files, savedAt: new Date().toISOString() }, KEY));
}
export function fileReferences(document) {
  return new Set([
    ...(document.tracks || []).flatMap(track => [track.image, track.src]),
    ...(document.info?.members || []).map(member => member.image),
    ...(document.info?.animals || []).map(animal => animal.image),
  ].filter(Boolean));
}
export function draftPreview(draft, createURL = file => URL.createObjectURL(file)) {
  const document = structuredClone(draft.document);
  const urls = new Map((draft.files || []).map(item => [item.path, createURL(item.file)]));
  for (const track of document.tracks) for (const key of ['image', 'src']) track[key] = urls.get(track[key]) || track[key];
  for (const member of document.info.members || []) member.image = urls.get(member.image) || member.image;
  for (const animal of document.info.animals || []) animal.image = urls.get(animal.image) || animal.image;
  return document;
}
