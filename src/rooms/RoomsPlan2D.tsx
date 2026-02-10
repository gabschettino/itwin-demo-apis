import * as React from "react";

export type Point2 = { x: number; y: number };
export type FootprintsResponse = { id: string; loops: Point2[][] }[];

export type RoomLabel = {
  id: string;
  x: number;
  y: number;
  text: string;
};

function computeBounds(footprints: FootprintsResponse) {
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

  if (!Number.isFinite(minX)) {
    return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
  }

  return { minX, minY, maxX, maxY };
}

export function RoomsPlan2D({ footprints, labels }: { footprints: FootprintsResponse; labels?: RoomLabel[] }) {
  const { minX, minY, maxX, maxY } = React.useMemo(() => computeBounds(footprints), [footprints]);

  const padding = React.useMemo(() => {
    const w = maxX - minX;
    const h = maxY - minY;
    return Math.max(0.5, 0.05 * Math.max(w, h));
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
        {footprints.flatMap((fp) =>
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

        {(labels ?? []).map((l) => (
          <text
            key={l.id}
            x={l.x}
            y={l.y}
            transform="scale(1,-1)"
            textAnchor="middle"
            fontSize={0.4}
            fill="rgba(0,0,0,0.75)"
          >
            {l.text}
          </text>
        ))}
      </g>
    </svg>
  );
}
