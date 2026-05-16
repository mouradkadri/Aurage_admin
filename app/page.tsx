'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Header, HeaderActions } from '@/components/header';
import { AnalyticsSection } from '@/components/analytics-section';
import { ProductsSection } from '@/components/products-section';
import { PacksSection } from '@/components/packs-section';
import { CollectionsSection } from '@/components/collections-section';
import { OrdersSection } from '@/components/orders-section';
import { StorefrontSection } from '@/components/storefront-section';
import { SettingsSection } from '@/components/settings-section';
import { CommandPalette } from '@/components/CommandPalette';
import { Search } from 'lucide-react';

const sectionTitles: Record<string, string> = {
  analytics:   'Analytics Dashboard',
  products:    'Product Management',
  packs:       'Pack Management',
  collections: 'Collection Management',
  orders:      'Order Management',
  storefront:  'Storefront Management',
};

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('analytics');
  const [paletteOpen, setPaletteOpen]     = useState(false);

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

  const renderSection = () => {
    switch (activeSection) {
      case 'analytics':   return <AnalyticsSection />;
      case 'products':    return <ProductsSection />;
      case 'packs':       return <PacksSection />;
      case 'collections': return <CollectionsSection />;
      case 'orders':      return <OrdersSection />;
      case 'storefront':  return <StorefrontSection />;
      case 'settings':    return <SettingsSection />;
      default:            return <AnalyticsSection />;
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

        {/* ── Mobile header bar (below lg) ──────────────────────────────────── */}
        {/* Four zones: hamburger | breadcrumb (flex-1) | search tap | actions  */}
        <div className="flex items-center gap-2 lg:hidden h-14 bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 px-3 flex-shrink-0">

          {/* Hamburger / mobile sidebar trigger */}
          <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />

          {/* Breadcrumb — grows to fill space, truncates long section names */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
            <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex-shrink-0">
              Aurage
            </span>
            <span className="text-gray-300 dark:text-zinc-700 flex-shrink-0">/</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {sectionTitles[activeSection]}
            </span>
          </div>

          {/* Search button — opens command palette on tap */}
          <button
            onClick={() => setPaletteOpen(true)}
            aria-label="Search sections"
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Theme toggle + notifications bell + user dropdown */}
          <HeaderActions isMobile />
        </div>

        {/* Desktop Header (hidden on mobile) */}
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

      {/* Command Palette — controlled externally, works on all screen sizes */}
      {paletteOpen && (
        <CommandPalette
          activeSection={activeSection}
          onSelect={(id) => {
            setActiveSection(id);
            setPaletteOpen(false);
          }}
          onClose={() => setPaletteOpen(false)}
        />
      )}
    </div>
  );
}