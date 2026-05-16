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
  item: string;
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

export const CollectionFormDrawer: React.FC<CollectionFormDrawerProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const { products } = useProducts();
  const { packs }    = usePacks();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageItem, setImageItem]       = useState<ImageItem | null>(null);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const fileInputRef                    = useRef<HTMLInputElement>(null);

  const [name, setName]               = useState<BilingualField>({ en: '', fr: '' });
  const [description, setDescription] = useState<BilingualField>({ en: '', fr: '' });
  const [isActive, setIsActive]       = useState(true);

  // ── Stable onChange handlers ──────────────────────────────────────────────
  const handleNameChange = (locale: 'en' | 'fr', value: string) =>
    setName(prev => ({ ...prev, [locale]: value }));

  const handleDescriptionChange = (locale: 'en' | 'fr', value: string) =>
    setDescription(prev => ({ ...prev, [locale]: value }));

  // ── Populate form on open ──────────────────────────────────────────────────
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
        setIsActive(initialData.is_active ?? true);
        setImageItem(initialData.image?.url ? { url: initialData.image.url, isNew: false } : null);
        setContentItems(
          (initialData.items ?? []).map(i => ({
            tempId:  Math.random().toString(36),
            onModel: i.onModel,
            item:    i.item?._id ?? '',
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
    setIsActive(true);
    setImageItem(null);
    setContentItems([]);
  };

  // ── Image handlers ─────────────────────────────────────────────────────────
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

  // ── Content handlers ───────────────────────────────────────────────────────
  const addContentItem = () =>
    setContentItems(prev => [...prev, { tempId: Math.random().toString(36), onModel: 'Product', item: '' }]);

  const updateContentItem = (tempId: string, field: 'onModel' | 'item', value: string) =>
    setContentItems(prev => prev.map(i => {
      if (i.tempId !== tempId) return i;
      if (field === 'onModel' && i.onModel !== value)
        return { ...i, onModel: value as 'Product' | 'Pack', item: '' };
      return { ...i, [field]: value };
    }));

  const removeContentItem = (tempId: string) =>
    setContentItems(prev => prev.filter(i => i.tempId !== tempId));

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (contentItems.some(i => !i.item)) {
      alert('Please select a specific Product or Pack for every row.');
      return;
    }

    setIsSubmitting(true);

    const data = new FormData();
    data.append('name[en]', name.en);
    data.append('name[fr]', name.fr);
    data.append('description[en]', description.en);
    data.append('description[fr]', description.fr);
    data.append('is_active', String(isActive));

    if (imageItem?.isNew && imageItem.file) {
      data.append('image', imageItem.file);
    }

    data.append('items', JSON.stringify(contentItems.map(({ item, onModel }) => ({ item, onModel }))));

    const success = await onSubmit(data);
    if (success) onClose();
    setIsSubmitting(false);
  };

  const bilingualLabel = (nameField: unknown): string => {
    if (!nameField) return '';
    if (typeof nameField === 'object') return (nameField as BilingualField).en ?? '';
    return nameField as string;
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col bg-zinc-50 dark:bg-zinc-950 border-l">

        <SheetHeader className="px-8 py-6 border-b bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
          <SheetTitle className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            {initialData ? 'Edit Collection' : 'Create New Collection'}
          </SheetTitle>
          <SheetDescription className="text-zinc-500 dark:text-zinc-400 mt-1.5">
            {initialData
              ? 'Update details and modify items in this collection.'
              : 'Group products and packs into a new collection.'}
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

              <BilingualInput
                label="Collection Name"
                field={name}
                onChange={handleNameChange}
                required
                placeholder="e.g. Summer Essentials"
              />

              <BilingualInput
                label="Description"
                field={description}
                onChange={handleDescriptionChange}
                multiline
              />

              <div className="flex items-center justify-between p-4 rounded-xl border bg-zinc-50 dark:bg-zinc-950/50">
                <Label>Make Collection Active</Label>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </section>

            {/* Collection Items */}
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
                {contentItems.map(ci => (
                  <div key={ci.tempId} className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg border bg-zinc-50 dark:bg-zinc-950/50">

                    <div className="col-span-4">
                      <Select
                        value={ci.onModel}
                        onValueChange={(val: 'Product' | 'Pack') => updateContentItem(ci.tempId, 'onModel', val)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Product">Product</SelectItem>
                          <SelectItem value="Pack">Pack</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-6">
                      <Select
                        required
                        value={ci.item}
                        onValueChange={val => updateContentItem(ci.tempId, 'item', val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${ci.onModel}…`} />
                        </SelectTrigger>
                        <SelectContent>
                          {ci.onModel === 'Product'
                            ? products.map(p => (
                                <SelectItem key={p._id} value={p._id}>
                                  {bilingualLabel(p.name)}
                                </SelectItem>
                              ))
                            : packs.map(p => (
                                <SelectItem key={p._id} value={p._id}>
                                  {bilingualLabel(p.name)}
                                </SelectItem>
                              ))
                          }
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => removeContentItem(ci.tempId)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {contentItems.length === 0 && (
                  <p className="text-center text-sm text-zinc-500 py-4">
                    This collection is empty.
                  </p>
                )}
              </div>
            </section>

            {/* Cover Image */}
            <section className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border shadow-sm space-y-4">
              <h3 className="font-semibold">Cover Image</h3>
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
                  <img src={imageItem.url} alt="Cover preview" className="w-full h-full object-cover" />
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

        <SheetFooter className="px-8 py-5 border-t bg-white dark:bg-zinc-950 sticky bottom-0 z-10">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="collection-form"
            disabled={isSubmitting}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isSubmitting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : initialData ? 'Save Changes' : 'Create Collection'
            }
          </Button>
        </SheetFooter>

      </SheetContent>
    </Sheet>
  );
};