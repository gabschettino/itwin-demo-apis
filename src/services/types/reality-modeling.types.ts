export interface Workspace {
  id: string;
  createdDateTime: string;
  name: string;
  iTwinId: string;
  contextCaptureVersion: string;
}

export interface WorkspaceResponse {
  workspace: Workspace;
}

export interface WorkspacesResponse {
  workspaces: Workspace[];
  _links: {
    self: { href: string };
    next?: { href: string };
  };
}

export interface JobInput {
  id: string;
  description: string;
}

export interface JobOutput {
  format: string;
  id: string | null;
}

// User-facing diagnostic messages surfaced during job progress/failure.
// These provide granular error codes and descriptive text to assist remediation.
export interface JobUserMessage {
  code?: string;
  title?: string;
  message?: string;
  messageParms?: string[];
  severity?: string; // e.g. "Error" | "Warning" | "Info"
}

export interface CostEstimationParameters {
  gigaPixels?: number;
  megaPoints?: number;
  meshQuality: 'Draft' | 'Medium' | 'Extra';
}

export interface JobSettings {
  quality: 'Draft' | 'Medium' | 'Extra';
  processingEngines: number;
  outputs: string[];
}

export interface Job {
  id: string;
  name: string;
  type: 'Full' | 'Calibration' | 'Reconstruction';
  state: 'unsubmitted' | 'active' | 'success' | 'failed' | 'cancelled';
  createdDateTime: string;
  lastModifiedDateTime: string;
  iTwinId: string;
  location: string;
  email: string;
  workspaceId: string;
  inputs: JobInput[];
  jobSettings: {
    quality: string;
    outputs: JobOutput[];
    processingEngines: number;
  };
  costEstimationParameters?: CostEstimationParameters;
  estimatedCost?: number;
}

export interface JobResponse {
  job: Job;
}

export interface JobsResponse {
  jobs: Job[];
  _links: {
    self: { href: string };
    next?: { href: string };
  };
}

// Job progress tracking
export interface JobProgress {
  percentage: number; // 0-100
  state: string; // e.g., Active, Completed, Failed
  step: string; // current processing step
  userMessages?: JobUserMessage[]; // optional array of detailed messages from processing engine
}

export interface JobProgressResponse {
  jobProgress: JobProgress;
}

export interface CreateJobRequest {
  type: 'Full' | 'Calibration' | 'Reconstruction';
  name: string;
  costEstimationParameters?: CostEstimationParameters;
  workspaceId: string;
  inputs: JobInput[];
  settings: JobSettings;
}
