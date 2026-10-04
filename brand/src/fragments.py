"""Shared pieces for the Wayward design system: icons, the wordmark
and mark as inline SVG bound to tokens, card schematics and the scene painter
the screen previews draw their backdrop with."""
import math, sys, urllib.parse
sys.path.insert(0, '.')
from glyphs import word

FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com">'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Antonio:wght@400;600;700'
         '&family=Martian+Mono:wdth,wght@75..112.5,300..700&family=Tektur:wdth,wght@75..100,400..900&display=swap">')

# ── icons: 24 grid, 1.75 stroke, square caps, miter joins, 45° only ──────
ICONS = {
  'weapons':    ('Weapons category; laser figures.', 'M3 9h4v6H3z M7 12h14 M7 10l13-4 M7 14l13 4'),
  'defence':    ('Defence category; shields.', 'M12 3l8 3v7l-3 5-5 3-5-3-3-5V6z'),
  'ship':       ('Ship category; drive and helm.', 'M12 3l7 18-7-5-7 5z'),
  'hull':       ('A hull plate; damage control.', 'M7 4h13v13l-3 3H4V7z M8 10h8'),
  'krail':  ('Krail (XP) and the refit rail.', 'M12 2l6 5v10l-6 5-6-5V7z M6 7l6 4 6-4 M12 11v11'),
  'overcharge': ('The overcharge gauge and Release.', 'M13 2L5 14h6l-1 8 8-12h-6l1-8z'),
  'chain':      ('The kill-chain multiplier.', 'M5 7l5 5-5 5 M12 7l5 5-5 5'),
  'capital':    ('Capital ships: bosses, the hail, summary tiles.', 'M3 8V3h5 M16 3h5v5 M21 16v5h-5 M8 21H3v-5 M12 8l4 4-4 4-4-4z'),
  'score':   ('Score: score and run time.', 'M9 3h6l6 6v6l-6 6H9l-6-6V9z M12 7v5h4'),
  'torpedo':    ('Torpedo bay.', 'M4 9h10l5 3-5 3H4z M4 9L2 7 M4 15l-2 2 M8 9v6'),
  'mine':       ('Seismic mine layer.', 'M12 7l4.3 2.5v5L12 17l-4.3-2.5v-5z M12 2v5 M12 17v5 M3.3 7l4.4 2.5 M16.3 14.5l4.4 2.5 M3.3 17l4.4-2.5 M16.3 9.5l4.4-2.5'),
  'alert':      ('Yellow and red alert placards.', 'M12 3l10 17H2z M12 9v6 M12 17v2'),
  'all-stop':   ('All stop (pause).', 'M8.5 5v14 M15.5 5v14'),
}
ICON_INK = '#3E8798'

def icon_svg(d, ink='#000'):
    return (f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='{ink}' "
            f"stroke-width='1.75' stroke-linecap='square' stroke-linejoin='miter'><path d='{d}'/></svg>")

def icon_css():
    out = []
    for name, (_, d) in ICONS.items():
        uri = 'data:image/svg+xml,' + urllib.parse.quote(icon_svg(d), safe="/:=' ")
        out.append(f'.ab-i--{name} {{ --i: url("{uri}"); }}')
    return '\n'.join(out)

def icon(name, cls=''):
    return f'<i class="ab-i ab-i--{name} {cls}" aria-hidden="true"></i>'

# ── wordmark and mark, inline, bound to tokens ────────────────────────────
WM_CSS = '''
/* ── identity, inline ─────────────────────────────────────────────────── */
.ab-wm { display: block; fill: none; stroke-width: 4; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 4; }
.ab-wm-a { stroke: var(--ink); }
.ab-wm-b { stroke: var(--signal); }
.ab-wm.is-mono .ab-wm-b { stroke: var(--ink); }
.ab-mk { display: block; overflow: visible; }
.ab-mk-rock { fill: none; stroke: var(--krail); stroke-width: 4; stroke-linejoin: miter; }
.ab-mk-shard { fill: var(--krail); }
.ab-mk-ship { fill: var(--signal); }
.ab-mk.is-mono .ab-mk-rock { stroke: var(--ink); } .ab-mk.is-mono .ab-mk-shard, .ab-mk.is-mono .ab-mk-ship { fill: var(--ink); }
'''

