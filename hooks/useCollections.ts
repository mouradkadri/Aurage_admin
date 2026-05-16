'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { toastApiError, toastNetworkError } from '@/lib/apiError';

export interface CollectionItem {
  _id: string;
  item: any;
  onModel: 'Product' | 'Pack';
}
export interface BilingualField {
  en: string;
  fr: string;
}
export interface Collection {
  _id: string;
  name: BilingualField;
  slug: string;
  description: BilingualField;
  is_active: boolean;
  image?: { url: string; public_id: string };
  items: CollectionItem[];
  created_at: string;
  updated_at: string;
}

export const useCollections = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState<string | null>(null);

  const fetchCollections = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/proxy/collections');
      if (!res.ok) {
        const msg = await toastApiError(res, 'Impossible de charger les collections');
        setError(msg);
        return;
      }
      const data = await res.json();
      if (data.success) setCollections(data.data);
    } catch (err) {
      toastNetworkError(err);
      setError('Erreur réseau');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchCollections(); }, [fetchCollections]);

  const createCollection = async (formData: FormData): Promise<boolean> => {
    try {
      const res = await fetch('/api/proxy/collections', { method: 'POST', body: formData });
      if (!res.ok) { await toastApiError(res, 'Impossible de créer la collection'); return false; }
      toast.success('Collection créée avec succès');
      await fetchCollections();
      return true;
    } catch (err) {
      toastNetworkError(err);
      return false;
    }
  };

  const updateCollection = async (id: string, formData: FormData): Promise<boolean> => {
    try {
      const res = await fetch(`/api/proxy/collections/${id}`, { method: 'PATCH', body: formData });
      if (!res.ok) { await toastApiError(res, 'Impossible de modifier la collection'); return false; }
      toast.success('Collection mise à jour');
      await fetchCollections();
      return true;
    } catch (err) {
      toastNetworkError(err);
      return false;
    }
  };

  const deleteCollection = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/proxy/collections/${id}`, { method: 'DELETE' });
      if (!res.ok) { await toastApiError(res, 'Impossible de supprimer la collection'); return false; }
      toast.success('Collection supprimée');
      await fetchCollections();
      return true;
    } catch (err) {
      toastNetworkError(err);
      return false;
    }
  };

  const addItemToCollection = async (collectionId: string, itemId: string, type: 'Product' | 'Pack'): Promise<boolean> => {
    try {
      const res = await fetch(`/api/proxy/collections/${collectionId}/add-item`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, onModel: type }),
      });
      if (!res.ok) { await toastApiError(res, "Impossible d'ajouter l'élément"); return false; }
      toast.success('Élément ajouté à la collection');
      await fetchCollections();
      return true;
    } catch (err) {
      toastNetworkError(err);
      return false;
    }
  };

  const removeItemFromCollection = async (collectionId: string, itemId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/proxy/collections/${collectionId}/remove-item`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      if (!res.ok) { await toastApiError(res, "Impossible de retirer l'élément"); return false; }
      toast.success('Élément retiré de la collection');
      await fetchCollections();
      return true;
    } catch (err) {
      toastNetworkError(err);
      return false;
    }
  };

  const getCollectionById = (id: string) => collections.find(c => c._id === id);

  return {
    collections, isLoading, error,
    createCollection, updateCollection, deleteCollection,
    addItemToCollection, removeItemFromCollection,
    getCollectionById, refetchCollections: fetchCollections,
  };
};