/**
 * lib/generateShippingLabel.ts  — AURAGE  4×6 in thermal label  (v13 — iterative scale)
 *
 * Core change vs v12:
 *
 *  The budget/scale system is completely rewritten. Instead of estimating
 *  FIXED_ABOVE_ITEMS with a static sum (which always drifted because the
 *  recipient section has a variable number of rows), we now:
 *
 *  1. Run a DRY-RUN cursor through header → sender → recipient using the
 *     exact same conditional logic as the real draw, but touching nothing
 *     on the PDF. This gives the precise `dy` where items will start.
 *
 *  2. Compute the true budget:
 *       budget = PH - dy_after_recipient - FIXED_BELOW_ITEMS - SAFETY_PAD
 *     FIXED_BELOW_ITEMS is now fully accounted (2.0 dy bump + hr + gap +
 *     PRICE_H + FOOTER_H + border clearance). SAFETY_PAD = 4 mm only —
 *     much smaller because the dry-run eliminates the main source of error.
 *
 *  3. Compute a scaled height at a candidate ratio and VERIFY it fits.
 *     If it still overflows, reduce the ratio by 0.05 and re-check.
 *     Iterate until the scaled height fits or the floor is hit.
 *     This guarantees the output fits regardless of any residual drift.
 *
 *  Everything outside the items section is untouched vs v11/v12.
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

interface ScaleFactors {
  lh:        number;
  itemSep:   number;
  labelSize: number;
  valueSize: number;
  pillSize:  number;
  titleSize: number;
}

// ─── Layout constants (mm) ────────────────────────────────────────────────────

const PW        = 101.6;
const PH        = 152.4;
const ML        = 8.0;
const MR        = PW - 8.0;
const DX        = 46.0;
const VAL_W     = MR - DX;

const LH        = 4.0;
const SEC_GAP   = 3.5;
const TITLE_H   = 3.8;
const ITEM_SEP  = 1.8;
const PRICE_H   = 11.0;
const FOOTER_H  = 26.0;

const LOGO_X    = ML;
const LOGO_Y    = 3.0;
const LOGO_W    = 18.0;
const LOGO_H    = 20.0;
const ICON_W    = 14.0;
const ICON_H    = 14.0;
const ICON_X    = MR - ICON_W;
const ICON_Y    = LOGO_Y + 3.0;
const ZONE_L    = LOGO_X + LOGO_W;
const ZONE_R    = ICON_X;

// Everything that sits below the last items row, fully accounted:
//   dy += 0.8   (trailing gap after last item)
//   dy += sc.lh (Livraison row — uses scaled lh, but at worst = LH = 4.0)
//   dy += 2.0   (bump before price hr)
//   hr  + 2.5   (price separator + gap)
//   PRICE_H     (price block)
//   FOOTER_H    (footer zone)
//   1.0         (bottom border clearance)
const FIXED_BELOW_ITEMS = 0.8 + LH + 2.0 + 0.4 + 2.5 + PRICE_H + FOOTER_H + 1.0;

// Small residual safety pad — only needs to cover sub-mm jsPDF rounding.
const SAFETY_PAD = 4.0;

// ─── Scale floor constants ────────────────────────────────────────────────────
const MIN_LH         = 2.8;
const MIN_ITEM_SEP   = 0.6;
const MIN_LABEL_SIZE = 5.5;
const MIN_VALUE_SIZE = 5.8;
const MIN_PILL_SIZE  = 5.5;
const MIN_TITLE_SIZE = 5.5;

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

// ─── Aspect-ratio-aware image placement ───────────────────────────────────────

async function fitImage(
  doc: jsPDF,
  b64: string,
  fmt: string,
  boxX: number, boxY: number,
  boxW: number, boxH: number,
): Promise<void> {
  const { nw, nh } = await new Promise<{ nw: number; nh: number }>(resolve => {
    const img = new Image();
    img.onload  = () => resolve({ nw: img.naturalWidth, nh: img.naturalHeight });
    img.onerror = () => resolve({ nw: boxW, nh: boxH });
    img.src = b64;
  });
  const scale = Math.min(boxW / nw, boxH / nh);
  const drawW = nw * scale;
  const drawH = nh * scale;
  doc.addImage(b64, fmt, boxX + (boxW - drawW) / 2, boxY + (boxH - drawH) / 2, drawW, drawH);
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
  return decode((f as { en?: string; fr?: string }).fr || (f as { en?: string; fr?: string }).en || '');
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

function clip(doc: jsPDF, text: string, maxW: number): string {
  if (doc.getTextWidth(text) <= maxW) return text;
  let t = text;
  while (t.length > 1 && doc.getTextWidth(t + '\u2026') > maxW) t = t.slice(0, -1);
  return t + '\u2026';
}

function drawCentred(doc: jsPDF, text: string, y: number, charSp = 0): void {
  if (charSp !== 0) doc.setCharSpace(charSp);
  const tw = doc.getTextWidth(text) + charSp * Math.max(0, text.length - 1);
  doc.text(text, (PW - tw) / 2, y);
  if (charSp !== 0) doc.setCharSpace(0);
}

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

function secTitle(doc: jsPDF, text: string, y: number, size = 7.0): void {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size);
  doc.setTextColor(0);
  doc.text(text.toUpperCase(), ML, y, { charSpace: 0.55 });
}

function rowL(doc: jsPDF, text: string, y: number, size = 7.8): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
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

function drawPill(doc: jsPDF, qty: number, x: number, y: number, size = 7.0): void {
  const t = `\u00D7${qty}`;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(size);
  const tw = doc.getTextWidth(t);
  const pw = tw + 3.0;
  if (x + pw > MR) return;
  doc.setDrawColor(0); doc.setLineWidth(0.22);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y - 2.6, pw, 3.4, 0.6, 0.6, 'S');
  doc.setTextColor(0);
  doc.text(t, x + 1.5, y - 0.2);
}

// ─── Dry-run cursor ───────────────────────────────────────────────────────────
/**
 * Simulates the exact dy cursor movements for header → sender → recipient
 * without calling any doc.* drawing methods.
 * Returns the dy value at the point where CONTENU DU COLIS title will be drawn.
 * This is the only source of truth for the items budget.
 */
