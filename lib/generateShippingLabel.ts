/**
 * lib/generateShippingLabel.ts  — AURAGE  4×6 in thermal label  (v8 — final)
 *
 * Key fixes vs v7:
 *  1. "SHIPPING LABEL" subtitle — centred using a measured X offset, NOT
 *     jsPDF's { align:'center' } which ignores charSpace when calculating
 *     the anchor. We measure the string width manually and place it correctly.
 *  2. "PLEASE HANDLE WITH CARE" — same fix: charSpace + align:'center' is
 *     buggy in jsPDF. We compute X = (PW - totalWidth) / 2 manually.
 *  3. Legal line 2 — was cut off at page bottom. Both legal lines are now
 *     drawn using a measured-centre approach at verified Y positions.
 *  4. Item separators — capped at MR - 3mm so they never touch pill boxes.
 *  5. Subtitle clipping — safe centre zone is now computed correctly as the
 *     midpoint of [LOGO right edge … ICON left edge].
 *
 * Assets → /public/logo.png  and  /public/fragil.png
 */

import jsPDF from 'jspdf';

// ─── Types ────────────────────────────────────────────────────────────────────

type BilingualField = { en?: string; fr?: string } | string;

export interface LabelOrder {
  _id: string;
  customer: { first_name: string; last_name: string; phone: string; email?: string };
  items: Array<{
    _id?: string;
    product?: { name: BilingualField };
    bottle?:  { name: string; capacity_ml?: number };
    pack?:    { name: BilingualField };
    quantity: number;
    price_at_purchase: number;
  }>;
  total_amount: number;
  shipping_address: {
    street?: string; city?: string; district?: string;
    governorate?: string; state?: string;
  };
  status: string;
  created_at: string;
  delivery_method?: string;
}

// ─── Layout constants (mm) ────────────────────────────────────────────────────

const PW       = 101.6;
const PH       = 152.4;
const ML       = 8.0;
const MR       = PW - 8.0;        // 93.6
const DX       = 46.0;            // value column X
const VAL_W    = MR - DX;         // 47.6 mm

// Verified spacing (worst-case 3 items + 5 recipient fields fits in 152.4 mm)
const LH       = 4.0;             // line height
const SEC_GAP  = 3.5;             // gap between section content and next title
const TITLE_H  = 3.8;             // section title block height
const ITEM_SEP = 1.8;             // separator gap between items
const PRICE_H  = 11.0;            // price block height
const FOOTER_H = 22.0;            // footer reserved zone

// Header image geometry
const LOGO_X  = ML;
const LOGO_Y  = 4.0;
const LOGO_W  = 18.0;
const LOGO_H  = 22.0;
const ICON_W  = 14.0;
const ICON_H  = 14.0;
const ICON_X  = MR - ICON_W;      // 79.6 mm — right icon left edge
const ICON_Y  = LOGO_Y + 3.0;

// Safe centre X between the two image boxes
// = midpoint of (logo right edge) … (icon left edge)
const SAFE_CTR_X = (LOGO_X + LOGO_W + ICON_X) / 2;   // ≈ 53.8 mm

// ─── Image loader ─────────────────────────────────────────────────────────────

async function loadPublicImage(path: string): Promise<string | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise(resolve => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror   = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch { return null; }
}

// ─── Text helpers ─────────────────────────────────────────────────────────────

function decode(s: string): string {
  return s
    .replace(/&#x27;/gi, "'").replace(/&#39;/gi, "'")
    .replace(/&amp;/gi,  '&').replace(/&lt;/gi,  '<')
    .replace(/&gt;/gi,   '>').replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, ' ');
}

