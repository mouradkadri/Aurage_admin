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
import { ErrorBoundary } from '@/components/ErrorBoundary';
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
    const sections: Record<string, React.ReactNode> = {
      analytics:   <AnalyticsSection />,
      products:    <ProductsSection />,
      packs:       <PacksSection />,
      collections: <CollectionsSection />,
      orders:      <OrdersSection />,
      storefront:  <StorefrontSection />,
      settings:    <SettingsSection />,
    };

    const section = sections[activeSection] ?? <AnalyticsSection />;
    const name    = sectionTitles[activeSection] ?? 'Section';

    return (
      <ErrorBoundary sectionName={name} key={activeSection}>
        {section}
      </ErrorBoundary>
    );
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
        <div className="flex items-center gap-2 lg:hidden h-14 bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 px-3 flex-shrink-0">

          {/* Hamburger / mobile sidebar trigger */}
          <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />

          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
            <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest flex-shrink-0">
              Aurage
            </span>
            <span className="text-gray-300 dark:text-zinc-700 flex-shrink-0">/</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {sectionTitles[activeSection]}
            </span>
          </div>

          {/* Search button */}
          <button
            onClick={() => setPaletteOpen(true)}
            aria-label="Search sections"
            className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Theme toggle + notifications + user dropdown */}
          <HeaderActions isMobile />
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

      {/* Command Palette */}
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