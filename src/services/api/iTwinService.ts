import { BaseAPIClient } from "../base/BaseAPIClient";
import { API_CONFIG } from "../config/api.config";
import type { IModel, iTwin, iTwinsResponse } from "../types";

export class iTwinService extends BaseAPIClient {
  // Simple in-memory cache and in-flight de-duplication across the app lifetime
  private static cache: { data: iTwin[] | null; expiresAt: number } | null =
    null;
  private static inflight: Promise<iTwin[] | null> | null = null;
  config: typeof API_CONFIG = API_CONFIG;

  private invalidateCache() {
    iTwinService.cache = null;
    iTwinService.inflight = null;
  }

  /**
   * Create a new iTwin
   * API: POST /itwins
   */
  public async createITwin(payload: {
    displayName: string;
    number?: string;
    type?: string | null;
    class?: string;
    subClass?: string;
    geographicLocation?: string;
    latitude?: number;
    longitude?: number;
    ianaTimeZone?: string;
    dataCenterLocation?: string;
    status?: string;
  }): Promise<iTwin> {
    // Apply defaults per API requirements and provided guidance
    const body = {
      class: payload.class ?? "Endeavor",
      subClass: payload.subClass ?? "Project",
      status: payload.status ?? "Active",
      dataCenterLocation: payload.dataCenterLocation ?? "East US",
      displayName: payload.displayName,
      ...(payload.number ? { number: payload.number } : {}),
      ...(payload.type ? { type: payload.type } : {}),
      ...(payload.geographicLocation ? { geographicLocation: payload.geographicLocation } : {}),
      ...(typeof payload.latitude === 'number' ? { latitude: payload.latitude } : {}),
      ...(typeof payload.longitude === 'number' ? { longitude: payload.longitude } : {}),
      ...(payload.ianaTimeZone ? { ianaTimeZone: payload.ianaTimeZone } : {}),
    };
    const response = await this.fetch<{ iTwin: iTwin } | iTwin>(
      this.config.ENDPOINTS.ITWINS,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    // Invalidate cache so subsequent list fetch reflects the creation
    this.invalidateCache();
    if ("iTwin" in (response as object)) {
      return (response as { iTwin: iTwin }).iTwin;
    }
    return response as iTwin;
  }

  /**
   * Update an existing iTwin
   * API: PATCH /itwins/{iTwinId}
   */
  public async updateITwin(
    iTwinId: string,
    payload: Partial<{
      displayName: string;
      number: string;
      type: string | null;
      class: string;
      subClass: string;
      status: string;
      dataCenterLocation: string;
      geographicLocation: string;
      latitude: number;
      longitude: number;
      ianaTimeZone: string;
    }>
  ): Promise<iTwin> {
    const response = await this.fetch<{ iTwin: iTwin } | iTwin>(
      `${this.config.ENDPOINTS.ITWINS}/${encodeURIComponent(iTwinId)}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );
    // Invalidate cache so list re-fetch reflects updates
    this.invalidateCache();
    if ("iTwin" in (response as object)) {
      return (response as { iTwin: iTwin }).iTwin;
    }
    return response as iTwin;
  }

  async updateIModel(
    iModelId: string,
    data: { displayName?: string; description?: string }
  ): Promise<IModel> {
    const response = await this.fetch<{ iModel: IModel }>(
      this.config.ENDPOINTS.IMODELS.GET_IMODEL(iModelId),
      {
        method: "PATCH",
        body: JSON.stringify(data),
      }
    );
    return response.iModel;
  }

  public async getMyiTwins(): Promise<iTwin[] | null> {
    try {
      const now = Date.now();
      const ttlMs = 60_000; // 1 minute cache window

      if (iTwinService.cache && iTwinService.cache.expiresAt > now) {
        return iTwinService.cache.data;
      }

      if (iTwinService.inflight) {
        return iTwinService.inflight;
      }

      let allTwins: iTwin[] = [];
      let nextUrl:
        | string
        | null = `${API_CONFIG.ENDPOINTS.ITWINS}?includeInactive=true`;

      while (nextUrl) {
        const data: iTwinsResponse = await this.fetch(nextUrl, {
          headers: {
            Prefer: "return=representation",
          },
        });
        if (Array.isArray(data.iTwins)) {
          allTwins = allTwins.concat(data.iTwins);
        }
        nextUrl = data._links?.next?.href
          ? data._links.next.href.replace(API_CONFIG.BASE_URL, "")
          : null;
      }

      iTwinService.cache = { data: allTwins, expiresAt: Date.now() + ttlMs };
      return allTwins;
    } catch (error) {
      console.error("Error fetching iTwins:", error);
      return null;
    }
  }
}
