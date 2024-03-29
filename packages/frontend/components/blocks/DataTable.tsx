import { ReactNode, useCallback, useEffect, useRef, useState } from "react"

import { ActionIcon, Card, Checkbox, Group, Menu, Text } from "@mantine/core"
import {
  IconChevronDown,
  IconChevronUp,
  IconColumns3,
} from "@tabler/icons-react"
import {
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { useLocalStorage } from "@mantine/hooks"
import { useVirtual } from "@tanstack/react-virtual"
import { useFixedColorScheme } from "@/utils/hooks"

// outside for reference
const emptyArray = []

const DEFAULT_AUTO_HIDABLE_COLUMNS = ["feedback", "tags", "user"]
const CHAT_AUTO_HIDABLE_COLUMNS = ["tags", "user"]

export default function DataTable({
  type,
  data,
  columns = [],
  loading = false,
  onRowClicked = undefined,
  loadMore = undefined,
  defaultSortBy = "createdAt",
}: {
  type: string
  data?: any[]
  columns?: any[]
  loading?: boolean
  onRowClicked?: (row: any) => void
  loadMore?: (() => void) | null
  defaultSortBy?: string
}) {
  const autoHidableColumns =
    type === "thread" ? CHAT_AUTO_HIDABLE_COLUMNS : DEFAULT_AUTO_HIDABLE_COLUMNS

  const [sorting, setSorting] = useState<SortingState>([
    {
      id: defaultSortBy,
      desc: true,
    },
  ])

  const [columnVisibility, setColumnVisibility] =
    useLocalStorage<VisibilityState>({
      key: "columnVisibility-" + type,
      defaultValue: {},
    })

  const [columnsTouched, setColumnsTouched] = useLocalStorage({
    key: "columnsTouched-" + type,
    defaultValue: false,
  })

  //we need a reference to the scrolling element for logic down below
  const tableContainerRef = useRef<HTMLDivElement>(null)

  const scheme = useFixedColorScheme()

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
    [loadMore, loading],
  )

  //a check on mount and after a fetch to see if the table is already scrolled to the bottom and immediately needs to fetch more data
  useEffect(() => {
    fetchMoreOnBottomReached(tableContainerRef.current)
  }, [fetchMoreOnBottomReached])

  useEffect(() => {
    if (!table || !rows?.length || columnsTouched) return

    table.getAllColumns().forEach((column) => {
      if (!autoHidableColumns.includes(column.id)) return

      const isUsed = rows.some(
        (row) =>
          row.original[column.id] ||
          // Special case with feedback column which is sometimes in parentFeedback
          (column.id === "feedback" && row.original.parentFeedback),
      )

      column.toggleVisibility(isUsed)
    })
  }, [table, rows, columnsTouched])

  return (
    <>
      <Card withBorder p={0} className={scheme}>
        <div
          ref={tableContainerRef}
          className="tableContainer"
          onScroll={(e) => {
            fetchMoreOnBottomReached(e.currentTarget)
          }}
        >
          <Menu closeOnItemClick={false}>
            <Menu.Target>
              <ActionIcon
                component="span"
                pos="absolute"
                right={15}
                top={5}
                style={{ zIndex: 2 }}
                variant="transparent"
                color={`var(--mantine-color-default-color)`}
                opacity={0.5}
              >
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
                    onClick={() => {
                      column.toggleVisibility()
                      setColumnsTouched(true)
                    }}
                  >
                    <Group>
                      <Checkbox
                        size="xs"
                        radius="sm"
                        readOnly
                        checked={column.getIsVisible()}
                      />
                      {column.columnDef.header as ReactNode}
                    </Group>
                  </Menu.Item>
                ))}
            </Menu.Dropdown>
          </Menu>
          <table
            // striped
            // withColumnBorders
            width={table.getCenterTotalSize()}
            cellSpacing={0}
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
                            gap={4}
                            // onClick={header.column.getToggleSortingHandler()}
                            // style={
                            //   header.column.getCanSort()
                            //     ? { cursor: "pointer" }
                            //     : {}
                            // }
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
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
                          cell.getContext(),
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
          </table>
          {loading && (
            <Text m="auto" p="md" c="dimmed" size="xs" ta="center">
              Fetching...
            </Text>
          )}
          {!items.length && !loading && (
            <Text m="auto" p="md" c="dimmed" size="xs" ta="center">
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
            font-size: 14px;
          }

          .light table tbody tr:nth-child(odd) {
            background-color: rgb(248, 249, 250);
          }

          table tbody tr:hover {
            background-color: var(
              --mantine-primary-color-light-hover
            ) !important;
          }

          thead {
            position: sticky;
            top: 0;
            z-index: 1;
            background-color: var(--mantine-color-body);
          }

          th {
            position: relative;
          }

          td code {
            max-height: 60px;
          }

          .light th {
            border-bottom: 1px solid #ddd;
          }

          .dark th,
          .dark td {
            border-bottom: 2px solid #2b2c2f;
          }

          tr {
            width: fit-content;
            height: 30px;
          }

          th,
          td {
            overflow: hidden;
            text-overflow: ellipsis;
            padding: 7px 10px;
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
