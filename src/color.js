// Farben werden als CMYK in Prozent (0–100) festgelegt: [C, M, Y, K].
// Das PDF enthält die CMYK-Werte unverändert (DeviceCMYK), so wie die Druckerei sie
// bekommt. Für Bildschirm, PNG und SVG wird eine RGB-Annäherung berechnet. Dazu
// werden die vier Druckfarben (Euroskala, gestrichenes Papier) wie Lasurfarben
// übereinandergelegt. Das trifft den Druck nicht exakt, liegt aber deutlich näher
// als die einfache Formel.

export const COLORS = [
  ['Weiß', [0, 0, 0, 0]],
  ['Schwarz', [0, 0, 0, 100]],
  ['Grau', [0, 0, 0, 50]],
  ['Rot', [0, 95, 100, 0]],
  ['Orange', [0, 50, 100, 0]],
  ['Gelb', [0, 15, 90, 0]],
  ['Hellgrün', [50, 0, 100, 0]],
  ['Grün', [80, 0, 80, 20]],
  ['Türkis', [75, 0, 35, 0]],
  ['Hellblau', [60, 10, 0, 0]],
  ['Blau', [100, 60, 0, 0]],
  ['Lila', [60, 85, 0, 0]],
  ['Pink', [0, 75, 0, 0]],
  ['Braun', [30, 65, 90, 30]],
];

// Volltöne der Druckfarben in sRGB (ungefähr Euroskala/FOGRA39)
const INKS = [
  [0, 159, 227],    // Cyan
  [230, 0, 126],    // Magenta
  [255, 237, 0],    // Yellow
  [29, 29, 27],     // Schwarz
];

export function isCmyk(v) {
  return Array.isArray(v) && v.length === 4 && v.every((n) => Number.isFinite(n) && n >= 0 && n <= 100);
}

export function cmykToRgb(cmyk) {
  const rgb = [1, 1, 1];
  cmyk.forEach((pct, i) => {
    const a = pct / 100;
    for (let ch = 0; ch < 3; ch++) rgb[ch] *= 1 - a * (1 - INKS[i][ch] / 255);
  });
  return rgb.map((v) => Math.round(v * 255));
}

export function cmykToHex(cmyk) {
  return `#${cmykToRgb(cmyk).map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export const sameCmyk = (a, b) => isCmyk(a) && isCmyk(b) && a.every((v, i) => v === b[i]);

export const cmykLabel = ([c, m, y, k]) => `C${c} M${m} Y${y} K${k}`;

export function colorName(cmyk) {
  return COLORS.find(([, v]) => sameCmyk(v, cmyk))?.[0] || '';
}
