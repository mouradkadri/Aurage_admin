'use client';

import React, { useEffect, useState } from 'react';
import { ShoppingCart, AlertCircle, Package, CheckCheck, ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';
import type { Notification } from '@/hooks/useNotifications';

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}



// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const router = useRouter();
  useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') router.back();
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, [router]);
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

  const [filter, setFilter] = useState<'all' | Notification['type']>('all');

  const filtered = filter === 'all'
    ? notifications
    : notifications.filter(n => n.type === filter);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 p-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
  onClick={() => router.back()}
  title="Retour (Échap)"
  className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors group relative"
>
  <ArrowLeft className="w-5 h-5" />
  <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] bg-gray-900 text-white px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
    Échap
  </span>
</button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Notifications
              </h1>
              <p className="text-xs text-gray-500 dark:text-zinc-500 mt-0.5">
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : 'All caught up'
                }
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          {(['all', 'new_order', 'low_stock', 'system'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === tab
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-white dark:bg-zinc-900 text-gray-500 dark:text-zinc-400 border border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700'
              }`}
            >
              {tab === 'all' ? 'All' : TYPE_CONFIG[tab].label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400 dark:text-zinc-500" />
            </div>
          ) : error ? (
            <div className="py-16 text-center text-sm text-gray-500 dark:text-zinc-500">
              Failed to load notifications
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm font-medium text-gray-500 dark:text-zinc-500">No notifications</p>
              <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1">
                {filter !== 'all' ? 'Try switching the filter above' : 'Nothing here yet'}
              </p>
            </div>
          ) : (
            <>
              {filtered.map((notif, index) => {
                const config = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.system;
                const Icon   = config.icon;
                return (
                  <button
                    key={notif._id}
                    onClick={() => !notif.is_read && markOneRead(notif._id)}
                    className={`
                      w-full text-left px-5 py-4 flex gap-4 items-start transition-colors
                      ${index !== filtered.length - 1 ? 'border-b border-gray-100 dark:border-zinc-800' : ''}
                      ${notif.is_read
                        ? 'hover:bg-gray-50 dark:hover:bg-zinc-800/40'
                        : 'bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                      }
                    `}
                  >
                    {/* Icon — dimmed when read */}
                    <div className={`
                      w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5
                      ${notif.is_read ? 'bg-gray-100 dark:bg-zinc-800' : config.bg}
                    `}>
                      <Icon className={`w-5 h-5 ${notif.is_read ? 'text-gray-400 dark:text-zinc-500' : config.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4">
                        <span className={`text-xs font-semibold tracking-wide uppercase ${
                          notif.is_read ? 'text-gray-400 dark:text-zinc-500' : config.color
                        }`}>
                          {config.label}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-400 dark:text-zinc-500 tabular-nums">
                            {formatRelativeTime(notif.created_at)}
                          </span>
                          {!notif.is_read && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                      <p className={`text-sm mt-1 leading-snug ${
                        notif.is_read
                          ? 'text-gray-400 dark:text-zinc-500'
                          : 'text-gray-700 dark:text-zinc-300'
                      }`}>
                        {notif.message}
                      </p>
                    </div>
                  </button>
                );
              })}

              {/* Load more — only when not filtering (filter is client-side on loaded data) */}
              {filter === 'all' && hasMore && (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full py-4 text-sm text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors flex items-center justify-center gap-2 border-t border-gray-100 dark:border-zinc-800"
                >
                  {loadingMore
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading more...</>
                    : 'Load more notifications'
                  }
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer count */}
        {filtered.length > 0 && (
          <p className="text-center text-xs text-gray-400 dark:text-zinc-600 mt-4">
            Showing {filtered.length} notification{filtered.length !== 1 ? 's' : ''}
            {filter === 'all' && hasMore && ' · more available'}
          </p>
        )}

      </div>
    </div>
  );
}