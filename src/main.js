// Folieneditor: Maße in cm, Text, Bild/Logo, Schriftart, Hintergrund- und
// Textfarbe, 2 mm Beschnitt, Export als PNG, PDF oder SVG.
//
// mount(container, options) setzt den Editor in einen Container. Als eigene Seite
// (index.html) mit Export-Knöpfen, im Shop (WordPress-Plugin, shop.js) mit Preis
// und Warenkorb-Knopf.
//
// Höchstmaße lassen sich auf der eigenen Seite per URL ändern: index.html?maxw=200&maxh=15

import { loadFonts, getFont, fontLabel, DEFAULT_FONT, FALLBACK_FONT } from './fonts.js?v=20261008-3';
import { layout, drawCanvas, imageDpi, IMG_POSITIONS, BLEED_MM } from './layout.js?v=20261008-3';
import { exportPNG, exportSVG, exportPDF, download } from './export.js?v=20261008-3';
import { template } from './ui.js?v=20261008-3';

const PNG_DPI = 150;
const IMG_MAX_PX = 2400;              // längste Bildseite nach dem Hochladen (reicht für 15 cm bei 300 dpi)
const IMG_MIN_DPI = 100;              // darunter Hinweis auf unscharfen Druck

export const COLORS = [
  ['Weiß', '#ffffff'], ['Schwarz', '#1d1d1b'], ['Grau', '#8d8d8d'], ['Rot', '#d62828'],
  ['Orange', '#f28c28'], ['Gelb', '#ffd23f'], ['Hellgrün', '#8cc63f'], ['Grün', '#2e8b57'],
  ['Türkis', '#1fb5ad'], ['Hellblau', '#4fb3e8'], ['Blau', '#1f5fad'], ['Lila', '#7b4fa0'],
  ['Pink', '#e5579b'], ['Braun', '#8b5a2b'],
];

function urlLimits() {
  const Q = new URLSearchParams(location.search);
  const num = (k, def) => { const v = parseFloat(Q.get(k)); return Number.isFinite(v) && v > 0 ? v : def; };
  return { maxW: num('maxw', 200), maxH: num('maxh', 15) };
}

// Ein Editor pro Seite: Zustand auf Modulebene, gesetzt von mount()
let LIMITS, LS_KEY, IMG_KEY, els, IMG_HINT, onChange;
const state = {
  wcm: 100, hcm: 10,
  text: 'Dein Text', font: DEFAULT_FONT, bg: '#ffffff', fg: '#1d1d1b',
  imgPos: 'left', imgScale: 100,
};
let img = null;   // HTMLImageElement des hochgeladenen Bildes

const save = () => { try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch {} };
const fmt = (v) => v.toLocaleString('de-DE', { maximumFractionDigits: 1 });
const currentLayout = () => layout(state, getFont(state.font), img);

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
    b.type = 'button'; b.className = 'fe-swatch'; b.style.setProperty('--c', hex);
    b.title = name; b.setAttribute('aria-label', `${label}: ${name}`); b.dataset.hex = hex;
    b.onclick = () => { state[key] = hex; syncSwatches(); draw(); save(); };
    container.appendChild(b);
  }
  const custom = document.createElement('label');
  custom.className = 'fe-swatch fe-custom'; custom.title = 'Eigene Farbe';
  custom.innerHTML = `<input type="color" aria-label="${label}: eigene Farbe">`;
  const input = custom.querySelector('input');
  input.oninput = () => { state[key] = input.value; syncSwatches(); draw(); };
  input.onchange = save;
  container.appendChild(custom);
}
function syncSwatches() {
  for (const [container, key] of [[els.bg, 'bg'], [els.fg, 'fg']]) {
    let matched = false;
    container.querySelectorAll('button.fe-swatch').forEach((b) => {
      const on = b.dataset.hex.toLowerCase() === state[key].toLowerCase();
      matched ||= on;
      b.setAttribute('aria-pressed', String(on));
    });
    const custom = container.querySelector('.fe-custom');
    custom.classList.toggle('active', !matched);
    custom.querySelector('input').value = state[key];
    if (!matched) custom.style.setProperty('--c', state[key]); else custom.style.removeProperty('--c');
  }
}

// ---- Bild / Logo ------------------------------------------------------
function loadImage(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('Dieses Bild kann der Browser nicht lesen. Bitte als JPG oder PNG speichern.'));
    im.src = src;
  });
}

