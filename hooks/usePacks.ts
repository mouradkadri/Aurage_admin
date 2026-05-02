// hooks/usePacks.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

// Define the shape of a single item within a Pack's content array.
// The backend will populate the 'product' and 'bottle' details.
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
  const [packs, setPacks] = useState<Pack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches all packs from the backend and updates the state.
   * useCallback is used to prevent this function from being recreated on every render.
   */
  const fetchPacks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/proxy/packs');
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch packs.');
      }
      
      setPacks(data.data);
    } catch (err: any) {
      console.error("Fetch Packs Error:", err);
      setError(err.message);
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
   * @param {FormData} formData - The pack data, including a potential image file.
   * @returns {Promise<boolean>} - True if creation was successful, false otherwise.
   */
  const createPack = async (formData: FormData): Promise<boolean> => {
    try {
      const response = await fetch('/api/proxy/packs', {
        method: 'POST',
        body: formData, // The browser will set the correct Content-Type for FormData
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Backend Error Detail:", errorData);
        throw new Error(errorData.message || 'Failed to create pack.');
      }

      await fetchPacks(); // Refresh the list of packs after creation
      return true;
    } catch (err) {
      console.error("Create Pack Error:", err);
      return false;
    }
  };

  /**
   * Updates an existing pack using its ID and FormData.
   * @param {string} id - The ID of the pack to update.
   * @param {FormData} formData - The updated data for the pack.
   * @returns {Promise<boolean>} - True if the update was successful, false otherwise.
   */
  const updatePack = async (id: string, formData: FormData): Promise<boolean> => {
    try {
      const response = await fetch(`/api/proxy/packs/${id}`, {
        method: 'PATCH',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update pack.');
      }

      await fetchPacks(); // Refresh the list after updating
      return true;
    } catch (err) {
      console.error("Update Pack Error:", err);
      return false;
    }
  };

  /**
   * Deletes a pack by its ID.
   * @param {string} id - The ID of the pack to delete.
   * @returns {Promise<boolean>} - True if deletion was successful, false otherwise.
   */
  const deletePack = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/proxy/packs/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete pack.');
      }

      // Instead of refetching, we can filter the state for a faster UI update.
      setPacks(prevPacks => prevPacks.filter(pack => pack._id !== id));
      return true;
    } catch (err) {
      console.error("Delete Pack Error:", err);
      return false;
    }
  };

  // Expose the state and action functions to the component.
  return {
    packs,
    isLoading,
    error,
    createPack,
    updatePack,
    deletePack,
    refetchPacks: fetchPacks 
  };
};