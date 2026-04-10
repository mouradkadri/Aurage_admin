'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit2, Trash2, Plus, Search, Loader2,Eye } from 'lucide-react';

// Import the new hook and drawer component
import { usePacks, Pack } from '@/hooks/usePacks';
import { PackFormDrawer } from './PackFormDrawer'; // Adjust path if needed
import { Input } from './ui/input';
import { PackDetailsModal } from './PackDetailsModal';
export const PacksSection: React.FC = () => {
  // Use the hook to manage pack data
  const { packs, isLoading, createPack, updatePack, deletePack } = usePacks();

  // State for the drawer/modal
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingPack, setEditingPack] = useState<Pack | null>(null);

  // State for filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Memoized filtering logic
  const filteredPacks = useMemo(() => {
    return packs.filter((pack) => {
      const matchesSearch = pack.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           pack.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const status = pack.is_active ? 'active' : 'draft';
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [packs, searchTerm, statusFilter]);
  
  // --- Handlers ---
  const handleCreateClick = () => {
    setEditingPack(null); // Ensure we're in "create" mode
    setIsDrawerOpen(true);
  };

  const handleEditClick = (pack: Pack) => {
    setEditingPack(pack);
    setIsDrawerOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this pack? This cannot be undone.')) {
      await deletePack(id);
    }
  };

  const handleFormSubmit = async (formData: FormData) => {
    if (editingPack) {
      // Update mode
      return await updatePack(editingPack._id, formData);
    } else {
      // Create mode
      return await createPack(formData);
    }
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    // Give a moment for the closing animation before clearing data
    setTimeout(() => setEditingPack(null), 300);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Manage Packs</h3>
            <p className="text-sm text-gray-600 mt-1">Product bundles and promotions</p>
          </div>
          <Button onClick={handleCreateClick} className="bg-amber-500 hover:bg-amber-600 text-white">
            <Plus className="w-4 h-4 mr-2" /> Create Pack
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <Input
              type="text"
              placeholder="Search by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white dark:bg-zinc-900"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
        </div>

        {/* Packs Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pack Name</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center h-48"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></TableCell></TableRow>
                  ) : filteredPacks.length > 0 ? (
                    filteredPacks.map((pack) => (
                      <TableRow key={pack._id}>
                        <TableCell>
                          <p className="font-medium">{pack.name}</p>
                          <p className="text-xs text-gray-600">{pack.description}</p>
                        </TableCell>
                        <TableCell>{pack.content.length}</TableCell>
                        <TableCell>€{pack.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={pack.is_active ? 'default' : 'secondary'} className={pack.is_active ? 'bg-green-100 text-green-800' : ''}>
                            {pack.is_active ? 'Active' : 'Draft'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                             <PackDetailsModal pack={pack}>
      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-500 hover:text-amber-500">
        <Eye className="w-4 h-4" />
      </Button>
    </PackDetailsModal>
                            <Button variant="ghost" size="sm" onClick={() => handleEditClick(pack)}><Edit2 className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(pack._id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={5} className="text-center h-48">No packs found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* The Drawer for Add/Edit functionality */}
      <PackFormDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        onSubmit={handleFormSubmit}
        initialData={editingPack}
      />
    </>
  );
};