'use client';

import React, { useState } from 'react';
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
        <div className="flex items-center gap-2 lg:hidden h-16 bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 px-4">
          <div className="flex-1">
            <Header sectionTitle={sectionTitles[activeSection]} />
          </div>
          <div className="lg:hidden">
            <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
          </div>
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
    </div>
  );
}