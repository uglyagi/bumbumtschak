import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

export const TEST_TOKEN = 'github_' + 'pat_' + 'x'.repeat(30);
export const gitBlob = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
export class RepositoryFixture {
  constructor(document) {
    this.blobs = new Map(); this.trees = new Map(); this.commits = new Map(); this.requests = [];
    this.serial = 0; this.beforeRef = null; this.failBlob = false; this.loseRefResponse = false; this.extraBytes = 0;
    const content = this.blob(Buffer.from(JSON.stringify(document, null, 2) + '\n'));
    const tree = this.tree(new Map([['data/content.json', content], ['README.md', this.blob(Buffer.from('Existing notes'))]]));
    this.head = this.commit(tree, []);
    this.fetch = this.fetch.bind(this);
  }
  sha() { return createHash('sha1').update('fixture-' + this.serial++).digest('hex'); }
  blob(bytes) { const sha = gitBlob(bytes); this.blobs.set(sha, bytes); return sha; }
  tree(entries) { const sha = this.sha(); this.trees.set(sha, entries); return sha; }
  commit(tree, parents) { const sha = this.sha(); this.commits.set(sha, { sha, tree: { sha: tree }, parents }); return sha; }
  currentTree() { return this.trees.get(this.commits.get(this.head).tree.sha); }
  currentContentSha() { return this.currentTree().get('data/content.json'); }
  document() { return JSON.parse(this.blobs.get(this.currentContentSha()).toString('utf8')); }
  amend(path, bytes) {
    const entries = new Map(this.currentTree()); entries.set(path, this.blob(bytes));
    this.head = this.commit(this.tree(entries), [this.head]);
  }
  async fetch(url, options) {
    const root = 'https://api.github.com/repos/uglyagi/bumbumtschak';
    assert(url.startsWith(root + '/'));
    assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, `Bearer ${TEST_TOKEN}`);
    const path = url.slice(root.length), method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : null;
    assert(!options.body?.includes(TEST_TOKEN));
    this.requests.push({ path, method, body });
    if (path === '/git/ref/heads/main') return Response.json({ object: { sha: this.head } });
    if (path.startsWith('/git/commits/') && method === 'GET') return Response.json(this.commits.get(path.split('/').at(-1)));
    if (path.startsWith('/contents/data/content.json?ref=')) {
      const head = new URL(url).searchParams.get('ref');
      const sha = this.trees.get(this.commits.get(head).tree.sha).get('data/content.json');
      return Response.json({ sha, encoding: 'base64', content: this.blobs.get(sha).toString('base64') });
    }
    if (path.startsWith('/git/trees/') && method === 'GET') {
      const sha = path.split('/').at(-1).split('?')[0];
      const tree = [...this.trees.get(sha)].map(([path, sha]) => ({ path, sha, type: 'blob', size: this.blobs.get(sha).length }));
      if (this.extraBytes) tree.push({ path: 'uploads/older.mp3', type: 'blob', size: this.extraBytes });
      return Response.json({ tree, truncated: false });
    }
    if (path === '/git/blobs' && method === 'POST') {
      if (this.failBlob) return Response.json({}, { status: 500 });
      const bytes = Buffer.from(body.content, body.encoding === 'base64' ? 'base64' : 'utf8');
      return Response.json({ sha: this.blob(bytes) }, { status: 201 });
    }
    if (path === '/git/trees' && method === 'POST') {
      const entries = new Map(this.trees.get(body.base_tree));
      for (const item of body.tree) { assert.equal(item.mode, '100644'); assert.equal(item.type, 'blob'); entries.set(item.path, item.sha); }
      return Response.json({ sha: this.tree(entries) }, { status: 201 });
    }
    if (path === '/git/commits' && method === 'POST') return Response.json({ sha: this.commit(body.tree, body.parents) }, { status: 201 });
    if (path === '/git/refs/heads/main' && method === 'PATCH') {
      assert.equal(body.force, false);
      this.beforeRef?.(); this.beforeRef = null;
      const commit = this.commits.get(body.sha);
      if (!commit.parents.includes(this.head)) return Response.json({}, { status: 422 });
      this.head = body.sha;
      if (this.loseRefResponse) throw new Error('simulated lost response');
      return Response.json({ object: { sha: this.head } });
    }
    throw new Error(`Unexpected test request: ${method} ${path}`);
  }
}
