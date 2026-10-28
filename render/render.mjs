import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { compile as markdown } from 'mdsvex';
import { compile as svelte } from 'svelte/compiler';
import { render } from 'svelte/server';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../support-kb');
const src = path.join(root, 'src');
const out = path.join(root, 'rendered');

async function files(dir) {
  return (await Promise.all((await readdir(dir, { withFileTypes: true })).map((entry) => {
    const name = path.join(dir, entry.name);
    return entry.isDirectory() ? files(name) : [name];
  }))).flat().sort();
}

const pages = (await files(path.join(src, 'routes/kb'))).filter((name) => name.endsWith('+page.svx'));
const tenants = (await files(path.join(src, 'lib/data/tenants'))).filter((name) => name.endsWith('.json'));
const warnings = [];
const plugin = {
  name: 'kb-export',
  setup(builder) {
    builder.onResolve({ filter: /^#lib\// }, (args) => builder.resolve(args.path.replace('#lib/', `${src}/lib/`), { resolveDir: args.resolveDir, kind: args.kind }));
    builder.onLoad({ filter: /\.(svelte|svx|ts)$/ }, async (args) => {
      let source = await readFile(args.path, 'utf8');
      if (args.path.endsWith('locales.ts')) {
        source = tenants.map((name, i) => `import tenant${i} from ${JSON.stringify(name)};`).join('\n') + '\n' + source.replace(
          /import\.meta\.glob<Tenant>\([^)]*\)/,
          `{${tenants.map((name, i) => `${JSON.stringify(name)}:tenant${i}`).join(',')}}`,
        );
      }
      if (args.path.endsWith('KbIndex.svelte')) {
        const nested = pages.filter((name) => path.dirname(name) !== path.join(src, 'routes/kb'));
        const imports = nested.map((name, i) => `import * as page${i} from ${JSON.stringify(name)};`).join('\n');
        source = source.replace('<script lang="ts">', `<script lang="ts">\n${imports}`)
          .replace(/import\.meta\.glob<\{ metadata: Meta \}>\([^)]*\)/,
            `{${nested.map((name, i) => `${JSON.stringify(name.replace(root, ''))}:page${i}`).join(',')}}`);
      }
      if (args.path.endsWith('.svx')) {
        source = (await markdown(source, { filename: args.path, layout: { runbook: path.join(src, 'lib/layouts/runbook.svelte') } })).code;
      }
      if (args.path.endsWith('.ts')) return { contents: source, loader: 'ts' };
      const compiled = svelte(source, { filename: args.path, generate: 'server', css: 'injected' });
      warnings.push(...compiled.warnings.map((warning) => ({ file: args.path.replace(root, ''), code: warning.code, message: warning.message })));
      return { contents: compiled.js.code, loader: 'js', resolveDir: path.dirname(args.path) };
    });
  },
};

await mkdir(out, { recursive: true });
await build({
  stdin: { contents: pages.map((name, i) => `export {default as page${i}} from ${JSON.stringify(name)};`).join('\n'), resolveDir: here },
  outfile: path.join(here, 'kb-compiled.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  plugins: [plugin],
});
const compiled = await import(pathToFileURL(path.join(here, 'kb-compiled.mjs')));
for (const [i, name] of pages.entries()) {
  const result = render(compiled[`page${i}`]);
  const route = path.dirname(name).replace(path.join(src, 'routes/'), '');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${result.head}</head><body>${result.body}</body></html>`;
  const target = path.join(out, route, 'index.html');
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, html);
  console.log(`${route} → ${path.relative(root, target)}`);
}
await writeFile(path.join(here, 'compile-warnings.json'), JSON.stringify(warnings, null, 2) + '\n');
console.log(`Compiler warnings: ${warnings.length}`);
