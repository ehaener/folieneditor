// Einstieg im Shop (WordPress-Plugin "Folieneditor für WooCommerce").
// Das Plugin setzt <div data-folieneditor='{…}'> auf die Produktseite. Hier wird
// der Editor eingesetzt, der Preis live angezeigt und beim Klick auf
// "In den Warenkorb" Druck-PDF und Vorschaubild erzeugt und mit der Gestaltung
// an WooCommerce geschickt. Der Preis wird dort auf dem Server neu berechnet.

import { mount } from './main.js?v=20261008-3';
import { exportPDF, exportPreview } from './export.js?v=20261008-3';

// Gleiche Formel wie im Plugin (folieneditor_price): Grundpreis + Fläche × m²-Preis, mindestens Mindestpreis
export function unitPrice(p, wcm, hcm) {
  const v = p.base + (wcm * hcm / 10000) * p.perM2;
  return Math.round(Math.max(p.min, v) * 100) / 100;
}

async function start(root) {
  const cfg = JSON.parse(root.dataset.folieneditor);
  const money = new Intl.NumberFormat('de-DE', { style: 'currency', currency: cfg.currency || 'EUR' });
  let api = null;
  const els = {};

  const update = () => {
    if (!api || !els.price) return;
    const err = api.sizeError();
    const qty = Math.max(1, parseInt(els.qty.value, 10) || 1);
    if (err) { els.price.textContent = '–'; return; }
    const unit = unitPrice(cfg.price, api.state.wcm, api.state.hcm);
    els.price.textContent = qty > 1 ? `${money.format(unit * qty)}` : money.format(unit);
    els.taxNote.textContent = (qty > 1 ? `${qty} × ${money.format(unit)}, ` : '') + cfg.taxNote;
  };

  api = await mount(root, { shop: true, limits: cfg.limits, storageKey: `folie.shop.${cfg.productId}`, onChange: update });
  if (!api) return;
  for (const id of ['price', 'taxNote', 'qty', 'addToCart', 'exportMsg']) els[id] = root.querySelector(`#fe-${id}`);
  els.qty.addEventListener('input', update);
  els.addToCart.addEventListener('click', () => addToCart(api, cfg, els));
  // Mit "Zurück" aus dem Warenkorb: Knopf wieder freigeben
  window.addEventListener('pageshow', (e) => { if (e.persisted) { els.addToCart.disabled = false; message(els, ''); } });
  update();
}

function message(els, text, kind = '') {
  els.exportMsg.textContent = text;
  els.exportMsg.className = `fe-hint${kind ? ` fe-${kind}` : ''}`;
}

async function addToCart(api, cfg, els) {
  const err = api.sizeError();
  if (err) { message(els, err, 'error'); return; }
  if (!api.state.text.trim() && !api.hasImage()) { message(els, 'Bitte einen Text eingeben oder ein Bild wählen.', 'error'); return; }
  if (typeof DataTransfer === 'undefined') { message(els, 'Dieser Browser ist zu alt für den Upload. Bitte einen aktuellen Browser verwenden.', 'error'); return; }

  els.addToCart.disabled = true;
  message(els, 'Druckdatei wird erstellt …');
  try {
    const { state } = api;
    const lay = api.layout();
    const [pdf, preview] = await Promise.all([exportPDF(state, lay), exportPreview(state, lay)]);
    const total = pdf.size + preview.size + 50_000;
    if (total > cfg.maxUpload) {
      const mb = (n) => (n / 1048576).toLocaleString('de-DE', { maximumFractionDigits: 1 });
      throw new Error(`Die Druckdatei ist zu groß (${mb(total)} MB, erlaubt ${mb(cfg.maxUpload)} MB). Bitte ein kleineres Bild verwenden.`);
    }
    const design = {
      wcm: state.wcm, hcm: state.hcm, text: state.text, font: state.font, bg: state.bg, fg: state.fg,
      imgPos: api.hasImage() ? state.imgPos : '', imgScale: state.imgScale,
    };

    const form = document.createElement('form');
    form.method = 'post';
    form.action = cfg.action;
    form.enctype = 'multipart/form-data';
    form.hidden = true;
    const field = (name, value) => {
      const i = document.createElement('input');
      i.type = 'hidden'; i.name = name; i.value = value;
      form.appendChild(i);
    };
    const file = (name, blob, filename) => {
      const i = document.createElement('input');
      i.type = 'file'; i.name = name;
      const dt = new DataTransfer();
      dt.items.add(new File([blob], filename, { type: blob.type }));
      i.files = dt.files;
      form.appendChild(i);
    };
    field('add-to-cart', String(cfg.productId));
    field('quantity', String(Math.max(1, parseInt(els.qty.value, 10) || 1)));
    field('folieneditor_design', JSON.stringify(design));
    file('folieneditor_pdf', pdf, 'folie.pdf');
    file('folieneditor_preview', preview, 'vorschau.png');
    document.body.appendChild(form);
    message(els, 'Wird in den Warenkorb gelegt …');
    form.submit();
  } catch (e) {
    console.error(e);
    message(els, e.message || 'Das hat nicht geklappt. Bitte noch einmal versuchen.', 'error');
    els.addToCart.disabled = false;
  }
}

document.querySelectorAll('[data-folieneditor]').forEach((el, i) => {
  if (i === 0) start(el);                         // ein Editor pro Seite
  else el.textContent = 'Der Folieneditor kann nur einmal pro Seite angezeigt werden.';
});