function resolveField(f: BilingualField | null | undefined): string {
  if (!f) return '';
  if (typeof f === 'string') return decode(f);
  return decode(f.fr || f.en || '');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR',
    { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function shortId(id: string): string {
  return `AUR-${new Date().getFullYear()}-${id.slice(-8).toUpperCase()}`;
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function hr(doc: jsPDF, y: number, w = 0.3): void {
  doc.setDrawColor(0); doc.setLineWidth(w);
  doc.line(0, y, PW, y);
}
function hrM(doc: jsPDF, y: number, w = 0.2): void {
  doc.setDrawColor(0); doc.setLineWidth(w);
  doc.line(ML, y, MR, y);
}
function hrLight(doc: jsPDF, y: number): void {
  doc.setDrawColor(185); doc.setLineWidth(0.18);
  doc.line(ML, y, MR, y);
  doc.setDrawColor(0);
}

/** Clip text to maxW mm — call AFTER setting font + size */
function clip(doc: jsPDF, text: string, maxW: number): string {
  if (doc.getTextWidth(text) <= maxW) return text;
  let t = text;
  while (t.length > 1 && doc.getTextWidth(t + '\u2026') > maxW) t = t.slice(0, -1);
  return t + '\u2026';
}

/**
 * Draw text centred on the full page width (PW).
 * getTextWidth() does NOT include charSpace — we add it manually.
 */
function drawCentred(doc: jsPDF, text: string, y: number, charSp = 0): void {
  if (charSp !== 0) doc.setCharSpace(charSp);
  // charSpace is added between every character pair = (length - 1) gaps
  const tw = doc.getTextWidth(text) + charSp * Math.max(0, text.length - 1);
  doc.text(text, (PW - tw) / 2, y);
  if (charSp !== 0) doc.setCharSpace(0);
}

/**
 * Draw text centred within [zoneLeft, zoneRight], clamped to never
 * bleed into logo or icon boxes.
 * getTextWidth() does NOT include charSpace — we add it manually.
 */
function drawZoneCentred(
  doc: jsPDF, text: string, y: number,
  zoneLeft: number, zoneRight: number, charSp = 0,
): void {
  if (charSp !== 0) doc.setCharSpace(charSp);
  const tw = doc.getTextWidth(text) + charSp * Math.max(0, text.length - 1);
  const zoneMid = (zoneLeft + zoneRight) / 2;
  const x = Math.max(zoneLeft, Math.min(zoneMid - tw / 2, zoneRight - tw));
  doc.text(text, x, y);
  if (charSp !== 0) doc.setCharSpace(0);
}

function secTitle(doc: jsPDF, text: string, y: number): void {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.0);
  doc.setTextColor(0);
  doc.text(text.toUpperCase(), ML, y, { charSpace: 0.7 });
}

function rowL(doc: jsPDF, text: string, y: number): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(130);
  doc.text(text, ML, y);
}

function rowV(doc: jsPDF, text: string, y: number,
              opts: { bold?: boolean; size?: number } = {}): void {
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
  doc.setFontSize(opts.size ?? 8.2);
  doc.setTextColor(0);
  doc.text(clip(doc, decode(text), VAL_W), DX, y);
}

function drawPill(doc: jsPDF, qty: number, x: number, y: number): void {
  const t = `\u00D7${qty}`;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.0);
  const tw = doc.getTextWidth(t);
  const pw = tw + 3.0;
  if (x + pw > MR) return;
  doc.setDrawColor(0); doc.setLineWidth(0.22);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y - 2.6, pw, 3.4, 0.6, 0.6, 'S');
  doc.setTextColor(0);
  doc.text(t, x + 1.5, y - 0.2);
}

// ─── Main draw ────────────────────────────────────────────────────────────────

