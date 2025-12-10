import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ArrowLeft, GitBranch, Clock, User, Download, Eye, FileOutput, Loader2, Folder as FolderIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { IModel, Changeset, NamedVersion } from '../services/types';
// import { exportService } from '../services/api/ExportService'; // deprecated direct export usage
import { exportConnectionService, type ExportRun, type ExportConnection, type CreateRunRequest } from '../services/api/ExportConnectionService';
import { exportAuthorizationService } from '../services/api/ExportAuthorizationService';
import { storageService } from '../services/api/StorageService';
import { azureBlobService } from '../services/api/AzureBlobService';
import { savedViewsService, type SavedView } from '../services/api/SavedViewsService';
import { toast } from 'sonner';
import { iModelService } from '../services/api/IModelService';
import { CreateNamedVersionModal } from './CreateNamedVersionModal';

interface IModelVersionsComponentProps {
  iModel: IModel;
  iTwinId?: string;
}

export default function IModelVersionsComponent({ iModel, iTwinId }: IModelVersionsComponentProps) {
  const navigate = useNavigate();
  const [changesets, setChangesets] = useState<Changeset[]>([]);
  const [namedVersions, setNamedVersions] = useState<NamedVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [runs, setRuns] = useState<ExportRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  // const [exportDownloadUrls, setExportDownloadUrls] = useState<Record<string,string>>({}); // disabled in root test
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [ifcVersion, setIfcVersion] = useState<'IFC2X3' | 'IFC4' | 'IFC4X3'>('IFC4');
  // AuthorizationInformation state
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isUserAuthorized, setIsUserAuthorized] = useState<boolean | null>(null);
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(false);
  // Folder selection re-enabled
  const [storageFolders, setStorageFolders] = useState<{ id: string; displayName: string }[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [loadingFolders, setLoadingFolders] = useState(false);
  // Azure Blob optional upload
  const [azureContainerSasUrl, setAzureContainerSasUrl] = useState('');
  const [autoAzureUpload, setAutoAzureUpload] = useState(false);
  const [azureUploadStatus, setAzureUploadStatus] = useState<Record<string,{ uploading: boolean; success?: boolean; error?: string; blobUrl?: string }>>({});
  // Saved views + mapping file placeholder
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [savedViewsLoading, setSavedViewsLoading] = useState(false);
  const [selectedSavedViewId, setSelectedSavedViewId] = useState<string>('');
  const [mappingFileId, setMappingFileId] = useState<string>('');
  // Bulk copy extensions selection & progress
  const bulkExtOptions = useMemo(()=>['ifc','rvt','dgn','dwg'] as const, []);
  type BulkExt = typeof bulkExtOptions[number];
  const [selectedBulkExts, setSelectedBulkExts] = useState<BulkExt[]>(['ifc']);
  const [bulkCopying, setBulkCopying] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ total: number; done: number; current?: string; errors: number }>({ total: 0, done: 0, errors: 0 });
  const [bulkResults, setBulkResults] = useState<Array<{ fileName: string; status: 'ok'|'error'; message?: string }>>([]);
  const bulkAbortRef = useState<{ aborted: boolean }>({ aborted: false })[0];
  // Exported IFC file mapping per named version
  interface LocatedIfcInfo { fileId?: string; displayName?: string; downloadUrl?: string; locating: boolean; error?: string }
  const [exportedIfc, setExportedIfc] = useState<Record<string, LocatedIfcInfo>>({});
  // const [uploadingToStorage, setUploadingToStorage] = useState<string | null>(null); // disabled

  useEffect(() => {
    const loadChangesetsAndVersions = async () => {
      if (!iModel.id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        console.log('Loading changesets and named versions for iModel:', iModel.id);
        console.log('iTwinId:', iTwinId);
        
        // Load changesets and named versions in parallel
        const [changeSetsData, namedVersionsData] = await Promise.all([
          iModelService.getChangesets(iModel.id, iTwinId),
          iModelService.getNamedVersions(iModel.id, iTwinId)
        ]);
        
        console.log('Loaded changesets:', changeSetsData);
        console.log('Loaded named versions:', namedVersionsData);
        
        setChangesets(changeSetsData);
        setNamedVersions(namedVersionsData);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Failed to load changesets and named versions:', error);
        setError(`Failed to load data: ${errorMessage}`);
        // Set empty arrays on error
        setChangesets([]);
        setNamedVersions([]);
      } finally {
        setLoading(false);
      }
    };

    loadChangesetsAndVersions();
  }, [iModel.id, iTwinId]);

  const handleNamedVersionCreated = async () => {
    // Reload the named versions after creating a new one
    try {
      console.log('Reloading named versions after creation...');
      const namedVersionsData = await iModelService.getNamedVersions(iModel.id, iTwinId);
      console.log('Reloaded named versions:', namedVersionsData);
      setNamedVersions(namedVersionsData);
    } catch (error) {
      console.error('Failed to reload named versions:', error);
    }
  };

  const handleGoBack = () => {
    if (iTwinId) {
      navigate(`/itwins/${iTwinId}/imodels`);
    } else {
      navigate(-1);
    }
  };

  const handleViewNamedVersion = (version: NamedVersion) => {
    // TODO: Implement named version viewing functionality
    // For now, show an alert with version details
    alert(`Viewing Named Version: ${version.displayName}\nChangeset: ${version.changesetId}\nDescription: ${version.description || 'No description'}`);
    
    // Future: This could navigate to a dedicated view or open a viewer
    // navigate(`/itwins/${iTwinId}/imodels/${iModel.id}/versions/${version.id}/view`);
  };

  const handleDownloadNamedVersion = async (version: NamedVersion) => {
    try {
      console.log('Downloading named version:', version.displayName, 'at changeset index:', version.changesetIndex);
      
      const fileName = `${iModel.displayName}-${version.displayName}-changeset-${version.changesetIndex}.bim`;
      await iModelService.downloadIModelAtChangeset(iModel.id, version.changesetIndex, fileName);
      
      // Could show a success toast here
      console.log('Download initiated for named version:', version.displayName);
    } catch (error) {
      console.error('Failed to download named version:', error);
      alert(`Failed to download named version: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDownloadChangeset = async (changeset: Changeset) => {
    try {
      console.log('Downloading changeset:', changeset.displayName, 'changeset index:', changeset.index);
      
      const fileName = `${iModel.displayName}-changeset-${changeset.index}-${changeset.displayName}.bim`;
      await iModelService.downloadIModelAtChangeset(iModel.id, changeset.index, fileName);
      
      console.log('Download initiated for changeset:', changeset.displayName);
    } catch (error) {
      console.error('Failed to download changeset:', error);
      alert(`Failed to download changeset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const exportNamedVersions = () => {
    if (!namedVersions || namedVersions.length === 0) {
      alert('No named versions to export');
      return;
    }
    const minimal = namedVersions.map(v => ({
      id: v.id,
      displayName: v.displayName,
      description: v.description,
      changesetId: v.changesetId,
      changesetIndex: v.changesetIndex,
      createdDateTime: v.createdDateTime,
      creatorName: (v as unknown as { creatorName?: string }).creatorName || v.creatorId,
    }));
    const blob = new Blob([JSON.stringify({ iModelId: iModel.id, count: minimal.length, namedVersions: minimal }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().replace(/[:]/g,'-');
    a.download = `${iModel.displayName || iModel.id}-named-versions-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Folder loading disabled during root test

  const ensureConnection = async (): Promise<ExportConnection | null> => {
    if (connectionId) {
      const existing = await exportConnectionService.getConnection(connectionId);
      if (existing) return existing;
    }
    // Create a new connection for this iModel/iTwin context
    const created = await exportConnectionService.createConnection({
      iModelId: iModel.id,
      displayName: `conn-${iModel.displayName?.slice(0,12) || iModel.id.slice(0,8)}`,
      authenticationType: 'User',
      projectId: iTwinId,
      description: 'UI generated export connection'
    });
    if (created) setConnectionId(created.id);
    return created;
  };

  const startIFCExport = async (version: NamedVersion) => {
    if (exportingId) return;
    setExportingId(version.id);
    try {
      // Block if authorization not yet granted
      if (isAuthChecked && isUserAuthorized === false) {
        toast.error('Authorization required', { description: 'Complete long-running export authorization then retry.' });
        setExportingId(null);
        return;
      }
      if (!isAuthChecked) {
        // Perform on-demand check if user skipped initial automatic check
        await checkAuthorization();
        if (isUserAuthorized === false) {
          toast.error('Authorization required', { description: 'Use Authorize button, then Retry.' });
          setExportingId(null);
          return;
        }
      }
      const conn = await ensureConnection();
      if (!conn) throw new Error('No export connection');
      const outputOptions: CreateRunRequest['outputOptions'] = selectedFolderId
        ? { location: 'STORAGE', folderId: selectedFolderId, saveLogs: true, replaceOlderFile: false }
        : { location: 'STORAGE', saveLogs: true, replaceOlderFile: false };
      const started = await exportConnectionService.createRun(conn.id, {
        exportType: 'IFC',
        ifcVersion: mapIfcVersion(ifcVersion),
        projectId: iTwinId,
        inputOptions: {
          changesetId: version.changesetId,
          savedViewId: selectedSavedViewId || undefined,
          mappingFileId: mappingFileId || undefined,
        },
        outputOptions
      });
      if (!started) throw new Error('Run start failed');
      toast.info('IFC export started', { description: `${version.displayName} • ${ifcVersion}` });
      pollRunsList(conn.id, version.id, 0);
    } catch (e) {
      console.error(e);
      toast.error('Failed to start IFC export run');
      setExportingId(null);
    }
  };

  const pollRunsList = async (connId: string, versionId: string, attempt: number) => {
    const backoff = [3,5,8,12,20,30];
    const currentRuns: ExportRun[] = await exportConnectionService.listRuns(connId);
    setRuns(currentRuns);
    const latest = currentRuns[0]; // Assuming newest first; adjust if needed
    if (!latest) {
      if (attempt < backoff.length) setTimeout(()=>pollRunsList(connId, versionId, attempt+1), backoff[attempt]*1000); else setExportingId(null);
      return;
    }
    const state = latest.state.toLowerCase();
    if (state === 'completed') {
      // success or failure?
      if (latest.result && latest.result.toLowerCase() !== 'success') {
        toast.error('IFC export failed');
        setExportingId(null); return;
      }
      toast.success('IFC export completed');
      // Attempt to locate exported IFC file
      const version = namedVersions.find(v => v.id === versionId);
      if (version) locateExportedIfc(version, 0);
      setExportingId(null);
      return;
    }
    if (state === 'failed') {
      toast.error('IFC export failed'); setExportingId(null); return;
    }
    const nextDelay = backoff[Math.min(attempt, backoff.length-1)] * 1000;
    setTimeout(()=>pollRunsList(connId, versionId, attempt+1), nextDelay);
  };

  const mapIfcVersion = (v: 'IFC2X3' | 'IFC4' | 'IFC4X3'): CreateRunRequest['ifcVersion'] => {
    // Map simplified selector to accepted labels from tutorial
    switch (v) {
      case 'IFC2X3': return 'IFC2x3';
      case 'IFC4X3': return 'IFC4.3';
      case 'IFC4':
      default: return 'IFC4 RV 1.2';
    }
  };

  // AuthorizationInformation check (initial)
  const checkAuthorization = async () => {
    try {
      setAuthChecking(true);
      const origin = window.location.origin;
      const info = await exportAuthorizationService.getAuthorizationInformation(origin);
      if (info) {
        setIsUserAuthorized(info.isUserAuthorized);
        setAuthorizationUrl(info._links?.authorizationUrl?.href || null);
      } else {
        setIsUserAuthorized(null);
        setAuthorizationUrl(null);
      }
      setIsAuthChecked(true);
    } catch (e) {
      console.warn('AuthorizationInformation request failed', e);
      setIsUserAuthorized(null);
      setAuthorizationUrl(null);
      setIsAuthChecked(true);
    } finally {
      setAuthChecking(false);
    }
  };

  // Run once when versions tab data loads
  useEffect(() => {
    if (!isAuthChecked && namedVersions.length > 0) {
      // Fire and forget, user can still trigger manual retry
      checkAuthorization();
    }
  }, [namedVersions, isAuthChecked]);

  // Load storage top-level folders for selection
  useEffect(() => {
    const loadFolders = async () => {
      if (!iTwinId) return;
      setLoadingFolders(true);
      try {
        const top = await storageService.getTopLevel(iTwinId, 50, 0);
        // Filter only folders
        const folders = (top.items || []).filter(item => item.type === 'folder').map(f => ({ id: f.id, displayName: f.displayName || f.id }));
        setStorageFolders(folders);
        // Keep previously selected if still exists
        if (selectedFolderId && !folders.find(f=>f.id===selectedFolderId)) {
          setSelectedFolderId('');
        }
        // Restore saved selection if none currently chosen
        if (!selectedFolderId) {
          const saved = typeof window !== 'undefined' ? localStorage.getItem(`exportFolder:${iTwinId}`) : null;
          if (saved && folders.find(f=>f.id===saved)) setSelectedFolderId(saved);
        }
      } catch (e) {
        console.warn('Failed to load storage folders', e);
      } finally {
        setLoadingFolders(false);
      }
    };
    loadFolders();
  }, [iTwinId, selectedFolderId]);

  // Persist folder selection changes
  useEffect(() => {
    if (iTwinId) {
      if (selectedFolderId) localStorage.setItem(`exportFolder:${iTwinId}`, selectedFolderId);
      else localStorage.removeItem(`exportFolder:${iTwinId}`);
    }
  }, [selectedFolderId, iTwinId]);

  const refreshRuns = async () => {
    if (!connectionId) return;
    setRunsLoading(true);
    try {
      const latest = await exportConnectionService.listRuns(connectionId);
      setRuns(latest);
      toast.info('Runs refreshed');
    } catch {
      toast.error('Failed to refresh runs');
    } finally {
      setRunsLoading(false);
    }
  };
  // Persist bulk extension selection
  useEffect(()=>{
    const key = iTwinId ? `bulkExts:${iTwinId}` : 'bulkExts:global';
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) {
          setSelectedBulkExts(parsed.filter((e: string)=> (bulkExtOptions as readonly string[]).includes(e)) as BulkExt[]);
        }
      } catch (err) {
        console.warn('Failed parsing bulkExts from storage', err);
      }
    }
  }, [iTwinId, bulkExtOptions]);
  useEffect(()=>{
    const key = iTwinId ? `bulkExts:${iTwinId}` : 'bulkExts:global';
    localStorage.setItem(key, JSON.stringify(selectedBulkExts));
  }, [selectedBulkExts, iTwinId]);

  const toggleBulkExt = (ext: BulkExt) => {
    setSelectedBulkExts(prev => prev.includes(ext) ? prev.filter(e=>e!==ext) : [...prev, ext]);
  };

  const startBulkCopy = async () => {
    if (!azureContainerSasUrl) { toast.error('Provide Azure SAS URL first'); return; }
    if (bulkCopying) return;
    setBulkCopying(true);
    setBulkResults([]);
    setBulkProgress({ total: 0, done: 0, errors: 0 });
    bulkAbortRef.aborted = false;
    try {
      // Load items from storage (selectedFolderId or root)
      let items: StorageGenericItem[] = [];
      if (selectedFolderId) {
        const folderList = await storageService.listFolder(selectedFolderId, 500, 0);
        items = (folderList.items || []) as StorageGenericItem[];
      } else if (iTwinId) {
        const top = await storageService.getTopLevel(iTwinId, 500, 0);
        items = (top.items || []) as StorageGenericItem[];
      }
      // Filter files by selected extensions (case-insensitive)
      const exts = selectedBulkExts;
      const targetFiles = items.filter(i => i.type==='file' && i.displayName && exts.some(ext => i.displayName!.toLowerCase().endsWith('.'+ext)));
      if (!targetFiles.length) { toast.info('No matching files found'); setBulkCopying(false); return; }
      setBulkProgress(p => ({ ...p, total: targetFiles.length }));
      for (const f of targetFiles) {
        if (bulkAbortRef.aborted) break;
        setBulkProgress(p => ({ ...p, current: f.displayName || f.id }));
        try {
          const dl = await storageService.getDownloadLocation(f.id);
          if (!dl) throw new Error('Missing download URL');
          const upload = await azureBlobService.uploadFromDownloadUrl(azureContainerSasUrl, dl, f.displayName || (f.id + '.dat'));
          if (!upload.success) {
            setBulkResults(r => [...r, { fileName: f.displayName || f.id, status: 'error', message: upload.error }]);
            setBulkProgress(p => ({ ...p, done: p.done+1, errors: p.errors+1 }));
          } else {
            setBulkResults(r => [...r, { fileName: f.displayName || f.id, status: 'ok' }]);
            setBulkProgress(p => ({ ...p, done: p.done+1 }));
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Unknown error';
          setBulkResults(r => [...r, { fileName: f.displayName || f.id, status: 'error', message: msg }]);
          setBulkProgress(p => ({ ...p, done: p.done+1, errors: p.errors+1 }));
        }
      }
      if (bulkAbortRef.aborted) {
        toast.info('Bulk copy aborted');
      } else {
        toast.success('Bulk copy completed', { description: `${targetFiles.length - bulkProgress.errors} succeeded, ${bulkProgress.errors} failed` });
      }
    } finally {
      setBulkCopying(false);
      setBulkProgress(p => ({ ...p, current: undefined }));
    }
  };

  const abortBulkCopy = () => {
    bulkAbortRef.aborted = true;
  };

  // Persist Azure SAS + autoUpload preference
  // Load saved views once
  useEffect(() => {
    const loadViews = async () => {
      if (!iModel.id || !iTwinId) return;
      setSavedViewsLoading(true);
      try {
        const views = await savedViewsService.listSavedViews(iTwinId, iModel.id, 100, 0);
        setSavedViews(views);
        // Preserve previously selected if still exists
        if (selectedSavedViewId && !views.find(v=>v.id===selectedSavedViewId)) {
          setSelectedSavedViewId('');
        }
      } catch (e) {
        console.warn('Failed to load saved views', e);
      } finally {
        setSavedViewsLoading(false);
      }
    };
    loadViews();
  }, [iModel.id, iTwinId, selectedSavedViewId]);

  useEffect(() => {
    const keyBase = iTwinId ? `azureUpload:${iTwinId}` : 'azureUpload:global';
    const savedSas = localStorage.getItem(`${keyBase}:sas`);
    const savedAuto = localStorage.getItem(`${keyBase}:auto`);
    if (savedSas) setAzureContainerSasUrl(savedSas);
    if (savedAuto) setAutoAzureUpload(savedAuto === 'true');
  }, [iTwinId]);
  useEffect(() => {
    const keyBase = iTwinId ? `azureUpload:${iTwinId}` : 'azureUpload:global';
    if (azureContainerSasUrl) localStorage.setItem(`${keyBase}:sas`, azureContainerSasUrl); else localStorage.removeItem(`${keyBase}:sas`);
    localStorage.setItem(`${keyBase}:auto`, String(autoAzureUpload));
  }, [azureContainerSasUrl, autoAzureUpload, iTwinId]);

  // Diagnostics: store last run detail errors
  const [runDiagnostics, setRunDiagnostics] = useState<Record<string, { jobs: Array<{ id: string; state?: string; tasks?: Array<{ id: string; phase?: string; state?: string; error?: { code?: string; message?: string; description?: string } }> }> }>>({});
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const loadRunDiagnostics = useCallback(async () => {
    if (!connectionId) return;
    // For the most recent 5 runs, fetch detail
    const target = runs.slice(0,5);
    const details: typeof runDiagnostics = {};
    for (const r of target) {
      const detail = await exportConnectionService.getRun(connectionId, r.id);
      if (detail && detail.jobs) {
        details[r.id] = { jobs: detail.jobs };
      }
    }
    setRunDiagnostics(details);
  }, [connectionId, runs]);
  // Re-run diagnostics when toggle, connection, or runs change
  useEffect(() => { if (showDiagnostics) { void loadRunDiagnostics(); } }, [showDiagnostics, connectionId, runs, loadRunDiagnostics]);

  // Heuristic: choose newest .ifc file optionally matching version displayName or iModel name
  type StorageGenericItem = { id: string; type: 'file' | 'folder'; displayName?: string; createdDateTime?: string };
  const pickIfcCandidate = (items: StorageGenericItem[], version: NamedVersion): StorageGenericItem | null => {
    const files = items.filter((i) => i.type === 'file');
    const ifcFiles = files.filter((f) => typeof f.displayName === 'string' && f.displayName!.toLowerCase().endsWith('.ifc'));
    const scored = (ifcFiles.length ? ifcFiles : files).map((f) => {
      const name = f.displayName || '';
      let score = 0;
      if (name.toLowerCase().includes('ifc')) score += 2;
      if (version.displayName && name.toLowerCase().includes(version.displayName.toLowerCase())) score += 3;
      if (iModel.displayName && name.toLowerCase().includes(iModel.displayName.toLowerCase())) score += 1;
      // Prefer recent
      const dt = f.createdDateTime ? Date.parse(f.createdDateTime) : 0;
      return { f, score, dt };
    });
    if (!scored.length) return null;
    scored.sort((a,b)=> b.score - a.score || b.dt - a.dt);
    return scored[0].f;
  };

  const uploadIfcToAzure = async (version: NamedVersion, fileName: string, storageDownloadUrl: string) => {
    setAzureUploadStatus(prev => ({ ...prev, [version.id]: { uploading: true } }));
    try {
      const result = await azureBlobService.uploadFromDownloadUrl(azureContainerSasUrl, storageDownloadUrl, fileName);
      if (!result.success) {
        setAzureUploadStatus(prev => ({ ...prev, [version.id]: { uploading: false, success: false, error: result.error || 'Upload failed' } }));
        toast.error('Azure upload failed', { description: result.error });
        return;
      }
      setAzureUploadStatus(prev => ({ ...prev, [version.id]: { uploading: false, success: true, blobUrl: result.blobUrl } }));
      toast.success('Uploaded to Azure Blob', { description: fileName });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setAzureUploadStatus(prev => ({ ...prev, [version.id]: { uploading: false, success: false, error: msg } }));
      toast.error('Azure upload failed', { description: msg });
    }
  };

  const locateExportedIfc = async (version: NamedVersion, attempt: number) => {
    const maxAttempts = 5;
    setExportedIfc(prev => ({ ...prev, [version.id]: { ...(prev[version.id]||{}), locating: true, error: undefined } }));
    try {
      let items: StorageGenericItem[] = [];
      if (selectedFolderId) {
        const folderList = await storageService.listFolder(selectedFolderId, 100, 0);
        items = (folderList.items || []) as StorageGenericItem[];
      } else if (iTwinId) {
        const top = await storageService.getTopLevel(iTwinId, 100, 0);
        items = (top.items || []) as StorageGenericItem[];
      }
      const candidate = pickIfcCandidate(items, version);
      if (!candidate) {
        if (attempt < maxAttempts) {
          setTimeout(()=>locateExportedIfc(version, attempt+1), (attempt+1)*3000);
        } else {
          setExportedIfc(prev => ({ ...prev, [version.id]: { locating: false, error: 'IFC file not found yet. Use Locate button to retry.' } }));
        }
        return;
      }
      // Fetch download URL
      const downloadUrl = await storageService.getDownloadLocation(candidate.id);
      setExportedIfc(prev => ({ ...prev, [version.id]: { fileId: candidate.id, displayName: candidate.displayName, downloadUrl: downloadUrl || undefined, locating: false } }));
      toast.success('IFC file located', { description: candidate.displayName });
      if (downloadUrl && autoAzureUpload && azureContainerSasUrl) {
        uploadIfcToAzure(version, candidate.displayName || `${version.displayName || 'export'}.ifc`, downloadUrl);
      }
    } catch (e) {
      console.warn('Locate IFC failed', e);
      if (attempt < maxAttempts) {
        setTimeout(()=>locateExportedIfc(version, attempt+1), (attempt+1)*4000);
      } else {
        setExportedIfc(prev => ({ ...prev, [version.id]: { locating: false, error: 'Failed to locate IFC file.' } }));
        toast.error('Failed to locate IFC file');
      }
    }
  };

  // Upload to storage disabled for root test

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={handleGoBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{iModel.displayName}</h1>
          <p className="text-muted-foreground">Changesets and Named Versions</p>
        </div>
      </div>

      {/* iModel Info */}
      <Card>
        <CardHeader>
          <CardTitle>iModel Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">ID</p>
            <p className="font-mono text-sm">{iModel.id}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">State</p>
            <Badge variant={iModel.state === 'initialized' ? 'default' : 'secondary'}>
              {iModel.state}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Data Center</p>
            <p className="text-sm">{iModel.dataCenterLocation}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="text-sm">{iModel.createdDateTime ? formatDate(iModel.createdDateTime) : 'N/A'}</p>
          </div>
          {iModel.description && (
            <div className="md:col-span-2">
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="text-sm">{iModel.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="text-destructive font-medium">Error Loading Data</div>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Changesets and Named Versions */}
      <Tabs defaultValue="changesets" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="changesets">
            <GitBranch className="w-4 h-4 mr-2" />
            Changesets ({changesets.length})
          </TabsTrigger>
          <TabsTrigger value="versions">
            <Clock className="w-4 h-4 mr-2" />
            Named Versions ({namedVersions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="changesets" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p>Loading changesets...</p>
              </CardContent>
            </Card>
          ) : changesets.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No changesets found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {changesets.map((changeset) => (
                <Card key={changeset.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{changeset.displayName}</h3>
                          <Badge variant="outline">#{changeset.index}</Badge>
                        </div>
                        {changeset.description && (
                          <p className="text-sm text-muted-foreground mb-2">{changeset.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {changeset.creatorName || changeset.creatorId || 'Unknown'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(changeset.pushDateTime || changeset.createdDateTime)}
                          </span>
                          {changeset.fileSize && (
                            <span className="text-xs text-muted-foreground">
                              Size: {(changeset.fileSize / 1024).toFixed(1)} KB
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownloadChangeset(changeset)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="versions" className="space-y-4">
          {/* Actions: Create + Export */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
            <CreateNamedVersionModal
              iModelId={iModel.id}
              changesets={changesets}
              onNamedVersionCreated={handleNamedVersionCreated}
            />
            <Button variant="outline" size="sm" onClick={exportNamedVersions} disabled={loading || namedVersions.length===0} title="Export Named Versions JSON">
              Export JSON
            </Button>
            </div>
            <div className="grid md:grid-cols-3 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-xs font-medium">IFC Version</label>
                <select className="border rounded px-2 py-1 text-sm w-full" value={ifcVersion} onChange={e=>setIfcVersion(e.target.value as 'IFC2X3' | 'IFC4' | 'IFC4X3')}>
                  <option value="IFC2X3">IFC2X3</option>
                  <option value="IFC4">IFC4</option>
                  <option value="IFC4X3">IFC4X3</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium flex items-center gap-1"><FolderIcon className="w-3 h-3"/>Storage Folder (optional)</label>
                <select className="border rounded px-2 py-1 text-sm w-full" value={selectedFolderId} onChange={e=>setSelectedFolderId(e.target.value)} disabled={loadingFolders}>
                  <option value="">Root (default)</option>
                  {storageFolders.map(f => (
                    <option key={f.id} value={f.id}>{f.displayName}</option>
                  ))}
                </select>
                {loadingFolders && <div className="text-[10px] text-muted-foreground">Loading folders…</div>}
              </div>
              <div className="space-y-2">
                <div className="space-y-1 text-[11px] text-muted-foreground">
                  <label className="text-xs font-medium">Saved View (optional)</label>
                  <select className="border rounded px-2 py-1 text-sm w-full" value={selectedSavedViewId} disabled={savedViewsLoading} onChange={e=>setSelectedSavedViewId(e.target.value)}>
                    <option value="">-- None --</option>
                    {savedViews.map(v => (
                      <option key={v.id} value={v.id}>{v.displayName || v.id}</option>
                    ))}
                  </select>
                  {savedViewsLoading && <div className="text-[10px] text-muted-foreground">Loading saved views…</div>}
                  {selectedSavedViewId && <div className="text-[10px] text-green-700">Saved view selected.</div>}
                </div>
                <div className="space-y-1 text-[11px] text-muted-foreground">
                  <label className="text-xs font-medium">Mapping File ID (placeholder)</label>
                  <input
                    type="text"
                    className="border rounded px-2 py-1 text-sm w-full"
                    placeholder="Enter mapping file ID (future)"
                    value={mappingFileId}
                    onChange={e=>setMappingFileId(e.target.value)}
                  />
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground space-y-1">
                <div>After the IFC export job finishes you can click IFC to start the export. Storage save is automatic to root currently.</div>
                {authChecking && <div className="text-xs">Checking export authorization…</div>}
                {isAuthChecked && isUserAuthorized === false && (
                  <div className="text-xs text-destructive flex flex-col gap-1">
                    <span>Long-running export authorization required.</span>
                    {authorizationUrl && (
                      <Button variant="destructive" size="sm" onClick={() => window.open(authorizationUrl!, '_blank')}>
                        Authorize
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={checkAuthorization}>
                      Retry Authorization
                    </Button>
                  </div>
                )}
                {isAuthChecked && isUserAuthorized === true && (
                  <div className="text-xs text-green-600 flex items-center gap-2">
                    <span>Authorization confirmed ✔</span>
                    <Button variant="outline" size="sm" onClick={refreshRuns} disabled={!connectionId || runsLoading}>
                      {runsLoading ? 'Refreshing…' : 'Refresh Runs'}
                    </Button>
                  </div>
                )}
                <div className="pt-2 mt-2 border-t space-y-1">
                  <label className="text-xs font-medium">Azure Container SAS URL (optional)</label>
                  <input
                    type="text"
                    className="border rounded px-2 py-1 text-[11px] w-full"
                    placeholder="https://account.blob.core.windows.net/container?sv=..."
                    value={azureContainerSasUrl}
                    onChange={e=>setAzureContainerSasUrl(e.target.value)}
                  />
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={autoAzureUpload} onChange={e=>setAutoAzureUpload(e.target.checked)} />
                    Auto-upload IFC to Azure after locating
                  </label>
                  {autoAzureUpload && !azureContainerSasUrl && (
                    <div className="text-[10px] text-destructive">Provide a SAS URL to enable auto upload.</div>
                  )}
                  <div className="flex gap-2 mt-1">
                    <Button variant="outline" size="sm" onClick={()=>setAzureContainerSasUrl('')}>Clear SAS</Button>
                    <Button variant="outline" size="sm" onClick={()=>setShowDiagnostics(s=>!s)}>{showDiagnostics ? 'Hide Diagnostics' : 'Show Diagnostics'}</Button>
                  </div>
                  {/* Bulk Copy Section */}
                  <div className="mt-3 p-2 border rounded space-y-2 bg-muted/30">
                    <div className="text-[11px] font-medium">Bulk Copy to Azure</div>
                    <div className="flex flex-wrap gap-2">
                      {bulkExtOptions.map((ext: BulkExt) => (
                        <button
                          key={ext}
                          type="button"
                          onClick={()=>toggleBulkExt(ext)}
                          className={`px-2 py-1 text-[11px] rounded border ${selectedBulkExts.includes(ext) ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
                        >{ext.toUpperCase()}</button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled={bulkCopying} onClick={startBulkCopy}>{bulkCopying ? 'Copying…' : 'Start Bulk Copy'}</Button>
                      {bulkCopying && <Button variant="destructive" size="sm" onClick={abortBulkCopy}>Abort</Button>}
                    </div>
                    {bulkCopying && (
                      <div className="text-[10px] flex flex-col gap-1">
                        <div>Progress: {bulkProgress.done}/{bulkProgress.total} (errors: {bulkProgress.errors})</div>
                        {bulkProgress.current && <div>Current: {bulkProgress.current}</div>}
                      </div>
                    )}
                    {(!bulkCopying && bulkResults.length>0) && (
                      <div className="max-h-32 overflow-auto text-[10px] space-y-1">
                        {bulkResults.slice(-25).map((r,i)=>(
                          <div key={i} className={`flex justify-between ${r.status==='ok'?'text-green-700':'text-destructive'}`}> 
                            <span className="truncate max-w-[140px]" title={r.fileName}>{r.fileName}</span>
                            <span>{r.status==='ok'?'OK':r.message||'ERR'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {loading ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p>Loading named versions...</p>
              </CardContent>
            </Card>
          ) : namedVersions.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No named versions found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {namedVersions.map((version) => (
                <Card key={version.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2">{version.displayName}</h3>
                        {version.description && (
                          <p className="text-sm text-muted-foreground mb-2">{version.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {version.creatorName || version.creatorId || 'Unknown'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(version.createdDateTime)}
                          </span>
                          <span className="flex items-center gap-1">
                            <GitBranch className="w-3 h-3" />
                            Changeset: {version.changesetId} (#{version.changesetIndex})
                          </span>
                          <span className="font-mono text-xs">
                            ID: {version.id}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewNamedVersion(version)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownloadNamedVersion(version)}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                        {/* Export button */}
                        {
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!!exportingId && exportingId!==version.id}
                            onClick={()=>startIFCExport(version)}
                            title="Export IFC"
                          >
                            {exportingId === version.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileOutput className="w-4 h-4 mr-1" />}
                            {exportingId === version.id ? 'Exporting…' : 'IFC'}
                          </Button>
                        }
                      </div>
                    </div>
                    {runs.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <div className="text-[10px] font-medium text-muted-foreground">Recent Runs</div>
                        <div className="flex flex-wrap gap-1">
                          {runs.slice(0,5).map(r => (
                            <span key={r.id} className="px-1 py-[2px] text-[10px] rounded border bg-muted/40">
                              {r.state}{r.result ? `:${r.result}`:''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* IFC Locate / Download status */}
                    {exportedIfc[version.id] && (
                      <div className="mt-3 text-xs">
                        {exportedIfc[version.id].locating && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Locating IFC file…
                          </div>
                        )}
                        {!exportedIfc[version.id].locating && exportedIfc[version.id].downloadUrl && (
                          <div className="flex items-center gap-2">
                            <span className="text-green-600">IFC ready:</span>
                            <span className="font-mono truncate max-w-[180px]" title={exportedIfc[version.id].displayName}>{exportedIfc[version.id].displayName}</span>
                            <Button asChild variant="outline" size="sm">
                              <a href={exportedIfc[version.id].downloadUrl} target="_blank" rel="noopener noreferrer">
                                <Download className="w-3 h-3 mr-1" />Download
                              </a>
                            </Button>
                            <Button variant="ghost" size="sm" onClick={()=>locateExportedIfc(version,0)}>Retry</Button>
                            {azureContainerSasUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={azureUploadStatus[version.id]?.uploading}
                                onClick={()=> uploadIfcToAzure(version, exportedIfc[version.id].displayName || `${version.displayName || 'export'}.ifc`, exportedIfc[version.id].downloadUrl!)}
                              >
                                {azureUploadStatus[version.id]?.uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <FileOutput className="w-3 h-3 mr-1" />}
                                {azureUploadStatus[version.id]?.success ? 'Re-upload' : 'Upload Azure'}
                              </Button>
                            )}
                            {azureUploadStatus[version.id]?.success && (
                              <span className="text-[10px] text-green-700" title={azureUploadStatus[version.id].blobUrl}>Azure ✔</span>
                            )}
                            {azureUploadStatus[version.id]?.error && (
                              <span className="text-[10px] text-destructive" title={azureUploadStatus[version.id].error}>Azure ❌</span>
                            )}
                          </div>
                        )}
                        {!exportedIfc[version.id].locating && !exportedIfc[version.id].downloadUrl && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            {exportedIfc[version.id].error ? <span className="text-destructive">{exportedIfc[version.id].error}</span> : <span>No IFC file located yet.</span>}
                            <Button variant="outline" size="sm" onClick={()=>locateExportedIfc(version,0)}>Locate IFC</Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      {showDiagnostics && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-sm">Export Run Diagnostics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs max-h-[320px] overflow-auto">
            {runs.slice(0,5).map(r => {
              const detail = runDiagnostics[r.id];
              return (
                <div key={r.id} className="border rounded p-2 space-y-1 bg-muted/40">
                  <div className="flex justify-between"><span className="font-mono">Run {r.id.slice(0,8)}</span><span>{r.state}{r.result?`:${r.result}`:''}</span></div>
                  {detail?.jobs?.length ? detail.jobs.map(j => (
                    <div key={j.id} className="ml-2">
                      <div className="flex gap-2"><span className="font-mono">Job {j.id.slice(0,6)}</span><span>{j.state}</span></div>
                      {j.tasks?.map(t => (
                        <div key={t.id} className="ml-4">
                          <div className="flex gap-2"><span className="font-mono">Task {t.id.slice(0,5)}</span><span>{t.phase}</span><span>{t.state}</span></div>
                          {t.error && (
                            <div className="ml-2 text-destructive">
                              <div>Code: {t.error.code}</div>
                              <div>Message: {t.error.message}</div>
                              {t.error.description && <div className="opacity-80">{t.error.description}</div>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )) : <div className="ml-2 italic text-muted-foreground">No job/task detail</div>}
                </div>
              );
            })}
            {runs.length === 0 && <div className="text-muted-foreground">No runs yet.</div>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}