function dryRunDyBeforeItems(order: LabelOrder): number {
  let dy = 34.0 + SEC_GAP;          // after header separator

  // EXPÉDITEUR — always 4 rows
  dy += TITLE_H;
  dy += LH;  // Société
  dy += LH;  // Adresse
  dy += LH;  // Email
  dy += LH;  // Tél
  dy += 1.0; // hrLight gap
  dy += SEC_GAP;

  // DESTINATAIRE — variable rows depending on address fields
  dy += TITLE_H;
  dy += LH;  // Nom — always present

  const addr       = order.shipping_address ?? {};
  const addrLine   = decode(addr.street ?? '');
  const cityLine   = decode(addr.district || addr.city || '');
  const regionLine = decode(
    [addr.city, addr.governorate ?? addr.state].filter(Boolean).join(', ')
  );

  if (addrLine)   dy += LH;
  if (cityLine)   dy += LH;
  if (regionLine) dy += LH;
  dy += LH;  // Tél — always present
  dy += 1.0; // hrM gap
  dy += SEC_GAP;

  // CONTENU DU COLIS title
  dy += TITLE_H;

  return dy;
}

// ─── Scale height measurement ─────────────────────────────────────────────────
/**
 * Given a set of scale factors, returns the total mm the items block will consume.
 * Used by the iterative solver to verify a candidate scale actually fits.
 */
