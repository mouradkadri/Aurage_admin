'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadCloud, X, Loader2, Info, Trash2, Layers, Plus } from 'lucide-react';
import { Collection } from '@/hooks/useCollections';
import { useProducts } from '@/hooks/useProducts'; 
import { usePacks } from '@/hooks/usePacks'; 

interface CollectionFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<boolean>;
  initialData?: Collection | null;
}

interface ImageItem {
  url: string;
  file?: File;
  isNew: boolean;
}

interface ContentItem {
  tempId: string;
  onModel: 'Product' | 'Pack';
  item: string; // The ID of the Product or Pack
}

const DESC_MAX_LENGTH = 500;

export const CollectionFormDrawer: React.FC<CollectionFormDrawerProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  // Fetch both Products and Packs to populate the dropdowns
  const { products } = useProducts();
  const { packs } = usePacks();

  const[isSubmitting, setIsSubmitting] = useState(false);
  const [imageItem, setImageItem] = useState<ImageItem | null>(null);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const[formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name || '',
          description: initialData.description || '',
          is_active: initialData.is_active ?? true,
        });

        if (initialData.image?.url) {
          setImageItem({ url: initialData.image.url, isNew: false });
        } else {
          setImageItem(null);
        }

        if (initialData.items) {
          const initialContent = initialData.items.map(i => ({
            tempId: Math.random().toString(36),
            onModel: i.onModel,
            item: i.item?._id || '', 
          }));
          setContentItems(initialContent);
        }
      } else {
        resetForm();
      }
    }
  }, [initialData, isOpen]);

  const resetForm = () => {
    setFormData({ name: '', description: '', is_active: true });
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
    if (imageItem?.isNew) URL.revokeObjectURL(imageItem.url);
    setImageItem(null);
  };
  
  // --- Content Management Handlers ---
  const addContentItem = () => {
    setContentItems(prev =>[...prev, { tempId: Math.random().toString(36), onModel: 'Product', item: '' }]);
  };

  const updateContentItem = (tempId: string, field: 'onModel' | 'item', value: string) => {
    setContentItems(prev => prev.map(i => {
      if (i.tempId === tempId) {
        // If they change the type (Product <-> Pack), reset the selected item ID
        if (field === 'onModel' && i.onModel !== value) {
          return { ...i, onModel: value as 'Product' | 'Pack', item: '' };
        }
        return { ...i,[field]: value };
      }
      return i;
    }));
  };
  
  const removeContentItem = (tempId: string) => {
    setContentItems(prev => prev.filter(i => i.tempId !== tempId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (contentItems.some(i => !i.item)) {
        alert("Please select a specific Product or Pack for every row.");
        return;
    }
    
    setIsSubmitting(true);

    const data = new FormData();
    data.append('name', formData.name);
    data.append('description', formData.description);
    data.append('is_active', String(formData.is_active));

    if (imageItem?.isNew && imageItem.file) {
      data.append('image', imageItem.file);
    }
    
    // Map content down to what the backend expects
    const finalContent = contentItems.map(({ item, onModel }) => ({ item, onModel }));
    data.append('items', JSON.stringify(finalContent));

    const success = await onSubmit(data);
    if (success) onClose(); 
    setIsSubmitting(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col bg-zinc-50 dark:bg-zinc-950 border-l">
        
        <SheetHeader className="px-8 py-6 border-b bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
          <SheetTitle className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {initialData ? 'Edit Collection' : 'Create New Collection'}
          </SheetTitle>
          <SheetDescription className="text-zinc-500 dark:text-zinc-400 mt-1.5">
            {initialData ? 'Update details and modify items in this collection.' : 'Group products and packs into a new collection.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <form id="collection-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* General Information */}
            <section className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border shadow-sm space-y-6">
               <div className="flex items-center gap-2 mb-2">
                <Info className="w-5 h-5 text-zinc-400" />
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Collection Details</h3>
              </div>
              <div>
                <Label>Collection Name</Label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Summer Essentials" />
              </div>
               <div>
                <Label>Description</Label>
                <Textarea rows={3} maxLength={DESC_MAX_LENGTH} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
               <div className="flex items-center justify-between p-4 rounded-xl border bg-zinc-50 dark:bg-zinc-950/50">
                  <Label>Make Collection Active</Label>
                  <Switch checked={formData.is_active} onCheckedChange={checked => setFormData({...formData, is_active: checked})} />
               </div>
            </section>

            {/* Collection Items (Products & Packs) */}
            <section className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-zinc-400" />
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Included Items</h3>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={addContentItem}>
                  <Plus className="w-4 h-4 mr-2" /> Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {contentItems.map((item) => (
                  <div key={item.tempId} className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg border bg-zinc-50 dark:bg-zinc-950/50">
                    
                    {/* Select Type (Product or Pack) */}
                    <div className="col-span-4">
                       <Select value={item.onModel} onValueChange={(val: 'Product' | 'Pack') => updateContentItem(item.tempId, 'onModel', val)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Product">Product</SelectItem>
                            <SelectItem value="Pack">Pack</SelectItem>
                          </SelectContent>
                        </Select>
                    </div>

                    {/* Select the specific Item based on Type */}
                    <div className="col-span-6">
                       <Select required value={item.item} onValueChange={(val) => updateContentItem(item.tempId, 'item', val)}>
                          <SelectTrigger><SelectValue placeholder={`Select ${item.onModel}...`} /></SelectTrigger>
                          <SelectContent>
                            {item.onModel === 'Product' 
                              ? products.map(p => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)
                              : packs.map(p => <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>)
                            }
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
                 {contentItems.length === 0 && <p className="text-center text-sm text-zinc-500 py-4">This collection is empty.</p>}
              </div>
            </section>
            
            {/* Media Upload */}
            <section className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border shadow-sm space-y-4">
               <h3 className="font-semibold">Cover Image</h3>
               {!imageItem ? (
                 <div className="relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-amber-400" onClick={() => fileInputRef.current?.click()}>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0" />
                    <UploadCloud className="mx-auto w-10 h-10 text-zinc-400 mb-2" />
                    <p className="text-sm">Click to upload or drag & drop</p>
                 </div>
               ) : (
                 <div className="relative w-40 h-40 rounded-lg overflow-hidden group">
                    <img src={imageItem.url} alt="Cover preview" className="w-full h-full object-cover" />
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
          <Button type="submit" form="collection-form" disabled={isSubmitting} className="bg-amber-500 hover:bg-amber-600 text-white">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (initialData ? 'Save Changes' : 'Create Collection')}
          </Button>
        </SheetFooter>

      </SheetContent>
    </Sheet>
  );
};