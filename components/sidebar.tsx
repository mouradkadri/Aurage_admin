'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BarChart3, Package, ShoppingCart, Globe, Settings, Menu, X, Layers, Boxes } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const navItems = [
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    description: 'Sales & metrics',
  },
  {
    id: 'products',
    label: 'Products',
    icon: Package,
    description: 'Inventory & catalog',
  },
  {
    id: 'packs',
    label: 'Packs',
    icon: Boxes,
    description: 'Product bundles',
  },
  {
    id: 'collections',
    label: 'Collections',
    icon: Layers,
    description: 'Grouped products',
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: ShoppingCart,
    description: 'Customer orders',
  },
  {
    id: 'storefront',
    label: 'Storefront',
    icon: Globe,
    description: 'Website & CMS',
  },
];

const SidebarContent = ({
  activeSection,
  onSectionChange,
  isMobile = false,
}: SidebarProps & { isMobile?: boolean }) => (
  <div className="flex flex-col h-full bg-white dark:bg-zinc-950 border-r border-gray-200 dark:border-zinc-800">
    {/* Logo */}
    <div className="p-6 border-b border-gray-200 dark:border-zinc-800">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">A</span>
        </div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Aurage Admin</h1>
      </div>
    </div>

    {/* Navigation */}
    <nav className="flex-1 p-4 overflow-y-auto">
      <div className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-start gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400'
                  : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-900/50'
              }`}
            >
              <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <div className="font-medium text-sm">{item.label}</div>
                <div className="text-xs opacity-75">{item.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </nav>

    {/* Footer */}
    <div className="p-4 border-t border-gray-200 dark:border-zinc-800 space-y-2">
      <button
        onClick={() => onSectionChange('settings')}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
          activeSection === 'settings'
            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400'
            : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-900/50'
        }`}
      >
        <Settings className="w-5 h-5" />
        <span className="text-sm font-medium">Settings</span>
      </button>
      <div className="px-4 py-2 text-xs text-gray-600 dark:text-zinc-500">
        <p className="font-medium mb-1">Shop Status</p>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span>All systems online</span>
        </div>
      </div>
    </div>
  </div>
);

export const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange }) => {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col">
        <SidebarContent activeSection={activeSection} onSectionChange={onSectionChange} />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild className="lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-900"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="p-0 w-64 bg-white dark:bg-zinc-950 border-gray-200 dark:border-zinc-800"
        >
          {/* Hidden title for screen reader accessibility */}
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>

          <SidebarContent
            activeSection={activeSection}
            onSectionChange={onSectionChange}
            isMobile
          />
        </SheetContent>
      </Sheet>
    </>
  );
};