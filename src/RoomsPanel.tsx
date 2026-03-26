import { RoomsTable } from "./rooms/RoomsTable";
import type { RoomRow } from "./rooms/roomsQuery";

export function RoomsPanel({ rows }: { rows: RoomRow[] }) {
  return (
    <div className="w-full">
      <RoomsTable rows={rows} />
    </div>
  );
}
