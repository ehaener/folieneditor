# Folieneditor – Dokumentation

Der Folieneditor ist ein kleines Werkzeug im Browser, mit dem man beschriftete Folien
gestaltet, zum Beispiel Treppenfolien, Türschilder oder Banner-Streifen. Am Ende kommt
eine druckfertige Datei heraus (PDF, SVG oder PNG), die man direkt an die Druckerei
schicken kann.

Es braucht keine Anmeldung, keinen Server mit Datenbank und keine Installation. Alles
läuft im Browser. Texte und Bilder verlassen den Rechner nicht.

---

## Was der Editor kann

### 1. Größe festlegen

- Breite und Höhe in **Zentimetern** (Komma oder Punkt als Dezimaltrenner)
- Standard-Grenzen: **5 – 200 cm** breit, **2 – 15 cm** hoch
- Ungültige Werte werden rot markiert, die Vorschau bleibt dann beim letzten gültigen Maß
- Unter der Vorschau steht immer das Endformat und das Format mit Beschnitt

### 2. Text

- Mehrzeiliger Text (neue Zeile mit Enter), bis 300 Zeichen
- Die Schriftgröße passt sich **automatisch** an: so groß wie möglich, ohne den
  Sicherheitsabstand zu verlassen
- Jede Zeile wird mittig gesetzt

### 3. Bild oder Logo *(neu)*

Unter „Bild oder Logo“ kann ein eigenes Bild auf die Folie gebracht werden, etwa ein
Vereinslogo, Schullogo oder ein Foto.

| Position | Was passiert |
|---|---|
| **Links neben dem Text** | Das Bild steht links im Sicherheitsbereich, der Text rückt nach rechts und füllt den Rest |
| **Rechts neben dem Text** | Genauso, nur spiegelverkehrt |
| **Hintergrund (ganze Fläche)** | Das Bild füllt die ganze Folie inklusive Beschnitt; was übersteht, wird abgeschnitten. Der Text liegt darüber |

- **Größe** (30 – 100 %): wie hoch das Logo im Verhältnis zur nutzbaren Höhe ist.
  Ein Logo neben Text nimmt höchstens die halbe Breite ein.
- **Ohne Text** steht das Logo mittig auf der Folie.
- **Dateiformate:** alles, was der Browser lesen kann – JPG, PNG, WebP, GIF, SVG. Auf
  dem iPhone werden Fotos aus der Mediathek automatisch umgewandelt.
- **Transparenz bleibt erhalten:** Ein PNG-Logo mit transparentem Hintergrund steht
  sauber auf der gewählten Hintergrundfarbe – auch im PDF.
- **Schärfe-Hinweis:** Der Editor zeigt an, mit wie viel dpi das Bild gedruckt wird.
  Unter 100 dpi erscheint eine Warnung, dass es unscharf wirken kann.
- Große Bilder werden beim Hochladen auf höchstens 2400 Pixel (längste Seite)
  verkleinert. Das reicht für ein 15 cm hohes Logo in 300 dpi.
- Mit **„Entfernen“** verschwindet das Bild wieder.

> **Tipp Hintergrundfoto:** Eine Folie mit 100 × 15 cm ist ein sehr flacher Streifen.
> Ein normales Foto (4:3) wird dafür stark beschnitten und nur ein schmaler Ausschnitt
> ist zu sehen – und der ist oft unscharf. Für Hintergründe am besten ein Bild nehmen,
> das schon ungefähr die Form der Folie hat. Für Logos ist „Links“ oder „Rechts“ fast
> immer die bessere Wahl.

> **Bildrechte:** Nur Bilder und Logos verwenden, die man auch drucken lassen darf.

### 4. Schriftart

- Auswahl per Dropdown: Grundschrift (falls vorhanden), Andika, Playpen, Nunito,
  Comic Neue, Fredoka
- Die Schriften sind auf gute Lesbarkeit (auch für Kinder) ausgewählt
- Die **Grundschrift** ist aus Lizenzgründen nicht enthalten, kann aber nachgerüstet
  werden (siehe README)

### 5. Farben

- Je 14 feste Farben für **Hintergrund** und **Text**
- Dazu ein Farbwähler für **eigene Farben**

### 6. Vorschau

- Maßstabsgetreue Vorschau auf Millimeterpapier
- **Hilfslinien** (abschaltbar):
  - grau abgetönter Rand = **Beschnitt** (2 mm, wird abgeschnitten)
  - pinke Linie = **Schnittkante** (das bestellte Endformat)
  - blau gestrichelt = **Sicherheitsabstand** (3 mm), in dem Text und Logo bleiben
