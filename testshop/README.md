# Testshop

Ein leerer WordPress-Shop mit WooCommerce zum Ausprobieren, ohne Installation und ohne
den echten Shop anzufassen.

## Starten (ein Klick)

**https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/ehaener/folieneditor/main/testshop/blueprint.json**

Der Start dauert beim ersten Mal 1–2 Minuten. Dann ist man als Admin angemeldet und landet
auf dem Produkt „Treppenfolie individuell“ mit dem Editor.

Was eingerichtet wird (`blueprint.json`):

- WordPress auf Deutsch, aktuelles WooCommerce
- Euro, Deutschland, Preise inkl. MwSt., Shop sofort sichtbar
- das Plugin **Folieneditor für WooCommerce** (aus `wordpress-plugin/dist/`)
- Produkt „Treppenfolie individuell“ mit eingeschaltetem Editor
- Zahlarten „Kauf auf Rechnung (Test)“ und „Vorkasse (Test)“, es wird nichts berechnet
- kein Versand (damit die Kasse ohne Versandzonen funktioniert)

## Gut zu wissen

- Der Shop läuft **nur im eigenen Browser**. Niemand sonst sieht ihn, es gehen keine Mails raus.
- Beim Schließen des Tabs ist alles weg, der nächste Start beginnt frisch. Das ist gewollt.
- Es ist ein **leerer** Shop, nicht die Kopie von schultreppe.de. Für den letzten Test vor dem
  Livegang gibt es eine Staging-Kopie des echten Shops (siehe unten).

## Staging-Kopie des echten Shops

Für den Abschlusstest mit eigenem Theme, Plugins und Einstellungen:

1. Beim Hoster nach „Staging“ suchen, viele haben das mit einem Klick. Sonst im echten
   WordPress das kostenlose Plugin **WP Staging** installieren und eine Kopie anlegen.
2. In der Kopie testen. Der echte Shop bleibt unberührt.
3. Vorher prüfen, dass die Kopie **keine Mails an echte Kunden** verschickt (WP Staging
   schaltet das standardmäßig ab).

Die Staging-Kopie gehört **nicht** in dieses Repo, weil sie Kundendaten und Passwörter enthält.
