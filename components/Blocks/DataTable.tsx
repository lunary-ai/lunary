import { useCallback, useEffect, useRef, useState } from "react"

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table"
import {
  ActionIcon,
  Card,
  Checkbox,
  Group,
  Menu,
  Table,
  Text,
} from "@mantine/core"
import {
  IconChevronDown,
  IconChevronUp,
  IconColumns3,
} from "@tabler/icons-react"

import { useVirtual } from "@tanstack/react-virtual"

// outside for reference
const emptyArray = []

const AUTO_HIDABLE_COLUMNS = ["feedback", "tags", "user"]

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

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  //we need a reference to the scrolling element for logic down below
  const tableContainerRef = useRef<HTMLDivElement>(null)

  const table = useReactTable({
    data: data ?? emptyArray, // So it doesn't break when data is undefined because of reference
    columns,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
  })

  const { rows } = table.getRowModel()

  const rowVirtualizer = useVirtual({
    size: rows.length,
    parentRef: tableContainerRef,
  })

  const items = rowVirtualizer.virtualItems
  const paddingTop = items.length > 0 ? items[0].start : 0
  const paddingBottom =
    items.length > 0
      ? rowVirtualizer.totalSize - items[items.length - 1].end
      : 0

  //called on scroll and possibly on mount to fetch more data as the user scrolls and reaches bottom of table
  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement
        //once the user has scrolled within 600px of the bottom of the table, fetch more data if there is any
        if (
          scrollHeight - scrollTop - clientHeight < 600 &&
          !loading &&
          loadMore
        ) {
          loadMore()
        }
      }
    },
    [loadMore, loading]
  )

  //a check on mount and after a fetch to see if the table is already scrolled to the bottom and immediately needs to fetch more data
  useEffect(() => {
    fetchMoreOnBottomReached(tableContainerRef.current)
  }, [fetchMoreOnBottomReached])

  useEffect(() => {
    if (!table || !rows?.length) return
    table.getAllColumns().forEach((column) => {
      if (!AUTO_HIDABLE_COLUMNS.includes(column.id)) return

      const isUsed = rows.some((row) => row.original[column.id])

      column.toggleVisibility(isUsed)
    })
  }, [table, rows])

  return (
    <>
      <Card withBorder p={0}>
        <div
          ref={tableContainerRef}
          className="tableContainer"
          onScroll={(e) => {
            fetchMoreOnBottomReached(e.currentTarget)
          }}
        >
          <Table
            striped
            // withColumnBorders
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
              <Menu withArrow shadow="sm" closeOnItemClick={false}>
                <Menu.Target>
                  <ActionIcon pos="absolute" right={10} top={5}>
                    <IconColumns3 size={16} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <Menu.Item
                        key={column.id}
                        onClick={() => column.toggleVisibility()}
                      >
                        <Group>
                          <Checkbox
                            size="xs"
                            radius="sm"
                            checked={column.getIsVisible()}
                          />
                          {column.columnDef.header}
                        </Group>
                      </Menu.Item>
                    ))}
                </Menu.Dropdown>
              </Menu>
            </thead>
            <tbody>
              {paddingTop > 0 && (
                <tr>
                  <td style={{ height: `${paddingTop}px` }} />
                </tr>
              )}
              {items.map((virtualRow) => {
                const row = rows[virtualRow.index]
                return (
                  <tr
                    key={row.id}
                    ref={virtualRow.measureRef}
                    onClick={
                      onRowClicked
                        ? () => onRowClicked(row.original)
                        : undefined
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
            <Text m="auto" p="md" color="dimmed" size="xs" ta="center">
              Fetching...
            </Text>
          )}
          {!items.length && !loading && (
            <Text m="auto" p="md" color="dimmed" size="xs" ta="center">
              No data
            </Text>
          )}
        </div>
        <style global jsx>{`
          .tableContainer {
            height: 100%;
            overflow-y: scroll;
            overflow-x: hidden;
          }

          table {
            width: 100% !important;
            table-layout: fixed;
          }

          thead {
            position: sticky;
            top: 0;
            z-index: 1;
            background: white;
          }

          th {
            position: relative;
            border-bottom: 1px solid #ddd;
            border-right: 1px solid #ddd;
            text-overflow: ellipsis;
            overflow: clip;
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
      {/* {!!hiddenColumns.length && (
        <Text color="dimmed" size="xs">
          {`The following unused columns were hidden: `}
          {hiddenColumns.map((c) => c.id).join(", ")}
        </Text>
      )} */}
    </>
  )
}
