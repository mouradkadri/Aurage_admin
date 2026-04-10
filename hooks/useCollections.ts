// hooks/useCollections.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

// --- INTERFACES ---

// This represents an item inside the collection (Product or Pack)
export interface CollectionItem {
  _id: string;
  item: any; // After population, this will be a Product or Pack object
  onModel: 'Product' | 'Pack';
}

export interface Collection {
  _id: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  image?: {
    url: string;
    public_id: string;
  };
  items: CollectionItem[];
  created_at: string;
  updated_at: string;
}

export const useCollections = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- 1. FETCH ALL COLLECTIONS ---
  const fetchCollections = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/proxy/collections');
      const data = await res.json();
      if (data.success) {
        setCollections(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch collections');
      }
    } catch (err: any) {
      console.error("Fetch Collections Error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // --- 2. CREATE COLLECTION ---
  const createCollection = async (formData: FormData): Promise<boolean> => {
    try {
      const res = await fetch('/api/proxy/collections', {
        method: 'POST',
        body: formData, // Contains name, description, and image file
      });
      if (res.ok) {
        await fetchCollections();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Create Collection Error:", err);
      return false;
    }
  };

  // --- 3. UPDATE COLLECTION ---
  const updateCollection = async (id: string, formData: FormData): Promise<boolean> => {
    try {
      const res = await fetch(`/api/proxy/collections/${id}`, {
        method: 'PATCH',
        body: formData,
      });
      if (res.ok) {
        await fetchCollections();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Update Collection Error:", err);
      return false;
    }
  };

  // --- 4. DELETE COLLECTION ---
   const deleteCollection = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/proxy/collections/${id}`, {
        method: 'DELETE',
      });
      
      if (res.ok) {
        // FIX: Force a fresh fetch from the backend. 
        // This ensures the table re-renders instantly without needing a manual refresh.
        await fetchCollections(); 
        return true;
      }
      
      const errorData = await res.json();
      console.error("Delete Collection Error:", errorData);
      return false;
    } catch (err) {
      console.error("Delete Collection Network Error:", err);
      return false;
    }
  };

  // --- 5. ADD ITEM (PRODUCT OR PACK) TO COLLECTION ---
  /**
   * @param collectionId ID of the collection
   * @param itemId ID of the Product or Pack
   * @param type Must be 'Product' or 'Pack'
   */
  const addItemToCollection = async (
    collectionId: string, 
    itemId: string, 
    type: 'Product' | 'Pack'
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/proxy/collections/${collectionId}/add-item`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, onModel: type }),
      });

      if (res.ok) {
        await fetchCollections();
        return true;
      }
      const data = await res.json();
      console.error("Add Item Error:", data.message);
      return false;
    } catch (err) {
      console.error("Add Item Network Error:", err);
      return false;
    }
  };

  // --- 6. REMOVE ITEM FROM COLLECTION ---
  const removeItemFromCollection = async (
    collectionId: string, 
    itemId: string
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/proxy/collections/${collectionId}/remove-item`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });

      if (res.ok) {
        await fetchCollections();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Remove Item Error:", err);
      return false;
    }
  };

  // --- 7. GET SINGLE COLLECTION BY ID (LOCAL) ---
  const getCollectionById = (id: string) => {
    return collections.find(c => c._id === id);
  };

  return {
    collections,
    isLoading,
    error,
    createCollection,
    updateCollection,
    deleteCollection,
    addItemToCollection,
    removeItemFromCollection,
    getCollectionById,
    refetchCollections: fetchCollections
  };
};