- Die Hilfslinien erscheinen nur in der Vorschau, nie in den Exporten

### 7. Export

Alle Exporte enthalten rundum **2 mm Beschnitt**.

| Format | Art | Hinweise |
|---|---|---|
| **PDF** | Vektor | Für die Druckerei. Mit TrimBox (Endformat) und BleedBox. Fotos als JPEG eingebettet, Logos mit Transparenz verlustfrei |
| **SVG** | Vektor | Maße in mm, z. B. für Schneideplotter oder zum Weiterbearbeiten in Inkscape/Illustrator. Bild eingebettet |
| **PNG** | Raster | 150 dpi, Auflösung in der Datei eingetragen. Bei sehr großen Folien wird die Auflösung wegen Browser-Grenzen ggf. reduziert (wird angezeigt) |

- Der Text ist in PDF und SVG in **Pfade umgewandelt** – die Datei sieht bei der
  Druckerei genauso aus, auch wenn dort die Schrift fehlt.
- Alle drei Formate sind deckungsgleich.
- Farben werden als **RGB** ausgegeben. Im CMYK-Druck können kräftige Töne (Türkis,
  Grün, Pink) etwas anders aussehen.
- Dateiname z. B. `folie_100x15cm.pdf`

### 8. Speichern

- Der letzte Stand (Maße, Text, Schrift, Farben, Bild-Position und -Größe) wird
  automatisch im Browser gespeichert und beim nächsten Öffnen wiederhergestellt.
- Das Bild wird ebenfalls gespeichert. Ist es dafür zu groß, erscheint ein Hinweis –
  dann muss es nach dem Neuladen der Seite erneut gewählt werden.
- Gespeichert wird nur lokal im Browser des jeweiligen Geräts.

### 9. Handy und Tablet

Auf schmalen Bildschirmen steht die Vorschau oben und das Bedienfeld darunter. Alle
Funktionen inklusive Bild-Upload gehen auch auf dem Handy.

---

## Für Admins

### Starten

Lokal:

    python3 serve.py

Dann `http://localhost:4599/index.html` öffnen. Online über GitHub Pages
(**Settings → Pages → Deploy from a branch → main / (root)**).

### Einstellungen per URL

| Parameter | Bedeutung | Beispiel |
|---|---|---|
| `maxw` | größte Breite in cm | `index.html?maxw=150` |
| `maxh` | größte Höhe in cm | `index.html?maxh=20` |

Dauerhaft änderbar in `src/main.js` (Konstante `LIMITS`). Dort stehen auch die
Farbpalette (`COLORS`), die PNG-Auflösung (`PNG_DPI`), die maximale Bildgröße beim
Hochladen (`IMG_MAX_PX`) und die dpi-Grenze für die Unschärfe-Warnung (`IMG_MIN_DPI`).

### Feste Werte (in `src/layout.js`)

| Konstante | Wert | Bedeutung |
|---|---|---|
| `BLEED_MM` | 2 | Beschnitt je Seite |
| `SAFE_MM` | 3 | Sicherheitsabstand für Text und Logo |
| `LINE_HEIGHT` | 1,2 | Zeilenabstand |
| `IMG_MAX_SHARE` | 0,5 | Logo neben Text: höchstens halbe Breite |

### Aufbau

| Datei | Aufgabe |
|---|---|
| `index.html` | eigene Seite, startet den Editor |
| `styles.css` | Gestaltung, unter `.fe` gekapselt |
| `src/ui.js` | Markup des Editors |
| `src/main.js` | Bedienung, Bild-Upload, Speicherstand im Browser (`mount()`) |
| `src/shop.js` | Start im Shop: Preis und Warenkorb |
| `src/layout.js` | Satz in Millimetern: Text, Bildplatzierung, Beschnitt, Hilfslinien |
| `src/export.js` | PNG-, SVG- und PDF-Export (PDF ohne Fremdbibliothek) |
| `src/fonts.js` | Schriftliste und Laden der Schriften |
| `fonts/` | Schriftdateien (SIL Open Font License) |
| `vendor/opentype.min.mjs` | opentype.js zum Lesen der Schriften |

Vorschau, PNG, SVG und PDF benutzen alle dasselbe Layout-Ergebnis aus `layout.js`
(Textpfade + Bildausschnitt in mm). Deshalb sehen alle Ausgaben identisch aus.

### Weitere Dokumente

- [Shop-Anbindung an WooCommerce (Planung)](SHOP-ANBINDUNG.md)
- [WordPress-Plugin: Installation und Test](../wordpress-plugin/README.md)
- [Testshop im Browser](../testshop/README.md)
