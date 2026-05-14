'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit2, Trash2, Plus, Search, Eye, EyeOff, Loader2 } from 'lucide-react';
import { CollectionDetailsModal } from './CollectionDetailsModal';
// Import real hook and drawer
import { useCollections, Collection } from '@/hooks/useCollections';
import { CollectionFormDrawer } from './CollectionFormDrawer'; 
import { ConfirmDialog } from './ConfirmDialog';

export const CollectionsSection: React.FC = () => {
  const lang = 'fr';
  const { collections, isLoading, createCollection, updateCollection, deleteCollection } = useCollections();
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; id: string } | null>(null);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);

  const[searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter collections locally
  const filteredCollections = useMemo(() => {
    return collections.filter((col) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
  col.name?.en?.toLowerCase().includes(searchLower) ||
  col.name?.fr?.toLowerCase().includes(searchLower) ||
  col.description?.en?.toLowerCase().includes(searchLower) ||
  col.description?.fr?.toLowerCase().includes(searchLower);
      
      const status = col.is_active ? 'active' : 'draft';
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  },[collections, searchTerm, statusFilter]);

  // Handlers
  const handleCreateClick = () => {
    setEditingCollection(null);
    setIsDrawerOpen(true);
  };

  const handleEditClick = (col: Collection) => {
    setEditingCollection(col);
    setIsDrawerOpen(true);
  };

  const handleDelete = (id: string) => {
  setConfirmDialog({ open: true, id });
};

  const handleFormSubmit = async (formData: FormData) => {
    if (editingCollection) {
      return await updateCollection(editingCollection._id, formData);
    } else {
      return await createCollection(formData);
    }
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setEditingCollection(null), 300);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Collections</h3>
            <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1">Grouped products and packs</p>
          </div>
          <Button onClick={handleCreateClick} className="bg-amber-500 hover:bg-amber-600 text-white">
            <Plus className="w-4 h-4 mr-2" /> Create Collection
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-800 rounded-lg px-3 py-2">
              <input
                type="text"
                placeholder="Search collections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent text-xs sm:text-sm text-gray-900 dark:text-white outline-none"
              />
              <Search className="w-4 h-4 text-gray-400" />
            </div>
          </div>

          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-800 text-xs sm:text-sm">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Collections Table */}
        <Card className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50">
                    <TableHead>Collection Name</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500" /></TableCell></TableRow>
                  ) : filteredCollections.length > 0 ? (
                    filteredCollections.map((collection) => (
                      <TableRow key={collection._id} className="group border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50">
  
  {/* Collection Name (Wrapped in Details Modal for easy access) */}
    <TableCell className="px-4 py-3">
    <CollectionDetailsModal collection={collection}>
      <div className="cursor-pointer group-hover:translate-x-1 transition-transform">
        <p className="font-medium text-gray-900 dark:text-white underline-offset-4 group-hover:underline">
          {collection.name?.[lang]}
        </p>
        <p className="text-xs text-gray-600 dark:text-zinc-400 truncate max-w-[200px]">{collection.description?.[lang]}</p>
      </div>
    </CollectionDetailsModal>
  </TableCell>

  {/* Items Count Badge */}
  <TableCell className="px-4 py-3">
    <CollectionDetailsModal collection={collection}>
      <Badge variant="outline" className="bg-white dark:bg-zinc-900 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800">
        {collection.items?.length || 0} Items
      </Badge>
    </CollectionDetailsModal>
  </TableCell>

  {/* Status */}
  <TableCell className="px-4 py-3">
    <Badge variant={collection.is_active ? 'default' : 'secondary'} className={collection.is_active ? 'bg-green-100 text-green-800' : ''}>
      {collection.is_active ? 'Active' : 'Draft'}
    </Badge>
  </TableCell>

  {/* Actions */}
  <TableCell className="px-4 py-3 text-right">
    <div className="flex justify-end gap-2">
      
      {/* --- DETAILS (EYE) BUTTON --- */}
      <CollectionDetailsModal collection={collection}>
        <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-amber-500">
          <Eye className="w-4 h-4" />
        </Button>
      </CollectionDetailsModal>

      <Button variant="ghost" size="sm" onClick={() => handleEditClick(collection)}>
        <Edit2 className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(collection._id)}>
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  </TableCell>

</TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-gray-500">
                        No collections found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <CollectionFormDrawer 
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        onSubmit={handleFormSubmit}
        initialData={editingCollection}
      />
      {confirmDialog && (
  <ConfirmDialog
    open={confirmDialog.open}
    title="Supprimer cette collection ?"
    description="Cette action est irréversible. La collection sera définitivement supprimée."
    confirmLabel="Supprimer"
    onConfirm={async () => {
      const id = confirmDialog.id;
      setConfirmDialog(null);
      await deleteCollection(id);
    }}
    onCancel={() => setConfirmDialog(null)}
  />
)}
    </>
  );
};