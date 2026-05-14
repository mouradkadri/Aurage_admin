'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { exportIntigoExcel } from '@/lib/exportIntigoExcel';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Sheet, SheetContent, SheetTitle, SheetHeader } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { IntigoShippingPanel } from './IntigoShippingPanel';
import {
  ChevronLeft, ChevronRight, Printer, MapPin, CheckCircle2, Search,
  Truck, CheckCircle, RotateCcw, AlertCircle, FileDown, Loader2, Filter,
  Package, FileSpreadsheet, ExternalLink, Calendar, Hash,
} from 'lucide-react';
import { useOrders, Order, OrderHistoryLog, DeliveryFilter, OrderStats } from '@/hooks/useOrders';

// ─── i18n ─────────────────────────────────────────────────────────────────────
// Single source of truth for the UI language.
// Switch this to 'en' to flip every bilingual field at once.
// Bilingual fields: Product.name/description/scent_description/features,
//                   Pack.name/description, Collection.name/description,
//                   Announcement.text
// Non-bilingual:    BottleVariant.name (plain string — never index with lang)
const LANG: 'fr' | 'en' = 'fr';

/** Safely read a bilingual { en, fr } field, falling back to the other locale. */
function t(field: { en?: string; fr?: string } | string | null | undefined): string {
  if (!field) return '';
  if (typeof field === 'string') return field;           // plain string (e.g. bottle.name)
  return field[LANG] || field.en || field.fr || '';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusFr = (s: string) =>
  ({ pending: 'En attente', printed: 'Imprimé', shipped: 'Expédié', delivered: 'Livré', cancelled: 'Annulé' } as Record<string, string>)[s] ?? s;

/** Two-letter initials avatar for a customer */
const CustomerAvatar = ({ firstName, lastName }: { firstName?: string; lastName?: string }) => {
  const initials = `${(firstName?.[0] ?? '').toUpperCase()}${(lastName?.[0] ?? '').toUpperCase()}` || '?';
  // Deterministic pastel from name
  const hue = ((firstName ?? '').charCodeAt(0) * 37 + (lastName ?? '').charCodeAt(0) * 17) % 360;
  return (
    <span
      className="inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold flex-shrink-0 select-none"
      style={{ background: `hsl(${hue} 55% 88%)`, color: `hsl(${hue} 55% 30%)` }}
    >
      {initials}
    </span>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    pending:   'bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-400',
    printed:   'bg-blue-500/10 border-blue-500/25 text-blue-700 dark:text-blue-400',
    shipped:   'bg-violet-500/10 border-violet-500/25 text-violet-700 dark:text-violet-400',
    delivered: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400',
    cancelled: 'bg-red-500/10 border-red-500/25 text-red-600 dark:text-red-400',
  };
  const dots: Record<string, string> = {
    pending: 'bg-amber-500', printed: 'bg-blue-500', shipped: 'bg-violet-500',
    delivered: 'bg-emerald-500', cancelled: 'bg-red-500',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border uppercase tracking-wide ${styles[status] ?? styles.pending}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status] ?? 'bg-gray-400'}`} />
      {statusFr(status)}
    </span>
  );
};

// ─── Shared Excel-dispatch helper ─────────────────────────────────────────────

function isIntigoExcelOrder(order: Pick<Order, 'delivery_method' | 'intigo'>): boolean {
  return (
    order.delivery_method === 'intigo' &&
    !order.intigo?.nid &&
    (order.intigo?.event_type === 'excel_dispatched' || !!order.intigo?.shipped_at)
  );
}

// ─── IntigoStatusChip ─────────────────────────────────────────────────────────

const IntigoStatusChip = ({
  isApi, nid, label, eventType, isExcel,
}: {
  isApi?: boolean;
  nid?: string | null;
  label?: string | null;
  eventType?: string | null;
  isExcel?: boolean;
}) => {
  if (isApi) {
    const subLabelColor: Record<string, string> = {
      pickup_pending:   'text-amber-600 dark:text-amber-400',
      pending_delivery: 'text-blue-600 dark:text-blue-400',
      in_depot:         'text-blue-600 dark:text-blue-400',
      in_transit:       'text-violet-600 dark:text-violet-400',
      out_for_delivery: 'text-indigo-600 dark:text-indigo-400',
      delivered:        'text-emerald-600 dark:text-emerald-400',
      return_pending:   'text-orange-600 dark:text-orange-400',
      returned:         'text-red-600 dark:text-red-400',
      cancelled:        'text-red-600 dark:text-red-400',
    };
    return (
      <div className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800/50">
          <Truck className="w-2.5 h-2.5 flex-shrink-0" />
          Intigo API
          {nid && <span className="ml-1 font-mono opacity-60">· {nid.slice(-6).toUpperCase()}</span>}
        </span>
        {label && (
          <span className={`text-[10px] pl-1 ${subLabelColor[eventType ?? ''] ?? 'text-gray-500 dark:text-zinc-500'}`}>
            {label}
          </span>
        )}
      </div>
    );
  }
  if (isExcel) {
    return (
      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50">
        <Package className="w-2.5 h-2.5 flex-shrink-0" />
        Via Excel
      </span>
    );
  }
  return null;
};

// ─── Delivery Stats Card ──────────────────────────────────────────────────────

const DeliveryStatsCard = ({
  stats, deliveryFilter, onFilterChange,
}: {
  stats: OrderStats;
  deliveryFilter: DeliveryFilter;
  onFilterChange: (v: DeliveryFilter) => void;
}) => {
  const items: {
    key: DeliveryFilter; label: string; sublabel: string; count: number;
    icon: React.ElementType; color: string; activeBg: string; dot: string;
  }[] = [
    { key: 'self',         label: 'Auto-livraison', sublabel: 'Sans Intigo',   count: stats.delivery.self,          icon: CheckCircle,  color: 'text-gray-600 dark:text-zinc-400',      activeBg: 'bg-gray-100 dark:bg-zinc-800 ring-1 ring-gray-300 dark:ring-zinc-600',          dot: 'bg-gray-400'   },
    { key: 'intigo',       label: 'Intigo (total)', sublabel: 'API + Excel',   count: stats.delivery.intigo,        icon: Truck,        color: 'text-violet-600 dark:text-violet-400',  activeBg: 'bg-violet-50 dark:bg-violet-950/30 ring-1 ring-violet-300 dark:ring-violet-700', dot: 'bg-violet-500' },
    { key: 'intigo_api',   label: 'Intigo API',     sublabel: 'Avec NID',      count: stats.delivery.intigo_api,   icon: Truck,        color: 'text-indigo-600 dark:text-indigo-400',  activeBg: 'bg-indigo-50 dark:bg-indigo-950/30 ring-1 ring-indigo-300 dark:ring-indigo-700', dot: 'bg-indigo-500' },
    { key: 'intigo_excel', label: 'Intigo Excel',   sublabel: 'Sans suivi API',count: stats.delivery.intigo_excel, icon: Package,      color: 'text-emerald-600 dark:text-emerald-400',activeBg: 'bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-300 dark:ring-emerald-700', dot: 'bg-emerald-500' },
  ];

  return (
    <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-widest">
            Mode de livraison
          </p>
          {deliveryFilter !== 'all' && (
            <button
              onClick={() => onFilterChange('all')}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 underline underline-offset-2"
            >
              Tout afficher
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {items.map(({ key, label, sublabel, count, icon: Icon, color, activeBg, dot }) => {
            const isActive = deliveryFilter === key;
            return (
              <button
                key={key}
                onClick={() => onFilterChange(isActive ? 'all' : key)}
                className={`group flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-150 ${isActive ? activeBg : 'hover:bg-gray-50 dark:hover:bg-zinc-800/60'}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${isActive ? 'bg-white dark:bg-zinc-900 shadow-sm' : 'bg-gray-100 dark:bg-zinc-800'}`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div className="min-w-0">
                  <p className={`text-xl font-bold leading-none tabular-nums ${color}`}>{count}</p>
                  <p className="text-xs font-semibold text-gray-800 dark:text-zinc-200 mt-1 truncate">{label}</p>
                  <p className="text-[10px] text-gray-400 dark:text-zinc-500 truncate">{sublabel}</p>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Invoice PDF ──────────────────────────────────────────────────────────────

async function loadPdfLibs() {
  const [jsPDFModule, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  return { jsPDF: jsPDFModule.default, autoTable: autoTableModule.default };
}

const AMBER_RGB = [245, 158, 11]  as [number, number, number];
const DARK_RGB  = [24,  24,  27]  as [number, number, number];
const GRAY_RGB  = [113, 113, 122] as [number, number, number];
const LIGHT_RGB = [250, 250, 250] as [number, number, number];
const WHITE_RGB = [255, 255, 255] as [number, number, number];
const LINE_RGB  = [228, 228, 231] as [number, number, number];

function fmt(n: number) { return `${n.toFixed(2)} DT`; }
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}
function invNumber(id: string) {
  return `AUR-${new Date().getFullYear()}-${id.substring(id.length - 8).toUpperCase()}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawPage(doc: any, autoTable: any, order: Order) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 20;
  const W = pageW - M * 2;

  doc.setFillColor(...DARK_RGB); doc.rect(0, 0, pageW, 52, 'F');
  doc.setTextColor(...AMBER_RGB); doc.setFont('helvetica', 'bold'); doc.setFontSize(22);
  doc.text('AURAGE', M, 24);
  doc.setTextColor(...WHITE_RGB); doc.setFont('helvetica', 'italic'); doc.setFontSize(8);
  doc.text('Parfums & Fragrances', M, 31);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(26); doc.setTextColor(...WHITE_RGB);
  doc.text('FACTURE', pageW - M, 22, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...AMBER_RGB);
  doc.text(`N° ${invNumber(order._id)}`, pageW - M, 30, { align: 'right' });
  doc.setTextColor(200, 200, 200); doc.setFontSize(8);
  doc.text(`Date : ${fmtDate(order.created_at)}`, pageW - M, 38, { align: 'right' });
  doc.setDrawColor(...AMBER_RGB); doc.setLineWidth(1.5); doc.line(0, 52, pageW, 52);

  const statusFrMap: Record<string, string> = {
    pending: 'En attente', printed: 'Imprimé', shipped: 'Expédié',
    delivered: 'Livré', cancelled: 'Annulé',
  };
  doc.setFillColor(...AMBER_RGB); doc.roundedRect(M, 58, 38, 8, 2, 2, 'F');
  doc.setTextColor(...WHITE_RGB); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
  doc.text((statusFrMap[order.status] ?? order.status).toUpperCase(), M + 19, 63.5, { align: 'center' });

  let y = 76;
  const halfW = W / 2 - 4;
  doc.setFillColor(...LIGHT_RGB); doc.rect(M, y, halfW, 44, 'F');
  doc.setDrawColor(...LINE_RGB); doc.setLineWidth(0.3); doc.rect(M, y, halfW, 44, 'S');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...AMBER_RGB);
  doc.text('VENDEUR', M + 4, y + 7);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...DARK_RGB);
  doc.text('Aurage Fragrances', M + 4, y + 15);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRAY_RGB);
  doc.text('Tunisie', M + 4, y + 22);
  doc.text('contact@aurage.tn', M + 4, y + 29);
  doc.text('www.aurage.tn', M + 4, y + 36);

  const rX = M + W / 2 + 4;
  doc.setFillColor(...LIGHT_RGB); doc.rect(rX, y, halfW, 44, 'F');
  doc.setDrawColor(...LINE_RGB); doc.setLineWidth(0.3); doc.rect(rX, y, halfW, 44, 'S');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...AMBER_RGB);
  doc.text('CLIENT', rX + 4, y + 7);
  const fullName = `${order.customer?.first_name ?? ''} ${order.customer?.last_name ?? ''}`.trim();
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...DARK_RGB);
  doc.text(fullName || 'Client', rX + 4, y + 15);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRAY_RGB);
  const addr = order.shipping_address ?? {};
  const a1 = addr.street ?? '';
  const a2 = [addr.city, addr.governorate ?? (addr as any).state].filter(Boolean).join(', ');
  let ay = y + 22;
  if (a1) { doc.text(a1, rX + 4, ay); ay += 7; }
  if (a2) { doc.text(a2, rX + 4, ay); ay += 7; }
  if (order.customer?.phone) doc.text(`Tél : ${order.customer.phone}`, rX + 4, ay);
  if (order.customer?.email) { doc.setFontSize(7.5); doc.text(order.customer.email, rX + 4, y + 40); }

  y += 54;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...DARK_RGB);
  doc.text('Détail de la commande', M, y);
  y += 5;

  // ── i18n: use the t() helper so bilingual fields resolve to the correct locale.
  // bottle.name is a plain string (not bilingual) — t() handles both cases safely.
  const rows = (order.items ?? []).map(item => {
    let desc: string;
    if (item.pack) {
      // Pack.name is bilingual { en, fr }
      desc = `Pack : ${t(item.pack.name)}`;
    } else {
      // Product.name is bilingual { en, fr }
      desc = t(item.product?.name) || 'Produit';
      // BottleVariant.name is a plain string — never use [lang] on it
      if (item.bottle?.name) desc += `\nFlacon : ${item.bottle.name}`;
    }
    const qty  = item.quantity || 1;
    const unit = item.price_at_purchase || 0;
    return [desc, String(qty), fmt(unit), fmt(unit * qty)];
  });
  if (rows.length === 0) rows.push(['Aucun article trouvé', '–', '–', '–']);

  autoTable(doc, {
    startY: y,
    head: [['Description', 'Qté', 'Prix unitaire', 'Total']],
    body: rows,
    margin: { left: M, right: M },
    styles: { fontSize: 8.5, cellPadding: 5, textColor: DARK_RGB, lineColor: LINE_RGB, lineWidth: 0.3 },
    headStyles: { fillColor: DARK_RGB, textColor: WHITE_RGB, fontStyle: 'bold', halign: 'left' },
    columnStyles: {
      0: { cellWidth: W * 0.52 },
      1: { halign: 'center', cellWidth: W * 0.10 },
      2: { halign: 'right',  cellWidth: W * 0.19 },
      3: { halign: 'right',  cellWidth: W * 0.19 },
    },
    alternateRowStyles: { fillColor: [252, 252, 252] },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 6;
  const tX = pageW - M - 74;
  const tW = 74;
  doc.setFillColor(...LIGHT_RGB); doc.rect(tX, finalY, tW, 9, 'F');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRAY_RGB);
  doc.text('Sous-total HT :', tX + 4, finalY + 6);
  doc.setTextColor(...DARK_RGB);
  doc.text(fmt(order.total_amount), tX + tW - 4, finalY + 6, { align: 'right' });
  doc.setFillColor(...LIGHT_RGB); doc.rect(tX, finalY + 10, tW, 9, 'F');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRAY_RGB);
  doc.text('Frais de livraison :', tX + 4, finalY + 16);
  doc.setTextColor(...DARK_RGB);
  doc.text('Offerts', tX + tW - 4, finalY + 16, { align: 'right' });
  doc.setDrawColor(...AMBER_RGB); doc.setLineWidth(0.8);
  doc.line(tX, finalY + 20, tX + tW, finalY + 20);
  doc.setFillColor(...AMBER_RGB); doc.rect(tX, finalY + 20, tW, 12, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...WHITE_RGB);
  doc.text('TOTAL TTC :', tX + 4, finalY + 27.5);
  doc.text(fmt(order.total_amount), tX + tW - 4, finalY + 27.5, { align: 'right' });

  const noteY = finalY + 40;
  if (noteY + 20 < pageH - 30) {
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(...LINE_RGB); doc.setLineWidth(0.3);
    doc.rect(M, noteY, W, 16, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...AMBER_RGB);
    doc.text('Conditions de paiement', M + 4, noteY + 6);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...DARK_RGB);
    const pm = order.delivery_method === 'intigo'
      ? 'Paiement à la livraison via Intigo'
      : 'Paiement à la livraison (espèces)';
    doc.text(pm, M + 4, noteY + 12);
  }

  doc.setFillColor(...DARK_RGB); doc.rect(0, pageH - 22, pageW, 22, 'F');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(150, 150, 150);
  doc.text('Merci pour votre confiance ! Pour toute question : contact@aurage.tn', pageW / 2, pageH - 12, { align: 'center' });
  doc.setTextColor(...AMBER_RGB); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
  doc.text(`AURAGE © ${new Date().getFullYear()}`, pageW / 2, pageH - 5, { align: 'center' });
}

