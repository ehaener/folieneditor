// Folieneditor: Maße in cm, Text, Schriftart, Hintergrund- und Textfarbe,
// 2 mm Beschnitt, Export als PNG, PDF oder SVG.
//
// Höchstmaße lassen sich per URL ändern: index.html?maxw=200&maxh=15

import { loadFonts, getFont, fontLabel, DEFAULT_FONT, FALLBACK_FONT } from './fonts.js';
import { layout, drawCanvas, printSize, BLEED_MM } from './layout.js';
import { exportPNG, exportSVG, exportPDF, download } from './export.js';

const Q = new URLSearchParams(location.search);
const num = (k, def) => { const v = parseFloat(Q.get(k)); return Number.isFinite(v) && v > 0 ? v : def; };
const LIMITS = { minW: 5, minH: 2, maxW: num('maxw', 200), maxH: num('maxh', 15) };
const PNG_DPI = 150;
const LS_KEY = 'folie.v1';

const COLORS = [
  ['Weiß', '#ffffff'], ['Schwarz', '#1d1d1b'], ['Grau', '#8d8d8d'], ['Rot', '#d62828'],
  ['Orange', '#f28c28'], ['Gelb', '#ffd23f'], ['Hellgrün', '#8cc63f'], ['Grün', '#2e8b57'],
  ['Türkis', '#1fb5ad'], ['Hellblau', '#4fb3e8'], ['Blau', '#1f5fad'], ['Lila', '#7b4fa0'],
  ['Pink', '#e5579b'], ['Braun', '#8b5a2b'],
];

const $ = (id) => document.getElementById(id);
const els = {
  w: $('w'), h: $('h'), sizeErr: $('sizeErr'), sizeHint: $('sizeHint'),
  text: $('text'), font: $('font'), bg: $('bgSw'), fg: $('fgSw'),
  guides: $('guides'), canvas: $('preview'), wrap: $('wrap'), dims: $('dims'),
  exportMsg: $('exportMsg'),
};

const state = {
  wcm: Math.min(100, LIMITS.maxW), hcm: Math.min(10, LIMITS.maxH),
  text: 'Dein Text', font: DEFAULT_FONT, bg: '#ffffff', fg: '#1d1d1b',
};
try { Object.assign(state, JSON.parse(localStorage.getItem(LS_KEY) || '{}')); } catch {}
state.wcm = Math.min(Math.max(state.wcm, LIMITS.minW), LIMITS.maxW);
state.hcm = Math.min(Math.max(state.hcm, LIMITS.minH), LIMITS.maxH);

const save = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {} };
const fmt = (v) => v.toLocaleString('de-DE', { maximumFractionDigits: 1 });
const currentLayout = () => layout(state, getFont(state.font));

// ---- Maße ---------------------------------------------------------------
function readNum(input) { return Math.round(parseFloat(String(input.value).replace(',', '.')) * 10) / 10; }
function sizeError(w, h) {
  if (!Number.isFinite(w) || !Number.isFinite(h)) return 'Bitte Breite und Höhe angeben.';
  if (w < LIMITS.minW || w > LIMITS.maxW) return `Die Breite muss zwischen ${fmt(LIMITS.minW)} und ${fmt(LIMITS.maxW)} cm liegen.`;
  if (h < LIMITS.minH || h > LIMITS.maxH) return `Die Höhe muss zwischen ${fmt(LIMITS.minH)} und ${fmt(LIMITS.maxH)} cm liegen.`;
  return '';
}
function onSize() {
  const w = readNum(els.w), h = readNum(els.h);
  const err = sizeError(w, h);
  els.sizeErr.textContent = err;
  els.w.setAttribute('aria-invalid', String(!(w >= LIMITS.minW && w <= LIMITS.maxW)));
  els.h.setAttribute('aria-invalid', String(!(h >= LIMITS.minH && h <= LIMITS.maxH)));
  if (err) return;
  state.wcm = w; state.hcm = h;
  draw(); save();
}

// ---- Farbfelder ---------------------------------------------------------
function buildSwatches(container, key, label) {
  container.innerHTML = '';
  for (const [name, hex] of COLORS) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'swatch'; b.style.setProperty('--c', hex);
    b.title = name; b.setAttribute('aria-label', `${label}: ${name}`); b.dataset.hex = hex;
    b.onclick = () => { state[key] = hex; syncSwatches(); draw(); save(); };
    container.appendChild(b);
  }
  const custom = document.createElement('label');
  custom.className = 'swatch custom'; custom.title = 'Eigene Farbe';
  custom.innerHTML = `<input type="color" aria-label="${label}: eigene Farbe">`;
  const input = custom.querySelector('input');
  input.oninput = () => { state[key] = input.value; syncSwatches(); draw(); };
  input.onchange = save;
  container.appendChild(custom);
}
function syncSwatches() {
  for (const [container, key] of [[els.bg, 'bg'], [els.fg, 'fg']]) {
    let matched = false;
    container.querySelectorAll('button.swatch').forEach((b) => {
      const on = b.dataset.hex.toLowerCase() === state[key].toLowerCase();
      matched ||= on;
      b.setAttribute('aria-pressed', String(on));
    });
    const custom = container.querySelector('.custom');
    custom.classList.toggle('active', !matched);
    custom.querySelector('input').value = state[key];
    if (!matched) custom.style.setProperty('--c', state[key]); else custom.style.removeProperty('--c');
  }
}

