import { BaseAPIClient } from "../base/BaseAPIClient";

// Basic types for Export API (simplified for IFC use case)
export interface CreateExportRequest {
  iModelId: string;
  changesetId?: string; // OR changesetIndex if supported
  format: 'IFC';
  ifcVersion?: 'IFC2X3' | 'IFC4' | 'IFC4X3'; // version/schema variant
}

export interface ExportItemLink { href: string; rel?: string; }
export interface ExportRepresentation { format: string; fileName?: string; downloadUrl?: string; }

export interface ExportJob {
  id: string;
  iModelId: string;
  state: string; // queued | running | succeeded | failed
  createdDateTime?: string;
  updatedDateTime?: string;
  format?: string;
  changesetId?: string;
  _links?: Record<string, ExportItemLink>;
  representation?: ExportRepresentation;
  diagnostics?: Array<{ code?: string; message?: string; severity?: string }>;
}

export interface CreateExportResponse { export: ExportJob; }
export interface GetExportResponse { export: ExportJob; }

export class ExportService extends BaseAPIClient {
  async createIFCExport(iModelId: string, changesetId?: string, ifcVersion?: CreateExportRequest['ifcVersion']): Promise<ExportJob | null> {
    const body: CreateExportRequest = { iModelId, format: 'IFC' };
    if (changesetId) body.changesetId = changesetId;
    if (ifcVersion) body.ifcVersion = ifcVersion;
    try {
  // NOTE: Corrected endpoint path from /export/exports (404) to /exports
  const res = await this.fetch<CreateExportResponse>(`/exports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/vnd.bentley.itwin-platform.v1+json' },
        body: JSON.stringify(body)
      });
      return res?.export || null;
    } catch (e) {
      console.error('Failed to create IFC export', e);
      return null;
    }
  }

  async getExport(exportId: string): Promise<ExportJob | null> {
    try {
  // Corrected endpoint path
  const res = await this.fetch<GetExportResponse>(`/exports/${encodeURIComponent(exportId)}`, {
        headers: { Accept: 'application/vnd.bentley.itwin-platform.v1+json' }
      });
      return res?.export || null;
    } catch (e) {
      console.error('Failed to get export status', e);
      return null;
    }
  }
}

export const exportService = new ExportService();