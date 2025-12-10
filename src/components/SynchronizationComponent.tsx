import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { FileType, Loader2, Database, X, Plus, Folder, ArrowUp, ChevronRight } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { iTwinApiService, synchronizationService, storageService } from '../services';
import { iModelApiService } from '../services/api';
import type { iTwin } from '../services/iTwinAPIService';
import type { ManifestConnection, StorageListItem, StorageFile, ManifestRunCreateRequest } from '../services/types';
import type { CreateIModelRequest } from '../services/types/imodel.types';

export default function SynchronizationComponent() {
  // Basic skeleton state for creating a Manifest Connection and starting a Run
  const [iTwins, setITwins] = useState<iTwin[]>([]);
  const [iTwinsLoading, setITwinsLoading] = useState(false);
  const [selectedITwinId, setSelectedITwinId] = useState('');
  // Manifest connection iTwin search (replaces simple select)
  const [manifestITwinSearch, setManifestITwinSearch] = useState('');
  const [manifestShowITwinDropdown, setManifestShowITwinDropdown] = useState(false);
  const manifestITwinDropdownRef = useRef<HTMLDivElement>(null);
  // Manifest iModel selection state (search + create)
  const [manifestIModels, setManifestIModels] = useState<Array<{ id: string; displayName: string }>>([]);
  const [manifestIModelId, setManifestIModelId] = useState('');
  const [manifestIModelSearch, setManifestIModelSearch] = useState('');
  const [manifestShowIModelDropdown, setManifestShowIModelDropdown] = useState(false);
  const manifestIModelDropdownRef = useRef<HTMLDivElement>(null);
  const [showManifestCreateIModelModal, setShowManifestCreateIModelModal] = useState(false);
  const [newManifestIModelName, setNewManifestIModelName] = useState('');
  const [newManifestIModelDescription, setNewManifestIModelDescription] = useState('');
  const [creatingManifestIModel, setCreatingManifestIModel] = useState(false);
  const [displayName, setDisplayName] = useState('');
  // Manifest source file container name (sourceFileId per Manifest Connection API spec)
  const [sourceFileId, setSourceFileId] = useState('');
  // Optional SAS URL to send an explicit run body (otherwise omit and server uses registered source file)
  const [manifestSourceFileSasUrl, setManifestSourceFileSasUrl] = useState('');
  // Connector type for manifest run body when SAS URL is provided
  const [manifestConnectorType, setManifestConnectorType] = useState('DGN');
  const [creating, setCreating] = useState(false);
  const [createdConnection, setCreatedConnection] = useState<ManifestConnection | null>(null);
  const [runSubmitting, setRunSubmitting] = useState(false);
  const [runLocation, setRunLocation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Storage Connection state
  const [storageIModels, setStorageIModels] = useState<Array<{id: string, displayName: string}>>([]);
  const [storageIModelsLoading, setStorageIModelsLoading] = useState(false);
  const [storageIModelId, setStorageIModelId] = useState('');
  const [storageIModelSearch, setStorageIModelSearch] = useState('');
  const [storageShowIModelDropdown, setStorageShowIModelDropdown] = useState(false);
  const [storageDisplayName, setStorageDisplayName] = useState('');
  const [connectorType, setConnectorType] = useState('DGN');
  const [creatingStorageConnection, setCreatingStorageConnection] = useState(false);
  const [createdStorageConnection, setCreatedStorageConnection] = useState<null | { id: string; displayName?: string; iModelId: string }>(null);
  const [storageRunSubmitting, setStorageRunSubmitting] = useState(false);
  const [storageRunLocation, setStorageRunLocation] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  
  // Enhanced storage file browser state
  const [storageBrowserOpen, setStorageBrowserOpen] = useState(false);
  const [storageBrowserPath, setStorageBrowserPath] = useState<Array<{id: string, name: string}>>([]);
  const [storageBrowserItems, setStorageBrowserItems] = useState<StorageListItem[]>([]);
  const [selectedStorageFiles, setSelectedStorageFiles] = useState<StorageFile[]>([]);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [storageITwinSearch, setStorageITwinSearch] = useState('');
  const [storageShowITwinDropdown, setStorageShowITwinDropdown] = useState(false);
  const storageITwinDropdownRef = useRef<HTMLDivElement>(null);
  const storageIModelDropdownRef = useRef<HTMLDivElement>(null);
  
  // Create iModel modal state
  const [showCreateIModelModal, setShowCreateIModelModal] = useState(false);
  const [newIModelName, setNewIModelName] = useState('');
  const [newIModelDescription, setNewIModelDescription] = useState('');
  const [creatingIModel, setCreatingIModel] = useState(false);

  // Recent iTwins functionality
  const getRecentITwins = () => {
    const recent = localStorage.getItem('recentITwins');
    return recent ? JSON.parse(recent) : [];
  };

  const addToRecentITwins = useCallback((iTwin: iTwin) => {
    const recent = getRecentITwins();
    const filtered = recent.filter((item: iTwin) => item.id !== iTwin.id);
    const updated = [iTwin, ...filtered].slice(0, 5);
    localStorage.setItem('recentITwins', JSON.stringify(updated));
  }, []);

  const didInitTwins = useRef(false);
  useEffect(() => {
    if (didInitTwins.current) return; // guard StrictMode double-invoke
    didInitTwins.current = true;
    let active = true;
    const load = async () => {
      try {
        setITwinsLoading(true); setError(null);
        const res = await iTwinApiService.getMyiTwins();
        if (!active) return;
        setITwins(Array.isArray(res) ? res : []);
      } catch (e) {
        if (!active) return;
        const msg = e instanceof Error ? e.message : 'Failed to load iTwins';
        setError(msg);
      } finally { if (active) setITwinsLoading(false); }
    };
    load();
    return () => { active = false; };
  }, []);

  // Click outside handler for manifest & storage dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (manifestITwinDropdownRef.current && !manifestITwinDropdownRef.current.contains(event.target as Node)) {
        setManifestShowITwinDropdown(false);
      }
      if (manifestIModelDropdownRef.current && !manifestIModelDropdownRef.current.contains(event.target as Node)) {
        setManifestShowIModelDropdown(false);
      }
      if (storageITwinDropdownRef.current && !storageITwinDropdownRef.current.contains(event.target as Node)) {
        setStorageShowITwinDropdown(false);
      }
      if (storageIModelDropdownRef.current && !storageIModelDropdownRef.current.contains(event.target as Node)) {
        setStorageShowIModelDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Load manifest iModels when selected iTwin changes
  useEffect(() => {
    const load = async () => {
      if (!selectedITwinId) {
        setManifestIModels([]);
        setManifestIModelId('');
        setManifestIModelSearch('');
        return;
      }
      try {
        const list = await iModelApiService.getAllIModels(selectedITwinId);
        const simplified = (list || []).map(m => {
          const record: Record<string, unknown> = m as unknown as Record<string, unknown>;
          const displayName = String(record.displayName || record.name || m.id);
          return { id: m.id, displayName };
        });
        setManifestIModels(simplified);
      } catch (err) {
        console.warn('Failed to load manifest iModels', err);
        setManifestIModels([]);
      }
    };
    load();
  }, [selectedITwinId]);

  // Function to load iModels for selected iTwin
  const loadIModels = async (iTwinId: string) => {
    if (!iTwinId) return;
    
    try {
      setStorageIModelsLoading(true);
      const response = await iModelApiService.getAllIModels(iTwinId);
      setStorageIModels(response || []);
    } catch (error) {
      console.error('Failed to load iModels:', error);
      setStorageIModels([]);
    } finally {
      setStorageIModelsLoading(false);
    }
  };

  // Function to create a new iModel
  const createNewIModel = async () => {
    if (!selectedITwinId || !newIModelName.trim()) return;
    
    try {
      setCreatingIModel(true);
      const createRequest: CreateIModelRequest = {
        iTwinId: selectedITwinId,
        name: newIModelName.trim(),
        description: newIModelDescription.trim() || undefined
      };
      
      const response = await iModelApiService.createIModel(createRequest);
      
      if (response.iModel) {
        // Add the new iModel to the list and select it
        const newIModel = { id: response.iModel.id, displayName: response.iModel.name };
        setStorageIModels(prev => [newIModel, ...prev]);
        setStorageIModelId(response.iModel.id);
        setStorageIModelSearch(`${response.iModel.name} (${response.iModel.id.slice(0,8)}…)`);
        
        // Close modal and reset form
        setShowCreateIModelModal(false);
        setNewIModelName('');
        setNewIModelDescription('');
      }
    } catch (error) {
      console.error('Failed to create iModel:', error);
      setStorageError(`Failed to create iModel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCreatingIModel(false);
    }
  };

  // Storage file browser functions
  const openStorageBrowser = async () => {
    if (!selectedITwinId) {
      setStorageError('Please select an iTwin first');
      return;
    }
    
    try {
      setStorageBrowserOpen(true);
      setStorageBrowserPath([]);
      const response = await storageService.getTopLevel(selectedITwinId);
      setStorageBrowserItems(response.items || []);
    } catch (error) {
      console.error('Failed to load storage files:', error);
      setStorageError('Failed to load storage files');
    }
  };

  const navigateToFolder = async (folderId: string, folderName: string) => {
    try {
      const response = await storageService.listFolder(folderId);
      setStorageBrowserItems(response.items || []);
      setStorageBrowserPath(prev => [...prev, { id: folderId, name: folderName }]);
    } catch (error) {
      console.error('Failed to navigate to folder:', error);
      setStorageError('Failed to navigate to folder');
    }
  };

  const navigateUp = async () => {
    if (storageBrowserPath.length === 0) return;
    
    const newPath = storageBrowserPath.slice(0, -1);
    setStorageBrowserPath(newPath);
    
    try {
      if (newPath.length === 0) {
        // Go back to top level
        const response = await storageService.getTopLevel(selectedITwinId);
        setStorageBrowserItems(response.items || []);
      } else {
        // Go to parent folder
        const parentId = newPath[newPath.length - 1].id;
        const response = await storageService.listFolder(parentId);
        setStorageBrowserItems(response.items || []);
      }
    } catch (error) {
      console.error('Failed to navigate up:', error);
      setStorageError('Failed to navigate up');
    }
  };

  const toggleFileSelection = (file: StorageListItem) => {
    // Only allow file selection, not folders
    if (file.type === 'folder') return;
    
    setSelectedStorageFiles(prev => {
      const isSelected = prev.some(f => f.id === file.id);
      if (isSelected) {
        return prev.filter(f => f.id !== file.id);
      } else {
        return multiSelectMode ? [...prev, file as StorageFile] : [file as StorageFile];
      }
    });
  };

  const confirmMultiSelection = () => {
    if (selectedStorageFiles.length > 0) {
      setStorageBrowserOpen(false);
    }
  };

  const createStorageConnection = async () => {
    try {
      setCreatingStorageConnection(true);
      setStorageError(null);
      setStorageRunLocation(null);

      const sourceFiles = selectedStorageFiles.map(file => ({
        storageFileId: file.id,
        connectorType: connectorType
      }));

      console.log('Creating storage connection with payload:', {
        iModelId: storageIModelId,
        displayName: storageDisplayName || undefined,
        sourceFiles
      });

      const conn = await synchronizationService.createStorageConnection({
        iModelId: storageIModelId,
        displayName: storageDisplayName || undefined,
        sourceFiles
      });
      
      console.log('Storage connection created successfully:', conn);
      console.log('Connection ID:', conn.id);
      console.log('All connection properties:', Object.keys(conn));
      console.log('Full connection object:', JSON.stringify(conn, null, 2));
      setCreatedStorageConnection(conn);
    } catch (e) {
      console.error('Error creating storage connection:', e);
      let msg = 'Failed to create storage connection';
      
      if (e instanceof Error) {
        // Check if it's a 409 conflict (files already mapped)
        if (e.message.includes('409')) {
          msg = 'Some files are already connected to this iModel in another storage connection. Please select different files or use the existing connection.';
        } else {
          msg = e.message;
        }
      }
      
      setStorageError(msg);
    } finally {
      setCreatingStorageConnection(false);
    }
  };

  const startStorageRun = async () => {
    if (!createdStorageConnection) {
      console.error('No storage connection available to start run');
      setStorageError('No storage connection available to start run');
      return;
    }

    try {
      setStorageRunSubmitting(true);
      setStorageError(null);
      setStorageRunLocation(null);
      
      console.log('Starting storage run for connection:', createdStorageConnection.id);
      console.log('Full created connection object for run:', createdStorageConnection);
      console.log('Connection object keys:', Object.keys(createdStorageConnection));
      
      const res = await synchronizationService.runStorageConnection(createdStorageConnection.id);
      
      console.log('Storage run response status:', res.status);
      console.log('Storage run response headers:', Object.fromEntries(res.headers.entries()));
      
      if (res.status === 202) {
        const loc = res.headers.get('Location');
        console.log('Storage run started successfully. Location:', loc);
        setStorageRunLocation(loc);
      } else if (res.status === 409) {
        setStorageError('A run is already being processed for this connection.');
      } else if (res.status === 401) {
        setStorageError('Unauthorized. Check token/scope.');
      } else if (res.status === 403) {
        setStorageError('Insufficient permissions.');
      } else if (res.status === 404) {
        setStorageError('Storage connection not found. The connection ID may be invalid.');
      } else if (res.status === 422) {
        setStorageError('Invalid run request.');
      } else {
        setStorageError(`Unexpected status ${res.status}`);
      }
    } catch (e) {
      console.error('Error starting storage run:', e);
      const msg = e instanceof Error ? e.message : 'Failed to start storage run';
      setStorageError(msg);
    } finally {
      setStorageRunSubmitting(false);
    }
  };

  const canCreate = !!manifestIModelId && !!sourceFileId && !creating;
  const canRun = !!createdConnection && !runSubmitting;

  const createConnection = async () => {
    try {
      setCreating(true); setError(null); setRunLocation(null);
      const conn = await synchronizationService.createManifestConnection({
        displayName: displayName || undefined,
        iModelId: manifestIModelId.trim(),
        authenticationType: 'User',
        sourceFiles: [{ sourceFileId: sourceFileId.trim() }],
      });
      setCreatedConnection(conn);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create connection';
      setError(msg);
    } finally { setCreating(false); }
  };

  const startRun = async () => {
    if (!createdConnection) return;
    try {
      setRunSubmitting(true); setError(null); setRunLocation(null);
      // If a SAS URL is provided, construct a run body overriding source file details
      let runBody: ManifestRunCreateRequest | undefined;
      if (manifestSourceFileSasUrl.trim()) {
        runBody = {
          sourceFiles: [
            {
              id: sourceFileId.trim(),
              name: sourceFileId.trim(),
              action: 'bridge',
              url: manifestSourceFileSasUrl.trim(),
              connectorType: manifestConnectorType,
            }
          ]
        };
      }
      const res = await synchronizationService.createManifestConnectionRun(createdConnection.id, runBody);
      if (res.status === 202 || res.status === 303) {
        const loc = res.headers.get('Location'); setRunLocation(loc);
      } else if (res.status === 409) {
        setError('A run is already being processed for this iModel.');
      } else if (res.status === 401) {
        setError('Unauthorized. Check token/scope.');
      } else if (res.status === 403) {
        setError('Insufficient permissions.');
      } else if (res.status === 404) {
        setError('Connection not found.');
      } else if (res.status === 422) {
        setError('Invalid run request.');
      } else {
        setError(`Unexpected status ${res.status}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start run';
      setError(msg);
    } finally { setRunSubmitting(false); }
  };

  // Create new iModel for manifest connection
  const createNewManifestIModel = async () => {
    if (!selectedITwinId || !newManifestIModelName.trim()) return;
    try {
      setCreatingManifestIModel(true);
      const createRequest: CreateIModelRequest = {
        iTwinId: selectedITwinId,
        name: newManifestIModelName.trim(),
        description: newManifestIModelDescription.trim() || undefined
      };
      const response = await iModelApiService.createIModel(createRequest);
      if (response.iModel) {
        const newIModel = { id: response.iModel.id, displayName: response.iModel.name };
        setManifestIModels(prev => [newIModel, ...prev]);
        setManifestIModelId(newIModel.id);
        setManifestIModelSearch(`${newIModel.displayName} (${newIModel.id.slice(0,8)}…)`);
        setShowManifestCreateIModelModal(false);
        setNewManifestIModelName('');
        setNewManifestIModelDescription('');
      }
    } catch (error) {
      console.error('Failed to create manifest iModel:', error);
      setError(`Failed to create iModel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCreatingManifestIModel(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileType className="h-4 w-4"/> Manifest Connections</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="manifest-tw">iTwin</Label>
                <div className="relative" ref={manifestITwinDropdownRef}>
                  <Input
                    id="manifest-tw"
                    placeholder={iTwinsLoading ? 'Loading iTwins…' : 'Search and select an iTwin…'}
                    value={manifestITwinSearch}
                    onChange={(e) => {
                      setManifestITwinSearch(e.target.value);
                      setManifestShowITwinDropdown(true);
                    }}
                    onFocus={() => setManifestShowITwinDropdown(true)}
                    disabled={iTwinsLoading}
                    className="text-sm pr-8"
                  />
                  {selectedITwinId && manifestITwinSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedITwinId('');
                        setManifestITwinSearch('');
                        setManifestShowITwinDropdown(false);
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {manifestShowITwinDropdown && !iTwinsLoading && (
                    <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                      {!manifestITwinSearch && getRecentITwins().length > 0 && (
                        <>
                          <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 border-b">
                            Recent iTwins
                          </div>
                          {getRecentITwins().map((recentITwin: iTwin) => (
                            <div
                              key={`recent-m-${recentITwin.id}`}
                              className="px-3 py-2 hover:bg-muted cursor-pointer text-sm border-b border-border/20"
                              onClick={() => {
                                setSelectedITwinId(recentITwin.id);
                                setManifestITwinSearch(`${recentITwin.displayName} (${recentITwin.id.slice(0,8)}…)`);
                                setManifestShowITwinDropdown(false);
                                addToRecentITwins(recentITwin);
                              }}
                            >
                              <div className="font-medium">{recentITwin.displayName}</div>
                              <div className="text-xs text-muted-foreground">{recentITwin.id}</div>
                            </div>
                          ))}
                          {iTwins.length > 0 && (
                            <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 border-b">
                              All iTwins (type to search)
                            </div>
                          )}
                        </>
                      )}
                      {iTwins
                        .filter(t => !manifestITwinSearch || t.displayName.toLowerCase().includes(manifestITwinSearch.toLowerCase()) || t.id.toLowerCase().includes(manifestITwinSearch.toLowerCase()))
                        .slice(0, manifestITwinSearch ? 20 : 10)
                        .map(t => (
                          <div
                            key={t.id}
                            className="px-3 py-2 hover:bg-muted cursor-pointer text-sm border-b border-border/20 last:border-0"
                            onClick={() => {
                              setSelectedITwinId(t.id);
                              setManifestITwinSearch(`${t.displayName} (${t.id.slice(0,8)}…)`);
                              setManifestShowITwinDropdown(false);
                              addToRecentITwins(t);
                            }}
                          >
                            <div className="font-medium">{t.displayName}</div>
                            <div className="text-xs text-muted-foreground">{t.id}</div>
                          </div>
                        ))}
                      {manifestITwinSearch && iTwins.filter(t => t.displayName.toLowerCase().includes(manifestITwinSearch.toLowerCase()) || t.id.toLowerCase().includes(manifestITwinSearch.toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No iTwins found matching "{manifestITwinSearch}"</div>
                      )}
                      {iTwins.length === 0 && !manifestITwinSearch && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">No iTwins available</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="manifest-im">iModel<span className="text-red-500 ml-0.5">*</span></Label>
                  <div className="relative" ref={manifestIModelDropdownRef}>
                    <Input
                      id="manifest-im"
                      placeholder={!selectedITwinId ? 'Select an iTwin first' : manifestIModels.length ? 'Search and select an iModel…' : 'No iModels yet, create one'}
                      value={manifestIModelSearch}
                      onChange={(e) => { setManifestIModelSearch(e.target.value); setManifestShowIModelDropdown(true); }}
                      onFocus={() => selectedITwinId && setManifestShowIModelDropdown(true)}
                      disabled={!selectedITwinId}
                      className="text-sm pr-8"
                    />
                    {manifestIModelId && manifestIModelSearch && (
                      <button
                        type="button"
                        onClick={() => { setManifestIModelId(''); setManifestIModelSearch(''); setManifestShowIModelDropdown(false); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    {manifestShowIModelDropdown && selectedITwinId && (
                      <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                        <div
                          className="px-3 py-2 hover:bg-muted cursor-pointer text-sm border-b border-border/20 bg-blue-50 dark:bg-blue-950/20"
                          onClick={() => { setShowManifestCreateIModelModal(true); setManifestShowIModelDropdown(false); }}
                        >
                          <div className="flex items-center gap-2 font-medium text-blue-600 dark:text-blue-400"><Plus className="h-4 w-4" />Create New iModel</div>
                          <div className="text-xs text-blue-500 dark:text-blue-300">Create a new iModel in this iTwin</div>
                        </div>
                        {manifestIModels
                          .filter(m => !manifestIModelSearch || m.displayName.toLowerCase().includes(manifestIModelSearch.toLowerCase()) || m.id.toLowerCase().includes(manifestIModelSearch.toLowerCase()))
                          .slice(0, 20)
                          .map(m => (
                            <div
                              key={m.id}
                              className="px-3 py-2 hover:bg-muted cursor-pointer text-sm border-b border-border/20 last:border-0"
                              onClick={() => {
                                setManifestIModelId(m.id);
                                setManifestIModelSearch(`${m.displayName} (${m.id.slice(0,8)}…)`);
                                setManifestShowIModelDropdown(false);
                              }}
                            >
                              <div className="font-medium">{m.displayName}</div>
                              <div className="text-xs text-muted-foreground">{m.id}</div>
                            </div>
                          ))}
                        {manifestIModels.filter(m => m.displayName.toLowerCase().includes(manifestIModelSearch.toLowerCase()) || m.id.toLowerCase().includes(manifestIModelSearch.toLowerCase())).length === 0 && manifestIModelSearch && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No iModels found matching "{manifestIModelSearch}"</div>
                        )}
                        {manifestIModels.length === 0 && !manifestIModelSearch && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No iModels in this iTwin</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sf">Source File Id<span className="text-red-500 ml-0.5">*</span></Label>
                  <Input id="sf" placeholder="blob-container-name" value={sourceFileId} onChange={e=>setSourceFileId(e.target.value)} />
                  <p className="text-[10px] text-muted-foreground">Container name only (no URL). Example: <code>itwin</code></p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="sas">SAS URL (optional)</Label>
                  <Input id="sas" placeholder="https://account.blob.core.windows.net/itwin?..." value={manifestSourceFileSasUrl} onChange={e=>setManifestSourceFileSasUrl(e.target.value)} />
                  <p className="text-[10px] text-muted-foreground">Provide to send explicit run body; otherwise omit.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="manifest-connector">Connector Type</Label>
                  <select
                    id="manifest-connector"
                    value={manifestConnectorType}
                    onChange={e => setManifestConnectorType(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm bg-background"
                  >
                    <option value="DGN">DGN</option>
                    <option value="IFC">IFC</option>
                      <option value="NWD">Navisworks NWD</option>
                    <option value="REVIT">Revit</option>
                    <option value="SKETCHUP">SketchUp</option>
                    <option value="3DSMAXFBX">3ds Max FBX</option>
                    <option value="ARCHICAD">ArchiCAD</option>
                    <option value="DWGIGDS">DWG</option>
                    <option value="CITYGML">CityGML</option>
                    <option value="GBXML">gbXML</option>
                    <option value="IES">IES</option>
                    <option value="RHINO">Rhino</option>
                    <option value="CITYJSON">CityJSON</option>
                    <option value="SPECKLE">Speckle</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground">Used only when SAS URL supplied.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="dn">Display Name</Label>
                  <Input id="dn" placeholder="My Connection" value={displayName} onChange={e=>setDisplayName(e.target.value)} />
                </div>
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex items-center gap-2">
                <Button onClick={createConnection} disabled={!canCreate}>
                  {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
                  Create ManifestConnection
                </Button>
                <Button variant="outline" onClick={startRun} disabled={!canRun}>
                  {runSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
                  Start Run
                </Button>
              </div>
              {createdConnection && (
                <div className="text-xs text-muted-foreground">
                  Created connection: <span className="font-mono">{createdConnection.id}</span>
                </div>
              )}
              {runLocation && (
                <div className="text-xs">
                  Run Location: <a href={runLocation} target="_blank" rel="noreferrer" className="underline">{runLocation}</a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Storage Connections Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-4 w-4"/>
              Storage Connections
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p className="mb-4 text-xs">
              Create storage connections to sync files from iTwin Storage directly into iModels. 
              Select an iTwin to load available storage files, then choose the appropriate connector type.
            </p>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="storage-tw">iTwin</Label>
                <div className="relative" ref={storageITwinDropdownRef}>
                  <Input
                    id="storage-tw"
                    placeholder={iTwinsLoading ? 'Loading iTwins…' : 'Search and select an iTwin…'}
                    value={storageITwinSearch}
                    onChange={(e) => {
                      setStorageITwinSearch(e.target.value);
                      setStorageShowITwinDropdown(true);
                    }}
                    onFocus={() => setStorageShowITwinDropdown(true)}
                    disabled={iTwinsLoading}
                    className="text-sm pr-8"
                  />
                  {selectedITwinId && storageITwinSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedITwinId('');
                        setStorageITwinSearch('');
                        setSelectedStorageFiles([]);
                        setStorageShowITwinDropdown(false);
                        setStorageIModels([]);
                        setStorageIModelId('');
                        setStorageIModelSearch('');
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {storageShowITwinDropdown && !iTwinsLoading && (
                    <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                      {/* Recent iTwins Section - only show when no search term */}
                      {!storageITwinSearch && getRecentITwins().length > 0 && (
                        <>
                          <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 border-b">
                            Recent iTwins
                          </div>
                          {getRecentITwins().map((recentITwin: iTwin) => (
                            <div
                              key={`recent-${recentITwin.id}`}
                              className="px-3 py-2 hover:bg-muted cursor-pointer text-sm border-b border-border/20"
                              onClick={() => {
                                setSelectedITwinId(recentITwin.id);
                                setStorageITwinSearch(`${recentITwin.displayName} (${recentITwin.id.slice(0,8)}…)`);
                                setStorageShowITwinDropdown(false);
                                loadIModels(recentITwin.id);
                              }}
                            >
                              <div className="font-medium">{recentITwin.displayName}</div>
                              <div className="text-xs text-muted-foreground">{recentITwin.id}</div>
                            </div>
                          ))}
                          {iTwins.length > 0 && (
                            <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 border-b">
                              All iTwins (type to search)
                            </div>
                          )}
                        </>
                      )}
                      
                      {/* All iTwins - filtered when searching, limited when not */}
                      {iTwins
                        .filter(t => 
                          !storageITwinSearch || 
                          t.displayName.toLowerCase().includes(storageITwinSearch.toLowerCase()) ||
                          t.id.toLowerCase().includes(storageITwinSearch.toLowerCase())
                        )
                        .slice(0, storageITwinSearch ? 20 : 10) // Show fewer when not searching
                        .map(t => (
                          <div
                            key={t.id}
                            className="px-3 py-2 hover:bg-muted cursor-pointer text-sm border-b border-border/20 last:border-0"
                            onClick={() => {
                              setSelectedITwinId(t.id);
                              setStorageITwinSearch(`${t.displayName} (${t.id.slice(0,8)}…)`);
                              setStorageShowITwinDropdown(false);
                              addToRecentITwins(t);
                              loadIModels(t.id);
                            }}
                          >
                            <div className="font-medium">{t.displayName}</div>
                            <div className="text-xs text-muted-foreground">{t.id}</div>
                          </div>
                        ))}
                      
                      {/* No results message */}
                      {storageITwinSearch && iTwins.filter(t => 
                        t.displayName.toLowerCase().includes(storageITwinSearch.toLowerCase()) ||
                        t.id.toLowerCase().includes(storageITwinSearch.toLowerCase())
                      ).length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No iTwins found matching "{storageITwinSearch}"
                        </div>
                      )}
                      
                      {iTwins.length === 0 && !storageITwinSearch && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No iTwins available
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="storage-im">iModel<span className="text-red-500 ml-0.5">*</span></Label>
                  <div className="relative" ref={storageIModelDropdownRef}>
                    <Input 
                      id="storage-im" 
                      placeholder={storageIModelsLoading ? 'Loading iModels…' : selectedITwinId ? 'Search and select an iModel…' : 'Select an iTwin first'}
                      value={storageIModelSearch} 
                      onChange={(e) => {
                        setStorageIModelSearch(e.target.value);
                        setStorageShowIModelDropdown(true);
                      }}
                      onFocus={() => selectedITwinId && setStorageShowIModelDropdown(true)}
                      disabled={storageIModelsLoading || !selectedITwinId}
                      className="text-sm pr-8"
                    />
                    {storageIModelId && storageIModelSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setStorageIModelId('');
                          setStorageIModelSearch('');
                          setStorageShowIModelDropdown(false);
                        }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    {storageShowIModelDropdown && !storageIModelsLoading && selectedITwinId && (
                      <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                        {/* Create New iModel Option */}
                        <div
                          className="px-3 py-2 hover:bg-muted cursor-pointer text-sm border-b border-border/20 bg-blue-50 dark:bg-blue-950/20"
                          onClick={() => {
                            setShowCreateIModelModal(true);
                            setStorageShowIModelDropdown(false);
                          }}
                        >
                          <div className="flex items-center gap-2 font-medium text-blue-600 dark:text-blue-400">
                            <Plus className="h-4 w-4" />
                            Create New iModel
                          </div>
                          <div className="text-xs text-blue-500 dark:text-blue-300">
                            Create a new iModel in this iTwin
                          </div>
                        </div>
                        
                        {/* Existing iModels */}
                        {storageIModels
                          .filter(m => 
                            m.displayName.toLowerCase().includes(storageIModelSearch.toLowerCase()) ||
                            m.id.toLowerCase().includes(storageIModelSearch.toLowerCase())
                          )
                          .slice(0, 20)
                          .map(m => (
                            <div
                              key={m.id}
                              className="px-3 py-2 hover:bg-muted cursor-pointer text-sm border-b border-border/20 last:border-0"
                              onClick={() => {
                                setStorageIModelId(m.id);
                                setStorageIModelSearch(`${m.displayName} (${m.id.slice(0,8)}…)`);
                                setStorageShowIModelDropdown(false);
                              }}
                            >
                              <div className="font-medium">{m.displayName}</div>
                              <div className="text-xs text-muted-foreground">{m.id}</div>
                            </div>
                          ))}
                        {storageIModels.filter(m => 
                          m.displayName.toLowerCase().includes(storageIModelSearch.toLowerCase()) ||
                          m.id.toLowerCase().includes(storageIModelSearch.toLowerCase())
                        ).length === 0 && storageIModelSearch && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            No iModels found matching "{storageIModelSearch}"
                          </div>
                        )}
                        {storageIModels.length === 0 && !storageIModelSearch && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            No iModels available in this iTwin
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="storage-display">Display Name</Label>
                  <Input 
                    id="storage-display" 
                    placeholder="My Storage Connection" 
                    value={storageDisplayName} 
                    onChange={e => setStorageDisplayName(e.target.value)} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="storage-file">Storage File<span className="text-red-500 ml-0.5">*</span></Label>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        id="storage-file"
                        placeholder={!selectedITwinId ? 'Select an iTwin first' : 'Click Browse to select file(s)'}
                        value={selectedStorageFiles.length === 0 ? '' : 
                               selectedStorageFiles.length === 1 ? 
                                 `${selectedStorageFiles[0].displayName} (${((selectedStorageFiles[0].size || 0) / 1024 / 1024).toFixed(2)} MB)` :
                                 `${selectedStorageFiles.length} files selected`}
                        readOnly
                        className="flex-1"
                        disabled={!selectedITwinId}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={openStorageBrowser}
                        disabled={!selectedITwinId}
                        className="shrink-0"
                      >
                        Browse
                      </Button>
                    </div>
                    
                    {selectedStorageFiles.length > 0 && (
                      <div className="bg-muted/50 border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Selected Files ({selectedStorageFiles.length})</span>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1.5 text-xs">
                              <input
                                type="checkbox"
                                checked={multiSelectMode}
                                onChange={(e) => {
                                  setMultiSelectMode(e.target.checked);
                                  if (!e.target.checked && selectedStorageFiles.length > 1) {
                                    setSelectedStorageFiles(selectedStorageFiles.slice(0, 1));
                                  }
                                }}
                                className="w-3 h-3"
                              />
                              Multi-select
                            </label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedStorageFiles([])}
                              className="h-6 px-2 text-xs"
                            >
                              Clear
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {selectedStorageFiles.map((file, index) => (
                            <div key={file.id} className="flex items-center justify-between bg-background rounded px-2 py-1">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{file.displayName}</div>
                                <div className="text-xs text-muted-foreground">
                                  {((file.size || 0) / 1024 / 1024).toFixed(2)} MB
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedStorageFiles(prev => prev.filter((_, i) => i !== index))}
                                className="h-6 w-6 p-0 shrink-0 ml-2"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="connector">Connector Type</Label>
                  <select 
                    id="connector" 
                    value={connectorType} 
                    onChange={e => setConnectorType(e.target.value)} 
                    className="w-full border rounded px-2 py-1 text-sm bg-background"
                  >
                    <option value="DGN">DGN</option>
                    <option value="IFC">IFC</option>
                      <option value="NWD">Navisworks NWD</option>
                    <option value="REVIT">Revit</option>
                    <option value="SKETCHUP">SketchUp</option>
                    <option value="3DSMAXFBX">3ds Max FBX</option>
                    <option value="ARCHICAD">ArchiCAD</option>
                    <option value="DWGIGDS">DWG</option>
                    <option value="CITYGML">CityGML</option>
                    <option value="GBXML">gbXML</option>
                    <option value="IES">IES</option>
                    <option value="RHINO">Rhino</option>
                    <option value="CITYJSON">CityJSON</option>
                    <option value="SPECKLE">Speckle</option>
                  </select>
                </div>
              </div>

              {storageError && <p className="text-xs text-red-600">{storageError}</p>}
              
              <div className="flex items-center gap-2">
                <Button 
                  onClick={createStorageConnection} 
                  disabled={!storageIModelId || selectedStorageFiles.length === 0 || creatingStorageConnection}
                >
                  {creatingStorageConnection && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
                  Create Storage Connection
                </Button>
                <Button 
                  variant="outline" 
                  onClick={startStorageRun} 
                  disabled={!createdStorageConnection || storageRunSubmitting}
                >
                  {storageRunSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
                  Start Run
                </Button>
              </div>
              
              {createdStorageConnection && (
                <div className="text-xs text-muted-foreground">
                  Created storage connection: <span className="font-mono">{createdStorageConnection.id}</span>
                </div>
              )}
              
              {storageRunLocation && (
                <div className="text-xs">
                  Storage Run Location: <a href={storageRunLocation} target="_blank" rel="noreferrer" className="underline">{storageRunLocation}</a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Storage File Browser Dialog */}
        <Dialog open={storageBrowserOpen} onOpenChange={setStorageBrowserOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Browse Storage Files</DialogTitle>
              <DialogDescription>Select files from Storage for the Storage Connection.</DialogDescription>
            </DialogHeader>
            
            <div className="flex-1 overflow-hidden flex flex-col space-y-4">
              {/* Breadcrumb Navigation */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <button
                  onClick={() => {
                    setStorageBrowserPath([]);
                    openStorageBrowser();
                  }}
                  className="hover:text-foreground"
                >
                  Root
                </button>
                {storageBrowserPath.map((folder, index) => (
                  <div key={folder.id} className="flex items-center gap-2">
                    <ChevronRight className="h-3 w-3" />
                    <button
                      onClick={() => {
                        const newPath = storageBrowserPath.slice(0, index + 1);
                        setStorageBrowserPath(newPath);
                        navigateToFolder(folder.id, folder.name);
                      }}
                      className="hover:text-foreground"
                    >
                      {folder.name}
                    </button>
                  </div>
                ))}
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={navigateUp}
                  disabled={storageBrowserPath.length === 0}
                  className="flex items-center gap-2"
                >
                  <ArrowUp className="h-4 w-4" />
                  Up
                </Button>
                
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={multiSelectMode}
                      onChange={(e) => {
                        setMultiSelectMode(e.target.checked);
                        if (!e.target.checked && selectedStorageFiles.length > 1) {
                          setSelectedStorageFiles(selectedStorageFiles.slice(0, 1));
                        }
                      }}
                    />
                    Multi-select mode
                  </label>
                  <span className="text-sm text-muted-foreground">
                    {selectedStorageFiles.length} selected
                  </span>
                </div>
              </div>

              {/* File/Folder List */}
              <div className="flex-1 overflow-auto border rounded-lg">
                <div className="grid gap-1 p-2">
                  {storageBrowserItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer ${
                        item.type !== 'folder' && selectedStorageFiles.some(f => f.id === item.id) ? 'bg-primary/10 border border-primary/20' : ''
                      }`}
                      onClick={() => {
                        if (item.type === 'folder') {
                          navigateToFolder(item.id, item.displayName);
                        } else {
                          toggleFileSelection(item);
                        }
                      }}
                    >
                      {item.type === 'folder' ? (
                        <Folder className="h-4 w-4 text-blue-500" />
                      ) : (
                        <FileType className="h-4 w-4 text-gray-500" />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.displayName}</div>
                        {item.type !== 'folder' && (
                          <div className="text-xs text-muted-foreground">
                            {((item.size || 0) / 1024 / 1024).toFixed(2)} MB
                          </div>
                        )}
                      </div>
                      
                      {item.type !== 'folder' && multiSelectMode && (
                        <input
                          type="checkbox"
                          checked={selectedStorageFiles.some(f => f.id === item.id)}
                          onChange={() => toggleFileSelection(item)}
                          className="shrink-0"
                        />
                      )}
                    </div>
                  ))}
                  
                  {storageBrowserItems.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No files or folders found
                    </div>
                  )}
                </div>
              </div>

              {/* Selection Summary and Actions */}
              {selectedStorageFiles.length > 0 && (
                <div className="border-t pt-4 flex items-center justify-between">
                  <div className="text-sm">
                    {selectedStorageFiles.length} file(s) selected
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setSelectedStorageFiles([])}>
                      Clear Selection
                    </Button>
                    <Button onClick={confirmMultiSelection}>
                      Use Selected Files
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
        {/* Manifest Create iModel Modal */}
        <Dialog open={showManifestCreateIModelModal} onOpenChange={setShowManifestCreateIModelModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New iModel (Manifest)</DialogTitle>
              <DialogDescription>Create a new iModel in the selected iTwin for manifest synchronization.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-manifest-imodel-name">iModel Name<span className="text-red-500 ml-0.5">*</span></Label>
                <Input
                  id="new-manifest-imodel-name"
                  value={newManifestIModelName}
                  onChange={(e) => setNewManifestIModelName(e.target.value)}
                  placeholder="Enter iModel name"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-manifest-imodel-description">Description (optional)</Label>
                <Input
                  id="new-manifest-imodel-description"
                  value={newManifestIModelDescription}
                  onChange={(e) => setNewManifestIModelDescription(e.target.value)}
                  placeholder="Enter description"
                  className="w-full"
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex items-center justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowManifestCreateIModelModal(false);
                    setNewManifestIModelName('');
                    setNewManifestIModelDescription('');
                  }}
                  disabled={creatingManifestIModel}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createNewManifestIModel}
                  disabled={!newManifestIModelName.trim() || creatingManifestIModel}
                >
                  {creatingManifestIModel && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
                  Create iModel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Create iModel Modal */}
        <Dialog open={showCreateIModelModal} onOpenChange={setShowCreateIModelModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New iModel</DialogTitle>
              <DialogDescription>Create a new iModel in the selected iTwin for storage synchronization.</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-imodel-name">iModel Name<span className="text-red-500 ml-0.5">*</span></Label>
                <Input
                  id="new-imodel-name"
                  value={newIModelName}
                  onChange={(e) => setNewIModelName(e.target.value)}
                  placeholder="Enter iModel name"
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-imodel-description">Description (optional)</Label>
                <Input
                  id="new-imodel-description"
                  value={newIModelDescription}
                  onChange={(e) => setNewIModelDescription(e.target.value)}
                  placeholder="Enter description"
                  className="w-full"
                />
              </div>
              
              {storageError && (
                <p className="text-xs text-red-600">{storageError}</p>
              )}
              
              <div className="flex items-center justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateIModelModal(false);
                    setNewIModelName('');
                    setNewIModelDescription('');
                    setStorageError(null);
                  }}
                  disabled={creatingIModel}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createNewIModel}
                  disabled={!newIModelName.trim() || creatingIModel}
                >
                  {creatingIModel && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
                  Create iModel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </div>
  );
}
