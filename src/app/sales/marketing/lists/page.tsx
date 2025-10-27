/**
 * Email List Management Page
 * /sales/marketing/lists
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Mail, Users, Sparkles, Trash2 } from 'lucide-react';

interface EmailList {
  id: string;
  name: string;
  description?: string;
  isSmartList: boolean;
  memberCount: number;
  createdAt: string;
}

interface SmartListCriteria {
  type: string;
  territory?: string;
  minRevenue?: number;
  days?: number;
}

export default function EmailListsPage() {
  const [lists, setLists] = useState<EmailList[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSmartList, setIsSmartList] = useState(false);
  const [smartType, setSmartType] = useState('all_in_territory');
  const [smartTerritory, setSmartTerritory] = useState('');
  const [smartMinRevenue, setSmartMinRevenue] = useState('10000');
  const [smartDays, setSmartDays] = useState('30');

  useEffect(() => {
    fetchLists();
  }, []);

  async function fetchLists() {
    try {
      const response = await fetch('/api/sales/marketing/lists');
      const data = await response.json();
      setLists(data);
    } catch (error) {
      console.error('Error fetching lists:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createList() {
    try {
      const smartCriteria: SmartListCriteria | null = isSmartList
        ? {
            type: smartType,
            territory: smartTerritory || undefined,
            minRevenue: parseFloat(smartMinRevenue) || undefined,
            days: parseInt(smartDays) || undefined,
          }
        : null;

      const response = await fetch('/api/sales/marketing/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          isSmartList,
          smartCriteria,
        }),
      });

      if (response.ok) {
        setShowCreateDialog(false);
        resetForm();
        fetchLists();
      }
    } catch (error) {
      console.error('Error creating list:', error);
    }
  }

  async function deleteList(listId: string) {
    if (!confirm('Are you sure you want to delete this list?')) return;

    try {
      await fetch(`/api/sales/marketing/lists/${listId}`, {
        method: 'DELETE',
      });
      fetchLists();
    } catch (error) {
      console.error('Error deleting list:', error);
    }
  }

  function resetForm() {
    setName('');
    setDescription('');
    setIsSmartList(false);
    setSmartType('all_in_territory');
    setSmartTerritory('');
    setSmartMinRevenue('10000');
    setSmartDays('30');
  }

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Lists</h1>
          <p className="text-gray-600">
            Manage your customer email lists and segments
          </p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create List
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Email List</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">List Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., High Value Customers"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this list for?"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isSmartList"
                  checked={isSmartList}
                  onChange={(e) => setIsSmartList(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="isSmartList">Smart List (auto-populate)</Label>
              </div>

              {isSmartList && (
                <div className="rounded-lg border p-4 space-y-4">
                  <div>
                    <Label htmlFor="smartType">Criteria Type</Label>
                    <Select value={smartType} onValueChange={setSmartType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all_in_territory">
                          All customers in territory
                        </SelectItem>
                        <SelectItem value="high_value">
                          High-value customers
                        </SelectItem>
                        <SelectItem value="no_order_in_days">
                          No order in X days
                        </SelectItem>
                        <SelectItem value="account_priority">
                          By account priority
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {smartType === 'all_in_territory' && (
                    <div>
                      <Label htmlFor="territory">Territory</Label>
                      <Input
                        id="territory"
                        value={smartTerritory}
                        onChange={(e) => setSmartTerritory(e.target.value)}
                        placeholder="e.g., North, South, East, West"
                      />
                    </div>
                  )}

                  {smartType === 'high_value' && (
                    <div>
                      <Label htmlFor="minRevenue">Minimum Revenue ($)</Label>
                      <Input
                        id="minRevenue"
                        type="number"
                        value={smartMinRevenue}
                        onChange={(e) => setSmartMinRevenue(e.target.value)}
                      />
                    </div>
                  )}

                  {smartType === 'no_order_in_days' && (
                    <div>
                      <Label htmlFor="days">Days Since Last Order</Label>
                      <Input
                        id="days"
                        type="number"
                        value={smartDays}
                        onChange={(e) => setSmartDays(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={createList}>Create List</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lists.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-500">
                  No email lists yet. Create one to get started!
                </TableCell>
              </TableRow>
            ) : (
              lists.map((list) => (
                <TableRow key={list.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{list.name}</div>
                      {list.description && (
                        <div className="text-sm text-gray-500">
                          {list.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {list.isSmartList ? (
                      <span className="inline-flex items-center text-purple-600">
                        <Sparkles className="mr-1 h-4 w-4" />
                        Smart
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-gray-600">
                        <Users className="mr-1 h-4 w-4" />
                        Manual
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{list.memberCount} contacts</TableCell>
                  <TableCell>
                    {new Date(list.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          (window.location.href = `/sales/marketing/lists/${list.id}`)
                        }
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteList(list.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
