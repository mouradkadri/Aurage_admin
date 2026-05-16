'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductFormDrawer } from './ProductFormDrawer';
import { BottleVariantFormDrawer } from './BottleVariantFormDrawer';
import { ConfirmDialog } from './ConfirmDialog';
import { StockAlertBanner } from './StockAlertBanner';
import { useStockAlerts } from '@/hooks/useStockAlerts';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Edit2, Trash2, Plus, ChevronLeft, ChevronRight,
  MoreVertical, Eye, Beaker, Cylinder, Check, X,
} from 'lucide-react';
import { useProducts, Product, BottleVariant } from '@/hooks/useProducts';
import { ProductDetailsModal } from './ProductDetailsModal';

// ─── Status badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({
  status,
}: {
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
}) => {
  const styles = {
    'in-stock':     'bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400',
    'low-stock':    'bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400',
    'out-of-stock': 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400',
  };
  // FIX: shorter labels so the badge fits narrow columns without wrapping
  const labels = {
    'in-stock':     'En stock',
    'low-stock':    'Bas',
    'out-of-stock': 'Épuisé',
  };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

// ─── Inline editable cell ─────────────────────────────────────────────────────
// FIX: wraps the tappable value in a min-h-[44px] min-w-[44px] touch target
// and shows a compact save/cancel inline so the user doesn't lose context.

interface InlineEditCellProps {
  value: number;
  suffix: string;
  isEditing: boolean;
  editValue: string;
  onStartEdit: () => void;
  onChangeValue: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  colorClass?: string;
}

const InlineEditCell: React.FC<InlineEditCellProps> = ({
  value, suffix, isEditing, editValue,
  onStartEdit, onChangeValue, onSave, onCancel, colorClass,
}) => {
  if (isEditing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={editValue}
          onChange={e => onChangeValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onSave();
            if (e.key === 'Escape') onCancel();
          }}
          autoFocus
          inputMode="decimal"
          className="w-20 px-2 py-1 border border-amber-500 rounded-lg bg-white dark:bg-zinc-800 text-gray-900 dark:text-white outline-none text-sm"
        />
        {/* Touch-friendly save / cancel */}
        <button
          onClick={onSave}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors flex-shrink-0"
          aria-label="Enregistrer"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onCancel}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors flex-shrink-0"
          aria-label="Annuler"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    // FIX: min-h-[44px] min-w-[44px] ensures the tap zone meets the 44px
    // minimum touch target guideline without changing visual appearance.
    <button
      onClick={onStartEdit}
      className={`
        inline-flex items-center min-h-[44px] min-w-[44px] px-1
        font-medium hover:underline underline-offset-2 transition-colors
        ${colorClass ?? 'text-gray-700 dark:text-gray-300'}
      `}
      aria-label={`Modifier: ${value} ${suffix}`}
    >
      {value ?? 0}&thinsp;{suffix}
    </button>
  );
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 5;

// ─── Main component ───────────────────────────────────────────────────────────

