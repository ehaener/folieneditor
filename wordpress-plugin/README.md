# Folieneditor für WooCommerce (WordPress-Plugin)

Mit diesem Plugin gestalten Kunden ihre Treppenfolie direkt auf der Produktseite im Shop:
Größe, Text, Logo, Schrift und Farben. Der Preis wird aus den Maßen berechnet. Das fertige
Druck-PDF (mit 2 mm Beschnitt) hängt an der Bestellung.

**Download:** [`dist/folieneditor-woocommerce.zip`](dist/folieneditor-woocommerce.zip)

---

## Installation

1. ZIP herunterladen: auf GitHub die Datei `wordpress-plugin/dist/folieneditor-woocommerce.zip`
   öffnen und auf **Download** (bzw. „Download raw file“) klicken.
2. In WordPress: **Plugins → Installieren → Plugin hochladen** → ZIP auswählen →
   **Jetzt installieren** → **Aktivieren**.
3. **Preise einstellen:** **WooCommerce → Einstellungen → Produkte → Folieneditor**
   - Grundpreis, Preis pro m², Mindestpreis
   - erlaubte Breite und Höhe
4. **Produkt anlegen** (oder ein bestehendes nehmen):
   - Produkttyp **Einfaches Produkt**
   - **Regulärer Preis** ausfüllen, am besten mit dem Mindestpreis (WooCommerce braucht einen
     Preis, der echte Preis wird aber aus den Maßen berechnet)
   - Im Reiter **Allgemein** das Häkchen **„Folieneditor“** setzen
   - Steuerklasse, Lieferzeit (Germanized) usw. wie bei anderen Produkten
5. Produktseite im Shop öffnen. Der Editor erscheint unter dem Produktbild.

**Update:** neue ZIP-Datei genauso hochladen. WordPress fragt dann, ob die vorhandene
Version ersetzt werden soll → **Ersetzen**.

---

## Was das Plugin macht

### Im Shop (Kundensicht)

- Auf Produkten mit Häkchen „Folieneditor“ erscheint der Editor unter der Produktzusammenfassung
  in voller Breite. Der normale „In den Warenkorb“-Knopf wird ausgeblendet. Oben gibt es
  stattdessen einen Link **„Jetzt gestalten“**.
- Der Preis aktualisiert sich live, auch für mehrere Stück.
- Bei Klick auf **In den Warenkorb** erzeugt der Browser das Druck-PDF und ein Vorschaubild und
  schickt beides mit der Gestaltung an den Shop.
- Im Warenkorb stehen das Vorschaubild, die Größe, der Text, die Schrift, die Farben (mit CMYK-Werten, z. B. „Blau (C100 M60 Y0 K0)“) und das Logo.
- Der Produktpreis wird als **„ab 19,00 €“** angezeigt (Mindestpreis).
- In Produktlisten heißt der Knopf **„Jetzt gestalten“** und führt zur Produktseite.

### Für dich (Backend)

- In der Bestellung steht unter der Position die Gestaltung (Größe, Text, Schrift, Farben, Bild),
  dazu ein Vorschaubild und der Knopf **„Druck-PDF herunterladen“**.
  Hintergrund und Text sind darin in CMYK.
- Die Gestaltung steht auch in den Bestell-Mails an Kunde und Shop.

### Druckdateien für die Produktion

Jede Folie einer Bestellung ist eine eigene Position mit eigenem Druck-PDF, auch wenn ein Kunde
mehrere verschiedene Folien bestellt. Für die Weiterverarbeitung gibt es:

- **Box „Druckdateien“** rechts in jeder Bestellung: alle Folien mit Stückzahl, jede einzeln
  herunterladbar, dazu **„Alle als ZIP herunterladen“**.
- **Sammel-Download** für mehrere Bestellungen: in der Bestellliste die Bestellungen markieren,
  dann **Aktionen → „Druckdateien herunterladen (ZIP)“** → Übernehmen. Praktisch für einen
  Produktionstag.
