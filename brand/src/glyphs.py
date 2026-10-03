# Constructed letterforms for the Asteroid Blaster wordmark.
# Grid: cap height 20, stroke 4 (butt caps, miter joins). Stems keep square
# corners; bowls and arches are cut at 45 degrees. Open ends run to the box edge.
S = 4
G = {
  'A': (16, "M2 20V5L5 2H11L14 5V20M2 11.5H14"),
  'S': (16, "M16 2H5L2 5V7.5L4.5 10H11.5L14 12.5V15L11 18H0"),
  'T': (16, "M0 2H16M8 2V20"),
  'E': (15, "M15 2H2V18H15M2 10H12"),
  'R': (16, "M2 20V2H11L14 5V8L12 10H2M9 10L14 15V20"),
  'O': (16, "M5 2H11L14 5V15L11 18H5L2 15V5Z"),
  'I': (4,  "M2 0V20"),
  'D': (16, "M2 2H11L14 5V15L11 18H2Z"),
  'B': (16, "M2 2H11L14 5V7.5L12 10L14 12.5V15L11 18H2ZM2 10H12"),
  'L': (15, "M2 0V18H15"),
  ' ': (8, ""),
}
GAP = 4.5

def word(text, x0=0.0, y0=0.0):
    """Return (svg path elements, width) for text set from x0,y0."""
    out, x = [], x0
    for i, ch in enumerate(text):
        w, d = G[ch]
        if d:
            out.append(f'<path d="{d}" transform="translate({x:.2f} {y0:.2f})"/>')
        x += w + (GAP if i < len(text) - 1 else 0)
    return out, x - x0
