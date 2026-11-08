// 世界树图书馆 - 静态引用分析器
// 用途：1) 校验所有相对 import 的目标文件存在  2) 校验命名导入确实被导出  3) 从入口做可达性分析，列出死文件
// 用法：node analyze.mjs <插件根目录> [入口文件...]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 不传参数时默认用本脚本所在的插件根目录（tools/ 的上一级），跟 cwd 无关
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.argv[2] || path.join(scriptDir, '..'));
if (!root) {
  console.error('用法: node analyze.mjs [插件根目录]');
  process.exit(2);
}
const entries = process.argv.slice(3).length
  ? process.argv.slice(3)
  : ['js/main.js'];

const abs = (p) => path.resolve(root, p);
const rel = (p) => path.relative(root, p).replace(/\\/g, '/');

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (name.endsWith('.js')) out.push(full);
  }
  return out;
}

// 匹配 import ... from '...' / import('...') / export ... from '...'
const RE_FROM = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s*['"]([^'"]+)['"]/g;
const RE_DYN = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;
// 收命名导入 { a, b as c }
const RE_NAMED = /import\s*(?:[\w*]+\s*,\s*)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
const RE_NS = /import\s+\*\s+as\s+\w+\s+from\s*['"]([^'"]+)['"]/g;

function exportsOf(src) {
  const set = new Set();
  for (const m of src.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/g)) set.add(m[1]);
  for (const m of src.matchAll(/export\s+(?:const|let|var|class)\s+([A-Za-z0-9_$]+)/g)) set.add(m[1]);
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of m[1].split(',')) {
      const t = part.trim();
      if (!t) continue;
      const as = t.split(/\s+as\s+/);
      set.add((as[1] || as[0]).trim());
    }
  }
  if (/export\s+default\b/.test(src)) set.add('default');
  return set;
}

const files = walk(abs('js'));
const fileSet = new Set(files);
const srcCache = new Map();
const getSrc = (f) => {
  if (!srcCache.has(f)) srcCache.set(f, fs.readFileSync(f, 'utf8'));
  return srcCache.get(f);
};

let missingTargets = [];
let missingSymbols = [];
const edges = new Map();

for (const file of files) {
  const src = getSrc(file);
  const deps = new Set();
  for (const re of [RE_FROM, RE_DYN]) {
    for (const m of src.matchAll(re)) {
      const spec = m[1];
      if (!spec.startsWith('.')) continue;
      const target = path.resolve(path.dirname(file), spec);
      if (!fileSet.has(target)) {
        missingTargets.push(`${rel(file)} -> ${spec}`);
        continue;
      }
      deps.add(target);
    }
  }
  for (const m of src.matchAll(RE_NAMED)) {
    const [, names, spec] = m;
    if (!spec.startsWith('.')) continue;
    const target = path.resolve(path.dirname(file), spec);
    if (!fileSet.has(target)) continue;
    const ex = exportsOf(getSrc(target));
    for (const part of names.split(',')) {
      const t = part.trim();
      if (!t) continue;
      const name = t.split(/\s+as\s+/)[0].trim();
      if (!name) continue;
      if (!ex.has(name)) missingSymbols.push(`${rel(file)} -> ${name} from ${spec}`);
    }
  }
  edges.set(file, deps);
}

// 可达性
const reachable = new Set();
const stack = entries.map(abs);
for (const f of stack) if (fileSet.has(f)) reachable.add(f);
while (stack.length) {
  const f = stack.pop();
  for (const d of edges.get(f) || []) {
    if (!reachable.has(d)) {
      reachable.add(d);
      stack.push(d);
    }
  }
}

const dead = files.filter((f) => !reachable.has(f));
const lines = (f) => getSrc(f).split('\n').length;

console.log(`文件总数 ${files.length}，从 ${entries.join(', ')} 可达 ${reachable.size}，不可达 ${dead.length}`);
if (missingTargets.length) {
  console.log(`\n[路径断裂] ${missingTargets.length} 处`);
  missingTargets.forEach((x) => console.log('  ' + x));
} else console.log('\n[路径断裂] 无');

if (missingSymbols.length) {
  console.log(`\n[命名导入对不上] ${missingSymbols.length} 处`);
  missingSymbols.slice(0, 40).forEach((x) => console.log('  ' + x));
  if (missingSymbols.length > 40) console.log(`  ...另 ${missingSymbols.length - 40} 处`);
} else console.log('[命名导入对不上] 无');

if (dead.length) {
  console.log(`\n[不可达文件] 合计 ${dead.reduce((a, f) => a + lines(f), 0)} 行`);
  dead
    .map((f) => [lines(f), rel(f)])
    .sort((a, b) => b[0] - a[0])
    .forEach(([n, f]) => console.log(`  ${String(n).padStart(5)}  ${f}`));
}

process.exit(missingTargets.length || missingSymbols.length ? 1 : 0);
