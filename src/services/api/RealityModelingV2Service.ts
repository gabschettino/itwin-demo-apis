import { BaseAPIClient } from "../base/BaseAPIClient";

// Tech preview Reality Modeling V2 types (minimal subset)
export interface RMV2ImageCollectionCreateRequest {
  iTwinId: string;
  displayName: string;
  description?: string;
}

export interface RMV2ImageCollection {
  id: string;
  iTwinId: string;
  displayName: string;
  createdDateTime: string;
  updatedDateTime?: string;
  imageCount?: number;
}

// FillImageProperties job creation body (tech preview)
export interface RMV2JobCreateRequest {
  iTwinId: string;
  name: string;
  type: 'FillImageProperties';
  specifications: {
    inputs: { imageCollections: string[] };
    outputs: string[]; // e.g. ['Scene']
  };
}

export interface RMV2JobProgress {
  id: string;
  state: string; // queued | running | completed | failed
  percentage?: number;
  step?: string;
  userMessages?: Array<{ code?: string; message?: string; severity?: string }>;
}

export interface RMV2Job {
  id: string;
  iTwinId: string;
  imageCollectionId: string;
  name: string;
  state: string;
  createdDateTime: string;
}

// NOTE: Endpoint paths are placeholders; adjust when official V2 paths are confirmed.
const V2_BASE = "/reality-modeling/v2"; // using relative base similar to other services

export class RealityModelingV2Service extends BaseAPIClient {
  async createImageCollection(body: RMV2ImageCollectionCreateRequest): Promise<RMV2ImageCollection> {
    const res = await this.fetch<{ imageCollection: RMV2ImageCollection }>(`${V2_BASE}/image-collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return res.imageCollection;
  }

  async getImageCollection(id: string): Promise<RMV2ImageCollection | null> {
    try {
      const res = await this.fetch<{ imageCollection: RMV2ImageCollection }>(`${V2_BASE}/image-collections/${id}`);
      return res.imageCollection;
    } catch { return null; }
  }

  async listImageCollections(iTwinId: string): Promise<RMV2ImageCollection[]> {
    const res = await this.fetch<{ imageCollections: RMV2ImageCollection[] }>(`${V2_BASE}/image-collections?iTwinId=${encodeURIComponent(iTwinId)}&$top=50`);
    return res.imageCollections;
  }

  async getImageCollectionWriteAccess(id: string): Promise<{ containerUrl: string | null }> {
    // Tech preview may reuse write access concept
    try {
      const res = await this.fetch<{ containerUrl?: string }>(`${V2_BASE}/image-collections/${id}/write-access`);
      return { containerUrl: res.containerUrl || null };
    } catch { return { containerUrl: null }; }
  }

  async createJob(body: RMV2JobCreateRequest): Promise<RMV2Job | null> {
    // Endpoint is base /reality-modeling/jobs (no /v2 segment) with JSON Patch media type requirement
    const endpoint = `/reality-modeling/jobs`;
    try {
      const res = await this.fetch<{ job: RMV2Job }>(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json-patch+json', 'Accept': 'application/vnd.bentley.itwin-platform.v2+json' },
        body: JSON.stringify(body)
      });
      return res.job;
    } catch { return null; }
  }

  // submitJob may be unnecessary if creation starts processing; retain method for future state transitions if needed
  async submitJob(): Promise<RMV2Job | null> { return null; }

  async getJobProgress(jobId: string): Promise<RMV2JobProgress | null> {
    // Progress endpoint (versioned via Accept header) lives at base /reality-modeling/jobs/{id}/progress
    const url = `/reality-modeling/jobs/${jobId}/progress`;
    try {
      const raw = await this.fetch<unknown>(url, {
        headers: { 'Accept': 'application/vnd.bentley.itwin-platform.v2+json' }
      });
      const obj = raw as Record<string, unknown> | null | undefined;
      const jp = (obj && 'jobProgress' in obj ? (obj.jobProgress as Record<string, unknown>) : obj) as Record<string, unknown> | null | undefined;
      if (!jp) return null;
      return {
        id: String(jp.id || ''),
        state: String(jp.state || ''),
        percentage: typeof jp.percentage === 'number' ? jp.percentage : undefined,
        step: typeof jp.step === 'string' ? jp.step : undefined,
        userMessages: Array.isArray(jp.userMessages) ? (jp.userMessages as Array<{ code?: string; message?: string; severity?: string }>) : undefined
      };
    } catch {
      return null;
    }
  }
}

export const realityModelingV2Service = new RealityModelingV2Service();