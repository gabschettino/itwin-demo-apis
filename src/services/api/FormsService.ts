import { BaseAPIClient } from "../base/BaseAPIClient";

export interface FormsListResponse {
  forms?: Array<{ id: string; name?: string; status?: string; createdDateTime?: string }>;
  _links?: { next?: { href: string } };
}

export interface FormDataDetailsResponse {
  formData?: { id: string; name?: string; status?: string; createdDateTime?: string; fields?: Record<string, unknown> };
}

export interface FormDataAttachmentsResponse {
  attachments?: Array<{ id: string; name?: string; contentType?: string; sizeInBytes?: number; _links?: { self?: { href: string } } }>;
}

export interface FormDataCommentsResponse {
  comments?: Array<{
    id: string;
    text?: string;
    createdDateTime?: string;
    createdBy?: { id?: string; displayName?: string };
  }>;
}

export interface FormDataAuditTrailResponse {
  events?: Array<{
    id?: string;
    timestamp?: string;
    actor?: { id?: string; displayName?: string };
    action?: string;
    field?: string;
    previousValue?: unknown;
    newValue?: unknown;
  }>;
}

class FormsService extends BaseAPIClient {
  async listProjectFormData(
    iTwinId: string,
    top = 50,
    continuationToken?: string,
    filters?: { status?: string; from?: string; to?: string }
  ): Promise<FormsListResponse> {
    // Per guidance: GET /forms/?iTwinId=... with Prefer: return=minimal and v2 Accept.
    const queryParts = [`iTwinId=${encodeURIComponent(iTwinId)}`, `$top=${top}`];
    if (continuationToken) queryParts.push(`continuationToken=${encodeURIComponent(continuationToken)}`);
    if (filters?.status) queryParts.push(`status=${encodeURIComponent(filters.status)}`);
    if (filters?.from) queryParts.push(`from=${encodeURIComponent(filters.from)}`);
    if (filters?.to) queryParts.push(`to=${encodeURIComponent(filters.to)}`);
    const query = queryParts.join("&");
    return this.fetch<FormsListResponse>(`/forms/?${query}`, {
      headers: {
        Accept: "application/vnd.bentley.itwin-platform.v2+json",
        Prefer: "return=minimal",
      },
    });
  }

  async getFormDataDetails(formDataId: string): Promise<FormDataDetailsResponse> {
    // Per guidance: GET /forms/{formDataId} with v2 Accept.
    return this.fetch<FormDataDetailsResponse>(`/forms/${encodeURIComponent(formDataId)}`, {
      headers: {
        Accept: "application/vnd.bentley.itwin-platform.v2+json",
      },
    });
  }

  async getFormDataAttachments(formDataId: string): Promise<FormDataAttachmentsResponse> {
    // GET /forms/{formDataId}/attachments with v2 Accept.
    return this.fetch<FormDataAttachmentsResponse>(`/forms/${encodeURIComponent(formDataId)}/attachments`, {
      headers: {
        Accept: "application/vnd.bentley.itwin-platform.v2+json",
      },
    });
  }

  async getFormDataComments(formDataId: string): Promise<FormDataCommentsResponse> {
    return this.fetch<FormDataCommentsResponse>(`/forms/${encodeURIComponent(formDataId)}/comments`, {
      headers: {
        Accept: "application/vnd.bentley.itwin-platform.v2+json",
      },
    });
  }

  async getFormDataAuditTrail(formDataId: string): Promise<FormDataAuditTrailResponse> {
    // Correct endpoint per v2: /forms/{id}/audit-trail-entries
    return this.fetch<FormDataAuditTrailResponse>(`/forms/${encodeURIComponent(formDataId)}/audit-trail-entries`, {
      headers: {
        Accept: "application/vnd.bentley.itwin-platform.v2+json",
      },
    });
  }

  // Downloads a single form as a file (binary). Returns a Blob.
  async downloadFormAsFile(formDataId: string, opts?: { includeHeader?: boolean }) {
    const includeHeader = opts?.includeHeader ? 'true' : 'false';
    // Per docs: /forms/{id}/download?fileType=pdf&includeHeader=true
    return this.fetchBlob(`/forms/${encodeURIComponent(formDataId)}/download?fileType=pdf&includeHeader=${includeHeader}`, {
      headers: { Accept: "application/vnd.bentley.itwin-platform.v2+json" },
      method: 'GET',
    });
  }

  // Initiates export of one or more forms to storage per v2 docs via GET query
  async exportFormToStorage(params: { ids: string[]; includeHeader?: boolean; fileType?: 'pdf' }) {
    const idsParam = params.ids.map(encodeURIComponent).join(',');
    const includeHeader = params.includeHeader ? 'true' : 'false';
    const fileType = params.fileType || 'pdf';
    const query = `ids=${idsParam}&includeHeader=${includeHeader}&fileType=${encodeURIComponent(fileType)}`;
    return this.fetch(`/forms/storage-export?${query}`, {
      headers: { Accept: "application/vnd.bentley.itwin-platform.v2+json" },
      method: 'GET',
    });
  }
}

export const formsService = new FormsService();
