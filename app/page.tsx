'use client';

import React, { useState,useEffect } from 'react';
// No need for useRouter or useEffect for auth anymore!
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { AnalyticsSection } from '@/components/analytics-section';
import { ProductsSection } from '@/components/products-section';
import { PacksSection } from '@/components/packs-section';
import { CollectionsSection } from '@/components/collections-section';
import { OrdersSection } from '@/components/orders-section';
import { StorefrontSection } from '@/components/storefront-section';
import { SettingsSection } from '@/components/settings-section';
import { CommandPalette } from '@/components/CommandPalette';

import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@/components/ui/command';
import { BarChart3, Package, ShoppingCart, Globe, Settings, Layers, Boxes } from 'lucide-react';

const sectionTitles: Record<string, string> = {
  analytics: 'Analytics Dashboard',
  products: 'Product Management',
  packs: 'Pack Management',
  collections: 'Collection Management',
  orders: 'Order Management',
  storefront: 'Storefront Management',
  settings: 'Settings',
};

export default function Dashboard() {
  const[activeSection, setActiveSection] = useState('analytics');
const [paletteOpen, setPaletteOpen] = useState(false);
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setPaletteOpen(prev => !prev);
    }
    if (e.key === 'Escape') setPaletteOpen(false);
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, []);
const sections = [
  { id: 'analytics',   label: 'Analytics Dashboard',     icon: BarChart3   },
  { id: 'products',    label: 'Product Management',       icon: Package     },
  { id: 'packs',       label: 'Pack Management',          icon: Boxes       },
  { id: 'collections', label: 'Collection Management',    icon: Layers      },
  { id: 'orders',      label: 'Order Management',         icon: ShoppingCart},
  { id: 'storefront',  label: 'Storefront Management',    icon: Globe       },
  { id: 'settings',    label: 'Settings',                 icon: Settings    },
];
  // The rendering logic remains exactly the same
  const renderSection = () => {
    switch (activeSection) {
      case 'analytics': return <AnalyticsSection />;
      case 'products': return <ProductsSection />;
      case 'packs': return <PacksSection />;
      case 'collections': return <CollectionsSection />;
      case 'orders': return <OrdersSection />;
      case 'storefront': return <StorefrontSection />;
      case 'settings': return <SettingsSection />;
      default: return <AnalyticsSection />;
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-white overflow-hidden transition-colors">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden w-full">
        {/* Header with Mobile Sidebar Trigger */}
        <div className="flex items-center gap-3 lg:hidden h-16 bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 px-4">
  {/* Hamburger */}
  <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />

  {/* Breadcrumb */}
  <div className="flex items-center gap-1.5 min-w-0 flex-1">
    <span className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex-shrink-0">
      Aurage
    </span>
    <span className="text-gray-300 dark:text-zinc-700 flex-shrink-0">/</span>
    <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
      {sectionTitles[activeSection]}
    </span>
  </div>

  {/* Right side actions reused from Header internals */}
  <Header sectionTitle={sectionTitles[activeSection]} />
</div>

        {/* Desktop Header */}
        <div className="hidden lg:block">
          <Header sectionTitle={sectionTitles[activeSection]} />
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-zinc-900 transition-colors">
          <div className="p-3 sm:p-4 md:p-6">
            {renderSection()}
          </div>
        </main>
      </div>
      {paletteOpen && (
  <div
    className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm"
    onClick={() => setPaletteOpen(false)}
  >
    <div
      className="w-full max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl shadow-2xl overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          autoFocus
          type="text"
          placeholder="Aller à une section…"
          className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
          onChange={e => {
            const val = e.target.value.toLowerCase();
            // filter is handled by rendering below
            (e.target as any)._search = val;
            e.target.closest('.palette-list')?.dispatchEvent(new CustomEvent('search', { detail: val }));
          }}
          onKeyDown={e => {
            if (e.key === 'Escape') setPaletteOpen(false);
          }}
          ref={el => {
            if (el) el.dataset.search = '';
            // store ref for filtering
          }}
          id="palette-input"
        />
        <kbd className="text-[10px] text-gray-400 bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono">
          Échap
        </kbd>
      </div>

      {/* Sections list */}
      <CommandPalette
  activeSection={activeSection}
  onSelect={setActiveSection}
/>
    </div>
  </div>
)}
    </div>
  );
}