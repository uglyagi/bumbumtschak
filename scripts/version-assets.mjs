import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = fileURLToPath(new URL('../', import.meta.url));
export const importsIn = source => [...source.matchAll(/\b(?:from\s*|import\s*)['"]([^'"]+)['"]/g)].map(match => match[1]);

export async function browserModules(root = projectRoot) {
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
  await visit(resolve(root, 'app.js'));
  return new Map([...modules].sort(([a], [b]) => a.localeCompare(b, 'en')));
}

export function versionedPage(page, modules, stylesheet) {
  const hash = createHash('sha256');
  for (const [name, source] of modules) hash.update(name + '\0' + source + '\0');
  const version = hash.update(stylesheet).digest('hex').slice(0, 16);
  // The import map applies to nested imports too. A new entry script alone
  // would still reuse cached room/art modules and their shared content state.
  const imports = Object.fromEntries([...modules.keys()].map(name => [`./${name}`, `./${name}?v=${version}`]));
  const block = `  <!-- versioned-game-assets -->\n  <script type="importmap">${JSON.stringify({ imports }, null, 2)}</script>\n  <script type="module" src="app.js?v=${version}"></script>\n  <!-- /versioned-game-assets -->`;
  return page
    .replace(/href="styles\.css(?:\?[^\"]*)?"/, `href="styles.css?v=${version}"`)
    .replace(/  <!-- versioned-game-assets -->[\s\S]*?<!-- \/versioned-game-assets -->|  <script type="module" src="app\.js(?:\?[^\"]*)?"><\/script>/, block);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [page, modules, stylesheet] = await Promise.all([
    readFile(resolve(projectRoot, 'index.html'), 'utf8'), browserModules(), readFile(resolve(projectRoot, 'styles.css'), 'utf8'),
  ]);
  await writeFile(resolve(projectRoot, 'index.html'), versionedPage(page, modules, stylesheet));
  console.log('Programmdateien und Stylesheet verwenden jetzt dieselbe aktuelle Version.');
}