async function generateInvoicePDF(orders: Order[], filename?: string): Promise<void> {
  const { jsPDF, autoTable } = await loadPdfLibs();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  orders.forEach((order, i) => { if (i > 0) doc.addPage(); drawPage(doc, autoTable, order); });
  const name = filename ?? (orders.length === 1
    ? `facture-aurage-${orders[0]._id.substring(orders[0]._id.length - 8).toUpperCase()}.pdf`
    : `factures-aurage-${new Date().toISOString().split('T')[0]}-${orders.length}cmd.pdf`);
  doc.save(name);
}

// ─── Bulk Action Bar ──────────────────────────────────────────────────────────

const BulkActionBar: React.FC<{
  selectedCount: number;
  isUpdating: boolean;
  isPrinting: boolean;
  onClose: () => void;
  onAction: (status: string) => void;
  onPrintInvoices: () => void;
  onExportIntigo: () => void;
}> = ({ selectedCount, isUpdating, isPrinting, onClose, onAction, onPrintInvoices, onExportIntigo }) => {
  if (selectedCount === 0) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl shadow-2xl px-4 py-3 animate-in slide-in-from-bottom-10 duration-200">
      {/* Count badge */}
      <span className="flex items-center justify-center min-w-[2rem] h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold px-2 mr-2">
        {selectedCount}
      </span>
      <span className="text-xs font-medium text-gray-500 dark:text-zinc-400 mr-3 whitespace-nowrap hidden sm:block">
        sélectionné{selectedCount > 1 ? 's' : ''}
      </span>

      <Separator orientation="vertical" className="bg-gray-200 dark:bg-zinc-700 h-5 mr-2 hidden sm:block" />

      <div className="flex items-center gap-1">
        <BulkBtn disabled={isUpdating || isPrinting} onClick={onPrintInvoices} icon={isPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} label="Factures" color="amber" />
        <BulkBtn disabled={isUpdating} onClick={onExportIntigo}              icon={<FileDown className="w-3.5 h-3.5" />}            label="Intigo"   color="emerald" />
        <BulkBtn disabled={isUpdating} onClick={() => onAction('printed')}   icon={<Printer className="w-3.5 h-3.5" />}              label="Imprimé"  color="blue" />
        <BulkBtn disabled={isUpdating} onClick={() => onAction('shipped')}   icon={<Truck className="w-3.5 h-3.5" />}                label="Expédié"  color="violet" />
        <BulkBtn disabled={isUpdating} onClick={() => onAction('delivered')} icon={<CheckCircle className="w-3.5 h-3.5" />}          label="Livré"    color="green" />
        <BulkBtn disabled={isUpdating} onClick={() => onAction('cancelled')} icon={<RotateCcw className="w-3.5 h-3.5" />}            label="Annuler"  color="red" />
      </div>

      <Separator orientation="vertical" className="bg-gray-200 dark:bg-zinc-700 h-5 mx-2" />
      <button
        disabled={isUpdating}
        onClick={onClose}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-600 transition-colors text-sm font-medium"
      >
        ✕
      </button>
    </div>
  );
};