export const ProductsSection: React.FC = () => {
  const lang = 'fr';
  const {
    products, bottleVariants, isLoading,
    createProduct, updateProduct, deleteProduct,
    createBottleVariant, updateBottleVariant, deleteBottleVariant,
  } = useProducts();

  const {
    alerts, thresholds, criticalCount, lowCount,
    updateThresholds, resetThresholds,
  } = useStockAlerts(products, bottleVariants);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]       = useState<'products' | 'variants'>('products');
  const [searchTerm, setSearchTerm]     = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priceSort, setPriceSort]       = useState<'asc' | 'desc' | null>(null);
  const [currentPage, setCurrentPage]   = useState(1);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; itemId: string; label: string;
  } | null>(null);

  // Single editing cell — track which item + which field is being edited
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'price' | 'inventory' } | null>(null);
  const [editValue, setEditValue]     = useState('');

  const [isDrawerOpen, setIsDrawerOpen]               = useState(false);
  const [productToEdit, setProductToEdit]             = useState<Product | null>(null);
  const [isVariantDrawerOpen, setIsVariantDrawerOpen] = useState(false);
  const [variantToEdit, setVariantToEdit]             = useState<BottleVariant | null>(null);
  const [editToast, setEditToast]                     = useState<string | null>(null);

  // ── Status helper ──────────────────────────────────────────────────────────
  const getStatus = (qty: number, type: 'liquid' | 'bottle' = 'liquid') => {
    const threshold = type === 'liquid' ? thresholds.liquidMl : thresholds.bottleUnits;
    if (qty <= 0)        return 'out-of-stock' as const;
    if (qty < threshold) return 'low-stock'    as const;
    return               'in-stock'            as const;
  };

  // ── Filtered + sorted items ────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    let result: any[] = [];

    if (activeTab === 'products') {
      result = products.filter(p => {
        const s = searchTerm.toLowerCase();
        const matchesSearch =
          p.name?.en?.toLowerCase().includes(s) ||
          p.name?.fr?.toLowerCase().includes(s) ||
          p.slug?.toLowerCase().includes(s) ||
          p.description?.en?.toLowerCase().includes(s) ||
          p.description?.fr?.toLowerCase().includes(s);
        const pStatus     = getStatus(p.liquid_stock_quantity, 'liquid');
        const matchStatus = !statusFilter || pStatus === statusFilter;
        return matchesSearch && matchStatus;
      });
      if (priceSort) {
        result = result.sort((a, b) =>
          priceSort === 'asc' ? a.base_price - b.base_price : b.base_price - a.base_price
        );
      }
    } else {
      result = bottleVariants.filter(v => {
        const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase());
        const vStatus       = getStatus(v.global_stock_quantity, 'bottle');
        const matchStatus   = !statusFilter || vStatus === statusFilter;
        return matchesSearch && matchStatus;
      });
      if (priceSort) {
        result = result.sort((a, b) =>
          priceSort === 'asc' ? a.price_adjustment - b.price_adjustment : b.price_adjustment - a.price_adjustment
        );
      }
    }
    return result;
  }, [activeTab, products, bottleVariants, searchTerm, statusFilter, priceSort, thresholds]);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages     = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const startIdx       = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  React.useEffect(() => {
    setCurrentPage(1);
    setEditingCell(null);
  }, [searchTerm, statusFilter, priceSort, activeTab]);

  // ── Submission handlers ────────────────────────────────────────────────────
  const handleFormSubmit = async (formData: FormData) =>
    productToEdit ? updateProduct(productToEdit._id, formData) : createProduct(formData);

  const handleVariantSubmit = async (formData: FormData) => {
    const success = variantToEdit
      ? await updateBottleVariant(variantToEdit._id, formData)
      : await createBottleVariant(formData);
    if (success) setIsVariantDrawerOpen(false);
    return success;
  };

  const openAddMode = () => {
    if (activeTab === 'products') { setProductToEdit(null); setIsDrawerOpen(true); }
    else { setVariantToEdit(null); setIsVariantDrawerOpen(true); }
  };

  // ── Inline edit helpers ────────────────────────────────────────────────────
  const startEdit = (id: string, field: 'price' | 'inventory', currentValue: number) => {
    setEditingCell({ id, field });
    setEditValue(currentValue.toString());
  };

  const cancelEdit = () => { setEditingCell(null); setEditValue(''); };

  const saveEdit = async (itemId: string) => {
    if (!editingCell || editValue === '') return;
    const isProduct = activeTab === 'products';
    const formData  = new FormData();

    if (isProduct) {
      formData.append(
        editingCell.field === 'price' ? 'base_price' : 'liquid_stock_quantity',
        editValue
      );
      const success = await updateProduct(itemId, formData);
      if (success) {
        cancelEdit();
        setEditToast(`✓ ${editingCell.field === 'price' ? 'Prix' : 'Stock'} mis à jour`);
        setTimeout(() => setEditToast(null), 3000);
      }
    } else {
      formData.append(
        editingCell.field === 'price' ? 'price_adjustment' : 'global_stock_quantity',
        editValue
      );
      const success = await updateBottleVariant(itemId, formData);
      if (success) {
        cancelEdit();
        setEditToast(`✓ ${editingCell.field === 'price' ? 'Modificateur' : 'Stock'} mis à jour`);
        setTimeout(() => setEditToast(null), 3000);
      }
    }
  };

  const handleDelete = (itemId: string) => {
    const label = activeTab === 'products' ? 'ce produit' : 'ce flacon';
    setConfirmDialog({ open: true, itemId, label });
  };

  // ── Pagination helpers ─────────────────────────────────────────────────────
  // FIX: build a compact page window so mobile shows at most 3 page numbers
  // around the current page rather than every page (which overflows on mobile).
  const pageWindow = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const start = Math.max(1, currentPage - 1);
    const end   = Math.min(totalPages, currentPage + 1);
    const pages: (number | '…')[] = [];
    if (start > 1) { pages.push(1); if (start > 2) pages.push('…'); }
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages) { if (end < totalPages - 1) pages.push('…'); pages.push(totalPages); }
    return pages;
  }, [currentPage, totalPages]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Header + tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Inventory Management
          </h2>
          <p className="text-sm text-gray-500">
            {filteredItems.length} total items found
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full md:w-auto">
          <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-gray-100 dark:bg-zinc-900 rounded-xl">
            <TabsTrigger value="products" className="rounded-lg gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 shadow-sm">
              <Beaker className="w-4 h-4" /> Fragrances
            </TabsTrigger>
            <TabsTrigger value="variants" className="rounded-lg gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 shadow-sm">
              <Cylinder className="w-4 h-4" /> Bottles
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Stock alert banner */}
      <StockAlertBanner
        alerts={alerts}
        thresholds={thresholds}
        criticalCount={criticalCount}
        lowCount={lowCount}
        onUpdateThresholds={updateThresholds}
        onResetThresholds={resetThresholds}
      />

      {/* Search & filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        <div className="sm:col-span-2 md:col-span-2 lg:col-span-2">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3 py-2.5">
            <input
              type="text"
              placeholder={`Search ${activeTab === 'products' ? 'fragrances' : 'bottles'}...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-500 outline-none"
            />
          </div>
        </div>

        <div>
          <Select value={statusFilter || 'all'} onValueChange={val => setStatusFilter(val === 'all' ? null : val)}>
            <SelectTrigger className="bg-gray-50 dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 rounded-xl h-[42px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="in-stock">In Stock</SelectItem>
              <SelectItem value="low-stock">Low Stock</SelectItem>
              <SelectItem value="out-of-stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Select value={priceSort || 'none'} onValueChange={val => setPriceSort(val === 'none' ? null : (val as 'asc' | 'desc'))}>
            <SelectTrigger className="bg-gray-50 dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 rounded-xl h-[42px]">
              <SelectValue placeholder="Sort Price" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Sort</SelectItem>
              <SelectItem value="asc">Price: Low → High</SelectItem>
              <SelectItem value="desc">Price: High → Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={openAddMode} className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl w-full h-[42px]">
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      {/* Data table */}
      <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 overflow-hidden rounded-[2rem] shadow-sm">
        <CardContent className="p-0">
          {/* Horizontal scroll so the table never clips on mobile */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-zinc-800">
                  {/* Name — always visible */}
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {activeTab === 'products' ? 'Product' : 'Bottle'}
                  </th>
                  {/*
                    FIX: was hidden md:table-cell — now always visible.
                    Column label shortened to fit. Content abbreviated below.
                  */}
                  <th className="px-3 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {activeTab === 'products' ? 'Slug' : 'Cap.'}
                  </th>
                  {/* Price — always visible */}
                  <th className="px-3 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Prix
                  </th>
                  {/* Inventory — always visible */}
                  <th className="px-3 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  {/*
                    FIX: was hidden sm:table-cell — now always visible.
                    Uses compact StatusBadge with short labels.
                  */}
                  <th className="px-3 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    État
                  </th>
                  {/* Actions */}
                  <th className="px-3 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-sm text-gray-400 dark:text-zinc-500">
                      {isLoading ? 'Chargement…' : 'Aucun résultat'}
                    </td>
                  </tr>
                ) : paginatedItems.map(item => {
                  const isProduct  = activeTab === 'products';
                  const qty        = isProduct ? item.liquid_stock_quantity : item.global_stock_quantity;
                  const price      = isProduct ? item.base_price : item.price_adjustment;
                  const status     = getStatus(qty, isProduct ? 'liquid' : 'bottle');
                  const isEditingP = editingCell?.id === item._id && editingCell?.field === 'price';
                  const isEditingI = editingCell?.id === item._id && editingCell?.field === 'inventory';

                  return (
                    <tr
                      key={item._id}
                      className="border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      {/* Name + optional thumbnail */}
                      <td className="px-4 sm:px-6 py-3">
                        <div className="flex items-center gap-2.5">
                          {!isProduct && item.image_url && (
                            <img
                              src={item.image_url}
                              className="w-9 h-9 rounded-lg object-cover border border-gray-200 dark:border-zinc-700 flex-shrink-0"
                              alt={item.name}
                            />
                          )}
                          <span className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[100px] sm:max-w-[160px]">
                            {isProduct ? item.name[lang] : item.name}
                          </span>
                        </div>
                      </td>

                      {/*
                        FIX: Slug / Capacity — always visible, abbreviated for mobile.
                        Slug is truncated to max-w; capacity shows just the number+ml.
                      */}
                      <td className="px-3 py-3">
                        <span className="text-xs text-gray-500 dark:text-zinc-400 truncate block max-w-[80px] sm:max-w-[120px]">
                          {isProduct
                            ? (item.slug ?? '—')
                            : `${item.capacity_ml ?? 0} ml`
                          }
                        </span>
                      </td>

                      {/* Price — inline editable with touch-friendly target */}
                      <td className="px-3 py-2">
                        <InlineEditCell
                          value={price}
                          suffix={isProduct ? 'dt' : '+dt'}
                          isEditing={isEditingP}
                          editValue={editValue}
                          onStartEdit={() => startEdit(item._id, 'price', price)}
                          onChangeValue={setEditValue}
                          onSave={() => saveEdit(item._id)}
                          onCancel={cancelEdit}
                          colorClass="text-amber-600 dark:text-amber-400"
                        />
                      </td>

                      {/* Inventory — inline editable with touch-friendly target */}
                      <td className="px-3 py-2">
                        <InlineEditCell
                          value={qty}
                          suffix={isProduct ? 'ml' : 'u.'}
                          isEditing={isEditingI}
                          editValue={editValue}
                          onStartEdit={() => startEdit(item._id, 'inventory', qty)}
                          onChangeValue={setEditValue}
                          onSave={() => saveEdit(item._id)}
                          onCancel={cancelEdit}
                          colorClass="text-gray-700 dark:text-gray-300"
                        />
                      </td>

                      {/*
                        FIX: Status — was hidden sm:table-cell, now always shown.
                        Uses compact badge with short labels ("En stock" / "Bas" / "Épuisé").
                      */}
                      <td className="px-3 py-3">
                        <StatusBadge status={status} />
                      </td>

                      {/* Actions dropdown */}
                      <td className="px-3 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            {/* FIX: min touch target on the trigger */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-9 w-9 p-0 rounded-full"
                            >
                              <MoreVertical className="w-4 h-4 text-gray-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isProduct && (
                              <ProductDetailsModal product={item}>
                                <DropdownMenuItem onSelect={e => e.preventDefault()}>
                                  <Eye className="w-4 h-4 mr-2" /> View
                                </DropdownMenuItem>
                              </ProductDetailsModal>
                            )}
                            <DropdownMenuItem onClick={() =>
                              isProduct
                                ? (setProductToEdit(item), setIsDrawerOpen(true))
                                : (setVariantToEdit(item), setIsVariantDrawerOpen(true))
                            }>
                              <Edit2 className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(item._id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Pagination ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-sm text-gray-500 order-2 sm:order-1">
          {filteredItems.length === 0
            ? 'Aucun article'
            : `${startIdx + 1}–${Math.min(startIdx + ITEMS_PER_PAGE, filteredItems.length)} / ${filteredItems.length}`
          }
        </p>

        <div className="flex items-center gap-1.5 order-1 sm:order-2">
          {/* Prev */}
          <Button
            variant="outline" size="sm"
            className="rounded-lg border-gray-200 dark:border-zinc-800 h-9 px-3"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:block ml-1">Prev</span>
          </Button>

          {/*
            FIX: page number buttons were hidden sm:flex so mobile users saw
            nothing between Prev and Next.
            Now always visible: a smart windowed list that shows at most 5
            items (numbers + ellipses) so it never overflows even on 320px.
          */}
          <div className="flex items-center gap-1">
            {pageWindow.map((p, i) =>
              p === '…' ? (
                <span
                  key={`ellipsis-${i}`}
                  className="w-8 text-center text-xs text-gray-400 dark:text-zinc-500 select-none"
                >
                  …
                </span>
              ) : (
                <Button
                  key={p}
                  variant={p === currentPage ? 'default' : 'ghost'}
                  size="sm"
                  className={`w-8 h-8 p-0 rounded-lg text-xs ${
                    p === currentPage
                      ? 'bg-amber-500 text-white hover:bg-amber-600'
                      : 'text-gray-600 dark:text-zinc-400'
                  }`}
                  onClick={() => setCurrentPage(p as number)}
                >
                  {p}
                </Button>
              )
            )}
          </div>

          {/* Next */}
          <Button
            variant="outline" size="sm"
            className="rounded-lg border-gray-200 dark:border-zinc-800 h-9 px-3"
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            <span className="hidden sm:block mr-1">Next</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Drawers */}
      <ProductFormDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={productToEdit}
      />
      <BottleVariantFormDrawer
        isOpen={isVariantDrawerOpen}
        onClose={() => setIsVariantDrawerOpen(false)}
        onSubmit={handleVariantSubmit}
        initialData={variantToEdit}
      />

      {/* Save toast */}
      {editToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-emerald-600 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-xl animate-in slide-in-from-bottom-4 duration-200">
          {editToast}
        </div>
      )}

      {/* Delete confirm */}
      {confirmDialog && (
        <ConfirmDialog
          open={confirmDialog.open}
          title="Confirmer la suppression"
          description={`Êtes-vous sûr de vouloir supprimer ${confirmDialog.label} ? Cette action est irréversible.`}
          confirmLabel="Supprimer"
          onConfirm={async () => {
            const id = confirmDialog.itemId;
            setConfirmDialog(null);
            activeTab === 'products' ? await deleteProduct(id) : await deleteBottleVariant(id);
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
};