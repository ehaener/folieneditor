# Regeln für dieses Projekt

- **Farben immer in CMYK.** Farbwerte werden als CMYK in Prozent festgelegt (`[C, M, Y, K]`, 0–100),
  nie als RGB/Hex. Im PDF stehen sie als DeviceCMYK. RGB nur als berechnete Bildschirm-Annäherung
  (`src/color.js`). Die Palette steht doppelt: `src/color.js` und
  `wordpress-plugin/folieneditor-woocommerce/includes/cart.php`. Beide gleich halten.
- **Nur im eigenen Repo veröffentlichen:** `ehaener/folieneditor`. Nichts an
  `michaelpraetorius/editor` (Original des Forks) schicken.
- **Versionsnummer bei jeder Veröffentlichung erhöhen:** `?v=…` in `index.html` und bei allen
  Imports in `src/*.js`, sonst mischt GitHub Pages alte und neue Dateien aus dem Cache.
- **Plugin:** nach Änderungen an Editor oder Plugin `wordpress-plugin/build.sh` ausführen,
  `FOLIENEDITOR_VERSION` erhöhen und das ZIP in `wordpress-plugin/dist/` mit committen.
- Dokumentation und Oberfläche auf Deutsch.
