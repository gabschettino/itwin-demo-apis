import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";

import { FileNameResolver, IModelHost, V2CheckpointManager } from "@itwin/core-backend";

import { ensureCheckpointFile } from "./lib/checkpoint.js";

// core-backend hides the mock checkpoint hook behind an internal symbol.
const require = createRequire(import.meta.url);
const { _mockCheckpoint } = require("@itwin/core-backend/lib/cjs/internal/Symbols.js") as { _mockCheckpoint: symbol };

let iModelHostStarted = false;

const snapshotKeyToFilePath = new Map<string, string>();

class SnapshotKeyResolver extends FileNameResolver {
  public override tryResolveKey(fileKey: string): string | undefined {
    return snapshotKeyToFilePath.get(fileKey);
  }
}

export async function ensureIModelHostStarted() {
  if (iModelHostStarted) return;

  const cacheDir = path.join(os.tmpdir(), "itwin-demo-apis-imodel-cache");
  await IModelHost.startup({ cacheDir });

  // Allow CheckpointConnection.openRemote() (V2 checkpoints) without wiring up a real BackendHubAccess.
  // We satisfy the backend by downloading a checkpoint file via the REST API using the user's access token.
  const findCachedCheckpointFile = (iModelId: string, changesetIndex?: number, changesetId?: string): string | undefined => {
    const tmp = os.tmpdir();

    if (typeof changesetIndex === "number") {
      const byIndex = path.join(tmp, `itwin-${iModelId}-cs${changesetIndex}.bim`);
      if (fs.existsSync(byIndex)) return byIndex;
    }

    if (typeof changesetId === "string" && changesetId.length > 0) {
      const byId = path.join(tmp, `itwin-${iModelId}-csid-${changesetId}.bim`);
      if (fs.existsSync(byId)) return byId;
    }

    // Only allow a "best available" fallback when no specific changeset was requested.
    // If a changeset was requested and it's not cached yet, returning a different changeset
    // can cause subtle RPC/tile-tree mismatches (e.g., tile NotFound errors).
    if (typeof changesetIndex === "number" || (typeof changesetId === "string" && changesetId.length > 0)) {
      return undefined;
    }

    try {
      const prefix = `itwin-${iModelId}-cs`;
      const files = fs.readdirSync(tmp);
      let best: { index: number; file: string } | undefined;
      for (const f of files) {
        if (!f.startsWith(prefix) || !f.endsWith(".bim")) continue;
        const idxMatch = /-cs(\d+)\.bim$/.exec(f);
        const idx = idxMatch ? Number(idxMatch[1]) : NaN;
        if (!Number.isFinite(idx)) continue;
        if (!best || idx > best.index) best = { index: idx, file: path.join(tmp, f) };
      }
      return best?.file;
    } catch {
      return undefined;
    }
  };

  (V2CheckpointManager as any)[_mockCheckpoint] = {
    mockAttach: (checkpoint: any): string => {
      const accessToken = String(checkpoint?.accessToken ?? "");
      const iModelId = String(checkpoint?.iModelId ?? "");
      const changesetIndex = typeof checkpoint?.changeset?.index === "number" ? checkpoint.changeset.index : undefined;
      const changesetId = typeof checkpoint?.changeset?.id === "string" ? checkpoint.changeset.id : undefined;
      if (!accessToken || !iModelId) throw new Error("Missing accessToken/iModelId for checkpoint mock");

      // NOTE: this returns a Promise, but core-backend expects mockAttach to be sync.
      // We rely on the file being present in cache (or already downloaded) for the common path.
      // If it's not present yet, the first request may fail and will succeed on retry.
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      ensureCheckpointFile(accessToken, iModelId, { changesetIndex, changesetId }).catch(() => undefined);

      return (
        findCachedCheckpointFile(iModelId, changesetIndex, changesetId) ??
        path.join(os.tmpdir(), `itwin-${iModelId}-cs${typeof changesetIndex === "number" ? changesetIndex : 0}.bim`)
      );
    },
    mockDownload: (request: any) => {
      const checkpoint = request?.checkpoint;
      const accessToken = String(checkpoint?.accessToken ?? "");
      const iModelId = String(checkpoint?.iModelId ?? "");
      const changesetIndex = typeof checkpoint?.changeset?.index === "number" ? checkpoint.changeset.index : undefined;
      const changesetId = typeof checkpoint?.changeset?.id === "string" ? checkpoint.changeset.id : undefined;
      const localFile = String(request?.localFile ?? "");
      if (!accessToken || !iModelId || !localFile) throw new Error("Invalid checkpoint mock download request");

      // Best-effort ensure the cached checkpoint exists, then copy to requested location.
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      ensureCheckpointFile(accessToken, iModelId, { changesetIndex, changesetId }).catch(() => undefined);

      const cachedPath = findCachedCheckpointFile(iModelId, changesetIndex, changesetId);
      if (!cachedPath) throw new Error("Checkpoint file not available yet");
      fs.mkdirSync(path.dirname(localFile), { recursive: true });
      fs.copyFileSync(cachedPath, localFile);
    },
  };

  IModelHost.snapshotFileNameResolver = new SnapshotKeyResolver();
  iModelHostStarted = true;
}

export function registerSnapshotKey(fileKey: string, filePath: string) {
  snapshotKeyToFilePath.set(fileKey, filePath);
}
