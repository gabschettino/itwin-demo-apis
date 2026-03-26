import { useEffect, useMemo, useRef, useState } from "react";
import { Id64 } from "@itwin/core-bentley";
import { CheckpointConnection, IModelApp, ScreenViewport, StandardViewId, type IModelConnection } from "@itwin/core-frontend";

import { iModelApiService, iTwinApiService } from "../services/api";
import type { IModel, iTwin } from "../services/types";
import { authService } from "../services/AuthService";

import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ensureIModelAppStarted } from "../rooms/frontendIModel";
import { RoomsPanel } from "../RoomsPanel";
import { RoomsPlan2D, type FootprintsResponse, type OriginPoint } from "../rooms/RoomsPlan2D";
import { applyFootprintsOverlay, clearRoomsPlan, fetchFootprints } from "../rooms/wireup";
import type { RoomRow } from "../rooms/roomsQuery";
import { queryRooms } from "../rooms/roomsQuery";

export default function RoomsRoute() {
  const viewportDivRef = useRef<HTMLDivElement | null>(null);

  const [iTwins, setITwins] = useState<iTwin[]>([]);
  const [iModels, setIModels] = useState<IModel[]>([]);

  const [selectedITwinId, setSelectedITwinId] = useState<string>("");
  const [selectedIModelId, setSelectedIModelId] = useState<string>("");

  const [iTwinSearch, setITwinSearch] = useState("");
  const [iModelSearch, setIModelSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [iModelConn, setIModelConn] = useState<IModelConnection | null>(null);
  const [viewport, setViewport] = useState<ScreenViewport | null>(null);

  const [roomRows, setRoomRows] = useState<RoomRow[]>([]);
  const [footprints, setFootprints] = useState<FootprintsResponse>([]);

  const [debugFootprints, setDebugFootprints] = useState(false);
  const [autoScalePlan, setAutoScalePlan] = useState(true);
  const [manualRoomScale, setManualRoomScale] = useState("");
  const [footprintsDebugSummary, setFootprintsDebugSummary] = useState<string | null>(null);
  const [missingFootprintsDebug, setMissingFootprintsDebug] = useState<
    Array<{ id: string; reason?: string; elementClass?: string; primitives?: number; methods?: Record<string, number> }>
  >([]);

  const [selectedLevel, setSelectedLevel] = useState<string>("__all__");

  const availableLevels = useMemo(() => {
    const levels = new Set<string>();
    for (const r of roomRows) {
      const lvl = (r.level ?? "").trim();
      if (lvl) levels.add(lvl);
    }
    return Array.from(levels).sort((a, b) => a.localeCompare(b));
  }, [roomRows]);

  const filteredRoomRows = useMemo(() => {
    if (selectedLevel === "__all__") return roomRows;
    return roomRows.filter((r) => (r.level ?? "") === selectedLevel);
  }, [roomRows, selectedLevel]);

  const filteredRoomIdSet = useMemo(() => {
    return new Set(filteredRoomRows.map((r) => r.id));
  }, [filteredRoomRows]);

  const filteredFootprints = useMemo(() => {
    if (selectedLevel === "__all__") return footprints;
    return footprints.filter((fp) => filteredRoomIdSet.has(fp.id));
  }, [footprints, filteredRoomIdSet, selectedLevel]);

  const loopAreaAndCentroid = (loop: { x: number; y: number }[]) => {
    let area2 = 0;
    let cx = 0;
    let cy = 0;

    for (let i = 0; i < loop.length; i++) {
      const p0 = loop[i];
      const p1 = loop[(i + 1) % loop.length];
      const cross = p0.x * p1.y - p1.x * p0.y;
      area2 += cross;
      cx += (p0.x + p1.x) * cross;
      cy += (p0.y + p1.y) * cross;
    }

    if (Math.abs(area2) < 1e-9) {
      let sx = 0;
      let sy = 0;
      for (const p of loop) {
        sx += p.x;
        sy += p.y;
      }
      return { area: 0, cx: sx / loop.length, cy: sy / loop.length };
    }

    const area = area2 / 2;
    return { area, cx: cx / (3 * area2), cy: cy / (3 * area2) };
  };

  const median = (values: number[]): number | undefined => {
    if (values.length === 0) return undefined;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  };

  const planLabels = useMemo(() => {
    const labels = filteredRoomRows
      .map((r) => {
        const parts = [r.roomNumber, r.roomName].filter((x) => typeof x === "string" && x.trim().length > 0);
        const text = parts.join(" ").trim();
        if (!text) return undefined;
        
        // Find the footprint for this room to get the centroid
        const fp = filteredFootprints.find((f) => f.id === r.id) ?? footprints.find((f) => f.id === r.id);
        if (!fp || fp.loops.length === 0) return undefined;

        // Use the largest loop as the outer boundary for centroid
        let best = loopAreaAndCentroid(fp.loops[0]);
        for (let i = 1; i < fp.loops.length; i++) {
          const next = loopAreaAndCentroid(fp.loops[i]);
          if (Math.abs(next.area) > Math.abs(best.area)) best = next;
        }

        return { id: r.id, x: best.cx, y: best.cy, text };
      })
      .filter((x): x is { id: string; x: number; y: number; text: string } => !!x);
    return labels;
  }, [filteredRoomRows, filteredFootprints, footprints]);

  const planOrigins = useMemo<OriginPoint[]>(() => {
    return filteredRoomRows.map((r) => ({ id: r.id, x: r.origin.x, y: r.origin.y }));
  }, [filteredRoomRows]);

  const inferredRoomScale = useMemo(() => {
    const areaById = new Map<string, number>();
    for (const r of filteredRoomRows) {
      if (typeof r.area === "number" && Number.isFinite(r.area) && r.area > 0) areaById.set(r.id, r.area);
    }

    const scales: number[] = [];
    for (const fp of filteredFootprints) {
      const areaM2 = areaById.get(fp.id);
      if (!areaM2) continue;
      if (!fp.loops.length) continue;

      let best = loopAreaAndCentroid(fp.loops[0]);
      for (let i = 1; i < fp.loops.length; i++) {
        const next = loopAreaAndCentroid(fp.loops[i]);
        if (Math.abs(next.area) > Math.abs(best.area)) best = next;
      }

      const footprintArea = Math.abs(best.area);
      if (!Number.isFinite(footprintArea) || footprintArea <= 0) continue;
      const scale = Math.sqrt(areaM2 / footprintArea);
      if (Number.isFinite(scale) && scale > 0) scales.push(scale);
    }

    return median(scales);
  }, [filteredRoomRows, filteredFootprints]);

  const appliedRoomScale = useMemo(() => {
    if (!autoScalePlan) return undefined;
    const parsed = Number.parseFloat(manualRoomScale);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return inferredRoomScale;
  }, [autoScalePlan, manualRoomScale, inferredRoomScale]);

  const selectedITwin = useMemo(() => iTwins.find((t) => t.id === selectedITwinId), [iTwins, selectedITwinId]);

  const filteredITwins = useMemo(() => {
    const q = iTwinSearch.trim().toLowerCase();
    if (!q) return iTwins;
    return iTwins.filter((t) => {
      const haystack = [t.displayName, (t as unknown as { number?: string }).number, t.id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [iTwins, iTwinSearch]);

  const filteredIModels = useMemo(() => {
    const q = iModelSearch.trim().toLowerCase();
    if (!q) return iModels;
    return iModels.filter((m) => {
      const haystack = [m.displayName, m.id].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [iModels, iModelSearch]);

  useEffect(() => {
    setLoading(true);
    iTwinApiService
      .getMyiTwins()
      .then((twins) => setITwins(twins ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedITwinId) {
      setIModels([]);
      setSelectedIModelId("");
      setIModelSearch("");
      return;
    }

    setLoading(true);
    iModelApiService
      .getAllIModels(selectedITwinId, false, false)
      .then((models) => setIModels(models))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [selectedITwinId]);

  useEffect(() => {
    let cancelled = false;

    const pickViewId = async (conn: IModelConnection): Promise<string> => {
      const defaultViewId = await conn.views.queryDefaultViewId();
      if (Id64.isValid(defaultViewId)) return defaultViewId;

      const viewSpecs = await conn.views.getViewList({ from: "BisCore:ViewDefinition", limit: 200 });
      if (viewSpecs.length === 0) {
        throw new Error("This iModel does not define any views.");
      }

      const prefer = (needle: string) =>
        viewSpecs.find((v) => (v.class ?? "").toLowerCase().includes(needle.toLowerCase()));

      return (
        prefer("SpatialViewDefinition")?.id ??
        prefer("OrthographicViewDefinition")?.id ??
        prefer("DrawingViewDefinition")?.id ??
        prefer("SheetViewDefinition")?.id ??
        viewSpecs[0]!.id
      );
    };

    const cleanup = async () => {
      if (viewport) {
        IModelApp.viewManager.dropViewport(viewport, true);
        setViewport(null);
      }
      if (iModelConn) {
        await iModelConn.close();
        setIModelConn(null);
      }
    };

    if (!selectedITwinId || !selectedIModelId) {
      cleanup().catch(console.error);
      setSelectedLevel("__all__");
      return;
    }

    (async () => {
      try {
        setError(null);
        setLoading(true);
        await ensureIModelAppStarted();

        await cleanup();

        if (!viewportDivRef.current) throw new Error("Viewport div not ready");

        // Prefetch the checkpoint file on the backend so the RPC layer can synchronously attach it.
        const token = await authService.getAccessToken();
        if (!token) throw new Error("Not signed in.");

        const prefetchRes = await fetch("/api/imodels/checkpoint-key", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
          },
          body: JSON.stringify({ iModelId: selectedIModelId }),
        });

        if (!prefetchRes.ok) {
          const text = await prefetchRes.text();
          throw new Error(`Failed to prefetch checkpoint: ${prefetchRes.status} ${prefetchRes.statusText} ${text}`);
        }

        const conn = await CheckpointConnection.openRemote(selectedITwinId, selectedIModelId);

        const viewId = await pickViewId(conn);
        const viewState = await conn.views.load(viewId);

        if (viewState.is3d()) viewState.setStandardRotation(StandardViewId.Top);

        const vp = ScreenViewport.create(viewportDivRef.current, viewState);
        IModelApp.viewManager.addViewport(vp);
        IModelApp.viewManager.setSelectedView(vp);

        if (cancelled) {
          IModelApp.viewManager.dropViewport(vp, true);
          await conn.close();
          return;
        }

        setIModelConn(conn);
        setViewport(vp);

        // Reset level filter when switching iModels.
        setSelectedLevel("__all__");
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      cleanup().catch(console.error);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedITwinId, selectedIModelId]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!iModelConn || !selectedITwinId) {
        clearRoomsPlan();
        setRoomRows([]);
        setFootprints([]);
        return;
      }

      try {
        const iModelId = iModelConn.iModelId;
        if (!iModelId) throw new Error("Missing iModelId on connection.");

        const rows = await queryRooms(selectedITwinId, iModelId);
        if (cancelled) return;
        setRoomRows(rows);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [iModelConn, selectedITwinId]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!iModelConn || !selectedITwinId) return;
      try {
        const iModelId = iModelConn.iModelId;
        if (!iModelId) return;

        const elementIds = filteredRoomRows.map((r) => r.id);
        // Avoid hammering the backend if there are no rooms for this filter.
        if (elementIds.length === 0) {
          setFootprints([]);
          clearRoomsPlan();
          return;
        }

        const fps = await fetchFootprints(selectedITwinId, iModelId, elementIds, { debug: debugFootprints });
        if (cancelled) return;

        setFootprints(fps as unknown as FootprintsResponse);
        applyFootprintsOverlay(fps);

        if (debugFootprints) {
          const anyFps = fps as unknown as Array<{ id?: unknown; loops?: unknown; debug?: unknown }>;
          const total = anyFps.length;
          const withLoops = anyFps.filter((x) => Array.isArray(x.loops) && (x.loops as unknown[]).length > 0).length;
          const missing = total - withLoops;

          setFootprintsDebugSummary(`${withLoops}/${total} footprints have loops (${missing} missing)`);

          const missingItems = anyFps
            .filter((x) => Array.isArray(x.loops) && (x.loops as unknown[]).length === 0)
            .map((x) => {
              const id = String(x.id ?? "");
              const dbg = (x.debug ?? {}) as Record<string, unknown>;
              const reason = typeof dbg.reason === "string" ? dbg.reason : undefined;
              const elementClass = typeof dbg.elementClass === "string" ? dbg.elementClass : undefined;
              const primitives = typeof dbg.primitives === "number" ? dbg.primitives : undefined;
              const methods = (dbg.methods && typeof dbg.methods === "object") ? (dbg.methods as Record<string, number>) : undefined;
              return { id, reason, elementClass, primitives, methods };
            })
            .filter((x) => x.id.length > 0);

          setMissingFootprintsDebug(missingItems);

          const byReason = new Map<string, number>();
          for (const m of missingItems) {
            const k = m.reason ?? "(unknown)";
            byReason.set(k, (byReason.get(k) ?? 0) + 1);
          }

          console.groupCollapsed(`[rooms] footprints debug: ${withLoops}/${total} ok`);
          console.log("missing count by reason:", Object.fromEntries(byReason.entries()));
          console.log("missing details (first 25):", missingItems.slice(0, 25));
          console.log("full debug response:", fps);
          console.groupEnd();
        } else {
          setFootprintsDebugSummary(null);
          setMissingFootprintsDebug([]);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [iModelConn, selectedITwinId, selectedLevel, filteredRoomRows, debugFootprints]);

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Rooms (Revit)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Select iTwin</div>
              <Select
                value={selectedITwinId}
                onValueChange={(v) => setSelectedITwinId(v)}
                onOpenChange={(open) => {
                  if (open) setITwinSearch("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Loading..." : "Choose an iTwin"} />
                </SelectTrigger>
                <SelectContent>
                  <div className="sticky top-0 z-10 bg-popover p-1">
                    <Input
                      autoFocus
                      placeholder="Type to search…"
                      value={iTwinSearch}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      onChange={(e) => setITwinSearch(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    />
                    <div className="px-2 pt-1 text-xs text-muted-foreground">
                      {filteredITwins.length} of {iTwins.length}
                    </div>
                  </div>

                  {filteredITwins.length === 0 ? (
                    <div className="px-2 py-2 text-sm text-muted-foreground">No matches</div>
                  ) : (
                    filteredITwins.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.displayName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Select iModel</div>
              <Select
                value={selectedIModelId}
                onValueChange={(v) => setSelectedIModelId(v)}
                onOpenChange={(open) => {
                  if (open) setIModelSearch("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedITwinId ? "Choose an iModel" : "Pick an iTwin first"} />
                </SelectTrigger>
                <SelectContent>
                  <div className="sticky top-0 z-10 bg-popover p-1">
                    <Input
                      autoFocus
                      placeholder="Type to search…"
                      value={iModelSearch}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      onChange={(e) => setIModelSearch(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      disabled={!selectedITwinId}
                    />
                    <div className="px-2 pt-1 text-xs text-muted-foreground">
                      {filteredIModels.length} of {iModels.length}
                    </div>
                  </div>

                  {filteredIModels.length === 0 ? (
                    <div className="px-2 py-2 text-sm text-muted-foreground">
                      {selectedITwinId ? "No matches" : "Pick an iTwin first"}
                    </div>
                  ) : (
                    filteredIModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.displayName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Level</div>
              <Select
                value={selectedLevel}
                onValueChange={(v) => setSelectedLevel(v)}
                disabled={roomRows.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={roomRows.length === 0 ? "(select an iModel)" : "All levels"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All levels</SelectItem>
                  {availableLevels.map((lvl) => (
                    <SelectItem key={lvl} value={lvl}>
                      {lvl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Debug</div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={debugFootprints}
                  onChange={(e) => setDebugFootprints(e.target.checked)}
                  disabled={roomRows.length === 0}
                />
                Footprints debug
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoScalePlan}
                  onChange={(e) => setAutoScalePlan(e.target.checked)}
                  disabled={roomRows.length === 0}
                />
                Auto-scale 2D plan
              </label>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Room scale (e.g. 1.5)"
                  value={manualRoomScale}
                  onChange={(e) => setManualRoomScale(e.target.value)}
                  disabled={!autoScalePlan || roomRows.length === 0}
                />
              </div>
            </div>
          </div>

          {selectedITwin && (
            <div className="text-sm text-muted-foreground">Using iTwin: {selectedITwin.displayName}</div>
          )}

          {error && <div className="text-sm text-destructive">{error}</div>}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <Card className="min-h-[520px]">
              <CardHeader>
                <CardTitle className="text-base">3D Viewer</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  ref={viewportDivRef}
                  className="relative h-[440px] w-full overflow-hidden rounded-md"
                  style={{ background: "var(--background)" }}
                />
                <div className="text-xs text-muted-foreground mt-2">
                  Tip: make sure the backend is running (`npm run dev:backend`) so footprints can be decoded.
                </div>
              </CardContent>
            </Card>

            <Card className="min-h-[520px]">
              <CardHeader>
                <CardTitle className="text-base">2D Plan (Room Footprints)</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredFootprints.length > 0 ? (
                  <RoomsPlan2D
                    footprints={filteredFootprints}
                    labels={planLabels}
                    origins={planOrigins}
                    showOrigins={debugFootprints}
                    autoScaleToOrigins={autoScalePlan}
                    roomScale={appliedRoomScale}
                  />
                ) : (
                  <div className="text-sm text-muted-foreground">No footprints loaded yet.</div>
                )}

                {footprintsDebugSummary && (
                  <div className="text-xs text-muted-foreground mt-2">{footprintsDebugSummary}</div>
                )}

                {debugFootprints && inferredRoomScale && (
                  <div className="text-xs text-muted-foreground mt-1">inferred scale: {inferredRoomScale.toFixed(4)}</div>
                )}
                {debugFootprints && appliedRoomScale && (
                  <div className="text-xs text-muted-foreground">applied scale: {appliedRoomScale.toFixed(4)}</div>
                )}

                {debugFootprints && missingFootprintsDebug.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs font-medium">Missing footprints (debug)</div>
                    <div className="max-h-[180px] overflow-auto rounded border p-2 text-xs">
                      {missingFootprintsDebug.slice(0, 50).map((m) => (
                        <div key={m.id} className="py-1 border-b last:border-b-0">
                          <div className="font-mono">{m.id}</div>
                          <div className="text-muted-foreground">
                            {m.reason ?? "(no reason)"}
                            {typeof m.primitives === "number" ? ` • primitives=${m.primitives}` : ""}
                            {m.elementClass ? ` • ${m.elementClass}` : ""}
                          </div>
                          {m.methods && (
                            <div className="text-muted-foreground">methods: {JSON.stringify(m.methods)}</div>
                          )}
                        </div>
                      ))}
                      {missingFootprintsDebug.length > 50 && (
                        <div className="text-muted-foreground pt-2">Showing first 50 of {missingFootprintsDebug.length}</div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="min-h-[520px]">
              <CardHeader>
                <CardTitle className="text-base">Rooms Table</CardTitle>
              </CardHeader>
              <CardContent className="max-h-[440px] overflow-auto">
                {filteredRoomRows.length > 0 ? <RoomsPanel rows={filteredRoomRows} /> : null}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
