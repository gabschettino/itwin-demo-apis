# Minimal iTwin.js (2026-style) browser viewport snippet

This is a minimal, browser-first iTwin.js snippet that:

- starts `IModelApp`
- opens a read-only iModel from iTwin Hub using `iTwinId + iModelId` via `CheckpointConnection.openRemote`
- creates a `ScreenViewport` in a `div`
- loads the default view
- applies `StandardViewId.Top`

It assumes you already have auth via `BrowserAuthorizationClient` (your repo’s `AuthService` wraps it).

## Install deps

This repo currently doesn’t include the iTwin.js frontend packages. To compile/run the snippet in-app you’d need (at minimum):

```bash
npm i @itwin/core-frontend @itwin/core-common
```

(You may also need additional transitive/peer deps depending on your bundler and iTwin.js version; start with the above and let TypeScript/Vite tell you what else is missing.)

## React component

```tsx
import { useEffect, useRef, useState } from "react";

import {
  CheckpointConnection,
  IModelApp,
  ScreenViewport,
  StandardViewId,
  type IModelConnection,
  type ScreenViewport as ScreenViewportType,
} from "@itwin/core-frontend";
import { IModelVersion } from "@itwin/core-common";

import { authService } from "../services/AuthService";

export function MinimalIModelViewport(props: { iTwinId: string; iModelId: string }) {
  const { iTwinId, iModelId } = props;

  const hostRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;

    let vp: ScreenViewportType | undefined;
    let imodel: IModelConnection | undefined;

    const run = async () => {
      try {
        setError(null);

        // 1) Provide auth tokens to iTwin.js.
        const authorizationClient = authService.getClient();

        // 2) Start up iTwin.js frontend (only once).
        if (!IModelApp.initialized) {
          await IModelApp.startup({ authorizationClient });
        } else {
          // If your app can change users, keep this updated.
          IModelApp.authorizationClient = authorizationClient;
        }

        if (!hostRef.current) return;

        // 3) Open a read-only connection to the iModel hosted in iTwin Hub.
        imodel = await CheckpointConnection.openRemote(iTwinId, iModelId, IModelVersion.latest());

        // 4) Load the default view (spatial/2d depending on the iModel).
        const view = await imodel.views.loadDefault();

        // 5) Rotate the view to a standard orientation.
        view.setStandardRotation(StandardViewId.Top);

        // 6) Create and register the viewport.
        vp = ScreenViewport.create(hostRef.current, view);
        IModelApp.viewManager.addViewport(vp);

        // Optional: force a draw.
        vp.invalidateScene();
      } catch (e) {
        if (!disposed) {
          const message = e instanceof Error ? e.message : String(e);
          setError(message);
        }
      }
    };

    void run();

    return () => {
      disposed = true;

      if (vp) {
        IModelApp.viewManager.dropViewport(vp);
        vp.dispose();
        vp = undefined;
      }

      void imodel?.close();
      imodel = undefined;

      // Note: Don’t call IModelApp.shutdown() here unless you truly want to tear down
      // iTwin.js for the whole SPA.
    };
  }, [iTwinId, iModelId]);

  return (
    <div style={{ height: "60vh", width: "100%", border: "1px solid #333" }}>
      {error ? (
        <div style={{ padding: 12, color: "crimson" }}>Viewport error: {error}</div>
      ) : null}
      <div ref={hostRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
```

## Required iTwin.js types/classes used

- `@itwin/core-frontend`
  - `IModelApp`
  - `CheckpointConnection`
  - `IModelConnection`
  - `ScreenViewport`
  - `StandardViewId`
- `@itwin/core-common`
  - `IModelVersion`

## RPC note (why it’s not shown above)

Modern iTwin.js browser viewing flows typically don’t require you to manually set the deprecated `IModelAppOptions.rpcInterfaces`.

If your app architecture requires a dedicated backend for RPC (e.g. you’re using an iTwin.js backend service), you’d initialize RPC explicitly (e.g. via `BentleyCloudRpcManager.initializeClient(...)`) and ensure your backend registers the matching RPC interfaces. That setup is app-specific, so it’s intentionally omitted from this minimal “open hub checkpoint + render viewport” snippet.
