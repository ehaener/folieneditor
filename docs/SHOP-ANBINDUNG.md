# Shop-Anbindung: Folieneditor in schultreppe.de (WooCommerce)

Stand: 08.10.2026. **Plugin gebaut und im Test-Shop geprüft**, Test auf der Staging-Seite steht aus.
Installation und Details: [`wordpress-plugin/README.md`](../wordpress-plugin/README.md)

Ziel: Kunden gestalten ihre Treppenfolie direkt im Shop und bestellen sie wie jedes
andere Produkt. Die Druckerei-Datei hängt automatisch an der Bestellung.

---

## 1. Entscheidung: WooCommerce-Plugin statt Firebase

Erwogen wurde zuerst Firebase (Hosting, Datenbank, Speicher, Cloud Functions).
schultreppe.de läuft aber bereits mit **WooCommerce**. Das bringt fast alles schon mit,
was Firebase liefern würde:

| Aufgabe | Firebase | WooCommerce |
|---|---|---|
| Hosting | Firebase Hosting | vorhanden (WordPress) |
| Daten speichern | Firestore | vorhanden (WordPress-Datenbank) |
| Bilder/PDFs ablegen | Storage | vorhanden (Mediathek / Uploads) |
| Bestellungen, Rechnung, Mails | selbst bauen (Functions) | vorhanden |
| Bezahlung (Rechnung, PayPal …) | selbst bauen (Stripe) | vorhanden |
| Kundenkonten | Firebase Auth | vorhanden |

Mit Firebase gäbe es zwei Systeme, die über Domains hinweg zusammenspielen müssten:
mehr Aufwand, mehr Fehlerquellen, mehr Datenschutzfragen.

**Entscheidung:** Der Editor kommt als **eigenes WordPress-Plugin** in den Shop.
Firebase wird nicht gebraucht.

Firebase wäre nur sinnvoll, wenn es **keinen** Shop gäbe oder der Editor unabhängig
von WordPress laufen soll (dann: Firebase Hosting unter z. B. `editor.schultreppe.de`,
Firestore für Entwürfe, Storage für Logos/PDFs, Cloud Functions für Bestell-Mails,
Region `europe-west3` Frankfurt).

---

## 2. Ablauf für den Kunden

1. Produkt „Treppenfolie individuell“ öffnen
2. Direkt auf der Produktseite gestalten: Größe, Text, Logo, Schrift, Farben
3. Preis aktualisiert sich live
4. **„In den Warenkorb“** – im Warenkorb stehen Vorschaubild und Maße
5. Ganz normal bezahlen (Rechnung, PayPal, … wie im Shop eingestellt)

## 3. Ablauf für den Shopbetreiber

- In der WooCommerce-Bestellung hängt das **fertige Druck-PDF** (2 mm Beschnitt)
- Download mit einem Klick, weiter an die Druckerei
- Bestell-Mails, Rechnungen und Abläufe bleiben wie bisher

---

## 4. Das Plugin `folieneditor-woocommerce`

| Teil | Aufgabe |
|---|---|
| Shortcode `[folieneditor]` / Produktseite | zeigt den Editor im Shop |
| „In den Warenkorb“ | übergibt die Gestaltung (Maße, Text, Schrift, Farben, Bild) an den Warenkorb |
| Preisberechnung **auf dem Server** | Preis wird in PHP neu berechnet, damit niemand ihn im Browser manipulieren kann |
| Druck-PDF + Vorschaubild | werden beim Bestellen gespeichert und an der Bestellung abgelegt |
| Anzeige | Vorschau im Warenkorb, in der Bestellung, in der Bestell-Mail und im Admin |
| Einstellungen im Backend | Preis pro m², Mindestpreis, Höchstmaße |

- Der Editor-Code bleibt in diesem Repo, das Plugin ist nur die Hülle.
- Installation: Plugin-ZIP unter *Plugins → Installieren → Plugin hochladen*.

