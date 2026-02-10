import { authService } from "../services/AuthService";

export type RoomRow = {
  id: string; // ECInstanceId
  roomNumber?: string;
  roomName?: string;
  level?: string;
  area?: number;
  origin: { x: number; y: number; z: number };
  yaw?: number;
  pitch?: number;
  roll?: number;
};

function summarizeHttpErrorBody(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const pre = /<pre>([\s\S]*?)<\/pre>/i.exec(trimmed)?.[1];
  const message = (pre ?? trimmed)
    .replace(/\r\n/g, "\n")
    .replace(/<[^>]+>/g, "")
    .trim();

  if (message.length <= 300) return message;
  return `${message.slice(0, 300)}…`;
}

function normalizeOrigin(origin: unknown): { x: number; y: number; z: number } {
  if (!origin) return { x: 0, y: 0, z: 0 };

  if (typeof origin === "string") {
    try {
      const parsed = JSON.parse(origin) as unknown;
      return normalizeOrigin(parsed);
    } catch {
      return { x: 0, y: 0, z: 0 };
    }
  }

  if (typeof origin === "object") {
    const o = origin as { x?: unknown; y?: unknown; z?: unknown };
    return {
      x: typeof o.x === "number" ? o.x : 0,
      y: typeof o.y === "number" ? o.y : 0,
      z: typeof o.z === "number" ? o.z : 0,
    };
  }

  return { x: 0, y: 0, z: 0 };
}

export async function queryRooms(iTwinId: string, iModelId: string): Promise<RoomRow[]> {
  const token = await authService.getAccessToken();
  if (!token) throw new Error("Not signed in.");

  const res = await fetch("/api/rooms/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
    },
    body: JSON.stringify({ iTwinId, iModelId }),
  });

  if (!res.ok) {
    const text = await res.text();
    const summary = summarizeHttpErrorBody(text);
    throw new Error(
      `Rooms query failed: ${res.status} ${res.statusText}${summary ? ` (${summary})` : ""}`
    );
  }

  const json = (await res.json()) as { rooms?: unknown };
  const rooms = Array.isArray(json.rooms) ? (json.rooms as unknown[]) : [];

  return rooms
    .map((r): RoomRow | undefined => {
      if (!r || typeof r !== "object") return undefined;
      const obj = r as Record<string, unknown>;
      const id = obj.id;
      if (typeof id !== "string") return undefined;

      return {
        id,
        roomNumber: typeof obj.roomNumber === "string" ? obj.roomNumber : undefined,
        roomName: typeof obj.roomName === "string" ? obj.roomName : undefined,
        level: typeof obj.level === "string" ? obj.level : undefined,
        area: typeof obj.area === "number" ? obj.area : undefined,
        origin: normalizeOrigin(obj.origin),
        yaw: typeof obj.yaw === "number" ? obj.yaw : undefined,
        pitch: typeof obj.pitch === "number" ? obj.pitch : undefined,
        roll: typeof obj.roll === "number" ? obj.roll : undefined,
      };
    })
    .filter((r): r is RoomRow => !!r);
}
