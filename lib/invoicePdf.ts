/**
 * Aurage Invoice PDF Generator
 * Generates professional French-language invoices using jsPDF
 * Supports single order and bulk order printing
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface InvoiceOrder {
  _id: string;
  customer: {
    first_name: string;
    last_name: string;
    email?: string;
    phone: string;
  };
  items: Array<{
    _id?: string;
    product?: { name: string; images?: Array<{ image_url: string }> };
    bottle?: { name: string; capacity_ml: number };
    pack?: { name: string };
    quantity: number;
    price_at_purchase: number;
  }>;
  total_amount: number;
  shipping_address: {
    street: string;
    city: string;
    governorate?: string;
    state?: string;
    zip?: string;
  };
  status: string;
  created_at: string;
  delivery_method?: string;
}

// ─── Colors ────────────────────────────────────────────────────────────────

const AMBER = [245, 158, 11] as [number, number, number];
const DARK  = [24,  24,  27] as [number, number, number];
const GRAY  = [113, 113, 122] as [number, number, number];
const LIGHT = [250, 250, 250] as [number, number, number];
const WHITE = [255, 255, 255] as [number, number, number];
const LINE  = [228, 228, 231] as [number, number, number];

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return `${amount.toFixed(2)} DT`;
}

function invoiceNumber(id: string, index: number = 0): string {
  const suffix = id.substring(id.length - 8).toUpperCase();
  const year = new Date().getFullYear();
  return `AUR-${year}-${suffix}`;
}

function orderStatus(status: string): string {
  const map: Record<string, string> = {
    pending:   'En attente',
    printed:   'Imprimé',
    shipped:   'Expédié',
    delivered: 'Livré',
    cancelled: 'Annulé',
  };
  return map[status] ?? status;
}

// ─── Single Invoice Page ────────────────────────────────────────────────────

function drawInvoicePage(doc: jsPDF, order: InvoiceOrder, pageIndex: number = 0): void {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;

  // ── Header background ──
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pageW, 52, 'F');

  // ── Brand name ──
  doc.setTextColor(...AMBER);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('AURAGE', margin, 24);

  // ── Tagline ──
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text('Parfums & Fragrances', margin, 31);

  // ── FACTURE label (top right) ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(...WHITE);
  doc.text('FACTURE', pageW - margin, 22, { align: 'right' });

  // ── Invoice number ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...AMBER);
  doc.text(`N° ${invoiceNumber(order._id)}`, pageW - margin, 30, { align: 'right' });

  // ── Date ──
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(8);
  doc.text(`Date : ${formatDate(order.created_at)}`, pageW - margin, 38, { align: 'right' });

  // ── Amber accent line ──
  doc.setDrawColor(...AMBER);
  doc.setLineWidth(1.5);
  doc.line(0, 52, pageW, 52);

  // ── Status badge ──
  const statusLabel = orderStatus(order.status);
  doc.setFillColor(...AMBER);
  doc.roundedRect(margin, 58, 36, 8, 2, 2, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(statusLabel.toUpperCase(), margin + 18, 63.5, { align: 'center' });

  // ── Section: Vendeur & Client ──
  let y = 76;

  // Left: Vendeur
  doc.setFillColor(...LIGHT);
  doc.rect(margin, y, contentW / 2 - 4, 42, 'F');
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, contentW / 2 - 4, 42, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...AMBER);
  doc.text('VENDEUR', margin + 4, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text('Aurage Fragrances', margin + 4, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text('Tunisie', margin + 4, y + 20);
  doc.text('contact@aurage.tn', margin + 4, y + 27);
  doc.text('www.aurage.tn', margin + 4, y + 33);

  // Right: Client
  const rightX = margin + contentW / 2 + 4;
  const rightW = contentW / 2 - 4;

  doc.setFillColor(...LIGHT);
  doc.rect(rightX, y, rightW, 42, 'F');
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.rect(rightX, y, rightW, 42, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...AMBER);
  doc.text('CLIENT', rightX + 4, y + 6);

  const fullName = `${order.customer.first_name} ${order.customer.last_name}`.trim();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(fullName || 'Client', rightX + 4, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);

  const addr = order.shipping_address;
  const addrLine1 = addr.street || '';
  const addrLine2 = [addr.city, addr.governorate ?? addr.state].filter(Boolean).join(', ');

  if (addrLine1) doc.text(addrLine1, rightX + 4, y + 21);
  if (addrLine2) doc.text(addrLine2, rightX + 4, y + addrLine1 ? 27 : 21);
  if (order.customer.phone) doc.text(`Tél : ${order.customer.phone}`, rightX + 4, y + 33);
  if (order.customer.email) {
    doc.setFontSize(7.5);
    doc.text(order.customer.email, rightX + 4, y + 39);
  }

  // ── Items table ──
  y += 52;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text('Détail de la commande', margin, y);

  y += 6;

  const tableRows = order.items.map((item) => {
    let description = '';
    if (item.pack) {
      description = `Pack : ${item.pack.name}`;
    } else {
      description = item.product?.name ?? 'Produit';
      if (item.bottle) {
        description += `\nFlacon : ${item.bottle.name} (${item.bottle.capacity_ml}ml)`;
      }
    }

    const unitPrice = item.price_at_purchase;
    const qty = item.quantity || 1;
    const total = unitPrice * qty;

    return [
      description,
      qty.toString(),
      formatCurrency(unitPrice),
      formatCurrency(total),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Qté', 'Prix unitaire', 'Total']],
    body: tableRows,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8.5,
      cellPadding: 5,
      textColor: DARK,
      lineColor: LINE,
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: DARK,
      textColor: WHITE,
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: contentW * 0.52 },
      1: { halign: 'center', cellWidth: contentW * 0.1 },
      2: { halign: 'right', cellWidth: contentW * 0.19 },
      3: { halign: 'right', cellWidth: contentW * 0.19 },
    },
    alternateRowStyles: { fillColor: [252, 252, 252] },
    didParseCell: (data) => {
      if (data.section === 'head') {
        data.cell.styles.fillColor = DARK;
      }
    },
  });

  // ── Totals ──
  const finalY = (doc as any).lastAutoTable.finalY + 6;

  const totalsX = pageW - margin - 72;
  const totalsW = 72;

  // Subtotal
  doc.setFillColor(...LIGHT);
  doc.rect(totalsX, finalY, totalsW, 8, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text('Sous-total HT :', totalsX + 4, finalY + 5.5);
  doc.setTextColor(...DARK);
  doc.text(formatCurrency(order.total_amount), totalsX + totalsW - 4, finalY + 5.5, { align: 'right' });

  // Livraison
  doc.setFillColor(...LIGHT);
  doc.rect(totalsX, finalY + 9, totalsW, 8, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text('Livraison :', totalsX + 4, finalY + 14.5);
  doc.setTextColor(...DARK);
  doc.text('Offerte', totalsX + totalsW - 4, finalY + 14.5, { align: 'right' });

  // Total line
  doc.setDrawColor(...AMBER);
  doc.setLineWidth(0.8);
  doc.line(totalsX, finalY + 18, totalsX + totalsW, finalY + 18);

  // Total TTC
  doc.setFillColor(...AMBER);
  doc.rect(totalsX, finalY + 18, totalsW, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...WHITE);
  doc.text('TOTAL TTC :', totalsX + 4, finalY + 25.5);
  doc.text(formatCurrency(order.total_amount), totalsX + totalsW - 4, finalY + 25.5, { align: 'right' });

  // ── Payment / delivery note ──
  const noteY = finalY + 38;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.3);
  doc.setFillColor(255, 251, 235); // amber-50
  doc.rect(margin, noteY, contentW, 16, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...AMBER);
  doc.text('Conditions de paiement', margin + 4, noteY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK);
  const payMethod = order.delivery_method === 'intigo' ? 'Paiement à la livraison via Intigo' : 'Paiement à la livraison (cash)';
  doc.text(payMethod, margin + 4, noteY + 12);

  // ── Footer ──
  doc.setFillColor(...DARK);
  doc.rect(0, pageH - 22, pageW, 22, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Merci pour votre confiance ! Pour toute question : contact@aurage.tn', pageW / 2, pageH - 12, { align: 'center' });

  doc.setTextColor(...AMBER);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('AURAGE © ' + new Date().getFullYear(), pageW / 2, pageH - 5, { align: 'center' });
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a PDF invoice for a single order and download it.
 */
export function generateSingleInvoice(order: InvoiceOrder): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  drawInvoicePage(doc, order);
  const filename = `facture-aurage-${order._id.substring(order._id.length - 8).toUpperCase()}.pdf`;
  doc.save(filename);
}

/**
 * Generate a combined PDF with one invoice per page for multiple orders.
 */
export function generateBulkInvoices(orders: InvoiceOrder[]): void {
  if (orders.length === 0) return;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  orders.forEach((order, index) => {
    if (index > 0) doc.addPage();
    drawInvoicePage(doc, order, index);
  });

  const date = new Date().toISOString().split('T')[0];
  doc.save(`factures-aurage-${date}-${orders.length}commandes.pdf`);
}