const BulkBtn = ({
  disabled, onClick, icon, label, color,
}: {
  disabled: boolean; onClick: () => void; icon: React.ReactNode; label: string;
  color: 'amber' | 'emerald' | 'blue' | 'violet' | 'green' | 'red';
}) => {
  const colors = {
    amber:  'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20',
    emerald:'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20',
    blue:   'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20',
    violet: 'text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/20',
    green:  'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20',
    red:    'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20',
  };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${colors[color]}`}
    >
      {icon}
      <span className="hidden sm:block">{label}</span>
    </button>
  );
};

// ─── Order Details Sheet ──────────────────────────────────────────────────────

const OrderDetailsSheet: React.FC<{
  selectedData: { order: Order; history: OrderHistoryLog[] } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoadingDetails: boolean;
  onUpdateStatus: (id: string, status: string, note?: string) => Promise<boolean>;
  onAddNote: (id: string, note: string) => Promise<boolean>;
  onRefresh: () => void;
  onShipRefresh: () => void;
}> = ({
  selectedData, open, onOpenChange, isLoadingDetails,
  onUpdateStatus, onAddNote, onRefresh, onShipRefresh,
}) => {
  const [notes, setNotes]           = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const order   = selectedData?.order;
  const history = selectedData?.history ?? [];

  useEffect(() => { setNotes(''); }, [order]);

  const handleStatusUpdate = async (status: string, defaultNote?: string) => {
    if (!order) return;
    const ok = await onUpdateStatus(order._id, status, notes || defaultNote);
    if (ok) { setNotes(''); onRefresh(); }
  };

  const handleSheetClose = (isOpen: boolean) => {
    if (!isOpen && order && notes.trim()) onAddNote(order._id, notes);
    onOpenChange(isOpen);
  };

  const handlePrintInvoice = async () => {
    if (!order) return;
    setIsPrinting(true);
    try {
      await generateInvoicePDF([order]);
      if (order.status === 'pending') await handleStatusUpdate('printed', 'Facture PDF générée');
    } finally { setIsPrinting(false); }
  };

  const isIntigoApi   = order?.delivery_method === 'intigo' && !!order.intigo?.nid;
  const isIntigoExcel = order ? isIntigoExcelOrder(order) : false;

  return (
    <Sheet open={open} onOpenChange={handleSheetClose}>
      <SheetContent className="w-full sm:max-w-2xl bg-white dark:bg-zinc-950 border-l border-gray-200 dark:border-zinc-800 flex flex-col p-0">
        <SheetHeader className="sr-only"><SheetTitle>Détails de la commande</SheetTitle></SheetHeader>

        {isLoadingDetails || !order ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
              <p className="text-sm text-gray-400 dark:text-zinc-500">Chargement…</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Sheet header ── */}
            <div className="sticky top-0 z-10 bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <CustomerAvatar firstName={order.customer?.first_name} lastName={order.customer?.last_name} />
                  <div className="min-w-0">
                    <h2 className="text-gray-900 dark:text-white text-base font-bold leading-tight truncate">
                      {order.customer?.first_name ?? 'Client'} {order.customer?.last_name ?? ''}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-zinc-500 font-mono">
                        <Hash className="w-3 h-3" />
                        {order._id?.substring(order._id.length - 6).toUpperCase()}
                      </span>
                      <span className="text-gray-300 dark:text-zinc-700">·</span>
                      <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-zinc-500">
                        <Calendar className="w-3 h-3" />
                        {order.created_at ? new Date(order.created_at).toLocaleString('fr-FR') : '—'}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
  variant="outline" size="sm"
  onClick={handlePrintInvoice} disabled={isPrinting}
  className="flex-shrink-0 flex items-center gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700/50 dark:text-amber-400 dark:hover:bg-amber-900/20"
>
  {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
  <span className="hidden sm:block">
    {isPrinting ? 'Génération...' : 'Facture PDF'}
  </span>
</Button>
              </div>

              {/* Status pills row */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <StatusBadge status={order.status} />
                {isIntigoApi && (
                  <IntigoStatusChip
                    isApi nid={order.intigo?.nid}
                    label={order.intigo?.status_label}
                    eventType={order.intigo?.event_type}
                  />
                )}
                {isIntigoExcel && <IntigoStatusChip isExcel />}
                {order.delivery_method === 'self' && (
                  <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-zinc-500">
                    <CheckCircle className="w-3 h-3" /> Auto-livraison
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

              {/* Customer + Address side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Contact</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {order.customer?.first_name ?? 'Client'} {order.customer?.last_name ?? ''}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">{order.customer?.phone ?? '—'}</p>
                  {order.customer?.email && (
                    <p className="text-xs text-gray-400 dark:text-zinc-500 truncate">{order.customer.email}</p>
                  )}
                </div>
                <div className="space-y-1.5 border-l border-gray-100 dark:border-zinc-800 pl-4">
                  <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Adresse</p>
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-gray-700 dark:text-zinc-300 leading-relaxed">
                      <p>{order.shipping_address?.street ?? 'N/A'}</p>
                      <p>{[order.shipping_address?.district, order.shipping_address?.governorate ?? (order.shipping_address as any)?.state].filter(Boolean).join(', ') || 'N/A'}</p>
                      {(order.shipping_address?.governorate_id || order.shipping_address?.district_id) && (
                        <p className="text-[10px] text-gray-400 dark:text-zinc-600 mt-0.5">
                          Ville {order.shipping_address.governorate_id} · Déleg. {order.shipping_address.district_id}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="bg-gray-100 dark:bg-zinc-800" />

              {/* Articles */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-3">Articles</p>
                <div className="border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50 dark:bg-zinc-900/60">
                      <TableRow className="border-b border-gray-200 dark:border-zinc-800">
                        <TableHead className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 py-2.5">Article</TableHead>
                        <TableHead className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 text-center py-2.5">Qté</TableHead>
                        <TableHead className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 text-right py-2.5">Prix unit.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!order.items || order.items.length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-sm text-gray-400">Aucun article.</TableCell>
                          <TableCell colSpan={3} className="text-center py-8 text-sm text-gray-400">Aucun article.</TableCell>
                        </TableRow>
                      ) : order.items.map((item, idx) => (
                        <TableRow key={item._id ?? idx} className="border-b border-gray-100 dark:border-zinc-800/60 last:border-0">
                          <TableCell className="px-3 py-3">
                            {item.pack ? (
                              <div>
                                {/* Pack.name is bilingual — use t() */}
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                  📦 {t(item.pack.name)}
                                </p>
                                <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">Pack groupé</p>
                              </div>
                            ) : (
                              <div>
                                {/* Product.name is bilingual — use t() */}
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {t(item.product?.name) || 'Produit'}
                                </p>
                                {/* BottleVariant.name is a plain string — never use [lang] on it */}
                                <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
                                  Flacon : {item.bottle?.name ?? 'N/A'}
                                </p>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-sm font-medium text-gray-700 dark:text-zinc-300">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right text-sm font-semibold text-gray-900 dark:text-white pr-3">
                            DT{(item.price_at_purchase ?? 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Total */}
                <div className="mt-3 flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-zinc-900/60 rounded-xl border border-gray-100 dark:border-zinc-800">
                  <span className="text-sm font-semibold text-gray-500 dark:text-zinc-400">Total commande</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    DT{(order.total_amount ?? 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <Separator className="bg-gray-100 dark:bg-zinc-800" />

              {/* Timeline */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-4">
                  Historique
                </p>
                <div className="space-y-3">
                  {history.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-zinc-500 italic">Aucun historique.</p>
                  ) : history.map((log, index) => {
                    const isCancelled = log.status === 'cancelled';
                    return (
                      <div key={log._id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isCancelled ? 'bg-red-50 border-red-400 text-red-500 dark:bg-red-950/30 dark:border-red-600' : 'bg-blue-50 border-blue-400 text-blue-500 dark:bg-blue-950/30 dark:border-blue-600'}`}>
                            {isCancelled
                              ? <AlertCircle className="w-3.5 h-3.5" />
                              : <CheckCircle2 className="w-3.5 h-3.5" />
                            }
                          </div>
                          {index < history.length - 1 && (
                            <div className="w-px flex-1 bg-gray-200 dark:bg-zinc-700 mt-1 mb-0 min-h-[1.5rem]" />
                          )}
                        </div>
                        <div className="pb-3 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-white">
                            {statusFr(log.status)}
                          </p>
                          <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
                            {new Date(log.created_at).toLocaleString('fr-FR')}
                          </p>
                          {log.note && (
                            <p className="text-[11px] text-gray-500 dark:text-zinc-400 italic mt-1 bg-gray-50 dark:bg-zinc-900 rounded px-2 py-1">
                              {log.note}
                            </p>
                          )}
                          {log.admin_id && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                              Par : {log.admin_id.name}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator className="bg-gray-100 dark:bg-zinc-800" />

              {/* Intigo shipping panel */}
              <IntigoShippingPanel
  orderId={order._id}
  orderStatus={order.status}
  deliveryMethod={order.delivery_method}
  items={order.items}
  totalAmount={order.total_amount}
  shippingAddress={order.shipping_address}
  intigo={order.intigo}
  onShipped={onShipRefresh}
/>

              <Separator className="bg-gray-100 dark:bg-zinc-800" />

              {/* Status update */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
                  Mettre à jour
                </p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ajouter une note interne (optionnel)…"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm mb-3 bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 dark:focus:border-amber-600 resize-none transition"
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => handleStatusUpdate('shipped')}
                    className="bg-violet-600 hover:bg-violet-700 text-white">
                    <Truck className="w-3.5 h-3.5 mr-1.5" /> Marquer expédié
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleStatusUpdate('delivered')}
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20">
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Marquer livré
                  </Button>
                  {(order.delivery_method !== 'intigo' || !order.intigo?.nid) && (
                    <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate('cancelled')}>
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Annuler
                    </Button>
                  )}
                  {order.delivery_method === 'intigo' && order.intigo?.nid && (
                    <a
                      href="https://app.intigo.net"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 mt-1 self-center"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Gérer via dashboard Intigo
                    </a>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

// ─── Main Orders Section ──────────────────────────────────────────────────────

export const OrdersSection = () => {
  const {
    orders, selectedOrder, isLoading, totalOrders, pagination,
    stats, fetchOrders, fetchOrderDetails, updateOrderStatus,
    addOrderNote, setSelectedOrder,
  } = useOrders();

  const [page, setPage]                     = useState(1);
  const [searchTerm, setSearchTerm]         = useState('');
  const [statusFilter, setStatusFilter]     = useState<string>('all');
  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>('all');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen]           = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isBulkPrinting, setIsBulkPrinting] = useState(false);
  const [exportToast, setExportToast]       = useState<string | null>(null);

  const doFetch = useCallback((overrides: Record<string, any> = {}) => {
    fetchOrders({
      page, limit: 10,
      status: statusFilter,
      delivery_method: deliveryFilter,
      searchTerm: searchTerm.trim() || undefined,
      ...overrides,
    });
  }, [fetchOrders, page, statusFilter, deliveryFilter, searchTerm]);

  useEffect(() => {
    const t = setTimeout(() => doFetch(), 400);
    return () => clearTimeout(t);
  }, [searchTerm, statusFilter, deliveryFilter, page, doFetch]);

  const handleShipRefresh = useCallback(() => {
    setStatusFilter('all');
    setPage(1);
    fetchOrders({
      page: 1, limit: 10, status: 'all',
      delivery_method: deliveryFilter,
      searchTerm: searchTerm.trim() || undefined,
    });
  }, [fetchOrders, deliveryFilter, searchTerm]);

  const handleDeliveryFilterChange = (val: DeliveryFilter) => {
    setDeliveryFilter(val);
    setPage(1);
  };

  const handleSelectOrder = (id: string) => {
    const s = new Set(selectedOrders);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedOrders(s);
  };

  const handleSelectAll = () => {
    setSelectedOrders(selectedOrders.size === orders.length
      ? new Set()
      : new Set(orders.map(o => o._id)));
  };

  const handleOpenDetails = async (id: string) => {
    setSheetOpen(true);
    await fetchOrderDetails(id);
  };

  const handleBulkAction = async (newStatus: string) => {
  const count = selectedOrders.size;
  if (!window.confirm(`Marquer ${count} commande(s) comme "${statusFr(newStatus)}" ?`)) return;
  setIsBulkUpdating(true);
  try {
    await Promise.all(Array.from(selectedOrders).map(id =>
      updateOrderStatus(id, newStatus, `Mise à jour groupée → ${statusFr(newStatus)}`)));
    setSelectedOrders(new Set());
    doFetch();
    setExportToast(`✓ ${count} commande(s) marquée(s) comme "${statusFr(newStatus)}"`);
    setTimeout(() => setExportToast(null), 5000);
  } finally { setIsBulkUpdating(false); }
};
  const handleBulkPrintInvoices = async () => {
    if (selectedOrders.size === 0) return;
    setIsBulkPrinting(true);
    try {
      const sel = orders.filter(o => selectedOrders.has(o._id));
      await generateInvoicePDF(sel);
      const pending = sel.filter(o => o.status === 'pending');
      if (pending.length > 0) {
        await Promise.all(pending.map(o => updateOrderStatus(o._id, 'printed', 'Facture PDF générée')));
        doFetch();
      }
      setSelectedOrders(new Set());
    } finally { setIsBulkPrinting(false); }
  };

  const handleExportIntigo = async () => {
    const selected = orders.filter(o => selectedOrders.has(o._id));
    if (selected.length === 0) return;
    await exportIntigoExcel(selected, (result) => {
      const parts: string[] = [];
      if (result.exported > 0)   parts.push(`${result.exported} colis exporté${result.exported > 1 ? 's' : ''}`);
      if (result.markedInDB > 0) parts.push(`${result.markedInDB} commande${result.markedInDB > 1 ? 's' : ''} mise${result.markedInDB > 1 ? 's' : ''} à jour`);
      if (result.skipped > 0)    parts.push(`${result.skipped} ignorée${result.skipped > 1 ? 's' : ''} (déjà expédiées)`);
      setExportToast(parts.join(' · '));
      setTimeout(() => setExportToast(null), 5000);
      setSelectedOrders(new Set());
      doFetch();
    });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDeliveryFilter('all');
    setPage(1);
  };

  const statusKpis = [
    { label: 'En attente', key: 'pending',   color: 'text-amber-600 dark:text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950/20',   border: 'border-amber-200 dark:border-amber-800/30'   },
    { label: 'Imprimés',   key: 'printed',   color: 'text-blue-600 dark:text-blue-500',     bg: 'bg-blue-50 dark:bg-blue-950/20',     border: 'border-blue-200 dark:border-blue-800/30'     },
    { label: 'Expédiés',   key: 'shipped',   color: 'text-violet-600 dark:text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/20', border: 'border-violet-200 dark:border-violet-800/30' },
    { label: 'Livrés',     key: 'delivered', color: 'text-emerald-600 dark:text-emerald-500',bg: 'bg-emerald-50 dark:bg-emerald-950/20',border: 'border-emerald-200 dark:border-emerald-800/30'},
  ] as const;

  return (
    <div className="space-y-5 pb-24 relative">

      {/* Status KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statusKpis.map(({ label, key, color, bg, border }) => (
          <button
            key={key}
            onClick={() => { setStatusFilter(statusFilter === key ? 'all' : key); setPage(1); }}
            className={`text-left p-4 rounded-xl border transition-all duration-150 ${statusFilter === key ? `${bg} ${border} ring-1 ring-inset ${border}` : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/60'}`}
          >
            <p className={`text-[11px] font-bold uppercase tracking-widest mb-1 ${color}`}>{label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{(stats as any)[key] ?? 0}</p>
          </button>
        ))}
      </div>

      <DeliveryStatsCard
        stats={stats}
        deliveryFilter={deliveryFilter}
        onFilterChange={handleDeliveryFilterChange}
      />

      {/* Filters */}
      <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-amber-400/30 focus-within:border-amber-400 transition">
            <Search className="w-4 h-4 text-gray-400 dark:text-zinc-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Rechercher par nom, téléphone, ID ou NID Intigo…"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="flex-1 bg-transparent text-sm outline-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600"
            />
          </div>

          <div className="w-full sm:w-44">
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="printed">Imprimé</SelectItem>
                <SelectItem value="shipped">Expédié</SelectItem>
                <SelectItem value="delivered">Livré</SelectItem>
                <SelectItem value="cancelled">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-52">
            <Select value={deliveryFilter} onValueChange={(v) => handleDeliveryFilterChange(v as DeliveryFilter)}>
              <SelectTrigger><SelectValue placeholder="Livraison" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les livraisons</SelectItem>
                <SelectItem value="self">Auto-livraison</SelectItem>
                <SelectItem value="intigo">Intigo (tout)</SelectItem>
                <SelectItem value="intigo_api">Intigo API (suivi)</SelectItem>
                <SelectItem value="intigo_excel">Intigo Excel (sans suivi)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" onClick={resetFilters} className="flex-shrink-0">
            <Filter className="w-4 h-4 mr-2" />Réinitialiser
          </Button>
        </CardContent>
      </Card>

      {/* Orders table */}
      <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <CardContent className="p-0">
          <div className="relative min-h-[300px]">
            {(isLoading || isBulkUpdating) && (
              <div className="absolute inset-0 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  <span className="text-sm text-gray-600 dark:text-zinc-400">Chargement…</span>
                </div>
              </div>
            )}
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-zinc-900/80 border-b border-gray-200 dark:border-zinc-800">
                <TableRow>
                  <TableHead className="w-10 px-4 py-3">
                    <Checkbox
                      checked={selectedOrders.size === orders.length && orders.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider py-3">N° Cmd</TableHead>
                  <TableHead className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider py-3">Client</TableHead>
                  <TableHead className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider py-3 hidden sm:table-cell">Date</TableHead>
                  <TableHead className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider py-3">Statut</TableHead>
                  <TableHead className="text-right text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider py-3">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 && !isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16 text-gray-400 dark:text-zinc-500">
                      <div className="flex flex-col items-center gap-2">
                        <Package className="w-8 h-8 opacity-30" />
                        <p className="text-sm">Aucune commande trouvée</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : orders.map((order) => {
                  const isIntigoApi   = order.delivery_method === 'intigo' && !!order.intigo?.nid;
                  const isIntigoExcel = isIntigoExcelOrder(order);
                  const isSelected    = selectedOrders.has(order._id);

                  return (
                    <TableRow
                      key={order._id}
                      className={`border-b border-gray-100 dark:border-zinc-800/60 cursor-pointer transition-colors duration-100 ${isSelected ? 'bg-amber-50/60 dark:bg-amber-900/10' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/40'}`}
                      onClick={() => handleSelectOrder(order._id)}
                    >
                      <TableCell className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={isSelected} onCheckedChange={() => handleSelectOrder(order._id)} />
                      </TableCell>

                      <TableCell className="py-3.5" onClick={(e) => { e.stopPropagation(); handleOpenDetails(order._id); }}>
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline underline-offset-2 font-mono">
                          #{order._id?.substring(order._id.length - 6).toUpperCase()}
                        </span>
                      </TableCell>

                      <TableCell className="py-3.5">
                        <div className="flex items-center gap-2.5">
                          <CustomerAvatar firstName={order.customer?.first_name} lastName={order.customer?.last_name} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {order.customer?.first_name ?? 'Client'} {order.customer?.last_name ?? ''}
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-zinc-500 truncate">{order.customer?.phone}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-xs text-gray-500 dark:text-zinc-400 py-3.5 hidden sm:table-cell">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                      </TableCell>

                      <TableCell className="py-3.5">
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={order.status} />
                          {isIntigoApi && (
                            <IntigoStatusChip
                              isApi nid={order.intigo?.nid}
                              label={order.intigo?.status_label}
                              eventType={order.intigo?.event_type ?? undefined}
                            />
                          )}
                          {isIntigoExcel && <IntigoStatusChip isExcel />}
                        </div>
                      </TableCell>

                      <TableCell className="text-right py-3.5 pr-4">
                        <span className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                          DT{(order.total_amount ?? 0).toFixed(2)}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-zinc-800">
            <span className="text-xs text-gray-400 dark:text-zinc-500">
              {totalOrders} commande{totalOrders !== 1 ? 's' : ''} au total
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={pagination.currentPage <= 1 || isLoading} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-gray-600 dark:text-zinc-400 tabular-nums px-1">
                {pagination.currentPage} / {pagination.totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={pagination.currentPage >= pagination.totalPages || isLoading} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <OrderDetailsSheet
        selectedData={selectedOrder}
        open={sheetOpen}
        onOpenChange={(open) => { setSheetOpen(open); if (!open) setSelectedOrder(null); }}
        isLoadingDetails={isLoading && sheetOpen}
        onUpdateStatus={updateOrderStatus}
        onAddNote={addOrderNote}
        onRefresh={doFetch}
        onShipRefresh={handleShipRefresh}
      />

      <BulkActionBar
        selectedCount={selectedOrders.size}
        isUpdating={isBulkUpdating}
        isPrinting={isBulkPrinting}
        onClose={() => setSelectedOrders(new Set())}
        onAction={handleBulkAction}
        onPrintInvoices={handleBulkPrintInvoices}
        onExportIntigo={handleExportIntigo}
      />

      {/* Export toast */}
      {exportToast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-emerald-600 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-xl animate-in slide-in-from-bottom-4 duration-200">
          <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
          {exportToast}
        </div>
      )}
    </div>
  );
};