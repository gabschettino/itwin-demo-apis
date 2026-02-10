import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { registerSnapshotKey } from "../imodelHost.js";
async function getLatestChangesetIndex(accessToken, iModelId) {
    const headers = {
        Authorization: accessToken.startsWith("Bearer ") ? accessToken : `Bearer ${accessToken}`,
        Accept: "application/vnd.bentley.itwin-platform.v2+json",
    };
    // Try to request the most recent changeset if ordering is supported.
    {
        const url = `https://api.bentley.com/imodels/${encodeURIComponent(iModelId)}/changesets?$top=1&$orderby=index%20desc`;
        const res = await fetch(url, { headers });
        if (res.ok) {
            const json = (await res.json());
            const idx = json.changesets?.[0]?.index;
            if (typeof idx === "number")
                return idx;
        }
    }
    // Fallback: fetch a batch and take max index.
    {
        const url = `https://api.bentley.com/imodels/${encodeURIComponent(iModelId)}/changesets?$top=2000`;
        const res = await fetch(url, { headers });
        if (!res.ok)
            throw new Error(`Failed to list changesets: ${res.status} ${res.statusText}`);
        const json = (await res.json());
        const indices = (json.changesets ?? []).map((c) => c.index).filter((i) => typeof i === "number");
        if (indices.length === 0)
            throw new Error("No changesets found for this iModel.");
        return Math.max(...indices);
    }
}
async function getChangesetIndexById(accessToken, iModelId, changesetId) {
    const headers = {
        Authorization: accessToken.startsWith("Bearer ") ? accessToken : `Bearer ${accessToken}`,
        Accept: "application/vnd.bentley.itwin-platform.v2+json",
    };
    const url = `https://api.bentley.com/imodels/${encodeURIComponent(iModelId)}/changesets/${encodeURIComponent(changesetId)}`;
    const res = await fetch(url, { headers });
    if (!res.ok)
        throw new Error(`Failed to resolve changeset '${changesetId}': ${res.status} ${res.statusText}`);
    const json = (await res.json());
    const index = json.changeset?.index;
    if (typeof index !== "number")
        throw new Error("Changeset response missing index.");
    return index;
}
async function getCheckpointDownloadUrl(accessToken, iModelId, changesetIndex) {
    const headers = {
        Authorization: accessToken.startsWith("Bearer ") ? accessToken : `Bearer ${accessToken}`,
        Accept: "application/vnd.bentley.itwin-platform.v2+json",
    };
    const url = `https://api.bentley.com/imodels/${encodeURIComponent(iModelId)}/changesets/${encodeURIComponent(String(changesetIndex))}/checkpoint`;
    const res = await fetch(url, { headers });
    if (!res.ok)
        throw new Error(`Failed to get checkpoint: ${res.status} ${res.statusText}`);
    const json = (await res.json());
    const href = json.checkpoint?._links?.download?.href;
    if (!href)
        throw new Error("Checkpoint download URL not found in response.");
    return href;
}
const checkpointCache = new Map();
async function downloadFile(url, destPath) {
    const res = await fetch(url);
    if (!res.ok || !res.body)
        throw new Error(`Checkpoint download failed: ${res.status} ${res.statusText}`);
    await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(destPath));
}
export async function ensureCheckpointFile(accessToken, iModelId, options = {}) {
    const changesetIndex = typeof options.changesetIndex === "number"
        ? options.changesetIndex
        : typeof options.changesetId === "string" && options.changesetId.length > 0
            ? await getChangesetIndexById(accessToken, iModelId, options.changesetId)
            : await getLatestChangesetIndex(accessToken, iModelId);
    const cacheKey = `${iModelId}:${changesetIndex}`;
    const fileKey = `${cacheKey}:${randomUUID()}`;
    const cached = checkpointCache.get(cacheKey);
    if (cached && fs.existsSync(cached.filePath)) {
        registerSnapshotKey(fileKey, cached.filePath);
        return { filePath: cached.filePath, fileKey, changesetIndex };
    }
    const href = await getCheckpointDownloadUrl(accessToken, iModelId, changesetIndex);
    const filePath = path.join(os.tmpdir(), `itwin-${iModelId}-cs${changesetIndex}.bim`);
    await downloadFile(href, filePath);
    checkpointCache.set(cacheKey, { filePath, createdAt: Date.now() });
    registerSnapshotKey(fileKey, filePath);
    return { filePath, fileKey, changesetIndex };
}
//# sourceMappingURL=checkpoint.js.map