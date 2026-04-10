'use client';

import { useState, useEffect } from 'react';

export interface ProductImage {
  image_url: string;
  alt_text: string;
  is_primary: boolean;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  base_price: number;
  liquid_stock_quantity: number;
  is_active: boolean;
  slug: string;
  images: ProductImage[];
}

// 1. ADDED: Export the missing BottleVariant interface
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
  const [products, setProducts] = useState<Product[]>([]);
  // 2. RENAMED: Changed 'variants' to 'bottleVariants' to match UI
  const [bottleVariants, setBottleVariants] = useState<BottleVariant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- FETCHERS ---
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/proxy/products');
      const data = await res.json();
      if (data.success) setProducts(data.data);
    } catch (err) {
      console.error("Failed to fetch products", err);
    }
  };

  const fetchVariants = async () => {
    try {
      const res = await fetch('/api/proxy/products/bottle-variants');
      const data = await res.json();
      if (data.success) setBottleVariants(data.data);
    } catch (err) {
      console.error("Failed to fetch variants", err);
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

  // --- PRODUCT ACTIONS ---
  const createProduct = async (formData: FormData) => {
    const res = await fetch('/api/proxy/products/create', { method: 'POST', body: formData });
    if (res.ok) fetchProducts();
    return res.ok;
  };

  const updateProduct = async (id: string, formData: FormData) => {
    const res = await fetch(`/api/proxy/products/${id}`, { method: 'PATCH', body: formData });
    if (res.ok) fetchProducts();
    return res.ok;
  };

  const deleteProduct = async (id: string) => {
    const res = await fetch(`/api/proxy/products/${id}`, { method: 'DELETE' });
    if (res.ok) fetchProducts();
    return res.ok;
  };

  const getProductById = async (id: string) => {
    const localProduct = products.find(p => p._id === id);
    if (localProduct) return localProduct;
    const res = await fetch(`/api/proxy/products/${id}`);
    const data = await res.json();
    return data.success ? data.data : null;
  };

  // --- BOTTLE VARIANT ACTIONS ---
  // UPDATED: Now accepts FormData to support image uploads
 // useProducts.ts
const createBottleVariant = async (formData: FormData) => {
  const res = await fetch('/api/proxy/products/bottle-variants/create', { 
    method: 'POST', 
    body: formData // Let the browser set the boundary for multipart/form-data
  });
  
  const resData = await res.json();
  if (!res.ok) {
    console.error("Variant Creation Failed:", resData);
    return false;
  }
  
  await fetchVariants();
  return true;
};

const updateBottleVariant = async (id: string, formData: FormData) => {
  const res = await fetch(`/api/proxy/products/bottle-variants/${id}`, { 
    method: 'PATCH', 
    // DO NOT set Content-Type header here; let the browser 
    // automatically set it with the correct boundary for FormData
    body: formData 
  });

  const resData = await res.json();
  if (!res.ok) {
    console.error("[HOOK] Variant update failed:", resData);
    return false;
  }
  
  await fetchVariants();
  return true;
};

  const deleteBottleVariant = async (id: string) => {
    const res = await fetch(`/api/proxy/products/bottle-variants/${id}`, { method: 'DELETE' });
    if (res.ok) fetchVariants();
    return res.ok;
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
    getProductById 
  };
};