def wordmark(stacked=False, cls='', width=None):
    if stacked:
        a, wa = word('WAY')
        b, wb = word('WARD', y0=26)
        vw, vh = max(wa, wb), 46
    else:
        a, wa = word('WAY')
        b, wb = word('WARD', x0=wa + 9)
        vw, vh = wa + 9 + wb, 20
    w = f' width="{width}"' if width else ''
    return (f'<svg class="ab-wm {cls}" viewBox="0 0 {vw:.1f} {vh}"{w} role="img" aria-label="Wayward">'
            f'<g class="ab-wm-a">{"".join(a)}</g><g class="ab-wm-b">{"".join(b)}</g></svg>')

def _rot(pts, deg, cx, cy):
    r = math.radians(deg); c, s = math.cos(r), math.sin(r)
    return [(cx + x*c - y*s, cy + x*s + y*c) for x, y in pts]
def _P(pts): return ' '.join(f'{x:.2f},{y:.2f}' for x, y in pts)

CRYSTAL = [(29,6),(51,12),(59,35),(45,57),(17,58),(5,32)]
ARROW = _rot([(0,-27),(11.5,13),(0,6),(-11.5,13)], 38, 36, 33)
SHARDS = [_rot([(0,-3.6),(2.4,2.4),(-2.4,2.4)], 20, 47.5, 4.5),
          _rot([(0,-2.8),(1.9,1.9),(-1.9,1.9)], 70, 60.5, 13.5),
          _rot([(0,-2),(1.4,1.4),(-1.4,1.4)], 45, 57, 4)]
_mk_n = [0]

def mark(size=64, cls=''):
    _mk_n[0] += 1
    mid = f'abBreach{_mk_n[0]}'
    sh = ''.join(f'<polygon class="ab-mk-shard" points="{_P(s)}"/>' for s in SHARDS)
    return (f'<svg class="ab-mk {cls}" viewBox="0 0 64 64" width="{size}" height="{size}" role="img" aria-label="Wayward mark">'
            f'<defs><mask id="{mid}" maskUnits="userSpaceOnUse" x="-8" y="-8" width="80" height="80">'
            f'<rect x="-8" y="-8" width="80" height="80" fill="#fff"/>'
            f'<polygon points="{_P(ARROW)}" fill="#000" stroke="#000" stroke-width="6" stroke-linejoin="miter" stroke-miterlimit="2"/></mask></defs>'
            f'<polygon class="ab-mk-rock" points="{_P(CRYSTAL)}" mask="url(#{mid})"/>{sh}'
            f'<polygon class="ab-mk-ship" points="{_P(ARROW)}"/></svg>')

def mark_file(ship, rock, size=256):
    sh = ''.join(f'<polygon points="{_P(s)}" fill="{rock}"/>' for s in SHARDS)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="{size}" height="{size}">'
            '<defs><mask id="breach" maskUnits="userSpaceOnUse" x="-8" y="-8" width="80" height="80">'
            '<rect x="-8" y="-8" width="80" height="80" fill="#fff"/>'
            f'<polygon points="{_P(ARROW)}" fill="#000" stroke="#000" stroke-width="6" stroke-linejoin="miter" stroke-miterlimit="2"/></mask></defs>'
            f'<polygon points="{_P(CRYSTAL)}" fill="none" stroke="{rock}" stroke-width="4" stroke-linejoin="miter" mask="url(#breach)"/>'
            f'{sh}<polygon points="{_P(ARROW)}" fill="{ship}"/></svg>')

