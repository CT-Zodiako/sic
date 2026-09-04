import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const roots = ['backend', 'frontend'];
const files = [];

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    if (entry.isFile() && path.endsWith('.ts')) files.push(path);
  }
}

for (const root of roots) await collect(root);
const invalid = [];
for (const file of files) {
  const content = await readFile(file, 'utf8');
  if (/[ \t]+$/m.test(content) || !content.endsWith('\n')) invalid.push(file);
}
if (invalid.length) {
  console.error(`Formatting violations: ${invalid.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`Linted ${files.length} TypeScript files.`);
}
