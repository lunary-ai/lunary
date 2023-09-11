import { memo, useCallback, useEffect, useRef, useState } from "react"

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  Row,
} from "@tanstack/react-table"
import { Card, Group, Table, Text } from "@mantine/core"
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react"

import { useVirtual } from "react-virtual"
import { useDebouncedState } from "@mantine/hooks"

// outside for reference
const emptyArray = []

export default function DataTable({
  data,
  columns = [],
  loading = false,
  onRowClicked = undefined,
  loadMore = undefined,
}) {
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: "created_at",
      desc: true,
    },
  ])

  //we need a reference to the scrolling element for logic down below
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const [scrollY, setScrollY] = useDebouncedState(0, 100)

  const table = useReactTable({
    data: data ?? emptyArray, // So it doesn't break when data is undefined because of reference
    columns,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    onSortingChange: setSorting,
  })

  const { rows } = table.getRowModel()

  //V irtualizing is optional, but might be necessary if we are going to potentially have hundreds or thousands of rows
  const rowVirtualizer = useVirtual({
    parentRef: tableContainerRef,
    size: rows.length,
    overscan: 10,
  })
  const { virtualItems: virtualRows, totalSize } = rowVirtualizer
  const paddingTop = virtualRows.length > 0 ? virtualRows?.[0]?.start || 0 : 0
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows?.[virtualRows.length - 1]?.end || 0)
      : 0

  //called on scroll and possibly on mount to fetch more data as the user scrolls and reaches bottom of table
  useEffect(() => {
    if (!loadMore || loading) return

    const bottomOfTable =
      tableContainerRef.current?.getBoundingClientRect().bottom

    const distanceFromBottom = window.innerHeight - bottomOfTable

    console.log({ distanceFromBottom })

    if (Math.abs(distanceFromBottom) < 300) {
      console.log("fetching more")
      loadMore()
    }
  }, [loadMore, loading, scrollY])

  useEffect(() => {
    window.addEventListener("scroll", () => {
      setScrollY(window.scrollY)
    })
    return () => {
      window.removeEventListener("scroll", () => {
        setScrollY(window.scrollY)
      })
    }
  }, [setScrollY])

  return (
    <Card withBorder p={0}>
      <div ref={tableContainerRef}>
        <Table
          striped
          withColumnBorders
          w={table.getCenterTotalSize()}
          highlightOnHover={!!onRowClicked}
        >
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
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: `${paddingTop}px` }} />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index]
              return (
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
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: `${paddingBottom}px` }} />
              </tr>
            )}
          </tbody>
        </Table>
        {loading && (
          <Text m="auto" p="md" color="dimmed" size="xs">
            Fetching more...
          </Text>
        )}
      </div>
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
