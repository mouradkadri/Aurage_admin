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
    governorate_id?: number;
    district?: string;
    district_id?: number;
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

// ─── Delivery filter values accepted by the backend ───────────────────────────
export type DeliveryFilter =
  | 'all'
  | 'self'
  | 'intigo'
  | 'intigo_api'
  | 'intigo_excel';

interface FetchOrdersParams {
  page?:            number;
  limit?:           number;
  status?:          string;
  delivery_method?: DeliveryFilter;
  searchTerm?:      string;
  startDate?:       string;
  endDate?:         string;
}

// ─── Stats shape returned by /api/orders/stats ───────────────────────────────
export interface OrderStats {
  pending:   number;
  printed:   number;
  shipped:   number;
  delivered: number;
  cancelled: number;
  delivery: {
    self:          number;
    intigo:        number;  // total intigo
    intigo_api:    number;  // subset: shipped via Intigo API (has NID)
    intigo_excel:  number;  // subset: dispatched via Excel (no NID)
  };
}

const DEFAULT_STATS: OrderStats = {
  pending: 0, printed: 0, shipped: 0, delivered: 0, cancelled: 0,
  delivery: { self: 0, intigo: 0, intigo_api: 0, intigo_excel: 0 },
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useOrders = () => {
  const [orders, setOrders]           = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<{ order: Order; history: OrderHistoryLog[] } | null>(null);
  const [isLoading, setIsLoading]     = useState(false);
  const [totalOrders, setTotalOrders] = useState(0);
  const [pagination, setPagination]   = useState({ currentPage: 1, totalPages: 1 });
  const [stats, setStats]             = useState<OrderStats>(DEFAULT_STATS);

  // ── 1. Fetch paginated orders ───────────────────────────────────────────
  const fetchOrders = useCallback(async (params: FetchOrdersParams = {}) => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (params.page)            query.append('page',            params.page.toString());
      if (params.limit)           query.append('limit',           params.limit.toString());
      if (params.status && params.status !== 'all')
                                  query.append('status',          params.status);
      if (params.delivery_method && params.delivery_method !== 'all')
                                  query.append('delivery_method', params.delivery_method);
      if (params.searchTerm)      query.append('search',          params.searchTerm);
      if (params.startDate)       query.append('startDate',       params.startDate);
      if (params.endDate)         query.append('endDate',         params.endDate);

      const res  = await fetch(`/api/proxy/orders?${query.toString()}`);
      if (!res.ok) throw new Error('Fetch failed');

      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
        setTotalOrders(data.total);
        setPagination({
          currentPage: data.pagination.current_page,
          totalPages:  data.pagination.total_pages,
        });
      }
    } catch (err) {
      console.error(err);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── 2. Fetch single order details ───────────────────────────────────────
  const fetchOrderDetails = async (id: string) => {
    setIsLoading(true);
    try {
      const res  = await fetch(`/api/proxy/orders/${id}`);
      const data = await res.json();
      if (data.success) setSelectedOrder(data.data);
    } catch (err) {
      console.error('Failed to fetch order details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ── 3. Update order status ──────────────────────────────────────────────
  const updateOrderStatus = async (id: string, status: string, note?: string): Promise<boolean> => {
    try {
      const res  = await fetch(`/api/proxy/orders/${id}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status, note }),
      });
      const data = await res.json();
      if (data.success) {
        if (selectedOrder?.order._id === id) await fetchOrderDetails(id);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update status:', err);
      return false;
    }
  };

  // ── 4. Add note ─────────────────────────────────────────────────────────
  const addOrderNote = async (id: string, note: string): Promise<boolean> => {
    if (!note?.trim()) return true;
    try {
      const res  = await fetch(`/api/proxy/orders/${id}/notes`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ note }),
      });
      const data = await res.json();
      if (data.success) {
        if (selectedOrder?.order._id === id) await fetchOrderDetails(id);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to add note:', err);
      return false;
    }
  };

  // ── 5. Fetch stats ──────────────────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const res  = await fetch('/api/proxy/orders/stats');
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  // ── Combined fetch (orders + stats in parallel) ─────────────────────────
  const fetchOrdersWithStats = useCallback(async (params: FetchOrdersParams) => {
    await Promise.all([fetchOrders(params), fetchStats()]);
  }, [fetchOrders, fetchStats]);

  return {
    orders,
    selectedOrder,
    isLoading,
    totalOrders,
    pagination,
    stats,
    fetchOrders:      fetchOrdersWithStats,
    fetchOrderDetails,
    updateOrderStatus,
    addOrderNote,
    setSelectedOrder,
  };
};