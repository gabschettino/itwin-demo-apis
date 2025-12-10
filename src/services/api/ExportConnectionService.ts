import { BaseAPIClient } from "../base/BaseAPIClient";

// Assumed endpoint patterns for Export API based on documented flow (connection -> run -> status)
// If actual Bentley endpoints differ, adjust the ENDPOINT constants accordingly.

export interface ExportConnection {
  id: string;
  iModelId: string;
  iTwinId?: string; // projectId in some docs
  format?: string; // default/last run format
  createdDateTime?: string;
  updatedDateTime?: string;
  state?: string;
  _links?: Record<string, { href: string; rel?: string }>;
}

export interface CreateExportConnectionRequest {
  iModelId: string;
  displayName: string;
  authenticationType?: 'User' | 'Service';
  projectId?: string; // iTwin / project context
  description?: string;
}

export interface ExportRun {
  id: string;
  state: string; // Expected: Queued | Running | Completed
  result?: string; // Success | Failed | Canceled
  createdDateTime?: string;
  updatedDateTime?: string;
  // Additional optional fields (spec may extend)
  _links?: Record<string, { href: string; rel?: string }>;
}

export interface CreateRunRequest {
  exportType: 'IFC' | 'LandXML';
  ifcVersion?: 'IFC4.3' | 'IFC2x3' | 'IFC2x3 CV 2.0' | 'IFC4 RV 1.2'; // Accepted IFC labels
  projectId?: string; // iTwin/project id
  inputOptions?: {
    changesetId?: string;
    mappingFileId?: string; // Placeholder for future mapping file support
    savedViewId?: string;   // Saved view selector
  };
  outputOptions?: {
    folderId?: string;
    replaceOlderFile?: boolean;
    saveLogs?: boolean;
    location?: 'STORAGE' | 'USER_BLOBS_STORAGE';
    outputSasUrl?: string;
    logsSasUrl?: string;
  };
}

interface CreateConnectionResponse { connection: ExportConnection; }
interface GetConnectionResponse { connection: ExportConnection; }
interface ListConnectionsResponse { connections: ExportConnection[]; }
interface RunListResponse { runs: ExportRun[]; _links?: Record<string, { href: string }> }
interface RunDetailResponse { run: ExportRun & { jobs?: Array<{ id: string; state?: string; tasks?: Array<{ id: string; phase?: string; state?: string; error?: { code?: string; message?: string; description?: string } }> }> } }

class ExportConnectionService extends BaseAPIClient {
  private ENDPOINTS = {
    CONNECTIONS: '/export/connections',
    CONNECTION: (id: string) => `/export/connections/${id}`,
    RUNS: (id: string) => `/export/connections/${id}/runs`, // plural used for both create (POST) and list (GET)
    RUN: (connId: string, runId: string) => `/export/connections/${connId}/runs/${runId}`,
  } as const;

  async createConnection(body: CreateExportConnectionRequest): Promise<ExportConnection | null> {
    try {
      const res = await this.fetch<CreateConnectionResponse>(this.ENDPOINTS.CONNECTIONS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return res?.connection || null;
    } catch (e) {
      console.error('Failed to create export connection', e);
      return null;
    }
  }

  async getConnection(id: string): Promise<ExportConnection | null> {
    try {
      const res = await this.fetch<GetConnectionResponse>(this.ENDPOINTS.CONNECTION(id));
      return res?.connection || null;
    } catch (e) {
      console.error('Failed to get export connection', e);
      return null;
    }
  }

  async listConnections(iModelId?: string, top = 50, skip = 0): Promise<ExportConnection[]> {
    // If API supports filtering by iModelId via query param. Placeholder implementation.
    try {
      const query = new URLSearchParams();
      if (iModelId) query.set('iModelId', iModelId);
      query.set('$top', String(top));
      query.set('$skip', String(skip));
      const url = `${this.ENDPOINTS.CONNECTIONS}?${query.toString()}`;
      const res = await this.fetch<ListConnectionsResponse>(url);
      return res?.connections || [];
    } catch (e) {
      console.error('Failed to list export connections', e);
      return [];
    }
  }

  async createRun(connectionId: string, body: CreateRunRequest): Promise<boolean> {
    try {
      await this.fetch<unknown>(this.ENDPOINTS.RUNS(connectionId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/vnd.bentley.itwin-platform.v1+json' },
        body: JSON.stringify(body),
      });
      return true; // Expect 202 Accepted
    } catch (e) {
      console.error('Failed to start export run', e);
      return false;
    }
  }

  async listRuns(connectionId: string, top = 20, skip = 0): Promise<ExportRun[]> {
    try {
      const qp = new URLSearchParams();
      qp.set('$top', String(top));
      qp.set('$skip', String(skip));
      const res = await this.fetch<RunListResponse>(`${this.ENDPOINTS.RUNS(connectionId)}?${qp.toString()}`);
      return res?.runs || [];
    } catch (e) {
      console.error('Failed to list runs', e);
      return [];
    }
  }

  async getRun(connectionId: string, runId: string): Promise<RunDetailResponse['run'] | null> {
    try {
      const res = await this.fetch<RunDetailResponse>(this.ENDPOINTS.RUN(connectionId, runId));
      return res?.run || null;
    } catch (e) {
      console.error('Failed to get run detail', e);
      return null;
    }
  }
}

export const exportConnectionService = new ExportConnectionService();
