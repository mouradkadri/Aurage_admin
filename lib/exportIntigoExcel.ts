/**
 * exportIntigoExcel.ts
 * ────────────────────────────────────────────────────────────────────
 * Exports selected orders to Intigo's official Excel template, then
 * calls the backend to mark those orders as Excel-dispatched so the
 * admin UI reflects the correct status.
 *
 * Full replacement for lib/exportIntigoExcel.ts
 * ────────────────────────────────────────────────────────────────────
 */

import ExcelJS from 'exceljs';
import { Order } from '@/hooks/useOrders';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExcelExportResult {
  exported:    number;
  markedInDB:  number;
  skipped:     number;
  errors:      string[];
}

// ─── Column definitions (Intigo official template) ────────────────────────────

const REQUIRED_COLS = [
  'nom_destinataire',
  'telephone',
  'telephone2',
  'adresse',
  'ville',
  'district',
  'quartier',
  'montant',
  'taille_colis',
  'ouvrir_colis',
  'description_produit',
  'info_supplementaire',
] as const;

const REQUIRED_BLUE  = new Set(['nom_destinataire', 'telephone', 'adresse', 'ville', 'district', 'montant']);
const HEADER_BLUE    = { argb: 'FF2563EB' } as const;
const HEADER_DARK    = { argb: 'FF1E293B' } as const;
const HEADER_WHITE   = { argb: 'FFFFFFFF' } as const;

// ─── Build a row from an Order ────────────────────────────────────────────────

function resolveN(f: any): string {
  if (!f) return '';
  if (typeof f === 'string') return f;
  return f.fr || f.en || '';
}

function buildItemLabel(order: Order): string {
  const first = order.items?.[0];
  if (!first) return 'Article';
  const label = first.pack
    ? resolveN(first.pack.name)
    : resolveN(first.product?.name);
  const extra = (order.items?.length ?? 1) - 1;
  const suffix = extra > 0 ? ` +${extra} autre${extra > 1 ? 's' : ''}` : '';
  return `${label}${suffix} — ${order.total_amount.toFixed(2)} DT`;
}

function buildRow(order: Order): Record<string, string | number> {
  const c    = order.customer;
  const addr = order.shipping_address;

  const phone = (c?.phone ?? '').replace(/\D/g, '').slice(-8);

  return {
    nom_destinataire:    `${c?.first_name ?? ''} ${c?.last_name ?? ''}`.trim(),
    telephone:           phone,
    telephone2:          '',
    adresse:             addr?.street ?? '',
    ville:               addr?.governorate ?? addr?.city ?? '',
    district:            addr?.district ?? '',
    quartier:            '',
    montant:             Number(order.total_amount?.toFixed(3) ?? 0),
    taille_colis:        1,
    ouvrir_colis:        0,
    description_produit: buildItemLabel(order),
    info_supplementaire: `Aurage | ${new Date(order.created_at).toLocaleDateString('fr-FR')}`,
  };
}

// ─── Style helpers ────────────────────────────────────────────────────────────

function styleHeader(cell: ExcelJS.Cell, required: boolean) {
  cell.fill = {
    type:    'pattern',
    pattern: 'solid',
    fgColor: required ? HEADER_BLUE : HEADER_DARK,
  };
  cell.font      = { bold: true, color: HEADER_WHITE, size: 10 };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border    = {
    top:    { style: 'thin', color: { argb: 'FF94A3B8' } },
    left:   { style: 'thin', color: { argb: 'FF94A3B8' } },
    bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
    right:  { style: 'thin', color: { argb: 'FF94A3B8' } },
  };
}

function styleDataCell(cell: ExcelJS.Cell, rowIndex: number) {
  cell.fill = {
    type:    'pattern',
    pattern: 'solid',
    fgColor: { argb: rowIndex % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF' },
  };
  cell.font      = { size: 10 };
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
  cell.border    = {
    bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } },
    right:  { style: 'hair', color: { argb: 'FFE2E8F0' } },
  };
}

