import React, { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { iTwinApiService } from '../services/api';
import type { iTwin } from '../services/types';

interface EditITwinModalProps {
  iTwin: iTwin | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const EditITwinModal: React.FC<EditITwinModalProps> = ({ iTwin, isOpen, onClose, onUpdated }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    number: '',
    type: null as string | null,
    status: 'Active',
    geographicLocation: '',
    latitude: '',
    longitude: '',
    ianaTimeZone: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (iTwin) {
      setFormData({
        displayName: iTwin.displayName || '',
        number: iTwin.number || '',
        type: (iTwin.type as string) || null,
        status: iTwin.status || 'Active',
        geographicLocation: iTwin.geographicLocation || '',
        latitude: typeof iTwin.latitude === 'number' ? String(iTwin.latitude) : '',
        longitude: typeof iTwin.longitude === 'number' ? String(iTwin.longitude) : '',
        ianaTimeZone: iTwin.ianaTimeZone || '',
      });
      setErrors({});
    }
  }, [iTwin]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.displayName.trim()) newErrors.displayName = 'Display name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!iTwin) return;
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const payload: { displayName?: string; number?: string; type?: string | null; status?: string; geographicLocation?: string; latitude?: number; longitude?: number; ianaTimeZone?: string } = {};
      if (formData.displayName.trim() !== iTwin.displayName) payload.displayName = formData.displayName.trim();
      if ((formData.number || '') !== (iTwin.number || '')) payload.number = formData.number.trim();
      if ((formData.type || null) !== (iTwin.type || null)) payload.type = formData.type || null;
      if ((formData.status || '') !== (iTwin.status || '')) payload.status = formData.status;
      if ((formData.geographicLocation || '') !== (iTwin.geographicLocation || '')) payload.geographicLocation = formData.geographicLocation;
      const lat = formData.latitude.trim();
      const lon = formData.longitude.trim();
      if (lat) {
        const n = parseFloat(lat);
        if (!Number.isNaN(n)) payload.latitude = n;
      }
      if (lon) {
        const n = parseFloat(lon);
        if (!Number.isNaN(n)) payload.longitude = n;
      }
      if ((formData.ianaTimeZone || '') !== (iTwin.ianaTimeZone || '')) payload.ianaTimeZone = formData.ianaTimeZone;

      await iTwinApiService.updateITwin(iTwin.id, payload);
      onUpdated();
      onClose();
    } catch (error) {
      console.error('Failed to update iTwin:', error);
      setErrors({ submit: (error as Error)?.message || 'Failed to update iTwin. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5" />
            Edit iTwin
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

          <div className="space-y-2">
            <Label htmlFor="geographicLocation">Geographic Location</Label>
            <Input
              id="geographicLocation"
              value={formData.geographicLocation}
              onChange={(e) => setFormData((p) => ({ ...p, geographicLocation: e.target.value }))}
              placeholder="e.g., Exton, PA"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="text"
                inputMode="decimal"
                value={formData.latitude}
                onChange={(e) => setFormData((p) => ({ ...p, latitude: e.target.value }))}
                placeholder="e.g., 40.028"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="text"
                inputMode="decimal"
                value={formData.longitude}
                onChange={(e) => setFormData((p) => ({ ...p, longitude: e.target.value }))}
                placeholder="e.g., -75.621"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ianaTimeZone">IANA Time Zone</Label>
            <Input
              id="ianaTimeZone"
              value={formData.ianaTimeZone}
              onChange={(e) => setFormData((p) => ({ ...p, ianaTimeZone: e.target.value }))}
              placeholder="e.g., America/New_York"
            />
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{errors.submit}</div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !formData.displayName.trim()}>
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Pencil className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
