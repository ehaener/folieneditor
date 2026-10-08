// Markup des Editors. Wird in einen beliebigen Container eingesetzt, damit derselbe
// Editor als eigene Seite (index.html) und im Shop (WordPress-Plugin) läuft.
// Alle IDs tragen das Präfix "fe-", damit sie nicht mit dem Theme kollidieren.

const DOWNLOAD = `
      <section class="fe-export">
        <h2>Exportieren</h2>
        <div class="fe-export-btns">
          <button type="button" class="fe-primary" data-export="pdf">PDF</button>
          <button type="button" class="fe-primary" data-export="svg">SVG</button>
          <button type="button" class="fe-primary" data-export="png">PNG</button>
        </div>
        <p class="fe-hint" id="fe-exportMsg">PDF und SVG sind Vektordateien in Originalgröße, der Text ist in Pfade umgewandelt, Bilder sind eingebettet. PNG mit 150 dpi.</p>
      </section>`;

const SHOP = `
      <section class="fe-export fe-buy">
        <h2>Preis</h2>
        <p class="fe-price"><strong id="fe-price"></strong> <span class="fe-hint" id="fe-taxNote"></span></p>
        <div class="fe-buy-row">
          <label class="fe-qty"><span>Anzahl</span><input id="fe-qty" type="number" min="1" max="999" step="1" value="1" inputmode="numeric" /></label>
          <button type="button" class="fe-primary" id="fe-addToCart">In den Warenkorb</button>
        </div>
        <p class="fe-hint" id="fe-exportMsg"></p>
      </section>`;

export function template({ shop = false } = {}) {
  return `
  <div class="fe-app">
    <div class="fe-panel">
      <section>
        <h2>Größe</h2>
        <div class="fe-size">
          <label class="fe-field">
            <span>Breite</span>
            <span class="fe-unit"><input id="fe-w" type="number" inputmode="decimal" step="0.1" /><em>cm</em></span>
          </label>
          <span class="fe-times" aria-hidden="true">×</span>
          <label class="fe-field">
            <span>Höhe</span>
            <span class="fe-unit"><input id="fe-h" type="number" inputmode="decimal" step="0.1" /><em>cm</em></span>
          </label>
        </div>
        <p class="fe-hint" id="fe-sizeHint"></p>
        <p class="fe-error" id="fe-sizeErr" role="alert"></p>
      </section>

      <section>
        <h2><label for="fe-text">Text</label></h2>
        <textarea id="fe-text" rows="3" maxlength="300" spellcheck="true" placeholder="Dein Text"></textarea>
        <p class="fe-hint">Neue Zeile mit Enter. Die Schrift passt sich automatisch an.</p>
      </section>

      <section>
        <h2>Bild oder Logo</h2>
        <div class="fe-img-pick">
          <label class="fe-file-btn"><input type="file" id="fe-imgFile" accept="image/*" /><span id="fe-imgPickLabel">Bild wählen …</span></label>
          <button type="button" class="fe-link-btn" id="fe-imgRemove" hidden>Entfernen</button>
        </div>
        <div class="fe-img-opts" id="fe-imgOpts" hidden>
          <label class="fe-field"><span>Position</span><select id="fe-imgPos"></select></label>
          <label class="fe-field" id="fe-imgScaleField"><span>Größe <output id="fe-imgScaleOut"></output></span><input type="range" id="fe-imgScale" min="30" max="100" step="5" /></label>
        </div>
        <p class="fe-hint" id="fe-imgHint">Optional, z. B. ein Logo oder Foto. Logos am besten als PNG mit transparentem Hintergrund.</p>
        <p class="fe-error" id="fe-imgErr" role="alert"></p>
      </section>

      <section>
        <h2><label for="fe-font">Schriftart</label></h2>
        <select id="fe-font"></select>
      </section>

      <section>
        <h2>Hintergrundfarbe</h2>
        <div class="fe-swatches" id="fe-bgSw"></div>
      </section>

      <section>
        <h2>Textfarbe</h2>
        <div class="fe-swatches" id="fe-fgSw"></div>
      </section>
${shop ? SHOP : DOWNLOAD}
    </div>

    <div class="fe-stage">
      <div class="fe-canvas-wrap" id="fe-wrap"><canvas id="fe-preview" aria-label="Vorschau der Folie" role="img"></canvas></div>
      <div class="fe-stage-foot">
        <p class="fe-dims" id="fe-dims"></p>
        <label class="fe-check"><input type="checkbox" id="fe-guides" checked /> Hilfslinien</label>
      </div>
      <ul class="fe-legend" aria-label="Legende">
        <li><i class="fe-lg-bleed"></i>Beschnitt (2 mm, wird abgeschnitten)</li>
        <li><i class="fe-lg-trim"></i>Schnittkante</li>
        <li><i class="fe-lg-safe"></i>Sicherheitsabstand für Text und Logo</li>
      </ul>
    </div>
  </div>`;
}
