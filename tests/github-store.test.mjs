import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { GitHubStore, fileBase64, decodeText } from '../verwaltung/github-store.js';
import { validateContent, validateUpload, checkMagic, localToISO } from '../verwaltung/schema.js';
import { draftPreview, fileReferences } from '../verwaltung/drafts.js';
import { RepositoryFixture, TEST_TOKEN } from './github-fixture.mjs';
const defaults = JSON.parse(await readFile(new URL('../data/content.json', import.meta.url)));
const recording = new Uint8Array(50003); recording.set(new TextEncoder().encode('RIFF')); recording.set(new TextEncoder().encode('WAVE'), 8);
const setup = () => { const repo = new RepositoryFixture(defaults); return { repo, store: new GitHubStore(TEST_TOKEN, repo.fetch) }; };

test('UTF-8 and multi-chunk audio bytes survive GitHub base64 encoding', async () => {
  const encoded = await fileBase64(new Blob([recording]));
  assert.deepEqual(Buffer.from(encoded, 'base64'), Buffer.from(recording));
  assert.equal(decodeText(Buffer.from('Für Große 🎵').toString('base64')), 'Für Große 🎵');
});
test('files and edited content become visible in one commit and preserve other files', async () => {
  const { repo, store } = setup(), original = await store.load();
  repo.amend('README.md', Buffer.from('An independent code change'));
  const document = structuredClone(defaults); document.info.texts.grown_title = 'Für Große 🎵 & Kleine';
  document.tracks[0].src = 'uploads/test-recording.wav';
  const result = await store.publish(validateContent(document), [{ path: document.tracks[0].src, file: new Blob([recording]) }], original.contentSha);
  assert(result.changed); assert.equal(repo.head, result.head);
  assert.equal(repo.document().info.texts.grown_title, document.info.texts.grown_title);
  assert.deepEqual(repo.blobs.get(repo.currentTree().get(document.tracks[0].src)), Buffer.from(recording));
  assert.equal(repo.blobs.get(repo.currentTree().get('README.md')).toString(), 'An independent code change');
  const patches = repo.requests.filter(r => r.method === 'PATCH'); assert.equal(patches.length, 1);
  assert.equal(repo.commits.get(result.head).parents.length, 1);
});
test('concurrent content changes stop publishing before any upload', async () => {
  const { repo, store } = setup(), loaded = await store.load();
  const other = structuredClone(defaults); other.info.tagline = 'Someone else published';
  repo.amend('data/content.json', Buffer.from(JSON.stringify(other)));
  await assert.rejects(store.publish(defaults, [], loaded.contentSha), { status: 409 });
  assert(!repo.requests.some(r => r.method === 'POST'));
  assert.equal(repo.document().info.tagline, 'Someone else published');
});
test('a branch race cannot overwrite another commit', async () => {
  const { repo, store } = setup(), loaded = await store.load();
  const document = structuredClone(defaults); document.info.tagline = 'Our pending edit';
  repo.beforeRef = () => repo.amend('README.md', Buffer.from('A last-moment change'));
  await assert.rejects(store.publish(document, [], loaded.contentSha), { status: 422 });
  assert.equal(repo.document().info.tagline, defaults.info.tagline);
  assert.equal(repo.blobs.get(repo.currentTree().get('README.md')).toString(), 'A last-moment change');
});
test('failed uploads leave the published file unchanged', async () => {
  const { repo, store } = setup(), loaded = await store.load(); repo.failBlob = true;
  await assert.rejects(store.publish(defaults, [{ path: 'uploads/test.wav', file: new Blob([recording]) }], loaded.contentSha));
  assert.equal(repo.currentContentSha(), loaded.contentSha);
  assert(!repo.requests.some(r => r.method === 'PATCH'));
});
test('a lost final response is checked before reporting publication failure', async () => {
  const { repo, store } = setup(), loaded = await store.load(); repo.loseRefResponse = true;
  const document = structuredClone(defaults); document.info.tagline = 'Published despite a lost response';
  const result = await store.publish(document, [], loaded.contentSha);
  assert.equal(repo.head, result.head); assert.equal(repo.document().info.tagline, document.info.tagline);
});
test('no-op publishing does not create a new revision', async () => {
  const { repo, store } = setup(), loaded = await store.load();
  const result = await store.publish(defaults, [], loaded.contentSha);
  assert.equal(result.changed, false); assert.equal(repo.head, loaded.head);
});
test('site storage and file signatures are checked before any writes', async () => {
  const { repo, store } = setup(), loaded = await store.load(); repo.extraBytes = 900 * 1024 * 1024;
  await assert.rejects(store.publish(defaults, [], loaded.contentSha), /Speicherlimit/);
  assert(!repo.requests.some(r => r.method === 'POST'));
  repo.extraBytes = 0;
  await assert.rejects(store.publish(defaults, [{ path: 'uploads/not-a-wave.wav', file: new Blob(['<html>not music</html>']) }], loaded.contentSha), /Dateiinhalt/);
  assert(!repo.requests.some(r => r.method === 'POST'));
});
test('access keys are private and logout stops further authenticated calls', async () => {
  const { repo, store } = setup();
  assert.equal(JSON.stringify(store), '{}');
  store.logout(); await assert.rejects(store.load(), { status: 401 });
  assert.equal(repo.requests.length, 0);
  assert.throws(() => new GitHubStore('an account password', repo.fetch));
});
test('local preview uses staged files without changing the published document', () => {
  const document = structuredClone(defaults); document.tracks[0].src = 'uploads/test.wav'; document.info.members[0].image = 'uploads/panda.png';
  const draft = { document, files: [{ path: 'uploads/test.wav', file: new Blob([recording]) }, { path: 'uploads/panda.png', file: new Blob(['test']) }] };
  let index = 0; const preview = draftPreview(draft, () => `blob:preview-${index++}`);
  assert.equal(preview.tracks[0].src, 'blob:preview-0'); assert.equal(preview.info.members[0].image, 'blob:preview-1');
  assert.equal(document.tracks[0].src, 'uploads/test.wav');
  assert(fileReferences(document).has('uploads/panda.png'));
});
test('all editable content is validated, with GitHub-local paths and supported audio', () => {
  const document = structuredClone(defaults); document.tracks[0].src = 'uploads/test.mp3';
  assert.equal(validateContent(document).tracks[0].src, 'uploads/test.mp3');
  document.tracks[0].src = '/api/media/12345678-1234-1234-1234-123456789012'; assert.throws(() => validateContent(document));
  assert.throws(() => validateUpload({ filename: 'too-big.wav', size: 50 * 1024 * 1024 + 1 }));
  assert.equal(validateUpload({ filename: 'my-song.MP3', size: 30 }).mime, 'audio/mpeg');
  checkMagic(new Uint8Array([73, 68, 51, ...Array(20).fill(0)]).buffer, 'audio/mpeg');
  assert.equal(localToISO('2027-07-15T18:00'), '2027-07-15T16:00:00.000Z');
  document.tracks[0].src = ''; document.info.texts.grown_title = 'x'.repeat(5000); assert.throws(() => validateContent(document));
});
