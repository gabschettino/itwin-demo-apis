import { BaseAPIClient } from "../base/BaseAPIClient";

// Minimal service to list saved views for an iModel.
// API doc reference: GET /imodels/{iModelId}/savedviews (hypothetical – adjust if actual path differs)
// If Bentley's actual endpoint differs, update ENDPOINTS accordingly.

export interface SavedView {
  id: string;
  displayName?: string;
  description?: string;
  createdDateTime?: string;
  creatorId?: string;
  _links?: Record<string,{ href: string }>;
}

interface SavedViewsResponse { savedViews: SavedView[]; _links?: Record<string,{ href: string }> }

class SavedViewsService extends BaseAPIClient {
  /**
   * List saved views using iTwin + iModel query parameters (per API docs: /savedviews?iTwinId=...&iModelId=...)
   */
  async listSavedViews(iTwinId: string, iModelId: string, top = 50, skip = 0): Promise<SavedView[]> {
    if (!iTwinId || !iModelId) return [];
    try {
      const qp = new URLSearchParams();
      qp.set('iTwinId', iTwinId);
      qp.set('iModelId', iModelId);
      qp.set('$top', String(top));
      if (skip) qp.set('$skip', String(skip));
      const url = `/savedviews?${qp.toString()}`;
      const res = await this.fetch<SavedViewsResponse>(url, {
        headers: { Accept: 'application/vnd.bentley.itwin-platform.v1+json' }
      });
      return res?.savedViews || [];
    } catch (e) {
      console.warn('Failed to list saved views', e);
      return [];
    }
  }
}

export const savedViewsService = new SavedViewsService();
