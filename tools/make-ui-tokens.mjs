// Writes src/styles/tokens.css from the `ui` section of brand/system/tokens.json.
// Run with `npm run tokens` after changing a colour; tests/ui-tokens.test.ts fails if they drift.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('..', import.meta.url);
export function uiTokensCss(json) {
  const lines = [
    '/* Generated from brand/system/tokens.json (`ui`) by tools/make-ui-tokens.mjs. Do not edit; run `npm run tokens`. */',
    ':root {',
  ];
  for (const t of json.ui.tokens) {
    const h = t.value.toLowerCase();
    const rgb = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ');
    lines.push(`  --${t.name}: ${h};`, `  --${t.name}-rgb: ${rgb};`);
  }
  lines.push('}', '');
  return lines.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const json = JSON.parse(readFileSync(new URL('brand/system/tokens.json', root), 'utf8'));
  writeFileSync(new URL('src/styles/tokens.css', root), uiTokensCss(json));
  console.log(`wrote src/styles/tokens.css (${json.ui.tokens.length} tokens)`);
}
