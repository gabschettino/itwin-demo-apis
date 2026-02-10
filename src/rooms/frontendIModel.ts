import { IModelApp, type FrontendHubAccess } from "@itwin/core-frontend";
import { API_CONFIG } from "../services/config/api.config";
import type { ChangesetsResponse, NamedVersionsResponse } from "../services/types/imodel.types";
import { BentleyCloudRpcManager, IModelReadRpcInterface, IModelTileRpcInterface, SnapshotIModelRpcInterface, type AuthorizationClient } from "@itwin/core-common";
import { authService } from "../services/AuthService";

let startupPromise: Promise<void> | undefined;

export async function ensureIModelAppStarted() {
  if (startupPromise) return startupPromise;

  startupPromise = (async () => {
    // Required for SnapshotConnection + view loading + tile requests in a web app.
    // IMPORTANT: Use an absolute prefix so RPC paths never become relative (e.g. `rpc/...`),
    // which would bypass the Vite `/rpc` proxy under nested routes like `/rooms`.
    const rpcBaseUrl = new URL("/rpc", window.location.origin).toString();
    BentleyCloudRpcManager.initializeClient(
      { info: { title: "itwin-demo-apis", version: "0.0.0" }, uriPrefix: rpcBaseUrl },
      [IModelReadRpcInterface, IModelTileRpcInterface, SnapshotIModelRpcInterface]
    );

    const hubAccess: FrontendHubAccess = {
      getLatestChangeset: async ({ accessToken, iModelId }) => {
        const headers: Record<string, string> = {
          Authorization: String(accessToken).startsWith("Bearer ") ? String(accessToken) : `Bearer ${String(accessToken)}`,
          Accept: "application/vnd.bentley.itwin-platform.v2+json",
        };

        // Prefer server-side sorting, with a client-side fallback.
        {
          const url = `${API_CONFIG.BASE_URL}/imodels/${encodeURIComponent(iModelId)}/changesets?$top=1&$orderby=index%20desc`;
          const res = await fetch(url, { headers });
          if (res.ok) {
            const json = (await res.json()) as Partial<ChangesetsResponse>;
            const cs = json.changesets?.[0];
            if (cs && typeof cs.index === "number" && typeof cs.id === "string") {
              return { index: cs.index, id: cs.id };
            }
          }
        }

        // Fallback: fetch a batch and choose max index.
        const url = `${API_CONFIG.BASE_URL}/imodels/${encodeURIComponent(iModelId)}/changesets?$top=2000`;
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`Failed to list changesets: ${res.status} ${res.statusText}`);
        const json = (await res.json()) as Partial<ChangesetsResponse>;
        const changesets = json.changesets ?? [];

        let latest: { id: string; index: number } | undefined;
        for (const c of changesets as unknown as Array<Record<string, unknown>>) {
          const id = c.id;
          const index = c.index;
          if (typeof id !== "string" || typeof index !== "number") continue;
          if (!latest || index > latest.index) latest = { id, index };
        }

        if (!latest) throw new Error("No changesets found for this iModel.");
        return { index: latest.index, id: latest.id };
      },

      getChangesetFromVersion: async ({ accessToken, iModelId, version }) => {
        if (version.isLatest) return hubAccess.getLatestChangeset({ accessToken, iModelId });
        if (version.isFirst) return { index: 0, id: "" };

        const asOfId = version.getAsOfChangeSet();
        if (typeof asOfId === "string") {
          if (asOfId.length === 0) return { index: 0, id: "" };

          const headers: Record<string, string> = {
            Authorization: String(accessToken).startsWith("Bearer ") ? String(accessToken) : `Bearer ${String(accessToken)}`,
            Accept: "application/vnd.bentley.itwin-platform.v2+json",
          };

          const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.IMODELS.GET_CHANGESET_DETAILS(iModelId, asOfId)}`;
          const res = await fetch(url, { headers });
          if (!res.ok) throw new Error(`Failed to resolve changeset '${asOfId}': ${res.status} ${res.statusText}`);
          const json = (await res.json()) as { changeset?: { id?: string; index?: number } };
          const id = json.changeset?.id;
          const index = json.changeset?.index;
          if (typeof id !== "string" || typeof index !== "number") throw new Error("Changeset response missing id/index.");
          return { index, id };
        }

        const name = version.getName();
        if (name) return hubAccess.getChangesetFromNamedVersion({ accessToken, iModelId, versionName: name });

        // Last resort.
        return hubAccess.getLatestChangeset({ accessToken, iModelId });
      },

      getChangesetFromNamedVersion: async ({ accessToken, iModelId, versionName }) => {
        const headers: Record<string, string> = {
          Authorization: String(accessToken).startsWith("Bearer ") ? String(accessToken) : `Bearer ${String(accessToken)}`,
          Accept: "application/vnd.bentley.itwin-platform.v2+json",
        };

        const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.IMODELS.GET_NAMED_VERSIONS(iModelId, 2000)}`;
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`Failed to list named versions: ${res.status} ${res.statusText}`);
        const json = (await res.json()) as Partial<NamedVersionsResponse>;
        const list = json.namedVersions ?? [];
        if (list.length === 0) throw new Error("No named versions found for this iModel.");

        const picked = versionName
          ? list.find((nv) => nv.displayName?.toLowerCase() === versionName.toLowerCase())
          : list[0];

        if (!picked || typeof picked.changesetId !== "string" || typeof picked.changesetIndex !== "number") {
          throw new Error(versionName ? `Named version not found: ${versionName}` : "Named version response missing changeset info.");
        }

        return { index: picked.changesetIndex, id: picked.changesetId };
      },
    };

    // BrowserAuthorizationClient implements the expected authorization client interface.
    await IModelApp.startup({
      authorizationClient: authService.getClient() as unknown as AuthorizationClient,
      hubAccess,
      publicPath: (import.meta.env.BASE_URL.endsWith("/") ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`),
    });
  })();

  return startupPromise;
}
