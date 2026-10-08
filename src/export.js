// Export der Folie als PNG (Raster), SVG und PDF (beide Vektor, Text als Pfade).
// Alle Dateien enthalten rundum 2 mm Beschnitt. Das PDF trägt zusätzlich
// TrimBox (Endformat) und BleedBox (mit Beschnitt), wie Druckereien es erwarten.

import { drawCanvas, BLEED_MM } from './layout.js';

const MAX_AREA = 16_000_000;   // Canvas-Grenze auf iPhones
const MAX_SIDE = 16_000;
const n = (v) => +v.toFixed(3);   // kompakte Zahlen

export function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

// ---- PNG ------------------------------------------------------------------
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; }
  return t;
})();
function crc32(bytes) { let c = 0xffffffff; for (const b of bytes) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

// Trägt die Auflösung als pHYs-Chunk ein, damit Programme die echte Größe kennen.
async function withDpi(blob, dpi) {
  const src = new Uint8Array(await blob.arrayBuffer());
  const ppm = Math.round(dpi / 0.0254);
  const ch = new Uint8Array(21), v = new DataView(ch.buffer);
  v.setUint32(0, 9); ch.set([0x70, 0x48, 0x59, 0x73], 4);
  v.setUint32(8, ppm); v.setUint32(12, ppm); ch[16] = 1;
  v.setUint32(17, crc32(ch.subarray(4, 17)));
  return new Blob([src.subarray(0, 33), ch, src.subarray(33)], { type: 'image/png' });
}

export async function exportPNG(d, lay, dpi = 150) {
  const { P } = lay;
  const pxPerMm = Math.min(dpi / 25.4, Math.sqrt(MAX_AREA / (P.w * P.h)), MAX_SIDE / Math.max(P.w, P.h));
  const c = document.createElement('canvas');
  c.width = Math.round(P.w * pxPerMm);
  c.height = Math.round(P.h * pxPerMm);
  drawCanvas(c.getContext('2d'), d, lay, pxPerMm);
  const blob = await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('PNG konnte nicht erzeugt werden.'))), 'image/png'));
  const realDpi = Math.round((c.width / P.w) * 25.4);
  c.width = c.height = 0;
  return { blob: await withDpi(blob, realDpi), dpi: realDpi };
}

// ---- SVG ------------------------------------------------------------------
function svgPath(commands) {
  return commands.map((c) => {
    if (c.type === 'M' || c.type === 'L') return `${c.type}${n(c.x)} ${n(c.y)}`;
    if (c.type === 'C') return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
    if (c.type === 'Q') return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
    return 'Z';
  }).join('');
}
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

export function exportSVG(d, lay, meta = {}) {
  const { P } = lay;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${n(P.w)}mm" height="${n(P.h)}mm" viewBox="0 0 ${n(P.w)} ${n(P.h)}">
  <title>Folie ${esc(d.wcm)} × ${esc(d.hcm)} cm (inkl. ${BLEED_MM} mm Beschnitt)</title>
  <desc>Endformat ${esc(d.wcm)} × ${esc(d.hcm)} cm, Beschnitt ${BLEED_MM} mm je Seite. Schrift: ${esc(meta.font || '')}. Text: ${esc(d.text)}</desc>
  <rect id="hintergrund" x="0" y="0" width="${n(P.w)}" height="${n(P.h)}" fill="${esc(d.bg)}"/>
${lay.commands.length ? `  <path id="text" d="${svgPath(lay.commands)}" fill="${esc(d.fg)}"/>\n` : ''}</svg>
`;
  return new Blob([svg], { type: 'image/svg+xml' });
}

// ---- PDF ------------------------------------------------------------------
const rgb = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => n(parseInt(h.substr(i, 2), 16) / 255)).join(' ');
};

// Pfade in PDF-Operatoren (Koordinaten in mm, y nach unten – die Seite wird per cm-Matrix umgerechnet).
function pdfPath(commands) {
  const out = [];
  let cx = 0, cy = 0;
  for (const c of commands) {
    if (c.type === 'M') { out.push(`${n(c.x)} ${n(c.y)} m`); cx = c.x; cy = c.y; }
    else if (c.type === 'L') { out.push(`${n(c.x)} ${n(c.y)} l`); cx = c.x; cy = c.y; }
    else if (c.type === 'C') { out.push(`${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)} c`); cx = c.x; cy = c.y; }
    else if (c.type === 'Q') {                    // quadratische in kubische Kurve umrechnen
      const x1 = cx + (2 / 3) * (c.x1 - cx), y1 = cy + (2 / 3) * (c.y1 - cy);
      const x2 = c.x + (2 / 3) * (c.x1 - c.x), y2 = c.y + (2 / 3) * (c.y1 - c.y);
      out.push(`${n(x1)} ${n(y1)} ${n(x2)} ${n(y2)} ${n(c.x)} ${n(c.y)} c`); cx = c.x; cy = c.y;
    } else if (c.type === 'Z') out.push('h');
  }
  return out.join('\n');
}

export function exportPDF(d, lay) {
  const { P } = lay;
  const k = 72 / 25.4;                            // mm → pt
  const W = n(P.w * k), H = n(P.h * k), b = n(BLEED_MM * k);
  const content = [
    'q',
    `${k.toFixed(6)} 0 0 ${(-k).toFixed(6)} 0 ${H} cm`,
    `${rgb(d.bg)} rg`,
    `0 0 ${n(P.w)} ${n(P.h)} re f`,
    lay.commands.length ? `${rgb(d.fg)} rg\n${pdfPath(lay.commands)}\nf` : '',
    'Q',
  ].join('\n');

  const title = `Folie ${d.wcm} x ${d.hcm} cm`.replace(/[()\\]/g, '');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /BleedBox [0 0 ${W} ${H}] ` +
      `/TrimBox [${b} ${b} ${n(W - b)} ${n(H - b)}] /Resources << >> /Contents 4 0 R >>`,
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    `<< /Title (${title}) /Creator (Folieneditor) >>`,
  ];

  // Alles ASCII → Zeichenzahl = Bytezahl
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((o, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Blob([pdf], { type: 'application/pdf' });
}
