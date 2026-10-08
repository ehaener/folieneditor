// Satz der Folie in Millimetern. Ergebnis: Hintergrundfläche + Textpfade,
// die Vorschau, PNG, PDF und SVG gleichermaßen verwenden.
//
//   ┌──────────────────────────────┐  ← Druckformat (Endformat + 2 mm Beschnitt je Seite)
//   │ ┌──────────────────────────┐ │  ← Schnittkante (bestelltes Endformat)
//   │ │ ┌──────────────────────┐ │ │  ← Sicherheitsabstand (Text bleibt innerhalb)
//   │ │ │        TEXT          │ │ │
//   │ │ └──────────────────────┘ │ │
//   │ └──────────────────────────┘ │
//   └──────────────────────────────┘

export const BLEED_MM = 2;
export const SAFE_MM = 3;
const LINE_HEIGHT = 1.2;

export function printSize(d) {
  return { w: d.wcm * 10 + 2 * BLEED_MM, h: d.hcm * 10 + 2 * BLEED_MM };
}

function splitLines(text) {
  const l = String(text || '').replace(/\r/g, '').split('\n');
  while (l.length > 1 && !l[l.length - 1].trim()) l.pop();
  return l;
}

// Liefert { P, size, commands }: Druckformat, Schriftgröße (mm) und Pfadbefehle (mm, y nach unten).
export function layout(d, font) {
  const P = printSize(d);
  const lines = splitLines(d.text);
  const boxW = d.wcm * 10 - 2 * SAFE_MM;
  const boxH = d.hcm * 10 - 2 * SAFE_MM;
  if (!font || boxW <= 0 || boxH <= 0 || !lines.some((l) => l.trim())) return { P, size: 0, commands: [] };

  const upm = font.unitsPerEm;
  const asc = font.ascender / upm;            // inkl. Platz für Umlaut-Punkte
  const desc = -font.descender / upm;
  const n = lines.length;
  const opts = { kerning: true };

  // Größte Schrift, bei der der Textblock in den Sicherheitsbereich passt
  let size = boxH / ((n - 1) * LINE_HEIGHT + asc + desc);
  for (const line of lines) {
    const w = font.getAdvanceWidth(line, 1, opts);
    if (w > 0) size = Math.min(size, boxW / w);
  }

  const blockH = size * ((n - 1) * LINE_HEIGHT + asc + desc);
  const top = P.h / 2 - blockH / 2;
  const commands = [];
  lines.forEach((line, i) => {
    if (!line) return;
    const baseline = top + size * asc + i * size * LINE_HEIGHT;
    const x = P.w / 2 - font.getAdvanceWidth(line, size, opts) / 2;
    commands.push(...font.getPath(line, x, baseline, size, opts).commands);
  });
  return { P, size, commands };
}

// ---- Canvas (Vorschau und PNG) ------------------------------------------
function toPath2D(commands) {
  const p = new Path2D();
  for (const c of commands) {
    if (c.type === 'M') p.moveTo(c.x, c.y);
    else if (c.type === 'L') p.lineTo(c.x, c.y);
    else if (c.type === 'C') p.bezierCurveTo(c.x1, c.y1, c.x2, c.y2, c.x, c.y);
    else if (c.type === 'Q') p.quadraticCurveTo(c.x1, c.y1, c.x, c.y);
    else if (c.type === 'Z') p.closePath();
  }
  return p;
}

export function drawCanvas(ctx, d, lay, pxPerMm, { guides = false } = {}) {
  const { P } = lay;
  ctx.save();
  ctx.setTransform(pxPerMm, 0, 0, pxPerMm, 0, 0);
  ctx.fillStyle = d.bg;
  ctx.fillRect(0, 0, P.w, P.h);
  if (lay.commands.length) {
    ctx.fillStyle = d.fg;
    ctx.fill(toPath2D(lay.commands));
  }
  if (guides) drawGuides(ctx, d, P, pxPerMm);
  ctx.restore();
}

function drawGuides(ctx, d, P, pxPerMm) {
  const hair = 1 / pxPerMm;
  const tw = d.wcm * 10, th = d.hcm * 10;

  ctx.beginPath();                               // Beschnitt abgetönt
  ctx.rect(0, 0, P.w, P.h);
  ctx.rect(BLEED_MM, BLEED_MM, tw, th);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill('evenodd');
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fill('evenodd');

  ctx.lineWidth = 1.5 * hair;                    // Schnittkante
  ctx.strokeStyle = '#d6246e';
  ctx.strokeRect(BLEED_MM, BLEED_MM, tw, th);

  ctx.lineWidth = hair;                          // Sicherheitsabstand
  ctx.strokeStyle = '#1d8fbf';
  ctx.setLineDash([4 * hair, 3 * hair]);
  ctx.strokeRect(BLEED_MM + SAFE_MM, BLEED_MM + SAFE_MM, tw - 2 * SAFE_MM, th - 2 * SAFE_MM);
  ctx.setLineDash([]);
}
