import { IModelApp, StandardViewId, type IModelConnection } from "@itwin/core-frontend";
import { ColorDef } from "@itwin/core-common";
import { authService } from "../services/AuthService";
import { queryRooms, type RoomRow } from "./roomsQuery";
import { RoomsDecorator } from "./roomsDecorator";

export type FootprintDebugInfo = {
  reason?: string;
  elementClass?: string;
  primitives?: number;
  loops?: number;
  methods?: Record<string, number>;
  [key: string]: unknown;
};

export type FootprintsResponse = Array<{
  id: string;
  loops: { x: number; y: number }[][];
  debug?: FootprintDebugInfo;
  origin?: { x: number; y: number; z: number };
  yaw?: number;
  pitch?: number;
  roll?: number;
}>

export async function fetchFootprints(
  iTwinId: string,
  iModelId: string,
  elementIds: string[],
  options?: { debug?: boolean }
) {
  const token = await authService.getAccessToken();

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = token.startsWith("Bearer ") ? token : `Bearer ${token}`;

  const url = options?.debug ? "/api/rooms/footprints?debug=1" : "/api/rooms/footprints";
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ iTwinId, iModelId, elementIds, debug: options?.debug === true }),
  });

  if (!res.ok) throw new Error(`Footprints failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as FootprintsResponse;
}

let activeDecorator: RoomsDecorator | undefined;

export function applyFootprintsOverlay(footprints: FootprintsResponse) {
  const polys: { points: { x: number; y: number }[]; z?: number; fill?: ColorDef; stroke?: ColorDef; origin?: { x: number; y: number; z: number }; yaw?: number; pitch?: number; roll?: number }[] = [];

  for (const fp of footprints) {
    for (const loop of fp.loops) {
      polys.push({
        points: loop,
        z: fp.origin?.z ?? 0,
        fill: ColorDef.from(31, 119, 180, 40),
        stroke: ColorDef.black,
        origin: fp.origin,
        yaw: fp.yaw,
        pitch: fp.pitch,
        roll: fp.roll,
      });
    }
  }

  if (activeDecorator) {
    IModelApp.viewManager.dropDecorator(activeDecorator);
    activeDecorator = undefined;
  }

  const decorator = new RoomsDecorator();
  IModelApp.viewManager.addDecorator(decorator);
  decorator.setPolygons(polys);
  activeDecorator = decorator;

  const vp = IModelApp.viewManager.selectedView;
  if (vp) {
    vp.view.setStandardRotation(StandardViewId.Top);
    vp.synchWithView();
  }
}

export async function showRoomsPlan(
  conn: IModelConnection,
  iTwinId: string,
  setRoomRows: (rows: RoomRow[]) => void
): Promise<{ rows: RoomRow[]; footprints: FootprintsResponse }> {
  const iModelId = conn.iModelId;
  if (!iModelId) throw new Error("Missing iModelId on connection.");

  const rows = await queryRooms(iTwinId, iModelId);
  setRoomRows(rows);

  const elementIds = rows.map((r) => r.id);
  const footprints = await fetchFootprints(iTwinId, iModelId, elementIds);

  // Footprints now include origin/yaw/pitch/roll from the backend
  applyFootprintsOverlay(footprints);

  return { rows, footprints };
}

export function clearRoomsPlan() {
  if (activeDecorator) {
    IModelApp.viewManager.dropDecorator(activeDecorator);
    activeDecorator = undefined;
    IModelApp.viewManager.invalidateDecorationsAllViews();
  }
}
