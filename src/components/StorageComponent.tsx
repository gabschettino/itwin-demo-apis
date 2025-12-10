import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { iTwinApiService, storageService, API_CONFIG } from "../services";
import { azureBlobService } from "../services/api/AzureBlobService";
import type { iTwin } from "../services/iTwinAPIService";
import type { FileCreateLinksResponse, FolderListResponse, FolderResponse, StorageFile, StorageFolder, StorageListItem, TopLevelListResponse } from "../services/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Folder, File, Loader2, Link as LinkIcon, Plus, Download, MoreHorizontal } from "lucide-react";
import { BlockBlobClient } from "@azure/storage-blob";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";

type Node = { kind: 'folder'; item: StorageFolder };
function isFile(item: StorageListItem): item is StorageFile & { type: 'file' } {
  return item.type === 'file';
}

interface StorageComponentProps {
  preselectedITwinId?: string;
}

export default function StorageComponent({ preselectedITwinId }: StorageComponentProps) {

  // iTwin search and selection
  const [iTwins, setITwins] = useState<iTwin[]>([]);
  const [selectedITwinId, setSelectedITwinId] = useState(preselectedITwinId || "");
  const [iTwinSearch, setITwinSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingITwins, setLoadingITwins] = useState(false);
  const [recentITwins, setRecentITwins] = useState<iTwin[]>([]);
  const appliedPreselectedRef = useRef(false);
  const loadingITwinsRef = useRef(false);


  // Storage state
  const [rootFolderId, setRootFolderId] = useState<string | null>(null);
  const [path, setPath] = useState<Node[]>([]);
  const [items, setItems] = useState<StorageListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Current folder id (for actions)
  const currentFolderId = useMemo(() => (path.length ? path[path.length - 1].item.id : rootFolderId), [path, rootFolderId]);

  // Create folder/file
  const [newFolderName, setNewFolderName] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [creating, setCreating] = useState(false);
  const [fileLinks, setFileLinks] = useState<FileCreateLinksResponse | null>(null);

  // Upload
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [currentUploading, setCurrentUploading] = useState<string | null>(null);
  const SINGLE_PUT_LIMIT = 256 * 1024 * 1024; //256 MB

  // Download
  const [downloadLinks, setDownloadLinks] = useState<Record<string, string>>({});
  // Bulk copy & Azure SAS
  const bulkExtOptions = useMemo(()=>['ifc','rvt','dgn','dwg'] as const, []);
  type BulkExt = typeof bulkExtOptions[number];
  const [selectedBulkExts, setSelectedBulkExts] = useState<BulkExt[]>(['ifc']);
  const [azureContainerSasUrl, setAzureContainerSasUrl] = useState<string>('');
  const [bulkCopying, setBulkCopying] = useState(false);
  const [bulkRecursive, setBulkRecursive] = useState(true);
  const [bulkConcurrency, setBulkConcurrency] = useState(3);
  const [bulkProgress, setBulkProgress] = useState<{ total: number; done: number; current?: string; errors: number; queued: number }>({ total: 0, done: 0, errors: 0, queued: 0 });
  const [bulkResults, setBulkResults] = useState<Array<{ fileName: string; path: string; size?: number; status: 'ok'|'error'; message?: string; blobUrl?: string }>>([]);
  const bulkAbortRef = useState<{ aborted: boolean }>({ aborted: false })[0];

  // Rename
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; type: 'file' | 'folder'; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Move
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<{ id: string; type: 'file' | 'folder' } | null>(null);
  const [moveQuery, setMoveQuery] = useState('');
  const [moveSearching, setMoveSearching] = useState(false);
  const [moveResults, setMoveResults] = useState<StorageFolder[]>([]);
  const [moveSelectedFolderId, setMoveSelectedFolderId] = useState<string>('');

  // Format bytes utility
  const formatBytes = (bytes?: number): string => {
    if (bytes === undefined || bytes === null) return '-';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let val = bytes;
    while (val >= 1024 && i < units.length - 1) {
      val /= 1024;
      i++;
    }
    return `${Math.round(val)} ${units[i]}`;
  };

  // Recent iTwins functionality
  const loadRecentITwins = () => {
    try {
      const stored = localStorage.getItem('storage-recent-itwins');
      if (stored) {
        const recent = JSON.parse(stored) as iTwin[];
        setRecentITwins(recent.slice(0, 5)); // Keep only last 5
      }
    } catch (error) {
      console.warn('Failed to load recent iTwins:', error);
    }
  };

  // Stable callback (no recentITwins dependency) to avoid recreating function each update causing mount effect re-run
  const addToRecentITwins = useCallback((iTwin: iTwin) => {
    try {
      setRecentITwins(prev => {
        const current = prev.filter(item => item.id !== iTwin.id);
        const updated = [iTwin, ...current].slice(0, 5);
        localStorage.setItem('storage-recent-itwins', JSON.stringify(updated));
        return updated;
      });
    } catch (error) {
      console.warn('Failed to save recent iTwin:', error);
    }
  }, []);

  // Load iTwins on mount and handle preselected iTwin
  useEffect(() => {
    const load = async () => {
      if (loadingITwinsRef.current) return; // reentrancy guard
      loadingITwinsRef.current = true;
      try {
        setLoadingITwins(true); setError(null);
        const data = await iTwinApiService.getMyiTwins();
        const iTwinsList = Array.isArray(data) ? data : [];
        // Avoid unnecessary state updates that can cascade renders
        setITwins(prev => {
          if (prev.length === iTwinsList.length && prev.every((p, i) => p.id === iTwinsList[i].id)) return prev;
          return iTwinsList;
        });
        // Apply preselected only once
        if (!appliedPreselectedRef.current && iTwinsList.length > 0) {
          // Prefer persisted selection
          const savedId = localStorage.getItem('storageSelectedITwinId');
          const savedName = localStorage.getItem('storageSelectedITwinName');
          const targetId = savedId || preselectedITwinId || '';
          if (targetId) {
            const sel = iTwinsList.find(t => t.id === targetId);
            if (sel) {
              setSelectedITwinId(sel.id);
              setITwinSearch(savedName || sel.displayName);
              addToRecentITwins(sel);
            }
          }
          appliedPreselectedRef.current = true;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load iTwins');
      } finally {
        setLoadingITwins(false);
        loadingITwinsRef.current = false;
      }
    };
    load();
    loadRecentITwins(); // Load recent iTwins from localStorage
    // Only depend on preselected id (addToRecentITwins is stable now)
  }, [preselectedITwinId, addToRecentITwins]);

  // Manual refresh for iTwins in case auto-load fails
  const refreshITwins = async () => {
    if (loadingITwinsRef.current) return;
    loadingITwinsRef.current = true;
    try {
      setLoadingITwins(true); setError(null);
      const data = await iTwinApiService.getMyiTwins();
      const iTwinsList = Array.isArray(data) ? data : [];
      setITwins(iTwinsList);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load iTwins');
    } finally {
      setLoadingITwins(false);
      loadingITwinsRef.current = false;
    }
  };

  // Auto-load storage when iTwin is selected
  useEffect(() => {
    if (selectedITwinId) {
      loadTopLevel();
    }
    // Only run when selectedITwinId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedITwinId]);

  const selectITwin = (iTwin: iTwin) => {
    setSelectedITwinId(iTwin.id);
    setITwinSearch(iTwin.displayName);
    addToRecentITwins(iTwin);
    setShowDropdown(false);
    // Persist selection for Storage section
    try {
      localStorage.setItem('storageSelectedITwinId', iTwin.id);
      localStorage.setItem('storageSelectedITwinName', iTwin.displayName);
    } catch {}
  };

  // Load top-level storage for selected iTwin
  const loadTopLevel = async () => {
    if (!selectedITwinId) return;
    try {
      setLoading(true); setError(null); setFileLinks(null);
      const res: TopLevelListResponse = await storageService.getTopLevel(selectedITwinId);
      const folderHref = res._links.folder?.href;
      if (folderHref) {
        const folderId = folderHref.split('/').pop() ?? null;
        setRootFolderId(folderId);
        if (folderId) await loadFolder(folderId, true);
      } else {
        setError('Root folder link not found.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load top-level');
    } finally { setLoading(false); }
  };

  // Load folder contents
  const loadFolder = async (folderId: string, isRoot = false) => {
    try {
      setLoading(true); setError(null);
      // Get folder items and details
      const listRes: FolderListResponse = await storageService.listFolder(folderId);
      setItems(listRes.items);
      const folderRes: FolderResponse = await storageService.getFolder(folderId);
      if (isRoot) {
        setPath([{ kind: 'folder', item: folderRes.folder }]);
      } else {
        setPath((prev) => {
          const idx = prev.findIndex(n => n.item.id === folderId);
          if (idx >= 0) return prev.slice(0, idx + 1);
          return [...prev, { kind: 'folder', item: folderRes.folder }];
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load folder');
    } finally { setLoading(false); }
  };

  // Upload large files to SAS
  const uploadLargeToSas = async (uploadUrl: string, file: File, onProgress?: (pct: number) => void) => {
    const client = new BlockBlobClient(uploadUrl);
    const blockSize = 8 * 1024 * 1024; //8 MB chunks
    const concurrency = 4; //number of parallel blocks
    await client.uploadData(file, {
      blockSize,
      concurrency,
      onProgress: (ev: { loadedBytes: number }) => {
        if (onProgress && file.size > 0) {
          const pct: number = Math.round((ev.loadedBytes / file.size) * 100);
          onProgress(pct);
        }
      },
    });
  };

  // Enter folder
  const enter = (item: StorageListItem) => {
    if (item.type === 'folder') {
      loadFolder(item.id);
    }
  };

  // Breadcrumb navigation
  const goToCrumb = (idx: number) => {
    if (idx < 0 || idx >= path.length) return;
    const folderId = path[idx].item.id;
    loadFolder(folderId);
  };


  const goUp = async () => {
    if (path.length <= 1) return;
    const newPath = path.slice(0, -1);
    setPath(newPath);
  const parentId = newPath[newPath.length - 1]?.item.id as string;
    await loadFolder(parentId);
  };

  const onCreateFolder = async () => {
    if (!currentFolderId || !newFolderName.trim()) return;
    try {
      setCreating(true); setError(null);
      await storageService.createFolder(currentFolderId, { displayName: newFolderName.trim() });
      setNewFolderName("");
      await loadFolder(currentFolderId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create folder');
    } finally { setCreating(false); }
  };

  const onCreateFile = async () => {
    if (!currentFolderId || !newFileName.trim()) return;
    try {
      setCreating(true); setError(null);
      const links = await storageService.createFile(currentFolderId, { displayName: newFileName.trim() });
      setFileLinks(links);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create file');
    } finally { setCreating(false); }
  };

  const onComplete = async () => {
    if (!fileLinks?._links.completeUrl?.href) return;
    try {
      setCreating(true); setError(null);
      await storageService.completeByUrl(fileLinks._links.completeUrl.href);
      setFileLinks(null); setNewFileName("");
      if (currentFolderId) await loadFolder(currentFolderId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to complete file');
    } finally { setCreating(false); }
  };

  const onUploadSelectedFiles = async () => {
    if (!currentFolderId || uploadFiles.length === 0) return;
    setUploadError(null);
    setUploading(true);
    setUploadProgress({});
    
    const totalFiles = uploadFiles.length;
    let completedFiles = 0;
    const results: Array<{ file: string; success: boolean; error?: string }> = [];
    
    try {
      for (const file of uploadFiles) {
        const fileKey = `${file.name}-${file.size}`;
        setCurrentUploading(fileKey);
        
        try {
          // 1) Create file metadata to obtain SAS upload and complete links
          console.log(`Creating file metadata for: ${file.name}`);
          
          // Clean the filename to avoid potential issues with special characters
          let cleanFileName = file.name.replace(/[<>:"/\\|?*]/g, '_');
          
          // Ensure filename isn't too long (many file systems have 255 char limits)
          if (cleanFileName.length > 200) {
            const extension = cleanFileName.substring(cleanFileName.lastIndexOf('.'));
            const baseName = cleanFileName.substring(0, cleanFileName.lastIndexOf('.'));
            cleanFileName = baseName.substring(0, 200 - extension.length) + extension;
            console.log(`Filename truncated due to length: ${file.name} -> ${cleanFileName}`);
          }
          
          console.log(`Original filename: ${file.name}, Clean filename: ${cleanFileName}`);
          
          let links;
          try {
            links = await storageService.createFile(currentFolderId, { displayName: cleanFileName });
          } catch (apiError) {
            console.error(`API error creating file ${cleanFileName}:`, apiError);
            throw new Error(`Failed to create file ${cleanFileName}: ${apiError instanceof Error ? apiError.message : 'Unknown API error'}`);
          }
          
          console.log(`File creation response for ${cleanFileName}:`, links);
          
          // Log all available headers when we get a 202 response to see what's available
          if (links && typeof links === 'object' && 'status' in links && links.status === 202) {
            // Narrow async response structure
            const asyncResponse: { status?: number; headers?: Record<string,string>; location?: string; operationLocation?: string; body?: { _links?: Record<string,{ href: string }> } } = links as { status?: number; headers?: Record<string,string>; location?: string; operationLocation?: string; body?: { _links?: Record<string,{ href: string }> } };
            console.log(`202 Response headers for ${cleanFileName}:`, asyncResponse.headers);
            console.log(`Available header keys:`, Object.keys(asyncResponse.headers || {}));
            console.log(`Location header:`, asyncResponse.location);
            console.log(`Operation Location header:`, asyncResponse.operationLocation);
            console.log(`202 Response body for ${cleanFileName}:`, asyncResponse.body);
            
            // Check if the response body contains the upload links
            if (asyncResponse.body && asyncResponse.body._links) {
              console.log(`Found upload links in 202 response body for ${cleanFileName}`);
              links = asyncResponse.body; // Use the body as the actual response
            }
          }
          
          // Handle 202 Accepted response (async file creation)
          if (links && typeof links === 'object' && 'status' in links && links.status === 202) {
            console.log(`File creation returned 202 for ${cleanFileName}. File metadata creation is being processed asynchronously...`);
            
            // Check if we already have the links in the response body
            const asyncResponse: { status?: number; body?: { _links?: Record<string,{ href: string }> } } = links as { status?: number; body?: { _links?: Record<string,{ href: string }> } };
            if (asyncResponse.body && asyncResponse.body._links && asyncResponse.body._links.uploadUrl) {
              console.log(`Found upload links in 202 response for ${cleanFileName}, proceeding with upload`);
              links = asyncResponse.body; // Use the body as the actual response
            } else {
              // Show that we're processing this file asynchronously
              setUploadProgress(prev => ({ ...prev, [fileKey]: 0 })); // Set to 0 to show as processing
              
              try {
                // For iTwin Storage API, 202 on createFile means the metadata creation is async
                // We need to retry the createFile call until we get the actual links
                let retryAttempts = 0;
                const maxRetries = 20; // 20 attempts with 3 second intervals = 1 minute
                
                while (retryAttempts < maxRetries) {
                  retryAttempts++;
                  console.log(`Retrying file metadata creation for ${cleanFileName} (attempt ${retryAttempts}/${maxRetries})...`);
                  
                  // Wait before retrying
                  await new Promise(resolve => setTimeout(resolve, 3000));
                  
                  try {
                    const retryLinks = await storageService.createFile(currentFolderId, { displayName: cleanFileName });
                    
                    // Check if we got actual links this time
                    if (retryLinks && retryLinks._links && retryLinks._links.uploadUrl) {
                      console.log(`File metadata creation completed for ${cleanFileName} after ${retryAttempts} retries`);
                      links = retryLinks;
                      break; // Exit retry loop
                    } else if (retryLinks && 'status' in retryLinks && (retryLinks as { status?: number }).status === 202) {
                      // Check if this 202 response has links in the body
                      const retryAsyncResponse = retryLinks as { body?: { _links?: Record<string,{ href: string }> } };
                      if (retryAsyncResponse.body && retryAsyncResponse.body._links && retryAsyncResponse.body._links.uploadUrl) {
                        console.log(`Found upload links in retry 202 response for ${cleanFileName}`);
                        links = retryAsyncResponse.body;
                        break;
                      }
                      console.log(`Still processing metadata for ${cleanFileName}... (attempt ${retryAttempts})`);
                      continue; // Continue retrying
                    } else {
                      console.log(`Unexpected response for ${cleanFileName}:`, retryLinks);
                      continue;
                    }
                  } catch (retryError) {
                    console.log(`Retry error for ${cleanFileName} (attempt ${retryAttempts}):`, retryError);
                    if (retryAttempts >= maxRetries) {
                      throw retryError;
                    }
                    continue;
                  }
                }
                
                // If we exhausted retries and still don't have links
                if (!links || !links._links || !(links as { _links?: Record<string,{ href?: string }> })._links?.uploadUrl) {
                  throw new Error(`File metadata creation timed out after ${maxRetries} retries`);
                }
                
              } catch (asyncError) {
                console.error(`Async file metadata creation failed for ${cleanFileName}:`, asyncError);
                setUploadProgress(prev => ({ ...prev, [fileKey]: -1 })); // Mark as failed
                results.push({ 
                  file: cleanFileName, 
                  success: false, 
                  error: `Async metadata creation failed: ${asyncError instanceof Error ? asyncError.message : 'Unknown error'}` 
                });
                continue; // Skip to next file
              }
            }
          }
          
          // Check if links exist and have the expected structure
          if (!links) {
            throw new Error(`No response received for ${cleanFileName} (API returned null/undefined)`);
          }
          
          if (!links._links) {
            console.error(`Full response for ${cleanFileName}:`, JSON.stringify(links, null, 2));
            const maybeStatus = (links as { status?: number }).status;
            throw new Error(`Invalid response structure for ${cleanFileName}: missing _links property. Received status: ${maybeStatus ?? 'unknown'}`);
          }
          
          const uploadUrl = links._links.uploadUrl?.href;
          const completeUrl = links._links.completeUrl?.href;
          
          // Check if this was a skipped upload (file already exists from async processing)
          if (uploadUrl === 'SKIP_UPLOAD' && completeUrl === 'SKIP_COMPLETE') {
            console.log(`File ${cleanFileName} already processed by server, skipping upload`);
            setUploadProgress(prev => ({ ...prev, [fileKey]: 100 }));
            completedFiles++;
            continue; // Skip to next file
          }
          
          if (!uploadUrl) {
            console.error(`Missing uploadUrl for ${cleanFileName}. Available links:`, Object.keys(links._links));
            console.error(`Full _links object:`, JSON.stringify(links._links, null, 2));
            throw new Error(`Upload URL not provided for ${cleanFileName}. Check if file already exists or if there are permission issues.`);
          }
          
          if (!completeUrl) {
            console.error(`Missing completeUrl for ${cleanFileName}. Available links:`, Object.keys(links._links));
            console.error(`Full _links object:`, JSON.stringify(links._links, null, 2));
            throw new Error(`Complete URL not provided for ${cleanFileName}. Check if file already exists or if there are permission issues.`);
          }
          
          console.log(`Upload URLs obtained for ${cleanFileName}:`, { uploadUrl, completeUrl });

          // 2) Upload bytes: use chunked upload if file too large, else single PUT (XHR) for native progress
          if (file.size > SINGLE_PUT_LIMIT) {
            await uploadLargeToSas(uploadUrl, file, (pct) => {
              setUploadProgress(prev => ({ ...prev, [fileKey]: pct }));
            });
          } else {
            await new Promise<void>((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.open('PUT', uploadUrl, true);
              xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
              if (file.type) {
                try { xhr.setRequestHeader('Content-Type', file.type); } catch { /* ignore setting content-type errors in XHR */ }
              }
              xhr.upload.onprogress = (evt) => {
                if (evt.lengthComputable) {
                  const pct = Math.round((evt.loaded / evt.total) * 100);
                  setUploadProgress(prev => ({ ...prev, [fileKey]: pct }));
                }
              };
              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) resolve();
                else reject(new Error(`Upload failed for ${file.name} with status ${xhr.status}`));
              };
              xhr.onerror = () => reject(new Error(`Network error during upload of ${file.name}`));
              xhr.send(file);
            });
          }

          // 3) Complete file
          await storageService.completeByUrl(completeUrl);
          
          // Mark as 100% complete
          setUploadProgress(prev => ({ ...prev, [fileKey]: 100 }));
          completedFiles++;
          
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          setUploadProgress(prev => ({ ...prev, [fileKey]: -1 })); // Mark as failed
        }
      }

      // 4) Reset and refresh if at least one file succeeded
      if (completedFiles > 0) {
        setUploadFiles([]);
        setUploadProgress({});
        if (currentFolderId) await loadFolder(currentFolderId);
      }
      
      if (completedFiles < totalFiles) {
        const failedFiles = uploadFiles.length - completedFiles;
        const asyncFiles = Object.values(uploadProgress).filter(p => p === -1).length;
        
        let errorMessage = `${completedFiles} of ${totalFiles} files uploaded successfully.`;
        
        if (asyncFiles > 0) {
          errorMessage += ` ${asyncFiles} files require asynchronous processing (common with large files like Revit models). These files may be processed by the server but couldn't be uploaded immediately.`;
        }
        
        if (failedFiles - asyncFiles > 0) {
          errorMessage += ` ${failedFiles - asyncFiles} files failed due to other errors.`;
        }
        
        setUploadError(errorMessage);
      }
      
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      setCurrentUploading(null);
    }
  };

  const onDeleteFile = async (fileId: string) => {
    if (!currentFolderId) return;
    const ok = window.confirm('Delete this file?');
    if (!ok) return;
    try {
      setLoading(true); setError(null);
      await storageService.deleteFile(fileId);
      await loadFolder(currentFolderId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete file');
    } finally { setLoading(false); }
  };

  const onDeleteFolder = async (folderId: string) => {
    if (!currentFolderId) return;
    const ok = window.confirm('Delete this folder?');
    if (!ok) return;
    try {
      setLoading(true); setError(null);
      await storageService.deleteFolder(folderId);
      await loadFolder(currentFolderId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete folder');
    } finally { setLoading(false); }
  };

  const openRename = (id: string, type: 'file' | 'folder', currentName: string) => {
    setRenameTarget({ id, type, name: currentName });
    setRenameValue(currentName);
    setRenameOpen(true);
  };

  const confirmRename = async () => {
    if (!renameTarget || !renameValue.trim() || !currentFolderId) { setRenameOpen(false); return; }
    try {
      setCreating(true); setError(null);
      if (renameTarget.type === 'file') await storageService.updateFile(renameTarget.id, { displayName: renameValue.trim() });
      else await storageService.updateFolder(renameTarget.id, { displayName: renameValue.trim() });
      setRenameOpen(false);
      await loadFolder(currentFolderId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to rename');
    } finally { setCreating(false); }
  };

  const openMove = (id: string, type: 'file' | 'folder') => {
    setMoveTarget({ id, type });
    setMoveSelectedFolderId('');
    setMoveQuery('');
    setMoveResults([]);
    setMoveOpen(true);
  };

  const confirmMove = async () => {
    if (!moveTarget || !moveSelectedFolderId || !currentFolderId) { setMoveOpen(false); return; }
    try {
      setCreating(true); setError(null);
      if (moveTarget.type === 'file') await storageService.moveFile(moveTarget.id, moveSelectedFolderId);
      else await storageService.moveFolder(moveTarget.id, moveSelectedFolderId);
      setMoveOpen(false);
      await loadFolder(currentFolderId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to move');
    } finally { setCreating(false); }
  };

  // Debounced search for folders (simple debounce inside effect)
  useEffect(() => {
    let active = true;
    if (!moveOpen || !currentFolderId) return;
    if (!moveQuery.trim()) { setMoveResults([]); return; }
    setMoveSearching(true);
    const id = setTimeout(async () => {
      try {
        const res = await storageService.searchInFolder(currentFolderId, moveQuery.trim(), 20, 0);
        if (!active) return;
        const folders = res.items.filter((x) => x.type === 'folder').map(x => x as StorageFolder);
        setMoveResults(folders);
      } catch {
        if (!active) return;
        setMoveResults([]);
      } finally {
        if (active) setMoveSearching(false);
      }
    }, 350);
    return () => { active = false; clearTimeout(id); };
  }, [moveQuery, moveOpen, currentFolderId]);

  const getDownload = async (fileId: string) => {
    try {
      const cached = downloadLinks[fileId];
      if (cached) {
        const a = document.createElement('a');
        a.href = cached; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.click();
        return;
      }
      const loc = await storageService.getDownloadLocation(fileId);
      if (loc) {
        setDownloadLinks((m) => ({ ...m, [fileId]: loc }));
        const a = document.createElement('a');
        a.href = loc; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.click();
        return;
      }
      // Fallback: open API download endpoint and let browser follow redirect
      const fallback = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.STORAGE.FILE_DOWNLOAD(fileId)}`;
      const a = document.createElement('a');
      a.href = fallback; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.click();
  } catch {
      // Fallback even on failure
      const fallback = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.STORAGE.FILE_DOWNLOAD(fileId)}`;
      const a = document.createElement('a');
      a.href = fallback; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.click();
    }
  };

  // Persist SAS & extension selection per iTwin
  useEffect(()=>{
    if (!selectedITwinId) return;
    const keyBase = `storage:${selectedITwinId}`;
    const sas = localStorage.getItem(`${keyBase}:sas`);
    const exts = localStorage.getItem(`${keyBase}:exts`);
    if (sas) setAzureContainerSasUrl(sas);
    if (exts) {
      try {
        const parsed = JSON.parse(exts);
        if (Array.isArray(parsed)) setSelectedBulkExts(parsed.filter((e:string)=> (bulkExtOptions as readonly string[]).includes(e)) as BulkExt[]);
      } catch (err) {
        console.warn('Failed to parse stored extension selection', err);
      }
    }
  }, [selectedITwinId, bulkExtOptions]);
  useEffect(()=>{
    if (!selectedITwinId) return;
    const keyBase = `storage:${selectedITwinId}`;
    if (azureContainerSasUrl) localStorage.setItem(`${keyBase}:sas`, azureContainerSasUrl); else localStorage.removeItem(`${keyBase}:sas`);
    localStorage.setItem(`${keyBase}:exts`, JSON.stringify(selectedBulkExts));
  }, [azureContainerSasUrl, selectedBulkExts, selectedITwinId]);

  const toggleBulkExt = (ext: BulkExt) => {
    setSelectedBulkExts(prev => prev.includes(ext) ? prev.filter(e=>e!==ext) : [...prev, ext]);
  };
  // Gather target files (optionally recursive)
  const gatherTargets = async (): Promise<Array<{ file: StorageListItem & { type: 'file' }; relPath: string }>> => {
    const targets: Array<{ file: StorageListItem & { type: 'file' }; relPath: string }> = [];
    if (!currentFolderId) return targets;
    // Queue holds folderId + relative path prefix
    const queue: Array<{ folderId: string; relPath: string }> = [{ folderId: currentFolderId, relPath: '.' }];
    while (queue.length) {
      if (bulkAbortRef.aborted) break;
      const { folderId, relPath } = queue.shift()!;
      try {
        const listRes = await storageService.listFolder(folderId);
        for (const item of listRes.items) {
          if (item.type === 'file' && item.displayName && selectedBulkExts.some(ext => item.displayName!.toLowerCase().endsWith('.'+ext))) {
            targets.push({ file: item as StorageFile & { type: 'file' }, relPath });
          } else if (bulkRecursive && item.type === 'folder') {
            queue.push({ folderId: item.id, relPath: relPath === '.' ? item.displayName || item.id : `${relPath}/${item.displayName || item.id}` });
          }
        }
      } catch (err) {
        console.warn('Failed to list folder during gather', folderId, err);
      }
      // Update queued count (approximate: remaining queue size for folders not yet processed)
      setBulkProgress(p => ({ ...p, queued: targets.length }));
    }
    return targets;
  };

  const startBulkCopy = async () => {
    if (!selectedITwinId) return;
    if (!azureContainerSasUrl) { alert('Provide Azure container SAS URL first'); return; }
    if (bulkCopying) return;
    bulkAbortRef.aborted = false;
    setBulkCopying(true);
    setBulkResults([]);
    setBulkProgress({ total: 0, done: 0, errors: 0, queued: 0 });
    try {
      // 1) Gather targets (maybe recursive)
      const targets = await gatherTargets();
      if (!targets.length) { alert('No matching files found'); return; }
      setBulkProgress(p => ({ ...p, total: targets.length, queued: targets.length }));
      // 2) Parallel copy with concurrency limit
      let index = 0;
      let succeededCount = 0;
      let failedCount = 0;
      const worker = async () => {
        while (!bulkAbortRef.aborted) {
          const next = index++;
          if (next >= targets.length) break;
          const target = targets[next];
          const displayName = target.file.displayName || target.file.id;
          setBulkProgress(p => ({ ...p, current: displayName, queued: Math.max(0, p.queued - 1) }));
          try {
            const dl = await storageService.getDownloadLocation(target.file.id);
            if (!dl) throw new Error('Missing download URL');
            const upload = await azureBlobService.uploadFromDownloadUrl(
              azureContainerSasUrl,
              dl,
              displayName
            );
            if (!upload.success) {
              setBulkResults(r => [...r, { fileName: displayName, path: target.relPath, size: (target.file as StorageFile).size, status: 'error', message: upload.error }]);
              setBulkProgress(p => ({ ...p, done: p.done + 1, errors: p.errors + 1 }));
              failedCount++;
            } else {
              setBulkResults(r => [...r, { fileName: displayName, path: target.relPath, size: (target.file as StorageFile).size, status: 'ok', blobUrl: upload.blobUrl }]);
              setBulkProgress(p => ({ ...p, done: p.done + 1 }));
              succeededCount++;
            }
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Unknown error';
            setBulkResults(r => [...r, { fileName: displayName, path: target.relPath, size: (target.file as StorageFile).size, status: 'error', message: msg }]);
            setBulkProgress(p => ({ ...p, done: p.done + 1, errors: p.errors + 1 }));
            failedCount++;
          }
        }
      };
  const workers = Array.from({ length: Math.max(1, bulkConcurrency) }, () => worker());
      await Promise.all(workers);
      if (bulkAbortRef.aborted) {
        alert('Bulk copy aborted');
      } else {
        const succeeded = succeededCount;
        const failed = failedCount;
        // Ensure progress reflects final tallies
        setBulkProgress(p => ({ ...p, done: succeeded + failed, errors: failed }));
        alert(`Bulk copy finished: ${succeeded} succeeded, ${failed} failed`);
      }
    } finally {
      setBulkCopying(false);
      setBulkProgress(p => ({ ...p, current: undefined }));
    }
  };

  const abortBulkCopy = () => { bulkAbortRef.aborted = true; };

  const exportBulkJSON = () => {
    if (!bulkResults.length) return;
    const blob = new Blob([JSON.stringify(bulkResults, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bulk-copy-report.json';
    a.click();
  };

  const exportBulkCSV = () => {
    if (!bulkResults.length) return;
    const header = ['fileName','path','size','status','message','blobUrl'];
    const rows = bulkResults.map(r => header.map(h => {
      const record: Record<string, unknown> = r as Record<string, unknown>;
      const val = record[h] ?? '';
      const safe = String(val).replace(/"/g,'""');
      return '"' + safe + '"';
    }).join(','));
    const csv = header.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bulk-copy-report.csv';
    a.click();
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Storage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tw">iTwin</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  type="text"
                  placeholder={loadingITwins ? 'Loading…' : 'Select or search iTwins'}
                  value={iTwinSearch}
                  onChange={e => {
                    setITwinSearch(e.target.value);
                    setSelectedITwinId("");
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  disabled={loadingITwins}
                  autoComplete="off"
                />
                {/* Clear selection button */}
                {selectedITwinId && (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title="Clear selected iTwin"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      setSelectedITwinId("");
                      setITwinSearch("");
                      setShowDropdown(false);
                      try {
                        localStorage.removeItem('storageSelectedITwinId');
                        localStorage.removeItem('storageSelectedITwinName');
                      } catch {}
                    }}
                  >
                    ✕
                  </button>
                )}
                {error && (
                  <div className="mt-1 text-xs text-destructive">{error}</div>
                )}
                {/* Autocomplete dropdown */}
                {(showDropdown && !loadingITwins) && (
                  <div className="absolute z-10 bg-white border rounded shadow w-full max-h-48 overflow-auto">
                    {/* Recent iTwins */}
                    {!iTwinSearch && recentITwins.length > 0 && (
                      <>
                        <div className="px-3 py-1 text-xs font-medium text-muted-foreground bg-muted">
                          Recent iTwins
                        </div>
                        {recentITwins.map(t => (
                          <div
                            key={`recent-${t.id}`}
                            className="px-3 py-2 cursor-pointer hover:bg-accent flex items-center"
                            onMouseDown={e => e.preventDefault()}
                            onClick={() => selectITwin(t)}
                          >
                            <span className="flex-1">{t.displayName}</span>
                            <span className="text-xs text-muted-foreground">({t.id.slice(0,8)}…)</span>
                          </div>
                        ))}
                        {iTwins.length > 0 && (
                          <div className="px-3 py-1 text-xs font-medium text-muted-foreground bg-muted">
                            All iTwins (type to search)
                          </div>
                        )}
                      </>
                    )}
                    
                    {/* Search results */}
                    {iTwinSearch && iTwins.filter(t =>
                      t.displayName.toLowerCase().includes(iTwinSearch.toLowerCase())
                    ).map(t => (
                      <div
                        key={t.id}
                        className="px-3 py-2 cursor-pointer hover:bg-accent"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => selectITwin(t)}
                      >
                        {t.displayName} <span className="text-xs text-muted-foreground">({t.id.slice(0,8)}…)</span>
                      </div>
                    ))}
                    
                    {/* No results */}
                    {iTwinSearch && iTwins.filter(t =>
                      t.displayName.toLowerCase().includes(iTwinSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="px-3 py-2 text-muted-foreground text-sm">
                        No iTwins found matching "{iTwinSearch}"
                      </div>
                    )}
                  </div>
                )}
              </div>
              <Button onClick={loadTopLevel} disabled={!selectedITwinId || loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
                Load Storage
              </Button>
              <Button variant="outline" onClick={refreshITwins} disabled={loadingITwins} title="Refresh iTwins list">
                {loadingITwins ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : null}
                Refresh iTwins
              </Button>
            </div>
          </div>

          

          <div className="grid md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Create folder</Label>
              <div className="flex gap-2">
                <Input placeholder="Folder name" value={newFolderName} onChange={(e)=>setNewFolderName(e.target.value)} />
                <Button onClick={onCreateFolder} disabled={!newFolderName.trim() || !currentFolderId || creating}><Plus className="h-4 w-4 mr-1"/>Create</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Create file (metadata)</Label>
              <div className="flex gap-2">
                <Input placeholder="File name (e.g., example.txt)" value={newFileName} onChange={(e)=>setNewFileName(e.target.value)} />
                <Button variant="outline" onClick={onCreateFile} disabled={!newFileName.trim() || !currentFolderId || creating}>Init</Button>
                {fileLinks?._links.uploadUrl?.href && (
                  <a className="text-xs underline flex items-center gap-1" href={fileLinks._links.uploadUrl.href} target="_blank" rel="noreferrer"><LinkIcon className="h-3 w-3"/>upload URL</a>
                )}
                <Button onClick={onComplete} disabled={!fileLinks?._links.completeUrl?.href || creating}>Complete</Button>
              </div>
              {fileLinks && <p className="text-[11px] text-muted-foreground">1) Open the upload URL in a new tab to PUT the file bytes (x-ms-blob-type: BlockBlob). 2) Click Complete.</p>}
            </div>
            <div className="space-y-2">
              <Label>Upload file</Label>
              <div className="flex flex-col gap-2">
                <Input 
                  type="file" 
                  multiple 
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setUploadFiles(files);
                    setUploadProgress({});
                    setUploadError(null);
                  }} 
                  disabled={uploading || !currentFolderId} 
                />
                <div className="flex items-center gap-2">
                  <Button onClick={onUploadSelectedFiles} disabled={uploadFiles.length === 0 || uploading || !currentFolderId}>
                    {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}
                    {uploading ? `Uploading (${Object.keys(uploadProgress).length}/${uploadFiles.length})…` : `Upload ${uploadFiles.length} file${uploadFiles.length !== 1 ? 's' : ''}`}
                  </Button>
                  {uploadFiles.length > 0 && !uploading && (
                    <>
                      <span className="text-xs text-muted-foreground">
                        {uploadFiles.length} file{uploadFiles.length !== 1 ? 's' : ''} selected 
                        ({formatBytes(uploadFiles.reduce((total, file) => total + file.size, 0))})
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setUploadFiles([]);
                          setUploadProgress({});
                          setUploadError(null);
                        }}
                      >
                        Clear
                      </Button>
                    </>
                  )}
                </div>
                {uploading && uploadFiles.length > 0 && (
                  <div className="space-y-2">
                    {uploadFiles.map((file) => {
                      const fileKey = `${file.name}-${file.size}`;
                      const progress = uploadProgress[fileKey] || 0;
                      const isCurrentlyUploading = currentUploading === fileKey;
                      const isFailed = progress === -1;
                      const isCompleted = progress === 100;
                      const isAsyncProcessing = progress === 0 && isCurrentlyUploading; // 0 progress with current uploading means async processing
                      
                      return (
                        <div key={fileKey} className="space-y-1">
                          <div className="flex justify-between items-center text-xs">
                            <span className={`${isFailed ? 'text-red-600' : isCompleted ? 'text-green-600' : isAsyncProcessing ? 'text-yellow-600' : 'text-foreground'}`}>
                              {file.name} ({formatBytes(file.size)})
                              {isAsyncProcessing && <span className="ml-1 text-yellow-600">processing on server...</span>}
                              {isCurrentlyUploading && !isAsyncProcessing && <span className="ml-1 text-blue-600">uploading...</span>}
                              {isFailed && <span className="ml-1 text-red-600">failed</span>}
                              {isCompleted && <span className="ml-1 text-green-600">✓</span>}
                            </span>
                            <span className="text-muted-foreground min-w-[32px] text-right">
                              {isFailed ? 'Failed' : isAsyncProcessing ? 'Processing...' : `${progress}%`}
                            </span>
                          </div>
                          <div className="h-2 w-full bg-muted rounded overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                isFailed ? 'bg-red-500' : 
                                isCompleted ? 'bg-green-500' : 
                                isAsyncProcessing ? 'bg-yellow-500 animate-pulse' : 
                                'bg-primary'
                              }`} 
                              style={{ width: isAsyncProcessing ? '100%' : `${Math.max(0, progress)}%` }} 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {!uploading && uploadFiles.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Selected files:</div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {uploadFiles.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="text-xs text-foreground flex justify-between">
                          <span>{file.name}</span>
                          <span className="text-muted-foreground">{formatBytes(file.size)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          {/* Breadcrumbs (moved here) */}
          <nav className="text-xs text-muted-foreground">
            {path.length > 0 ? (
              <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
                {path.map((node, idx) => (
                  <span key={node.item.id} className="flex items-center">
                    <button
                      type="button"
                      className={`underline hover:text-foreground ${idx === path.length - 1 ? 'font-medium no-underline cursor-default text-foreground' : ''}`}
                      onClick={() => (idx === path.length - 1 ? undefined : goToCrumb(idx))}
                      disabled={idx === path.length - 1}
                      title={node.item.displayName}
                    >
                      {idx === 0 ? (node.item.displayName || 'Root') : node.item.displayName}
                    </button>
                    {idx < path.length - 1 && <span className="px-1">/</span>}
                  </span>
                ))}
              </div>
            ) : (
              <span>-</span>
            )}
          </nav>

          <div className="border rounded">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="w-40">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {path.length > 1 && (
                  <TableRow onClick={goUp} className="cursor-pointer">
                    <TableCell><Folder className="h-4 w-4"/></TableCell>
                    <TableCell className="font-medium">..</TableCell>
                    <TableCell className="capitalize">folder</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                )}
                {items.map((it) => (
                  <TableRow key={`${it.type}-${it.id}`} onClick={() => it.type === 'folder' ? enter(it) : undefined} className={it.type === 'folder' ? 'cursor-pointer' : ''}>
                    <TableCell>{it.type === 'folder' ? <Folder className="h-4 w-4"/> : <File className="h-4 w-4"/>}</TableCell>
                    <TableCell className="font-medium">{it.displayName}</TableCell>
                    <TableCell className="capitalize">{it.type}</TableCell>
                    <TableCell>{isFile(it) ? formatBytes(it.size) : '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {it.type === 'file' && (
                          <Button size="sm" variant="ghost" onClick={(e)=>{ e.stopPropagation(); getDownload(it.id); }} title="Download">
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" onClick={(e)=> e.stopPropagation()} title="More actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e)=> e.stopPropagation()}>
          {it.type === 'file' ? (
                              <>
            <DropdownMenuItem onSelect={(e)=>{ e.preventDefault(); openRename(it.id, 'file', it.displayName); }}>Rename</DropdownMenuItem>
            <DropdownMenuItem onSelect={(e)=>{ e.preventDefault(); openMove(it.id, 'file'); }}>Move…</DropdownMenuItem>
                                <DropdownMenuItem onSelect={(e)=>{ e.preventDefault(); onDeleteFile(it.id); }} variant="destructive">Delete file</DropdownMenuItem>
                              </>
                            ) : (
                              <>
            <DropdownMenuItem onSelect={(e)=>{ e.preventDefault(); openRename(it.id, 'folder', it.displayName); }}>Rename</DropdownMenuItem>
            <DropdownMenuItem onSelect={(e)=>{ e.preventDefault(); openMove(it.id, 'folder'); }}>Move…</DropdownMenuItem>
                                <DropdownMenuItem onSelect={(e)=>{ e.preventDefault(); onDeleteFolder(it.id); }} variant="destructive">Delete folder</DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">{loading ? 'Loading…' : 'No items'}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Copy Card */}
      {selectedITwinId && (
        <Card>
          <CardHeader>
            <CardTitle>Bulk Copy to Azure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 text-xs items-center">
              <label className="flex items-center gap-1 cursor-pointer select-none">
                <input type="checkbox" className="accent-primary" checked={bulkRecursive} onChange={e=> setBulkRecursive(e.target.checked)} /> Recursive
              </label>
              <div className="flex items-center gap-1">
                <span>Concurrency:</span>
                <Input type="number" min={1} max={10} value={bulkConcurrency} onChange={e=> setBulkConcurrency(Math.max(1, Math.min(10, parseInt(e.target.value)||1)))} className="w-16 h-7 px-2 text-xs" />
              </div>
              {bulkCopying && (
                <div className="flex items-center gap-2">
                  <div className="h-2 bg-muted rounded overflow-hidden w-48">
                    <div className="h-full bg-primary transition-all" style={{ width: bulkProgress.total ? `${Math.round((bulkProgress.done / bulkProgress.total)*100)}%` : '0%' }} />
                  </div>
                  <span>{bulkProgress.done}/{bulkProgress.total}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Azure Container SAS URL</Label>
              <Input
                placeholder="https://account.blob.core.windows.net/container?sv=..."
                value={azureContainerSasUrl}
                onChange={e=>setAzureContainerSasUrl(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">Used to upload selected extensions from current folder to Azure Blob.</p>
            </div>
            <div className="space-y-2">
              <Label>File Extensions</Label>
              <div className="flex flex-wrap gap-2">
                {bulkExtOptions.map(ext => (
                  <button
                    key={ext}
                    type="button"
                    onClick={()=>toggleBulkExt(ext)}
                    className={`px-2 py-1 text-xs rounded border ${selectedBulkExts.includes(ext) ? 'bg-primary text-primary-foreground' : 'bg-background'}`}
                  >{ext.toUpperCase()}</button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">Toggle extensions to include. Current: {selectedBulkExts.map(e=>e.toUpperCase()).join(', ')}</p>
            </div>
            <div className="flex gap-2 items-center">
              <Button onClick={startBulkCopy} disabled={bulkCopying || !azureContainerSasUrl}>{bulkCopying ? 'Copying…' : 'Start Bulk Copy'}</Button>
              {bulkCopying && <Button variant="destructive" onClick={abortBulkCopy}>Abort</Button>}
            </div>
            {bulkCopying && (
              <div className="text-xs space-y-1">
                <div>Progress: {bulkProgress.done}/{bulkProgress.total} (errors: {bulkProgress.errors})</div>
                {bulkProgress.current && <div>Current: {bulkProgress.current}</div>}
              </div>
            )}
            {!bulkCopying && bulkResults.length > 0 && (
              <div className="max-h-40 overflow-auto space-y-1 text-[11px]">
                {bulkResults.slice(-50).map((r,i)=>(
                  <div key={i} className={`flex justify-between ${r.status==='ok'?'text-green-700':'text-red-600'}`}>
                    <span className="truncate max-w-[240px]" title={`${r.path}/${r.fileName}`}>{r.fileName}</span>
                    <span>{r.status==='ok'?'OK':(r.message||'ERR')}</span>
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={exportBulkJSON}>Export JSON</Button>
                  <Button variant="outline" size="sm" onClick={exportBulkCSV}>Export CSV</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent onClick={(e)=> e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Rename {renameTarget?.type}</DialogTitle>
            <DialogDescription>Enter a new name for this {renameTarget?.type}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename">New name</Label>
            <Input id="rename" value={renameValue} onChange={(e)=> setRenameValue(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=> setRenameOpen(false)}>Cancel</Button>
            <Button onClick={confirmRename} disabled={!renameValue.trim() || creating}>{creating && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move dialog */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent onClick={(e)=> e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Move {moveTarget?.type}</DialogTitle>
            <DialogDescription>Select a destination folder.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="search">Search folders</Label>
              <Input id="search" placeholder="Type to search by name..." value={moveQuery} onChange={(e)=> setMoveQuery(e.target.value)} />
            </div>
            <div className="border rounded max-h-60 overflow-auto">
              {moveSearching ? (
                <div className="p-3 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> Searching…</div>
              ) : moveResults.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">No folders found</div>
              ) : (
                <Table>
                  <TableBody>
                    {moveResults.map(f => (
                      <TableRow key={f.id} onClick={()=> setMoveSelectedFolderId(f.id)} className={"cursor-pointer " + (moveSelectedFolderId === f.id ? 'bg-accent/60' : '')}>
                        <TableCell className="w-8"><Folder className="h-4 w-4"/></TableCell>
                        <TableCell className="font-medium">{f.displayName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{f.id.slice(0,8)}…</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=> setMoveOpen(false)}>Cancel</Button>
            <Button onClick={confirmMove} disabled={!moveSelectedFolderId || creating}>{creating && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}Move</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
