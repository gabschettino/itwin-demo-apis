import express from "express";
import { roomsFootprintsRouter } from "./routes/roomsFootprints.js";
import { checkpointKeyRouter } from "./routes/checkpointKey.js";

import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import type { BentleyCloudRpcConfiguration as BentleyCloudRpcConfigurationType, HttpServerRequest, HttpServerResponse } from "@itwin/core-common";
import { ensureIModelHostStarted } from "./imodelHost.js";

// NOTE: @itwin/core-backend's ESM build currently includes extensionless relative imports
// (e.g. "../Foo"), which Node.js ESM does not resolve by default. Use the CJS build.
const require = createRequire(import.meta.url);

// IMPORTANT: Use CJS for @itwin/core-common in the backend to ensure we share singletons
// (e.g. RpcManager) with @itwin/core-backend's CJS rpc implementations.
const {
  BentleyCloudRpcConfiguration,
  BentleyCloudRpcManager,
  IModelReadRpcInterface,
  IModelTileRpcInterface,
  SnapshotIModelRpcInterface,
} = require("@itwin/core-common") as typeof import("@itwin/core-common");

const { initializeRpcBackend } = require("@itwin/core-backend/lib/cjs/RpcBackend.js") as {
  initializeRpcBackend: (enableOpenTelemetry?: boolean) => void;
};

const { IModelReadRpcImpl } = require("@itwin/core-backend/lib/cjs/rpc-impl/IModelReadRpcImpl.js") as {
  IModelReadRpcImpl: { register: () => void };
};

const { IModelTileRpcImpl } = require("@itwin/core-backend/lib/cjs/rpc-impl/IModelTileRpcImpl.js") as {
  IModelTileRpcImpl: { register: () => void };
};

const { SnapshotIModelRpcImpl } = require("@itwin/core-backend/lib/cjs/rpc-impl/SnapshotIModelRpcImpl.js") as {
  SnapshotIModelRpcImpl: { register: () => void };
};

let rpcInitialized = false;
let rpcConfig: BentleyCloudRpcConfigurationType | undefined;

async function ensureRpcInitialized() {
  if (rpcInitialized) return;

  await ensureIModelHostStarted();
  initializeRpcBackend();

  const interfaces = [IModelReadRpcInterface, IModelTileRpcInterface, SnapshotIModelRpcInterface];
  rpcConfig = BentleyCloudRpcManager.initializeImpl({
    info: { title: "itwin-demo-apis", version: "0.0.0" },
    pathPrefix: "/rpc",
  }, interfaces);

  IModelReadRpcImpl.register();
  IModelTileRpcImpl.register();
  SnapshotIModelRpcImpl.register();

  rpcInitialized = true;
}

function asHttpRequest(req: express.Request): HttpServerRequest {
  // Do NOT mutate express.Request. In Express 5, some properties (e.g. `path`) are getters-only.
  // WebAppRpcProtocol expects many IncomingMessage fields (rawHeaders, httpVersion, etc).
  // Express.Request is an IncomingMessage, but we also need to augment headers/body.
  const baseReq = req as unknown as HttpServerRequest;
  const rawBody = (req as any).body as unknown;
  const body: string | Buffer = typeof rawBody === "string" || Buffer.isBuffer(rawBody) ? (rawBody as any) : Buffer.alloc(0);

  // Node/Express lower-cases header names. The RPC protocol expects an activity/correlation id.
  // Some clients may omit it; generate one to avoid hard failures.
  const augmentedHeaders = { ...(req.headers as Record<string, string | string[] | undefined>) };
  const activityId = augmentedHeaders["x-correlation-id"] || randomUUID();
  if (!augmentedHeaders["x-correlation-id"]) augmentedHeaders["x-correlation-id"] = activityId;

  // Create a wrapper preserving all IncomingMessage fields via prototype chain.
  const wrapped = Object.create(baseReq) as HttpServerRequest;
  wrapped.headers = augmentedHeaders;
  wrapped.body = body;
  wrapped.method = req.method;
  wrapped.url = req.originalUrl ?? req.url;

  wrapped.header = (field: string): string | undefined => {
    const key = field.toLowerCase();
    const value = wrapped.headers[key];
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    return undefined;
  };

  wrapped.headersDistinct = Object.fromEntries(
    Object.entries(wrapped.headers).flatMap(([k, v]) => {
      if (typeof v === "string") return [[k, [v]]];
      if (Array.isArray(v)) return [[k, v.filter((x): x is string => typeof x === "string")]];
      return [];
    })
  );

  // Not part of Express' request, but used by the RPC protocol for request correlation.
  (wrapped as any).activityId = activityId;

  return wrapped;
}

function asHttpResponse(res: express.Response): HttpServerResponse {
  return res as unknown as HttpServerResponse;
}

export function createServer() {
  const app = express();

  const buildMarker = "rpc-snapshot-2026-01-29";
  const startedAt = new Date().toISOString();

  const rpcRoute = /^\/rpc\/.*/;

  // Allow the Vite dev server (and other local tools) to call /api endpoints.
  // In dev we typically hit these via the Vite proxy, but direct calls are useful for debugging.
  app.use("/api", (req, res, next) => {
    const origin = req.header("origin");
    if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    if (req.method === "OPTIONS") return res.status(204).end();
    next();
  });

  // RPC endpoints need the raw body (may be binary) and should not be parsed as JSON.
  app.use("/rpc", express.raw({ type: "*/*", limit: "50mb" }));

  app.use(express.json({ limit: "10mb" }));

  // Friendly landing + prevent confusing 404s if someone opens the backend port in a browser.
  app.get("/", (_req, res) => {
    res
      .status(200)
      .type("text/plain")
      .send(
        [
          "itwin-demo-apis backend",
          "",
          "This server only exposes API routes.",
          "Health: GET /api/health",
        ].join("\n")
      );
  });

  // Some Chrome/DevTools builds probe this endpoint on arbitrary origins.
  app.get("/.well-known/appspecific/com.chrome.devtools.json", (_req, res) => {
    res.status(204).end();
  });

  // RPC endpoints for core-frontend (SnapshotConnection, view loading, tiles, queries).
  app.options(rpcRoute, async (_req, res) => {
    res.set(BentleyCloudRpcConfiguration.accessControl);
    res.status(204).end();
  });

  app.get(rpcRoute, async (req, res) => {
    await ensureRpcInitialized();
    res.set(BentleyCloudRpcConfiguration.accessControl);
    await rpcConfig!.protocol.handleOperationGetRequest(asHttpRequest(req), asHttpResponse(res));
  });

  app.post(rpcRoute, async (req, res) => {
    await ensureRpcInitialized();
    res.set(BentleyCloudRpcConfiguration.accessControl);
    await rpcConfig!.protocol.handleOperationPostRequest(asHttpRequest(req), asHttpResponse(res));
  });

  app.get("/api/health", (_req, res) => res.json({ ok: true, build: buildMarker, pid: process.pid, startedAt }));
  app.use("/api/rooms", roomsFootprintsRouter);
  app.use("/api/imodels", checkpointKeyRouter);

  return app;
}
