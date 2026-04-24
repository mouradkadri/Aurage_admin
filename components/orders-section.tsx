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
  Package,FileSpreadsheet,
} from 'lucide-react';
import { useOrders, Order, OrderHistoryLog, DeliveryFilter, OrderStats } from '@/hooks/useOrders';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusFr = (s: string) =>
  ({ pending: 'En attente', printed: 'Imprimé', shipped: 'Expédié', delivered: 'Livré', cancelled: 'Annulé' } as Record<string, string>)[s] ?? s;

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    pending:   'bg-yellow-500/10 border-yellow-500/20 text-yellow-600',
    printed:   'bg-blue-500/10 border-blue-500/20 text-blue-600',
    shipped:   'bg-purple-500/10 border-purple-500/20 text-purple-600',
    delivered: 'bg-green-500/10 border-green-500/20 text-green-600',
    cancelled: 'bg-red-500/10 border-red-500/20 text-red-600',
  };
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium border uppercase tracking-wider ${styles[status] ?? styles.pending}`}>
      {status ?? 'pending'}
    </span>
  );
};

/**
 * Inline Intigo status chip shown in the table row.
 * Displays the live status_label from Intigo with appropriate colour,
 * or a static "Via Excel" label for orders dispatched without the API.
 */
const IntigoStatusChip = ({
  label,
  eventType,
  isExcel,
}: {
  label?: string | null;
  eventType?: string | null;
  isExcel?: boolean;
}) => {
  if (isExcel) {
    return (
      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50">
        <Package className="w-2.5 h-2.5 flex-shrink-0" />
        Via Excel
      </span>
    );
  }

  if (!label) return null;

  const colorMap: Record<string, string> = {
    pickup_pending:   'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50',
    pending_delivery: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/50',
    in_depot:         'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/50',
    in_transit:       'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800/50',
    out_for_delivery: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800/50',
    delivered:        'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800/50',
    return_pending:   'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800/50',
    returned:         'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50',
    cancelled:        'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50',
  };
  const cls = colorMap[eventType ?? ''] ?? 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700';

  return (
    <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${cls}`}>
      <Truck className="w-2.5 h-2.5 flex-shrink-0" />
      {label}
    </span>
  );
};

// ─── Delivery Stats Card ──────────────────────────────────────────────────────

