'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Announcement {
  _id: string;
  text: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [error, setError]                 = useState<string | null>(null);

  // ── Fetch all (admin) ─────────────────────────────────────────────────────
  const fetchAnnouncements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/proxy/announcements');
      const data = await res.json();
      if (data.success) {
        setAnnouncements(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // ── Create ────────────────────────────────────────────────────────────────
  const createAnnouncement = async (text: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/proxy/announcements', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text, is_active: true, display_order: announcements.length }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAnnouncements();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // ── Update text ───────────────────────────────────────────────────────────
  const updateAnnouncement = async (id: string, text: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/proxy/announcements/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAnnouncements();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // ── Toggle active ─────────────────────────────────────────────────────────
  const toggleAnnouncement = async (id: string): Promise<boolean> => {
    // Optimistic update
    setAnnouncements(prev =>
      prev.map(a => a._id === id ? { ...a, is_active: !a.is_active } : a)
    );
    try {
      const res = await fetch(`/api/proxy/announcements/${id}/toggle`, { method: 'PATCH' });
      const data = await res.json();
      if (!data.success) {
        await fetchAnnouncements(); // revert
        return false;
      }
      return true;
    } catch {
      await fetchAnnouncements(); // revert
      return false;
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteAnnouncement = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/proxy/announcements/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setAnnouncements(prev => prev.filter(a => a._id !== id));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return {
    announcements,
    isLoading,
    error,
    createAnnouncement,
    updateAnnouncement,
    toggleAnnouncement,
    deleteAnnouncement,
    refetch: fetchAnnouncements,
  };
}