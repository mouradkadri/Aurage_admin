'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductFormDrawer } from './ProductFormDrawer';
import { BottleVariantFormDrawer } from './BottleVariantFormDrawer';
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
  MoreVertical, Eye, Beaker, Cylinder 
} from 'lucide-react';
import { useProducts, Product, BottleVariant } from '@/hooks/useProducts';
import { ProductDetailsModal } from './ProductDetailsModal';

const StatusBadge = ({
  status,
}: {
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
}) => {
  const styles = {
    'in-stock': 'bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400',
    'low-stock': 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400',
    'out-of-stock': 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400',
  };

  const labels = {
    'in-stock': 'In Stock',
    'low-stock': 'Low Stock',
    'out-of-stock': 'Out of Stock',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

const ITEMS_PER_PAGE = 5;

export const ProductsSection: React.FC = () => {
  const { 
    products, bottleVariants, isLoading, 
    createProduct, updateProduct, deleteProduct,
    createBottleVariant, updateBottleVariant, deleteBottleVariant 
  } = useProducts();

  // --- UI State ---
  const [activeTab, setActiveTab] = useState<'products' | 'variants'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [priceSort, setPriceSort] = useState<'asc' | 'desc' | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  // --- Inline Edit State ---
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'price' | 'inventory' } | null>(null);
  const[editValue, setEditValue] = useState('');

  // --- Drawer States ---
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [isVariantDrawerOpen, setIsVariantDrawerOpen] = useState(false);
  const[variantToEdit, setVariantToEdit] = useState<BottleVariant | null>(null);

  const getStatus = (qty: number) => 
    qty > 20 ? 'in-stock' : qty > 0 ? 'low-stock' : 'out-of-stock';

  // --- Dynamic Filtering and Sorting ---
  const filteredItems = useMemo(() => {
    let result: any[] =[];

    if (activeTab === 'products') {
      result = products.filter((p) => {
        const matchesSearch =
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchTerm.toLowerCase());
        
        const pStatus = getStatus(p.liquid_stock_quantity);
        const matchesStatus = !statusFilter || pStatus === statusFilter;
        return matchesSearch && matchesStatus;
      });

      if (priceSort) {
        result = result.sort((a, b) => (priceSort === 'asc' ? a.base_price - b.base_price : b.base_price - a.base_price));
      }
    } else {
      result = bottleVariants.filter((v) => {
        const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        const vStatus = getStatus(v.global_stock_quantity);
        const matchesStatus = !statusFilter || vStatus === statusFilter;
        return matchesSearch && matchesStatus;
      });

      if (priceSort) {
        result = result.sort((a, b) => (priceSort === 'asc' ? a.price_adjustment - b.price_adjustment : b.price_adjustment - a.price_adjustment));
      }
    }

    return result;
  },[activeTab, products, bottleVariants, searchTerm, statusFilter, priceSort]);

  // --- Pagination ---
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filteredItems.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  React.useEffect(() => {
    setCurrentPage(1);
    setEditingCell(null); // Reset inline edits when switching tabs or filtering
  },[searchTerm, statusFilter, priceSort, activeTab]);

  // --- Submission Handlers ---
  const handleFormSubmit = async (formData: FormData) => {
    return productToEdit 
      ? await updateProduct(productToEdit._id, formData)
      : await createProduct(formData);
  };

  const handleVariantSubmit = async (formData: FormData) => {
    const success = variantToEdit 
      ? await updateBottleVariant(variantToEdit._id, formData)
      : await createBottleVariant(formData);
    if (success) setIsVariantDrawerOpen(false);
    return success;
  };

  const openAddMode = () => {
    if (activeTab === 'products') {
      setProductToEdit(null);
      setIsDrawerOpen(true);
    } else {
      setVariantToEdit(null);
      setIsVariantDrawerOpen(true);
    }
  };

  // --- Inline Editing Handlers ---
  const handleCellEdit = (id: string, field: 'price' | 'inventory', currentValue: number) => {
    setEditingCell({ id, field });
    setEditValue(currentValue.toString());
  };

  const saveEdit = async (itemId: string) => {
  if (!editingCell || editValue === '') return;
  
  const isProduct = activeTab === 'products';
  
  // Create a new FormData object
  const formData = new FormData();
  
  if (isProduct) {
    formData.append(editingCell.field === 'price' ? 'base_price' : 'liquid_stock_quantity', editValue);
    const success = await updateProduct(itemId, formData);
    if (success) { setEditingCell(null); setEditValue(''); }
  } else {
    // VARIANT: Add the specific field to FormData
    const fieldName = editingCell.field === 'price' ? 'price_adjustment' : 'global_stock_quantity';
    formData.append(fieldName, editValue);
    
    // Now you are passing FormData, which matches your updateBottleVariant signature
    const success = await updateBottleVariant(itemId, formData);
    
    if (success) { 
      setEditingCell(null); 
      setEditValue(''); 
    } else { 
      alert("Failed to update variant"); 
    }
  }
};

  const handleDelete = async (itemId: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
        activeTab === 'products' ? await deleteProduct(itemId) : await deleteBottleVariant(itemId);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Inventory Management</h2>
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

      {/* Search and Filters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm">
        
        <div className="sm:col-span-2 md:col-span-2 lg:col-span-2">
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3 py-2.5">
            <input
              type="text"
              placeholder={`Search ${activeTab === 'products' ? 'fragrances' : 'bottles'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-500 outline-none"
            />
          </div>
        </div>

        <div>
          <Select value={statusFilter || 'all'} onValueChange={(val) => setStatusFilter(val === 'all' ? null : val)}>
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
          <Select value={priceSort || 'none'} onValueChange={(val) => setPriceSort(val === 'none' ? null : (val as 'asc' | 'desc'))}>
            <SelectTrigger className="bg-gray-50 dark:bg-zinc-950 border-gray-200 dark:border-zinc-800 rounded-xl h-[42px]">
              <SelectValue placeholder="Sort Price" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Sort</SelectItem>
              <SelectItem value="asc">Price: Low to High</SelectItem>
              <SelectItem value="desc">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={openAddMode} className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl w-full h-[42px]">
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
      </div>

      {/* Dynamic Data Table */}
      <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 overflow-hidden rounded-[2rem] shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
  <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
    {activeTab === 'products' ? 'Product' : 'Bottle Model'}
  </th>
  {/* HIDDEN ON MOBILE */}
  <th className="hidden md:table-cell px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
    {activeTab === 'products' ? 'Scent/Slug' : 'Capacity'}
  </th>
  <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
    {activeTab === 'products' ? 'Base Price' : 'Added Fee'}
  </th>
  <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
    Inventory
  </th>
  {/* HIDDEN ON SMALL MOBILE */}
  <th className="hidden sm:table-cell px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
    Status
  </th>
  <th className="px-4 sm:px-6 py-4 text-right sm:text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
    Quantity
  </th>
</tr>
              </thead>
              <tbody>
  {paginatedItems.map((item) => {
    const isProduct = activeTab === 'products';
    
    // Fix: Map fields correctly based on whether it is a product or variant
    const qty = isProduct ? item.liquid_stock_quantity : item.global_stock_quantity;
    const price = isProduct ? item.base_price : item.price_adjustment; // Use price_adjustment here
    const status = getStatus(qty);

    return (
      <tr key={item._id} className="border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors">
        
        {/* Name & Image */}
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            {!isProduct && item.image_url && (
               <img src={item.image_url} className="w-9 h-9 rounded-lg object-cover border border-gray-200 dark:border-zinc-700" alt={item.name} />
            )}
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {item.name}
            </span>
          </div>
        </td>

        {/* Capacity / Slug */}
        <td className="px-6 py-4 text-sm text-gray-600 dark:text-zinc-400">
          {isProduct ? item.slug : `${item.capacity_ml || 0}ml`}
        </td>
        
        {/* Price/Modifier */}
        <td className="px-6 py-4 text-sm">
          {editingCell?.id === item._id && editingCell?.field === 'price' ? (
            <div className="flex gap-2">
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-20 px-2 py-1 border border-amber-500 rounded bg-white dark:bg-zinc-800 text-gray-900 dark:text-white outline-none"
                autoFocus
              />
              <button onClick={() => saveEdit(item._id)} className="text-green-600 font-medium">Save</button>
            </div>
          ) : (
            <span
              onClick={() => handleCellEdit(item._id, 'price', price)}
              className="cursor-pointer text-amber-600 dark:text-amber-400 hover:underline font-medium"
            >
              {isProduct ? `$${price || 0}` : `+$${price || 0}`}
            </span>
          )}
        </td>

        {/* Inventory */}
        <td className="px-6 py-4 text-sm">
          {editingCell?.id === item._id && editingCell?.field === 'inventory' ? (
            <div className="flex gap-2">
              <input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-20 px-2 py-1 border border-amber-500 rounded bg-white dark:bg-zinc-800 text-gray-900 dark:text-white outline-none"
                autoFocus
              />
              <button onClick={() => saveEdit(item._id)} className="text-green-600 font-medium">Save</button>
            </div>
          ) : (
            <span
              onClick={() => handleCellEdit(item._id, 'inventory', qty)}
              className="cursor-pointer font-semibold hover:underline text-gray-700 dark:text-gray-300"
            >
              {qty || 0} units
            </span>
          )}
        </td>
        
        <td className="px-6 py-4">
          <StatusBadge status={status} />
        </td>
        
        <td className="px-6 py-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isProduct && (
                <ProductDetailsModal product={item}>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}><Eye className="w-4 h-4 mr-2" /> View</DropdownMenuItem>
                </ProductDetailsModal>
              )}
              <DropdownMenuItem onClick={() => isProduct ? (setProductToEdit(item), setIsDrawerOpen(true)) : (setVariantToEdit(item), setIsVariantDrawerOpen(true))}>
                <Edit2 className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(item._id)}>
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

      {/* Pagination Container */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-sm text-gray-500">
          Showing {filteredItems.length === 0 ? 0 : startIdx + 1} to {Math.min(startIdx + ITEMS_PER_PAGE, filteredItems.length)} of {filteredItems.length} items
        </p>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline" size="sm"
            className="rounded-lg border-gray-200 dark:border-zinc-800"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
          </Button>

          <div className="flex items-center gap-1 hidden sm:flex">
            {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? 'default' : 'ghost'}
                size="sm"
                className={`w-8 h-8 p-0 rounded-lg ${page === currentPage ? 'bg-amber-500 text-white hover:bg-amber-600' : 'text-gray-600'}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
          </div>

          <Button
            variant="outline" size="sm"
            className="rounded-lg border-gray-200 dark:border-zinc-800"
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
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

    </div>
  );
};