// Verkleinert auf IMG_MAX_PX und speichert als PNG (bei Transparenz) oder JPEG.
async function prepareImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const raw = await loadImage(url);
    let w = raw.naturalWidth || 1200, h = raw.naturalHeight || 1200;   // SVG ohne Maße
    const f = Math.min(1, IMG_MAX_PX / Math.max(w, h));
    w = Math.max(1, Math.round(w * f)); h = Math.max(1, Math.round(h * f));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(raw, 0, 0, w, h);
    let alpha = false;
    if (file.type !== 'image/jpeg') {
      const px = ctx.getImageData(0, 0, w, h).data;
      for (let i = 3; i < px.length; i += 4) if (px[i] < 255) { alpha = true; break; }
    }
    const data = alpha ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.92);
    c.width = c.height = 0;
    return { data, small: f === 1 };
  } finally { URL.revokeObjectURL(url); }
}

async function onImageFile() {
  const file = els.imgFile.files[0];
  els.imgFile.value = '';
  if (!file) return;
  els.imgErr.textContent = '';
  els.imgPickLabel.textContent = 'Wird geladen …';
  try {
    const { data } = await prepareImage(file);
    img = await loadImage(data);
    let note = '';
    try { localStorage.setItem(IMG_KEY, data); }
    catch { localStorage.removeItem(IMG_KEY); note = 'Das Bild ist zu groß zum Merken – nach dem Neuladen der Seite bitte erneut wählen.'; }
    syncImage(note);
    draw();
  } catch (e) {
    console.error(e);
    els.imgErr.textContent = e.message || 'Das Bild konnte nicht geladen werden.';
    syncImage();
  }
}

function removeImage() {
  img = null;
  try { localStorage.removeItem(IMG_KEY); } catch {}
  els.imgErr.textContent = '';
  syncImage();
  draw();
}

function syncImage(note = '') {
  els.imgPickLabel.textContent = img ? 'Anderes Bild wählen …' : 'Bild wählen …';
  els.imgRemove.hidden = els.imgOpts.hidden = !img;
  els.imgPos.value = state.imgPos;
  els.imgScale.value = state.imgScale;
  els.imgScaleOut.textContent = `${state.imgScale} %`;
  els.imgScaleField.hidden = state.imgPos === 'bg';
  els.imgHint.dataset.note = note;
}

// Hinweis zur Bildschärfe, abhängig von Größe und Position
function imageHint(lay) {
  const note = els.imgHint.dataset.note || '';
  if (!lay.image) { els.imgHint.textContent = note || IMG_HINT; els.imgHint.className = 'fe-hint'; return; }
  const dpi = imageDpi(lay.image);
  const warn = dpi < IMG_MIN_DPI;
  els.imgHint.textContent = [
    warn ? `Das Bild hat für diese Größe nur etwa ${dpi} dpi und kann im Druck unscharf wirken.` : `Bildauflösung im Druck: etwa ${dpi} dpi.`,
    note,
  ].filter(Boolean).join(' ');
  els.imgHint.className = warn || note ? 'fe-hint fe-warn' : 'fe-hint';
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
  imageHint(lay);
  els.dims.textContent = `Endformat ${fmt(state.wcm)} × ${fmt(state.hcm)} cm · mit Beschnitt ${fmt(P.w / 10)} × ${fmt(P.h / 10)} cm`;
  onChange?.();
}

// ---- Export -------------------------------------------------------------
async function runExport(kind) {
  const err = sizeError(readNum(els.w), readNum(els.h));
  if (err) { els.exportMsg.textContent = err; els.exportMsg.className = 'fe-hint fe-error'; return; }
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
      download(await exportPDF(state, lay), `${base}.pdf`);
      els.exportMsg.textContent = 'PDF erstellt.';
    }
    els.exportMsg.className = 'fe-hint fe-ok';
  } catch (e) {
    console.error(e);
    els.exportMsg.textContent = e.message || 'Export fehlgeschlagen.';
    els.exportMsg.className = 'fe-hint fe-error';
  }
}

