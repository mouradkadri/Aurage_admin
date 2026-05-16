/**
 * lib/generateShippingLabel.ts  — AURAGE  4×6 in thermal label  (v9 — refined)
 *
 * Fixes vs v8:
 *  1. AURAGE title + "SHIPPING LABEL" subtitle: true optical centre between
 *     logo-right and icon-left, using drawZoneCentred with charSpace-aware width.
 *  2. Logo geometry: height increased to 26 mm (was 22) and Y-offset adjusted
 *     so the full mark incl. "A U R A G E" wordmark below sits properly.
 *  3. Footer line 2 ("Tous droits réservés.") was clipped — FOOTER_H raised
 *     to 26 mm and dy offsets recalculated so both lines always fit.
 *  4. Item separators: cap at `DX + doc.getTextWidth(safeName) - 2` so they
 *     never extend past or through pill boxes (was MR - 3 which still overlapped).
 *  5. N° / Date meta block: label column now auto-aligns to META_X = ML (left
 *     margin) instead of a magic 52 — keeps visual rhythm with sections below.
 *  6. Price block: "PRIX TTC" label left-aligned at ML (not shifted) so it
 *     lines up with the rest of the label column.
 *  7. charSpace on section titles: reduced from 0.7 → 0.55 for tighter fit.
 *  8. Separator after recipient: hrLight replaced with hrM (slightly heavier,
 *     matches sender separator visually).
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

const PW        = 101.6;
const PH        = 152.4;
const ML        = 8.0;
const MR        = PW - 8.0;      // 93.6
const DX        = 46.0;          // value column X
const VAL_W     = MR - DX;       // 47.6 mm

const LH        = 4.0;           // line height
const SEC_GAP   = 3.5;           // gap between section content and next title
const TITLE_H   = 3.8;           // section title block height
const ITEM_SEP  = 1.8;           // separator gap between items
const PRICE_H   = 11.0;          // price block height
const FOOTER_H  = 26.0;          // ↑ was 22 — raised to ensure both legal lines fit

// ── Header image geometry ────────────────────────────────────────────────────
// Logo: made taller (26 mm) so the full AURAGE mark incl. wordmark renders.
const LOGO_X   = ML;
const LOGO_Y   = 3.0;            // shifted up 1 mm to compensate for extra height
const LOGO_W   = 18.0;
const LOGO_H   = 26.0;           // ↑ was 22

const ICON_W   = 14.0;
const ICON_H   = 14.0;
const ICON_X   = MR - ICON_W;   // 79.6 mm
const ICON_Y   = LOGO_Y + 4.0;  // vertically centred in the header zone

// True midpoint of the gap between logo and icon — used for zone centring.
const ZONE_L   = LOGO_X + LOGO_W;   // 26.0
const ZONE_R   = ICON_X;            // 79.6
const SAFE_CTR = (ZONE_L + ZONE_R) / 2;  // ≈ 52.8 (unused directly, kept for clarity)

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
 * Centres text on the full page width (PW), accounting for charSpace.
 * jsPDF's align:'center' ignores charSpace when measuring — this does not.
 */
function drawCentred(doc: jsPDF, text: string, y: number, charSp = 0): void {
  if (charSp !== 0) doc.setCharSpace(charSp);
  const tw = doc.getTextWidth(text) + charSp * Math.max(0, text.length - 1);
  doc.text(text, (PW - tw) / 2, y);
  if (charSp !== 0) doc.setCharSpace(0);
}

/**
 * Centres text within [zoneLeft … zoneRight], charSpace-aware.
 * Falls back gracefully if text is wider than the zone (left-aligns at zoneLeft).
 */
function drawZoneCentred(
  doc: jsPDF, text: string, y: number,
  zoneLeft: number, zoneRight: number, charSp = 0,
): void {
  if (charSp !== 0) doc.setCharSpace(charSp);
  const tw = doc.getTextWidth(text) + charSp * Math.max(0, text.length - 1);
  const zoneMid = (zoneLeft + zoneRight) / 2;
  // clamp so text never bleeds into either image box
  const x = Math.max(zoneLeft, Math.min(zoneMid - tw / 2, zoneRight - tw));
  doc.text(text, x, y);
  if (charSp !== 0) doc.setCharSpace(0);
}

