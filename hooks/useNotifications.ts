'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface Notification {
  _id: string;
  type: 'new_order' | 'low_stock' | 'system';
  message: string;
  is_read: boolean;
  created_at: string;
  order_id?: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(true);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [error, setError]                 = useState(false);
  const [hasMore, setHasMore]             = useState(false);
  const [page, setPage]                   = useState(1);
  const eventSourceRef = useRef<EventSource | null>(null);

  // ── Initial fetch ─────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res  = await fetch('/api/proxy/notifications?page=1');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.unreadCount);
        setHasMore(data.pagination.hasMore);
        setPage(1);
        setError(false);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── SSE — proxy now handles text/event-stream without buffering ───────────
  useEffect(() => {
    fetchNotifications();

    const es = new EventSource('/api/proxy/notifications/stream');
    eventSourceRef.current = es;

    es.onopen = () => {
      console.log('[SSE] Connected');
    };

    es.onmessage = (event) => {
      try {
        const newNotif: Notification = JSON.parse(event.data);
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
      } catch {
        // malformed event — ignore
      }
    };

    es.onerror = () => {
      console.warn('[SSE] Connection lost, browser will retry...');
    };

    return () => {
      es.close();
    };
  }, [fetchNotifications]);

  // ── Load more ─────────────────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res  = await fetch(`/api/proxy/notifications?page=${nextPage}`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (data.success) {
        setNotifications(prev => [...prev, ...data.data]);
        setHasMore(data.pagination.hasMore);
        setPage(nextPage);
      }
    } catch {
      // silent fail
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, loadingMore]);

  // ── Mark one read ─────────────────────────────────────────────────────────
  const markOneRead = useCallback(async (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n._id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await fetch(`/api/proxy/notifications/${id}/read`, { method: 'PATCH' });
    } catch {
      fetchNotifications(true);
    }
  }, [fetchNotifications]);

  // ── Mark all read ─────────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await fetch('/api/proxy/notifications/read-all', { method: 'PATCH' });
    } catch {
      fetchNotifications(true);
    }
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    error,
    hasMore,
    markOneRead,
    markAllRead,
    loadMore,
    refetch: fetchNotifications,
  };
}