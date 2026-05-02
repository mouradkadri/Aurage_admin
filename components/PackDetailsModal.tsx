'use client';

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pack } from '@/hooks/usePacks';
import { Package, ExternalLink, Hash } from 'lucide-react';

interface PackDetailsModalProps {
  pack: Pack;
  children: React.ReactNode;
}

export const PackDetailsModal: React.FC<PackDetailsModalProps> = ({ pack, children }) => {
  const lang = 'fr';
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden sm:rounded-[2rem] border border-zinc-200/60 dark:border-zinc-800/60 shadow-2xl bg-white dark:bg-zinc-950 flex flex-col max-h-[85vh]">
        
        {/* Header Section */}
        <div className="px-8 pt-8 pb-6 relative shrink-0">
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-amber-500/5 to-transparent pointer-events-none" />
          
          <DialogHeader className="relative z-10">
            <div className="flex justify-between items-start mb-2">
              <DialogTitle className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                {pack.name?.[lang]}
              </DialogTitle>
              <Badge 
                variant={pack.is_active ? "default" : "secondary"}
                className={pack.is_active ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full px-3" : "rounded-full px-3"}
              >
                {pack.is_active ? "Active Pack" : "Draft"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
                Pack Bundle ID
              </span>
              <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded-md">
                {pack._id}
              </span>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="px-8 pb-8 overflow-y-auto space-y-10 flex-1 custom-scrollbar">
          
          {/* Main Pack Image */}
          {pack.image?.url && (
            <section>
              <h4 className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4">
                Featured Imagery
              </h4>
              <div className="relative aspect-[21/9] overflow-hidden rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm bg-zinc-100 dark:bg-zinc-900">
                <img 
                  src={pack.image.url} 
                  alt={pack.name?.[lang]} 
                  className="h-full w-full object-cover"
                />
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            
            {/* Left Column: Description & Bundle Content */}
            <div className="md:col-span-3 space-y-10">
              <section>
                <h4 className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">
                  About this Bundle
                </h4>
                <p className="text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                  {pack.description?.[lang] || "No description provided for this pack bundle."}
                </p>
              </section>

              <section>
                <h4 className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-4">
                  Included Products ({pack.content.length})
                </h4>
                <div className="space-y-3">
                  {pack.content.map((item, idx) => (
                    <div 
                      key={item._id || idx} 
                      className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 hover:border-amber-500/30 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white dark:bg-zinc-800 shadow-sm border border-zinc-100 dark:border-zinc-700">
                          <Package className="w-4 h-4 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {item.product?.name?.[lang]}
                          </p>
                          <p className="text-[11px] text-zinc-500 font-medium">Quantity: {item.quantity || 1}</p>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Right Column: Pricing & URL */}
            <div className="md:col-span-2 space-y-4">
              
              {/* Price Card */}
              <div className="relative overflow-hidden p-6 rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900/50 dark:to-zinc-950 shadow-sm group">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
                <h4 className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2 relative z-10">
                  Pack Value
                </h4>
                <div className="flex items-baseline gap-1 relative z-10">
                  <span className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                    €{pack.price.toFixed(2)}
                  </span>
                  <span className="text-sm font-medium text-zinc-500">EUR</span>
                </div>
              </div>

              {/* Slug Card */}
              <div className="p-6 rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/30">
                <h4 className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-3">
                  Storefront Link
                </h4>
                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                  <Hash className="w-3 h-3" />
                  <code className="text-xs font-mono">/packs/{pack.slug}</code>
                </div>
              </div>
              
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/20 flex justify-end shrink-0">
          <DialogClose asChild>
            <Button variant="outline" className="rounded-xl px-6 font-medium shadow-sm">
              Close Preview
            </Button>
          </DialogClose>
        </div>

      </DialogContent>
    </Dialog>
  );
};