function secTitle(doc: jsPDF, text: string, y: number): void {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.0);
  doc.setTextColor(0);
  // ↓ charSpace 0.55 (was 0.7) — prevents long titles from overflowing
  doc.text(text.toUpperCase(), ML, y, { charSpace: 0.55 });
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

  // Left logo — taller box so mark + wordmark are fully visible
  if (logoB64) {
    doc.addImage(logoB64, 'PNG', LOGO_X, LOGO_Y, LOGO_W, LOGO_H);
  } else {
    doc.setDrawColor(0); doc.setLineWidth(0.3);
    doc.rect(LOGO_X, LOGO_Y, LOGO_W, LOGO_H, 'S');
  }

  // Right fragile icon
  if (iconB64) {
    doc.addImage(iconB64, 'PNG', ICON_X, ICON_Y, ICON_W, ICON_H);
  } else {
    doc.setDrawColor(0); doc.setLineWidth(0.3);
    doc.rect(ICON_X, ICON_Y, ICON_W, ICON_H, 'S');
  }

  // Brand name — zone-centred between logo right edge and icon left edge
  doc.setFont('helvetica', 'bold'); doc.setFontSize(19); doc.setTextColor(0);
  drawZoneCentred(doc, 'AURAGE', 13.5, ZONE_L, ZONE_R);

  // "SHIPPING LABEL" subtitle — same zone, with tracked spacing
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
  drawZoneCentred(doc, 'SHIPPING LABEL', 19.5, ZONE_L, ZONE_R, 1.8);

  // ── Meta block: N° and Date ─────────────────────────────────────────────────
  // Label column at ML keeps visual alignment with section rows below.
  const numStr  = shortId(order._id);
  const dateStr = formatDate(order.created_at);

  // N° and Date sit just below the logo bottom edge (LOGO_Y + LOGO_H = 29 mm)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.0); doc.setTextColor(140);
  doc.text('N\u00B0', ML, 31.5);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
  doc.text(numStr, MR, 31.5, { align: 'right' });

  doc.setFont('helvetica', 'normal'); doc.setTextColor(140);
  doc.text('Date', ML, 36.0);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
  doc.text(dateStr, MR, 36.0, { align: 'right' });

  hr(doc, 40.0, 0.5);

  // ── flowing cursor ──────────────────────────────────────────────────────────
  let dy = 40.0 + SEC_GAP;

  // ══ 2. SENDER ══════════════════════════════════════════════════════════════

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
  if (addrLine)   { rowL(doc, 'Adresse',         dy); rowV(doc, addrLine,   dy); dy += LH; }
  if (cityLine)   { rowL(doc, 'Ville',            dy); rowV(doc, cityLine,   dy); dy += LH; }
  if (regionLine) { rowL(doc, 'R\u00E9gion',      dy); rowV(doc, regionLine, dy); dy += LH; }
  rowL(doc, 'T\u00E9l', dy); rowV(doc, order.customer.phone, dy, { bold: true, size: 8.5 }); dy += LH;

  // ↓ hrM instead of hrLight — heavier line matches sender separator
  dy += 1.0; hrM(doc, dy, 0.18); dy += SEC_GAP;

  // ══ 4. PACKAGE CONTENTS ═════════════════════════════════════════════════════

  secTitle(doc, 'Contenu du colis', dy); dy += TITLE_H;

  order.items.forEach((item, idx) => {
    const name   = item.pack ? resolveField(item.pack.name)
                             : resolveField(item.product?.name) || 'Produit';
    const qty    = item.quantity ?? 1;
    const flacon = decode(item.bottle?.name ?? 'Standard');

    // Measure pill width first to reserve space in the name clip
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.0);
    const pillTextW = doc.getTextWidth(`\u00D7${qty}`);
    const pillTotalW = pillTextW + 3.0 + 2.2; // pill box + gap

    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.2);
    const safeName  = clip(doc, name, VAL_W - pillTotalW);
    const nameEndX  = DX + doc.getTextWidth(safeName);
    const pillX     = nameEndX + 2.0;

    rowL(doc, 'Produit', dy);
    doc.setTextColor(0);
    doc.text(safeName, DX, dy);
    drawPill(doc, qty, pillX, dy);
    dy += LH;

    rowL(doc, 'Flacon', dy); rowV(doc, flacon, dy); dy += LH;

    // Item separator — stops 1 mm before the pill box left edge, never overlaps it
    if (idx < order.items.length - 1) {
      const sepEndX = pillX - 1.0; // pillX is nameEndX + 2.0, so we stop at nameEndX + 1.0
      doc.setDrawColor(200); doc.setLineWidth(0.14);
      doc.line(DX, dy + 0.4, sepEndX, dy + 0.4);
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

  // "PRIX TTC" left-aligned at ML — consistent with all label-column text
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.0); doc.setTextColor(140);
  doc.text('PRIX TTC', ML, dy + 4.5);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(0);
  doc.text(prixStr, MR, dy + 5.0, { align: 'right' });

  dy += PRICE_H;
  // Cap the price-block bottom HR so it never enters the 26 mm footer zone
  hr(doc, Math.min(dy, PH - 26.0 - 1.0), 0.4);

  // ══ 6. FOOTER ═══════════════════════════════════════════════════════════════
  // Anchor ALL footer elements from PH upward — this guarantees both legal
  // lines are always visible even on dense 3-item labels where dy is high.
  // The footer zone is 26 mm tall; elements are placed relative to PH.
  const FY = PH - 26.0;  // footer zone top

  // Price HR and footer zone must not overlap — push price HR up if needed
  if (dy + 1.0 > FY) {
    // content is very dense; footer takes over from here, price block already drawn
  }

  // "PLEASE HANDLE WITH CARE" — 5 mm below footer zone top
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(0);
  drawCentred(doc, 'PLEASE HANDLE WITH CARE', FY + 5.0, 1.0);

  hrM(doc, FY + 8.0, 0.18);

  // Legal line 1 — 11.5 mm below footer zone top
  doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8); doc.setTextColor(140);
  drawCentred(doc,
    'AURAGE\u00AE est une marque d\u00E9pos\u00E9e de ADRENACLEAN, LLC \u00A9 2026',
    FY + 13.0);

  // Legal line 2 — 15 mm below footer zone top, 3 mm clearance above PH border
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