- **Automatisch per E-Mail nach der Bezahlung:** Unter *Einstellungen → Produkte → Folieneditor →
  Druckdateien* eine Adresse eintragen, z. B. die der Druckerei. Sobald eine Bestellung bezahlt
  ist (Status „In Bearbeitung“), geht dorthin eine Mail mit allen PDFs als ZIP. Das passiert
  einmal pro Bestellung und wird als Notiz in der Bestellung vermerkt. In der Box lässt sie sich
  **erneut senden**.
  - Bei **Kauf auf Rechnung** wird oft vor der Zahlung produziert. Dafür gibt es die Einstellung
    „schon bei Kauf auf Rechnung / Vorkasse (Status ‚In Wartestellung‘)“.
  - ZIPs über 15 MB werden nicht angehängt. Dann steht in der Mail der Link zur Bestellung im Backend.

**Dateinamen:** `Bestellnummer-Position_StückzahlX_Endformat.pdf`, z. B.
`1234-02_3x_150x15cm.pdf` = Bestellung 1234, Position 2, **3 Stück**, 150 × 15 cm. Mit Germanized
Pro steht dort die Bestellnummer von Germanized.

**Im ZIP** liegt zusätzlich **`auftrag.csv`** (öffnet in Excel): eine Zeile pro Folie mit
Bestellung, Position, Menge, Breite, Höhe, Text, Schrift, Hintergrund- und Textfarbe (CMYK),
Bild/Logo und Dateiname.

### Sicherheit

- **Der Preis wird auf dem Server berechnet**, nicht im Browser. Wer im Browser manipuliert,
  kann den Preis nicht ändern.
- Maße, Schrift und Farben werden auf dem Server geprüft. Ungültige Werte werden mit einer
  Fehlermeldung abgelehnt.
- Hochgeladene Dateien müssen echte PDFs bzw. PNGs sein und bekommen zufällige Namen.
- Druck-PDFs sind nicht direkt abrufbar (unter Apache per `.htaccess` gesperrt). Herunterladen
  geht nur im Backend mit Berechtigung „Bestellungen bearbeiten“.

### Aufräumen

Dateien liegen unter `wp-content/uploads/folieneditor/`. Was **30 Tage** lang zu keiner
Bestellung gehört (z. B. aus abgebrochenen Warenkörben), löscht das Plugin automatisch.
Dateien zu Bestellungen bleiben erhalten, z. B. für Nachdrucke.

---

## Gut zu wissen

- **Upload-Größe:** Die Druckdatei mit Logo ist meist 0,1–3 MB groß. Erlaubt der Server weniger,
  bekommt der Kunde eine verständliche Meldung. Die aktuelle Grenze steht unter
  *Einstellungen → Produkte → Folieneditor*. Empfehlung: mindestens 16 MB
  (`upload_max_filesize` und `post_max_size`, über den Hoster einstellbar).
- **Nur einfache Produkte.** Variable Produkte werden (noch) nicht unterstützt.
- **Ein Editor pro Seite.**
- **Shortcode:** Falls das Theme den Editor nicht an der richtigen Stelle zeigt, kann
  `[folieneditor]` in die Produktbeschreibung gesetzt werden. Dann erscheint er dort. Auf
  anderen Seiten geht `[folieneditor product="123"]` (Produkt-ID).
- **„Nochmal bestellen“** aus dem Kundenkonto funktioniert bei gestalteten Folien nicht. Der
  Kunde muss neu gestalten.
- **Preise und Steuern:** Die Beträge in den Einstellungen gelten so, wie im Shop unter
  *Einstellungen → MwSt.* festgelegt (inkl. oder zzgl. MwSt.).
- **Datenschutz:** In der Datenschutzerklärung erwähnen, dass hochgeladene Bilder für die
  Herstellung gespeichert werden.

---

## Getestet

Hier in der Entwicklungsumgebung wurde mit **WordPress 7.1.2, WooCommerce 11.1.2, PHP 8.3**
und dem Block-Theme **Twenty Twenty-Five** getestet (Warenkorb- und Kassen-Block). Komplett
durchgespielt wurden:

