# Folieneditor

Schlanker Editor für individuell beschriftete Folien, z. B. Treppenfolien.

- Breite und Höhe in cm (höchstens 200 × 15 cm, mindestens 5 × 2 cm)
- Text (mehrzeilig), passt sich automatisch an die Fläche an
- Bild oder Logo hochladen: links oder rechts neben dem Text oder als Hintergrund
- Schriftart per Dropdown, Grundschrift als Standard
- Hintergrund- und Textfarbe
- Export als **PDF**, **SVG** oder **PNG**, jeweils mit 2 mm Beschnitt auf allen Seiten

Ausführliche Beschreibung aller Funktionen: [docs/DOKUMENTATION.md](docs/DOKUMENTATION.md)

Testshop mit WordPress und WooCommerce im Browser: [testshop/README.md](testshop/README.md)

Planung der Shop-Anbindung (WooCommerce): [docs/SHOP-ANBINDUNG.md](docs/SHOP-ANBINDUNG.md)

**WordPress-Plugin** für den Shop (Editor auf der Produktseite, Bestellung mit Druck-PDF): [wordpress-plugin/README.md](wordpress-plugin/README.md)

## Starten

Lokal:

    python3 serve.py

Dann `http://localhost:4599/index.html` öffnen. Ein Doppelklick auf `index.html` funktioniert nicht, weil der Browser JavaScript-Module dann blockiert.

Online über GitHub Pages: **Settings → Pages → Deploy from a branch → main / (root)**.

**Bei jeder Veröffentlichung** die Versionsnummer `?v=…` erhöhen, und zwar überall gleich: in `index.html` (CSS und `main.js`) und bei allen Imports in `src/*.js` (z. B. `grep -rn "?v=" index.html src`). GitHub Pages hält Dateien sonst etwa 10 Minuten im Browser-Cache, und alte und neue Dateien können sich mischen.

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

- `index.html` – eigene Seite, startet den Editor
- `styles.css` – Gestaltung (alles unter `.fe` gekapselt, damit es auch in fremden Seiten läuft)
- `src/ui.js` – Markup des Editors
- `src/main.js` – Bedienung, Bild-Upload, Speicherstand im Browser (`mount()`)
- `src/shop.js` – Start im Shop: Preis, Warenkorb (WordPress-Plugin)
- `src/layout.js` – Satz in Millimetern (Text und Bild), Beschnitt (2 mm) und Sicherheitsabstand (3 mm), Vorschau
- `src/export.js` – PNG-, SVG- und PDF-Export
- `src/fonts.js` – Schriftliste
- `fonts/` – Schriftdateien
- `wordpress-plugin/` – WordPress-/WooCommerce-Plugin
- `testshop/` – Testshop im Browser
- `vendor/opentype.min.mjs` – opentype.js 2.0 (MIT-Lizenz) zum Lesen der Schriften
