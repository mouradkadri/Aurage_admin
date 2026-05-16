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

  const retryCount    = useRef(0);
  const retryTimeout  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const unmountedRef  = useRef(false);

  // ── Initial fetch ─────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/proxy/notifications?page=1');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.unreadCount);
        setHasMore(data.pagination?.hasMore ?? false);
        setPage(1);
        setError(false);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── SSE connection ────────────────────────────────────────────────────────
  // We use a polling fallback instead of SSE when the stream returns a non-2xx
  // status (e.g. 500) or the connection drops, to avoid ERR_INCOMPLETE_CHUNKED_ENCODING
  // spamming the console with rapid reconnects.
  const connectSSE = useCallback(() => {
    if (unmountedRef.current) return;

    // Close any existing connection first
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Give up after 5 retries and fall back to polling
    if (retryCount.current >= 5) {
      console.warn('[SSE] Max retries reached — switching to 30s polling');
      // Poll every 30 seconds as fallback
      retryTimeout.current = setTimeout(() => {
        if (!unmountedRef.current) {
          retryCount.current = 0; // reset so SSE is tried again
          fetchNotifications(true);
          connectSSE();
        }
      }, 30_000);
      return;
    }

    try {
      const es = new EventSource('/api/proxy/notifications/stream');
      eventSourceRef.current = es;

      es.onopen = () => {
        console.log('[SSE] Connected');
        retryCount.current = 0;
      };

      es.onmessage = (event) => {
        // Ignore heartbeat/ping messages
        if (!event.data || event.data === 'ping' || event.data === ':') return;
        try {
          const parsed = JSON.parse(event.data);
          // Some backends send { type: 'ping' } as keepalive
          if (parsed.type === 'ping') return;
          const newNotif: Notification = parsed;
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
        } catch {
          // malformed event — ignore
        }
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;

        if (unmountedRef.current) return;

        // Exponential backoff: 3s, 6s, 12s, 24s, 48s — then fall back to polling
        const delay = Math.min(3_000 * Math.pow(2, retryCount.current), 48_000);
        retryCount.current += 1;

        console.warn(`[SSE] Connection lost. Retry ${retryCount.current}/5 in ${delay / 1000}s`);

        retryTimeout.current = setTimeout(() => {
          if (!unmountedRef.current) connectSSE();
        }, delay);
      };
    } catch (err) {
      // EventSource constructor can throw if URL is invalid
      console.error('[SSE] Failed to create EventSource:', err);
    }
  }, [fetchNotifications]);

  useEffect(() => {
    unmountedRef.current = false;

    fetchNotifications();
    connectSSE();

    return () => {
      unmountedRef.current = true;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (retryTimeout.current) {
        clearTimeout(retryTimeout.current);
        retryTimeout.current = null;
      }
    };
  }, [fetchNotifications, connectSSE]);

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
        setHasMore(data.pagination?.hasMore ?? false);
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