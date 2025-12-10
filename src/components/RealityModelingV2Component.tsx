import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { realityModelingV2Service } from '../services/api/RealityModelingV2Service';
import { iTwinApiService } from '../services';
import type { iTwin } from '../services/types';
import type { RMV2Job, RMV2JobProgress } from '../services/api/RealityModelingV2Service';
import { Button } from './ui/button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Loader2, RefreshCw, UploadCloud, Play, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { realityManagementService } from '../services';
import type { RealityDataSummary, RealityDataListResponse, RealityDataListParams } from '../services/types';

interface Props { iTwinId?: string }

export const RealityModelingV2Component: React.FC<Props> = ({ iTwinId: externalITwinId }) => {
  // iTwin selection (allow incoming id OR user search by name)
  const [iTwinId, setITwinId] = useState(externalITwinId || '');
  const [iTwinSearch, setITwinSearch] = useState('');
  const [iTwins, setITwins] = useState<iTwin[]>([]);
  const [iTwinsLoading, setITwinsLoading] = useState(false);
  const [showITwinDropdown, setShowITwinDropdown] = useState(false);
  const RECENT_V2_ITWINS_KEY = 'reality-v2-recent-itwins';
  const [recentITwins, setRecentITwins] = useState<iTwin[]>([]);

  // recent iTwins (localStorage) separate key from V1 to decouple recency contexts
  useEffect(()=>{
    try { const stored = localStorage.getItem(RECENT_V2_ITWINS_KEY); if (stored) setRecentITwins((JSON.parse(stored) as iTwin[]).slice(0,5)); } catch {/* ignore */}
  }, []);
  const addRecent = (tw: iTwin) => {
    try { const cur = recentITwins.filter(r=>r.id!==tw.id); const upd=[tw,...cur].slice(0,5); setRecentITwins(upd); localStorage.setItem(RECENT_V2_ITWINS_KEY, JSON.stringify(upd)); } catch {/* ignore */}
  };
  // Using v1 reality data API for image collections (type CCImageCollection)
  interface V1ImageCollection extends RealityDataSummary { imageCount?: number }
  const [collections, setCollections] = useState<V1ImageCollection[]>([]);
  const [collectionsError, setCollectionsError] = useState<string | null>(null);
  const [collectionsErrorType, setCollectionsErrorType] = useState<'none' | 'unavailable' | 'empty' | 'generic'>('none');
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [creatingCollection, setCreatingCollection] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [jobName, setJobName] = useState('');
  const [submittingJob, setSubmittingJob] = useState(false);
  const [job, setJob] = useState<RMV2Job | null>(null);
  const [progress, setProgress] = useState<RMV2JobProgress | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  // reality data list for selected iTwin
  const [realityData, setRealityData] = useState<RealityDataSummary[]>([]);
  const [rdLoading, setRdLoading] = useState(false);
  const [rdError, setRdError] = useState<string | null>(null);
  const [rdContinuation, setRdContinuation] = useState<string | undefined>();
  const [rdView, setRdView] = useState<'list'|'tiles'>('tiles');
  const TOP = 50;

  const isLikelyITwinId = (val: string) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(val.trim());

  const filteredITwins = useMemo(()=>{
    if (!iTwinSearch.trim()) return iTwins.slice(0,20);
    const q = iTwinSearch.toLowerCase();
    return iTwins.filter(t=> t.displayName?.toLowerCase().includes(q) || t.id.toLowerCase().startsWith(q)).slice(0,20);
  }, [iTwinSearch, iTwins]);

  const loadITwins = useCallback(async ()=>{
    if (iTwins.length>0) { setShowITwinDropdown(true); return; }
    setITwinsLoading(true);
    try { const data = await iTwinApiService.getMyiTwins(); if (data) setITwins(data); setShowITwinDropdown(true); }
    catch { toast.error('Failed to load iTwins'); }
    finally { setITwinsLoading(false); }
  }, [iTwins.length]);

  const chooseITwin = (tw: iTwin) => {
    setITwinId(tw.id);
    setITwinSearch(`${tw.displayName} (${tw.id.slice(0,8)}…)`);
    addRecent(tw); setShowITwinDropdown(false);
  };

  const pollProgress = useCallback((jobId: string) => {
    const backoffs = [5,10,20,30,30];
    let idx = 0; let lastPct: number | undefined;
    const loop = async () => {
      const prog = await realityModelingV2Service.getJobProgress(jobId);
      if (!prog) { setProgressError('No progress payload'); return; }
      setProgress(prog);
      if (lastPct !== prog.percentage) { idx = 0; lastPct = prog.percentage; }
      const done = ['completed','failed','success'].includes(prog.state.toLowerCase()) || prog.percentage === 100;
      if (done) return;
      const delay = (backoffs[idx] || backoffs[backoffs.length-1]) * 1000; if (idx < backoffs.length -1) idx++;
      setTimeout(loop, delay);
    }; loop();
  }, []);

  const loadCollections = useCallback(async () => {
    setCollectionsError(null);
    setCollectionsErrorType('none');
    if (!iTwinId || iTwinId.trim().length < 10) { setCollections([]); return; }
    if (!isLikelyITwinId(iTwinId)) { setCollectionsError('Enter full iTwin GUID'); setCollections([]); return; }
    setLoadingCollections(true);
    try {
  const params: Partial<RealityDataListParams> = { iTwinId: iTwinId.trim(), types: 'CCImageCollection', $top: 100 };
  const res = await realityManagementService.listRealityData(params);
  const list = res.realityData as V1ImageCollection[];
  setCollections(list);
  if (list.length === 0) { setCollectionsError('No image collections (v1)'); setCollectionsErrorType('empty'); }
    } catch (err: unknown) {
  const status = (typeof err === 'object' && err && 'status' in err) ? (err as Record<string, unknown>).status as number | undefined : undefined;
      if (status === 404) {
        setCollectionsError('V2 image collections API unavailable');
        setCollectionsErrorType('unavailable');
      } else {
        setCollectionsError('Failed to load image collections');
        setCollectionsErrorType('generic');
      }
    }
    finally { setLoadingCollections(false); }
  }, [iTwinId]);

  // reality data fetch (similar to V1 but simplified)
  const loadRealityData = useCallback(async (opts?: { reset?: boolean; token?: string }) => {
    if (!isLikelyITwinId(iTwinId)) { setRealityData([]); return; }
    setRdLoading(true); setRdError(null);
    try {
      const params: Partial<RealityDataListParams> = { iTwinId: iTwinId.trim(), $top: TOP };
      if (opts?.token) params.continuationToken = opts.token;
      const res = await realityManagementService.listRealityData(params);
      const data: RealityDataListResponse = res;
      setRealityData(prev => opts?.reset ? data.realityData : [...prev, ...data.realityData]);
      const next = data._links?.next?.href;
      setRdContinuation(next ? new URL(next).searchParams.get('continuationToken') || undefined : undefined);
    } catch (e) {
      setRdError(e instanceof Error ? e.message : 'Failed to load reality data');
    } finally { setRdLoading(false); }
  }, [iTwinId]);

  const deleteRealityData = async (id: string) => {
    if (!id) return;
    const name = realityData.find(r=>r.id===id)?.displayName || id.slice(0,8);
    if (!window.confirm(`Delete reality data '${name}'? This cannot be undone.`)) return;
    // Optimistic removal
    setRealityData(prev => prev.filter(d=>d.id!==id));
    try {
      const ok = await realityManagementService.deleteRealityData(id);
      if (ok) {
        toast.success('Deleted', { description: id });
      } else {
        toast.error('Delete failed');
        // restore (optional) by reloading
        loadRealityData({ reset: true });
      }
    } catch {
      toast.error('Delete error');
      loadRealityData({ reset: true });
    }
  };

  // trigger reality data load when stable iTwin GUID recognized (debounced via same pause) 
  useEffect(()=>{
    if (isLikelyITwinId(iTwinId)) {
      loadRealityData({ reset: true });
    }
  }, [iTwinId, loadRealityData]);

  const debounceRef = useRef<number | null>(null);
  useEffect(()=>{
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(()=>{ loadCollections(); }, 500);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [loadCollections]);

  const createCollection = async () => {
    if (!isLikelyITwinId(iTwinId) || !newCollectionName.trim()) return;
    setCreatingCollection(true);
    try {
  // Create as reality data of type CCImageCollection via v1 API
  const created = await realityManagementService.createRealityData({ iTwinId: iTwinId.trim(), displayName: newCollectionName.trim(), type: 'CCImageCollection' });
  if (!created) { toast.error('Create failed'); return; }
  toast.success('Image collection created (v1)', { description: created.id });
  setNewCollectionName('');
  setCollections(prev => [created as V1ImageCollection, ...prev]);
    } catch { toast.error('Create failed'); } finally { setCreatingCollection(false); }
  };

  const onSelectFiles = (fileList: FileList | null) => { if (fileList) { setFiles(Array.from(fileList)); setUploadProgress({}); } };

  const uploadFiles = async () => {
    if (!selectedCollectionId || files.length === 0) return;
    setUploading(true); setUploadProgress({});
    try {
  // For v1 reality data use writeaccess endpoint
      const access = await realityManagementService.getRealityDataWriteAccess(iTwinId.trim(), selectedCollectionId);
      if (!access || !access.containerUrl) { toast.error('Write access failed'); return; }
      for (const f of files) {
        let url: string;
        try { const u = new URL(access.containerUrl); const path = u.pathname.endsWith('/') ? u.pathname : u.pathname + '/'; u.pathname = path + encodeURIComponent(f.name); url = u.toString(); }
        catch { const [b,q] = access.containerUrl.split('?'); url = `${b.replace(/\/$/,'')}/${encodeURIComponent(f.name)}${q?`?${q}`:''}`; }
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest(); xhr.open('PUT', url, true); xhr.setRequestHeader('x-ms-blob-type','BlockBlob'); if (f.type) try { xhr.setRequestHeader('Content-Type', f.type); } catch { /* ignore content-type set errors */ }
          xhr.upload.onprogress = e => { if (e.lengthComputable) setUploadProgress(p => ({ ...p, [f.name]: Math.round(e.loaded/e.total*100) })); };
          xhr.onerror = () => reject(new Error('Network error'));
          xhr.onload = () => { if (xhr.status>=200 && xhr.status<300) resolve(); else reject(new Error('Upload failed '+xhr.status)); };
          xhr.send(f);
        });
        setUploadProgress(p => ({ ...p, [f.name]: 100 }));
      }
      toast.success('Uploads complete', { description: `${files.length} file(s)` });
    } catch { toast.error('Upload error'); } finally { setUploading(false); }
  };

  const startJob = async () => {
    if (!isLikelyITwinId(iTwinId) || !selectedCollectionId || !jobName.trim()) { toast.error('Invalid inputs'); return; }
    setSubmittingJob(true);
    try {
      const payload = {
        iTwinId: iTwinId.trim(),
        name: jobName.trim(),
        type: 'FillImageProperties' as const,
        specifications: {
          inputs: { imageCollections: [selectedCollectionId] },
          outputs: ['Scene']
        }
      };
      const created = await realityModelingV2Service.createJob(payload);
      if (!created) { toast.error('Job create failed'); return; }
      setJob(created);
      toast.success('Job created', { description: created.id });
      pollProgress(created.id);
    } catch { toast.error('Job creation error'); } finally { setSubmittingJob(false); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-sm">Reality Modeling V2 (Tech Preview)</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-2 relative">
            <Label htmlFor="v2-itwin">iTwin</Label>
            <Input
              id="v2-itwin"
              value={iTwinSearch}
              placeholder={iTwinsLoading ? 'Loading iTwins…' : 'Search or pick iTwin'}
              onChange={e=>{ setITwinSearch(e.target.value); setShowITwinDropdown(true); if (isLikelyITwinId(e.target.value)) setITwinId(e.target.value.trim()); }}
              onFocus={()=>loadITwins()}
              autoComplete="off"
            />
            {showITwinDropdown && (
              <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto border rounded bg-popover shadow">
                {iTwinsLoading && <div className="p-2 text-xs">Loading…</div>}
                {!iTwinsLoading && filteredITwins.length === 0 && (
                  <div className="p-2 text-xs text-muted-foreground">No matches</div>
                )}
                {!iTwinsLoading && filteredITwins.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={()=>chooseITwin(t)}
                    className="w-full text-left px-2 py-1 text-xs hover:bg-accent hover:text-accent-foreground flex justify-between gap-2"
                  >
                    <span className="truncate">{t.displayName}</span>
                    <span className="opacity-60">{t.id.slice(0,8)}…</span>
                  </button>
                ))}
                {!iTwinsLoading && recentITwins.length>0 && (
                  <div className="border-t mt-1">
                    <div className="px-2 pt-1 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Recent</div>
                    {recentITwins.map(t=>(
                      <button key={t.id} type="button" onClick={()=>chooseITwin(t)} className="w-full text-left px-2 py-1 text-[11px] hover:bg-accent flex justify-between gap-2">
                        <span className="truncate">{t.displayName}</span>
                        <span className="opacity-60">{t.id.slice(0,8)}…</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {iTwinId && !isLikelyITwinId(iTwinId) && <p className="text-[10px] text-red-600">Not a valid GUID yet — continue typing.</p>}
            {iTwinId && isLikelyITwinId(iTwinId) && <p className="text-[10px] text-green-600">GUID recognized • Collections will load after pause.</p>}
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="v2-col-name">New Image Collection Name</Label>
              <Input id="v2-col-name" value={newCollectionName} onChange={e=>setNewCollectionName(e.target.value)} placeholder="My V2 Collection" />
            </div>
            <Button onClick={createCollection} disabled={!isLikelyITwinId(iTwinId) || !newCollectionName.trim() || creatingCollection}>
              {creatingCollection && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}Create
            </Button>
            <Button variant="outline" onClick={loadCollections} disabled={loadingCollections || !isLikelyITwinId(iTwinId) || collectionsErrorType==='unavailable'}>
              <RefreshCw className="h-4 w-4 mr-1"/>Reload
            </Button>
          </div>
          {loadingCollections && <p className="text-xs">Loading collections…</p>}
          {collectionsError && (
            <div className="text-xs flex items-center gap-2">
              <span className={collectionsErrorType==='unavailable' ? 'text-amber-600' : 'text-red-600'}>{collectionsError}</span>
              {collectionsErrorType==='unavailable' && <span className="px-1 py-[2px] text-[10px] rounded bg-amber-100 text-amber-800 border border-amber-200">Tech Preview Unavailable</span>}
              {collectionsErrorType==='empty' && <span className="px-1 py-[2px] text-[10px] rounded bg-gray-100 text-gray-700 border border-gray-200">Empty</span>}
            </div>
          )}
          {!loadingCollections && !collectionsError && collections.length === 0 && isLikelyITwinId(iTwinId) && <p className="text-xs text-muted-foreground">No V2 image collections found.</p>}
          {collections.length > 0 && (
            <div className="space-y-1">
              <Label>Image Collections (v1)</Label>
              <select className="w-full border rounded px-2 py-1 text-sm bg-background" value={selectedCollectionId} onChange={e=>setSelectedCollectionId(e.target.value)}>
                <option value="">Select collection…</option>
                {collections.map(c => <option key={c.id} value={c.id}>{c.displayName || c.id.slice(0,8)}… ({c.imageCount ?? 0})</option>)}
              </select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="v2-files">Upload Images</Label>
            <Input id="v2-files" type="file" multiple onChange={e=>onSelectFiles(e.target.files)} disabled={!selectedCollectionId} />
            {files.length > 0 && (
              <div className="text-[11px] space-y-1 max-h-32 overflow-auto border rounded p-2">
                {files.map(f => (<div key={f.name} className="flex justify-between gap-2"><span className="truncate">{f.name}</span><span>{uploadProgress[f.name] ?? 0}%</span></div>))}
              </div>
            )}
            <Button variant="outline" onClick={uploadFiles} disabled={uploading || files.length===0 || !selectedCollectionId}>
              {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}<UploadCloud className="h-4 w-4 mr-2"/>Upload
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="v2-job-name">Job Name</Label>
            <Input id="v2-job-name" value={jobName} onChange={e=>setJobName(e.target.value)} placeholder="My V2 Job" />
            <Button onClick={startJob} disabled={!jobName.trim() || !selectedCollectionId || submittingJob}>
              {submittingJob && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>}<Play className="h-4 w-4 mr-2"/>Start Job
            </Button>
          </div>
          {job && (
            <div className="space-y-2 border rounded p-3">
              <div className="flex justify-between text-xs"><span>Job: {job.name}</span><span className="opacity-70">{job.id.slice(0,8)}…</span></div>
              <div className="text-[10px] opacity-70">Type: FillImageProperties • Outputs: Scene</div>
              <div className="text-[11px]">State: {progress?.state || job.state} {progress?.percentage !== undefined && `• ${progress.percentage}%`}</div>
              {progress?.step && <div className="text-[10px] opacity-70">Step: {progress.step}</div>}
              {progress && progress.percentage !== undefined && (
                <div className="mt-1">
                  <div className="h-2 bg-muted rounded overflow-hidden">
                    <div className="h-full bg-green-500 transition-all" style={{ width: `${progress.percentage || 0}%` }} />
                  </div>
                </div>
              )}
              {progress?.userMessages && progress.userMessages.length>0 && (
                <div className="space-y-1 mt-1">
                  {progress.userMessages.map((m,i)=>(<div key={i} className="text-[11px] flex items-start gap-1"><AlertTriangle className="h-3 w-3 text-yellow-600"/><span className="flex-1">{m.code || m.severity}: {m.message}</span></div>))}
                </div>
              )}
              {progressError && <p className="text-[11px] text-red-600">{progressError}</p>}
            </div>
          )}
          {/* Reality Data section */}
          <div className="space-y-3 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold flex items-center gap-2">Reality Data for iTwin <span className="px-1 py-[2px] text-[10px] rounded bg-blue-100 text-blue-700 border border-blue-200" title="Uses v1 reality-management endpoint">API v1</span></h3>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={()=>setRdView(v=>v==='tiles'?'list':'tiles')} className="text-[11px] px-2 py-1">
                  {rdView==='tiles' ? 'List View' : 'Tile View'}
                </Button>
                <Button variant="outline" size="sm" disabled={!isLikelyITwinId(iTwinId) || rdLoading} onClick={()=>loadRealityData({ reset: true })} className="text-[11px] px-2 py-1">
                  <RefreshCw className="h-3 w-3 mr-1" />Refresh
                </Button>
              </div>
            </div>
            {!isLikelyITwinId(iTwinId) && <p className="text-[11px] text-muted-foreground">Enter or select a valid iTwin GUID to list reality data.</p>}
            {isLikelyITwinId(iTwinId) && rdError && <p className="text-[11px] text-red-600">{rdError}</p>}
            {isLikelyITwinId(iTwinId) && !rdError && rdLoading && <p className="text-[11px]">Loading reality data…</p>}
            {isLikelyITwinId(iTwinId) && !rdLoading && realityData.length === 0 && !rdError && <p className="text-[11px] text-muted-foreground">No reality data found for this iTwin.</p>}
            {isLikelyITwinId(iTwinId) && realityData.length>0 && rdView==='list' && (
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-1 pr-2 font-medium">Name</th>
                    <th className="py-1 pr-2 font-medium">Type</th>
                    <th className="py-1 pr-2 font-medium">ID</th>
                    <th className="py-1 pr-2 font-medium">Modified</th>
                  </tr>
                </thead>
                <tbody>
                  {realityData.map(d => (
                    <tr key={d.id} className="border-b last:border-0">
                      <td className="py-1 pr-2 truncate max-w-[160px]" title={d.displayName}>{d.displayName || d.id.slice(0,12)}</td>
                      <td className="py-1 pr-2 text-[10px]">{d.type}</td>
                      <td className="py-1 pr-2 text-[10px] font-mono whitespace-nowrap" title={d.id}>{d.id}</td>
                      <td className="py-1 pr-2 text-[10px]">{d.modifiedDateTime ? new Date(d.modifiedDateTime).toLocaleDateString() : '—'}</td>
                      <td className="py-1 pr-2 text-right">
                        <button
                          onClick={()=>deleteRealityData(d.id)}
                          className="text-[10px] px-2 py-[2px] rounded border hover:bg-red-50 hover:text-red-700 transition-colors"
                          title="Delete reality data"
                        >Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {isLikelyITwinId(iTwinId) && realityData.length>0 && rdView==='tiles' && (
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))' }}>
                {realityData.map(d => (
                  <div key={d.id} className="border rounded p-2 flex flex-col gap-1 hover:shadow-sm transition-shadow group">
                    <div className="flex justify-between items-start gap-2">
                      <div className="text-[11px] font-medium truncate" title={d.displayName}>{d.displayName || d.id.slice(0,12)}</div>
                      <button
                        onClick={()=>deleteRealityData(d.id)}
                        className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity px-1 py-[1px] border rounded hover:bg-red-50 hover:text-red-700"
                        title="Delete"
                      >✕</button>
                    </div>
                    <div className="text-[10px] text-muted-foreground">{d.type}</div>
                    <div className="text-[10px] opacity-70">{d.id.slice(0,8)}…</div>
                    {d.modifiedDateTime && <div className="text-[10px] opacity-60">{new Date(d.modifiedDateTime).toLocaleDateString()}</div>}
                  </div>
                ))}
              </div>
            )}
            {rdContinuation && isLikelyITwinId(iTwinId) && (
              <Button variant="outline" size="sm" disabled={rdLoading} onClick={()=>loadRealityData({ token: rdContinuation })} className="text-[11px] mt-2">
                {rdLoading && <Loader2 className="h-3 w-3 mr-1 animate-spin"/>}Load More
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealityModelingV2Component;