function scaledItemsHeight(itemCount: number, sc: ScaleFactors): number {
  const rowsPerItem = 2; // Produit + Flacon
  const rows        = itemCount * rowsPerItem * sc.lh;
  const seps        = (itemCount - 1) * sc.itemSep;
  const livraison   = sc.lh;   // "Livraison Gratuite" row
  const trailing    = 0.8;     // dy += 0.8 after last item
  return rows + seps + livraison + trailing;
}

// ─── Iterative scale solver ───────────────────────────────────────────────────
/**
 * Starts at the natural ratio (budget / unscaled height), verifies the scaled
 * height fits, and if not steps the ratio down by 0.05 until it fits or hits
 * the floor. Returns defaults unchanged when no scaling is needed.
 */
function computeScale(order: LabelOrder): ScaleFactors {
  const dyStart  = dryRunDyBeforeItems(order);
  const budget   = PH - dyStart - FIXED_BELOW_ITEMS - SAFETY_PAD;

  const defaults: ScaleFactors = {
    lh: LH, itemSep: ITEM_SEP,
    labelSize: 7.8, valueSize: 8.2, pillSize: 7.0, titleSize: 7.0,
  };

  // Check if default sizes already fit
  if (scaledItemsHeight(order.items.length, defaults) <= budget) {
    return defaults;
  }

  // Iterative solver: start at natural ratio, step down until verified fit
  const unscaledHeight = scaledItemsHeight(order.items.length, defaults);
  let ratio = budget / unscaledHeight;

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate: ScaleFactors = {
      lh:        Math.max(MIN_LH,         LH       * ratio),
      itemSep:   Math.max(MIN_ITEM_SEP,   ITEM_SEP * ratio),
      labelSize: Math.max(MIN_LABEL_SIZE, 7.8      * ratio),
      valueSize: Math.max(MIN_VALUE_SIZE, 8.2      * ratio),
      pillSize:  Math.max(MIN_PILL_SIZE,  7.0      * ratio),
      titleSize: Math.max(MIN_TITLE_SIZE, 7.0      * ratio),
    };

    if (scaledItemsHeight(order.items.length, candidate) <= budget) {
      return candidate;
    }

    // Still overflows — reduce ratio and retry
    ratio -= 0.05;

    // If ratio has gone so low that everything is at floor, return floors
    if (ratio <= 0.5) {
      return {
        lh:        MIN_LH,
        itemSep:   MIN_ITEM_SEP,
        labelSize: MIN_LABEL_SIZE,
        valueSize: MIN_VALUE_SIZE,
        pillSize:  MIN_PILL_SIZE,
        titleSize: MIN_TITLE_SIZE,
      };
    }
  }

  // Fallback — return floors if solver somehow exhausts iterations
  return {
    lh:        MIN_LH,
    itemSep:   MIN_ITEM_SEP,
    labelSize: MIN_LABEL_SIZE,
    valueSize: MIN_VALUE_SIZE,
    pillSize:  MIN_PILL_SIZE,
    titleSize: MIN_TITLE_SIZE,
  };
}

// ─── Main draw ────────────────────────────────────────────────────────────────