def wordmark_file(ink, sig, stacked=False):
    if stacked:
        a, wa = word('WAY'); b, wb = word('WARD', y0=26); vw, vh = max(wa, wb), 46
    else:
        a, wa = word('WAY'); b, wb = word('WARD', x0=wa + 9); vw, vh = wa + 9 + wb, 20
    g = 'fill="none" stroke-width="4" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="4"'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vw:.1f} {vh}" width="{vw*4:.0f}" height="{vh*4}">'
            f'<g {g} stroke="{ink}">{"".join(a)}</g><g {g} stroke="{sig}">{"".join(b)}</g></svg>')

def app_icon_file():
    tile = ('<path d="M10 0H54L64 10V54L54 64H10L0 54V10Z" fill="#03060B"/>'
            '<path d="M10.6 1.5H53.4L62.5 10.6V53.4L53.4 62.5H10.6L1.5 53.4V10.6Z" fill="none" stroke="#00F0FF" stroke-opacity=".35" stroke-width=".6"/>')
    sh = ''.join(f'<polygon points="{_P(s)}" fill="#C77DFF"/>' for s in SHARDS)
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512">'
            '<defs><mask id="breach" maskUnits="userSpaceOnUse" x="-8" y="-8" width="80" height="80">'
            '<rect x="-8" y="-8" width="80" height="80" fill="#fff"/>'
            f'<polygon points="{_P(ARROW)}" fill="#000" stroke="#000" stroke-width="6" stroke-linejoin="miter" stroke-miterlimit="2"/></mask></defs>'
            + tile + '<g transform="translate(9.6 9.6) scale(.7)">'
            f'<polygon points="{_P(CRYSTAL)}" fill="none" stroke="#C77DFF" stroke-width="4" stroke-linejoin="miter" mask="url(#breach)"/>'
            f'{sh}<polygon points="{_P(ARROW)}" fill="#00F0FF"/></g></svg>')

# ── schematics: line art in the category colour ──────────────────────────
def _arc(cx, cy, r, a0, a1):
    x0, y0 = cx + r*math.cos(math.radians(a0)), cy + r*math.sin(math.radians(a0))
    x1, y1 = cx + r*math.cos(math.radians(a1)), cy + r*math.sin(math.radians(a1))
    return f'M{x0:.1f} {y0:.1f}A{r} {r} 0 0 1 {x1:.1f} {y1:.1f}'

SCH = {}
SCH['torpedo'] = ('<svg viewBox="0 0 240 112" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'
  '<circle class="ab-sch-dim" cx="200" cy="56" r="14"/><circle class="ab-sch-dim" cx="200" cy="56" r="28"/><circle class="ab-sch-dim" cx="200" cy="56" r="42"/>'
  '<path class="ab-sch-dim" d="M200 6v22M200 84v22M150 56h22M228 56h12"/>'
  '<path class="ab-sch-dim" d="M18 51h40M28 56h30M12 61h46"/>'
  '<path class="ab-sch-fill" d="M134 49l16 7-16 7z"/>'
  '<path class="ab-sch" d="M70 49h64l16 7-16 7H70z M86 49v14 M102 49v14 M118 49v14 M70 49l-10-9h-6l5 9 M70 63l-10 9h-6l5-9"/>'
  '</svg>')
SCH['deflector'] = ('<svg viewBox="0 0 240 112" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'
  '<path class="ab-sch" d="M0 20h22l26 22v28l-26 22H0"/>'
  '<path class="ab-sch-fill" d="M40 48l8 8-8 8-8-8z"/><path class="ab-sch" d="M40 48l8 8-8 8-8-8z"/>'
  f'<path class="ab-sch" d="{_arc(40,56,30,-42,42)}"/><path class="ab-sch" d="{_arc(40,56,50,-40,40)}"/>'
  f'<path class="ab-sch-dim" d="{_arc(40,56,72,-38,38)}"/><path class="ab-sch-dim" d="{_arc(40,56,96,-34,34)}"/>'
  '<path class="ab-sch-rock" d="M168 22l12-4 9 7-2 12-12 3-8-7z"/><path class="ab-sch-rock" d="M196 60l13-3 8 9-4 12-13 2-7-10z"/><path class="ab-sch-rock" d="M150 80l9-2 5 7-3 8-9 1-4-7z"/>'
  '<path class="ab-sch-dim" d="M192 18h14M202 24h12M222 66h14M228 72h10M170 86h12"/>'
  '</svg>')
