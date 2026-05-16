'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { generateInvoicePDF } from '@/lib/generateShippingLabel';
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
  Copy, Check, Phone, X,
} from 'lucide-react';
import { useOrders, Order, OrderHistoryLog, DeliveryFilter, OrderStats } from '@/hooks/useOrders';

const LANG: 'fr' | 'en' = 'fr';

function t(field: { en?: string; fr?: string } | string | null | undefined): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[LANG] || field.en || field.fr || '';
}

const statusFr = (s: string) =>
  ({ pending: 'En attente', printed: 'Imprimé', shipped: 'Expédié', delivered: 'Livré', cancelled: 'Annulé' } as Record<string, string>)[s] ?? s;

// ─── CopyChip ─────────────────────────────────────────────────────────────────

const CopyChip: React.FC<{ text: string; label?: string }> = ({ text, label }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      title={`Copy ${label ?? text}`}
      className={`
        inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium
        transition-all duration-150 select-none flex-shrink-0
        ${copied
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:bg-zinc-800 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-300'
        }
      `}
    >
      {copied
        ? <><Check className="w-2.5 h-2.5" /> Copied</>
        : <Copy className="w-2.5 h-2.5" />
      }
    </button>
  );
};

const CustomerAvatar = ({ firstName, lastName }: { firstName?: string; lastName?: string }) => {
  const initials = `${(firstName?.[0] ?? '').toUpperCase()}${(lastName?.[0] ?? '').toUpperCase()}` || '?';
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

function isIntigoExcelOrder(order: Pick<Order, 'delivery_method' | 'intigo'>): boolean {
  return (
    order.delivery_method === 'intigo' &&
    !order.intigo?.nid &&
    (order.intigo?.event_type === 'excel_dispatched' || !!order.intigo?.shipped_at)
  );
}

const IntigoStatusChip = ({
  isApi, isPending, nid, label, eventType, isExcel,
}: {
  isApi?:     boolean;
  isPending?: boolean;
  nid?:       string | null;
  label?:     string | null;
  eventType?: string | null;
  isExcel?:   boolean;
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
  if (isPending) {
    return (
      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800/50">
        <Truck className="w-2.5 h-2.5 flex-shrink-0" />
        Intigo · À expédier
      </span>
    );
  }
  return null;
};

// ─── Delivery Stats Card ──────────────────────────────────────────────────────
// FIX: was grid-cols-2 sm:grid-cols-4 → now single scrollable row on mobile
// so each stat card stays readable at any width.

const DeliveryStatsCard = ({
  stats, deliveryFilter, onFilterChange,
}: {
  stats: OrderStats;
  deliveryFilter: DeliveryFilter;
  onFilterChange: (v: DeliveryFilter) => void;
}) => {
  const items: {
    key: DeliveryFilter; label: string; sublabel: string; count: number;
    icon: React.ElementType; color: string; activeBg: string;
  }[] = [
    { key: 'self',         label: 'Auto-livraison', sublabel: 'Sans Intigo',    count: stats.delivery.self,         icon: CheckCircle, color: 'text-gray-600 dark:text-zinc-400',       activeBg: 'bg-gray-100 dark:bg-zinc-800 ring-1 ring-gray-300 dark:ring-zinc-600'            },
    { key: 'intigo',       label: 'Intigo (total)', sublabel: 'API + Excel',    count: stats.delivery.intigo,       icon: Truck,       color: 'text-violet-600 dark:text-violet-400',   activeBg: 'bg-violet-50 dark:bg-violet-950/30 ring-1 ring-violet-300 dark:ring-violet-700'  },
    { key: 'intigo_api',   label: 'Intigo API',     sublabel: 'Avec NID',       count: stats.delivery.intigo_api,   icon: Truck,       color: 'text-indigo-600 dark:text-indigo-400',   activeBg: 'bg-indigo-50 dark:bg-indigo-950/30 ring-1 ring-indigo-300 dark:ring-indigo-700'  },
    { key: 'intigo_excel', label: 'Intigo Excel',   sublabel: 'Sans suivi API', count: stats.delivery.intigo_excel, icon: Package,     color: 'text-emerald-600 dark:text-emerald-400', activeBg: 'bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-300 dark:ring-emerald-700' },
  ];

  return (
    <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-widest">
            Mode de livraison
          </p>
          {deliveryFilter !== 'all' && (
            <button onClick={() => onFilterChange('all')} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 underline underline-offset-2">
              Tout afficher
            </button>
          )}
        </div>

        {/* Horizontal scroll row on mobile, 4-col grid on sm+ */}
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 sm:grid sm:grid-cols-4 -mx-3 px-3 sm:mx-0 sm:px-0">
          {items.map(({ key, label, sublabel, count, icon: Icon, color, activeBg }) => {
            const isActive = deliveryFilter === key;
            return (
              <button
                key={key}
                onClick={() => onFilterChange(isActive ? 'all' : key)}
                className={`
                  flex-shrink-0 w-36 sm:w-auto
                  flex items-start gap-2.5 p-3 rounded-xl text-left transition-all duration-150
                  ${isActive ? activeBg : 'hover:bg-gray-50 dark:hover:bg-zinc-800/60'}
                `}
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

// ─── Bulk Action Bar ──────────────────────────────────────────────────────────
// FIX: was a single flex row that overflowed → now icon-only on mobile with
// a scrollable row, labels appear on sm+.

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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-xl animate-in slide-in-from-bottom-10 duration-200">
      <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl shadow-2xl px-3 py-2.5">

        {/* Count badge */}
        <span className="flex items-center justify-center min-w-[2rem] h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold px-2 flex-shrink-0">
          {selectedCount}
        </span>

        <Separator orientation="vertical" className="bg-gray-200 dark:bg-zinc-700 h-5 mx-1 flex-shrink-0" />

        {/* Action buttons — scrollable on very small screens */}
        <div className="flex items-center gap-0.5 overflow-x-auto flex-1 min-w-0">
          <BulkBtn disabled={isUpdating || isPrinting} onClick={onPrintInvoices}
            icon={isPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            label="Factures" color="amber" />
          <BulkBtn disabled={isUpdating} onClick={onExportIntigo}
            icon={<FileDown className="w-3.5 h-3.5" />} label="Intigo" color="emerald" />
          <BulkBtn disabled={isUpdating} onClick={() => onAction('printed')}
            icon={<Printer className="w-3.5 h-3.5" />} label="Imprimé" color="blue" />
          <BulkBtn disabled={isUpdating} onClick={() => onAction('shipped')}
            icon={<Truck className="w-3.5 h-3.5" />} label="Expédié" color="violet" />
          <BulkBtn disabled={isUpdating} onClick={() => onAction('delivered')}
            icon={<CheckCircle className="w-3.5 h-3.5" />} label="Livré" color="green" />
          <BulkBtn disabled={isUpdating} onClick={() => onAction('cancelled')}
            icon={<RotateCcw className="w-3.5 h-3.5" />} label="Annuler" color="red" />
        </div>

        <Separator orientation="vertical" className="bg-gray-200 dark:bg-zinc-700 h-5 mx-1 flex-shrink-0" />

        {/* Close */}
        <button
          disabled={isUpdating}
          onClick={onClose}
          className="w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-600 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

const BulkBtn = ({ disabled, onClick, icon, label, color }: {
  disabled: boolean; onClick: () => void; icon: React.ReactNode; label: string;
  color: 'amber' | 'emerald' | 'blue' | 'violet' | 'green' | 'red';
}) => {
  const colors = {
    amber:   'text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20',
    emerald: 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20',
    blue:    'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20',
    violet:  'text-violet-600 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/20',
    green:   'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20',
    red:     'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20',
  };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      title={label}
      className={`
        flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold
        transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0
        ${colors[color]}
      `}
    >
      {icon}
      {/* Label: hidden on xs, visible on sm+ */}
      <span className="hidden sm:block">{label}</span>
    </button>
  );
};

// ─── Order Details Sheet ──────────────────────────────────────────────────────
// FIX: added overscroll-contain + touch-action on scroll area; tightened
// mobile padding; sheet is full-width on mobile (default sm:max-w-2xl kept).

const OrderDetailsSheet: React.FC<{
  selectedData:     { order: Order; history: OrderHistoryLog[] } | null;
  open:             boolean;
  onOpenChange:     (open: boolean) => void;
  isLoadingDetails: boolean;
  onUpdateStatus:   (id: string, status: string, note?: string) => Promise<boolean>;
  onAddNote:        (id: string, note: string) => Promise<boolean>;
  onRefresh:        () => void;
  onShipRefresh:    () => void;
  orders:           Order[];
  currentOrderId:   string | null;
  onNavigate:       (orderId: string) => void;
}> = ({
  selectedData, open, onOpenChange, isLoadingDetails,
  onUpdateStatus, onAddNote, onRefresh, onShipRefresh,
  orders, currentOrderId, onNavigate,
}) => {
  const [notes, setNotes]                       = useState('');
  const [isPrinting, setIsPrinting]             = useState(false);
  const [showPrintConfirm, setShowPrintConfirm] = useState(false);

  const order   = selectedData?.order;
  const history = selectedData?.history ?? [];

  const currentIndex = orders.findIndex(o => o._id === currentOrderId);
  const hasPrev      = currentIndex > 0;
  const hasNext      = currentIndex < orders.length - 1;

  const goTo = (delta: -1 | 1) => {
    const next = orders[currentIndex + delta];
    if (next) {
      setNotes('');
      setShowPrintConfirm(false);
      onNavigate(next._id);
    }
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft'  && hasPrev) goTo(-1);
      if (e.key === 'ArrowRight' && hasNext) goTo(1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, hasPrev, hasNext, currentIndex]); // eslint-disable-line

  useEffect(() => { setNotes(''); setShowPrintConfirm(false); }, [order?._id]);

  const handleStatusUpdate = async (status: string, defaultNote?: string) => {
    if (!order) return;
    const ok = await onUpdateStatus(order._id, status, notes || defaultNote);
    if (ok) { setNotes(''); onRefresh(); }
  };

  const handleSheetClose = (isOpen: boolean) => {
    if (!isOpen && order && notes.trim()) onAddNote(order._id, notes);
    setShowPrintConfirm(false);
    onOpenChange(isOpen);
  };

  const handlePrintConfirm = async () => {
    if (!order) return;
    setShowPrintConfirm(false);
    setIsPrinting(true);
    try {
      await generateInvoicePDF([order]);
      if (order.status === 'pending') {
        await handleStatusUpdate('printed', 'Facture PDF générée');
      }
    } finally {
      setIsPrinting(false);
    }
  };

  const isIntigoApi     = order?.delivery_method === 'intigo' && !!order.intigo?.nid;
  const isIntigoExcel   = order ? isIntigoExcelOrder(order) : false;
  const isIntigoPending = order?.delivery_method === 'intigo' && !isIntigoApi && !isIntigoExcel;

  return (
    <Sheet open={open} onOpenChange={handleSheetClose}>
      {/*
        FIX: removed fixed h-full and relied on Sheet's default.
        Added w-full so it takes full width on mobile.
        sm:max-w-2xl keeps the desktop cap.
      */}
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
            {/* ── Sticky sheet header ── */}
            <div className="sticky top-0 z-10 bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 px-4 py-3">

              {/* Top row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CustomerAvatar firstName={order.customer?.first_name} lastName={order.customer?.last_name} />
                  <div className="min-w-0">
                    <h2 className="text-gray-900 dark:text-white text-sm font-bold leading-tight truncate">
                      {order.customer?.first_name ?? 'Client'} {order.customer?.last_name ?? ''}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-zinc-500 font-mono">
                        <Hash className="w-3 h-3" />
                        {order._id?.substring(order._id.length - 6).toUpperCase()}
                      </span>
                      <span className="text-gray-300 dark:text-zinc-700 hidden xs:inline">·</span>
                      <span className="hidden xs:flex items-center gap-1 text-[10px] text-gray-400 dark:text-zinc-500">
                        <Calendar className="w-3 h-3" />
                        {order.created_at ? new Date(order.created_at).toLocaleString('fr-FR') : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Print button */}
                  {!showPrintConfirm ? (
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setShowPrintConfirm(true)}
                      disabled={isPrinting}
                      className="flex items-center gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700/50 dark:text-amber-400 dark:hover:bg-amber-900/20 h-8 px-2.5"
                    >
                      {isPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                      <span className="hidden sm:block text-xs">{isPrinting ? 'Génération...' : 'Facture PDF'}</span>
                    </Button>
                  ) : (
                    <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg px-2 py-1">
                      <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium hidden sm:block">
                        {order.status === 'pending' ? 'Imprimer et marquer imprimé ?' : 'Imprimer ?'}
                      </span>
                      <button onClick={handlePrintConfirm} className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white">✓</button>
                      <button onClick={() => setShowPrintConfirm(false)} className="px-1.5 py-0.5 rounded text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800">✕</button>
                    </div>
                  )}

                  {/* Prev / Next */}
                  <div className="flex items-center gap-0 border border-gray-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => goTo(-1)}
                      disabled={!hasPrev}
                      title="Précédent (←)"
                      className="w-8 h-8 flex items-center justify-center text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-1.5 text-[10px] tabular-nums text-gray-400 dark:text-zinc-500 select-none border-x border-gray-200 dark:border-zinc-700 h-8 flex items-center">
                      {currentIndex + 1}/{orders.length}
                    </span>
                    <button
                      onClick={() => goTo(1)}
                      disabled={!hasNext}
                      title="Suivant (→)"
                      className="w-8 h-8 flex items-center justify-center text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <button
  onClick={() => handleSheetClose(false)}
  className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors flex-shrink-0"
  aria-label="Fermer"
>
  <X className="w-4 h-4" />
</button>
              </div>

              {/* Status pills */}
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <StatusBadge status={order.status} />
                {isIntigoApi && (
                  <IntigoStatusChip isApi nid={order.intigo?.nid} label={order.intigo?.status_label} eventType={order.intigo?.event_type} />
                )}
                {isIntigoExcel   && <IntigoStatusChip isExcel />}
                {isIntigoPending && <IntigoStatusChip isPending />}
                {order.delivery_method === 'self' && (
                  <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-zinc-500">
                    <CheckCircle className="w-3 h-3" /> Auto-livraison
                  </span>
                )}
              </div>
            </div>

            {/* ── Scrollable body ── */}
            {/* FIX: overscroll-contain prevents scroll chaining on iOS;
                    touch-pan-y lets swipe-to-scroll work naturally */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 space-y-5"
                 style={{ WebkitOverflowScrolling: 'touch' }}>

              {/* Customer + Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest">Contact</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {order.customer?.first_name ?? 'Client'} {order.customer?.last_name ?? ''}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs text-gray-500 dark:text-zinc-400">{order.customer?.phone ?? '—'}</p>
                    {order.customer?.phone && <CopyChip text={order.customer.phone} label="phone" />}
                  </div>
                  {order.customer?.email && (
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs text-gray-400 dark:text-zinc-500 truncate">{order.customer.email}</p>
                      <CopyChip text={order.customer.email} label="email" />
                    </div>
                  )}
                </div>
                <div className="space-y-1.5 sm:border-l sm:border-gray-100 sm:dark:border-zinc-800 sm:pl-4">
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
                  {(order.shipping_address?.street || order.shipping_address?.governorate) && (
                    <CopyChip
                      text={[
                        order.shipping_address?.street,
                        order.shipping_address?.district,
                        order.shipping_address?.governorate ?? (order.shipping_address as any)?.state,
                      ].filter(Boolean).join(', ')}
                      label="address"
                    />
                  )}
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
                        <TableHead className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 text-center py-2.5 w-12">Qté</TableHead>
                        <TableHead className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 text-right py-2.5">Prix</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(!order.items || order.items.length === 0) ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-sm text-gray-400">Aucun article.</TableCell>
                        </TableRow>
                      ) : order.items.map((item, idx) => (
                        <TableRow key={item._id ?? idx} className="border-b border-gray-100 dark:border-zinc-800/60 last:border-0">
                          <TableCell className="px-3 py-3">
                            {item.pack ? (
                              <div>
                                <p className="text-xs font-semibold text-gray-900 dark:text-white">📦 {t(item.pack.name)}</p>
                                <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">Pack groupé</p>
                              </div>
                            ) : (
                              <div>
                                <p className="text-xs font-semibold text-gray-900 dark:text-white">{t(item.product?.name) || 'Produit'}</p>
                                <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-0.5">Flacon : {item.bottle?.name ?? 'N/A'}</p>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-sm font-medium text-gray-700 dark:text-zinc-300">{item.quantity}</TableCell>
                          <TableCell className="text-right text-sm font-semibold text-gray-900 dark:text-white pr-3 whitespace-nowrap">
                            DT{(item.price_at_purchase ?? 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-3 flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-zinc-900/60 rounded-xl border border-gray-100 dark:border-zinc-800">
                  <span className="text-sm font-semibold text-gray-500 dark:text-zinc-400">Total commande</span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">DT{(order.total_amount ?? 0).toFixed(2)}</span>
                </div>
              </div>

              <Separator className="bg-gray-100 dark:bg-zinc-800" />

              {/* Timeline */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-4">Historique</p>
                <div className="space-y-3">
                  {history.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-zinc-500 italic">Aucun historique.</p>
                  ) : history.map((log, index) => {
                    const isCancelled = log.status === 'cancelled';
                    return (
                      <div key={log._id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isCancelled ? 'bg-red-50 border-red-400 text-red-500 dark:bg-red-950/30 dark:border-red-600' : 'bg-blue-50 border-blue-400 text-blue-500 dark:bg-blue-950/30 dark:border-blue-600'}`}>
                            {isCancelled ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </div>
                          {index < history.length - 1 && <div className="w-px flex-1 bg-gray-200 dark:bg-zinc-700 mt-1 min-h-[1.5rem]" />}
                        </div>
                        <div className="pb-3 min-w-0">
                          <p className="text-xs font-semibold text-gray-900 dark:text-white">{statusFr(log.status)}</p>
                          <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">{new Date(log.created_at).toLocaleString('fr-FR')}</p>
                          {log.note && <p className="text-[11px] text-gray-500 dark:text-zinc-400 italic mt-1 bg-gray-50 dark:bg-zinc-900 rounded px-2 py-1">{log.note}</p>}
                          {log.admin_id && <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">Par : {log.admin_id.name}</p>}
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
                <p className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Mettre à jour</p>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Ajouter une note interne (optionnel)…"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm mb-3 bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 dark:focus:border-amber-600 resize-none transition"
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => handleStatusUpdate('shipped')} className="bg-violet-600 hover:bg-violet-700 text-white">
                    <Truck className="w-3.5 h-3.5 mr-1.5" /> Marquer expédié
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleStatusUpdate('delivered')} className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20">
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Marquer livré
                  </Button>
                  {(order.delivery_method !== 'intigo' || !order.intigo?.nid) && (
                    <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate('cancelled')}>
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Annuler
                    </Button>
                  )}
                  {order.delivery_method === 'intigo' && order.intigo?.nid && (
                    <a href="https://app.intigo.net" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 mt-1 self-center">
                      <ExternalLink className="w-3 h-3" />
                      Gérer via dashboard Intigo
                    </a>
                  )}
                </div>
              </div>

              {/* Bottom padding so content clears the bulk bar on mobile */}
              <div className="h-4" />
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
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
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
    const timer = setTimeout(() => doFetch(), 400);
    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter, deliveryFilter, page, doFetch]);

  const handleShipRefresh = useCallback(() => {
    setStatusFilter('all');
    setPage(1);
    fetchOrders({ page: 1, limit: 10, status: 'all', delivery_method: deliveryFilter, searchTerm: searchTerm.trim() || undefined });
  }, [fetchOrders, deliveryFilter, searchTerm]);

  const handleDeliveryFilterChange = (val: DeliveryFilter) => { setDeliveryFilter(val); setPage(1); };
  const handleSelectOrder  = (id: string) => { const s = new Set(selectedOrders); s.has(id) ? s.delete(id) : s.add(id); setSelectedOrders(s); };
  const handleSelectAll    = () => setSelectedOrders(selectedOrders.size === orders.length ? new Set() : new Set(orders.map(o => o._id)));

  const handleOpenDetails = async (id: string) => {
    setCurrentOrderId(id);
    setSheetOpen(true);
    await fetchOrderDetails(id);
  };

  const handleNavigate = async (orderId: string) => {
    setCurrentOrderId(orderId);
    await fetchOrderDetails(orderId);
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
    await exportIntigoExcel(selected, result => {
      const parts: string[] = [];
      if (result.exported  > 0) parts.push(`${result.exported} colis exporté${result.exported > 1 ? 's' : ''}`);
      if (result.markedInDB > 0) parts.push(`${result.markedInDB} commande${result.markedInDB > 1 ? 's' : ''} mise${result.markedInDB > 1 ? 's' : ''} à jour`);
      if (result.skipped   > 0) parts.push(`${result.skipped} ignorée${result.skipped > 1 ? 's' : ''} (déjà expédiées)`);
      setExportToast(parts.join(' · '));
      setTimeout(() => setExportToast(null), 5000);
      setSelectedOrders(new Set());
      doFetch();
    });
  };

  const resetFilters = () => { setSearchTerm(''); setStatusFilter('all'); setDeliveryFilter('all'); setPage(1); };

  // ── Status KPI cards ──────────────────────────────────────────────────────

  const statusKpis = [
    { label: 'En attente', key: 'pending',   color: 'text-amber-600 dark:text-amber-500',    bg: 'bg-amber-50 dark:bg-amber-950/20',    border: 'border-amber-200 dark:border-amber-800/30'    },
    { label: 'Imprimés',   key: 'printed',   color: 'text-blue-600 dark:text-blue-500',      bg: 'bg-blue-50 dark:bg-blue-950/20',      border: 'border-blue-200 dark:border-blue-800/30'      },
    { label: 'Expédiés',   key: 'shipped',   color: 'text-violet-600 dark:text-violet-500',  bg: 'bg-violet-50 dark:bg-violet-950/20',  border: 'border-violet-200 dark:border-violet-800/30'  },
    { label: 'Livrés',     key: 'delivered', color: 'text-emerald-600 dark:text-emerald-500',bg: 'bg-emerald-50 dark:bg-emerald-950/20',border: 'border-emerald-200 dark:border-emerald-800/30'},
  ] as const;

  return (
    <div className="space-y-4 pb-28 relative">

      {/* ── Status KPI cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        {statusKpis.map(({ label, key, color, bg, border }) => (
          <button
            key={key}
            onClick={() => { setStatusFilter(statusFilter === key ? 'all' : key); setPage(1); }}
            className={`text-left p-3 sm:p-4 rounded-xl border transition-all duration-150 ${statusFilter === key ? `${bg} ${border} ring-1 ring-inset ${border}` : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/60'}`}
          >
            <p className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-widest mb-1 ${color}`}>{label}</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tabular-nums">{(stats as any)[key] ?? 0}</p>
          </button>
        ))}
      </div>

      {/* ── Delivery stats ── */}
      <DeliveryStatsCard stats={stats} deliveryFilter={deliveryFilter} onFilterChange={handleDeliveryFilterChange} />

      {/* ── Filters ── */}
      <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <CardContent className="p-3 sm:p-4 flex flex-col gap-2 sm:gap-3">
          {/* Search — full width on all sizes */}
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-amber-400/30 focus-within:border-amber-400 transition">
            <Search className="w-4 h-4 text-gray-400 dark:text-zinc-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Rechercher par nom, téléphone, ID…"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              className="flex-1 bg-transparent text-sm outline-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-600"
            />
          </div>

          {/* Status + Delivery + Reset — row that wraps gracefully */}
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[130px]">
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Statut" /></SelectTrigger>
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
            <div className="flex-1 min-w-[130px]">
              <Select value={deliveryFilter} onValueChange={v => handleDeliveryFilterChange(v as DeliveryFilter)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Livraison" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes livraisons</SelectItem>
                  <SelectItem value="self">Auto-livraison</SelectItem>
                  <SelectItem value="intigo">Intigo (tout)</SelectItem>
                  <SelectItem value="intigo_api">Intigo API</SelectItem>
                  <SelectItem value="intigo_excel">Intigo Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={resetFilters} className="h-9 px-3 flex-shrink-0">
              <Filter className="w-4 h-4" />
              <span className="hidden sm:block ml-1.5">Réinitialiser</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Orders table ── */}
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

            {/* Horizontally scrollable on mobile */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 dark:bg-zinc-900/80 border-b border-gray-200 dark:border-zinc-800">
                  <TableRow>
                    <TableHead className="w-10 px-3 py-3">
                      <Checkbox checked={selectedOrders.size === orders.length && orders.length > 0} onCheckedChange={handleSelectAll} />
                    </TableHead>
                    {/* N° — always visible */}
                    <TableHead className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider py-3 px-2">N°</TableHead>
                    {/* Client — always visible */}
                    <TableHead className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider py-3">Client</TableHead>
                    {/* FIX: Date was hidden sm — now shown on all, but compact */}
                    <TableHead className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider py-3 whitespace-nowrap">Date</TableHead>
                    {/* Status — always visible */}
                    <TableHead className="text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider py-3">Statut</TableHead>
                    {/* Total — always visible */}
                    <TableHead className="text-right text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider py-3 pr-3">Total</TableHead>
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
                  ) : orders.map(order => {
                    const isIntigoApi     = order.delivery_method === 'intigo' && !!order.intigo?.nid;
                    const isIntigoExcel   = isIntigoExcelOrder(order);
                    const isIntigoPending = order.delivery_method === 'intigo' && !isIntigoApi && !isIntigoExcel;
                    const isSelected      = selectedOrders.has(order._id);

                    return (
                      <TableRow
                        key={order._id}
                        className={`group border-b border-gray-100 dark:border-zinc-800/60 cursor-pointer transition-colors duration-100 ${isSelected ? 'bg-amber-50/60 dark:bg-amber-900/10' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/40'}`}
                        onClick={() => handleSelectOrder(order._id)}
                      >
                        {/* Checkbox */}
                        <TableCell className="px-3 py-3" onClick={e => e.stopPropagation()}>
                          <Checkbox checked={isSelected} onCheckedChange={() => handleSelectOrder(order._id)} />
                        </TableCell>

                        {/* Order ID */}
                        <TableCell className="py-3 px-2" onClick={e => { e.stopPropagation(); handleOpenDetails(order._id); }}>
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline underline-offset-2 font-mono whitespace-nowrap">
                            #{order._id?.substring(order._id.length - 6).toUpperCase()}
                          </span>
                        </TableCell>

                        {/* Customer — name + phone on two lines */}
                        <TableCell className="py-3">
                          <div className="flex items-center gap-2">
                            <CustomerAvatar firstName={order.customer?.first_name} lastName={order.customer?.last_name} />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-900 dark:text-white truncate max-w-[100px] sm:max-w-[140px]">
                                {order.customer?.first_name ?? ''} {order.customer?.last_name ?? ''}
                              </p>
                              {order.customer?.phone && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <p className="text-[10px] text-gray-400 dark:text-zinc-500 truncate">
                                    {order.customer.phone}
                                  </p>
                                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <CopyChip text={order.customer.phone} label="phone" />
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* FIX: Date — was hidden sm:table-cell, now always shown, compact format */}
                        <TableCell className="py-3 whitespace-nowrap">
                          <span className="text-[10px] text-gray-500 dark:text-zinc-400">
                            {order.created_at
                              ? new Date(order.created_at).toLocaleDateString('fr-FR', {
                                  day: '2-digit', month: '2-digit',
                                  // show year only on sm+
                                }).replace(/\//g, '/')
                              : '—'}
                          </span>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="py-3">
                          <div className="flex flex-col gap-1">
                            <StatusBadge status={order.status} />
                            {isIntigoApi     && <IntigoStatusChip isApi nid={order.intigo?.nid} label={order.intigo?.status_label} eventType={order.intigo?.event_type ?? undefined} />}
                            {isIntigoExcel   && <IntigoStatusChip isExcel />}
                            {isIntigoPending && <IntigoStatusChip isPending />}
                          </div>
                        </TableCell>

                        {/* Total */}
                        <TableCell className="text-right py-3 pr-3">
                          <span className="text-xs font-bold text-gray-900 dark:text-white tabular-nums whitespace-nowrap">
                            DT{(order.total_amount ?? 0).toFixed(2)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-t border-gray-100 dark:border-zinc-800">
            <span className="text-xs text-gray-400 dark:text-zinc-500">
              {totalOrders} commande{totalOrders !== 1 ? 's' : ''}
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

      {/* ── Order Details Sheet ── */}
      <OrderDetailsSheet
        selectedData={selectedOrder}
        open={sheetOpen}
        onOpenChange={open => { setSheetOpen(open); if (!open) { setSelectedOrder(null); setCurrentOrderId(null); } }}
        isLoadingDetails={isLoading && sheetOpen}
        onUpdateStatus={updateOrderStatus}
        onAddNote={addOrderNote}
        onRefresh={doFetch}
        onShipRefresh={handleShipRefresh}
        orders={orders}
        currentOrderId={currentOrderId}
        onNavigate={handleNavigate}
      />

      {/* ── Bulk Action Bar ── */}
      <BulkActionBar
        selectedCount={selectedOrders.size}
        isUpdating={isBulkUpdating}
        isPrinting={isBulkPrinting}
        onClose={() => setSelectedOrders(new Set())}
        onAction={handleBulkAction}
        onPrintInvoices={handleBulkPrintInvoices}
        onExportIntigo={handleExportIntigo}
      />

      {/* ── Export toast ── */}
      {exportToast && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-emerald-600 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-xl animate-in slide-in-from-bottom-4 duration-200 max-w-[calc(100vw-2rem)] text-center">
          <FileSpreadsheet className="w-4 h-4 flex-shrink-0" />
          {exportToast}
        </div>
      )}
    </div>
  );
};