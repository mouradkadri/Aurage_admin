'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { handleApiCall, toastApiError, toastNetworkError } from '@/lib/apiError';

export interface ProductImage {
  image_url: string;
  alt_text: string;
  is_primary: boolean;
}
export interface BilingualField {
  en: string;
  fr: string;
}
export interface Product {
  _id: string;
  name: BilingualField;
  description: BilingualField;
  scent_description?: BilingualField;
  features?: BilingualField;
  base_price: number;
  liquid_stock_quantity: number;
  is_active: boolean;
  slug: string;
  images: ProductImage[];
  created_at?: string;
  updated_at?: string;
}

export interface BottleVariant {
  _id: string;
  name: string;
  sku: string;
  capacity_ml: number;
  price_adjustment: number;
  global_stock_quantity: number;
  image_url?: string;
}

export const useProducts = () => {
  const [products, setProducts]           = useState<Product[]>([]);
  const [bottleVariants, setBottleVariants] = useState<BottleVariant[]>([]);
  const [isLoading, setIsLoading]         = useState(true);

  // ── Fetchers ───────────────────────────────────────────────────────────────

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/proxy/products');
      if (!res.ok) { await toastApiError(res, 'Impossible de charger les produits'); return; }
      const data = await res.json();
      if (data.success) setProducts(data.data);
    } catch (err) {
      toastNetworkError(err);
    }
  };

  const fetchVariants = async () => {
    try {
      const res = await fetch('/api/proxy/products/bottle-variants');
      if (!res.ok) { await toastApiError(res, 'Impossible de charger les flacons'); return; }
      const data = await res.json();
      if (data.success) setBottleVariants(data.data);
    } catch (err) {
      toastNetworkError(err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setIsLoading(true);
      await Promise.all([fetchProducts(), fetchVariants()]);
      setIsLoading(false);
    };
    loadAll();
  }, []);

  // ── Product CRUD ───────────────────────────────────────────────────────────

  const createProduct = async (formData: FormData): Promise<boolean> => {
    try {
      const res = await fetch('/api/proxy/products/create', { method: 'POST', body: formData });
      if (!res.ok) { await toastApiError(res, 'Impossible de créer le produit'); return false; }
      toast.success('Produit créé avec succès');
      await fetchProducts();
      return true;
    } catch (err) {
      toastNetworkError(err);
      return false;
    }
  };

  const updateProduct = async (id: string, formData: FormData): Promise<boolean> => {
    try {
      const res = await fetch(`/api/proxy/products/${id}`, { method: 'PATCH', body: formData });
      if (!res.ok) { await toastApiError(res, 'Impossible de modifier le produit'); return false; }
      toast.success('Produit mis à jour');
      await fetchProducts();
      return true;
    } catch (err) {
      toastNetworkError(err);
      return false;
    }
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/proxy/products/${id}`, { method: 'DELETE' });
      if (!res.ok) { await toastApiError(res, 'Impossible de supprimer le produit'); return false; }
      toast.success('Produit supprimé');
      await fetchProducts();
      return true;
    } catch (err) {
      toastNetworkError(err);
      return false;
    }
  };

  const getProductById = async (id: string): Promise<Product | null> => {
    const local = products.find(p => p._id === id);
    if (local) return local;
    try {
      const res = await fetch(`/api/proxy/products/${id}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data.success ? data.data : null;
    } catch {
      return null;
    }
  };

  // ── Bottle variant CRUD ────────────────────────────────────────────────────

  const createBottleVariant = async (formData: FormData): Promise<boolean> => {
    try {
      const res = await fetch('/api/proxy/products/bottle-variants/create', { method: 'POST', body: formData });
      if (!res.ok) { await toastApiError(res, 'Impossible de créer le flacon'); return false; }
      toast.success('Flacon créé avec succès');
      await fetchVariants();
      return true;
    } catch (err) {
      toastNetworkError(err);
      return false;
    }
  };

  const updateBottleVariant = async (id: string, formData: FormData): Promise<boolean> => {
    try {
      const res = await fetch(`/api/proxy/products/bottle-variants/${id}`, { method: 'PATCH', body: formData });
      if (!res.ok) { await toastApiError(res, 'Impossible de modifier le flacon'); return false; }
      toast.success('Flacon mis à jour');
      await fetchVariants();
      return true;
    } catch (err) {
      toastNetworkError(err);
      return false;
    }
  };

  const deleteBottleVariant = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/proxy/products/bottle-variants/${id}`, { method: 'DELETE' });
      if (!res.ok) { await toastApiError(res, 'Impossible de supprimer le flacon'); return false; }
      toast.success('Flacon supprimé');
      await fetchVariants();
      return true;
    } catch (err) {
      toastNetworkError(err);
      return false;
    }
  };

  return {
    products,
    bottleVariants,
    isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
    createBottleVariant,
    updateBottleVariant,
    deleteBottleVariant,
    getProductById,
  };
};