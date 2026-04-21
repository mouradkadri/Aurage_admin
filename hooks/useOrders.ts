'use client';

import { useState, useEffect, useCallback } from 'react';

// --- INTERFACES ---

export interface OrderItem {
  _id: string;
  product?: { _id: string; name: string; images: { image_url: string }[] };
  bottle?: { _id: string; name: string; capacity_ml: number };
  pack?: { _id: string; name: string };
  quantity: number;
  price_at_purchase: number;
}

export interface OrderHistoryLog {
  _id: string;
  status: string;
  note: string;
  admin_id?: { _id: string; name: string; role: string };
  created_at: string;
}

export interface Order {
  _id: string;
  customer: {
    _id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone: string;
  };
  items: OrderItem[];
  total_amount: number;
  shipping_address: {
    street: string;
    city: string;
    governorate?: string;
    state: string;
    zip: string;
  };
  status: 'pending' | 'printed' | 'shipped' | 'delivered' | 'cancelled';
  delivery_method?: 'self' | 'intigo';
  intigo?: {
    nid: string | null;
    status_code: number | null;
    status_label: string | null;
    event_type: string | null;
    shipped_at: string | null;
    delivered_at: string | null;
    returned_at: string | null;
  };
  created_at: string;
  updated_at: string;
}

interface FetchOrdersParams {
  page?: number;
  limit?: number;
  status?: string;
  orderId?: string;
  searchTerm?: string;
  email?: string;

startDate?: string;
  endDate?: string;
}

export const useOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<{ order: Order; history: OrderHistoryLog[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [totalOrders, setTotalOrders] = useState(0);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
   const [stats, setStats] = useState({
    pending: 0,
    printed: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0
  });


  // --- 1. FETCH PAGINATED ORDERS ---
  const fetchOrders = useCallback(async (params: FetchOrdersParams = {}) => {
  setIsLoading(true);
  try {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.status && params.status !== 'all') query.append('status', params.status);
    
    // Send generic search string to backend
    if (params.searchTerm) query.append('search', params.searchTerm);

    const res = await fetch(`/api/proxy/orders?${query.toString()}`);
    if (!res.ok) throw new Error('Search failed');

    const data = await res.json();
    if (data.success) {
      setOrders(data.data);
      setTotalOrders(data.total);
      setPagination({
        currentPage: data.pagination.current_page,
        totalPages: data.pagination.total_pages,
      });
    }
  } catch (err) {
    console.error(err);
    setOrders([]); // Clear results on error
  } finally {
    setIsLoading(false);
  }
}, []);


  // --- 2. FETCH SINGLE ORDER DETAILS ---
  const fetchOrderDetails = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/proxy/orders/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedOrder(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch order details:", err);
    } finally {
      setIsLoading(false);
    }
  };
  const addOrderNote = async (id: string, note: string): Promise<boolean> => {
    // Don't send requests for empty notes
    if (!note || !note.trim()) {
      return true; // Consider it a "success" as there's nothing to do
    }

    try {
      const res = await fetch(`/api/proxy/orders/${id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });

      const data = await res.json();
      if (data.success) {
        // Refresh the details to show the new note in the timeline
        if (selectedOrder?.order._id === id) {
          await fetchOrderDetails(id);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to add note:", err);
      return false;
    }
  };

  // --- 3. UPDATE ORDER STATUS ---
  /**
   * @param id Order ID
   * @param status The new status
   * @param note Optional reason or internal note
   */
 const updateOrderStatus = async (id: string, status: string, note?: string) => {
    try {
      const res = await fetch(`/api/proxy/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note }),
      });

      const data = await res.json();
      if (data.success) {
        // ✅ REMOVED the fetchOrders call from here. 
        // The UI component will now handle the refresh using handleStatusUpdate.
        
        if (selectedOrder?.order._id === id) {
          await fetchOrderDetails(id);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error("Failed to update status:", err);
      return false;
    }
  };
 const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/proxy/orders/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  // Update fetchOrders to also trigger a stats refresh 
  // so KPIs update when you change an order status
  const fetchOrdersWithStats = useCallback(async (params) => {
    await fetchOrders(params);
    await fetchStats();
  }, [fetchOrders, fetchStats]);
  // Initial load
  //useEffect(() => {
   // fetchOrders({ page: 1, limit: 10 });
  //}, [fetchOrders]);

  return {
    orders,
    selectedOrder,
    isLoading,
    totalOrders,
    addOrderNote,
    pagination,
    stats,
    fetchOrders: fetchOrdersWithStats,
    fetchOrderDetails,
    updateOrderStatus,
    setSelectedOrder, // Useful for closing modals
  };
};