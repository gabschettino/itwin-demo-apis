import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { iTwinApiService } from '../services/api';

interface CreateITwinModalProps {
  onCreated: () => void;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export const CreateITwinModal: React.FC<CreateITwinModalProps> = ({ onCreated, onOpenChange, trigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    number: '',
    type: null as string | null,
    dataCenterLocation: 'East US',
    status: 'Active',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
    if (!open) setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.displayName.trim()) newErrors.displayName = 'Display name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    setIsCreating(true);
    try {
      const payload: { displayName: string; number?: string; type?: string | null; dataCenterLocation?: string; status?: string } = {
        displayName: formData.displayName.trim(),
      };
      if (formData.number.trim()) payload.number = formData.number.trim();
      if (formData.type) payload.type = formData.type;
      if (formData.dataCenterLocation) payload.dataCenterLocation = formData.dataCenterLocation;
      if (formData.status) payload.status = formData.status;

      await iTwinApiService.createITwin(payload);
      onCreated();
      setIsOpen(false);
      setFormData({ displayName: '', number: '', type: null, dataCenterLocation: 'East US', status: 'Active' });
    } catch (error) {
      console.error('Failed to create iTwin:', error);
      setErrors({ submit: (error as Error)?.message || 'Failed to create iTwin. Please try again.' });
    } finally {
      setIsCreating(false);
    }
  };

  const defaultTrigger = (
    <Button size="sm" className="flex items-center gap-2">
      <Plus className="h-4 w-4" />
      Create iTwin
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent aria-describedby={undefined} className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create New iTwin
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name *</Label>
            <Input
              id="displayName"
              value={formData.displayName}
              onChange={(e) => setFormData((p) => ({ ...p, displayName: e.target.value }))}
              placeholder="Enter iTwin name"
              className={errors.displayName ? 'border-red-500' : ''}
            />
            {errors.displayName && <p className="text-sm text-red-600">{errors.displayName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="number">Project Number</Label>
            <Input
              id="number"
              value={formData.number}
              onChange={(e) => setFormData((p) => ({ ...p, number: e.target.value }))}
              placeholder="Optional project number"
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={formData.type ?? 'none'}
              onValueChange={(v) => setFormData((p) => ({ ...p, type: v === 'none' ? null : v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Optional: select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="Project">Project</SelectItem>
                <SelectItem value="Asset">Asset</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data Center Location</Label>
            <Select
              value={formData.dataCenterLocation}
              onValueChange={(v) => setFormData((p) => ({ ...p, dataCenterLocation: v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select data center" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="East US">East US</SelectItem>
                <SelectItem value="North Europe">North Europe</SelectItem>
                <SelectItem value="West Europe">West Europe</SelectItem>
                <SelectItem value="Southeast Asia">Southeast Asia</SelectItem>
                <SelectItem value="Australia East">Australia East</SelectItem>
                <SelectItem value="UK South">UK South</SelectItem>
                <SelectItem value="Canada Central">Canada Central</SelectItem>
                <SelectItem value="Central India">Central India</SelectItem>
                <SelectItem value="Japan East">Japan East</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(v) => setFormData((p) => ({ ...p, status: v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{errors.submit}</div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !formData.displayName.trim()}>
            {isCreating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create iTwin
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
