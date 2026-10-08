# Folieneditor

Schlanker Editor für individuell beschriftete Folien, z. B. Treppenfolien.

- Breite und Höhe in cm (höchstens 200 × 15 cm, mindestens 5 × 2 cm)
- Text (mehrzeilig), passt sich automatisch an die Fläche an
- Bild oder Logo hochladen: links oder rechts neben dem Text oder als Hintergrund
- Schriftart per Dropdown, Grundschrift als Standard
- Hintergrund- und Textfarbe
- Export als **PDF**, **SVG** oder **PNG**, jeweils mit 2 mm Beschnitt auf allen Seiten

Ausführliche Beschreibung aller Funktionen: [docs/DOKUMENTATION.md](docs/DOKUMENTATION.md)

## Starten

Lokal:

    python3 serve.py

Dann `http://localhost:4599/index.html` öffnen. Ein Doppelklick auf `index.html` funktioniert nicht, weil der Browser JavaScript-Module dann blockiert.

Online über GitHub Pages: **Settings → Pages → Deploy from a branch → main / (root)**.

## Exporte

| Format | Art | Inhalt |
|---|---|---|
| PDF | Vektor | Seitengröße = Endformat + 2 mm Beschnitt je Seite, mit TrimBox (Endformat) und BleedBox für die Druckerei; Fotos als JPEG, Logos mit Transparenz |
| SVG | Vektor | Maße in mm, Text als Pfade, Bild eingebettet |
| PNG | Raster | 150 dpi, Auflösung in der Datei eingetragen |

In PDF und SVG ist der Text in Pfade umgewandelt. Die Dateien sehen deshalb überall gleich aus, auch wenn die Schrift auf dem Rechner der Druckerei fehlt. Alle drei Formate werden aus denselben Schriftdaten erzeugt und sind deckungsgleich.

Farben werden als RGB ausgegeben. Im Druck (CMYK) können kräftige Töne wie Türkis, Grün oder Pink etwas anders aussehen.

## Höchstmaße ändern

Standard sind 200 × 15 cm. Per URL lässt sich das anpassen, z. B. `index.html?maxw=150&maxh=20`, oder dauerhaft in `src/main.js` (Konstante `LIMITS`).

## Grundschrift

Die Grundschrift ist aus Lizenzgründen nicht enthalten. Eine lizenzierte Datei als
`fonts/grundschrift.otf`, `.ttf` oder `.woff` ablegen (nicht `.woff2`). Sie erscheint
dann automatisch als Standard im Dropdown. Ohne Datei ist Andika der Standard.

Die mitgelieferten Schriften stehen unter der SIL Open Font License (siehe `fonts/LIZENZEN.md`).

## Dateien

- `index.html`, `styles.css` – Oberfläche
- `src/main.js` – Bedienung, Bild-Upload, Speicherstand im Browser
- `src/layout.js` – Satz in Millimetern (Text und Bild), Beschnitt (2 mm) und Sicherheitsabstand (3 mm), Vorschau
- `src/export.js` – PNG-, SVG- und PDF-Export
- `src/fonts.js` – Schriftliste
- `fonts/` – Schriftdateien
- `vendor/opentype.min.mjs` – opentype.js 2.0 (MIT-Lizenz) zum Lesen der Schriften