- Gestalten mit Logo → Warenkorb → Kasse → Bestellung
- Preisberechnung, auch bei mehreren Stück
- Vorschau und PDF-Download im Backend, Schutz der PDFs vor direktem Zugriff
- Ablehnung von falschen Maßen, gefälschten Dateien und „In den Warenkorb“ ohne Gestaltung
- Handy-Ansicht
- Bestellung mit drei verschiedenen Folien: ZIP aus der Box, Sammel-ZIP über zwei Bestellungen,
  Mail an die Druckerei genau einmal bei „In Bearbeitung“ bzw. „In Wartestellung“ (je nach Einstellung)

**Noch nicht getestet**, deshalb unbedingt auf der **Staging-Seite** prüfen:

- dein Theme (vor allem, falls es ein klassisches Theme ist)
- **Germanized Pro**: Preisangaben, Rechnungen (PDF), Checkboxen an der Kasse, Bestell-Mails
- dein Zahlungsanbieter und andere Plugins
- der echte Mailversand deines Hosters mit ZIP-Anhang

### Checkliste für den Test auf der Staging-Seite

1. Plugin installieren und aktivieren, Preise einstellen, Häkchen am Produkt setzen
2. Produktseite: Steht der Editor an einer guten Stelle? Ist der normale Warenkorb-Knopf weg?
3. Folie mit Logo gestalten, 2 Stück → In den Warenkorb
4. Warenkorb: Stimmen Vorschau, Daten und Preis? Werden Germanized-Hinweise (MwSt., Versand)
   wie gewohnt angezeigt?
5. Bestellung abschließen
6. Backend → Bestellung: Gestaltung, Vorschau und **Druck-PDF herunterladen**. PDF öffnen und prüfen
7. Bestellung mit **mehreren verschiedenen Folien**: Box „Druckdateien“ → ZIP laden, Dateinamen und
   `auftrag.csv` prüfen. Druckerei-Adresse eintragen, Bestellung auf „In Bearbeitung“ setzen und
   prüfen, ob die Mail mit ZIP ankommt (auch Spam-Ordner). Ob die Mail ankommt, hängt vom Mailversand
   des Hosters ab; bei Problemen ein SMTP-Plugin verwenden.
8. Bestell-Mail und **Germanized-Rechnung**: Stehen die Angaben zur Folie drin?
9. Auf dem Handy wiederholen

---

## Für Entwickler

| Datei | Aufgabe |
|---|---|
| `folieneditor-woocommerce/folieneditor-woocommerce.php` | Plugin-Kopf, lädt die Teile, Aufräum-Zeitplan |
| `includes/settings.php` | Einstellungen und Preisformel |
| `includes/product.php` | Häkchen am Produkt, Editor auf der Produktseite, Shortcode, „ab“-Preis |
| `includes/cart.php` | Prüfung der Gestaltung, Upload, Preis, Anzeige im Warenkorb |
| `includes/order.php` | Daten an die Bestellung, Vorschau und PDF-Download im Backend |
| `includes/production.php` | Box „Druckdateien“, ZIP mit `auftrag.csv`, Sammel-Download, Mail nach Bezahlung |
| `includes/files.php` | Ablage und Aufräumen der Dateien |
| `editor/` | Kopie des Editors aus dem Repo (wird von `build.sh` erzeugt, nicht im Git) |

**ZIP bauen:** `wordpress-plugin/build.sh`. Das Skript kopiert den aktuellen Editor (`src/`, `fonts/`,
`vendor/`, `styles.css`) ins Plugin und schreibt `dist/folieneditor-woocommerce.zip`.
Nach Änderungen am Editor oder Plugin neu bauen und `FOLIENEDITOR_VERSION` erhöhen.

Im Shop startet `src/shop.js` den Editor. Die Farbpalette steht in `src/color.js` und in
`includes/cart.php` (`FOLIENEDITOR_COLORS`). Bei Änderungen beide anpassen. Die Preisformel steht doppelt: in `src/shop.js`
(`unitPrice`, nur für die Anzeige) und in `includes/settings.php` (`folieneditor_price`,
verbindlich). Bei Änderungen beide anpassen.