SCH['laser'] = ('<svg viewBox="0 0 240 112" preserveAspectRatio="xMidYMid meet" aria-hidden="true">'
  '<path class="ab-sch" d="M30 50h40l6 6-6 6H30l-6-6z M38 50v12 M46 50v12 M54 50v12 M62 50v12"/>'
  '<path class="ab-sch" d="M78 56L226 24 M78 56H226 M78 56L226 88"/>'
  '<path class="ab-sch-dim" d="M78 56L226 36 M78 56L226 76 M78 56L226 12 M78 56L226 100"/>'
  '<path class="ab-sch-rock" d="M206 46l12-3 8 8-3 11-12 2-7-9z"/>'
  '<path class="ab-sch-dim" d="M228 40l8-6 M230 56h10 M228 70l8 6"/>'
  '</svg>')
# plan views, nose up: generic silhouettes, not traced from any canon design
SCH['escort'] = ('<svg viewBox="0 0 200 150" aria-hidden="true">'
  '<path class="ab-sch-dim" d="M100 10v130 M22 22v108 M18 22h8 M18 130h8"/>'
  '<path class="ab-sch-fill" d="M60 96l8-24 2 54h-12z M140 96l-8-24-2 54h12z"/>'
  '<path class="ab-sch" d="M100 20l32 52 8 34-16 18H76l-16-18 8-34z M60 96l8-24 2 54h-12z M140 96l-8-24-2 54h12z M80 100h40 M90 60h20"/>'
  '</svg>')
SCH['cruiser'] = ('<svg viewBox="0 0 200 150" aria-hidden="true">'
  '<path class="ab-sch-dim" d="M100 10v130 M22 18v124 M18 18h8 M18 142h8"/>'
  '<path class="ab-sch-fill" d="M60 92h10v48H60z M130 92h10v48h-10z"/>'
  '<path class="ab-sch" d="M84 18h32l20 18v26l-20 18H84L64 62V36z M92 80h16v34l-8 8-8-8z M60 92h10v48H60z M130 92h10v48h-10z M70 106l22-8 M130 106l-22-8 M80 49h40"/>'
  '</svg>')
SCH['scout'] = ('<svg viewBox="0 0 200 150" aria-hidden="true">'
  '<path class="ab-sch-dim" d="M100 10v130 M22 36v84 M18 36h8 M18 120h8"/>'
  '<path class="ab-sch-fill" d="M70 78h8v42h-8z M122 78h8v42h-8z"/>'
  '<path class="ab-sch" d="M88 36h24l14 14v22l-14 14H88L74 72V50z M70 78h8v42h-8z M122 78h8v42h-8z M78 92l12-8 M122 92l-12-8 M100 86v18"/>'
  '<path class="ab-sch-fill" d="M96 58h8v8h-8z"/>'
  '</svg>')

