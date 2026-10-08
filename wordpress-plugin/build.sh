#!/bin/sh
# Baut das Plugin-ZIP zum Hochladen in WordPress (Plugins → Installieren → Plugin hochladen).
# Kopiert den aktuellen Editor aus dem Repo in das Plugin, damit beides zusammenpasst.
set -e
cd "$(dirname "$0")"
P=folieneditor-woocommerce
rm -rf "$P/editor"
mkdir -p "$P/editor" dist
cp -r ../src ../fonts ../vendor ../styles.css "$P/editor/"
rm -f "dist/$P.zip"
zip -qr -X "dist/$P.zip" "$P"
echo "Fertig: wordpress-plugin/dist/$P.zip"
