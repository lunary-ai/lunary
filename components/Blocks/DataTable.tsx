import { memo, useState } from "react"

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table"
import { Card, Group, Table } from "@mantine/core"
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react"

// outside for reference
const emptyArray = []

export default function DataTable({
  data,
  columns = [],
  onRowClicked = undefined,
}) {
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "created_at",
      desc: true,
    },
  ])

  const table = useReactTable({
    data: data ?? emptyArray, // So it doesn't break when data is undefined because of reference
    columns,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <Card withBorder p={0}>
      <Table striped withColumnBorders w={table.getCenterTotalSize()}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <th
                    key={header.id}
                    colSpan={header.colSpan}
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : (
                      <Group
                        spacing={4}
                        onClick={header.column.getToggleSortingHandler()}
                        style={
                          header.column.getCanSort()
                            ? { cursor: "pointer" }
                            : {}
                        }
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: <IconChevronUp size={14} />,
                          desc: <IconChevronDown size={14} />,
                        }[header.column.getIsSorted() as string] ?? null}
                      </Group>
                    )}

                    <div
                      {...{
                        onMouseDown: header.getResizeHandler(),
                        onTouchStart: header.getResizeHandler(),
                        className: `resizer ${
                          header.column.getIsResizing() ? "isResizing" : ""
                        }`,
                      }}
                    />
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={
                onRowClicked ? () => onRowClicked(row.original) : undefined
              }
              style={
                onRowClicked
                  ? {
                      cursor: "pointer",
                    }
                  : {}
              }
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  style={{
                    width: cell.column.getSize(),
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
      <style global jsx>{`
        table {
          width: 100% !important;
          table-layout: fixed;
        }

        th {
          position: relative;
        }

        tr {
          width: fit-content;
          height: 30px;
        }

        .resizer {
          position: absolute;
          right: 0;
          top: 0;
          height: 100%;
          width: 5px;
          background: rgba(0, 0, 0, 0.5);
          cursor: col-resize;
          user-select: none;
          touch-action: none;
        }

        .resizer.isResizing {
          background: blue;
          opacity: 1;
        }

        @media (hover: hover) {
          .resizer {
            opacity: 0;
          }

          *:hover > .resizer {
            opacity: 1;
          }
        }
      `}</style>
    </Card>
  )
}
