'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  UploadCloud, X, Loader2, DollarSign, Package, 
  Info, ImagePlus, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { Product } from '@/hooks/useProducts';

interface ProductFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<boolean>;
  initialData?: Product | null;
}

interface ImageItem {
  id: string;
  url: string;
  file?: File;
  isNew: boolean;
}

const MAX_IMAGES = 6;
const DESC_MAX_LENGTH = 500;

export const ProductFormDrawer: React.FC<ProductFormDrawerProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    nameEn: '', nameFr: '',
    base_price: '',
    liquid_stock_quantity: '',
    descriptionEn: '', descriptionFr: '',
    scentEn: '', scentFr: '',
    is_active: true,
  });

  // Populate form correctly on edit vs create
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          nameEn: initialData.name?.en || '',
          nameFr: initialData.name?.fr || '',
          base_price: initialData.base_price?.toString() || '',
          liquid_stock_quantity: initialData.liquid_stock_quantity?.toString() || '',
          descriptionEn: initialData.description?.en || '',
          descriptionFr: initialData.description?.fr || '',
          scentEn: initialData.scent_description?.en || '',
          scentFr: initialData.scent_description?.fr || '',
          is_active: initialData.is_active ?? true,
        });

        // Load existing images
        if (initialData.images && initialData.images.length > 0) {
          const existingItems = initialData.images.map(img => ({
            id: Math.random().toString(36).substring(7),
            url: img.image_url,
            isNew: false
          }));
          setImageItems(existingItems);
        } else {
          setImageItems([]);
        }
      } else {
        resetForm();
      }
      setImageError(null);
    }
  },[initialData, isOpen]);

  // Cleanup object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      imageItems.forEach(item => {
        if (item.isNew) URL.revokeObjectURL(item.url);
      });
    };
  }, [imageItems]);

  const resetForm = () => {
    setFormData({
      nameEn: '', nameFr: '', 
      base_price: '', liquid_stock_quantity: '',
      descriptionEn: '', descriptionFr: '', 
      scentEn: '', scentFr: '', 
      is_active: true,
    });
    setImageItems([]);
  };

  const processFiles = useCallback((filesList: File[]) => {
    setImageError(null);
    const currentCount = imageItems.length;
    const availableSlots = MAX_IMAGES - currentCount;
    
    if (availableSlots <= 0) {
      setImageError(`You can only upload up to ${MAX_IMAGES} images.`);
      return;
    }

    const filesToAdd = filesList.slice(0, availableSlots);
    if (filesList.length > availableSlots) {
      setImageError(`Only ${availableSlots} more image(s) added. Maximum is ${MAX_IMAGES}.`);
    }

    const newItems = filesToAdd.map(file => ({
      id: Math.random().toString(36).substring(7),
      url: URL.createObjectURL(file),
      file,
      isNew: true
    }));

    setImageItems(prev => [...prev, ...newItems]);
  }, [imageItems.length]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
      // Reset input so the same files can be selected again if removed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (idToRemove: string) => {
    setImageItems(prev => {
      const item = prev.find(i => i.id === idToRemove);
      if (item?.isNew) URL.revokeObjectURL(item.url);
      return prev.filter(i => i.id !== idToRemove);
    });
    setImageError(null);
  };

  const moveImage = (index: number, direction: 'left' | 'right') => {
    setImageItems(prev => {
      const newItems = [...prev];
      if (direction === 'left' && index > 0) {
        [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
      } else if (direction === 'right' && index < newItems.length - 1) {[newItems[index + 1], newItems[index]] = [newItems[index], newItems[index + 1]];
      }
      return newItems;
    });
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const data = new FormData();
    data.append('name[en]', formData.nameEn);
    data.append('name[fr]', formData.nameFr);
    data.append('base_price', formData.base_price);
    data.append('liquid_stock_quantity', formData.liquid_stock_quantity);
    data.append('description[en]', formData.descriptionEn);
    data.append('description[fr]', formData.descriptionFr);
    data.append('scent_description[en]', formData.scentEn);
    data.append('scent_description[fr]', formData.scentFr);
    data.append('is_active', String(formData.is_active));

    // Append new files
    imageItems.forEach((item) => {
      if (item.isNew && item.file) {
        data.append('images', item.file);
      } else if (!item.isNew) {
        // Depending on backend, you may need to pass an array of kept image URLs
        data.append('retained_images', item.url);
      }
    });

    const success = await onSubmit(data);
    if (success) {
      resetForm();
      onClose();
    }
    setIsSubmitting(false);
  };

  // Helper for live price formatting preview
  const formattedPrice = formData.base_price 
    ? new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND' }).format(Number(formData.base_price))
    : null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* 
        p-0 is applied to allow edge-to-edge header/footer with customized padding.
        sm:max-w-2xl makes it comfortably wide for forms 
      */}
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col bg-zinc-50 dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl">
        
        {/* Sticky Header */}
        <SheetHeader className="px-8 py-6 border-b border-zinc-200/60 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
          <SheetTitle className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {initialData ? 'Edit Product Details' : 'Add New Product'}
          </SheetTitle>
          <SheetDescription className="text-zinc-500 dark:text-zinc-400 mt-1.5">
            {initialData 
              ? 'Update the details, pricing, and imagery for this product.' 
              : 'Provide product information and imagery to add it to your inventory.'}
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <form id="product-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* --- General Information Card --- */}
            <section className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200/60 dark:border-zinc-800 shadow-sm space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-5 h-5 text-zinc-400" />
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">General Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-zinc-600 dark:text-zinc-400 font-medium">Name (FR)</Label>
                  <Input 
                    required 
                    value={formData.nameFr} 
                    onChange={e => setFormData({...formData, nameFr: e.target.value})} 
                    placeholder="e.g. Oud de Minuit" 
                    className="rounded-xl h-11 focus-visible:ring-amber-500 bg-zinc-50 dark:bg-zinc-950"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-600 dark:text-zinc-400 font-medium">Name (EN)</Label>
                  <Input 
                    required 
                    value={formData.nameEn} 
                    onChange={e => setFormData({...formData, nameEn: e.target.value})} 
                    placeholder="e.g. Midnight Oud" 
                    className="rounded-xl h-11 focus-visible:ring-amber-500 bg-zinc-50 dark:bg-zinc-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <Label className="text-zinc-600 dark:text-zinc-400 font-medium">Base Price</Label>
                    {formattedPrice && <span className="text-xs text-amber-600 font-medium">{formattedPrice}</span>}
                  </div>
                  <div className="relative">
                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input 
                      required 
                      type="number" 
                      step="0.01" 
                      min="0" 
                      value={formData.base_price} 
                      onChange={e => setFormData({...formData, base_price: e.target.value})} 
                      placeholder="0.00" 
                      className="pl-9 rounded-xl h-11 focus-visible:ring-amber-500 bg-zinc-50 dark:bg-zinc-950"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-600 dark:text-zinc-400 font-medium">Liquid Stock (ml)</Label>
                  <div className="relative">
                    <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <Input 
                      required 
                      type="number" 
                      min="0" 
                      value={formData.liquid_stock_quantity} 
                      onChange={e => setFormData({...formData, liquid_stock_quantity: e.target.value})} 
                      placeholder="0" 
                      className="pl-9 rounded-xl h-11 focus-visible:ring-amber-500 bg-zinc-50 dark:bg-zinc-950"
                    />
                  </div>
                </div>
              </div>

              {/* Enhanced Switch Component */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
                <div className="space-y-0.5">
                  <Label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 cursor-pointer">
                    Product Visibility
                  </Label>
                  <p className="text-xs text-zinc-500">
                    Make this product available on the storefront immediately.
                  </p>
                </div>
                <Switch 
                  checked={formData.is_active} 
                  onCheckedChange={checked => setFormData({...formData, is_active: checked})} 
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>
            </section>

            {/* --- Details Card --- */}
            <section className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200/60 dark:border-zinc-800 shadow-sm space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-zinc-600 dark:text-zinc-400 font-medium">Description (FR)</Label>
                    <span className={`text-xs ${formData.descriptionFr.length > DESC_MAX_LENGTH ? 'text-red-500' : 'text-zinc-400'}`}>
                      {formData.descriptionFr.length}/{DESC_MAX_LENGTH}
                    </span>
                  </div>
                  <Textarea required rows={4} maxLength={DESC_MAX_LENGTH}
                    value={formData.descriptionFr} 
                    onChange={e => setFormData({...formData, descriptionFr: e.target.value})} 
                    placeholder="Description en français..." 
                    className="rounded-xl resize-none focus-visible:ring-amber-500 bg-zinc-50 dark:bg-zinc-950"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-zinc-600 dark:text-zinc-400 font-medium">Description (EN)</Label>
                    <span className={`text-xs ${formData.descriptionEn.length > DESC_MAX_LENGTH ? 'text-red-500' : 'text-zinc-400'}`}>
                      {formData.descriptionEn.length}/{DESC_MAX_LENGTH}
                    </span>
                  </div>
                  <Textarea required rows={4} maxLength={DESC_MAX_LENGTH}
                    value={formData.descriptionEn} 
                    onChange={e => setFormData({...formData, descriptionEn: e.target.value})} 
                    placeholder="English description..." 
                    className="rounded-xl resize-none focus-visible:ring-amber-500 bg-zinc-50 dark:bg-zinc-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-zinc-600 dark:text-zinc-400 font-medium">Notes Olfactives (FR)</Label>
                  <Textarea rows={2} 
                    value={formData.scentFr} 
                    onChange={e => setFormData({...formData, scentFr: e.target.value})} 
                    placeholder="ex: Tête: Bergamote. Fond: Oud." 
                    className="rounded-xl resize-none focus-visible:ring-amber-500 bg-zinc-50 dark:bg-zinc-950"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-600 dark:text-zinc-400 font-medium">Scent Notes (EN)</Label>
                  <Textarea rows={2} 
                    value={formData.scentEn} 
                    onChange={e => setFormData({...formData, scentEn: e.target.value})} 
                    placeholder="e.g. Top: Bergamot. Base: Oud." 
                    className="rounded-xl resize-none focus-visible:ring-amber-500 bg-zinc-50 dark:bg-zinc-950"
                  />
                </div>
              </div>

            </section>

            {/* --- Media Upload Card --- */}
            <section className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200/60 dark:border-zinc-800 shadow-sm space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ImagePlus className="w-5 h-5 text-zinc-400" />
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Product Media</h3>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  {imageItems.length} / {MAX_IMAGES}
                </span>
              </div>

              {/* Advanced Drag & Drop Zone */}
              {imageItems.length < MAX_IMAGES && (
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`
                    relative border-2 border-dashed rounded-2xl p-8 transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden
                    ${isDragging 
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10' 
                      : 'border-zinc-300 dark:border-zinc-700 hover:border-amber-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 bg-zinc-50 dark:bg-zinc-950'
                    }
                  `}
                >
                  <input 
                    type="file" 
                    multiple 
                    accept="image/png, image/jpeg, image/webp" 
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    title=""
                  />
                  <div className={`p-4 rounded-full mb-3 ${isDragging ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600' : 'bg-white dark:bg-zinc-900 text-zinc-400 shadow-sm border border-zinc-100 dark:border-zinc-800'}`}>
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">
                    Drag and drop images here
                  </p>
                  <p className="text-xs text-zinc-500 mt-1.5">
                    or click to browse from your computer
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-4 uppercase tracking-wider font-semibold">
                    Up to 6 images (PNG, JPG, WebP)
                  </p>
                </div>
              )}

              {/* Error State */}
              {imageError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm border border-red-200 dark:border-red-900/50">
                  {imageError}
                </div>
              )}

              {/* Image Previews Grid */}
              {imageItems.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                  {imageItems.map((item, idx) => (
                    <div 
                      key={item.id} 
                      className="group relative aspect-square rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 shadow-sm transition-transform hover:scale-[1.02]"
                    >
                      <img 
                        src={item.url} 
                        alt={`Preview ${idx + 1}`} 
                        className="w-full h-full object-cover" 
                      />
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                        <div className="flex justify-between w-full">
                          {/* Reordering Controls (Left/Right) */}
                          <div className="flex gap-1">
                            {idx > 0 && (
                              <button 
                                type="button" 
                                onClick={(e) => { e.preventDefault(); moveImage(idx, 'left'); }}
                                className="p-1.5 bg-white/90 dark:bg-black/60 hover:bg-white dark:hover:bg-black text-zinc-800 dark:text-zinc-200 rounded-full backdrop-blur-sm transition-colors"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                            )}
                            {idx < imageItems.length - 1 && (
                              <button 
                                type="button" 
                                onClick={(e) => { e.preventDefault(); moveImage(idx, 'right'); }}
                                className="p-1.5 bg-white/90 dark:bg-black/60 hover:bg-white dark:hover:bg-black text-zinc-800 dark:text-zinc-200 rounded-full backdrop-blur-sm transition-colors"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {/* Delete Button */}
                          <button 
                            type="button" 
                            onClick={(e) => { e.preventDefault(); removeImage(item.id); }}
                            className="p-1.5 bg-red-500/90 hover:bg-red-600 text-white rounded-full backdrop-blur-sm transition-colors shadow-sm"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Tag */}
                        <div className="self-center mb-2">
                          {item.isNew && (
                            <span className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold bg-amber-500 text-white rounded-md shadow-sm">
                              New
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
            
            {/* Added spacing at bottom so it doesn't get hidden behind the sticky footer */}
            <div className="h-4" />
          </form>
        </div>

        {/* Sticky Footer */}
        <SheetFooter className="px-8 py-5 border-t border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky bottom-0 z-10 shrink-0 flex-row justify-end gap-3 sm:space-x-0">
          <Button 
            type="button" 
            variant="ghost" 
            onClick={onClose} 
            disabled={isSubmitting}
            className="rounded-xl font-medium"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="product-form"
            disabled={isSubmitting}
            className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-md shadow-amber-500/20 px-8 transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              initialData ? 'Save Changes' : 'Create Product'
            )}
          </Button>
        </SheetFooter>

      </SheetContent>
    </Sheet>
  );
};