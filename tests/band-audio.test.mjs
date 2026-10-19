import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { bandMembers } from '../band-defaults.js';
import { validateContent } from '../verwaltung/schema.js';
import { draftPreview, fileReferences } from '../verwaltung/drafts.js';
import { BAND, applyContent } from '../content.js';
const original = JSON.parse(await readFile(new URL('../data/content.json', import.meta.url), 'utf8'));

test('legacy members gain optional audio, unsafe audio is rejected and each melody reaches its public member', () => {
  const legacy = structuredClone(original);
  for (const member of legacy.info.members || []) delete member.audio;
  const data = validateContent(legacy);
  assert(data.info.members.every(member => member.audio === ''));
  data.info.members.forEach(member => { member.audio = `uploads/${member.id}.mp3`; });
  const valid = validateContent(data); applyContent(valid);
  for (const member of BAND) assert(member.audio.endsWith(`uploads/${member.id}.mp3`));
  data.info.members[0].audio = 'javascript:alert(1)'; assert.throws(() => validateContent(data), /https/);
  applyContent(original);
});

test('all three melody files are retained for atomic publishing and replaced only in local preview', () => {
  const data = structuredClone(original); data.info.members = bandMembers(data.info.members);
  const files = data.info.members.map(member => { member.audio = `uploads/${member.id}.wav`; return { path: member.audio, file: new Blob(['RIFF WAVE ' + member.id]) }; });
  const refs = fileReferences(data); for (const { path } of files) assert(refs.has(path));
  let index = 0; const preview = draftPreview({ document: data, files }, () => 'blob:local-member-' + index++);
  assert.equal(new Set(preview.info.members.map(member => member.audio)).size, 3);
  assert(preview.info.members.every(member => member.audio.startsWith('blob:local-member-')));
  assert(data.info.members.every(member => member.audio.startsWith('uploads/')));
});
