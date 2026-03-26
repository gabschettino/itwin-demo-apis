import { BaseAPIClient } from "../base/BaseAPIClient";
import type { RealityDataListParams, RealityDataListResponse, CreateRealityDataRequest, RealityDataResponse, RealityDataSummary, RealityDataWriteAccessResponse } from "../types";

export class RealityManagementService extends BaseAPIClient {
  public async listRealityData(params: RealityDataListParams = {}): Promise<RealityDataListResponse> {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && `${value}`.length > 0) {
        searchParams.append(key, `${value}`);
      }
    }
    const qs = searchParams.toString();
    const endpoint = `/reality-management/reality-data${qs ? `?${qs}` : ''}`;

    return this.fetch<RealityDataListResponse>(endpoint, {
      headers: {
        // Prefer representation for richer payload if available; API says v1 Accept recommended
        Prefer: "return=representation",
        Accept: "application/vnd.bentley.itwin-platform.v1+json",
      },
    });
  }

  public async createRealityData(req: CreateRealityDataRequest): Promise<RealityDataSummary | null> {
    try {
      const endpoint = `/reality-management/reality-data`;
      const body = {
        iTwinId: req.iTwinId,
        displayName: req.displayName,
        type: req.type,
        classification: req.classification ?? 'Undefined',
        ...(req.description ? { description: req.description } : {})
      };

      const res = await this.fetch<RealityDataResponse>(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/vnd.bentley.itwin-platform.v1+json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify(body)
      });
      return res.realityData;
    } catch (e) {
      console.error('Failed to create reality data', e);
      return null;
    }
  }

  public async getRealityDataWriteAccess(iTwinId: string, realityDataId: string): Promise<RealityDataWriteAccessResponse | null> {
    try {
      // Primary documented endpoint: /writeaccess?iTwinId=...
      const writeAccessEndpoint = `/reality-management/reality-data/${encodeURIComponent(realityDataId)}/writeaccess?iTwinId=${encodeURIComponent(iTwinId)}`;
      let res: { _links?: { containerUrl?: { href?: string } }; containerUrl?: string; url?: string; [key: string]: unknown };
      try {
        res = await this.fetch<{ _links?: { containerUrl?: { href?: string } }; containerUrl?: string; url?: string; [key: string]: unknown }>(writeAccessEndpoint, {
          headers: { Accept: 'application/vnd.bentley.itwin-platform.v1+json' }
        });
      } catch (primaryErr: unknown) {
        // Fallback (legacy guess) if primary 404s: /container?access=write
        if ((primaryErr as { status?: number })?.status === 404) {
          const legacy = `/reality-management/reality-data/${encodeURIComponent(realityDataId)}/container?access=write&iTwinId=${encodeURIComponent(iTwinId)}`;
          try {
            res = await this.fetch<{ _links?: { containerUrl?: { href?: string } }; containerUrl?: string; url?: string; [key: string]: unknown }>(legacy, { headers: { Accept: 'application/vnd.bentley.itwin-platform.v1+json' } });
          } catch (_legacyErr) {
            throw primaryErr; // rethrow original for clearer messaging
          }
        } else {
          throw primaryErr;
        }
      }

      const containerUrl = res?._links?.containerUrl?.href || res?.containerUrl || res?.url || '';
      const normalized: RealityDataWriteAccessResponse = { containerUrl, ...res };
      if (!containerUrl) {
        console.warn('Write access response did not include a recognizable container URL field', res);
      }
      return normalized;
    } catch (e) {
      console.error('Failed to get write access for reality data container', e);
      return null;
    }
  }

  public async deleteRealityData(realityDataId: string): Promise<boolean> {
    try {
      const endpoint = `/reality-management/reality-data/${encodeURIComponent(realityDataId)}`;
      await this.fetch<null>(endpoint, { method: 'DELETE' });
      return true;
    } catch (e) {
      console.error('Failed to delete reality data', e);
      return false;
    }
  }
}