# ── the scene painter ─────────────────────────────────────────────────────
# A stand-in for the 3D render behind the UI mockups. It reads the tokens, so
# Bridge draws lit space and Drydock draws the same plot as a print.
SCENE_JS = r'''
function abScene(canvas, spec) {
  var ctx = canvas.getContext('2d'), root = document.documentElement;
  function tok(n) { return getComputedStyle(root).getPropertyValue('--' + n).trim() || '#888'; }
  function rgba(hex, a) {
    var h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var n = parseInt(h.slice(0, 6), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function rock(x, y, r, seed, rot) {
    var R = rng(seed), n = 6 + Math.floor(R() * 3), pts = [];
    for (var i = 0; i < n; i++) { var a = rot + i / n * Math.PI * 2, rr = r * (0.72 + R() * 0.38); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
    return pts;
  }
  function poly(pts) { ctx.beginPath(); pts.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.closePath(); }
  function ship(x, y, s, ang, col, deflector) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
    ctx.lineJoin = 'miter'; ctx.strokeStyle = col; ctx.lineWidth = 1.3 / s; ctx.fillStyle = rgba(col, 0.18);
    poly([[-5, -19], [5, -19], [10, -14], [10, -6], [5, -1], [-5, -1], [-10, -6], [-10, -14]]); ctx.fill(); ctx.stroke();
    poly([[-2.6, -1], [2.6, -1], [2.6, 9], [0, 12], [-2.6, 9]]); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2.6, 5); ctx.lineTo(-8.5, 9); ctx.moveTo(2.6, 5); ctx.lineTo(8.5, 9); ctx.stroke();
    ctx.fillStyle = col; ctx.fillRect(-11.5, 4, 3, 15); ctx.fillRect(8.5, 4, 3, 15);
    if (deflector) { ctx.fillStyle = deflector; ctx.fillRect(-1.3, 1.5, 2.6, 2.6); }
    ctx.restore();
  }
  function raider(x, y, s, ang, col) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
    ctx.strokeStyle = col; ctx.lineWidth = 1.4 / s; ctx.fillStyle = rgba(col, 0.14);
    poly([[0, -12], [5, -4], [18, 2], [14, 7], [3, 4], [0, 8], [-3, 4], [-14, 7], [-18, 2], [-5, -4]]); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function draw() {
    var dpr = Math.min(2, window.devicePixelRatio || 1), w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var lit = (getComputedStyle(root).getPropertyValue('--ab-glow').trim() || '1') !== '0';
    var VOID = tok('void'), INK = tok('ink'), SIG = tok('signal'), VIO = tok('krail'), CMD = tok('command');
    ctx.fillStyle = VOID; ctx.fillRect(0, 0, w, h);
    if (lit) {
      [[0.22, 0.3, 0.55, VIO, 0.13], [0.8, 0.75, 0.6, SIG, 0.07], [0.6, 0.15, 0.4, VIO, 0.06]].forEach(function (n) {
        var g = ctx.createRadialGradient(n[0] * w, n[1] * h, 0, n[0] * w, n[1] * h, n[2] * Math.max(w, h));
        g.addColorStop(0, rgba(n[3], n[4])); g.addColorStop(1, rgba(n[3], 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      });
    }
    var R = rng(spec.seed || 7);
    for (var i = 0; i < (spec.stars || 260); i++) {
      var sx = R() * w, sy = R() * h, sr = R() < 0.92 ? 0.5 + R() * 0.6 : 1 + R() * 0.8;
      ctx.fillStyle = rgba(INK, lit ? 0.25 + R() * 0.6 : 0.12 + R() * 0.2); ctx.fillRect(sx, sy, sr, sr);
    }
    function ring(half) {  // a tilted orbit, as on the reference HUD; half 0 = behind, 1 = in front
      var rg = spec.ring; if (!rg) return;
      ctx.save(); ctx.translate(rg.x * w, rg.y * h); ctx.rotate(rg.tilt || -0.5);
      var a0 = half ? 0 : Math.PI, a1 = half ? Math.PI : Math.PI * 2;
      [[1, CMD, 0.9, 2, 0], [1.16, INK, 0.25, 1, 1], [0.84, INK, 0.18, 1, 0]].forEach(function (o) {
        ctx.beginPath(); ctx.ellipse(0, 0, rg.r * o[0], rg.r * o[0] * 0.34, 0, a0, a1);
        ctx.strokeStyle = rgba(o[1], half ? o[2] : o[2] * 0.55); ctx.lineWidth = o[3]; ctx.setLineDash(o[4] ? [4, 7] : []);
        if (lit && o[1] === CMD) { ctx.shadowColor = CMD; ctx.shadowBlur = 16; }
        ctx.stroke(); ctx.shadowBlur = 0;
      });
      if (half) {  // three marker ticks riding the orbit
        [0.6, 1.1, 2.4].forEach(function (t) { var px = Math.cos(t) * rg.r, py = Math.sin(t) * rg.r * 0.34;
          ctx.fillStyle = CMD; ctx.fillRect(px - 2.5, py - 2.5, 5, 5); });
      }
      ctx.setLineDash([]); ctx.restore();
    }
    ring(0);
    (spec.rocks || []).forEach(function (r, k) {
      var big = r[2] > 60, cx = r[0] * w, cy = r[1] * h;
      var pts = big ? rock(cx, cy, r[2], 31, 0.3).concat([]) : rock(cx, cy, r[2], 11 + k * 7, k);
      if (big) pts = (function () { var R2 = rng(77), out = []; for (var i = 0; i < 11; i++) { var a = 0.2 + i / 11 * Math.PI * 2, rr = r[2] * (0.78 + R2() * 0.3); out.push([cx + Math.cos(a) * rr * 1.08, cy + Math.sin(a) * rr]); } return out; })();
      poly(pts);
      if (big) { var gf = ctx.createLinearGradient(cx - r[2], cy - r[2], cx + r[2], cy + r[2]); gf.addColorStop(0, rgba(VIO, lit ? 0.32 : 0.14)); gf.addColorStop(0.55, rgba(VIO, lit ? 0.1 : 0.06)); gf.addColorStop(1, rgba(VOID, 0.2)); ctx.fillStyle = gf; }
      else ctx.fillStyle = rgba(VIO, lit ? 0.1 : 0.08);
      ctx.fill();
      if (lit) { ctx.shadowColor = VIO; ctx.shadowBlur = big ? 26 : 14; }
      ctx.strokeStyle = VIO; ctx.lineWidth = big ? 2 : 1.5; ctx.stroke(); ctx.shadowBlur = 0;
      if (big) {  // facets from an off-centre apex, and two krail seams that glow
        var ax = cx - r[2] * 0.18, ay = cy - r[2] * 0.12;
        pts.forEach(function (p, i) { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(p[0], p[1]); ctx.strokeStyle = rgba(VIO, i % 3 ? 0.18 : 0.42); ctx.lineWidth = 1; ctx.stroke(); });
        [[2, 6, 0.5], [8, 4, 0.35]].forEach(function (sm) {
          ctx.beginPath(); ctx.moveTo(pts[sm[0]][0], pts[sm[0]][1]);
          ctx.lineTo(ax + (pts[sm[1]][0] - ax) * sm[2], ay + (pts[sm[1]][1] - ay) * sm[2]); ctx.lineTo(pts[sm[1]][0], pts[sm[1]][1]);
          ctx.strokeStyle = rgba(INK, lit ? 0.75 : 0.5); ctx.lineWidth = 1.4; if (lit) { ctx.shadowColor = VIO; ctx.shadowBlur = 12; } ctx.stroke(); ctx.shadowBlur = 0;
        });
      } else if (r[2] > 26) {  // a krail seam
        ctx.beginPath(); ctx.moveTo(pts[0][0] * 0.6 + pts[3][0] * 0.4, pts[0][1] * 0.6 + pts[3][1] * 0.4);
        ctx.lineTo(cx, cy); ctx.lineTo(pts[2][0] * 0.5 + pts[5][0] * 0.5, pts[2][1] * 0.5 + pts[5][1] * 0.5);
        ctx.strokeStyle = rgba(VIO, 0.6); ctx.lineWidth = 1; ctx.stroke();
      }
    });
    ring(1);
    (spec.shards || []).forEach(function (s) {
      ctx.save(); ctx.translate(s[0] * w, s[1] * h); ctx.rotate(0.5);
      ctx.fillStyle = VIO; if (lit) { ctx.shadowColor = VIO; ctx.shadowBlur = 8; } ctx.fillRect(-2.2, -2.2, 4.4, 4.4); ctx.restore();
    });
    (spec.enemies || []).forEach(function (e) {
      var col = tok(e[4] || 'faction-gutter'); if (lit) { ctx.shadowColor = col; ctx.shadowBlur = 10; }
      raider(e[0] * w, e[1] * h, e[2], e[3], col); ctx.shadowBlur = 0;
      if (e[5]) { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
        ctx.moveTo(e[0] * w + Math.sin(e[3]) * 22 * e[2], e[1] * h - Math.cos(e[3]) * 22 * e[2]);
        ctx.lineTo(e[0] * w + Math.sin(e[3]) * 34 * e[2], e[1] * h - Math.cos(e[3]) * 34 * e[2]); ctx.stroke(); }
    });
    if (spec.burst) {
      var b = spec.burst, bx = b[0] * w, by = b[1] * h, BR = rng(3);
      if (lit) { var g2 = ctx.createRadialGradient(bx, by, 0, bx, by, 40); g2.addColorStop(0, rgba(INK, 0.55)); g2.addColorStop(0.3, rgba(VIO, 0.3)); g2.addColorStop(1, rgba(VIO, 0)); ctx.fillStyle = g2; ctx.fillRect(bx - 40, by - 40, 80, 80); }
      for (var q = 0; q < 14; q++) { var a = BR() * Math.PI * 2, r0 = 6 + BR() * 8, r1 = r0 + 6 + BR() * 14;
        ctx.strokeStyle = rgba(q % 3 ? VIO : INK, 0.85); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(bx + Math.cos(a) * r0, by + Math.sin(a) * r0); ctx.lineTo(bx + Math.cos(a) * r1, by + Math.sin(a) * r1); ctx.stroke(); }
    }
    if (spec.ship) {
      var s = spec.ship, x = s.x * w, y = s.y * h, k = s.scale || 1.6;
      if (s.orbit != null) {  // the overcharge ring, in the world
        ctx.save(); ctx.translate(x, y + 6); var segs = 28, on = Math.round(segs * s.orbit);
        for (var i2 = 0; i2 < segs; i2++) {
          var a0 = i2 / segs * Math.PI * 2 + 0.06, a1 = (i2 + 1) / segs * Math.PI * 2 - 0.06;
          ctx.beginPath(); ctx.ellipse(0, 0, 46 * k / 1.6, 17 * k / 1.6, 0, a0, a1);
          ctx.strokeStyle = i2 < on ? SIG : rgba(SIG, 0.2); ctx.lineWidth = 2.4;
          if (lit && i2 < on) { ctx.shadowColor = SIG; ctx.shadowBlur = 8; } ctx.stroke(); ctx.shadowBlur = 0;
        }
        ctx.restore();
      }
      var tr = ctx.createLinearGradient(x, y + 19 * k, x, y + 19 * k + 70); tr.addColorStop(0, rgba(SIG, lit ? 0.55 : 0.3)); tr.addColorStop(1, rgba(SIG, 0));
      ctx.fillStyle = tr; ctx.fillRect(x - 11.5 * k, y + 19 * k, 3 * k, 70); ctx.fillRect(x + 8.5 * k, y + 19 * k, 3 * k, 70);
      (s.bolts || []).forEach(function (bo) { ctx.strokeStyle = SIG; ctx.lineWidth = 2; if (lit) { ctx.shadowColor = SIG; ctx.shadowBlur = 8; }
        ctx.beginPath(); ctx.moveTo(x + bo[0], y + bo[1]); ctx.lineTo(x + bo[0] + bo[2], y + bo[1] + bo[3]); ctx.stroke(); ctx.shadowBlur = 0; });
      if (lit) { ctx.shadowColor = SIG; ctx.shadowBlur = 14; }
      ship(x, y, k, 0, SIG, CMD); ctx.shadowBlur = 0;
    }
    if (spec.leaders) spec.leaders.forEach(function (l) {
      ctx.strokeStyle = rgba(INK, 0.55); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(l[0] * w, l[1] * h); ctx.lineTo(l[2] * w, l[3] * h); ctx.lineTo(l[4] * w, l[3] * h); ctx.stroke();
      ctx.fillStyle = INK; ctx.fillRect(l[0] * w - 2, l[1] * h - 2, 4, 4);
    });
    if (spec.dim) { ctx.fillStyle = rgba(VOID, spec.dim); ctx.fillRect(0, 0, w, h); }
  }
  draw();
  new MutationObserver(draw).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  window.addEventListener('resize', draw);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
}
'''
