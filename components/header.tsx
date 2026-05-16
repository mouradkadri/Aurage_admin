'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell, User, ChevronDown, Moon, Sun, X,
  ShoppingCart, AlertCircle, Package, CheckCheck, Loader2,
  LogOut, Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/context/AuthContext';
import type { Notification } from '@/hooks/useNotifications';

interface HeaderProps {
  sectionTitle: string;
}

const TYPE_CONFIG: Record<
  Notification['type'],
  { icon: React.ElementType; label: string; color: string; bg: string }
> = {
  new_order: {
    icon: ShoppingCart,
    label: 'New Order',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  low_stock: {
    icon: AlertCircle,
    label: 'Low Stock',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
  },
  system: {
    icon: Package,
    label: 'System',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
  },
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function NotificationItem({
  notif,
  onRead,
}: {
  notif: Notification;
  onRead: (id: string) => void;
}) {
  const config = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.system;
  const Icon   = config.icon;

  return (
    <button
      onClick={() => !notif.is_read && onRead(notif._id)}
      className={`
        w-full text-left px-4 py-3.5 border-b border-gray-100 dark:border-zinc-800/60
        transition-colors duration-150
        ${notif.is_read
          ? 'hover:bg-gray-50 dark:hover:bg-zinc-800/30'
          : 'bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30'
        }
      `}
    >
      <div className="flex gap-3 items-start">
        <div className={`
          w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5
          ${notif.is_read ? 'bg-gray-100 dark:bg-zinc-800' : config.bg}
        `}>
          <Icon className={`w-4 h-4 ${notif.is_read ? 'text-gray-400 dark:text-zinc-500' : config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <span className={`text-xs font-semibold tracking-wide uppercase ${
              notif.is_read ? 'text-gray-400 dark:text-zinc-500' : config.color
            }`}>
              {config.label}
            </span>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[11px] text-gray-400 dark:text-zinc-500 tabular-nums">
                {formatRelativeTime(notif.created_at)}
              </span>
              {!notif.is_read && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
              )}
            </div>
          </div>
          <p className={`text-sm mt-0.5 leading-snug ${
            notif.is_read
              ? 'text-gray-400 dark:text-zinc-500'
              : 'text-gray-700 dark:text-zinc-300'
          }`}>
            {notif.message}
          </p>
        </div>
      </div>
    </button>
  );
}

function NotificationsPanel({
  notifications,
  unreadCount,
  loading,
  loadingMore,
  error,
  hasMore,
  onMarkOne,
  onMarkAll,
  onLoadMore,
  onClose,
  onViewAll,
}: {
  notifications: Notification[];
  unreadCount:   number;
  loading:       boolean;
  loadingMore:   boolean;
  error:         boolean;
  hasMore:       boolean;
  onMarkOne:     (id: string) => void;
  onMarkAll:     () => void;
  onLoadMore:    () => void;
  onClose:       () => void;
  onViewAll:     () => void;
}) {
  return (
<div className="absolute right-0 mt-2 w-[22rem] max-w-[calc(100vw-1.5rem)] bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/40 z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            Notifications
          </span>
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-[11px] font-bold leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAll}
              className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-100 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-h-[22rem] overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400 dark:text-zinc-500" />
          </div>
        ) : error ? (
          <div className="py-10 text-center">
            <p className="text-sm text-gray-500 dark:text-zinc-500">Failed to load notifications</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="w-8 h-8 mx-auto text-gray-300 dark:text-zinc-700 mb-3" />
            <p className="text-sm font-medium text-gray-500 dark:text-zinc-500">All caught up</p>
            <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1">No new notifications</p>
          </div>
        ) : (
          <>
            {notifications.map(notif => (
              <NotificationItem key={notif._id} notif={notif} onRead={onMarkOne} />
            ))}
            {hasMore && (
              <button
                onClick={onLoadMore}
                disabled={loadingMore}
                className="w-full py-3 text-xs text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors flex items-center justify-center gap-2"
              >
                {loadingMore
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...</>
                  : 'Load more'
                }
              </button>
            )}
          </>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100 dark:border-zinc-800">
          <button
            onClick={onViewAll}
            className="w-full text-xs text-center text-gray-500 dark:text-zinc-500 hover:text-gray-800 dark:hover:text-zinc-200 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}

// ─── HeaderActions ────────────────────────────────────────────────────────────
// Exported so the mobile header bar in page.tsx can render it directly.
// isMobile=true collapses some labels and adjusts sizing.

export function HeaderActions({ isMobile = false }: { isMobile?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifToast, setNotifToast]               = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const router   = useRouter();

  const { user, clear, csrfFetch } = useAuth();

  const {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    error,
    hasMore,
    markOneRead,
    markAllRead,
    loadMore,
  } = useNotifications();

  const handleLogout = async () => {
    try {
      await csrfFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // proceed regardless
    } finally {
      clear();
      router.push('/login');
    }
  };

  // Close panel on outside click
  useEffect(() => {
    if (!showNotifications) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifications]);

  // Close panel on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowNotifications(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const btnCls = `
    flex items-center justify-center rounded-xl
    text-gray-500 dark:text-zinc-400
    hover:text-gray-900 dark:hover:text-white
    hover:bg-gray-100 dark:hover:bg-zinc-800
    transition-colors
    ${isMobile ? 'w-9 h-9' : 'w-9 h-9'}
  `;

  return (
    <div className="flex items-center gap-1">
      {/* Theme toggle */}
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className={btnCls}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Notifications */}
      <div className="relative" ref={panelRef}>
        <button
          onClick={() => setShowNotifications(v => !v)}
          className={`${btnCls} relative`}
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
          )}
        </button>

        {showNotifications && (
          <NotificationsPanel
            notifications={notifications.slice(0, 5)}
            unreadCount={unreadCount}
            loading={loading}
            loadingMore={loadingMore}
            error={error}
            hasMore={false}
            onMarkOne={markOneRead}
            onMarkAll={() => {
              markAllRead();
              setNotifToast('✓ Toutes les notifications marquées comme lues');
              setTimeout(() => setNotifToast(null), 3000);
            }}
            onLoadMore={loadMore}
            onClose={() => setShowNotifications(false)}
            onViewAll={() => {
              setShowNotifications(false);
              router.push('/notifications');
            }}
          />
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-gray-200 dark:bg-zinc-800 mx-0.5" />

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {isMobile ? (
            // Mobile: just show the avatar circle, no text
            <button
              className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              aria-label="User menu"
            >
              <User className="w-4 h-4 text-white" />
            </button>
          ) : (
            // Desktop: avatar + name + chevron
            <Button
              variant="ghost"
              className="flex items-center gap-2.5 text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 px-2.5 py-1.5 h-auto rounded-xl"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium leading-tight">
                  {user?.name || 'Admin'}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-zinc-500 leading-tight capitalize">
                  {user?.role || '—'}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
            </Button>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          className="w-52 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 rounded-xl shadow-lg shadow-black/10 dark:shadow-black/30"
        >
          {/* User info header */}
          <div className="px-3 py-2.5 border-b border-gray-100 dark:border-zinc-800 mb-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
              {user?.name || 'Admin'}
            </p>
            {user?.email && (
              <p className="text-xs text-gray-400 dark:text-zinc-500 truncate mt-0.5">
                {user.email}
              </p>
            )}
            <p className="text-[11px] text-amber-600 dark:text-amber-400 capitalize mt-0.5 font-medium">
              {user?.role || '—'}
            </p>
          </div>

          <DropdownMenuItem
            onClick={() => setShowNotifications(true)}
            className="text-gray-700 dark:text-zinc-300 focus:bg-gray-100 dark:focus:bg-zinc-800 cursor-pointer rounded-lg mx-1 my-0.5"
          >
            <Bell className="w-4 h-4 mr-2" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="ml-auto text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                {unreadCount}
              </span>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-gray-100 dark:bg-zinc-800 mx-1" />

          <DropdownMenuItem
            onClick={handleLogout}
            className="text-red-500 focus:bg-red-50 dark:focus:bg-red-950/20 cursor-pointer rounded-lg mx-1 my-0.5"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Toast */}
      {notifToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-emerald-600 text-white text-sm font-semibold px-5 py-3 rounded-xl shadow-xl animate-in slide-in-from-bottom-4 duration-200">
          {notifToast}
        </div>
      )}
    </div>
  );
}

// ─── Desktop Header ───────────────────────────────────────────────────────────
// Only shown on lg+. Mobile uses the inline bar in page.tsx.

export const Header: React.FC<HeaderProps> = ({ sectionTitle }) => {
  return (
    <header className="bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-40 transition-colors hidden lg:block">
      <div className="flex items-center justify-between h-16 px-6">

        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
            {sectionTitle}
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">
            Manage your fragrance business
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Command palette trigger — desktop only */}
          <button
            onClick={() => {
              document.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
              );
            }}
            className="hidden lg:flex items-center gap-2 px-3 h-8 text-xs text-gray-400 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 border border-gray-200 dark:border-zinc-700 rounded-lg transition-colors mr-1"
            title="Recherche rapide"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Sections</span>
            <kbd className="text-[10px] bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 px-1 rounded font-mono">
              ⌘K
            </kbd>
          </button>

          <HeaderActions isMobile={false} />
        </div>
      </div>
    </header>
  );
};