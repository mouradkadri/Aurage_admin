'use client';

import React, { useState, useEffect, useRef } from 'react';
import { BarChart3, Package, ShoppingCart, Globe, Settings, Layers, Boxes, Search } from 'lucide-react';

const SECTIONS = [
  { id: 'analytics',   label: 'Analytics Dashboard',   icon: BarChart3    },
  { id: 'products',    label: 'Product Management',     icon: Package      },
  { id: 'packs',       label: 'Pack Management',        icon: Boxes        },
  { id: 'collections', label: 'Collection Management',  icon: Layers       },
  { id: 'orders',      label: 'Order Management',       icon: ShoppingCart },
  { id: 'storefront',  label: 'Storefront Management',  icon: Globe        },
  { id: 'settings',    label: 'Settings',               icon: Settings     },
];

interface CommandPaletteProps {
  activeSection: string;
  onSelect: (id: string) => void;
  /** When provided, CommandPalette is controlled externally and always renders open. */
  onClose?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  activeSection,
  onSelect,
  onClose,
}) => {
  // If onClose is provided, we're controlled externally and should render open immediately.
  // Otherwise we manage our own open state (triggered by ⌘K).
  const isControlled = typeof onClose === 'function';

  const [open, setOpen]       = useState(isControlled); // start open when controlled
  const [search, setSearch]   = useState('');
  const [focused, setFocused] = useState(0);
  const inputRef              = useRef<HTMLInputElement>(null);

  const close = () => {
    if (isControlled) {
      onClose?.();
    } else {
      setOpen(false);
    }
  };

  // Standalone mode: open/close with Cmd+K or Ctrl+K
  useEffect(() => {
    if (isControlled) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isControlled]);

  // Focus input when opened
  useEffect(() => {
    const isVisible = isControlled ? true : open;
    if (isVisible) {
      setSearch('');
      setFocused(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, isControlled]);

  // Escape key for controlled mode
  useEffect(() => {
    if (!isControlled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isControlled]);

  const filtered = SECTIONS.filter(s =>
    s.label.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => { setFocused(0); }, [search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocused(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocused(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[focused]) {
        onSelect(filtered[focused].id);
        close();
      }
    }
  };

  const isVisible = isControlled ? true : open;
  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-[20vh] bg-black/50 backdrop-blur-sm px-4"
      onClick={close}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Aller à une section…"
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 outline-none"
          />
          <kbd className="text-[10px] text-gray-400 bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono flex-shrink-0">
            Échap
          </kbd>
        </div>

        {/* Results */}
        <ul className="py-2 max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-gray-400 dark:text-zinc-500">
              Aucune section trouvée
            </li>
          ) : (
            filtered.map((section, index) => {
              const Icon      = section.icon;
              const isActive  = activeSection === section.id;
              const isFocused = focused === index;

              return (
                <li key={section.id}>
                  <button
                    onClick={() => {
                      onSelect(section.id);
                      close();
                    }}
                    onMouseEnter={() => setFocused(index)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                      isFocused
                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                        : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${
                      isFocused ? 'text-amber-500' : 'text-gray-400 dark:text-zinc-500'
                    }`} />
                    <span className="flex-1">{section.label}</span>
                    {isActive && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wide bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                        Actif
                      </span>
                    )}
                    {isFocused && !isActive && (
                      <kbd className="text-[10px] text-gray-400 bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono">
                        ↵
                      </kbd>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-gray-100 dark:border-zinc-800 flex items-center gap-4">
          <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-zinc-500">
            <kbd className="bg-gray-100 dark:bg-zinc-800 px-1 rounded font-mono text-[10px]">↑↓</kbd>
            naviguer
          </span>
          <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-zinc-500">
            <kbd className="bg-gray-100 dark:bg-zinc-800 px-1 rounded font-mono text-[10px]">↵</kbd>
            sélectionner
          </span>
          <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-zinc-500">
            <kbd className="bg-gray-100 dark:bg-zinc-800 px-1 rounded font-mono text-[10px]">Échap</kbd>
            fermer
          </span>
        </div>
      </div>
    </div>
  );
};