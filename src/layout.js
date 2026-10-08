// Satz der Folie in Millimetern. Ergebnis: Hintergrundfläche, Bild + Textpfade,
// die Vorschau, PNG, PDF und SVG gleichermaßen verwenden.
//
//   ┌──────────────────────────────┐  ← Druckformat (Endformat + 2 mm Beschnitt je Seite)
//   │ ┌──────────────────────────┐ │  ← Schnittkante (bestelltes Endformat)
//   │ │ ┌──────────────────────┐ │ │  ← Sicherheitsabstand (Text und Logo bleiben innerhalb)
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

// Bild/Logo: links oder rechts neben dem Text (innerhalb des Sicherheitsabstands)
// oder als Hintergrund, der das ganze Druckformat inkl. Beschnitt füllt.
// Ohne Text steht ein Logo mittig.
export const IMG_POSITIONS = [
  ['left', 'Links neben dem Text'],
  ['right', 'Rechts neben dem Text'],
  ['bg', 'Hintergrund (ganze Fläche)'],
];
const IMG_MAX_SHARE = 0.5;    // Logo neben Text nimmt höchstens die halbe Breite ein

// Liefert { P, size, commands, image }: Druckformat, Schriftgröße (mm), Pfadbefehle
// (mm, y nach unten) und die Bildplatzierung (Ausschnitt in Bildpixeln, Ziel in mm).
export function layout(d, font, img = null) {
  const P = printSize(d);
  const lines = splitLines(d.text);
  const hasText = lines.some((l) => l.trim());
  let boxX = BLEED_MM + SAFE_MM;
  let boxW = d.wcm * 10 - 2 * SAFE_MM;
  const boxH = d.hcm * 10 - 2 * SAFE_MM;

  let image = null;
  const iw = img?.naturalWidth, ih = img?.naturalHeight;
  if (iw > 0 && ih > 0 && boxW > 0 && boxH > 0) {
    const alpha = img.src.startsWith('data:image/png');
    if (d.imgPos === 'bg') {
      const s = Math.max(P.w / iw, P.h / ih);   // füllend, überstehender Teil wird abgeschnitten
      const sw = P.w / s, sh = P.h / s;
      image = { el: img, alpha, sx: (iw - sw) / 2, sy: (ih - sh) / 2, sw, sh, x: 0, y: 0, w: P.w, h: P.h };
    } else {
      let h = boxH * Math.min(Math.max(d.imgScale || 100, 10), 100) / 100;
      let w = h * iw / ih;
      const maxW = hasText ? boxW * IMG_MAX_SHARE : boxW;
      if (w > maxW) { w = maxW; h = w * ih / iw; }
      const gap = Math.max(SAFE_MM, h * 0.2);
      let x = P.w / 2 - w / 2;
      if (hasText && d.imgPos === 'right') { x = boxX + boxW - w; boxW -= w + gap; }
      else if (hasText) { x = boxX; boxX += w + gap; boxW -= w + gap; }
      image = { el: img, alpha, sx: 0, sy: 0, sw: iw, sh: ih, x, y: P.h / 2 - h / 2, w, h };
    }
  }

  if (!font || boxW <= 0 || boxH <= 0 || !hasText) return { P, size: 0, commands: [], image };

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
  const cx = boxX + boxW / 2;
  const commands = [];
  lines.forEach((line, i) => {
    if (!line) return;
    const baseline = top + size * asc + i * size * LINE_HEIGHT;
    const x = cx - font.getAdvanceWidth(line, size, opts) / 2;
    commands.push(...font.getPath(line, x, baseline, size, opts).commands);
  });
  return { P, size, commands, image };
}

// Effektive Bildauflösung im Druck (dpi), für den Hinweis bei zu kleinen Bildern.
export function imageDpi(image) {
  return image ? Math.round(image.sw / (image.w / 25.4)) : 0;
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
  const im = lay.image;
  if (im) {
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(im.el, im.sx, im.sy, im.sw, im.sh, im.x, im.y, im.w, im.h);
  }
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
