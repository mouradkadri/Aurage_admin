'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Sheet, SheetContent, SheetTitle, SheetHeader } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ChevronLeft, ChevronRight, Printer, MapPin, CheckCircle2, Search, Filter,
  Truck, CheckCircle, RotateCcw, AlertCircle
} from 'lucide-react';

import { useOrders, Order, OrderHistoryLog } from '@/hooks/useOrders'; 

// ---------------------------------------------------------------------------
// HELPER COMPONENTS
// ---------------------------------------------------------------------------

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600',
    printed: 'bg-blue-500/10 border-blue-500/20 text-blue-600',
    shipped: 'bg-purple-500/10 border-purple-500/20 text-purple-600',
    delivered: 'bg-green-500/10 border-green-500/20 text-green-600',
    cancelled: 'bg-red-500/10 border-red-500/20 text-red-600',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium border uppercase tracking-wider ${styles[status] || styles.pending}`}>
      {status || 'pending'}
    </span>
  );
};

// ---------------------------------------------------------------------------
// BULK ACTION BAR
// ---------------------------------------------------------------------------

const BulkActionBar: React.FC<{
  selectedCount: number;
  isUpdating: boolean;
  onClose: () => void;
  onAction: (status: string) => void;
}> = ({ selectedCount, isUpdating, onClose, onAction }) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg shadow-2xl px-6 py-4 flex items-center gap-4 transition-all animate-in slide-in-from-bottom-10">
      <span className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
        {selectedCount} selected
      </span>
      <Separator orientation="vertical" className="bg-gray-200 dark:bg-zinc-800 h-6" />
      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          variant="ghost" 
          disabled={isUpdating}
          onClick={() => onAction('printed')}
          className="text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20" 
          title="Print & Mark Printed"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
        <Button 
          size="sm" 
          variant="ghost" 
          disabled={isUpdating}
          onClick={() => onAction('shipped')}
          className="text-purple-600 hover:bg-purple-50 hover:text-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20" 
          title="Mark as Shipped"
        >
          <Truck className="w-4 h-4 mr-2" />
          Shipped
        </Button>
        <Button 
          size="sm" 
          variant="ghost" 
          disabled={isUpdating}
          onClick={() => onAction('delivered')}
          className="text-green-600 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-900/20" 
          title="Mark as Delivered"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Delivered
        </Button>
        <Button 
          size="sm" 
          variant="ghost" 
          disabled={isUpdating}
          onClick={() => onAction('cancelled')}
          className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20" 
          title="Cancel Orders"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>
      <Separator orientation="vertical" className="bg-gray-200 dark:bg-zinc-800 h-6 mx-2" />
      <Button 
        size="sm" 
        variant="ghost" 
        disabled={isUpdating}
        onClick={onClose} 
        className="text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800 px-2"
      >
        ✕
      </Button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// ORDER DETAILS SHEET (Uses Backend Data)
// ---------------------------------------------------------------------------

const OrderDetailsSheet: React.FC<{
  selectedData: { order: Order; history: OrderHistoryLog[] } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoadingDetails: boolean;
  onUpdateStatus: (id: string, status: string, note?: string) => Promise<boolean>;
  // Add the new prop for the note-saving function
  onAddNote: (id: string, note: string) => Promise<boolean>;
    fetchOrders: any;
  searchTerm: string;
  statusFilter: string;
  page: number;
}> = ({ 
  selectedData, open, onOpenChange, isLoadingDetails, 
  onUpdateStatus, onAddNote, fetchOrders, searchTerm, statusFilter, page 
}) => {
  const [notes, setNotes] = useState('');
  // We need to track the initial state to see if it changed
  const [initialNote, setInitialNote] = useState('');

  const order = selectedData?.order;
  const history = selectedData?.history || [];

  // When a new order is selected, reset the notes
  useEffect(() => {
    setNotes('');
    setInitialNote('');
  }, [order]);

  // Handler for status updates (this part is now cleaner)
 const handleStatusUpdate = async (status: string, defaultNote?: string) => {
  if (!order) return;
  const success = await onUpdateStatus(order._id, status, notes || defaultNote);
  
  if (success) {
    setNotes('');
    // ✅ This refresh is now mandatory because we removed it from the hook
    fetchOrders({
      page: page,
      limit: 10,
      status: statusFilter,
      email: searchTerm.includes('@') ? searchTerm : undefined,
      orderId: (!searchTerm.includes('@') && /^[a-zA-Z0-9]+$/.test(searchTerm)) ? searchTerm : undefined,
    });
  }
};
  // The new handler for closing the sheet
  const handleSheetClose = (isOpen: boolean) => {
    // If the sheet is closing, check if the note has been changed
    if (!isOpen && order && notes.trim() && notes !== initialNote) {
      // Automatically save the note without changing status
      onAddNote(order._id, notes);
    }
    // Then, call the original onOpenChange handler to actually close the sheet
    onOpenChange(isOpen);
  };


  return (
    <Sheet open={open} onOpenChange={handleSheetClose}>
      <SheetContent className="w-full sm:max-w-2xl bg-white dark:bg-zinc-950 border-l border-gray-200 dark:border-zinc-800 flex flex-col p-0">
        
        {/* RADIX UI FIX: Required unconditional title for screen readers */}
        <SheetHeader className="sr-only">
          <SheetTitle>Order Details</SheetTitle>
        </SheetHeader>

        {isLoadingDetails || !order ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          </div>
        ) : (
          <>
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-gray-900 dark:text-white text-xl font-bold">
                  Order #{order._id?.substring(order._id.length - 6).toUpperCase() || 'UNKNOWN'}
                </h2>
                <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1">
                  {order.created_at ? new Date(order.created_at).toLocaleString() : 'Date unavailable'}
                </p>
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className="border-gray-300 dark:border-zinc-700"
                onClick={() => {
                  window.print();
                                   if (order.status === 'pending') {
                    // FIX: Use the new handler for the print action
                    handleStatusUpdate('printed', 'Packing slip printed');
                  }

                }}
              >
                <Printer className="w-4 h-4" />
              </Button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              
              {/* Status & Customer Card */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Order Status</p>
                  <StatusBadge status={order.status} />
                </div>
                <div className="space-y-1 border-l border-gray-200 dark:border-zinc-800 pl-4">
                  <p className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Customer</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {order.customer?.first_name || 'Guest'} {order.customer?.last_name || ''}
                  </p>
                 <p className="text-xs text-gray-600 dark:text-zinc-400">{order.customer?.phone}</p>
{order.customer?.email && (
  <p className="text-xs text-gray-600 dark:text-zinc-400">{order.customer.email}</p>
)}
                </div>
              </div>

              <Separator className="bg-gray-200 dark:bg-zinc-800" />

              {/* Shipping Address */}
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase mb-2">Shipping Address</p>
                <div className="flex items-start gap-2 text-sm text-gray-900 dark:text-white">
                  <MapPin className="w-4 h-4 text-gray-600 dark:text-zinc-400 mt-0.5 flex-shrink-0" />
                  <p>
  {order.shipping_address?.street || 'N/A'}, {order.shipping_address?.city || 'N/A'}, {order.shipping_address?.governorate || order.shipping_address?.state || 'N/A'}
</p>
                </div>
              </div>

              <Separator className="bg-gray-200 dark:bg-zinc-800" />

              {/* Order Items Table */}
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase mb-3">Items</p>
                <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gray-50 dark:bg-zinc-900/50">
                      <TableRow>
                        <TableHead className="text-xs font-semibold text-gray-700 dark:text-zinc-300">Item</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-700 dark:text-zinc-300 text-center">Qty</TableHead>
                        <TableHead className="text-xs font-semibold text-gray-700 dark:text-zinc-300 text-right">Unit Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!order.items || order.items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-6 text-sm text-gray-500">
                            No items found. (This might be a legacy order).
                          </TableCell>
                        </TableRow>
                      ) : (
                        order.items.map((item, idx) => (
                          <TableRow key={item._id || idx} className="border-b border-gray-200 dark:border-zinc-800">
                            <TableCell className="px-3 py-2">
                              {item.pack ? (
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">📦 {item.pack.name || 'Unknown Pack'}</p>
                                  <p className="text-xs text-gray-500">Pack Bundle</p>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">{item.product?.name || 'Unknown Product'}</p>
                                  <p className="text-xs text-gray-600 dark:text-zinc-400">Bottle: {item.bottle?.name || 'Unknown Bottle'}</p>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-sm">{item.quantity || 0}</TableCell>
                            <TableCell className="text-right text-sm">DT{(item.price_at_purchase || 0).toFixed(2)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-gray-50 dark:bg-zinc-900/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
                  <span>Total Amount</span>
                  <span>DT{(order.total_amount || 0).toFixed(2)}</span>
                </div>
              </div>

              <Separator className="bg-gray-200 dark:bg-zinc-800" />

              {/* Real History Timeline */}
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase mb-4">Order Timeline</p>
                <div className="space-y-4">
                  {history.length === 0 ? (
                    <p className="text-sm text-gray-500">No history logs found.</p>
                  ) : (
                    history.map((log, index) => (
                      <div key={log._id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            log.status === 'cancelled' 
                              ? 'bg-red-500/10 border-red-500 text-red-600' 
                              : 'bg-blue-500/10 border-blue-500 text-blue-600'
                          }`}>
                            {log.status === 'cancelled' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </div>
                          {index < history.length - 1 && <div className="w-0.5 h-8 bg-gray-300 dark:bg-zinc-700 mt-2"></div>}
                        </div>
                        <div className="pt-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">Status: {log.status}</p>
                          <p className="text-xs text-gray-600 dark:text-zinc-400">{new Date(log.created_at).toLocaleString()}</p>
                          {log.note && <p className="text-xs text-gray-500 italic mt-1">{log.note}</p>}
                          {log.admin_id && <p className="text-xs text-amber-600 mt-1">By: {log.admin_id.name}</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Internal Notes & Actions */}
              <div>
                <p className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase mb-2">Update Order</p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add internal note for status change..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-lg text-sm mb-2 bg-transparent"
                  rows={2}
                />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => handleStatusUpdate('shipped')}>Mark Shipped</Button>
                  <Button size="sm" variant="outline" onClick={() => handleStatusUpdate('delivered')}>Mark Delivered</Button>
                  <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate('cancelled')}>Cancel Order</Button>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

