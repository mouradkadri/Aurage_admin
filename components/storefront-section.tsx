'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Edit2, Plus, Trash2, Layout,
  Image as ImageIcon, Menu, FileText,
  Monitor, Megaphone, Loader2, Check, X,
} from 'lucide-react';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import type { Announcement } from '@/hooks/useAnnouncements';

// ─── Inline editable row ──────────────────────────────────────────────────────

const AnnouncementRow: React.FC<{
  item: Announcement;
  onToggle:  (id: string) => void;
  onDelete:  (id: string) => void;
  onSave:    (id: string, text: string) => void;
}> = ({ item, onToggle, onDelete, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(item.text);

  const handleSave = () => {
    if (draft.trim() && draft !== item.text) onSave(item._id, draft.trim());
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(item.text);
    setEditing(false);
  };

  return (
    <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Status dot */}
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.is_active ? 'bg-green-500' : 'bg-gray-300 dark:bg-zinc-600'}`} />

          {/* Text / edit input */}
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
              className="flex-1 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/40"
            />
          ) : (
            <span className={`flex-1 text-sm ${item.is_active ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-zinc-500 line-through'}`}>
              {item.text}
            </span>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                  title="Save"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                {/* Toggle active */}
                <button
                  onClick={() => onToggle(item._id)}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${
                    item.is_active
                      ? 'text-green-600 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
                      : 'text-gray-400 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700'
                  }`}
                  title={item.is_active ? 'Deactivate' : 'Activate'}
                >
                  {item.is_active ? 'Live' : 'Off'}
                </button>

                {/* Edit */}
                <button
                  onClick={() => { setDraft(item.text); setEditing(true); }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                {/* Delete */}
                <button
                  onClick={() => onDelete(item._id)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Add row ──────────────────────────────────────────────────────────────────

const AddAnnouncementRow: React.FC<{
  onAdd: (text: string) => void;
}> = ({ onAdd }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  const handleAdd = () => {
    if (!text.trim()) return;
    onAdd(text.trim());
    setText('');
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-400 dark:text-zinc-500 hover:border-amber-400 hover:text-amber-500 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add announcement
      </button>
    );
  }

  return (
    <Card className="bg-white dark:bg-zinc-900 border-amber-300 dark:border-amber-700 border-2">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <input
            autoFocus
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setOpen(false); setText(''); } }}
            placeholder="e.g. Free shipping in Tunis ✦ New collection available"
            className="flex-1 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 rounded-lg px-3 py-1.5 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 outline-none focus:ring-2 focus:ring-amber-500/40"
          />
          <button
            onClick={handleAdd}
            disabled={!text.trim()}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
          >
            Add
          </button>
          <button
            onClick={() => { setOpen(false); setText(''); }}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Announcements tab ────────────────────────────────────────────────────────

const AnnouncementsTab: React.FC = () => {
  const {
    announcements, isLoading, error,
    createAnnouncement, updateAnnouncement,
    toggleAnnouncement, deleteAnnouncement,
  } = useAnnouncements();

  const activeCount = announcements.filter(a => a.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Announcement Bar</h2>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
            Text that scrolls across the top of your storefront.
            {activeCount > 0 && (
              <span className="ml-2 text-green-600 dark:text-green-400 font-medium">
                {activeCount} live
              </span>
            )}
          </p>
        </div>

        {/* Live preview strip */}
        {activeCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 dark:bg-zinc-950 rounded-lg text-xs text-white overflow-hidden max-w-xs">
            <Monitor className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
            <span className="truncate text-gray-300">
              {announcements.filter(a => a.is_active).map(a => a.text).join(' · ')}
            </span>
          </div>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-gray-300 dark:text-zinc-600" />
        </div>
      ) : error ? (
        <div className="py-10 text-center text-sm text-red-500">{error}</div>
      ) : (
        <div className="space-y-2">
          {announcements.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-zinc-600 text-center py-8">
              No announcements yet. Add one below.
            </p>
          )}
          {announcements.map(item => (
            <AnnouncementRow
              key={item._id}
              item={item}
              onToggle={toggleAnnouncement}
              onDelete={deleteAnnouncement}
              onSave={updateAnnouncement}
            />
          ))}
          <AddAnnouncementRow onAdd={createAnnouncement} />
        </div>
      )}

      {/* Tip */}
      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg p-4 flex gap-3">
        <Megaphone className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
          Only <strong>active</strong> announcements scroll on the storefront. Toggle any item off to hide it without deleting it. Use a separator like <strong>✦</strong> or <strong>·</strong> in your text to visually separate messages within one entry.
        </p>
      </div>
    </div>
  );
};

// ─── Main StorefrontSection ───────────────────────────────────────────────────

export const StorefrontSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'announcements' | 'pages' | 'navigation'>('announcements');

  const navItems = [
    { id: 'announcements', label: 'Announcement Bar', icon: Megaphone },
    { id: 'pages',         label: 'Custom Pages',     icon: FileText, disabled: true },
    { id: 'navigation',    label: 'Menu Links',        icon: Menu,     disabled: true },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start">

      {/* Sidebar */}
      <aside className="w-full md:w-64 space-y-2">
        <div className="px-3 mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
            Storefront
          </h3>
        </div>
        <nav className="space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => !item.disabled && setActiveTab(item.id as any)}
              disabled={item.disabled}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                activeTab === item.id
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium'
                  : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
              } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
              {item.disabled && (
                <span className="text-[10px] italic text-gray-400">Soon</span>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 w-full space-y-6">
        {activeTab === 'announcements' && <AnnouncementsTab />}

        {activeTab !== 'announcements' && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Layout className="w-12 h-12 text-gray-200 dark:text-zinc-800 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
              {activeTab} coming soon
            </h3>
            <p className="text-sm text-gray-500 max-w-xs">
              We are currently building this feature to give you more control over your store.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};