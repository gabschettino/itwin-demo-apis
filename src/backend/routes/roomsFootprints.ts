import { Router } from "express";
import type { Request } from "express";

import { SnapshotDb, type IModelDb } from "@itwin/core-backend";
import {
  GeometryStreamIterator,
  type ElementLoadProps,
  type GeometryPartProps,
  type GeometryStreamProps,
  type GeometricElement2dProps,
  type GeometricElement3dProps,
} from "@itwin/core-common";
import {
  CurveCollection,
  LineString3d,
  Loop,
  Path,
  Point2d,
  Point3d,
  PolyfaceBuilder,
  PolyfaceQuery,
  StrokeOptions,
  Transform,
  Vector3d,
  type GeometryQuery,
  type IndexedPolyface,
} from "@itwin/core-geometry";

import { ensureIModelHostStarted } from "../imodelHost.js";
import { ensureCheckpointFile } from "../lib/checkpoint.js";

function getBearerToken(req: Request): string {
  const header = req.header("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) throw new Error("Missing Authorization: Bearer <token>");
  return match[1];
}

type ChangesetsResponse = { changesets?: Array<{ id?: string; index?: number }> };

async function getLatestChangeset(accessToken: string, iModelId: string): Promise<{ id: string; index: number }> {
  const headers: Record<string, string> = {
    Authorization: accessToken.startsWith("Bearer ") ? accessToken : `Bearer ${accessToken}`,
    Accept: "application/vnd.bentley.itwin-platform.v2+json",
  };

  {
    const url = `https://api.bentley.com/imodels/${encodeURIComponent(iModelId)}/changesets?$top=1&$orderby=index%20desc`;
    const res = await fetch(url, { headers });
    if (res.ok) {
      const json = (await res.json()) as ChangesetsResponse;
      const cs = json.changesets?.[0];
      if (cs && typeof cs.id === "string" && typeof cs.index === "number") return { id: cs.id, index: cs.index };
    }
  }

  {
    const url = `https://api.bentley.com/imodels/${encodeURIComponent(iModelId)}/changesets?$top=2000`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Failed to list changesets: ${res.status} ${res.statusText}`);
    const json = (await res.json()) as ChangesetsResponse;
    const changesets = json.changesets ?? [];

    let best: { id: string; index: number } | undefined;
    for (const c of changesets) {
      if (typeof c.id !== "string" || typeof c.index !== "number") continue;
      if (!best || c.index > best.index) best = { id: c.id, index: c.index };
    }
    if (!best) throw new Error("No changesets found for this iModel.");
    return best;
  }
}

type QueryResponse = {
  id?: string;
  state?: string;
  rows?: unknown[][];
  meta?: Array<{ name?: string; accessString?: string }>;
};

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

// Revit commonly stores area in ft². Convert to m².
const FT2_TO_M2 = 0.09290304;

function asAreaM2(value: unknown): number | undefined {
  const n = asNumber(value);
  if (n === undefined) return undefined;
  return n * FT2_TO_M2;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function runIModelQuery(
  accessToken: string,
  iTwinId: string,
  iModelId: string,
  ecsql: string
): Promise<{ rows: unknown[][]; meta: Array<{ name: string; accessString?: string }> }> {
  const { id: changesetId } = await getLatestChangeset(accessToken, iModelId);

  const base = `https://api.bentley.com/imodel-query/itwins/${encodeURIComponent(iTwinId)}/imodels/${encodeURIComponent(iModelId)}/changesets/${encodeURIComponent(changesetId)}`;
  const url = `${base}/queries`;

  const headers: Record<string, string> = {
    Authorization: accessToken.startsWith("Bearer ") ? accessToken : `Bearer ${accessToken}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const body = {
    query: ecsql,
    args: {},
    includeMetadata: true,
    limit: 10000,
    skip: 0,
  };

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as QueryResponse;

  if (res.status === 200) {
    const rows = Array.isArray(json.rows) ? json.rows : [];
    const meta = (json.meta ?? [])
      .map((m) => ({ name: String(m.name ?? m.accessString ?? ""), accessString: m.accessString }))
      .filter((m) => m.name.length > 0);
    return { rows, meta };
  }

  if (res.status === 201 && typeof json.id === "string") {
    const queryId = json.id;
    const pollUrl = `${base}/queries/${encodeURIComponent(queryId)}`;

    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      await sleep(300);
      const pollRes = await fetch(pollUrl, { headers: { Authorization: headers.Authorization, Accept: headers.Accept } });
      const pollJson = (await pollRes.json().catch(() => ({}))) as QueryResponse;
      const state = String(pollJson.state ?? "");

      if (state.toLowerCase() === "completed") {
        const rows = Array.isArray(pollJson.rows) ? pollJson.rows : [];
        const meta = (pollJson.meta ?? [])
          .map((m) => ({ name: String(m.name ?? m.accessString ?? ""), accessString: m.accessString }))
          .filter((m) => m.name.length > 0);
        return { rows, meta };
      }

      if (state.toLowerCase() === "failed") {
        throw new Error("Query failed in iModel Query API.");
      }
    }

    throw new Error("Timed out waiting for iModel Query API results.");
  }

  const errMsg = (json as { error?: { message?: unknown } })?.error?.message;
  const message = typeof errMsg === "string" ? errMsg : undefined;
  throw new Error(typeof message === "string" ? message : `iModel Query API failed: ${res.status} ${res.statusText}`);
}

type RoomRow = {
  id: string;
  roomNumber?: string;
  roomName?: string;
  level?: string;
  area?: number;
  origin: { x: number; y: number; z: number };
  yaw?: number;
  pitch?: number;
  roll?: number;
};

function normalizeOrigin(origin: unknown): { x: number; y: number; z: number } {
  if (!origin) return { x: 0, y: 0, z: 0 };
  if (typeof origin === "string") {
    try {
      return normalizeOrigin(JSON.parse(origin));
    } catch {
      return { x: 0, y: 0, z: 0 };
    }
  }
  if (typeof origin === "object") {
    const o = origin as { x?: unknown; y?: unknown; z?: unknown };
    return { x: typeof o.x === "number" ? o.x : 0, y: typeof o.y === "number" ? o.y : 0, z: typeof o.z === "number" ? o.z : 0 };
  }
  return { x: 0, y: 0, z: 0 };
}

type Point2 = { x: number; y: number };

type FootprintDebug = {
  elementId: string;
  elementClass?: string;
  reason?: string;
  primitives: number;
  loops: number;
  primitiveTypes: Record<string, number>;
  geometryTypes: Record<string, number>;
  transforms: { withLocalToWorld: number; withoutLocalToWorld: number };
  methods: Record<string, number>;
  zMin?: number;
  zMax?: number;
  polyface?: {
    builds: number;
    facetsTotal: number;
    facetsMax: number;
    zMin?: number;
    zMax?: number;
  };
  usedFallbackBoundary?: boolean;
};

type PolyfaceAgg = {
  builds: number;
  facetsTotal: number;
  facetsMax: number;
  zMin?: number;
  zMax?: number;
};

function inc(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1;
}

function mergeZ(debug: { zMin?: number; zMax?: number }, zMin?: number, zMax?: number) {
  if (typeof zMin === "number") debug.zMin = typeof debug.zMin === "number" ? Math.min(debug.zMin, zMin) : zMin;
  if (typeof zMax === "number") debug.zMax = typeof debug.zMax === "number" ? Math.max(debug.zMax, zMax) : zMax;
}

function polyfaceFacetAndZStats(pf: IndexedPolyface): { facets: number; zMin?: number; zMax?: number } {
  const visitor = pf.createVisitor();
  let facets = 0;
  let zMin = Infinity;
  let zMax = -Infinity;

  for (visitor.reset(); visitor.moveToNextFacet(); ) {
    facets += 1;
    const pts3d = visitor.point;
    const n = pts3d.length;
    for (let i = 0; i < n; i++) {
      const z = pts3d.getZAtUncheckedPointIndex(i);
      if (z < zMin) zMin = z;
      if (z > zMax) zMax = z;
    }
  }

  return {
    facets,
    zMin: Number.isFinite(zMin) ? zMin : undefined,
    zMax: Number.isFinite(zMax) ? zMax : undefined,
  };
}

function pointKey(p: Point2d, precision = 1e6): string {
  const x = Math.round(p.x * precision) / precision;
  const y = Math.round(p.y * precision) / precision;
  return `${x},${y}`;
}

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function loopAreaAbsXY(loop: Point2d[]): number {
  if (loop.length < 3) return 0;
  let area2 = 0;
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i]!;
    const b = loop[(i + 1) % loop.length]!;
    area2 += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area2) * 0.5;
}

function closeLoopIfNeeded(loop: Point2d[]): Point2d[] {
  if (loop.length < 2) return loop;
  const a = loop[0]!;
  const b = loop[loop.length - 1]!;
  if (a.isAlmostEqual(b)) return loop;
  return [...loop, Point2d.create(a.x, a.y)];
}

function polyfaceBoundaryLoopsXY(pf: IndexedPolyface): Point2d[][] {
  const loops: Point2d[][] = [];

  PolyfaceQuery.announceBoundaryChainsAsLineString3d(pf, (ls) => {
    const ring: Point2d[] = [];
    for (const p of ls.points) ring.push(Point2d.create(p.x, p.y));
    const closed = closeLoopIfNeeded(ring);
    if (closed.length >= 4) loops.push(closed);
  });

  loops.sort((a, b) => loopAreaAbsXY(b) - loopAreaAbsXY(a));
  return loops;
}

function polyfaceTopBoundaryLoops(pf: IndexedPolyface): Point2d[][] {
  const zUp = Vector3d.unitZ();
  const visitor = pf.createVisitor();

  let minZ = Infinity;
  let maxZ = -Infinity;
  for (visitor.reset(); visitor.moveToNextFacet(); ) {
    const pts3d = visitor.point;
    const n = pts3d.length;
    for (let i = 0; i < n; i++) {
      const z = pts3d.getZAtUncheckedPointIndex(i);
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
  }

  visitor.reset();
  const zRange = Number.isFinite(maxZ - minZ) ? (maxZ - minZ) : 0;
  const zTol = Math.max(1e-4, 0.05 * zRange);

  const vertices = new Map<string, Point2d>();
  const edgeCounts = new Map<string, { a: string; b: string; count: number }>();

  for (visitor.reset(); visitor.moveToNextFacet(); ) {
    const pts3d = visitor.point;
    const n = pts3d.length;
    if (n < 3) continue;

    const p0 = Point3d.create(
      pts3d.getXAtUncheckedPointIndex(0),
      pts3d.getYAtUncheckedPointIndex(0),
      pts3d.getZAtUncheckedPointIndex(0)
    );
    const p1 = Point3d.create(
      pts3d.getXAtUncheckedPointIndex(1),
      pts3d.getYAtUncheckedPointIndex(1),
      pts3d.getZAtUncheckedPointIndex(1)
    );
    const p2 = Point3d.create(
      pts3d.getXAtUncheckedPointIndex(2),
      pts3d.getYAtUncheckedPointIndex(2),
      pts3d.getZAtUncheckedPointIndex(2)
    );

    const v01 = Vector3d.create(p1.x - p0.x, p1.y - p0.y, p1.z - p0.z);
    const v02 = Vector3d.create(p2.x - p0.x, p2.y - p0.y, p2.z - p0.z);
    const normal = v01.crossProduct(v02);
    if (!normal.normalizeInPlace()) continue;

    const dotUp = normal.dotProduct(zUp);
    if (Math.abs(dotUp) < 0.05) continue;

    let zSum = 0;
    for (let i = 0; i < n; i++) zSum += pts3d.getZAtUncheckedPointIndex(i);
    const zAvg = zSum / n;
    if (Number.isFinite(maxZ) && (maxZ - zAvg) > zTol) continue;

    const facetKeys: string[] = [];
    for (let i = 0; i < n; i++) {
      const p = Point2d.create(pts3d.getXAtUncheckedPointIndex(i), pts3d.getYAtUncheckedPointIndex(i));
      const key = pointKey(p);
      vertices.set(key, p);
      facetKeys.push(key);
    }

    for (let i = 0; i < facetKeys.length; i++) {
      const a = facetKeys[i]!;
      const b = facetKeys[(i + 1) % facetKeys.length]!;
      if (a === b) continue;
      const k = edgeKey(a, b);
      const existing = edgeCounts.get(k);
      if (existing) existing.count += 1;
      else edgeCounts.set(k, { a, b, count: 1 });
    }
  }

  const adjacency = new Map<string, Set<string>>();
  const unusedEdges = new Map<string, { a: string; b: string }>();

  for (const [k, e] of edgeCounts.entries()) {
    if (e.count !== 1) continue;
    unusedEdges.set(k, { a: e.a, b: e.b });

    const add = (u: string, v: string) => {
      const set = adjacency.get(u) ?? new Set<string>();
      set.add(v);
      adjacency.set(u, set);
    };

    add(e.a, e.b);
    add(e.b, e.a);
  }

  const loops: Point2d[][] = [];

  const removeEdge = (u: string, v: string) => {
    const k = edgeKey(u, v);
    unusedEdges.delete(k);
    adjacency.get(u)?.delete(v);
    adjacency.get(v)?.delete(u);
  };

  while (unusedEdges.size > 0) {
    const first = unusedEdges.values().next().value as { a: string; b: string };
    const start = first.a;
    let current = start;
    let prev: string | undefined;

    const ringKeys: string[] = [start];

    while (true) {
      const neighbors = adjacency.get(current);
      if (!neighbors || neighbors.size === 0) break;

      const next = Array.from(neighbors).find((n) => n !== prev) ?? Array.from(neighbors)[0]!;
      removeEdge(current, next);
      prev = current;
      current = next;
      if (current === start) break;
      ringKeys.push(current);

      if (ringKeys.length > 10000) break;
    }

    const closed = current === start;
    if (!closed) continue;

    const ring = ringKeys.map((k) => vertices.get(k)).filter((p): p is Point2d => !!p);
    const cleaned = closeLoopIfNeeded(ring);
    if (cleaned.length >= 4) loops.push(cleaned);
  }

  loops.sort((a, b) => loopAreaAbsXY(b) - loopAreaAbsXY(a));
  return loops;
}

function curveCollectionToXYLoops(cc: CurveCollection, out?: { usedGraph?: boolean }): Point2d[][] {
  const loops: Point2d[][] = [];

  const options = StrokeOptions.createForCurves();
  const stroked = cc.cloneStroked(options);
  const closeTol = 1e-4;

  const pointsFromCurvePrimitive = (prim: unknown): Point2d[] => {
    if (prim instanceof LineString3d) {
      return prim.points.map((p) => Point2d.create(p.x, p.y));
    }

    const maybe = prim as { emitStrokes?: (ls: LineString3d, options?: StrokeOptions) => void };
    if (maybe && typeof maybe.emitStrokes === "function") {
      const ls = LineString3d.create();
      maybe.emitStrokes(ls, options);
      return ls.points.map((p) => Point2d.create(p.x, p.y));
    }

    return [];
  };

  const normalizeRing = (ring: Point2d[]): Point2d[] => {
    const out: Point2d[] = [];
    for (const p of ring) {
      const last = out[out.length - 1];
      if (!last || !p.isAlmostEqual(last, closeTol)) out.push(p);
    }
    if (out.length >= 2 && out[0]!.isAlmostEqual(out[out.length - 1]!, closeTol)) out.pop();
    return out;
  };

  const isClosedRing = (ring: Point2d[]) => {
    if (ring.length < 2) return false;
    return ring[0]!.isAlmostEqual(ring[ring.length - 1]!, closeTol);
  };

  const pushIfLoopish = (ring: Point2d[]) => {
    if (!isClosedRing(ring)) return;
    const cleaned = normalizeRing(ring);
    if (cleaned.length < 3) return;
    loops.push(cleaned);
  };

  const stitchSegments = (segments: Point2d[][]): Point2d[] => {
    const nonEmpty = segments.filter((s) => s.length > 0);
    if (nonEmpty.length === 0) return [];

    let ring = [...nonEmpty[0]!];
    for (let i = 1; i < nonEmpty.length; i++) {
      const seg = nonEmpty[i]!;
      if (ring.length === 0) {
        ring = [...seg];
        continue;
      }

      const last = ring[ring.length - 1]!;
      const start = seg[0]!;
      const end = seg[seg.length - 1]!;

      const dStart = last.distance(start);
      const dEnd = last.distance(end);

      const oriented = dEnd < dStart ? [...seg].reverse() : seg;
      const first = oriented[0]!;
      if (last.isAlmostEqual(first, closeTol)) {
        ring.push(...oriented.slice(1));
      } else {
        ring.push(...oriented);
      }
    }
    return ring;
  };

  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;

    if (node instanceof LineString3d) {
      const pts = node.points.map((p) => Point2d.create(p.x, p.y));
      const isClosed = pts.length >= 2 && pts[0]!.isAlmostEqual(pts[pts.length - 1]!, closeTol);
      if (isClosed) pushIfLoopish(pts);
      return;
    }

    if (node instanceof Loop) {
      const segments: Point2d[][] = [];
      for (const child of node.children ?? []) segments.push(pointsFromCurvePrimitive(child));
      const stitched = stitchSegments(segments);
      pushIfLoopish(stitched);
      return;
    }

    if (node instanceof Path) {
      const segments: Point2d[][] = [];
      for (const child of node.children ?? []) segments.push(pointsFromCurvePrimitive(child));
      const stitched = stitchSegments(segments);
      pushIfLoopish(stitched);
      return;
    }

    const children = (node as { children?: unknown[] }).children;
    if (Array.isArray(children)) {
      for (const c of children) visit(c);
    }
  };

  visit(stroked);

  // Fallback: some curve collections (notably silhouettes) are delivered as open curve segments.
  // Build a simple planar graph from stroked segments and recover closed cycles.
  if (loops.length === 0) {
    const collectLineStrings = (node: unknown, outLs: LineString3d[]) => {
      if (!node || typeof node !== "object") return;
      if (node instanceof LineString3d) {
        outLs.push(node);
        return;
      }

      const children = (node as { children?: unknown[] }).children;
      if (Array.isArray(children)) {
        for (const c of children) collectLineStrings(c, outLs);
        return;
      }

      const maybe = node as { emitStrokes?: (ls: LineString3d, options?: StrokeOptions) => void };
      if (typeof maybe.emitStrokes === "function") {
        const ls = LineString3d.create();
        maybe.emitStrokes(ls, options);
        if (ls.points.length > 1) outLs.push(ls);
      }
    };

    const lineStrings: LineString3d[] = [];
    collectLineStrings(stroked, lineStrings);

    const vertices = new Map<string, Point2d>();
    const edgeCounts = new Map<string, { a: string; b: string; count: number }>();
    const snapPrecision = 1e4; // ~0.1mm if units are meters; good enough for room boundaries
    const segTol = closeTol;

    const addEdge = (a: Point2d, b: Point2d) => {
      if (a.distance(b) < segTol) return;
      const ka = pointKey(a, snapPrecision);
      const kb = pointKey(b, snapPrecision);
      if (ka === kb) return;
      vertices.set(ka, a);
      vertices.set(kb, b);
      const k = edgeKey(ka, kb);
      const existing = edgeCounts.get(k);
      if (existing) existing.count += 1;
      else edgeCounts.set(k, { a: ka, b: kb, count: 1 });
    };

    for (const ls of lineStrings) {
      const pts = ls.points;
      for (let i = 1; i < pts.length; i++) {
        const a = Point2d.create(pts[i - 1]!.x, pts[i - 1]!.y);
        const b = Point2d.create(pts[i]!.x, pts[i]!.y);
        addEdge(a, b);
      }
    }

    const adjacency = new Map<string, Set<string>>();
    const unusedEdges = new Map<string, { a: string; b: string }>();

    // For curve-derived boundaries, edges should generally appear once.
    // Still, keep all edges to be resilient to duplicates.
    for (const [k, e] of edgeCounts.entries()) {
      unusedEdges.set(k, { a: e.a, b: e.b });
      const add = (u: string, v: string) => {
        const set = adjacency.get(u) ?? new Set<string>();
        set.add(v);
        adjacency.set(u, set);
      };
      add(e.a, e.b);
      add(e.b, e.a);
    }

    const removeEdge = (u: string, v: string) => {
      const k = edgeKey(u, v);
      unusedEdges.delete(k);
      adjacency.get(u)?.delete(v);
      adjacency.get(v)?.delete(u);
    };

    const graphLoops: Point2d[][] = [];
    while (unusedEdges.size > 0) {
      const first = unusedEdges.values().next().value as { a: string; b: string };
      const start = first.a;
      let current = start;
      let prev: string | undefined;
      const ringKeys: string[] = [start];

      while (true) {
        const neighbors = adjacency.get(current);
        if (!neighbors || neighbors.size === 0) break;

        // Choose a next edge; prefer not to immediately backtrack.
        const next = Array.from(neighbors).find((n) => n !== prev) ?? Array.from(neighbors)[0]!;
        removeEdge(current, next);
        prev = current;
        current = next;
        if (current === start) break;
        ringKeys.push(current);
        if (ringKeys.length > 20000) break;
      }

      if (current !== start) continue;
      const ring = ringKeys.map((k) => vertices.get(k)).filter((p): p is Point2d => !!p);
      const closed = closeLoopIfNeeded(ring);
      if (closed.length >= 4) graphLoops.push(closed);
    }

    if (graphLoops.length > 0) {
      if (out) out.usedGraph = true;
      graphLoops.sort((a, b) => loopAreaAbsXY(b) - loopAreaAbsXY(a));
      loops.push(...graphLoops);
    }
  }

  loops.sort((a, b) => loopAreaAbsXY(b) - loopAreaAbsXY(a));
  return loops;
}

function geometryQueryToXYLoops(
  gq: GeometryQuery,
  localToWorld?: Transform,
  debug?: { methods: Record<string, number>; usedFallbackBoundary: boolean; polyface?: PolyfaceAgg }
): Point2d[][] {
  if (gq instanceof CurveCollection) {
    if (localToWorld) {
      const maybeTransformable = gq as unknown as { cloneTransformed?: (t: Transform) => unknown };
      if (typeof maybeTransformable.cloneTransformed === "function") {
        const transformed = maybeTransformable.cloneTransformed(localToWorld);
        if (transformed instanceof CurveCollection) {
          if (debug) debug.methods.curveCollection = (debug.methods.curveCollection ?? 0) + 1;
          const flag: { usedGraph?: boolean } = {};
          const loops = curveCollectionToXYLoops(transformed, flag);
          if (flag.usedGraph && debug) debug.methods.curveGraph = (debug.methods.curveGraph ?? 0) + 1;
          if (loops.length === 0 && debug) debug.methods.curveCollection0 = (debug.methods.curveCollection0 ?? 0) + 1;
          return loops;
        }
      }
    }
    if (debug) debug.methods.curveCollection = (debug.methods.curveCollection ?? 0) + 1;
    const flag: { usedGraph?: boolean } = {};
    const loops = curveCollectionToXYLoops(gq, flag);
    if (flag.usedGraph && debug) debug.methods.curveGraph = (debug.methods.curveGraph ?? 0) + 1;
    if (loops.length === 0 && debug) debug.methods.curveCollection0 = (debug.methods.curveCollection0 ?? 0) + 1;
    return loops;
  }

  let pf: IndexedPolyface;
  try {
    const builder = PolyfaceBuilder.create();
    builder.addGeometryQuery(gq);
    pf = builder.claimPolyface(true);
    if (debug) debug.methods.polyface = (debug.methods.polyface ?? 0) + 1;
  } catch {
    if (debug) debug.methods.polyfaceError = (debug.methods.polyfaceError ?? 0) + 1;
    return [];
  }
  if (localToWorld) pf.tryTransformInPlace(localToWorld);

  if (debug?.polyface) {
    const stats = polyfaceFacetAndZStats(pf);
    debug.polyface.builds += 1;
    debug.polyface.facetsTotal += stats.facets;
    debug.polyface.facetsMax = Math.max(debug.polyface.facetsMax, stats.facets);
    mergeZ(debug.polyface, stats.zMin, stats.zMax);
  }

  const topLoops = polyfaceTopBoundaryLoops(pf);
  if (topLoops.length > 0) {
    if (debug) debug.methods.top = (debug.methods.top ?? 0) + 1;
    return topLoops;
  }

  const boundaryLoops = polyfaceBoundaryLoopsXY(pf);
  if (boundaryLoops.length > 0) {
    if (debug) {
      debug.methods.boundary = (debug.methods.boundary ?? 0) + 1;
      debug.usedFallbackBoundary = true;
    }
    return boundaryLoops;
  }

  const ccTop = PolyfaceQuery.boundaryOfVisibleSubset(pf, 0, Vector3d.unitZ());
  const ccBottom = ccTop ? undefined : PolyfaceQuery.boundaryOfVisibleSubset(pf, 0, Vector3d.unitZ(-1));
  const cc = ccTop ?? ccBottom;
  if (cc) {
    if (debug) debug.methods.silhouette = (debug.methods.silhouette ?? 0) + 1;
    const flag: { usedGraph?: boolean } = {};
    const loops = curveCollectionToXYLoops(cc, flag);
    if (flag.usedGraph && debug) debug.methods.curveGraph = (debug.methods.curveGraph ?? 0) + 1;
    if (loops.length > 0) return loops;
    if (debug) debug.methods.silhouette0 = (debug.methods.silhouette0 ?? 0) + 1;
  }

  if (debug) debug.methods.empty = (debug.methods.empty ?? 0) + 1;
  return [];
}

function computeFootprintsWithDebug(iModel: IModelDb, elementId: string): { loops: Point2[][]; debug: FootprintDebug } {
  const loops: Point2[][] = [];
  const debug: FootprintDebug = {
    elementId,
    primitives: 0,
    loops: 0,
    primitiveTypes: {},
    geometryTypes: {},
    transforms: { withLocalToWorld: 0, withoutLocalToWorld: 0 },
    methods: {},
    polyface: { builds: 0, facetsTotal: 0, facetsMax: 0 },
    usedFallbackBoundary: false,
  };

  const elementPropsUnknown = iModel.elements.getElementProps({ id: elementId, wantGeometry: true } as ElementLoadProps) as unknown;
  if (!elementPropsUnknown || typeof elementPropsUnknown !== "object") {
    debug.reason = "elementProps-missing";
    return { loops, debug };
  }

  const elementProps = elementPropsUnknown as {
    classFullName?: unknown;
    geom?: GeometryStreamProps;
    category?: string;
    placement?: { transform?: unknown };
  };
  if (typeof elementProps.classFullName === "string") debug.elementClass = elementProps.classFullName;

  if (!elementProps.geom) {
    debug.reason = "geom-missing";
    return { loops, debug };
  }

  const stack: GeometryStreamIterator[] = [];
  try {
    stack.push(GeometryStreamIterator.fromGeometricElement3d(elementProps as Pick<GeometricElement3dProps, "geom" | "placement" | "category">));
  } catch {
    try {
      stack.push(GeometryStreamIterator.fromGeometricElement2d(elementProps as Pick<GeometricElement2dProps, "geom" | "placement" | "category">));
    } catch {
      stack.push(new GeometryStreamIterator(elementProps.geom, elementProps.category));
    }
  }

  while (stack.length > 0) {
    const it = stack.pop()!;
    for (const entry of it) {
      const prim = entry.primitive as unknown;
      if (!prim || typeof prim !== "object") continue;

      const p = prim as Record<string, unknown>;
      const type = p.type;

      inc(debug.primitiveTypes, String(type ?? "unknown"));

      if (type === "geometryQuery" && p.geometry) {
        debug.primitives += 1;

        if (entry.localToWorld) debug.transforms.withLocalToWorld += 1;
        else debug.transforms.withoutLocalToWorld += 1;

        const geometry = p.geometry as GeometryQuery;
        const proto = Object.getPrototypeOf(geometry) as { constructor?: { name?: unknown } } | null;
        const geometryType = proto?.constructor?.name;
        inc(debug.geometryTypes, typeof geometryType === "string" && geometryType.length > 0 ? geometryType : "GeometryQuery");

        const dbgState = { methods: debug.methods, usedFallbackBoundary: false, polyface: debug.polyface };
        const partLoops = geometryQueryToXYLoops(geometry, entry.localToWorld, dbgState);
        if (dbgState.usedFallbackBoundary) debug.usedFallbackBoundary = true;
        for (const ring of partLoops) loops.push(ring.map((pt) => ({ x: pt.x, y: pt.y })));
        debug.loops = loops.length;
      } else if (type === "partReference") {
        const part = p.part as { id?: unknown } | undefined;
        const partId = part?.id;
        if (typeof partId !== "string") {
          debug.methods.partReferenceMissingId = (debug.methods.partReferenceMissingId ?? 0) + 1;
          continue;
        }

        const partProps = iModel.elements.getElementProps({ id: partId, wantGeometry: true } as ElementLoadProps) as unknown as Pick<GeometryPartProps, "geom">;
        if (partProps?.geom) {
          const partIt = GeometryStreamIterator.fromGeometryPart(partProps, entry.geomParams, entry.localToWorld);
          stack.push(partIt);
        } else {
          debug.methods.partGeomMissing = (debug.methods.partGeomMissing ?? 0) + 1;
        }
      }
    }
  }

  if (debug.polyface) {
    mergeZ(debug, debug.polyface.zMin, debug.polyface.zMax);
    if (debug.polyface.builds === 0) debug.polyface = undefined;
  }

  if (!debug.reason) {
    if (debug.primitives === 0) debug.reason = "no-geometryQuery-primitives";
    else if (debug.loops === 0) {
      if ((debug.methods.curveCollection ?? 0) > 0 && (debug.methods.curveCollection0 ?? 0) > 0) debug.reason = "curveCollection-no-loops";
      else if ((debug.methods.silhouette ?? 0) > 0 && (debug.methods.silhouette0 ?? 0) > 0) debug.reason = "silhouette-no-loops";
      else if ((debug.methods.polyfaceError ?? 0) > 0) debug.reason = "polyface-error";
      else debug.reason = "no-loops-extracted";
    }
  }

  return { loops, debug };
}

function computeFootprints(iModel: IModelDb, elementId: string): Point2[][] {
  const loops: Point2[][] = [];

  const elementPropsUnknown = iModel.elements.getElementProps({ id: elementId, wantGeometry: true } as ElementLoadProps) as unknown;
  if (!elementPropsUnknown || typeof elementPropsUnknown !== "object") return loops;

  const elementProps = elementPropsUnknown as {
    geom?: GeometryStreamProps;
    category?: string;
    placement?: { transform?: unknown };
  };
  if (!elementProps.geom) return loops;

  const stack: GeometryStreamIterator[] = [];
  try {
    stack.push(GeometryStreamIterator.fromGeometricElement3d(elementProps as Pick<GeometricElement3dProps, "geom" | "placement" | "category">));
  } catch {
    try {
      stack.push(GeometryStreamIterator.fromGeometricElement2d(elementProps as Pick<GeometricElement2dProps, "geom" | "placement" | "category">));
    } catch {
      stack.push(new GeometryStreamIterator(elementProps.geom, elementProps.category));
    }
  }

  while (stack.length > 0) {
    const it = stack.pop()!;
    for (const entry of it) {
      const prim = entry.primitive as unknown;
      if (!prim || typeof prim !== "object") continue;

      const p = prim as Record<string, unknown>;
      const type = p.type;

      if (type === "geometryQuery" && p.geometry) {
        const partLoops = geometryQueryToXYLoops(p.geometry as GeometryQuery, entry.localToWorld);
        for (const ring of partLoops) loops.push(ring.map((p) => ({ x: p.x, y: p.y })));
      } else if (type === "partReference") {
        const part = p.part as { id?: unknown } | undefined;
        const partId = part?.id;
        if (typeof partId !== "string") continue;

        const partProps = iModel.elements.getElementProps({ id: partId, wantGeometry: true } as ElementLoadProps) as unknown as Pick<GeometryPartProps, "geom">;
        if (partProps?.geom) {
          const partIt = GeometryStreamIterator.fromGeometryPart(partProps, entry.geomParams, entry.localToWorld);
          stack.push(partIt);
        }
      }
    }
  }

  return loops;
}

export const roomsFootprintsRouter = Router();

roomsFootprintsRouter.get("/health", (_req, res) => {
  return res.json({
    ok: true,
    routes: ["POST /api/rooms/query", "POST /api/rooms/footprints"],
  });
});

roomsFootprintsRouter.post("/query", async (req, res) => {
  try {
    const { iTwinId, iModelId } = req.body as { iTwinId?: string; iModelId?: string };
    if (!iTwinId || !iModelId) return res.status(400).json({ error: "iTwinId and iModelId are required" });

    const accessToken = getBearerToken(req);

    const ecsql = `
      SELECT
        ECInstanceId AS id,
        Origin,
        Yaw, Pitch, Roll,
        ROOM_NUMBER AS roomNumber,
        ROOM_NAME   AS roomName,
        ROOM_LEVEL_ID AS level,
        ROOM_AREA   AS area
      FROM RevitDynamic.RoomElem
    `;

    const { rows, meta } = await runIModelQuery(accessToken, iTwinId, iModelId, ecsql);
    const names = meta.map((m) => m.name);

    const out: RoomRow[] = [];
    for (const row of rows) {
      const obj: Record<string, unknown> = {};
      for (let i = 0; i < row.length; i++) obj[names[i] ?? String(i)] = row[i];

      const id = obj.id;
      if (typeof id !== "string") continue;

      const areaM2 = asAreaM2(obj.area ?? obj.ROOM_AREA ?? obj.RoomArea ?? obj.roomArea);

      out.push({
        id,
        origin: normalizeOrigin(obj.Origin ?? obj.origin),
        yaw: typeof obj.Yaw === "number" ? obj.Yaw : (typeof obj.yaw === "number" ? obj.yaw : undefined),
        pitch: typeof obj.Pitch === "number" ? obj.Pitch : (typeof obj.pitch === "number" ? obj.pitch : undefined),
        roll: typeof obj.Roll === "number" ? obj.Roll : (typeof obj.roll === "number" ? obj.roll : undefined),
        roomNumber: typeof obj.roomNumber === "string" ? obj.roomNumber : undefined,
        roomName: typeof obj.roomName === "string" ? obj.roomName : undefined,
        level: typeof obj.level === "string" ? obj.level : undefined,
        area: areaM2,
      });
    }

    return res.json({ rooms: out });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(e);
    return res.status(500).json({ error: message });
  }
});

roomsFootprintsRouter.post("/footprints", async (req, res) => {
  let db: SnapshotDb | undefined;

  try {
    const { iTwinId, iModelId, elementIds, debug } = req.body as {
      iTwinId?: string;
      iModelId?: string;
      elementIds?: string[];
      debug?: boolean;
    };

    if (!iTwinId || !iModelId || !Array.isArray(elementIds)) {
      return res.status(400).json({ error: "iTwinId, iModelId, and elementIds[] are required" });
    }

    const accessToken = getBearerToken(req);
    await ensureIModelHostStarted();

    const { filePath } = await ensureCheckpointFile(accessToken, iModelId);
    db = SnapshotDb.openFile(filePath);

    const wantDebug = debug === true || String(req.query.debug ?? "").toLowerCase() === "1";

    if (!wantDebug) {
      const results = elementIds.map((id) => ({ id, loops: computeFootprints(db!, id) }));
      return res.json(results);
    }

    const results = elementIds.map((id) => {
      const r = computeFootprintsWithDebug(db!, id);
      return { id, loops: r.loops, debug: r.debug };
    });

    return res.json(results);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(e);
    return res.status(500).json({ error: message });
  } finally {
    try {
      db?.close();
    } catch {
      // ignore
    }
  }
});
