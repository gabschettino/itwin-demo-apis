import * as React from "react";

export type Point2 = { x: number; y: number };
export type FootprintsResponse = { id: string; loops: Point2[][] }[];

export type OriginPoint = {
  id: string;
  x: number;
  y: number;
};

export type RoomLabel = {
  id: string;
  x: number;
  y: number;
  text: string;
};

type Centroid = { x: number; y: number; area: number };

function loopAreaAndCentroid(loop: Point2[]): Centroid {
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
    return { x: sx / loop.length, y: sy / loop.length, area: 0 };
  }

  return { x: cx / (3 * area2), y: cy / (3 * area2), area: area2 / 2 };
}

function footprintCentroid(loops: Point2[][]): Centroid | undefined {
  if (loops.length === 0) return undefined;
  let best = loopAreaAndCentroid(loops[0]);
  for (let i = 1; i < loops.length; i++) {
    const next = loopAreaAndCentroid(loops[i]);
    if (Math.abs(next.area) > Math.abs(best.area)) best = next;
  }
  return best;
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function computeBounds(footprints: FootprintsResponse, extraPoints?: OriginPoint[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const fp of footprints) {
    for (const loop of fp.loops) {
      for (const p of loop) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
    }
  }

  if (extraPoints) {
    for (const p of extraPoints) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  }

  return { minX, minY, maxX, maxY };
}

export function RoomsPlan2D({
  footprints,
  labels,
  origins,
  showOrigins,
  autoScaleToOrigins,
  roomScale,
}: {
  footprints: FootprintsResponse;
  labels?: RoomLabel[];
  origins?: OriginPoint[];
  showOrigins?: boolean;
  autoScaleToOrigins?: boolean;
  roomScale?: number;
}) {
  const originsById = React.useMemo(() => {
    const map = new Map<string, OriginPoint>();
    for (const o of origins ?? []) map.set(o.id, o);
    return map;
  }, [origins]);

  const scaleInfo = React.useMemo(() => {
    if (!autoScaleToOrigins || originsById.size === 0) return { scale: 1, samples: 0 };
    const scales: number[] = [];

    for (const fp of footprints) {
      const centroid = footprintCentroid(fp.loops);
      const origin = originsById.get(fp.id);
      if (!centroid || !origin) continue;

      const cLen2 = centroid.x * centroid.x + centroid.y * centroid.y;
      if (cLen2 < 1e-9) continue;

      const dot = origin.x * centroid.x + origin.y * centroid.y;
      const scale = dot / cLen2;

      const oLen = Math.hypot(origin.x, origin.y);
      const cLen = Math.sqrt(cLen2);
      if (oLen < 1e-9 || cLen < 1e-9) continue;
      const cos = dot / (oLen * cLen);

      if (!Number.isFinite(scale) || !Number.isFinite(cos)) continue;
      if (cos < 0.9) continue;
      scales.push(scale);
    }

    const est = median(scales);
    if (!est || !Number.isFinite(est) || Math.abs(est) < 1e-6) return { scale: 1, samples: scales.length };
    return { scale: est, samples: scales.length };
  }, [footprints, originsById, autoScaleToOrigins]);

  const scaleFactor = scaleInfo.scale;
  const originScale = scaleFactor !== 0 ? scaleFactor : 1;

  const centroidById = React.useMemo(() => {
    const map = new Map<string, Point2>();
    for (const fp of footprints) {
      const centroid = footprintCentroid(fp.loops);
      if (centroid) map.set(fp.id, { x: centroid.x, y: centroid.y });
    }
    return map;
  }, [footprints]);

  const scaledOrigins = React.useMemo(() => {
    if (!origins || !autoScaleToOrigins || originScale === 1) return origins;
    return origins.map((o) => {
      const centroid = centroidById.get(o.id);
      if (!centroid) return { ...o, x: o.x * originScale, y: o.y * originScale };
      const dx = o.x - centroid.x;
      const dy = o.y - centroid.y;
      return {
        ...o,
        x: centroid.x + dx * originScale,
        y: centroid.y + dy * originScale,
      };
    });
  }, [origins, autoScaleToOrigins, originScale, centroidById]);

  const scaledOriginsById = React.useMemo(() => {
    const map = new Map<string, OriginPoint>();
    for (const o of scaledOrigins ?? []) map.set(o.id, o);
    return map;
  }, [scaledOrigins]);

  const offsetById = React.useMemo(() => {
    const map = new Map<string, Point2>();
    for (const fp of footprints) {
      const centroid = footprintCentroid(fp.loops);
      const origin = scaledOriginsById.get(fp.id) ?? originsById.get(fp.id);
      if (!centroid || !origin) continue;
      map.set(fp.id, { x: origin.x - centroid.x, y: origin.y - centroid.y });
    }
    return map;
  }, [footprints, scaledOriginsById, originsById]);

  const adjustedFootprints = React.useMemo(() => {
    if (!autoScaleToOrigins) return footprints;
    const appliedRoomScale = typeof roomScale === "number" && Number.isFinite(roomScale) ? roomScale : 1;
    return footprints.map((fp) => {
      const offset = offsetById.get(fp.id);
      const origin = scaledOriginsById.get(fp.id) ?? originsById.get(fp.id);
      if (!offset || !origin) return fp;
      return {
        ...fp,
        loops: fp.loops.map((loop) =>
          loop.map((p) => {
            const shifted = { x: p.x + offset.x, y: p.y + offset.y };
            return {
              x: origin.x + (shifted.x - origin.x) * appliedRoomScale,
              y: origin.y + (shifted.y - origin.y) * appliedRoomScale,
            };
          })
        ),
      };
    });
  }, [footprints, offsetById, autoScaleToOrigins, scaledOriginsById, originsById, roomScale]);

  const adjustedLabels = React.useMemo(() => {
    if (!labels || !autoScaleToOrigins) return labels;
    const appliedRoomScale = typeof roomScale === "number" && Number.isFinite(roomScale) ? roomScale : 1;
    return labels.map((l) => {
      const offset = offsetById.get(l.id);
      const origin = scaledOriginsById.get(l.id) ?? originsById.get(l.id);
      if (!offset || !origin) return l;
      const shifted = { x: l.x + offset.x, y: l.y + offset.y };
      return {
        ...l,
        x: origin.x + (shifted.x - origin.x) * appliedRoomScale,
        y: origin.y + (shifted.y - origin.y) * appliedRoomScale,
      };
    });
  }, [labels, offsetById, autoScaleToOrigins, scaledOriginsById, originsById, roomScale]);

  const originOffsets = React.useMemo(() => {
    if (!showOrigins) return { segments: [], average: undefined as { dx: number; dy: number } | undefined };
    const segments: Array<{ id: string; from: Point2; to: Point2 }> = [];
    let dxSum = 0;
    let dySum = 0;
    let count = 0;

    for (const fp of adjustedFootprints) {
      const centroid = footprintCentroid(fp.loops);
      const origin = scaledOriginsById.get(fp.id) ?? originsById.get(fp.id);
      if (!centroid || !origin) continue;
      segments.push({ id: fp.id, from: centroid, to: origin });
      dxSum += origin.x - centroid.x;
      dySum += origin.y - centroid.y;
      count += 1;
    }

    const average = count > 0 ? { dx: dxSum / count, dy: dySum / count } : undefined;
    return { segments, average };
  }, [adjustedFootprints, scaledOriginsById, originsById, showOrigins]);

  const extraPoints = showOrigins ? (scaledOrigins ?? origins) : undefined;
  const { minX, minY, maxX, maxY } = React.useMemo(
    () => computeBounds(adjustedFootprints, extraPoints),
    [adjustedFootprints, extraPoints]
  );

  const padding = React.useMemo(() => {
    const w = maxX - minX;
    const h = maxY - minY;
    // Reduced padding: 2% of max dimension (was 5%), min 0.1 (was 0.5)
    // This makes rooms fill more of the SVG container for better visibility
    return Math.max(0.1, 0.02 * Math.max(w, h));
  }, [minX, minY, maxX, maxY]);

  // SVG has Y-down coordinates; our iModel XY is typically Y-up.
  // Use a viewBox that we draw into with a Y-flip transform.
  const initialViewBox = React.useMemo(() => {
    const x = minX - padding;
    const y = -(maxY + padding);
    const w = (maxX - minX) + 2 * padding;
    const h = (maxY - minY) + 2 * padding;
    return { x, y, w, h };
  }, [minX, minY, maxX, maxY, padding]);

  const [viewBox, setViewBox] = React.useState(initialViewBox);
  const [isPanning, setIsPanning] = React.useState(false);
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const panRef = React.useRef<{ active: boolean; x: number; y: number; start: { x: number; y: number; w: number; h: number } }>(
    { active: false, x: 0, y: 0, start: initialViewBox }
  );

  React.useEffect(() => {
    setViewBox(initialViewBox);
    panRef.current = { active: false, x: 0, y: 0, start: initialViewBox };
    setIsPanning(false);
  }, [initialViewBox]);

  const resetView = React.useCallback(() => {
    setViewBox(initialViewBox);
    panRef.current = { active: false, x: 0, y: 0, start: initialViewBox };
    setIsPanning(false);
  }, [initialViewBox]);

  const viewBoxString = `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`;

  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onWheel = (e: WheelEvent) => {
      // React registers some wheel listeners as passive; use a native non-passive listener.
      if (e.cancelable) e.preventDefault();

      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      if (!Number.isFinite(nx) || !Number.isFinite(ny)) return;

      const zoomIn = e.deltaY < 0;
      const factor = zoomIn ? 0.9 : 1.1;

      setViewBox((vb) => {
        const anchorX = vb.x + nx * vb.w;
        const anchorY = vb.y + ny * vb.h;

        const newW = vb.w * factor;
        const newH = vb.h * factor;

        const ax = (anchorX - vb.x) / vb.w;
        const ay = (anchorY - vb.y) / vb.h;

        const newX = anchorX - ax * newW;
        const newY = anchorY - ay * newH;

        const minSize = Math.max(0.01, Math.min(initialViewBox.w, initialViewBox.h) * 0.01);
        const maxSize = Math.max(initialViewBox.w, initialViewBox.h) * 50;
        if (newW < minSize || newH < minSize) return vb;
        if (newW > maxSize || newH > maxSize) return vb;

        return { x: newX, y: newY, w: newW, h: newH };
      });
    };

    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      svg.removeEventListener("wheel", onWheel as EventListener);
    };
  }, [initialViewBox]);

  const onPointerDown = React.useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    // Only pan on primary button.
    if (e.button !== 0) return;
    const svg = svgRef.current;
    if (!svg) return;
    svg.setPointerCapture(e.pointerId);
    panRef.current = { active: true, x: e.clientX, y: e.clientY, start: viewBox };
    setIsPanning(true);
  }, [viewBox]);

  const onPointerMove = React.useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!panRef.current.active) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dx = (e.clientX - panRef.current.x) / rect.width;
    const dy = (e.clientY - panRef.current.y) / rect.height;

    setViewBox((vb) => ({
      x: panRef.current.start.x - dx * panRef.current.start.w,
      y: panRef.current.start.y - dy * panRef.current.start.h,
      w: vb.w,
      h: vb.h,
    }));
  }, []);

  const endPan = React.useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!panRef.current.active) return;
    panRef.current.active = false;
    setIsPanning(false);
    try {
      svgRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox={viewBoxString}
      width="100%"
      height={440}
      style={{
        display: "block",
        background: "var(--background)",
        borderRadius: 8,
        border: "1px solid hsl(var(--border))",
        touchAction: "none",
        cursor: isPanning ? "grabbing" : "grab",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      onPointerLeave={endPan}
      onDoubleClick={resetView}
    >
      <g transform="scale(1,-1)">
        {adjustedFootprints.flatMap((fp) =>
          fp.loops.map((loop, idx) => {
            const d = loop
              .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
              .join(" ");

            return (
              <path
                key={`${fp.id}-${idx}`}
                d={`${d} Z`}
                fill="rgba(31, 119, 180, 0.15)"
                stroke="rgba(0, 0, 0, 0.65)"
                strokeWidth={0.05}
                vectorEffect="non-scaling-stroke"
              />
            );
          })
        )}
      </g>

      {(adjustedLabels ?? []).map((l) => (
        <text
          key={l.id}
          x={l.x}
          y={-l.y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={0.4}
          fill="rgba(0,0,0,0.75)"
        >
          {l.text}
        </text>
      ))}

      {showOrigins && (scaledOrigins ?? origins ?? []).map((p) => (
        <g key={`origin-${p.id}`}>
          <circle cx={p.x} cy={-p.y} r={0.15} fill="none" stroke="rgba(220,38,38,0.85)" strokeWidth={0.05} />
          <line x1={p.x - 0.2} y1={-p.y} x2={p.x + 0.2} y2={-p.y} stroke="rgba(220,38,38,0.85)" strokeWidth={0.05} />
          <line x1={p.x} y1={-(p.y - 0.2)} x2={p.x} y2={-(p.y + 0.2)} stroke="rgba(220,38,38,0.85)" strokeWidth={0.05} />
        </g>
      ))}

      {showOrigins && originOffsets.segments.map((seg) => (
        <g key={`offset-${seg.id}`}>
          <line
            x1={seg.from.x}
            y1={-seg.from.y}
            x2={seg.to.x}
            y2={-seg.to.y}
            stroke="rgba(37,99,235,0.6)"
            strokeWidth={0.05}
            strokeDasharray="0.2 0.2"
          />
          <circle cx={seg.from.x} cy={-seg.from.y} r={0.1} fill="rgba(37,99,235,0.8)" />
        </g>
      ))}

      {showOrigins && originOffsets.average && (
        <text
          x={minX + padding}
          y={-(maxY + padding) + 0.6}
          fontSize={0.35}
          fill="rgba(37,99,235,0.8)"
          textAnchor="start"
        >
          {`avg offset dx=${originOffsets.average.dx.toFixed(3)}, dy=${originOffsets.average.dy.toFixed(3)}`}
        </text>
      )}

      {showOrigins && autoScaleToOrigins && scaleInfo.samples > 0 && (
        <text
          x={minX + padding}
          y={-(maxY + padding) + 1.0}
          fontSize={0.35}
          fill="rgba(37,99,235,0.8)"
          textAnchor="start"
        >
          {`origin-scale=${originScale.toFixed(6)} (${scaleInfo.samples} samples)`}
        </text>
      )}
    </svg>
  );
}