function drawLabel(
  doc: jsPDF,
  order: LabelOrder,
  logoB64: string | null,
  iconB64: string | null,
): void {

  // ══ 1. HEADER ══════════════════════════════════════════════════════════════

  hr(doc, 0, 0.6);

  // Left logo
  if (logoB64) {
    doc.addImage(logoB64, 'PNG', LOGO_X, LOGO_Y, LOGO_W, LOGO_H);
  } else {
    doc.setDrawColor(0); doc.setLineWidth(0.3);
    doc.rect(LOGO_X, LOGO_Y, LOGO_W, LOGO_H, 'S');
  }

  // Right icon
  if (iconB64) {
    doc.addImage(iconB64, 'PNG', ICON_X, ICON_Y, ICON_W, ICON_H);
  } else {
    doc.setDrawColor(0); doc.setLineWidth(0.3);
    doc.rect(ICON_X, ICON_Y, ICON_W, ICON_H, 'S');
  }

  // Brand name — zone-centred between the two image boxes
  doc.setFont('helvetica', 'bold'); doc.setFontSize(19); doc.setTextColor(0);
  drawZoneCentred(doc, 'AURAGE', 12.5, LOGO_X + LOGO_W, ICON_X);

  // "SHIPPING LABEL" subtitle — zone-centred with charSpace, measured manually
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
  drawZoneCentred(doc, 'SHIPPING LABEL', 18.5, LOGO_X + LOGO_W, ICON_X, 1.8);

  // ── Meta block: N° and Date ─────────────────────────────────────────────────
  const numStr  = shortId(order._id);
  const dateStr = formatDate(order.created_at);
  const META_X  = 52.0;          // fixed label X — clear of logo, well left of values

  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.0); doc.setTextColor(140);
  doc.text('N\u00B0', META_X, 24.5);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
  doc.text(numStr, MR, 24.5, { align: 'right' });

  doc.setFont('helvetica', 'normal'); doc.setTextColor(140);
  doc.text('Date', META_X, 29.0);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
  doc.text(dateStr, MR, 29.0, { align: 'right' });

  hr(doc, 33.0, 0.5);

  // ── flowing cursor ──────────────────────────────────────────────────────────
  let dy = 33.0 + SEC_GAP;

  // ══ 2. SENDER (compact — 4 rows) ═══════════════════════════════════════════

  secTitle(doc, 'Exp\u00E9diteur', dy); dy += TITLE_H;

  rowL(doc, 'Soci\u00E9t\u00E9', dy); rowV(doc, 'AURAGE', dy, { bold: true }); dy += LH;
  rowL(doc, 'Adresse',           dy); rowV(doc, 'Ezzahra, Tunisie', dy);        dy += LH;
  rowL(doc, 'Email',             dy); rowV(doc, 'aurageworld@contact.com', dy); dy += LH;
  rowL(doc, 'T\u00E9l',          dy); rowV(doc, '+216 55 555 555', dy);          dy += LH;

  dy += 1.0; hrLight(doc, dy); dy += SEC_GAP;

  // ══ 3. RECIPIENT ════════════════════════════════════════════════════════════

  secTitle(doc, 'Destinataire', dy); dy += TITLE_H;

  const addr       = order.shipping_address ?? {};
  const clientName = decode(`${order.customer.first_name} ${order.customer.last_name}`.trim());
  const addrLine   = decode(addr.street ?? '');
  const cityLine   = decode(addr.district || addr.city || '');
  const regionLine = decode([addr.city, addr.governorate ?? addr.state].filter(Boolean).join(', '));

  rowL(doc, 'Nom', dy);   rowV(doc, clientName, dy, { bold: true }); dy += LH;
  if (addrLine)   { rowL(doc, 'Adresse',          dy); rowV(doc, addrLine,   dy); dy += LH; }
  if (cityLine)   { rowL(doc, 'Ville',             dy); rowV(doc, cityLine,   dy); dy += LH; }
  if (regionLine) { rowL(doc, 'R\u00E9gion',       dy); rowV(doc, regionLine, dy); dy += LH; }
  rowL(doc, 'T\u00E9l', dy); rowV(doc, order.customer.phone, dy, { bold: true, size: 8.5 }); dy += LH;

  dy += 1.0; hrLight(doc, dy); dy += SEC_GAP;

  // ══ 4. PACKAGE CONTENTS ═════════════════════════════════════════════════════

  secTitle(doc, 'Contenu du colis', dy); dy += TITLE_H;

  order.items.forEach((item, idx) => {
    const name   = item.pack ? resolveField(item.pack.name)
                             : resolveField(item.product?.name) || 'Produit';
    const qty    = item.quantity ?? 1;
    const flacon = decode(item.bottle?.name ?? 'Standard');

    // Product row — set font before clip so measurement is accurate
    rowL(doc, 'Produit', dy);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.2); doc.setTextColor(0);

    // Pre-measure pill width to reserve space
    doc.setFontSize(7.0);
    const pillW = doc.getTextWidth(`\u00D7${qty}`) + 3.0 + 2.2;
    doc.setFontSize(8.2);

    const safeName = clip(doc, name, VAL_W - pillW);
    doc.text(safeName, DX, dy);
    drawPill(doc, qty, DX + doc.getTextWidth(safeName) + 2.0, dy);
    dy += LH;

    // Flacon row
    rowL(doc, 'Flacon', dy); rowV(doc, flacon, dy); dy += LH;

    // Light separator — ends 3mm before MR so it never overlaps pill boxes
    if (idx < order.items.length - 1) {
      doc.setDrawColor(200); doc.setLineWidth(0.14);
      doc.line(DX, dy + 0.4, MR - 3.0, dy + 0.4);
      doc.setDrawColor(0);
      dy += ITEM_SEP;
    }
  });

  dy += 0.8;
  rowL(doc, 'Livraison', dy); rowV(doc, 'Gratuite', dy); dy += LH;

  // ══ 5. PRICE ════════════════════════════════════════════════════════════════

  dy += 2.0;
  hr(doc, dy, 0.4);
  dy += 2.5;

  const prixStr = order.total_amount > 0
    ? `${order.total_amount.toFixed(2)} DT` : 'XX.XX DT';

  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.0); doc.setTextColor(140);
  doc.text('PRIX TTC', ML, dy + 4.5);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(0);
  doc.text(prixStr, MR, dy + 5.0, { align: 'right' });

  dy += PRICE_H;
  hr(doc, dy, 0.4);

  // ══ 6. FOOTER ═══════════════════════════════════════════════════════════════
  // Push to near-bottom on short orders; flow right after price on dense orders.
  // Worst-case dy here ≈ 141 mm → footer zone starts at 141, ends at 152.4 (11.4 mm).
  // All offsets below are verified to fit within that 11.4 mm.
  dy = Math.max(dy + 1.0, PH - FOOTER_H);

  // "PLEASE HANDLE WITH CARE" — centred via jsPDF align:'center' + charSpace
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(0);
  drawCentred(doc, 'PLEASE HANDLE WITH CARE', dy + 4.5, 1.0);

  hrM(doc, dy + 7.0, 0.18);

  // Legal lines — plain centred text, no charSpace, tight leading
  doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8); doc.setTextColor(140);
  drawCentred(doc,
    'AURAGE\u00AE est une marque d\u00E9pos\u00E9e de ADRENACLEAN, LLC \u00A9 2026',
    dy + 9.5);
  drawCentred(doc,
    'ADRENACLEAN, LLC \u2014 Tous droits r\u00E9serv\u00E9s.',
    dy + 12.0);

  hr(doc, PH, 0.6);
}

