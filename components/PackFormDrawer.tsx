'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadCloud, X, Loader2, DollarSign, Info, Trash2, PackagePlus, Plus } from 'lucide-react';
import { Pack } from '@/hooks/usePacks';
import { useProducts } from '@/hooks/useProducts'; // Removed BottleVariant import

interface PackFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<boolean>;
  initialData?: Pack | null;
}

interface ImageItem {
  url: string;
  file?: File;
  isNew: boolean;
}

// Type for managing the pack's content in the form state
interface ContentItem {
  // Use a temporary unique id for React keys
  tempId: string;
  product: string; // Will store the product's _id
}

const DESC_MAX_LENGTH = 500;

export const PackFormDrawer: React.FC<PackFormDrawerProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  // Fetch all products to populate the dropdowns (Bottle variants removed)
  const { products } = useProducts();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageItem, setImageItem] = useState<ImageItem | null>(null);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    is_active: true,
  });

  // Effect to populate the form when it opens (for creating or editing)
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          price: initialData.price?.toString() || '',
          description: initialData.description || '',
          is_active: initialData.is_active ?? true,
        });

        if (initialData.image) {
          setImageItem({ url: initialData.image.url, isNew: false });
        } else {
          setImageItem(null);
        }

        if (initialData.content) {
          // Map backend content (which now only has products) to UI state
          const initialContent = initialData.content.map(item => ({
            tempId: Math.random().toString(36),
            product: item.product._id,
          }));
          setContentItems(initialContent);
        }

      } else {
        // Reset form for "Create" mode
        resetForm();
      }
    }
  }, [initialData, isOpen]);

  const resetForm = () => {
    setFormData({ name: '', price: '', description: '', is_active: true });
    setImageItem(null);
    setContentItems([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageItem({ url: URL.createObjectURL(file), file, isNew: true });
    }
  };

  const removeImage = () => {
    if (imageItem?.isNew) {
      URL.revokeObjectURL(imageItem.url);
    }
    setImageItem(null);
  };
  
  // --- Content Management Handlers ---
  const addContentItem = () => {
    // Add a new empty row for the user to select a product
    setContentItems(prev =>[...prev, { tempId: Math.random().toString(36), product: '' }]);
  };

  const updateContentItem = (tempId: string, field: 'product', value: string) => {
    setContentItems(prev => prev.map(item => 
      item.tempId === tempId ? { ...item, [field]: value } : item
    ));
  };
  
  const removeContentItem = (tempId: string) => {
    setContentItems(prev => prev.filter(item => item.tempId !== tempId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation for content: check if a product is selected
    if (contentItems.some(item => !item.product)) {
        alert("Please ensure a product is selected for every item in the pack.");
        return;
    }
    
    setIsSubmitting(true);

    const data = new FormData();
    data.append('name', formData.name);
    data.append('price', formData.price);
    data.append('description', formData.description);
    data.append('is_active', String(formData.is_active));

    // Append image file only if it's a new one
    if (imageItem?.isNew && imageItem.file) {
      data.append('image', imageItem.file);
    }
    
    // Stringify and append the content array (only product IDs now)
    const finalContent = contentItems.map(({ product }) => ({ product }));
    data.append('content', JSON.stringify(finalContent));

    const success = await onSubmit(data);
    if (success) {
      onClose(); // Parent will reset the state
    }
    setIsSubmitting(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col bg-zinc-50 dark:bg-zinc-950 border-l">
        
        <SheetHeader className="px-8 py-6 border-b bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
          <SheetTitle className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {initialData ? 'Edit Pack' : 'Create New Pack'}
          </SheetTitle>
          <SheetDescription className="text-zinc-500 dark:text-zinc-400 mt-1.5">
            {initialData ? 'Update details for this product bundle.' : 'Create a new product bundle.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <form id="pack-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* --- General Information --- */}
            <section className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border shadow-sm space-y-6">
               <div className="flex items-center gap-2 mb-2">
                <Info className="w-5 h-5 text-zinc-400" />
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Pack Details</h3>
              </div>
              <div>
                <Label>Pack Name</Label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <Label>Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <Input required type="number" step="0.01" min="0" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="pl-9" />
                </div>
              </div>
               <div>
                <Label>Description</Label>
                <Textarea rows={3} maxLength={DESC_MAX_LENGTH} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
               <div className="flex items-center justify-between p-4 rounded-xl border bg-zinc-50 dark:bg-zinc-950/50">
                  <Label>Make Pack Active</Label>
                  <Switch checked={formData.is_active} onCheckedChange={checked => setFormData({...formData, is_active: checked})} />
               </div>
            </section>

            {/* --- Pack Content --- */}
            <section className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PackagePlus className="w-5 h-5 text-zinc-400" />
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Pack Content</h3>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addContentItem}>
                  <Plus className="w-4 h-4 mr-2" /> Add Product
                </Button>
              </div>

              <div className="space-y-3">
                {contentItems.map((item) => (
                  <div key={item.tempId} className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg border bg-zinc-50 dark:bg-zinc-950/50">
                    
                    {/* Expanded column width since bottle is removed */}
                    <div className="col-span-10">
                       <Select required value={item.product} onValueChange={(value) => updateContentItem(item.tempId, 'product', value)}>
                          <SelectTrigger><SelectValue placeholder="Select Product..." /></SelectTrigger>
                          <SelectContent>
                            {products.map(p => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                    </div>
                    
                    <div className="col-span-2 flex justify-end">
                      <Button type="button" variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => removeContentItem(item.tempId)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                 {contentItems.length === 0 && <p className="text-center text-sm text-zinc-500 py-4">This pack is empty. Add a product to get started.</p>}
              </div>
            </section>
            
            {/* --- Media Upload --- */}
            <section className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border shadow-sm space-y-4">
               <h3 className="font-semibold">Pack Image</h3>
               {!imageItem ? (
                 <div className="relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-amber-400" onClick={() => fileInputRef.current?.click()}>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0" />
                    <UploadCloud className="mx-auto w-10 h-10 text-zinc-400 mb-2" />
                    <p className="text-sm">Click to upload or drag & drop</p>
                 </div>
               ) : (
                 <div className="relative w-40 h-40 rounded-lg overflow-hidden group">
                    <img src={imageItem.url} alt="Pack preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={removeImage} className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100">
                      <X className="w-4 h-4" />
                    </button>
                 </div>
               )}
            </section>

          </form>
        </div>

        <SheetFooter className="px-8 py-5 border-t bg-white dark:bg-zinc-950 sticky bottom-0 z-10">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" form="pack-form" disabled={isSubmitting} className="bg-amber-500 hover:bg-amber-600 text-white">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (initialData ? 'Save Changes' : 'Create Pack')}
          </Button>
        </SheetFooter>

      </SheetContent>
    </Sheet>
  );
};