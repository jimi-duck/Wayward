import { createServer, parseAst } from 'vite';
import fs from 'fs'; import path from 'path';
const NUM = /\d+(?:[.,]\d+)*/g;
const plain = await createServer({ root: process.cwd(), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const de = (await plain.ssrLoadModule('/src/i18n/de/index.ts')).DE; await plain.close();
const hasKey = (x) => x in de || x.replace(NUM, '{#}') in de;
const O = '⁣', C = '⁤';  // invisible separators
const plugin = { name: 'mark', enforce: 'pre', transform(code, id) {
  if (!/\/src\/content\/[^/]+\.ts$/.test(id)) return null;
  const ast = parseAst(code, { lang: 'ts' });
  const edits = [];
  const visit = (n, parent, key) => {
    if (!n || typeof n.type !== 'string') return;
    const isStr = (n.type === 'Literal' && typeof n.value === 'string') || (n.type === 'TemplateLiteral' && n.expressions.length === 0 && n.quasis.length === 1);
    if (isStr) {
      const text = n.type === 'Literal' ? n.value : n.quasis[0].value.cooked;
      const pt = parent?.type;
      const skip = pt === 'ImportDeclaration' || pt === 'ExportAllDeclaration' || pt === 'ExportNamedDeclaration' || pt === 'TSLiteralType' || pt === 'TSImportType' || (pt === 'Property' && key === 'key' && !parent.computed) || pt === 'PropertyDefinition' && key === 'key' || pt === 'MemberExpression' || pt === 'SwitchCase' || pt === 'TSPropertySignature' || pt === 'TSEnumMember' || (pt === 'BinaryExpression' && /^(===|!==|==|!=|in)$/.test(parent.operator));
      if (!skip && hasKey(text)) edits.push([n.start, n.end, JSON.stringify(`${O}${path.basename(id)}@${n.start}:${n.end}${C}` + text)]);
      return;
    }
    for (const k of Object.keys(n)) { const v = n[k]; if (Array.isArray(v)) v.forEach((c) => visit(c, n, k)); else if (v && typeof v === 'object') visit(v, n, k); }
  };
  visit(ast, null, null);
  let out = code; for (const [a, b, r] of edits.sort((x, y) => y[0] - x[0])) out = out.slice(0, a) + r + out.slice(b);
  return { code: out, map: null };
} };
const s = await createServer({ root: process.cwd(), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', plugins: [plugin] });
const MARK = new RegExp(`${O}([^${C}]+)${C}`, 'g');
const strip = (x) => x.replace(MARK, '');
const walk = (v, p, emit, depth = 0, stack = new Set()) => {
  if (v == null || depth > 12) return;
  if (typeof v === 'string') { const ms = [...v.matchAll(MARK)].map((m) => m[1]); const t = strip(v); if (ms.length && /[A-Za-z]{2}/.test(t) && hasKey(t)) emit(p, t, ms, v.startsWith(O) && ms.length === 1 && v.indexOf(C) === v.length - t.length - 1); return; }
  if (typeof v !== 'object') return;
  if (stack.has(v)) return; stack.add(v);
  if (v instanceof Set) { stack.delete(v); return; }
  if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${x && typeof x === 'object' && (x.id ?? x.key) != null ? strip(String(x.id ?? x.key)) : i}]`, emit, depth + 1, stack));
  else for (const [k, x] of Object.entries(v)) {
    if (typeof x === 'string' && (k in de) && !(strip(x) in de)) emit(`${p}.${k}`, k, [], false);
    walk(x, p ? `${p}.${k}` : k, emit, depth + 1, stack);
  }
  stack.delete(v);
};
const out = {};
for (const f of fs.readdirSync('src/content').filter((f) => f.endsWith('.ts')).sort()) {
  const m = await s.ssrLoadModule('/src/content/' + f);
  const rows = [];
  for (const [name, val] of Object.entries(m)) { if (typeof val === 'function') continue; walk(val, name, (p, t, ms, pure) => rows.push({ p, t, ms, pure })); }
  out[f] = rows;
}
fs.writeFileSync(process.argv[2], JSON.stringify(out));
await s.close();
