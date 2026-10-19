import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const importsIn = source => [...source.matchAll(/\b(?:from\s*|import\s*)['"]([^'"]+)['"]/g)].map(match => match[1]);

export async function browserModules(root = projectRoot, entry = 'app.js') {
  const modules = new Map();
  async function visit(path) {
    const name = relative(root, path).split('\\').join('/');
    if (name.startsWith('../')) throw new Error('Ein Programmimport liegt außerhalb der Homepage.');
    if (modules.has(name)) return;
    const source = await readFile(path, 'utf8');
    modules.set(name, source);
    for (const specifier of importsIn(source)) {
      if (specifier.startsWith('.')) await visit(resolve(dirname(path), specifier));
    }
  }
  await visit(resolve(root, entry));
  return new Map([...modules].sort(([a], [b]) => a.localeCompare(b, 'en')));
}

export function versionedPage(page, modules, stylesheet, { entry = 'app.js', prefix = './', csp = false } = {}) {
  const hash = createHash('sha256');
  for (const [name, source] of modules) hash.update(name + '\0' + source + '\0');
  const version = hash.update(stylesheet).digest('hex').slice(0, 16);
  // The import map applies to nested imports too. A new entry script alone
  // would still reuse cached room/art modules and their shared content state.
  const imports = Object.fromEntries([...modules.keys()].map(name => [`${prefix}${name}`, `${prefix}${name}?v=${version}`]));
  const map = JSON.stringify({ imports }, null, 2);
  const block = `  <!-- versioned-game-assets -->\n  <script type="importmap">${map}</script>\n  <script type="module" src="${entry}?v=${version}"></script>\n  <!-- /versioned-game-assets -->`;
  const script = entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let result = page
    .replace(/href="styles\.css(?:\?[^\"]*)?"/, `href="styles.css?v=${version}"`)
    .replace(new RegExp(`  <!-- versioned-game-assets -->[\\s\\S]*?<!-- /versioned-game-assets -->|  <script type="module" src="${script}(?:\\?[^\"]*)?"><\\/script>`), block);
  if (csp) {
    const digest = createHash('sha256').update(map).digest('base64');
    result = result.replace(/script-src ([^;]+)/, (_, sources) => `script-src ${sources.replace(/ 'sha256-[^']+'/g, '')} 'sha256-${digest}'`);
  }
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const directory of ['', 'verwaltung/']) {
    const [page, modules, stylesheet] = await Promise.all([
      readFile(resolve(projectRoot, directory + 'index.html'), 'utf8'), browserModules(projectRoot, directory ? 'verwaltung/admin.js' : 'app.js'), readFile(resolve(projectRoot, directory + 'styles.css'), 'utf8'),
    ]);
    await writeFile(resolve(projectRoot, directory + 'index.html'), versionedPage(page, modules, stylesheet, directory ? { entry: 'admin.js', prefix: '../', csp: true } : {}));
  }
  console.log('Programmdateien und Stylesheet verwenden jetzt dieselbe aktuelle Version.');
}
