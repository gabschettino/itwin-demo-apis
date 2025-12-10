import { BaseAPIClient } from "../base/BaseAPIClient";
import { API_CONFIG } from "../config/api.config";
import type {
  Workspace,
  WorkspaceResponse,
  WorkspacesResponse,
  Job,
  JobResponse,
  JobsResponse,
  CreateJobRequest,
  JobProgressResponse,
} from "../types";

interface WorkspaceEndpointAttempt {
  endpoint: string;
  accept: string;
  method: 'HEAD' | 'GET';
  status?: number;
  ok?: boolean;
  error?: string;
}

export class RealityModelingService extends BaseAPIClient {
  private resolvedWorkspacesEndpoint: string | null = null;
  private workspaceEndpointTried = false;
  // Store last workspace error (unknown to avoid any); can be inspected by UI with type narrowing
  public lastWorkspacesError: unknown = null;
  public workspaceAttempts: WorkspaceEndpointAttempt[] = [];

  /**
   * Attempt to discover the correct workspaces endpoint. We consider an endpoint "valid" if:
   * - HTTP status is 200-299 (definitely OK)
   * - OR status is 401/403 (endpoint exists but auth/permissions differ)
   * - OR status is 400 (endpoint exists but request missing parameters)
   * We ignore 404/405/500 series as invalid for selection.
   * We probe multiple Accept headers because some services version their Accept instead of path.
   */
  private async resolveWorkspacesEndpoint(forceRefresh = false): Promise<string> {
    if (!forceRefresh && this.resolvedWorkspacesEndpoint) return this.resolvedWorkspacesEndpoint;
    if (!forceRefresh && this.workspaceEndpointTried && !this.resolvedWorkspacesEndpoint) {
      return API_CONFIG.ENDPOINTS.CONTEXT_CAPTURE.WORKSPACES; // fallback original
    }
    this.workspaceEndpointTried = true;

    const endpointCandidates = [
      API_CONFIG.ENDPOINTS.CONTEXT_CAPTURE.WORKSPACES, // documented base
      '/contextcapture/v1/workspaces',
      '/itwincapture/workspaces', // alt naming (unversioned)
      '/itwincapture/v1/workspaces'
    ];
    const acceptVariants = [
      API_CONFIG.DEFAULT_HEADERS.Accept,
      'application/vnd.bentley.contextcapture.v1+json',
      'application/vnd.bentley.itwin-platform.v2+json',
      'application/json'
    ];

    const isValidStatus = (s: number) => (s >= 200 && s < 300) || s === 400 || s === 401 || s === 403;

    for (const ep of endpointCandidates) {
      for (const accept of acceptVariants) {
        for (const method of ['HEAD','GET'] as const) {
          const attempt: WorkspaceEndpointAttempt = { endpoint: ep, accept, method };
          try {
            const res = await fetch(`${API_CONFIG.BASE_URL}${ep}`, { method, headers: { Accept: accept } });
            attempt.status = res.status; attempt.ok = res.ok;
            this.workspaceAttempts.push(attempt);
            if (isValidStatus(res.status)) {
              this.resolvedWorkspacesEndpoint = ep;
              return ep;
            }
          } catch (err: unknown) {
            attempt.error = (err instanceof Error ? err.message : 'network error');
            this.workspaceAttempts.push(attempt);
          }
          // If HEAD failed with 404, try GET before moving to next accept variant
        }
      }
    }

    // If none validated, retain original (even if 404) so callers have deterministic value.
    this.resolvedWorkspacesEndpoint = API_CONFIG.ENDPOINTS.CONTEXT_CAPTURE.WORKSPACES;
    return this.resolvedWorkspacesEndpoint;
  }
  public async createWorkspace(name: string, iTwinId?: string): Promise<Workspace | null> {
    try {
      const body: { name: string; iTwinId?: string } = { name };
      if (iTwinId) {
        body.iTwinId = iTwinId;
      }
      const ep = await this.resolveWorkspacesEndpoint();
      const data = await this.fetch<WorkspaceResponse>(ep, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      return data.workspace;
    } catch (error) {
      console.error("Error creating workspace:", error);
      return null;
    }
  }

  public async getWorkspaces(): Promise<Workspace[] | null> {
    try {
      const ep = await this.resolveWorkspacesEndpoint();
      const data = await this.fetch<WorkspacesResponse>(ep);
      return data.workspaces;
    } catch (error) {
      console.error("Error fetching workspaces:", error);
      this.lastWorkspacesError = error;
      return null;
    }
  }

  public async deleteWorkspace(workspaceId: string): Promise<boolean> {
    try {
      const ep = await this.resolveWorkspacesEndpoint();
      await this.fetch<null>(`${ep}/${workspaceId}`, { method: 'DELETE' });
      return true;
    } catch (error) {
      console.error('Error deleting workspace:', error);
      return false;
    }
  }

  public async createJob(jobRequest: CreateJobRequest): Promise<Job | null> {
    try {
      const data = await this.fetch<JobResponse>(API_CONFIG.ENDPOINTS.CONTEXT_CAPTURE.JOBS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jobRequest),
      });
      return data.job;
    } catch (error) {
      console.error("Error creating job:", error);
      return null;
    }
  }

  public async getJobs(): Promise<Job[] | null> {
    try {
      const data = await this.fetch<JobsResponse>(API_CONFIG.ENDPOINTS.CONTEXT_CAPTURE.JOBS);
      return data.jobs;
    } catch (error) {
      console.error("Error fetching jobs:", error);
      return null;
    }
  }

  public async getJob(jobId: string): Promise<Job | null> {
    try {
      const data = await this.fetch<JobResponse>(`${API_CONFIG.ENDPOINTS.CONTEXT_CAPTURE.JOBS}/${jobId}`);
      return data.job;
    } catch (error) {
      console.error("Error fetching job:", error);
      return null;
    }
  }

  public async submitJob(jobId: string): Promise<Job | null> {
    // Align with tutorial: PATCH job state to active
    try {
      const data = await this.fetch<JobResponse>(`${API_CONFIG.ENDPOINTS.CONTEXT_CAPTURE.JOBS}/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: "active" }),
      });
      return data.job;
    } catch (error) {
      console.error("Error submitting job:", error);
      return null;
    }
  }

  public async cancelJob(jobId: string): Promise<Job | null> {
    try {
      const data = await this.fetch<JobResponse>(`${API_CONFIG.ENDPOINTS.CONTEXT_CAPTURE.JOBS}/${jobId}/cancel`, {
        method: "POST",
      });
      return data.job;
    } catch (error) {
      console.error("Error cancelling job:", error);
      return null;
    }
  }

  public async getJobProgress(jobId: string) {
    try {
      const data = await this.fetch<JobProgressResponse>(`${API_CONFIG.ENDPOINTS.CONTEXT_CAPTURE.JOBS}/${jobId}/progress`);
      return data.jobProgress;
    } catch (error) {
      console.error("Error fetching job progress:", error);
      return null;
    }
  }
}
