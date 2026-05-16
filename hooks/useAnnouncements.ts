'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { toastApiError, toastNetworkError } from '@/lib/apiError';

export interface BilingualField {
  en: string;
  fr: string;
}

export interface Announcement {
  _id: string;
  text: BilingualField;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [error, setError]                 = useState<string | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/proxy/Announcements');
      if (!res.ok) {
        const msg = await toastApiError(res, 'Impossible de charger les annonces');
        setError(msg);
        return;
      }
      const data = await res.json();
      if (data.success) setAnnouncements(data.data);
    } catch (err) {
      toastNetworkError(err);
      setError('Erreur réseau');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const createAnnouncement = async (text: BilingualField): Promise<boolean> => {
    try {
      const res = await fetch('/api/proxy/Announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, is_active: true, display_order: announcements.length }),
      });
      if (!res.ok) { await toastApiError(res, "Impossible de créer l'annonce"); return false; }
      toast.success('Annonce créée');
      await fetchAnnouncements();
      return true;
    } catch (err) {
      toastNetworkError(err);
      return false;
    }
  };

  const updateAnnouncement = async (id: string, text: BilingualField): Promise<boolean> => {
    try {
      const res = await fetch(`/api/proxy/Announcements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) { await toastApiError(res, "Impossible de modifier l'annonce"); return false; }
      toast.success('Annonce mise à jour');
      await fetchAnnouncements();
      return true;
    } catch (err) {
      toastNetworkError(err);
      return false;
    }
  };

  const toggleAnnouncement = async (id: string): Promise<boolean> => {
    // Optimistic update
    setAnnouncements(prev => prev.map(a => a._id === id ? { ...a, is_active: !a.is_active } : a));
    try {
      const res = await fetch(`/api/proxy/Announcements/${id}/toggle`, { method: 'PATCH' });
      if (!res.ok) {
        await toastApiError(res, "Impossible de modifier l'annonce");
        await fetchAnnouncements(); // revert
        return false;
      }
      return true;
    } catch (err) {
      toastNetworkError(err);
      await fetchAnnouncements(); // revert
      return false;
    }
  };

  const deleteAnnouncement = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/proxy/Announcements/${id}`, { method: 'DELETE' });
      if (!res.ok) { await toastApiError(res, "Impossible de supprimer l'annonce"); return false; }
      toast.success('Annonce supprimée');
      setAnnouncements(prev => prev.filter(a => a._id !== id));
      return true;
    } catch (err) {
      toastNetworkError(err);
      return false;
    }
  };

  return {
    announcements, isLoading, error,
    createAnnouncement, updateAnnouncement, toggleAnnouncement, deleteAnnouncement,
    refetch: fetchAnnouncements,
  };
}