// ─── Core export ──────────────────────────────────────────────────────────────

async function buildWorkbook(orders: Order[]): Promise<ExcelJS.Workbook> {
  let wb: ExcelJS.Workbook;

  // Try loading the official template first
  try {
    const templateRes = await fetch('/template_colis.xlsx');
    if (!templateRes.ok) throw new Error('template not found');
    const buf = await templateRes.arrayBuffer();
    wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
  } catch {
    // Fall back to building from scratch
    wb = new ExcelJS.Workbook();
    wb.creator  = 'Aurage';
    wb.created  = new Date();
  }

 // Always work on the first sheet ("Colis")
  let ws = wb.getWorksheet('Colis') ?? wb.getWorksheet(1) ?? wb.addWorksheet('Colis');

  // Clear all existing rows so template sample data doesn't bleed through
  ws.spliceRows(1, ws.rowCount);

  // ── Header row ──────────────────────────────────────────────────────────
  ws.getRow(1).height = 32;
  REQUIRED_COLS.forEach((col, i) => {
    const cell = ws.getRow(1).getCell(i + 1);
    cell.value = col;
    styleHeader(cell, REQUIRED_BLUE.has(col as any));
  });

  // Set column widths
  const widths = [24, 14, 14, 32, 18, 18, 18, 12, 12, 12, 36, 28];
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  // ── Data rows ───────────────────────────────────────────────────────────
  orders.forEach((order, idx) => {
    const row     = buildRow(order);
    const rowNum  = idx + 2; // 1-indexed, row 1 is header
    const wsRow   = ws.getRow(rowNum);
    wsRow.height  = 20;

    REQUIRED_COLS.forEach((col, colIdx) => {
      const cell  = wsRow.getCell(colIdx + 1);
      cell.value  = row[col] ?? '';
      styleDataCell(cell, idx);
    });

    wsRow.commit();
  });

  // Freeze header row
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  return wb;
}

// ─── Trigger browser download ─────────────────────────────────────────────────

async function downloadExcel(wb: ExcelJS.Workbook, filename: string) {
  const buf  = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Mark orders in DB after export ──────────────────────────────────────────

async function markOrdersAsExcelDispatched(orderIds: string[]): Promise<{ updated: number; skipped: number }> {
  try {
    const res  = await fetch('/api/proxy/orders/intigo-excel-dispatch', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ orderIds }),
    });
    const data = await res.json();
    if (data.success) {
      return { updated: data.updated ?? 0, skipped: data.skipped ?? 0 };
    }
    return { updated: 0, skipped: orderIds.length };
  } catch (err) {
    console.error('[exportIntigoExcel] markOrdersAsExcelDispatched failed:', err);
    return { updated: 0, skipped: orderIds.length };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Export selected orders to Intigo Excel format and mark them in the DB.
 *
 * @param orders     Orders to export (already filtered by the caller)
 * @param onComplete Optional callback with the result summary
 */
export async function exportIntigoExcel(
  orders: Order[],
  onComplete?: (result: ExcelExportResult) => void,
): Promise<void> {
  if (orders.length === 0) return;

  const filename = `intigo-colis-${new Date().toISOString().split('T')[0]}-${orders.length}cmd.xlsx`;

  // 1. Build + download the Excel file
  const wb = await buildWorkbook(orders);
  await downloadExcel(wb, filename);

  // 2. Mark orders in DB — only pending/printed ones will actually update
  const orderIds = orders.map(o => o._id);
  const { updated, skipped } = await markOrdersAsExcelDispatched(orderIds);

  const errors: string[] = [];
  if (skipped > 0) {
    errors.push(`${skipped} commande(s) non mise(s) à jour (déjà expédiées/livrées/annulées).`);
  }

  onComplete?.({
    exported:   orders.length,
    markedInDB: updated,
    skipped,
    errors,
  });
}