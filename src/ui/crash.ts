import { t } from '../i18n';

let shown = false;
/** What the mode keeps before the card shows (the Arcade records the run so far); its answer is the card's line, or null for the usual one. */
let keep: (() => string | null) | null = null;
export function onCrashKeep(fn: () => string | null): void { keep = fn; }

/** A calm card for an error nothing else caught. The save is untouched; Reload is the way back. */
/** One short line about what broke: the message and the first frame of the stack, for a screenshot to carry. */
function detailOf(err: unknown): string {
  const e = err instanceof Error ? err : null;
  const msg = (e ? `${e.name}: ${e.message}` : String(err ?? '')).slice(0, 140);
  const at = e?.stack?.split('\n').map((l) => l.trim()).find((l) => /\.(ts|js)/.test(l) && !l.startsWith(e.name)) ?? '';
  const where = at.replace(/^at\s+/, '').replace(/https?:\/\/[^/]+\//, '').replace(/\?[^:)]*/, '').slice(0, 90);
  return where ? `${msg} · ${where}` : msg;
}

function showCrash(err?: unknown): void {
  if (shown) return;
  shown = true;
  const card = document.createElement('div');
  card.id = 'crash';
  card.setAttribute('role', 'alertdialog');
  card.setAttribute('aria-labelledby', 'crash-h');
  const panel = document.createElement('div');
  panel.className = 'ng crash-card';
  const h = document.createElement('h2');
  h.id = 'crash-h';
  h.textContent = t('Something went wrong');
  const p = document.createElement('p');
  let line: string | null = null;
  try { line = keep?.() ?? null; } catch { line = null; }
  p.textContent = line ?? t('Your save is safe. Reload to carry on.');
  const go = document.createElement('button');
  go.className = 'ng-n red';
  go.textContent = t('Reload');
  go.addEventListener('click', () => location.reload());
  const why = document.createElement('code');
  why.className = 'crash-why';
  why.textContent = detailOf(err);
  try { localStorage.setItem('wayward.lastCrash', `${new Date().toISOString()} ${why.textContent}`); } catch { /* no storage */ }
  panel.append(h, p, why, go);
  card.append(panel);
  document.body.append(card);
  go.focus();
}

/** Log, then show the card once. Called for uncaught errors and unhandled rejections. */
export function installCrashCard(): void {
  window.addEventListener('error', (e) => {
    // a missing picture fires 'error' on the element, not here: ignore resource errors
    if (!(e instanceof ErrorEvent)) return;
    // Chrome reports a harmless ResizeObserver notice here; it is not a crash
    if (/^ResizeObserver loop/.test(e.message)) return;
    console.error('Uncaught error:', e.error ?? e.message);
    showCrash(e.error ?? e.message);
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled rejection:', e.reason);
    showCrash(e.reason);
  });
}