async function drawLabel(
  doc: jsPDF,
  order: LabelOrder,
  logoB64: string | null,
  iconB64: string | null,
): Promise<void> {

  // Compute verified scale before touching the canvas
  const sc = computeScale(order);

  // ══ 1. HEADER ══════════════════════════════════════════════════════════════

  hr(doc, 0, 0.6);

  if (logoB64) {
    await fitImage(doc, logoB64, 'PNG', LOGO_X, LOGO_Y, LOGO_W, LOGO_H);
  } else {
    doc.setDrawColor(0); doc.setLineWidth(0.3);
    doc.rect(LOGO_X, LOGO_Y, LOGO_W, LOGO_H, 'S');
  }

  if (iconB64) {
    await fitImage(doc, iconB64, 'PNG', ICON_X, ICON_Y, ICON_W, ICON_H);
  } else {
    doc.setDrawColor(0); doc.setLineWidth(0.3);
    doc.rect(ICON_X, ICON_Y, ICON_W, ICON_H, 'S');
  }

  doc.setFont('helvetica', 'bold'); doc.setFontSize(19); doc.setTextColor(0);
  drawZoneCentred(doc, 'AURAGE', 12.0, ZONE_L, ZONE_R);

  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
  drawZoneCentred(doc, 'SHIPPING LABEL', 17.5, ZONE_L, ZONE_R, 1.8);

  const numStr  = shortId(order._id);
  const dateStr = formatDate(order.created_at);

  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.0); doc.setTextColor(140);
  doc.text('N\u00B0', ML, 25.5);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
  doc.text(numStr, MR, 25.5, { align: 'right' });

  doc.setFont('helvetica', 'normal'); doc.setTextColor(140);
  doc.text('Date', ML, 30.0);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
  doc.text(dateStr, MR, 30.0, { align: 'right' });

  hr(doc, 34.0, 0.5);

  let dy = 34.0 + SEC_GAP;

  // ══ 2. SENDER ══════════════════════════════════════════════════════════════

  secTitle(doc, 'Exp\u00E9diteur', dy); dy += TITLE_H;

  rowL(doc, 'Soci\u00E9t\u00E9', dy); rowV(doc, 'AURAGE', dy, { bold: true });          dy += LH;
  rowL(doc, 'Adresse',           dy); rowV(doc, 'Ezzahra, Tunisie', dy);                dy += LH;
  rowL(doc, 'Email',             dy); rowV(doc, 'aurageworld@contact.com', dy);         dy += LH;
  rowL(doc, 'T\u00E9l',          dy); rowV(doc, '+216 55 555 555', dy);                 dy += LH;

  dy += 1.0; hrLight(doc, dy); dy += SEC_GAP;

  // ══ 3. RECIPIENT ════════════════════════════════════════════════════════════

  secTitle(doc, 'Destinataire', dy); dy += TITLE_H;

  const addr       = order.shipping_address ?? {};
  const clientName = decode(`${order.customer.first_name} ${order.customer.last_name}`.trim());
  const addrLine   = decode(addr.street ?? '');
  const cityLine   = decode(addr.district || addr.city || '');
  const regionLine = decode([addr.city, addr.governorate ?? addr.state].filter(Boolean).join(', '));

  rowL(doc, 'Nom', dy);   rowV(doc, clientName, dy, { bold: true }); dy += LH;
  if (addrLine)   { rowL(doc, 'Adresse',     dy); rowV(doc, addrLine,   dy); dy += LH; }
  if (cityLine)   { rowL(doc, 'Ville',        dy); rowV(doc, cityLine,   dy); dy += LH; }
  if (regionLine) { rowL(doc, 'R\u00E9gion',  dy); rowV(doc, regionLine, dy); dy += LH; }
  rowL(doc, 'T\u00E9l', dy);
  rowV(doc, order.customer.phone, dy, { bold: true, size: 8.5 });
  dy += LH;

  dy += 1.0; hrM(doc, dy, 0.18); dy += SEC_GAP;

  // ══ 4. PACKAGE CONTENTS — scaled ════════════════════════════════════════════

  secTitle(doc, 'Contenu du colis', dy, sc.titleSize); dy += TITLE_H;

  order.items.forEach((item, idx) => {
    const name   = item.pack
      ? resolveField(item.pack.name)
      : resolveField(item.product?.name) || 'Produit';
    const qty    = item.quantity ?? 1;
    const flacon = decode(item.bottle?.name ?? 'Standard');

    doc.setFont('helvetica', 'bold'); doc.setFontSize(sc.pillSize);
    const pillTextW  = doc.getTextWidth(`\u00D7${qty}`);
    const pillTotalW = pillTextW + 3.0 + 2.2;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(sc.valueSize);
    const safeName = clip(doc, name, VAL_W - pillTotalW);
    const nameEndX = DX + doc.getTextWidth(safeName);
    const pillX    = nameEndX + 2.0;

    rowL(doc, 'Produit', dy, sc.labelSize);
    doc.setTextColor(0);
    doc.text(safeName, DX, dy);
    drawPill(doc, qty, pillX, dy, sc.pillSize);
    dy += sc.lh;

    rowL(doc, 'Flacon', dy, sc.labelSize);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(sc.valueSize);
    doc.setTextColor(0);
    doc.text(clip(doc, decode(flacon), VAL_W), DX, dy);
    dy += sc.lh;

    if (idx < order.items.length - 1) {
      doc.setDrawColor(200); doc.setLineWidth(0.14);
      doc.line(DX, dy + 0.4, pillX - 1.0, dy + 0.4);
      doc.setDrawColor(0);
      dy += sc.itemSep;
    }
  });

  dy += 0.8;
  rowL(doc, 'Livraison', dy, sc.labelSize);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(sc.valueSize);
  doc.setTextColor(0);
  doc.text('Gratuite', DX, dy);
  dy += sc.lh;

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
  hr(doc, Math.min(dy, PH - FOOTER_H - 1.0), 0.4);

  // ══ 6. FOOTER ═══════════════════════════════════════════════════════════════

  const FY = PH - FOOTER_H;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(0);
  drawCentred(doc, 'PLEASE HANDLE WITH CARE', FY + 5.0, 1.0);

  hrM(doc, FY + 8.0, 0.18);

  doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8); doc.setTextColor(140);
  drawCentred(doc,
    'AURAGE\u00AE est une marque d\u00E9pos\u00E9e de ADRENACLEAN, LLC \u00A9 2026',
    FY + 13.0);
  drawCentred(doc,
    'ADRENACLEAN, LLC \u2014 Tous droits r\u00E9serv\u00E9s.',
    FY + 17.5);

  hr(doc, PH, 0.6);
}

