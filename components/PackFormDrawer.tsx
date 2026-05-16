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
import { useProducts } from '@/hooks/useProducts';

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

interface ContentItem {
  tempId: string;
  product: string;
}

interface BilingualField {
  en: string;
  fr: string;
}

const DESC_MAX_LENGTH = 500;

// ─── Bilingual input — defined OUTSIDE the drawer component so its identity
//     is stable across renders. Defining it inside would cause React to treat
//     it as a new component type on every keystroke, unmounting the input and
//     losing focus after each character. ─────────────────────────────────────

interface BilingualInputProps {
  label: string;
  field: BilingualField;
  onChange: (locale: 'en' | 'fr', value: string) => void;
  multiline?: boolean;
  required?: boolean;
  placeholder?: string;
}

const BilingualInput: React.FC<BilingualInputProps> = ({
  label,
  field,
  onChange,
  multiline = false,
  required = false,
  placeholder,
}) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <div className="grid grid-cols-2 gap-3">
      {(['en', 'fr'] as const).map(locale => (
        <div key={locale} className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
            {locale === 'en' ? '🇬🇧 English' : '🇫🇷 Français'}
          </span>
          {multiline ? (
            <Textarea
              rows={3}
              maxLength={DESC_MAX_LENGTH}
              required={required && locale === 'en'}
              value={field[locale]}
              placeholder={locale === 'fr' ? 'Traduction française…' : placeholder}
              onChange={e => onChange(locale, e.target.value)}
            />
          ) : (
            <Input
              required={required && locale === 'en'}
              value={field[locale]}
              placeholder={locale === 'fr' ? 'Traduction française…' : placeholder}
              onChange={e => onChange(locale, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  </div>
);

// ─── Main drawer ──────────────────────────────────────────────────────────────

export const PackFormDrawer: React.FC<PackFormDrawerProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { products } = useProducts();

  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [imageItem, setImageItem]         = useState<ImageItem | null>(null);
  const [contentItems, setContentItems]   = useState<ContentItem[]>([]);
  const fileInputRef                      = useRef<HTMLInputElement>(null);

  const [name, setName]               = useState<BilingualField>({ en: '', fr: '' });
  const [description, setDescription] = useState<BilingualField>({ en: '', fr: '' });

  const [formData, setFormData] = useState({
    price:     '',
    is_active: true,
  });

  const handleNameChange = (locale: 'en' | 'fr', value: string) =>
    setName(prev => ({ ...prev, [locale]: value }));

  const handleDescriptionChange = (locale: 'en' | 'fr', value: string) =>
    setDescription(prev => ({ ...prev, [locale]: value }));

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName({
          en: typeof initialData.name === 'object' ? (initialData.name as BilingualField).en ?? '' : initialData.name ?? '',
          fr: typeof initialData.name === 'object' ? (initialData.name as BilingualField).fr ?? '' : '',
        });
        setDescription({
          en: typeof initialData.description === 'object' ? (initialData.description as BilingualField).en ?? '' : initialData.description ?? '',
          fr: typeof initialData.description === 'object' ? (initialData.description as BilingualField).fr ?? '' : '',
        });
        setFormData({
          price:     initialData.price?.toString() ?? '',
          is_active: initialData.is_active ?? true,
        });
        setImageItem(initialData.image ? { url: initialData.image.url, isNew: false } : null);
        setContentItems(
          (initialData.content ?? []).map(item => ({
            tempId:  Math.random().toString(36),
            product: item.product._id,
          }))
        );
      } else {
        resetForm();
      }
    }
  }, [initialData, isOpen]);

  const resetForm = () => {
    setName({ en: '', fr: '' });
    setDescription({ en: '', fr: '' });
    setFormData({ price: '', is_active: true });
    setImageItem(null);
    setContentItems([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setImageItem({ url: URL.createObjectURL(file), file, isNew: true });
    }
  };

  const removeImage = () => {
    if (imageItem?.isNew) URL.revokeObjectURL(imageItem.url);
    setImageItem(null);
  };

  const addContentItem = () =>
    setContentItems(prev => [...prev, { tempId: Math.random().toString(36), product: '' }]);

  const updateContentItem = (tempId: string, value: string) =>
    setContentItems(prev => prev.map(item => item.tempId === tempId ? { ...item, product: value } : item));

  const removeContentItem = (tempId: string) =>
    setContentItems(prev => prev.filter(item => item.tempId !== tempId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (contentItems.some(item => !item.product)) {
      alert('Please ensure a product is selected for every item in the pack.');
      return;
    }

    setIsSubmitting(true);

    const data = new FormData();
    data.append('name[en]', name.en);
    data.append('name[fr]', name.fr);
    data.append('description[en]', description.en);
    data.append('description[fr]', description.fr);
    data.append('price',     formData.price);
    data.append('is_active', String(formData.is_active));

    if (imageItem?.isNew && imageItem.file) {
      data.append('image', imageItem.file);
    }

    data.append('content', JSON.stringify(contentItems.map(({ product }) => ({ product }))));

    const success = await onSubmit(data);
    if (success) onClose();
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

        {/* FIX 1: sheet-scroll-body class + pb-32 so content scrolls above keyboard */}
        <div className="sheet-scroll-body flex-1 overflow-y-auto p-8 pb-32 custom-scrollbar">
          <form id="pack-form" onSubmit={handleSubmit} className="space-y-8">

            {/* General Information */}
            <section className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border shadow-sm space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-5 h-5 text-zinc-400" />
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Pack Details</h3>
              </div>

              <BilingualInput
                label="Pack Name"
                field={name}
                onChange={handleNameChange}
                required
              />

              <div>
                <Label>Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  {/* FIX 2: inputMode="decimal" → decimal numeric pad on mobile */}
                  <Input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>

              <BilingualInput
                label="Description"
                field={description}
                onChange={handleDescriptionChange}
                multiline
              />

              <div className="flex items-center justify-between p-4 rounded-xl border bg-zinc-50 dark:bg-zinc-950/50">
                <Label>Make Pack Active</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={checked => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </section>

            {/* Pack Content */}
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
                {contentItems.map(item => (
                  <div key={item.tempId} className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg border bg-zinc-50 dark:bg-zinc-950/50">
                    <div className="col-span-10">
                      <Select
                        required
                        value={item.product}
                        onValueChange={value => updateContentItem(item.tempId, value)}
                      >
                        <SelectTrigger><SelectValue placeholder="Select Product…" /></SelectTrigger>
                        <SelectContent>
                          {products.map(p => (
                            <SelectItem key={p._id} value={p._id}>
                              {typeof p.name === 'object' ? (p.name as { en?: string; fr?: string }).en ?? p._id : p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => removeContentItem(item.tempId)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {contentItems.length === 0 && (
                  <p className="text-center text-sm text-zinc-500 py-4">
                    This pack is empty. Add a product to get started.
                  </p>
                )}
              </div>
            </section>

            {/* Media */}
            <section className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border shadow-sm space-y-4">
              <h3 className="font-semibold">Pack Image</h3>
              {!imageItem ? (
                <div
                  className="relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-amber-400"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0"
                  />
                  <UploadCloud className="mx-auto w-10 h-10 text-zinc-400 mb-2" />
                  <p className="text-sm">Click to upload or drag &amp; drop</p>
                </div>
              ) : (
                <div className="relative w-40 h-40 rounded-lg overflow-hidden group">
                  <img src={imageItem.url} alt="Pack preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </section>

          </form>
        </div>

        {/* FIX 3: lg:sticky so footer flows naturally on mobile (no keyboard clash)
                  but stays pinned on desktop where there is no soft keyboard */}
        <SheetFooter className="px-8 py-5 border-t bg-white dark:bg-zinc-950 lg:sticky lg:bottom-0 lg:z-10">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="pack-form"
            disabled={isSubmitting}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isSubmitting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : initialData ? 'Save Changes' : 'Create Pack'
            }
          </Button>
        </SheetFooter>

      </SheetContent>
    </Sheet>
  );
};