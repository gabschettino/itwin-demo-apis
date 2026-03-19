import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Copy, Check, ChevronsUpDown, Clock } from 'lucide-react';
import { iModelService } from '../services/api/IModelService';
import { iTwinService } from '../services/api/iTwinService';
import type { IModel, iTwin } from '../services/types';

// Utility functions for managing recent iTwins
const RECENT_ITWINS_KEY = 'itwin-demo-recent-itwins';
const MAX_RECENT_ITWINS = 5;

const getRecentITwins = (): iTwin[] => {
  try {
    const stored = localStorage.getItem(RECENT_ITWINS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveRecentITwin = (itwin: iTwin): void => {
  try {
    const recent = getRecentITwins();
    // Remove if already exists
    const filtered = recent.filter(item => item.id !== itwin.id);
    // Add to beginning
    const updated = [itwin, ...filtered].slice(0, MAX_RECENT_ITWINS);
    localStorage.setItem(RECENT_ITWINS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.warn('Failed to save recent iTwin:', error);
  }
};

interface CloneIModelModalProps {
  iModel: IModel;
  onCloned: () => void;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export const CloneIModelModal: React.FC<CloneIModelModalProps> = ({
  iModel,
  onCloned,
  onOpenChange,
  trigger
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [iTwins, setITwins] = useState<iTwin[]>([]);
  const [recentITwins, setRecentITwins] = useState<iTwin[]>([]);
  const [isLoadingITwins, setIsLoadingITwins] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedITwin, setSelectedITwin] = useState<iTwin | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    displayName: `${iModel.displayName} - Copy`,
    name: `${iModel.name || iModel.displayName}_copy`,
    description: iModel.description ? `Clone of: ${iModel.description}` : `Clone of ${iModel.displayName}`,
    iTwinId: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Load recent iTwins on mount
  useEffect(() => {
    setRecentITwins(getRecentITwins());
  }, []);

  // Filter iTwins based on search term
  const filteredITwins = iTwins.filter(itwin =>
    itwin.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get recent iTwins that are still available in current iTwins list
  const availableRecentITwins = recentITwins.filter(recentItwin =>
    iTwins.some(itwin => itwin.id === recentItwin.id)
  ).filter(recentItwin =>
    !searchTerm || recentItwin.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get non-recent iTwins for the main list
  const nonRecentFilteredITwins = filteredITwins.filter(itwin =>
    !availableRecentITwins.some(recentItwin => recentItwin.id === itwin.id)
  );

  // Helper function to handle iTwin selection
  const handleITwinSelection = (itwin: iTwin) => {
    setSelectedITwin(itwin);
    setSearchTerm('');
    setShowDropdown(false);
    handleInputChange('iTwinId', itwin.id);
    
    // Save to recent iTwins
    saveRecentITwin(itwin);
    setRecentITwins(getRecentITwins());
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const loadITwins = async () => {
      if (iTwins.length > 0) return;
      
      setIsLoadingITwins(true);
      try {
        const iTwinServiceInstance = new iTwinService();
        const result = await iTwinServiceInstance.getMyiTwins();
        if (result) {
          setITwins(result);
        }
      } catch (error) {
        console.error('Failed to load iTwins:', error);
      } finally {
        setIsLoadingITwins(false);
      }
    };

    if (isOpen) {
      loadITwins();
    }
  }, [isOpen, iTwins.length]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (onOpenChange) {
      onOpenChange(open);
    }
    if (!open) {
      setErrors({});
      setSelectedITwin(null);
      setSearchTerm('');
      setShowDropdown(false);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    }
    
    if (!formData.iTwinId) {
      newErrors.iTwinId = 'Target iTwin is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleClone = async () => {
    if (!validateForm()) {
      return;
    }

    setIsCloning(true);
    try {
      const cloneRequest = {
        displayName: formData.displayName,
        name: formData.name || formData.displayName,
        description: formData.description,
        iTwinId: formData.iTwinId
      };

      const result = await iModelService.cloneIModel(iModel.id, cloneRequest);
      
      if (result && 'success' in result && result.success) {
        console.log('iModel clone operation started:', result);
        // Show success message explaining it's an async operation
        setErrors({ 
          success: 'iModel clone operation started successfully! The new iModel will appear in your list shortly as the cloning process completes in the background.' 
        });
        
        // Wait a moment to show the message, then close and refresh
        setTimeout(() => {
          onCloned();
          setIsOpen(false);
        }, 2000);
      } else {
        console.log('iModel clone completed:', result);
        onCloned();
        setIsOpen(false);
      }
      
      // Reset form and search states
      setFormData({
        displayName: `${iModel.displayName} - Copy`,
        name: `${iModel.name || iModel.displayName}_copy`,
        description: iModel.description ? `Clone of: ${iModel.description}` : `Clone of ${iModel.displayName}`,
        iTwinId: ''
      });
      setSelectedITwin(null);
      setSearchTerm('');
      setShowDropdown(false);
    } catch (error) {
      console.error('Failed to clone iModel:', error);
      setErrors({ submit: 'Failed to clone iModel. Please try again.' });
    } finally {
      setIsCloning(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const defaultTrigger = (
    <Button 
      variant="outline"
      size="sm"
      title="Clone iModel"
    >
      <Copy className="w-4 h-4" />
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Clone iModel
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-muted/50 border rounded-md p-3">
            <p className="text-sm text-muted-foreground">
              <strong>Source:</strong> {iModel.displayName}
            </p>
            {iModel.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {iModel.description}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="iTwinId">Target iTwin *</Label>
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <Input
                  type="text"
                  placeholder={isLoadingITwins ? "Loading iTwins..." : "Type to search or select an iTwin..."}
                  value={selectedITwin ? selectedITwin.displayName : searchTerm}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSelectedITwin(null);
                    setShowDropdown(true);
                    handleInputChange('iTwinId', '');
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className={`pr-10 ${errors.iTwinId ? 'border-red-500' : ''}`}
                  disabled={isLoadingITwins}
                />
                <button
                  type="button"
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </button>
              </div>
              
              {showDropdown && !isLoadingITwins && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                  {(availableRecentITwins.length > 0 || nonRecentFilteredITwins.length > 0) ? (
                    <>
                      {/* Recent iTwins Section */}
                      {availableRecentITwins.length > 0 && (
                        <>
                          <div className="px-4 py-2 text-xs font-medium text-gray-600 border-b bg-blue-50 flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            Recent Target iTwins
                          </div>
                          {availableRecentITwins.map((itwin) => (
                            <button
                              key={`recent-${itwin.id}`}
                              type="button"
                              className="w-full px-4 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-l-2 border-l-blue-500 bg-blue-25/50"
                              onClick={() => handleITwinSelection(itwin)}
                            >
                              <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                  <Clock className="h-3 w-3 text-blue-600" />
                                  {itwin.displayName}
                                </span>
                                {formData.iTwinId === itwin.id && (
                                  <Check className="h-4 w-4 text-blue-600" />
                                )}
                              </div>
                            </button>
                          ))}
                        </>
                      )}

                      {/* All iTwins Section */}
                      {nonRecentFilteredITwins.length > 0 && (
                        <>
                          {availableRecentITwins.length > 0 && (
                            <div className="border-t border-gray-200"></div>
                          )}
                          {searchTerm && (
                            <div className="px-4 py-2 text-xs text-gray-500 border-b bg-gray-50">
                              {searchTerm ? `${nonRecentFilteredITwins.length + availableRecentITwins.length} iTwin${(nonRecentFilteredITwins.length + availableRecentITwins.length) !== 1 ? 's' : ''} found` : 'All iTwins'}
                            </div>
                          )}
                          {nonRecentFilteredITwins.map((itwin) => (
                            <button
                              key={itwin.id}
                              type="button"
                              className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                              onClick={() => handleITwinSelection(itwin)}
                            >
                              <div className="flex items-center justify-between">
                                <span>{itwin.displayName}</span>
                                {formData.iTwinId === itwin.id && (
                                  <Check className="h-4 w-4 text-blue-600" />
                                )}
                              </div>
                            </button>
                          ))}
                        </>
                      )}
                    </>
                  ) : (
                    <div className="px-4 py-2 text-gray-500 text-sm">
                      {searchTerm ? 'No iTwins found matching your search' : 'No iTwins available'}
                    </div>
                  )}
                </div>
              )}
            </div>
            {errors.iTwinId && (
              <p className="text-sm text-red-600">{errors.iTwinId}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Type to search for an iTwin or click the dropdown arrow. Recent iTwins are shown first.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name *</Label>
            <Input
              id="displayName"
              value={formData.displayName}
              onChange={(e) => handleInputChange('displayName', e.target.value)}
              placeholder="Enter display name for the cloned iModel"
              className={errors.displayName ? 'border-red-500' : ''}
            />
            {errors.displayName && (
              <p className="text-sm text-red-600">{errors.displayName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Optional: internal name for the iModel"
            />
            <p className="text-xs text-muted-foreground">
              If not provided, display name will be used
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
              placeholder="Optional description for the cloned iModel"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {errors.submit}
            </div>
          )}
          
          {errors.success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {errors.success}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            disabled={isCloning}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleClone}
            disabled={isCloning || !formData.displayName.trim() || !formData.iTwinId}
          >
            {isCloning ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Cloning...
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Clone iModel
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};