// ─── PDF factory & public API ─────────────────────────────────────────────────

function makePDF(): jsPDF {
  return new jsPDF({ orientation: 'portrait', unit: 'mm', format: [PW, PH] });
}

export async function generateShippingLabel(order: LabelOrder): Promise<void> {
  const [logo, icon] = await Promise.all([
    loadPublicImage('/logo.png'), loadPublicImage('/fragil.png'),
  ]);
  const doc = makePDF();
  await drawLabel(doc, order, logo, icon);
  doc.save(`aurage-label-${order._id.slice(-8).toUpperCase()}.pdf`);
}

export async function generateBulkShippingLabels(orders: LabelOrder[]): Promise<void> {
  if (!orders.length) return;
  const [logo, icon] = await Promise.all([
    loadPublicImage('/logo.png'), loadPublicImage('/fragil.png'),
  ]);
  const doc = makePDF();
  for (let i = 0; i < orders.length; i++) {
    if (i > 0) doc.addPage([PW, PH]);
    await drawLabel(doc, orders[i], logo, icon);
  }
  doc.save(`aurage-labels-${new Date().toISOString().split('T')[0]}-${orders.length}cmd.pdf`);
}

export async function generateInvoicePDF(orders: LabelOrder[], filename?: string): Promise<void> {
  if (!orders.length) return;
  const [logo, icon] = await Promise.all([
    loadPublicImage('/logo.png'), loadPublicImage('/fragil.png'),
  ]);
  const doc = makePDF();
  for (let i = 0; i < orders.length; i++) {
    if (i > 0) doc.addPage([PW, PH]);
    await drawLabel(doc, orders[i], logo, icon);
  }
  const name = filename ?? (
    orders.length === 1
      ? `aurage-label-${orders[0]._id.slice(-8).toUpperCase()}.pdf`
      : `aurage-labels-${new Date().toISOString().split('T')[0]}-${orders.length}cmd.pdf`
  );
  doc.save(name);
}