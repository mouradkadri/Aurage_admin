'use client';

import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Cylinder, DollarSign, Package, UploadCloud, X, Loader2 } from 'lucide-react';
import { BottleVariant } from '@/hooks/useProducts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<boolean>;
  initialData?: BottleVariant | null;
}

export const BottleVariantFormDrawer = ({ isOpen, onClose, onSubmit, initialData }: Props) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
  name: '',
  capacity_ml: '',
  price_adjustment: '',
  global_stock_quantity: '',
});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        capacity_ml: initialData.capacity_ml.toString(),
        price_adjustment: initialData.price_adjustment.toString(),
        global_stock_quantity: initialData.global_stock_quantity.toString(),
      });
      setImagePreview(initialData.image_url || null);
    } else {
      setFormData({ name: '', capacity_ml: '', price_adjustment: '', global_stock_quantity: '' });
      setImagePreview(null);
    }
  }, [initialData, isOpen]);

  // BottleVariantFormDrawer.tsx - handleSubmit
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  
  const data = new FormData();
  data.append('name', formData.name);
  data.append('sku', initialData?.sku || `${formData.name.toLowerCase().replace(/\s+/g, '-')}-${Math.floor(Math.random()*1000)}`);
  data.append('capacity_ml', formData.capacity_ml);
  data.append('price_adjustment', formData.price_adjustment);
  data.append('global_stock_quantity', formData.global_stock_quantity);
  data.append('is_active', 'true');
  
  if (imageFile) {
    data.append('image', imageFile); // Ensure this matches upload.single('image') in your backend route
  }

  // --- LOGGING ---
  // Before submitting, log the FormData to the console to see if fields exist
  for (let [key, value] of (data as any).entries()) {
    console.log(`[FORM DATA] ${key}:`, value);
  }

  const success = await onSubmit(data); 
  if (success) onClose();
  setLoading(false);
};
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl p-0 flex flex-col bg-zinc-50 dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl">
        <SheetHeader className="px-8 py-6 border-b border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 z-10">
          <SheetTitle>{initialData ? 'Edit Bottle Model' : 'New Bottle Variant'}</SheetTitle>
          <SheetDescription>Configure global stock for specific bottle sizes and styles.</SheetDescription>
        </SheetHeader>

        {/* Changed: Form now wraps everything to support 'submit' on button */}
        <form id="variant-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200/60 dark:border-zinc-800 shadow-sm space-y-5">
            <div className="space-y-2">
              <Label>Bottle Name / Model</Label>
              <Input 
                required
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                placeholder="e.g. Italian Crystal 50ml"
                className="rounded-xl h-11 bg-zinc-50 dark:bg-zinc-950" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Capacity (ml)</Label>
                <Input 
                  required
                  type="number" 
                  value={formData.capacity_ml} 
                  onChange={e => setFormData({...formData, capacity_ml: e.target.value})} 
                  placeholder="50"
                  className="rounded-xl h-11 bg-zinc-50 dark:bg-zinc-950" 
                />
              </div>
              <div className="space-y-2">
                <Label>Stock Quantity</Label>
                <Input 
                  required
                  type="number" 
                  value={formData.global_stock_quantity} 
                  onChange={e => setFormData({...formData, global_stock_quantity: e.target.value})} 
                  placeholder="100"
                  className="rounded-xl h-11 bg-zinc-50 dark:bg-zinc-950" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Price Modifier ($)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input 
                  required
                  type="number" 
                  step="0.01"
                  value={formData.price_adjustment} 
                  onChange={e => setFormData({...formData, price_adjustment: e.target.value})} 
                  placeholder="0.00"
                  className="pl-9 rounded-xl h-11 bg-zinc-50 dark:bg-zinc-950" 
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200/60 dark:border-zinc-800 shadow-sm space-y-4">
            <Label>Bottle Image</Label>
            {imagePreview ? (
              <div className="relative aspect-video rounded-2xl overflow-hidden group">
                <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                <button 
                  type="button"
                  onClick={() => {setImagePreview(null); setImageFile(null);}}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <input 
                  type="file" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setImageFile(e.target.files[0]);
                      setImagePreview(URL.createObjectURL(e.target.files[0]));
                    }
                  }} 
                />
                <UploadCloud className="w-8 h-8 text-zinc-300 mb-2" />
                <span className="text-sm font-medium text-zinc-600">Upload Bottle Image</span>
              </div>
            )}
          </div>
        </form>

        <SheetFooter className="p-6 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <Button type="submit" form="variant-form" className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl h-12" disabled={loading}>
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : (initialData ? 'Update Variant' : 'Create Variant')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};