### Später möglich (ebenfalls ohne Firebase)

- **Treppen-Projekte:** eine ganze Treppe mit 10–20 Stufen, jede Stufe mit eigenem Text,
  gemeinsames Design, ein PDF mit nummerierten Stufen für die Montage
- **Vorlagen:** Einmaleins, Alphabet, Mut-Sprüche … im Backend pflegbar
- **Entwurf speichern und teilen:** Link an Kollegium/Schulleitung zur Freigabe

### Datenschutz

- Hochgeladene Logos/Bilder nur so lange speichern wie nötig, nach Abwicklung löschen
- Datenschutzerklärung um den Bild-Upload ergänzen
- Bildrechte: Hinweis im Editor, dass nur eigene/erlaubte Bilder verwendet werden dürfen

---

## 5. Geklärte Fragen

| Frage | Antwort |
|---|---|
| Plugins installierbar? | Ja |
| Rechtstexte-Plugin | **Germanized Pro** |
| Staging | beim Hoster möglich |
| Preismodell | noch offen. Im Plugin einstellbar als Grundpreis + Preis pro m² + Mindestpreis |

---

## 6. Testumgebung

Getestet wird **nie im Live-Shop**. Es gibt zwei Stufen:

### Stufe 1: Testshop im Browser (für die Entwicklung)

Leerer WordPress-Shop mit WooCommerce über WordPress Playground, ohne Installation:
**https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/ehaener/folieneditor/main/testshop/blueprint.json**

Details in [`testshop/README.md`](../testshop/README.md). Läuft nur im eigenen Browser,
nach dem Schließen ist alles weg.

### Stufe 2: Staging-Kopie des echten Shops (Abschlusstest)

Eine Kopie von schultreppe.de mit eigenem Theme, Plugins und Einstellungen, getrennt
vom Live-Shop:

- beim Hoster per „Staging“-Funktion, oder
- mit dem kostenlosen Plugin **WP Staging**
- darauf achten, dass die Kopie **keine Mails an echte Kunden** verschickt

### Warum die bestehende Website nicht ins Repo kommt

Die Frage war, ob man schultreppe.de einfach in dieses Repository importieren und hier
testen kann. **Nein, aus drei Gründen:**

1. **Kundendaten:** Die WordPress-Datenbank enthält Bestellungen, Namen, Adressen und
   E-Mails von Schulen und Kunden. In einem (öffentlichen) GitHub-Repo wäre das ein
   Datenschutzverstoß (DSGVO).
2. **Zugangsdaten:** `wp-config.php` enthält Datenbank-Passwort und Sicherheitsschlüssel.
   Einmal auf GitHub, gelten sie als verbrannt.
3. **Es würde nicht laufen:** GitHub Pages kann nur statische Dateien ausliefern, kein
   PHP und keine Datenbank. WordPress läuft dort nicht.

Ins Repo gehören nur **eigener Code** (Editor, Plugin) und die Testshop-Konfiguration.
Die Kopie des echten Shops lebt beim Hoster (Stufe 2).

Optional später: Liste von Theme und Plugins des echten Shops (ohne Daten) in den
Testshop übernehmen, damit Stufe 1 dem echten Shop ähnlicher wird.

---

## 7. Reihenfolge

1. ✅ Testshop im Browser (`testshop/`)
2. ✅ Fragen geklärt (Abschnitt 5), außer dem Preismodell
3. ✅ Plugin gebaut: Editor im Produkt, Warenkorb, Preis, Druck-PDF an Bestellung
4. ✅ Im Test-Shop (WooCommerce 11.1) komplett durchgespielt
5. ⬜ Preise festlegen und auf der **Staging-Seite** testen (Checkliste in `wordpress-plugin/README.md`)
6. ⬜ Live schalten
6. Danach: Treppen-Projekte, Vorlagen, Entwürfe teilen