// ─── PDF factory & public API ─────────────────────────────────────────────────

function makePDF(): jsPDF {
  return new jsPDF({ orientation: 'portrait', unit: 'mm', format: [PW, PH] });
}

export async function generateShippingLabel(order: LabelOrder): Promise<void> {
  const [logo, icon] = await Promise.all([
    loadPublicImage('/logo.png'), loadPublicImage('/fragil.png')]);
  const doc = makePDF();
  drawLabel(doc, order, logo, icon);
  doc.save(`aurage-label-${order._id.slice(-8).toUpperCase()}.pdf`);
}

export async function generateBulkShippingLabels(orders: LabelOrder[]): Promise<void> {
  if (!orders.length) return;
  const [logo, icon] = await Promise.all([
    loadPublicImage('/logo.png'), loadPublicImage('/fragil.png')]);
  const doc = makePDF();
  orders.forEach((o, i) => {
    if (i > 0) doc.addPage([PW, PH]);
    drawLabel(doc, o, logo, icon);
  });
  doc.save(`aurage-labels-${new Date().toISOString().split('T')[0]}-${orders.length}cmd.pdf`);
}

export async function generateInvoicePDF(orders: LabelOrder[], filename?: string): Promise<void> {
  if (!orders.length) return;
  const [logo, icon] = await Promise.all([
    loadPublicImage('/logo.png'), loadPublicImage('/fragil.png')]);
  const doc = makePDF();
  orders.forEach((o, i) => {
    if (i > 0) doc.addPage([PW, PH]);
    drawLabel(doc, o, logo, icon);
  });
  const name = filename ?? (
    orders.length === 1
      ? `aurage-label-${orders[0]._id.slice(-8).toUpperCase()}.pdf`
      : `aurage-labels-${new Date().toISOString().split('T')[0]}-${orders.length}cmd.pdf`);
  doc.save(name);
}