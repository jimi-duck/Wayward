import { t } from '../i18n';

let shown = false;

/** A calm card for an error nothing else caught. The save is untouched; Reload is the way back. */
function showCrash(): void {
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
  p.textContent = t('Your save is safe. Reload to carry on.');
  const go = document.createElement('button');
  go.className = 'ng-n red';
  go.textContent = t('Reload');
  go.addEventListener('click', () => location.reload());
  panel.append(h, p, go);
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
    showCrash();
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled rejection:', e.reason);
    showCrash();
  });
}
