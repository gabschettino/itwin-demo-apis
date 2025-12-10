/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useRef, useState, Fragment } from 'react';
import { formsService } from '../services/api/FormsService';
import { storageService } from '../services/api/StorageService';
import { iTwinApiService } from '../services';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

export default function FormsRoute() {
  const [iTwins, setITwins] = useState<Array<{id: string; displayName: string}>>([]);
  const [selectedITwinId, setSelectedITwinId] = useState('');
  const [iTwinSearch, setITwinSearch] = useState('');
  const [showITwinDropdown, setShowITwinDropdown] = useState(false);
  const iTwinDropdownRef = useRef<HTMLDivElement>(null);
  const [recentITwins, setRecentITwins] = useState<Array<{id: string; displayName: string}>>([]);

  const [forms, setForms] = useState<Array<{ id: string; name?: string; status?: string; createdDateTime?: string }>>([]);
  const [top, setTop] = useState(50);
  const [continuationToken, setContinuationToken] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<Record<string, any>>({});
  const [exporting, setExporting] = useState<Record<string, boolean>>({});
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});
  const [exportedOk, setExportedOk] = useState<Record<string, boolean>>({});
  const [bulkSummary, setBulkSummary] = useState<{done: number; total: number} | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [debug, setDebug] = useState<boolean>(false);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [lastDetailsResponses, setLastDetailsResponses] = useState<Record<string, any>>({});
  const [commentsById, setCommentsById] = useState<Record<string, any[]>>({});
  const [auditTrailById, setAuditTrailById] = useState<Record<string, any[]>>({});
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    displayName: true,
    state: true,
    type: true,
    discipline: true,
    id: false,
  });
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const allSelected = forms.length > 0 && forms.every((f: any) => selectedIds[f.id]);
  const toggleSelectId = (id: string) => setSelectedIds(prev => ({ ...prev, [id]: !prev[id] }));
  const clearSelection = () => setSelectedIds({});
  const toggleSelectAll = () => {
    if (allSelected) {
      clearSelection();
    } else {
      const next: Record<string, boolean> = {};
      forms.forEach((f: any) => { next[f.id] = true; });
      setSelectedIds(next);
    }
  };

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const formatFieldValue = (value: any) => {
    if (value == null) return '';
    if (typeof value === 'object') {
      if (value.latitude && value.longitude) {
        return `${Number(value.latitude).toFixed(6)}, ${Number(value.longitude).toFixed(6)}`;
      }
      if (value.displayName || value.name || value.id) {
        return String(value.displayName || value.name || value.id);
      }
    }
    if (typeof value === 'string') {
      // ISO date
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
        try { return new Date(value).toLocaleString(); } catch { return value; }
      }
      return value;
    }
    return String(value);
  };

  const didInitTwins = useRef(false);
  useEffect(() => {
    if (didInitTwins.current) return; // guard against StrictMode double-invoke
    didInitTwins.current = true;
    const load = async () => {
      try {
        const res = await iTwinApiService.getMyiTwins();
        setITwins(res || []);
        // Prefill previously selected iTwin if present
        const savedId = localStorage.getItem('formsSelectedITwinId');
        const savedName = localStorage.getItem('formsSelectedITwinName');
        const recentListRaw = localStorage.getItem('formsRecentITwins');
        const recentList = recentListRaw ? JSON.parse(recentListRaw) : [];
        setRecentITwins(Array.isArray(recentList) ? recentList.slice(0,5) : []);
        if (savedId) {
          setSelectedITwinId(savedId);
          if (savedName) {
            setITwinSearch(`${savedName} (${savedId.slice(0,8)}…)`);
          }
        }
      } catch {}
    };
    load();
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (iTwinDropdownRef.current && !iTwinDropdownRef.current.contains(e.target as Node)) {
        setShowITwinDropdown(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const loadForms = async (reset = false) => {
    if (!selectedITwinId) return;
    try {
      setLoading(true);
      const res = await formsService.listProjectFormData(
        selectedITwinId,
        top,
        reset ? undefined : continuationToken || undefined,
        {
          status: statusFilter || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
        }
      );
      setLastResponse(res);
      // Normalize Forms v2 response: res.forms.formDataInstances
      let items: any[] = [];
      if (res && (res as any).forms && Array.isArray((res as any).forms.formDataInstances)) {
        items = (res as any).forms.formDataInstances;
      } else {
        const itemsCandidate = (res && ((res as any).forms || (res as any).items || (res as any).data || (res as any).formData)) || [];
        items = Array.isArray(itemsCandidate) ? itemsCandidate : [];
      }
      setForms(reset ? items : [...forms, ...items]);
      // Prefer _links.next from res.forms; fallback to length === top
      const nextLink = (res as any)?.forms?._links?.next?.href || (res as any)?._links?.next?.href;
      if (nextLink && typeof nextLink === 'string') {
        const url = new URL(nextLink);
        const token = url.searchParams.get('continuationToken');
        setContinuationToken(token);
      } else {
        setContinuationToken(null);
      }
      setHasNext(Boolean(nextLink) || items.length === top);
    } catch (e) {
      console.warn('Failed to load forms', e);
    } finally {
      setLoading(false);
    }
  };

  const loadDetails = async (id: string) => {
    // Allow re-fetch if previous parse produced empty object
    if (details[id] && details[id].raw) return;
    try {
      const res = await formsService.getFormDataDetails(id);
      setLastDetailsResponses(prev => ({ ...prev, [id]: res }));
      const fdRoot: any = (res as any);
      // Try common shapes
      const fd: any = fdRoot.formData || fdRoot.formDataInstance || fdRoot.data || fdRoot.forms?.formData || fdRoot.forms?.formDataInstance || fdRoot.form || fdRoot;
      // Derive a concise view model for details rendering
      const detailsVm = {
        id: fd.id,
        displayName: fd.displayName || fd.name,
        state: fd.state || fd.status,
        type: fd.type,
        discipline: fd.discipline,
        createdDateTime: fd.createdDateTime || fd.createdAt,
        updatedDateTime: fd.updatedDateTime || fd.updatedAt,
        createdBy: fd.createdBy?.displayName || fd.createdBy?.id || fd.owner,
        assignees: Array.isArray(fd.assignees) ? fd.assignees.map((a: any) => a.displayName || a.id) : undefined,
        location: fd.location || fd.geolocation,
        priority: fd.priority,
        dueDate: fd.dueDate,
        fields: Array.isArray(fd.fields) ? fd.fields : (Array.isArray(fd.formFields) ? fd.formFields : (Array.isArray(fd.instanceFields) ? fd.instanceFields : [])),
        attachments: Array.isArray(fd.attachments) ? fd.attachments : [],
        links: fd._links || fd.links || {},
        raw: fd,
      };
      setDetails(prev => ({ ...prev, [id]: detailsVm }));

      // Fetch attachments via dedicated endpoint if not present or empty
      try {
        const attRes = await formsService.getFormDataAttachments(id);
        const atts = Array.isArray(attRes.attachments) ? attRes.attachments : [];
        if (atts.length) {
          setDetails(prev => ({
            ...prev,
            [id]: { ...prev[id], attachments: atts },
          }));
        }
      } catch (e) {
        // Non-blocking: ignore attachments errors
      }

      // Fetch comments
      try {
        const cRes = await formsService.getFormDataComments(id);
        const comments = Array.isArray(cRes.comments) ? cRes.comments : [];
        if (comments.length) setCommentsById(prev => ({ ...prev, [id]: comments }));
      } catch {}

      // Fetch audit trail
      try {
        const aRes = await formsService.getFormDataAuditTrail(id);
        const entries = Array.isArray((aRes as any).auditTrailEntries)
          ? (aRes as any).auditTrailEntries
          : (Array.isArray((aRes as any).events) ? (aRes as any).events : []);
        if (entries.length) setAuditTrailById(prev => ({ ...prev, [id]: entries }));
      } catch {}
    } catch (e) {
      console.warn('Failed to load form details', e);
    }
  };

  const handleDownloadForm = async (formId: string) => {
    try {
      setDownloading((s) => ({ ...s, [formId]: true }));
      const res = await formsService.downloadFormAsFile(formId, { includeHeader: false });
      const blob = (res as any);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `form-${formId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download failed', e);
    } finally {
      setDownloading((s) => ({ ...s, [formId]: false }));
    }
  };

  const handleExportFormToStorage = async (
    formId: string
  ) => {
    try {
      setExporting((s) => ({ ...s, [formId]: true }));
      // Per docs: GET /forms/storage-export?ids=...&includeHeader=true&fileType=pdf
      await formsService.exportFormToStorage({ ids: [formId], includeHeader: true, fileType: 'pdf' });
    } catch (e) {
      console.error('Export to storage failed', e);
    } finally {
      setExporting((s) => ({ ...s, [formId]: false }));
    }
  };

  const handleExportToDatedFolder = async (formId: string) => {
    try {
      setExporting((s) => ({ ...s, [formId]: true }));
      const exportStartTime = Date.now();
      await formsService.exportFormToStorage({ ids: [formId], includeHeader: true, fileType: 'pdf' });
      if (!selectedITwinId) return;
      const topRes = await storageService.getTopLevel(selectedITwinId);
      const rootHref = (topRes as any)?._links?.folder?.href;
      const rootId = typeof rootHref === 'string' ? rootHref.split('/').pop() : null;
      if (!rootId) return;
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      // Create/ensure parent 'forms' folder (no slashes in displayName allowed)
      const rootList = await storageService.listFolder(rootId, 200);
      const rootItems = Array.isArray((rootList as any).items) ? (rootList as any).items : [];
      let formsFolder = rootItems.find((it: any) => it.type === 'folder' && String(it.displayName).toLowerCase() === 'forms');
      if (!formsFolder) {
        const createdForms = await storageService.createFolder(rootId, { displayName: 'forms' });
        formsFolder = createdForms.folder;
      }
      const dateFolderName = `${yyyy}-${mm}-${dd}`;
      // Check if date folder exists under 'forms'
      const formsList = await storageService.listFolder(formsFolder.id, 200);
      const formsItems = Array.isArray((formsList as any).items) ? (formsList as any).items : [];
      let dateFolder = formsItems.find((it: any) => it.type === 'folder' && String(it.displayName) === dateFolderName);
      if (!dateFolder) {
        const createdDate = await storageService.createFolder(formsFolder.id, { displayName: dateFolderName });
        dateFolder = createdDate.folder;
      }
      const targetFolderId = dateFolder.id;
      // Poll root for the exported PDF
      const fileNamePattern = `form-${formId}.pdf`;
      const deadline = Date.now() + 60000; // up to 60s to account for async export
      let moved = false;
      while (Date.now() < deadline && !moved) {
        // List root and pick the newest PDF created after export started
        const list = await storageService.listFolder(rootId, 200);
        const items = Array.isArray((list as any).items) ? (list as any).items : [];
        const candidates = items.filter((it: any) => {
          if (it.type !== 'file') return false;
          const name = String(it.displayName || '').toLowerCase();
          if (!name.endsWith('.pdf')) return false;
          const createdMillis = (it.createdDateTime || it.createdAt) ? new Date(it.createdDateTime || it.createdAt).getTime() : 0;
          // Must be created after export start to avoid unrelated PDFs
          return createdMillis > exportStartTime;
        });
        // Prefer exact/name-includes matches among candidates
        let match = candidates.find((it: any) => {
          const name = String(it.displayName || '').toLowerCase();
          return name === fileNamePattern || name.includes(formId);
        });
        if (!match && candidates.length) {
          // Fallback: pick the newest candidate
          match = candidates.sort((a: any, b: any) => {
            const ca = (a.createdDateTime || a.createdAt) ? new Date(a.createdDateTime || a.createdAt).getTime() : 0;
            const cb = (b.createdDateTime || b.createdAt) ? new Date(b.createdDateTime || b.createdAt).getTime() : 0;
            return cb - ca;
          })[0];
        }
        if (match) {
          await storageService.moveFile(match.id, targetFolderId);
          moved = true;
          break;
        }
        await new Promise(r => setTimeout(r, 2000));
      }
      if (moved) {
        setExportedOk(prev => ({ ...prev, [formId]: true }));
        setTimeout(() => setExportedOk(prev => ({ ...prev, [formId]: false })), 2500);
      }
    } catch (e) {
      console.error('Export to dated folder failed', e);
    } finally {
      setExporting((s) => ({ ...s, [formId]: false }));
    }
  };

  const handleBulkExportToDatedFolder = async (ids: string[]) => {
    if (!ids.length) return;
    try {
      setBulkSummary({ done: 0, total: ids.length });
      setExporting(prev => { const next = { ...prev }; ids.forEach(id => next[id] = true); return next; });
      if (!selectedITwinId) return;
      const topRes = await storageService.getTopLevel(selectedITwinId);
      const rootHref = (topRes as any)?._links?.folder?.href;
      const rootId = typeof rootHref === 'string' ? rootHref.split('/').pop() : null;
      if (!rootId) return;
      // ensure forms/date folder once
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const rootList = await storageService.listFolder(rootId, 200);
      const rootItems = Array.isArray((rootList as any).items) ? (rootList as any).items : [];
      let formsFolder = rootItems.find((it: any) => it.type === 'folder' && String(it.displayName).toLowerCase() === 'forms');
      if (!formsFolder) {
        const createdForms = await storageService.createFolder(rootId, { displayName: 'forms' });
        formsFolder = createdForms.folder;
      }
      const dateFolderName = `${yyyy}-${mm}-${dd}`;
      const formsList = await storageService.listFolder(formsFolder.id, 200);
      const formsItems = Array.isArray((formsList as any).items) ? (formsList as any).items : [];
      let dateFolder = formsItems.find((it: any) => it.type === 'folder' && String(it.displayName) === dateFolderName);
      if (!dateFolder) {
        const createdDate = await storageService.createFolder(formsFolder.id, { displayName: dateFolderName });
        dateFolder = createdDate.folder;
      }
      const targetFolderId = dateFolder.id;
      // Process each id sequentially: export, then poll and move one matching PDF
      for (const id of ids) {
        const exportStartTime = Date.now();
        try {
          await formsService.exportFormToStorage({ ids: [id], includeHeader: true, fileType: 'pdf' });
        } catch (e) {
          console.error('Export failed for', id, e);
          continue;
        }
        const deadline = Date.now() + 60000;
        let moved = false;
        while (Date.now() < deadline && !moved) {
          const list = await storageService.listFolder(rootId, 200);
          const items = Array.isArray((list as any).items) ? (list as any).items : [];
          const candidates = items.filter((it: any) => {
            if (it.type !== 'file') return false;
            const name = String(it.displayName || '').toLowerCase();
            if (!name.endsWith('.pdf')) return false;
            const createdMillis = (it.createdDateTime || it.createdAt) ? new Date(it.createdDateTime || it.createdAt).getTime() : 0;
            return createdMillis > exportStartTime;
          });
          let match = candidates.find((it: any) => String(it.displayName || '').toLowerCase().includes(id));
          if (!match && candidates.length) {
            match = candidates.sort((a: any, b: any) => {
              const ca = (a.createdDateTime || a.createdAt) ? new Date(a.createdDateTime || a.createdAt).getTime() : 0;
              const cb = (b.createdDateTime || b.createdAt) ? new Date(b.createdDateTime || b.createdAt).getTime() : 0;
              return cb - ca;
            })[0];
          }
          if (match) {
            await storageService.moveFile(match.id, targetFolderId);
            moved = true;
            break;
          }
          await new Promise(r => setTimeout(r, 2000));
        }
        setBulkSummary(prev => prev ? { ...prev, done: prev.done + 1 } : { done: 1, total: ids.length });
        if (moved) {
          setExportedOk(prev => ({ ...prev, [id]: true }));
          setTimeout(() => setExportedOk(prev => ({ ...prev, [id]: false })), 2500);
        }
      }
    } catch (e) {
      console.error('Bulk export to dated folder failed', e);
    } finally {
      setExporting(prev => { const next = { ...prev }; ids.forEach(id => next[id] = false); return next; });
      setTimeout(() => setBulkSummary(null), 3000);
    }
  };

  const toggleDetails = async (id: string) => {
    if (details[id]) {
      setDetails(prev => {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      });
    } else {
      await loadDetails(id);
    }
  };

  const toCsv = (rows: Array<Record<string, string>>): string => {
    const headers = Object.keys(rows[0] || {});
    const esc = (v: string) => {
      const s = v ?? '';
      const needsQuote = /[",\n]/.test(s);
      const q = s.replace(/"/g, '""');
      return needsQuote ? `"${q}"` : q;
    };
    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push(headers.map(h => esc(r[h] ?? '')).join(','));
    }
    return lines.join('\n');
  };

  const handleExportCSV = async () => {
    if (!Array.isArray(forms) || forms.length === 0) return;
    // Ensure details for each form are loaded to populate richer fields
    for (const f of forms as any[]) {
      if (!details[f.id]) {
        try { await loadDetails(f.id); } catch {}
      }
    }
    const rows: Array<Record<string, string>> = (forms as any[]).map((f, idx) => {
      const d = details[f.id] || {};
      const attachments = Array.isArray(d.attachments) ? d.attachments.map((a: any) => a.fileName || a.name || a.id).join('; ') : '';
      const comments = Array.isArray(commentsById[f.id]) ? commentsById[f.id]
        .map((c: any) => `${formatFieldValue(c.createdDateTime)}|${c.authorDisplayName || c.createdBy?.displayName || c.createdBy?.id || 'Unknown'}|${(c.text || '').replace(/\s+/g, ' ').trim()}`)
        .join('; ') : '';
      const fields = Array.isArray(d.fields) ? d.fields
        .map((fld: any) => `${String(fld.displayName || fld.name || fld.id)}=${String(fld.value ?? fld.currentValue ?? '')}`)
        .join('; ') : '';
      const auditTrail = Array.isArray(auditTrailById[f.id]) ? auditTrailById[f.id]
        .map((entry: any) => {
          const when = formatFieldValue(entry.changeDateTime || entry.timestamp);
          const who = entry.changeBy || entry.actor?.displayName || entry.actor?.id || 'Unknown';
          const action = entry.action || '';
          const changes = Array.isArray(entry.changes) && entry.changes.length
            ? entry.changes.map((c: any) => `${c.property || c.field || ''}:${String(c.oldValue ?? '')}->${String(c.newValue ?? '')}`).join('|')
            : 'No changes';
          return `${when}|${who}|${action}|${changes}`;
        }).join('; ') : '';
      return {
        Index: String(idx + 1),
        Id: String(f.id),
        DisplayName: String(d.displayName || f.displayName || f.name || ''),
        State: String(d.state || f.state || f.status || ''),
        Type: String(d.type || f.type || ''),
        Discipline: String(d.discipline || f.discipline || ''),
        Priority: String(d.priority ?? ''),
        DueDate: String(d.dueDate ?? ''),
        Created: String(d.createdDateTime ? new Date(d.createdDateTime).toLocaleString() : ''),
        Updated: String(d.updatedDateTime ? new Date(d.updatedDateTime).toLocaleString() : ''),
        CreatedBy: String(d.createdBy ?? ''),
        Assignees: Array.isArray(d.assignees) ? d.assignees.join('; ') : '',
        Fields: fields,
        Attachments: attachments,
        Comments: comments,
        AuditTrail: auditTrail,
        AuditTrailCount: String(Array.isArray(auditTrailById[f.id]) ? auditTrailById[f.id].length : 0),
      };
    });
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forms-export-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExportCSVAll = async () => {
    if (!selectedITwinId) return;
    try {
      setLoading(true);
      const collected: any[] = [];
      let token: string | undefined = undefined;
      do {
        const res = await formsService.listProjectFormData(
          selectedITwinId,
          top,
          token,
          {
            status: statusFilter || undefined,
            from: fromDate || undefined,
            to: toDate || undefined,
          }
        );
        let items: any[] = [];
        if (res && (res as any).forms && Array.isArray((res as any).forms.formDataInstances)) {
          items = (res as any).forms.formDataInstances;
        } else {
          const itemsCandidate = (res && ((res as any).forms || (res as any).items || (res as any).data || (res as any).formData)) || [];
          items = Array.isArray(itemsCandidate) ? itemsCandidate : [];
        }
        collected.push(...items);
        const nextLink = (res as any)?.forms?._links?.next?.href || (res as any)?._links?.next?.href;
        if (nextLink && typeof nextLink === 'string') {
          const url = new URL(nextLink);
          token = url.searchParams.get('continuationToken') || undefined;
        } else {
          token = undefined;
        }
      } while (token);

      // Ensure details/comments/audit for each collected form
      for (const f of collected as any[]) {
        try {
          const res = await formsService.getFormDataDetails(f.id);
          const fdRoot: any = res as any;
          const fd: any = fdRoot.formData || fdRoot.formDataInstance || fdRoot.data || fdRoot.forms?.formData || fdRoot.forms?.formDataInstance || fdRoot.form || fdRoot;
          const vm = {
            id: fd.id,
            displayName: fd.displayName || fd.name,
            state: fd.state || fd.status,
            type: fd.type,
            discipline: fd.discipline,
            createdDateTime: fd.createdDateTime || fd.createdAt,
            updatedDateTime: fd.updatedDateTime || fd.updatedAt,
            createdBy: fd.createdBy?.displayName || fd.createdBy?.id || fd.owner,
            assignees: Array.isArray(fd.assignees) ? fd.assignees.map((a: any) => a.displayName || a.id) : undefined,
            priority: fd.priority,
            dueDate: fd.dueDate,
            fields: Array.isArray(fd.fields) ? fd.fields : (Array.isArray(fd.formFields) ? fd.formFields : (Array.isArray(fd.instanceFields) ? fd.instanceFields : [])),
            attachments: Array.isArray(fd.attachments) ? fd.attachments : [],
          } as any;
          details[f.id] = vm;
        } catch {}
        try {
          const attRes = await formsService.getFormDataAttachments(f.id);
          const atts = Array.isArray((attRes as any).attachments) ? (attRes as any).attachments : [];
          if (!details[f.id]) details[f.id] = { id: f.id } as any;
          if (atts.length) details[f.id].attachments = atts;
        } catch {}
        try {
          const cRes = await formsService.getFormDataComments(f.id);
          const comments = Array.isArray((cRes as any).comments) ? (cRes as any).comments : [];
          if (comments.length) commentsById[f.id] = comments;
        } catch {}
        try {
          const aRes = await formsService.getFormDataAuditTrail(f.id);
          const entries = Array.isArray((aRes as any).auditTrailEntries)
            ? (aRes as any).auditTrailEntries
            : (Array.isArray((aRes as any).events) ? (aRes as any).events : []);
          if (entries.length) auditTrailById[f.id] = entries as any[];
        } catch {}
      }

      const rows: Array<Record<string, string>> = (collected as any[]).map((f, idx) => {
        const d = details[f.id] || {};
        const attachments = Array.isArray(d.attachments) ? d.attachments.map((a: any) => a.fileName || a.name || a.id).join('; ') : '';
        const comments = Array.isArray(commentsById[f.id]) ? commentsById[f.id]
          .map((c: any) => `${formatFieldValue(c.createdDateTime)}|${c.authorDisplayName || c.createdBy?.displayName || c.createdBy?.id || 'Unknown'}|${(c.text || '').replace(/\s+/g, ' ').trim()}`)
          .join('; ') : '';
        const fields = Array.isArray(d.fields) ? d.fields
          .map((fld: any) => `${String(fld.displayName || fld.name || fld.id)}=${String(fld.value ?? fld.currentValue ?? '')}`)
          .join('; ') : '';
        const auditTrail = Array.isArray(auditTrailById[f.id]) ? auditTrailById[f.id]
          .map((entry: any) => {
            const when = formatFieldValue(entry.changeDateTime || entry.timestamp);
            const who = entry.changeBy || entry.actor?.displayName || entry.actor?.id || 'Unknown';
            const action = entry.action || '';
            const changes = Array.isArray(entry.changes) && entry.changes.length
              ? entry.changes.map((c: any) => `${c.property || c.field || ''}:${String(c.oldValue ?? '')}->${String(c.newValue ?? '')}`).join('|')
              : 'No changes';
            return `${when}|${who}|${action}|${changes}`;
          }).join('; ') : '';
        return {
          Index: String(idx + 1),
          Id: String(f.id),
          DisplayName: String(d.displayName || f.displayName || f.name || ''),
          State: String(d.state || f.state || f.status || ''),
          Type: String(d.type || f.type || ''),
          Discipline: String(d.discipline || f.discipline || ''),
          Priority: String(d.priority ?? ''),
          DueDate: String(d.dueDate ?? ''),
          Created: String(d.createdDateTime ? new Date(d.createdDateTime).toLocaleString() : ''),
          Updated: String(d.updatedDateTime ? new Date(d.updatedDateTime).toLocaleString() : ''),
          CreatedBy: String(d.createdBy ?? ''),
          Assignees: Array.isArray(d.assignees) ? d.assignees.join('; ') : '',
          Fields: fields,
          Attachments: attachments,
          Comments: comments,
          AuditTrail: auditTrail,
          AuditTrailCount: String(Array.isArray(auditTrailById[f.id]) ? auditTrailById[f.id].length : 0),
        };
      });
      const csv = toCsv(rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `forms-export-all-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Forms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="forms-tw">iTwin</Label>
            <div className="relative" ref={iTwinDropdownRef}>
              <Input
                id="forms-tw"
                placeholder={'Search and select an iTwin…'}
                value={iTwinSearch}
                onChange={(e) => { setITwinSearch(e.target.value); setShowITwinDropdown(true); }}
                onFocus={() => setShowITwinDropdown(true)}
                className="text-sm pr-8"
              />
              {selectedITwinId && iTwinSearch && (
                <button
                  type="button"
                  onClick={() => { setSelectedITwinId(''); setITwinSearch(''); setShowITwinDropdown(false); setForms([]); setContinuationToken(null); }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
              {showITwinDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                  {iTwins
                    .filter(t => !iTwinSearch || t.displayName.toLowerCase().includes(iTwinSearch.toLowerCase()) || t.id.toLowerCase().includes(iTwinSearch.toLowerCase()))
                    .slice(0, iTwinSearch ? 20 : 10)
                    .map(t => (
                      <div
                        key={t.id}
                        className="px-3 py-2 hover:bg-muted cursor-pointer text-sm border-b border-border/20 last:border-0"
                        onClick={() => { 
                          setSelectedITwinId(t.id);
                          setITwinSearch(`${t.displayName} (${t.id.slice(0,8)}…)`);
                          setShowITwinDropdown(false);
                          setForms([]);
                          setContinuationToken(null);
                          localStorage.setItem('formsSelectedITwinId', t.id);
                          localStorage.setItem('formsSelectedITwinName', t.displayName);
                          const current = recentITwins.filter(r => r.id !== t.id);
                          const updated = [{ id: t.id, displayName: t.displayName }, ...current].slice(0,5);
                          setRecentITwins(updated);
                          localStorage.setItem('formsRecentITwins', JSON.stringify(updated));
                        }}
                      >
                        <div className="font-medium">{t.displayName}</div>
                        <div className="text-xs text-muted-foreground">{t.id}</div>
                      </div>
                    ))}
                </div>
              )}
            </div>
            {recentITwins.length > 0 && !selectedITwinId && (
              <div className="text-xs text-muted-foreground mt-1">
                Recently used:
                <div className="mt-1 flex flex-wrap gap-2">
                  {recentITwins.map(r => (
                    <button
                      key={r.id}
                      type="button"
                      className="underline"
                      onClick={() => { setSelectedITwinId(r.id); setITwinSearch(`${r.displayName} (${r.id.slice(0,8)}…)`); setShowITwinDropdown(false); setForms([]); setContinuationToken(null); }}
                    >
                      {r.displayName}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="space-y-1.5">
              <Label htmlFor="page-size">Page Size</Label>
              <select id="page-size" value={top} onChange={e => setTop(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <select id="status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded px-2 py-1 text-sm min-w-32">
                <option value="">All</option>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
                <option value="InProgress">InProgress</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="from">From</Label>
              <Input id="from" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="text-sm" />
            </div>
            <Button onClick={() => { setContinuationToken(null); loadForms(true); }} disabled={!selectedITwinId || loading}>Load</Button>
            <Button variant="outline" onClick={() => loadForms(false)} disabled={!selectedITwinId || loading || !hasNext}>Load More</Button>
            <Button variant="ghost" onClick={() => { setForms([]); setContinuationToken(null); setHasNext(false); }} disabled={loading}>Reset</Button>
            <Button variant="secondary" onClick={() => toggleSelectAll()} disabled={!Array.isArray(forms) || forms.length === 0}>
              {allSelected ? 'Unselect All' : 'Select All'}
            </Button>
            {Object.values(selectedIds).some(Boolean) && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading || Object.values(exporting).some(Boolean)}
                  onClick={async () => {
                    const ids = Object.keys(selectedIds).filter(id => selectedIds[id]);
                    await handleBulkExportToDatedFolder(ids);
                  }}
                  title="Export selected (moves to dated folder)"
                >
                  Export Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={Object.values(downloading).some(Boolean)}
                  onClick={async () => {
                    const ids = Object.keys(selectedIds).filter(id => selectedIds[id]);
                    for (const id of ids) {
                      try {
                        setDownloading(s => ({ ...s, [id]: true }));
                        const blob = await formsService.downloadFormAsFile(id, { includeHeader: false });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = `form-${id}.pdf`; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
                      } catch (e) { console.error('Bulk download failed for', id, e); }
                      finally { setDownloading(s => ({ ...s, [id]: false })); }
                    }
                  }}
                  title="Bulk download selected PDFs"
                >
                  Download Selected
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>Clear Selection</Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!Array.isArray(forms) || forms.length === 0}
                  onClick={handleExportCSV}
                  title="Export loaded forms to CSV"
                >
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!selectedITwinId}
                  onClick={handleExportCSVAll}
                  title="Export ALL forms (across pages) to CSV"
                >
                  Export All CSV
                </Button>
              </div>
            )}
            <label className="flex items-center gap-2 text-xs ml-2">
              <input type="checkbox" checked={debug} onChange={e => setDebug(e.target.checked)} />
              Debug
            </label>
            <div className="ml-auto">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowITwinDropdown(false)}>
                Columns
              </Button>
              <div className="mt-2 p-2 border rounded bg-background shadow-sm flex flex-wrap gap-3">
                {Object.keys(visibleColumns).map(k => (
                  <label key={k} className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={visibleColumns[k]} onChange={() => toggleColumn(k)} />
                    {k}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="border rounded overflow-auto">
            {(!Array.isArray(forms) || forms.length === 0) ? (
              <div className="p-4 text-sm text-muted-foreground">No forms loaded</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-3 py-2">#</th>
                    <th className="text-left px-3 py-2">
                      <input type="checkbox" aria-label="Select all" checked={allSelected} onChange={toggleSelectAll} />
                    </th>
                    {visibleColumns.displayName && (<th className="text-left px-3 py-2">Display Name</th>)}
                    {visibleColumns.state && (<th className="text-left px-3 py-2">State</th>)}
                    {visibleColumns.type && (<th className="text-left px-3 py-2">Type</th>)}
                    {visibleColumns.discipline && (<th className="text-left px-3 py-2">Discipline</th>)}
                    {visibleColumns.id && (<th className="text-left px-3 py-2">Id</th>)}
                    <th className="text-left px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {forms.map((f: any, idx: number) => (
                    <Fragment key={f.id}>
                      <tr key={f.id + '-row'} className="border-t">
                        <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            aria-label={`Select form ${f.id}`}
                            checked={!!selectedIds[f.id]}
                            onChange={() => toggleSelectId(f.id)}
                          />
                        </td>
                        {visibleColumns.displayName && (<td className="px-3 py-2">{f.displayName || f.name || f.id}</td>)}
                        {visibleColumns.state && (<td className="px-3 py-2">{f.state || f.status}</td>)}
                        {visibleColumns.type && (<td className="px-3 py-2">{f.type || ''}</td>)}
                        {visibleColumns.discipline && (<td className="px-3 py-2">{f.discipline || ''}</td>)}
                        {visibleColumns.id && (<td className="px-3 py-2">{f.id}</td>)}
                        <td className="px-3 py-2">
                          <div className="flex gap-2 flex-wrap items-center">
                            <Button size="sm" variant="outline" onClick={() => toggleDetails(f.id)}>{details[f.id] ? 'Hide' : 'Details'}</Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={!!downloading[f.id]}
                              onClick={() => handleDownloadForm(f.id)}
                              title="Download form as PDF"
                            >
                              {downloading[f.id] ? 'Downloading…' : 'Download'}
                            </Button>
                            {downloading[f.id] && (
                              <span
                                aria-label="Downloading PDF"
                                title="Downloading PDF"
                                className="inline-block w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"
                              />
                            )}
                            {/* Accessible live status for download */}
                            <span role="status" aria-live="polite" className="sr-only">
                              {downloading[f.id] ? 'Downloading PDF…' : ''}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={!selectedITwinId || !!exporting[f.id]}
                              onClick={() => { handleExportToDatedFolder(f.id); }}
                              title="Export form (moves to dated folder)"
                            >
                              {exporting[f.id] ? 'Exporting…' : (exportedOk[f.id] ? 'Exported ✓' : 'Export')}
                            </Button>
                            {exporting[f.id] && (
                              <span
                                aria-label="Exporting to storage"
                                title="Exporting to storage"
                                className="inline-block w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"
                              />
                            )}
                            {/* Accessible live status for export */}
                            <span role="status" aria-live="polite" className="sr-only">
                              {exporting[f.id] ? 'Exporting form to storage…' : ''}
                            </span>
                            {exportedOk[f.id] && (
                              <span className="text-xs text-muted-foreground" aria-live="polite">Moved to today’s folder</span>
                            )}
                          </div>
                        </td>
                      </tr>
                      {details[f.id] && (
                        <tr key={f.id + '-details'}>
                          <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 3} className="px-3 py-3 bg-muted/30">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div>
                                <div><span className="font-medium">Display Name:</span> {details[f.id].displayName || f.displayName || f.id}</div>
                                <div><span className="font-medium">State:</span> {details[f.id].state}</div>
                                <div><span className="font-medium">Type:</span> {details[f.id].type}</div>
                                <div><span className="font-medium">Discipline:</span> {details[f.id].discipline}</div>
                                <div><span className="font-medium">Priority:</span> {details[f.id].priority || '-'}</div>
                                <div><span className="font-medium">Due Date:</span> {details[f.id].dueDate || '-'}</div>
                                <div><span className="font-medium">Created:</span> {formatFieldValue(details[f.id].createdDateTime) || '-'}</div>
                                <div><span className="font-medium">Updated:</span> {formatFieldValue(details[f.id].updatedDateTime) || '-'}</div>
                                <div><span className="font-medium">Created By:</span> {details[f.id].createdBy || '-'}</div>
                                <div><span className="font-medium">Assignees:</span> {Array.isArray(details[f.id].assignees) && details[f.id].assignees.length ? details[f.id].assignees.join(', ') : '-'}</div>
                              </div>
                              <div>
                                <div className="font-medium mb-1">Fields</div>
                                {Array.isArray(details[f.id].fields) && details[f.id].fields.length ? (
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr>
                                        <th className="text-left pr-2">Name</th>
                                        <th className="text-left">Value</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {details[f.id].fields.map((field: any, idx: number) => (
                                        <tr key={String(field.id || field.name || idx)}>
                                          <td className="pr-2">{field.displayName || field.name || field.id}</td>
                                          <td>{formatFieldValue(field.value ?? field.currentValue)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <div className="text-muted-foreground">No fields</div>
                                )}
                                <div className="font-medium mt-3 mb-1">Attachments</div>
                                {Array.isArray(details[f.id].attachments) && details[f.id].attachments.length ? (
                                  <ul className="list-disc pl-5">
                                    {details[f.id].attachments.map((att: any, idx: number) => {
                                      const isImage = (att.type && String(att.type).toLowerCase().includes('png'))
                                        || (att.type && String(att.type).toLowerCase().includes('jpg'))
                                        || (att.type && String(att.type).toLowerCase().includes('jpeg'))
                                        || (att.contentType && String(att.contentType).toLowerCase().startsWith('image/'));
                                      const href = att._links?.self?.href;
                                      return (
                                        <li key={String(att.id || att.fileName || att.name || idx)}>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="mr-2">{att.fileName || att.name || att.id}</span>
                                            {att.type && (<span className="text-muted-foreground">({att.type})</span>)}
                                            {att.contentType && !att.type && (<span className="text-muted-foreground">({att.contentType})</span>)}
                                            {att.size != null && (<span className="ml-2 text-muted-foreground">{att.size} bytes</span>)}
                                            {att.sizeInBytes != null && att.size == null && (<span className="ml-2 text-muted-foreground">{att.sizeInBytes} bytes</span>)}
                                            {att.createdDateTime && (<span className="ml-2 text-muted-foreground">{formatFieldValue(att.createdDateTime)}</span>)}
                                            {href && (
                                              <a className="ml-3 underline text-blue-600" href={href} target="_blank" rel="noreferrer">Open</a>
                                            )}
                                          </div>
                                          {isImage && href && (
                                            <div className="mt-2">
                                              <img src={href} alt={att.fileName || att.name || att.id} className="max-h-48 rounded border" />
                                            </div>
                                          )}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                ) : (
                                  <div className="text-muted-foreground">No attachments</div>
                                )}

                                <div className="font-medium mt-3 mb-1">Comments</div>
                                {Array.isArray(commentsById[f.id]) && commentsById[f.id].length ? (
                                  <ul className="list-disc pl-5">
                                    {commentsById[f.id].map((c: any) => (
                                      <li key={c.id}>
                                        <span className="font-medium">{c.authorDisplayName || c.createdBy?.displayName || c.createdBy?.id || 'Unknown'}</span>
                                        <span className="ml-2 text-muted-foreground">{formatFieldValue(c.createdDateTime)}</span>
                                        <div className="mt-1">{c.text || ''}</div>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="text-muted-foreground">No comments</div>
                                )}

                                <div className="font-medium mt-3 mb-1">Audit Trail</div>
                                {Array.isArray(auditTrailById[f.id]) && auditTrailById[f.id].length ? (
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr>
                                        <th className="text-left pr-2">When</th>
                                        <th className="text-left pr-2">Who</th>
                                        <th className="text-left pr-2">Action</th>
                                        <th className="text-left">Changes</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {auditTrailById[f.id].map((entry: any, idx: number) => (
                                        <tr key={String(entry.id || idx)}>
                                          <td className="pr-2">{formatFieldValue(entry.changeDateTime || entry.timestamp)}</td>
                                          <td className="pr-2">{entry.changeBy || entry.actor?.displayName || entry.actor?.id || 'Unknown'}</td>
                                          <td className="pr-2">{entry.action || ''}</td>
                                          <td>
                                            {Array.isArray(entry.changes) && entry.changes.length ? (
                                              <ul className="list-disc pl-4">
                                                {entry.changes.map((c: any, cIdx: number) => (
                                                  <li key={String(c.property || c.field || cIdx)}>
                                                    <span className="mr-2">{c.property || c.field || ''}</span>
                                                    <span className="text-muted-foreground">{String(c.oldValue ?? '')} → {String(c.newValue ?? '')}</span>
                                                  </li>
                                                ))}
                                              </ul>
                                            ) : (
                                              <span className="text-muted-foreground">No changes</span>
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                ) : (
                                  <div className="text-muted-foreground">No audit trail</div>
                                )}
                              </div>
                            </div>
                            <div className="mt-3">
                              <details>
                                <summary className="cursor-pointer">Raw JSON</summary>
                                <pre className="overflow-auto max-h-64 text-xs mt-2">{JSON.stringify(details[f.id]?.raw ?? {}, null, 2)}</pre>
                              </details>
                              {debug && (
                                <details className="mt-2">
                                  <summary className="cursor-pointer">Raw Details Response</summary>
                                  <pre className="overflow-auto max-h-64 text-xs mt-2">{JSON.stringify(lastDetailsResponses[f.id], null, 2)}</pre>
                                </details>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {debug && (
            <div className="border rounded mt-4">
              <div className="p-2 text-xs text-muted-foreground">Debug: raw response</div>
              <div className="p-2 text-xs bg-muted/40">
                <pre className="overflow-auto max-h-80">{JSON.stringify(lastResponse, null, 2)}</pre>
              </div>
              <div className="p-2 text-xs">Loaded count: {Array.isArray(forms) ? forms.length : 0} • ContinuationToken: {String(continuationToken || '')} • Top: {top} • HasMore: {String(hasNext)}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
