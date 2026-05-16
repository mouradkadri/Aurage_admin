'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { toastApiError, toastNetworkError } from '@/lib/apiError';

// Define the shape of a single item within a Pack's content array.
export interface BilingualField {
  en: string;
  fr: string;
}

export interface PackContentDetail {
  _id: string;
  product: {
    _id: string;
    name: BilingualField;
  };
  quantity: number;
}

// Define the shape of the Pack object returned from the API.
export interface Pack {
  _id: string;
  name: BilingualField;
  slug: string;
  description: BilingualField;
  price: number;
  is_active: boolean;
  image?: {
    url: string;
    public_id: string;
  };
  content: PackContentDetail[];
  created_at: string;
  updated_at: string;
}

/**
 * Custom hook for managing "Pack" data via API calls.
 * It handles fetching, creating, updating, and deleting packs.
 */
export const usePacks = () => {
  const [packs, setPacks]         = useState<Pack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  /**
   * Fetches all packs from the backend and updates the state.
   */
  const fetchPacks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/proxy/packs');

      if (!response.ok) {
        const msg = await toastApiError(response, 'Impossible de charger les packs');
        setError(msg);
        return;
      }

      const data = await response.json();
      if (!data.success) {
        const msg = data.message || 'Impossible de charger les packs';
        toast.error(msg);
        setError(msg);
        return;
      }

      setPacks(data.data);
    } catch (err) {
      toastNetworkError(err);
      setError('Erreur réseau');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial data fetch when the hook is first used.
  useEffect(() => {
    fetchPacks();
  }, [fetchPacks]);

  /**
   * Creates a new pack using FormData.
   */
  const createPack = async (formData: FormData): Promise<boolean> => {
    try {
      const response = await fetch('/api/proxy/packs', {
        method: 'POST',
        body:   formData,
      });

      if (!response.ok) {
        await toastApiError(response, 'Impossible de créer le pack');
        return false;
      }

      toast.success('Pack créé avec succès');
      await fetchPacks();
      return true;
    } catch (err) {
      toastNetworkError(err);
      return false;
    }
  };

  /**
   * Updates an existing pack using its ID and FormData.
   */
  const updatePack = async (id: string, formData: FormData): Promise<boolean> => {
    try {
      const response = await fetch(`/api/proxy/packs/${id}`, {
        method: 'PATCH',
        body:   formData,
      });

      if (!response.ok) {
        await toastApiError(response, 'Impossible de modifier le pack');
        return false;
      }

      toast.success('Pack mis à jour');
      await fetchPacks();
      return true;
    } catch (err) {
      toastNetworkError(err);
      return false;
    }
  };

  /**
   * Deletes a pack by its ID.
   */
  const deletePack = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/proxy/packs/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        await toastApiError(response, 'Impossible de supprimer le pack');
        return false;
      }

      toast.success('Pack supprimé');
      // Optimistic local removal for instant UI feedback
      setPacks(prevPacks => prevPacks.filter(pack => pack._id !== id));
      return true;
    } catch (err) {
      toastNetworkError(err);
      return false;
    }
  };

  return {
    packs,
    isLoading,
    error,
    createPack,
    updatePack,
    deletePack,
    refetchPacks: fetchPacks,
  };
};