// Savollar bazasidan botning kunlik viktorinasi uchun ixcham fayl yaratadi: node tools/gen-qbank.mjs
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), js = path.join(here, '../../js');
globalThis.window = globalThis; globalThis.document = {};
for (const f of ['config', 'signs', 'questions', 'questions-hard', 'questions-gen', 'questions-final', 'questions-official', 'explain-data']) (0, eval)(fs.readFileSync(path.join(js, f + '.js'), 'utf8'));
const cut = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; const t = s.slice(0, n - 1); const i = Math.max(t.lastIndexOf('. '), t.lastIndexOf('; ')); return (i > n * 0.5 ? t.slice(0, i + 1) : t.slice(0, t.lastIndexOf(' ')) + '…'); };
const out = []; let skip = 0;
for (const q of BANK.Q) {
  if (!q.official || q.options.length < 2 || q.options.length > 10) continue;
  const opts = q.options.map(o => String(o.label || '').trim());
  if (opts.some(o => !o)) { skip++; continue; }
  out.push([q.n, q.text, opts, q.answer, q.kind === 'photo' ? 1 : 0, cut(window.EXPL && window.EXPL[q.n], 195)]);
}
fs.writeFileSync(path.join(here, '../qbank.js'), '// avtomatik yaratilgan: node tools/gen-qbank.mjs  (n, savol, variantlar, to\'g\'ri indeks, rasm bor, tushuntirish)\nexport default ' + JSON.stringify(out) + ';\n');
console.log('savol', out.length, 'o\'tkazib yuborilgan', skip);