// ---------------------------------------------------------------------------
// MAIN ORDERS SECTION
// ---------------------------------------------------------------------------

export const OrdersSection = () => {
  const { 
    orders, 
    selectedOrder, 
    isLoading, 
    totalOrders, 
    pagination, 
    stats,
    fetchOrders, 
    fetchOrderDetails, 
    updateOrderStatus,
    addOrderNote,
    setSelectedOrder,
 
  } = useOrders();

  const [page, setPage] = useState(1);
  const[searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const[isBulkUpdating, setIsBulkUpdating] = useState(false);
  
   useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const trimmedSearch = searchTerm.trim();
      
      // If nothing is searched and no filters, fetch page 1
      if (!trimmedSearch && statusFilter === 'all' && page === 1) {
        fetchOrders({ page: 1, limit: 10 });
        return;
      }

      // ✅ Unified call: Just send the searchTerm
      fetchOrders({
        page: page,
        limit: 10,
        status: statusFilter,
        searchTerm: trimmedSearch !== '' ? trimmedSearch : undefined,
      });
    }, 500); 

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, statusFilter, page, fetchOrders]);

  const handleSelectOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) newSelected.delete(orderId);
    else newSelected.add(orderId);
    setSelectedOrders(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedOrders.size === orders.length) setSelectedOrders(new Set());
    else setSelectedOrders(new Set(orders.map((o) => o._id)));
  };

  const handleOpenDetails = async (id: string) => {
    setSheetOpen(true);
    await fetchOrderDetails(id);
  };

  // --- BULK ACTION HANDLER ---
  const handleBulkAction = async (newStatus: string) => {
    if (!window.confirm(`Are you sure you want to mark ${selectedOrders.size} orders as ${newStatus.toUpperCase()}?`)) return;

    setIsBulkUpdating(true);
    try {
      const orderIds = Array.from(selectedOrders);
      
      // Execute all API calls concurrently
      await Promise.all(
        orderIds.map(id => updateOrderStatus(id, newStatus, `Bulk status update to ${newStatus}`))
      );

      // If they clicked Print, trigger the browser's print dialog 
      // (Admins can print the screen or a custom invoice page you build later)
      if (newStatus === 'printed') {
        window.print();
      }

      // Reset UI state and refresh the data
      setSelectedOrders(new Set());
      
    const isEmail = searchTerm.includes('@');
       await fetchOrders({ 
        page: page, 
        limit: 10, 
        status: statusFilter,
        searchTerm: searchTerm.trim() !== '' ? searchTerm : undefined,
      });
      
    } catch (error) {
      console.error("Bulk update failed:", error);
      alert("An error occurred during bulk update. Check console for details.");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 relative">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-yellow-600 mb-1 uppercase tracking-wider">Pending</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-blue-600 mb-1 uppercase tracking-wider">Printed</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.printed || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-purple-600 mb-1 uppercase tracking-wider">Shipped</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.shipped || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-green-600 mb-1 uppercase tracking-wider">Delivered</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.delivered || 0}</p>
          </CardContent>
        </Card>
      </div>
      {/* Filters Card */}
      <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex items-center gap-2 bg-gray-100 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-600" />
            <input
              type="text"
              
              placeholder="Search by Email or exact Order ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1); // Reset to page 1 on new search
              }}
              className="flex-1 bg-transparent text-sm outline-none"
              
            />
          </div>

          <div className="w-full sm:w-48">
             <Select 
              value={statusFilter} 
              onValueChange={(val) => {
                setStatusFilter(val);
                setPage(1); // Reset to page 1 on status change
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="printed">Printed</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setPage(1); // Reset page to 1
            }}
          >
            <Filter className="w-4 h-4 mr-2" /> Clear
          </Button>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
        <CardContent className="p-4">
          <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden relative min-h-[300px]">
            
            {(isLoading || isBulkUpdating) && (
              <div className="absolute inset-0 bg-white/50 dark:bg-black/50 z-10 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
              </div>
            )}

            <Table>
              <TableHeader className="bg-gray-50 dark:bg-zinc-900/50">
                <TableRow>
                  <TableHead className="w-8 px-4 py-3">
                    <Checkbox
                      checked={selectedOrders.size === orders.length && orders.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold">Order ID</TableHead>
                  <TableHead className="text-xs font-semibold">Customer</TableHead>
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 && !isLoading ? (
                  <TableRow>
                     <TableCell colSpan={6} className="text-center py-8 text-gray-500">No orders found.</TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow 
                      key={order._id} 
                      className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900/50 ${selectedOrders.has(order._id) ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}
                      onClick={() => handleSelectOrder(order._id)}
                    >
                      <TableCell className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedOrders.has(order._id)}
                          onCheckedChange={() => handleSelectOrder(order._id)}
                        />
                      </TableCell>
                      <TableCell
                        className="text-sm font-medium text-amber-600 hover:underline py-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetails(order._id);
                        }}
                      >
                        #{order._id?.substring(order._id.length - 6).toUpperCase() || 'ERROR'}
                      </TableCell>
                      <TableCell className="text-sm py-3">
                        {order.customer?.first_name || 'Guest'} {order.customer?.last_name || ''}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 py-3">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell className="py-3">
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold py-3">
                        DT{(order.total_amount || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Server-Side Pagination Controls */}
          <div className="flex items-center justify-between mt-4 text-sm text-gray-600 dark:text-zinc-400">
            <span>
              Total Orders: {totalOrders}
            </span>
            <div className="flex gap-2 items-center">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.currentPage <= 1 || isLoading}
                // Update to just change the page state (useEffect handles the fetch)
                onClick={() => setPage(prev => prev - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span>
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.currentPage >= pagination.totalPages || isLoading}
                onClick={() => setPage(prev => prev + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <OrderDetailsSheet 
        selectedData={selectedOrder} 
        open={sheetOpen} 
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setSelectedOrder(null);
        }}
        isLoadingDetails={isLoading && sheetOpen}
        onUpdateStatus={updateOrderStatus}
        onAddNote={addOrderNote}
        // ✅ ADD THESE:
        fetchOrders={fetchOrders}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        page={page}
      />

      {/* FLOATING BULK ACTION BAR */}
      <BulkActionBar 
        selectedCount={selectedOrders.size} 
        isUpdating={isBulkUpdating}
        onClose={() => setSelectedOrders(new Set())}
        onAction={handleBulkAction}
      />
    </div>
  );
};