// ---- Vorschau -----------------------------------------------------------
function draw() {
  const lay = currentLayout();
  const P = lay.P;
  const box = els.wrap.getBoundingClientRect();
  const scale = Math.max(0.05, Math.min((box.width - 24) / P.w, (box.height - 24) / P.h));
  const dpr = window.devicePixelRatio || 1;
  const c = els.canvas;
  c.style.width = `${Math.round(P.w * scale)}px`;
  c.style.height = `${Math.round(P.h * scale)}px`;
  c.width = Math.round(P.w * scale * dpr);
  c.height = Math.round(P.h * scale * dpr);
  drawCanvas(c.getContext('2d'), state, lay, scale * dpr, { guides: els.guides.checked });
  els.dims.textContent = `Endformat ${fmt(state.wcm)} × ${fmt(state.hcm)} cm · mit Beschnitt ${fmt(P.w / 10)} × ${fmt(P.h / 10)} cm`;
}

// ---- Export -------------------------------------------------------------
async function runExport(kind) {
  const err = sizeError(readNum(els.w), readNum(els.h));
  if (err) { els.exportMsg.textContent = err; els.exportMsg.className = 'hint error'; return; }
  const lay = currentLayout();
  const base = `folie_${String(state.wcm).replace('.', ',')}x${String(state.hcm).replace('.', ',')}cm`;
  try {
    if (kind === 'png') {
      const { blob, dpi } = await exportPNG(state, lay, PNG_DPI);
      download(blob, `${base}_${dpi}dpi.png`);
      els.exportMsg.textContent = dpi < PNG_DPI ? `PNG mit ${dpi} dpi erstellt (Browser-Grenze).` : `PNG mit ${dpi} dpi erstellt.`;
    } else if (kind === 'svg') {
      download(exportSVG(state, lay, { font: fontLabel(state.font) }), `${base}.svg`);
      els.exportMsg.textContent = 'SVG erstellt.';
    } else {
      download(exportPDF(state, lay), `${base}.pdf`);
      els.exportMsg.textContent = 'PDF erstellt.';
    }
    els.exportMsg.className = 'hint ok';
  } catch (e) {
    console.error(e);
    els.exportMsg.textContent = e.message || 'Export fehlgeschlagen.';
    els.exportMsg.className = 'hint error';
  }
}

// ---- Start --------------------------------------------------------------
async function boot() {
  const available = await loadFonts();
  if (!available.length) { els.dims.textContent = 'Keine Schrift gefunden – bitte den Ordner fonts/ prüfen.'; return; }
  if (!available.some((f) => f.id === state.font)) {
    state.font = available.some((f) => f.id === DEFAULT_FONT) ? DEFAULT_FONT : FALLBACK_FONT;
  }
  els.font.innerHTML = available.map((f, i) =>
    `<option value="${f.id}" style="font-family:'Folie ${f.id}'">${f.label}${i === 0 ? ' – Standard' : ''}</option>`).join('');
  els.font.value = state.font;

  Object.assign(els.w, { min: LIMITS.minW, max: LIMITS.maxW, value: state.wcm });
  Object.assign(els.h, { min: LIMITS.minH, max: LIMITS.maxH, value: state.hcm });
  els.sizeHint.textContent = `Breite bis ${fmt(LIMITS.maxW)} cm, Höhe bis ${fmt(LIMITS.maxH)} cm. Alle Exporte enthalten rundum ${BLEED_MM} mm Beschnitt.`;
  els.text.value = state.text;

  buildSwatches(els.bg, 'bg', 'Hintergrundfarbe');
  buildSwatches(els.fg, 'fg', 'Textfarbe');
  syncSwatches();

  els.w.addEventListener('input', onSize);
  els.h.addEventListener('input', onSize);
  els.text.addEventListener('input', () => { state.text = els.text.value; draw(); save(); });
  els.font.addEventListener('change', () => { state.font = els.font.value; draw(); save(); });
  els.guides.addEventListener('change', draw);
  document.querySelectorAll('[data-export]').forEach((b) => { b.onclick = () => runExport(b.dataset.export); });
  new ResizeObserver(draw).observe(els.wrap);
  draw();
}

boot();
