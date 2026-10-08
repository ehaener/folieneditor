// Schriften: werden einmal geladen und dienen sowohl der Vorschau als auch dem
// Export. Weil alle Formate (PNG, PDF, SVG) die Buchstaben aus denselben
// Schriftdaten als Pfade erzeugen, sehen alle Exporte exakt gleich aus.
//
// Grundschrift: aus Lizenzgründen nicht enthalten. Eine lizenzierte Datei als
// fonts/grundschrift.otf, .ttf oder .woff ablegen (nicht .woff2). Fehlt sie,
// verschwindet der Eintrag und Andika ist Standard.

import { parse } from '../vendor/opentype.min.mjs';

export const FONTS = [
  { id: 'grundschrift', label: 'Grundschrift', files: ['grundschrift.otf', 'grundschrift.ttf', 'grundschrift.woff'] },
  { id: 'andika',  label: 'Andika (Leseschrift)',   files: ['andika.woff'] },
  { id: 'playpen', label: 'Playpen (Handschrift)',  files: ['playpen-sans.woff'] },
  { id: 'nunito',  label: 'Nunito (rund)',          files: ['nunito.woff'] },
  { id: 'comic',   label: 'Comic Neue (verspielt)', files: ['comic-neue.woff'] },
  { id: 'fredoka', label: 'Fredoka (kräftig)',      files: ['fredoka.woff'] },
];

export const DEFAULT_FONT = 'grundschrift';
export const FALLBACK_FONT = 'andika';

const loaded = new Map();   // id -> opentype.Font

async function loadOne(f) {
  for (const file of f.files) {
    try {
      const res = await fetch(new URL(`../fonts/${file}`, import.meta.url));   // relativ zum Modul, nicht zur Seite
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      loaded.set(f.id, parse(buf));
      // Zusätzlich als Webfont registrieren, damit das Dropdown die Schrift zeigt
      try { document.fonts.add(await new FontFace(`Folie ${f.id}`, buf).load()); } catch {}
      return true;
    } catch (e) { console.warn(`[Schrift] ${file}:`, e); }
  }
  return false;
}

// Lädt alle Schriften und gibt die verfügbaren zurück.
export async function loadFonts() {
  const ok = await Promise.all(FONTS.map(loadOne));
  if (!ok[0]) console.info('[Schrift] Grundschrift nicht gefunden (fonts/grundschrift.otf/.ttf/.woff). Standard ist Andika.');
  return FONTS.filter((_, i) => ok[i]);
}

export function getFont(id) {
  return loaded.get(id) || loaded.get(FALLBACK_FONT) || loaded.values().next().value;
}

export function fontLabel(id) {
  return FONTS.find((f) => f.id === id)?.label || id;
}