const DeliveryStatsCard = ({
  stats,
  deliveryFilter,
  onFilterChange,
}: {
  stats: OrderStats;
  deliveryFilter: DeliveryFilter;
  onFilterChange: (v: DeliveryFilter) => void;
}) => {
  const items: { key: DeliveryFilter; label: string; sublabel: string; count: number; icon: React.ElementType; color: string; activeBg: string }[] = [
    {
      key:      'self',
      label:    'Auto-livraison',
      sublabel: 'Sans Intigo',
      count:    stats.delivery.self,
      icon:     CheckCircle,
      color:    'text-gray-600 dark:text-zinc-400',
      activeBg: 'bg-gray-100 dark:bg-zinc-800 ring-1 ring-gray-300 dark:ring-zinc-600',
    },
    {
      key:      'intigo',
      label:    'Intigo (total)',
      sublabel: 'API + Excel',
      count:    stats.delivery.intigo,
      icon:     Truck,
      color:    'text-purple-600 dark:text-purple-400',
      activeBg: 'bg-purple-50 dark:bg-purple-950/30 ring-1 ring-purple-300 dark:ring-purple-700',
    },
    {
      key:      'intigo_api',
      label:    'Intigo API',
      sublabel: 'Suivi en temps réel',
      count:    stats.delivery.intigo_api,
      icon:     Truck,
      color:    'text-indigo-600 dark:text-indigo-400',
      activeBg: 'bg-indigo-50 dark:bg-indigo-950/30 ring-1 ring-indigo-300 dark:ring-indigo-700',
    },
    {
      key:      'intigo_excel',
      label:    'Intigo Excel',
      sublabel: 'Sans suivi API',
      count:    stats.delivery.intigo_excel,
      icon:     Package,
      color:    'text-emerald-600 dark:text-emerald-400',
      activeBg: 'bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-300 dark:ring-emerald-700',
    },
  ];

  return (
    <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
            Mode de livraison
          </p>
          {deliveryFilter !== 'all' && (
            <button
              onClick={() => onFilterChange('all')}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 underline"
            >
              Tout afficher
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {items.map(({ key, label, sublabel, count, icon: Icon, color, activeBg }) => {
            const isActive = deliveryFilter === key;
            return (
              <button
                key={key}
                onClick={() => onFilterChange(isActive ? 'all' : key)}
                className={`flex items-start gap-2.5 p-3 rounded-lg text-left transition-all ${
                  isActive ? activeBg : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${color}`} />
                <div className="min-w-0">
                  <p className={`text-lg font-bold leading-none ${color}`}>{count}</p>
                  <p className="text-xs font-medium text-gray-900 dark:text-white mt-1 truncate">{label}</p>
                  <p className="text-[10px] text-gray-500 dark:text-zinc-500 truncate">{sublabel}</p>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Invoice PDF (unchanged from original) ────────────────────────────────────

async function loadPdfLibs() {
  const [jsPDFModule, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  return { jsPDF: jsPDFModule.default, autoTable: autoTableModule.default };
}

const AMBER_RGB = [245, 158, 11] as [number, number, number];
const DARK_RGB  = [24,  24,  27] as [number, number, number];
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

  const statusFrMap: Record<string, string> = { pending: 'En attente', printed: 'Imprimé', shipped: 'Expédié', delivered: 'Livré', cancelled: 'Annulé' };
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
  const a2 = [addr.city, addr.governorate ?? addr.state].filter(Boolean).join(', ');
  let ay = y + 22;
  if (a1) { doc.text(a1, rX + 4, ay); ay += 7; }
  if (a2) { doc.text(a2, rX + 4, ay); ay += 7; }
  if (order.customer?.phone) doc.text(`Tél : ${order.customer.phone}`, rX + 4, ay);
  if (order.customer?.email) { doc.setFontSize(7.5); doc.text(order.customer.email, rX + 4, y + 40); }

  y += 54;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...DARK_RGB);
  doc.text('Détail de la commande', M, y);
  y += 5;

  const rows = (order.items ?? []).map(item => {
    let desc = item.pack ? `Pack : ${item.pack.name}` : item.product?.name ?? 'Produit';
    if (!item.pack && item.bottle) desc += `\nFlacon : ${item.bottle.name}`;
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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg shadow-2xl px-6 py-4 flex items-center gap-4 animate-in slide-in-from-bottom-10">
      <span className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
        {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
      </span>
      <Separator orientation="vertical" className="bg-gray-200 dark:bg-zinc-800 h-6" />
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" disabled={isUpdating || isPrinting} onClick={onPrintInvoices}
          className="text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20">
          {isPrinting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
          Factures PDF
        </Button>
        <Button size="sm" variant="ghost" disabled={isUpdating} onClick={onExportIntigo}
          className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20">
          <FileDown className="w-4 h-4 mr-2" />Export Intigo
        </Button>
        <Button size="sm" variant="ghost" disabled={isUpdating} onClick={() => onAction('printed')}
          className="text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20">
          <Printer className="w-4 h-4 mr-2" />Imprimer
        </Button>
        <Button size="sm" variant="ghost" disabled={isUpdating} onClick={() => onAction('shipped')}
          className="text-purple-600 hover:bg-purple-50 hover:text-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20">
          <Truck className="w-4 h-4 mr-2" />Expédié
        </Button>
        <Button size="sm" variant="ghost" disabled={isUpdating} onClick={() => onAction('delivered')}
          className="text-green-600 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-900/20">
          <CheckCircle className="w-4 h-4 mr-2" />Livré
        </Button>
        <Button size="sm" variant="ghost" disabled={isUpdating} onClick={() => onAction('cancelled')}
          className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20">
          <RotateCcw className="w-4 h-4 mr-2" />Annuler
        </Button>
      </div>
      <Separator orientation="vertical" className="bg-gray-200 dark:bg-zinc-800 h-6 mx-2" />
      <Button size="sm" variant="ghost" disabled={isUpdating} onClick={onClose}
        className="text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 px-2">✕</Button>
    </div>
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
  fetchOrders: (params: any) => void;
  searchTerm: string;
  statusFilter: string;
  deliveryFilter: DeliveryFilter;
  page: number;
}> = ({
  selectedData, open, onOpenChange, isLoadingDetails,
  onUpdateStatus, onAddNote, fetchOrders, searchTerm, statusFilter, deliveryFilter, page,
}) => {
  const [notes, setNotes]         = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const order   = selectedData?.order;
  const history = selectedData?.history ?? [];

  useEffect(() => { setNotes(''); }, [order]);

  const refresh = () => fetchOrders({
    page, limit: 10,
    status: statusFilter,
    delivery_method: deliveryFilter,
    searchTerm: searchTerm.trim() || undefined,
  });

  const handleStatusUpdate = async (status: string, defaultNote?: string) => {
    if (!order) return;
    const ok = await onUpdateStatus(order._id, status, notes || defaultNote);
    if (ok) { setNotes(''); refresh(); }
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

  return (
    <Sheet open={open} onOpenChange={handleSheetClose}>
      <SheetContent className="w-full sm:max-w-2xl bg-white dark:bg-zinc-950 border-l border-gray-200 dark:border-zinc-800 flex flex-col p-0">
        <SheetHeader className="sr-only"><SheetTitle>Détails de la commande</SheetTitle></SheetHeader>

        {isLoadingDetails || !order ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
          </div>
        ) : (
          <>
            <div className="sticky top-0 z-10 bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-gray-900 dark:text-white text-xl font-bold">
                  Commande #{order._id?.substring(order._id.length - 6).toUpperCase()}
                </h2>
                <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1">
                  {order.created_at ? new Date(order.created_at).toLocaleString('fr-FR') : '—'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handlePrintInvoice} disabled={isPrinting}
                className="flex items-center gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400">
                {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                Facture PDF
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

              {/* Status + Customer */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Statut</p>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={order.status} />
                    </div>
                    {/* Delivery method chip */}
                    {order.delivery_method === 'intigo' && (
                      order.intigo?.nid
                        ? <IntigoStatusChip label={order.intigo.status_label} eventType={order.intigo.event_type} />
                        : <IntigoStatusChip isExcel />
                    )}
                    {order.delivery_method === 'self' && (
                      <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-zinc-500">
                        <CheckCircle className="w-2.5 h-2.5" /> Auto-livraison
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-1 border-l border-gray-200 dark:border-zinc-800 pl-4">
                  <p className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Client</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {order.customer?.first_name ?? 'Client'} {order.customer?.last_name ?? ''}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-zinc-400">{order.customer?.phone}</p>
                  {order.customer?.email && <p className="text-xs text-gray-600 dark:text-zinc-400">{order.customer.email}</p>}
                </div>
              </div>

              <Separator className="bg-gray-200 dark:bg-zinc-800" />

              {/* Address */}
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase mb-2">Adresse</p>
                <div className="flex items-start gap-2 text-sm text-gray-900 dark:text-white">
                  <MapPin className="w-4 h-4 text-gray-600 dark:text-zinc-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p>{order.shipping_address?.street ?? 'N/A'},{' '}
                      {[order.shipping_address?.district, order.shipping_address?.governorate ?? order.shipping_address?.state].filter(Boolean).join(', ') || 'N/A'}
                    </p>
                    {(order.shipping_address?.governorate_id || order.shipping_address?.district_id) && (
                      <p className="text-xs text-gray-400 dark:text-zinc-600 mt-0.5">
                        Ville ID {order.shipping_address.governorate_id} · Délégation ID {order.shipping_address.district_id}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Separator className="bg-gray-200 dark:bg-zinc-800" />

              {/* Items */}
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase mb-3">Articles</p>
                <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50 dark:bg-zinc-900/50">
                      <TableRow>
                        <TableHead className="text-xs font-semibold">Article</TableHead>
                        <TableHead className="text-xs font-semibold text-center">Qté</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Prix unit.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!order.items || order.items.length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-6 text-sm text-gray-500">Aucun article.</TableCell>
                        </TableRow>
                      ) : order.items.map((item, idx) => (
                        <TableRow key={item._id ?? idx} className="border-b border-gray-200 dark:border-zinc-800">
                          <TableCell className="px-3 py-2">
                            {item.pack
                              ? <div><p className="text-sm font-medium">📦 {item.pack.name}</p><p className="text-xs text-gray-500">Pack groupé</p></div>
                              : <div><p className="text-sm font-medium">{item.product?.name ?? 'Produit'}</p><p className="text-xs text-gray-500">Flacon : {item.bottle?.name ?? 'N/A'}</p></div>
                            }
                          </TableCell>
                          <TableCell className="text-center text-sm">{item.quantity}</TableCell>
                          <TableCell className="text-right text-sm">DT{(item.price_at_purchase ?? 0).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-zinc-900/50 rounded-lg p-4">
                <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
                  <span>Total</span>
                  <span>DT{(order.total_amount ?? 0).toFixed(2)}</span>
                </div>
              </div>

              <Separator className="bg-gray-200 dark:bg-zinc-800" />

              {/* Timeline */}
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase mb-4">Historique</p>
                <div className="space-y-4">
                  {history.length === 0
                    ? <p className="text-sm text-gray-500">Aucun historique.</p>
                    : history.map((log, index) => (
                      <div key={log._id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${log.status === 'cancelled' ? 'bg-red-500/10 border-red-500 text-red-600' : 'bg-blue-500/10 border-blue-500 text-blue-600'}`}>
                            {log.status === 'cancelled' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </div>
                          {index < history.length - 1 && <div className="w-0.5 h-8 bg-gray-300 dark:bg-zinc-700 mt-2" />}
                        </div>
                        <div className="pt-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">Statut : {statusFr(log.status)}</p>
                          <p className="text-xs text-gray-600 dark:text-zinc-400">{new Date(log.created_at).toLocaleString('fr-FR')}</p>
                          {log.note && <p className="text-xs text-gray-500 italic mt-1">{log.note}</p>}
                          {log.admin_id && <p className="text-xs text-amber-600 mt-1">Par : {log.admin_id.name}</p>}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <Separator className="bg-gray-200 dark:bg-zinc-800" />

              <IntigoShippingPanel
                orderId={order._id}
                orderStatus={order.status}
                deliveryMethod={order.delivery_method}
                shippingAddress={order.shipping_address}
                intigo={order.intigo}
                onShipped={refresh}
              />

              <Separator className="bg-gray-200 dark:bg-zinc-800" />

              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase mb-2">Mettre à jour</p>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ajouter une note interne..." rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm mb-2 bg-transparent" />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => handleStatusUpdate('shipped')}>Marquer expédié</Button>
                  <Button size="sm" variant="outline" onClick={() => handleStatusUpdate('delivered')}>Marquer livré</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate('cancelled')}>Annuler</Button>
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
  const [exportToast, setExportToast] = useState<string | null>(null);


  // Centralised fetch call — always includes delivery filter
  const doFetch = useCallback((overrides: Record<string, any> = {}) => {
    fetchOrders({
      page,
      limit: 10,
      status: statusFilter,
      delivery_method: deliveryFilter,
      searchTerm: searchTerm.trim() || undefined,
      ...overrides,
    });
  }, [fetchOrders, page, statusFilter, deliveryFilter, searchTerm]);

  // Debounced re-fetch on any filter change
  useEffect(() => {
    const t = setTimeout(() => doFetch(), 400);
    return () => clearTimeout(t);
  }, [searchTerm, statusFilter, deliveryFilter, page, doFetch]);

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
    if (!window.confirm(`Marquer ${selectedOrders.size} commande(s) comme "${statusFr(newStatus)}" ?`)) return;
    setIsBulkUpdating(true);
    try {
      await Promise.all(Array.from(selectedOrders).map(id =>
        updateOrderStatus(id, newStatus, `Mise à jour groupée → ${statusFr(newStatus)}`)));
      setSelectedOrders(new Set());
      doFetch();
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
  const selectedOrderObjects = orders.filter(o => selectedOrders.has(o._id));
  if (selectedOrderObjects.length === 0) return;
 
  await exportIntigoExcel(selectedOrderObjects, (result) => {
    // Build a human-readable summary
    const parts: string[] = [];
    if (result.exported > 0)   parts.push(`${result.exported} colis exporté${result.exported > 1 ? 's' : ''}`);
    if (result.markedInDB > 0) parts.push(`${result.markedInDB} commande${result.markedInDB > 1 ? 's' : ''} mise${result.markedInDB > 1 ? 's' : ''} à jour`);
    if (result.skipped > 0)    parts.push(`${result.skipped} ignorée${result.skipped > 1 ? 's' : ''} (déjà expédiées)`);
 
    setExportToast(parts.join(' · '));
    setTimeout(() => setExportToast(null), 5000);
 
    // Deselect and refresh so the table shows updated statuses
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

  return (
    <div className="space-y-6 pb-24 relative">

      {/* Status KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {([
          { label: 'En attente', key: 'pending',   color: 'text-yellow-600' },
          { label: 'Imprimés',   key: 'printed',   color: 'text-blue-600'   },
          { label: 'Expédiés',   key: 'shipped',   color: 'text-purple-600' },
          { label: 'Livrés',     key: 'delivered', color: 'text-green-600'  },
        ] as const).map(({ label, key, color }) => (
          <Card key={key} className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
            <CardContent className="p-4">
              <p className={`text-xs font-medium ${color} mb-1 uppercase tracking-wider`}>{label}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{(stats as any)[key] ?? 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delivery stats card — clickable, acts as filter */}
      <DeliveryStatsCard
        stats={stats}
        deliveryFilter={deliveryFilter}
        onFilterChange={handleDeliveryFilterChange}
      />

      {/* Filters row */}
      <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 flex items-center gap-2 bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-600" />
            <input
              type="text"
              placeholder="Rechercher par nom, téléphone, ID ou NID Intigo..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>

          {/* Status filter */}
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

          {/* Delivery method filter */}
          <div className="w-full sm:w-48">
            <Select value={deliveryFilter} onValueChange={(v) => { handleDeliveryFilterChange(v as DeliveryFilter); }}>
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

          <Button variant="outline" onClick={resetFilters}>
            <Filter className="w-4 h-4 mr-2" />Réinitialiser
          </Button>
        </CardContent>
      </Card>

      {/* Orders table */}
      <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <CardContent className="p-4">
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden relative min-h-[300px]">
            {(isLoading || isBulkUpdating) && (
              <div className="absolute inset-0 bg-white/50 dark:bg-black/50 z-10 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
              </div>
            )}
            <Table>
              <TableHeader className="bg-gray-50 dark:bg-zinc-900/50">
                <TableRow>
                  <TableHead className="w-8 px-4 py-3">
                    <Checkbox checked={selectedOrders.size === orders.length && orders.length > 0} onCheckedChange={handleSelectAll} />
                  </TableHead>
                  <TableHead className="text-xs font-semibold">N° Commande</TableHead>
                  <TableHead className="text-xs font-semibold">Client</TableHead>
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-xs font-semibold">Statut</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 && !isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">Aucune commande trouvée.</TableCell>
                  </TableRow>
                ) : orders.map((order) => {
                  const isIntigoApi   = order.delivery_method === 'intigo' && !!order.intigo?.nid;
                  const isIntigoExcel = order.delivery_method === 'intigo' && !order.intigo?.nid;

                  return (
                    <TableRow
                      key={order._id}
                      className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900/50 ${selectedOrders.has(order._id) ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}
                      onClick={() => handleSelectOrder(order._id)}
                    >
                      <TableCell className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selectedOrders.has(order._id)} onCheckedChange={() => handleSelectOrder(order._id)} />
                      </TableCell>
                      <TableCell
                        className="text-sm font-medium text-amber-600 hover:underline py-3"
                        onClick={(e) => { e.stopPropagation(); handleOpenDetails(order._id); }}
                      >
                        #{order._id?.substring(order._id.length - 6).toUpperCase()}
                      </TableCell>
                      <TableCell className="text-sm py-3">
                        {order.customer?.first_name ?? 'Client'} {order.customer?.last_name ?? ''}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-zinc-400 py-3">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                      </TableCell>
                      <TableCell className="py-3">
                        {/* Internal status badge */}
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={order.status} />
                          {/* Intigo sub-status */}
                          {isIntigoApi && (
                            <IntigoStatusChip
                              label={order.intigo?.status_label}
                              eventType={order.intigo?.event_type ?? undefined}
                            />
                          )}
                          {isIntigoExcel && <IntigoStatusChip isExcel />}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold py-3">
                        DT{(order.total_amount ?? 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600 dark:text-zinc-400">
            <span>Total : {totalOrders} commande{totalOrders !== 1 ? 's' : ''}</span>
            <div className="flex gap-2 items-center">
              <Button variant="outline" size="sm" disabled={pagination.currentPage <= 1 || isLoading} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span>Page {pagination.currentPage} / {pagination.totalPages}</span>
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
        fetchOrders={fetchOrders}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        deliveryFilter={deliveryFilter}
        page={page}
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
       {exportToast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-emerald-600 text-white text-sm font-medium px-5 py-3 rounded-lg shadow-xl animate-in slide-in-from-bottom-4">
          <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
          {exportToast}
        </div>
      )}
    </div>
    
  );
  
};