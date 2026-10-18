import { validateUpload, checkMagic } from './schema.js';
export const REPOSITORY = 'uglyagi/bumbumtschak';
export const BRANCH = 'main';
export const CONTENT_PATH = 'data/content.json';
const ROOT = `https://api.github.com/repos/${REPOSITORY}`;
const UPLOAD_PATH = /^uploads\/[a-z0-9-]+\.(?:png|jpg|jpeg|webp|wav|mp3|m4a|ogg)$/;

export class GitHubError extends Error {
  constructor(message, status = 0) { super(message); this.status = status; }
}
export const decodeText = value => new TextDecoder().decode(Uint8Array.from(atob(value.replace(/\s/g, '')), char => char.charCodeAt(0)));

export async function fileBase64(file) {
  // Multiples of three keep independently encoded chunks valid when joined.
  const parts = [], size = 24576;
  for (let offset = 0; offset < file.size; offset += size) {
    const bytes = new Uint8Array(await file.slice(offset, offset + size).arrayBuffer());
    parts.push(btoa(String.fromCharCode(...bytes)));
  }
  return parts.join('');
}

export class GitHubStore {
  #token;
  #fetch;
  constructor(token, fetcher = globalThis.fetch.bind(globalThis)) {
    if (typeof token !== 'string' || !/^github_pat_[A-Za-z0-9_]{20,250}$/.test(token.trim())) throw new GitHubError('Bitte einen Fine-grained GitHub-Zugangsschlüssel einfügen. Er beginnt mit github_pat_.');
    this.#token = token.trim(); this.#fetch = fetcher;
  }
  logout() { this.#token = ''; }
  async request(path, { method = 'GET', body } = {}) {
    if (!this.#token) throw new GitHubError('Bitte erneut anmelden.', 401);
    if (!path.startsWith('/') || path.startsWith('//') || /[\r\n]/.test(path)) throw new GitHubError('Ungültiger GitHub-Aufruf.');
    let response;
    try {
      response = await this.#fetch(ROOT + path, {
        method, credentials: 'omit', mode: 'cors', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer',
        headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${this.#token}`, 'X-GitHub-Api-Version': '2026-03-10', ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(180000),
      });
    } catch { throw new GitHubError('GitHub ist gerade nicht erreichbar. Deine Änderungen bleiben im Entwurf erhalten.'); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = response.status === 401 ? 'Der Zugangsschlüssel ist ungültig oder abgelaufen. Bitte erneut anmelden.'
        : response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0' ? 'GitHub begrenzt gerade die Anzahl der Anfragen. Bitte später erneut versuchen.'
        : response.status === 403 ? 'GitHub erlaubt diesen Zugriff nicht. Der Schlüssel braucht für bumbumtschak bei Contents die Berechtigung Read and write.'
        : response.status === 404 ? 'Die Datei oder das Repository ist für diesen Schlüssel nicht erreichbar.'
        : [409, 422].includes(response.status) ? 'Inzwischen hat sich das Repository geändert. Bitte die aktuelle Verwaltung in einem neuen Tab öffnen und die Änderungen vergleichen.'
        : 'GitHub konnte die Änderung nicht speichern. Bitte erneut versuchen.';
      throw new GitHubError(message, response.status);
    }
    return data;
  }
  async load() {
    const ref = await this.request(`/git/ref/heads/${BRANCH}`);
    const head = ref.object.sha;
    const [commit, file] = await Promise.all([
      this.request(`/git/commits/${head}`),
      this.request(`/contents/${CONTENT_PATH}?ref=${head}`),
    ]);
    if (file.encoding !== 'base64' || !file.content) throw new GitHubError('Die Inhaltsdatei konnte nicht gelesen werden.');
    return { document: JSON.parse(decodeText(file.content)), contentSha: file.sha, head, tree: commit.tree.sha };
  }
  async publish(document, files, expectedContentSha, progress = () => {}) {
    progress('Aktuellen Stand auf GitHub prüfen …');
    const current = await this.load();
    if (current.contentSha !== expectedContentSha) throw new GitHubError('Inzwischen wurden andere Inhalte veröffentlicht. Dein Entwurf bleibt erhalten. Bitte die aktuelle Verwaltung in einem neuen Tab öffnen und die Änderungen vergleichen.', 409);
    for (const item of files) {
      if (!UPLOAD_PATH.test(item.path) || !(item.file instanceof Blob)) throw new GitHubError('Eine ausgewählte Datei ist ungültig. Bitte erneut auswählen.');
      const format = validateUpload({ filename: item.path, size: item.file.size });
      checkMagic(await item.file.slice(0, 24).arrayBuffer(), format.mime);
    }
    const listing = await this.request(`/git/trees/${current.tree}?recursive=1`);
    if (listing.truncated) throw new GitHubError('Der Dateibestand ist zu groß für eine sichere Speicherprüfung. Bitte das Repository prüfen.');
    const replaced = new Set([CONTENT_PATH, ...files.map(item => item.path)]);
    const bytes = listing.tree.filter(item => item.type === 'blob' && !replaced.has(item.path)).reduce((total, item) => total + (item.size || 0), 0)
      + files.reduce((total, item) => total + item.file.size, 0) + new TextEncoder().encode(JSON.stringify(document, null, 2) + '\n').byteLength;
    if (bytes > 900 * 1024 * 1024) throw new GitHubError('Das Speicherlimit der GitHub-Homepage ist fast erreicht. Bitte nicht mehr benötigte Dateien im Repository entfernen oder kompaktere Aufnahmen verwenden.');
    const entries = [];
    for (const [index, item] of files.entries()) {
      progress(`Datei ${index + 1} von ${files.length} zu GitHub hochladen …`);
      const blob = await this.request('/git/blobs', { method: 'POST', body: { content: await fileBase64(item.file), encoding: 'base64' } });
      entries.push({ path: item.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    progress('Inhalte mit den Dateien verbinden …');
    const content = await this.request('/git/blobs', { method: 'POST', body: { content: JSON.stringify(document, null, 2) + '\n', encoding: 'utf-8' } });
    if (!files.length && content.sha === current.contentSha) return { head: current.head, contentSha: content.sha, changed: false };
    entries.push({ path: CONTENT_PATH, mode: '100644', type: 'blob', sha: content.sha });
    const tree = await this.request('/git/trees', { method: 'POST', body: { base_tree: current.tree, tree: entries } });
    const commit = await this.request('/git/commits', { method: 'POST', body: { message: 'Bandverwaltung: Inhalte veröffentlichen', tree: tree.sha, parents: [current.head] } });
    progress('Veröffentlichung auf GitHub abschließen …');
    try {
      await this.request(`/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: { sha: commit.sha, force: false } });
    } catch (error) {
      // A lost network response must not be mistaken for a failed ref update.
      try {
        const latest = await this.load();
        if (latest.head === commit.sha || latest.contentSha === content.sha) return { head: commit.sha, contentSha: content.sha, changed: true };
      } catch { /* Keep the local draft when the final state cannot be confirmed. */ }
      throw error;
    }
    return { head: commit.sha, contentSha: content.sha, changed: true };
  }
}
