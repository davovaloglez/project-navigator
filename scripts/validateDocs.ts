import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname, relative } from 'node:path';

const ROOT = process.cwd();
const DOCS = join(ROOT, 'documentation');

function walk(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.md')) acc.push(p);
  }
  return acc;
}

function stripCode(s: string): string {
  return s.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');
}

const LINK_RE = /(?<!\!)\[([^\]]*)\]\(([^)]+)\)/g;
const broken: { file: string; target: string }[] = [];

for (const file of walk(DOCS)) {
  const src = stripCode(readFileSync(file, 'utf8'));
  const dir = dirname(file);
  let m: RegExpExecArray | null;
  while ((m = LINK_RE.exec(src)) !== null) {
    const target = m[2].trim();
    if (/^(https?:|mailto:|#)/i.test(target)) continue;
    const pathPart = target.split('#')[0].split('?')[0];
    if (!pathPart) continue;
    const resolved = resolve(dir, pathPart);
    if (!existsSync(resolved)) broken.push({ file: relative(ROOT, file), target });
  }
}

if (broken.length === 0) {
  console.log('OK');
  process.exit(0);
} else {
  console.error('Broken links found:', broken);
  process.exit(1);
}
