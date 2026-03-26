import * as React from "react";
import { Table } from "@itwin/itwinui-react";
import type { Column } from "@itwin/itwinui-react/react-table";

type RoomsTableRow = {
  id: string;
  roomNumber?: string;
  roomName?: string;
  level?: string;
  area?: number;
};

export function RoomsTable({ rows }: { rows: RoomsTableRow[] }) {
  const columns = React.useMemo<Column<RoomsTableRow>[]>(
    () => [
      { Header: "Number", accessor: "roomNumber" },
      { Header: "Name", accessor: "roomName" },
      { Header: "Level", accessor: "level" },
      {
        Header: "Area",
        accessor: "area",
        cellRenderer: ({ cellProps }) => {
          const v = cellProps.cell.value as unknown;
          const n = typeof v === "number" ? v : typeof v === "string" ? Number.parseFloat(v) : Number.NaN;
          if (!Number.isFinite(n)) return "";
          return <span>{`${n.toFixed(2)} m²`}</span>;
        },
      },
      { Header: "Id", accessor: "id" },
    ],
    []
  );

  return <Table columns={columns} data={rows} emptyTableContent="No rooms found" density="extra-condensed" />;
}