// ---- Start --------------------------------------------------------------
// options: shop (Preis/Warenkorb statt Export), limits {minW,minH,maxW,maxH},
// storageKey (Speicherstand im Browser), onChange (nach jeder Änderung).
export async function mount(root, options = {}) {
  const shop = !!options.shop;
  LIMITS = { minW: 5, minH: 2, ...(options.limits || urlLimits()) };
  LS_KEY = options.storageKey || 'folie.v1';
  IMG_KEY = options.storageKey ? `${LS_KEY}.img` : 'folie.img.v1';
  onChange = options.onChange;

  root.classList.add('fe');
  root.innerHTML = template({ shop });
  const $ = (id) => root.querySelector(`#fe-${id}`);
  els = {
    w: $('w'), h: $('h'), sizeErr: $('sizeErr'), sizeHint: $('sizeHint'),
    text: $('text'), font: $('font'), bg: $('bgSw'), fg: $('fgSw'),
    guides: $('guides'), canvas: $('preview'), wrap: $('wrap'), dims: $('dims'),
    exportMsg: $('exportMsg'),
    imgFile: $('imgFile'), imgPickLabel: $('imgPickLabel'), imgRemove: $('imgRemove'), imgOpts: $('imgOpts'),
    imgPos: $('imgPos'), imgScale: $('imgScale'), imgScaleOut: $('imgScaleOut'), imgScaleField: $('imgScaleField'),
    imgHint: $('imgHint'), imgErr: $('imgErr'),
  };
  IMG_HINT = els.imgHint.textContent;

  state.wcm = Math.min(100, LIMITS.maxW); state.hcm = Math.min(10, LIMITS.maxH);
  try { Object.assign(state, JSON.parse(localStorage.getItem(LS_KEY) || '{}')); } catch {}
  state.wcm = Math.min(Math.max(state.wcm, LIMITS.minW), LIMITS.maxW);
  state.hcm = Math.min(Math.max(state.hcm, LIMITS.minH), LIMITS.maxH);

  const [available] = await Promise.all([
    loadFonts(),
    (async () => {
      try { const src = localStorage.getItem(IMG_KEY); if (src) img = await loadImage(src); } catch {}
    })(),
  ]);
  if (!available.length) { els.dims.textContent = 'Keine Schrift gefunden – bitte den Ordner fonts/ prüfen.'; return null; }
  if (!available.some((f) => f.id === state.font)) {
    state.font = available.some((f) => f.id === DEFAULT_FONT) ? DEFAULT_FONT : FALLBACK_FONT;
  }
  els.font.innerHTML = available.map((f, i) =>
    `<option value="${f.id}" style="font-family:'Folie ${f.id}'">${f.label}${i === 0 ? ' – Standard' : ''}</option>`).join('');
  els.font.value = state.font;

  Object.assign(els.w, { min: LIMITS.minW, max: LIMITS.maxW, value: state.wcm });
  Object.assign(els.h, { min: LIMITS.minH, max: LIMITS.maxH, value: state.hcm });
  els.sizeHint.textContent = shop
    ? `Breite ${fmt(LIMITS.minW)}–${fmt(LIMITS.maxW)} cm, Höhe ${fmt(LIMITS.minH)}–${fmt(LIMITS.maxH)} cm. Gedruckt wird mit rundum ${BLEED_MM} mm Beschnitt.`
    : `Breite bis ${fmt(LIMITS.maxW)} cm, Höhe bis ${fmt(LIMITS.maxH)} cm. Alle Exporte enthalten rundum ${BLEED_MM} mm Beschnitt.`;
  els.text.value = state.text;

  buildSwatches(els.bg, 'bg', 'Hintergrundfarbe');
  buildSwatches(els.fg, 'fg', 'Textfarbe');
  syncSwatches();

  els.imgPos.innerHTML = IMG_POSITIONS.map(([v, label]) => `<option value="${v}">${label}</option>`).join('');
  if (!IMG_POSITIONS.some(([v]) => v === state.imgPos)) state.imgPos = 'left';
  syncImage();

  els.w.addEventListener('input', onSize);
  els.h.addEventListener('input', onSize);
  els.text.addEventListener('input', () => { state.text = els.text.value; draw(); save(); });
  els.font.addEventListener('change', () => { state.font = els.font.value; draw(); save(); });
  els.guides.addEventListener('change', draw);
  els.imgFile.addEventListener('change', onImageFile);
  els.imgRemove.addEventListener('click', removeImage);
  els.imgPos.addEventListener('change', () => { state.imgPos = els.imgPos.value; syncImage(els.imgHint.dataset.note); draw(); save(); });
  els.imgScale.addEventListener('input', () => { state.imgScale = +els.imgScale.value; syncImage(els.imgHint.dataset.note); draw(); save(); });
  root.querySelectorAll('[data-export]').forEach((b) => { b.onclick = () => runExport(b.dataset.export); });
  new ResizeObserver(draw).observe(els.wrap);
  draw();

  return {
    root, state, fontLabel, limits: LIMITS,
    hasImage: () => !!img,
    layout: currentLayout,
    // Fehlermeldung, falls die eingegebenen Maße (noch) ungültig sind
    sizeError: () => sizeError(readNum(els.w), readNum(els.h)),
  };
}
