import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import {
  ActionIcon,
  Card,
  Checkbox,
  Group,
  Menu,
  Text,
  useComputedColorScheme,
} from "@mantine/core"
import { IconColumns3 } from "@tabler/icons-react"
import {
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import classes from "./index.module.css"

import { useVirtualizer } from "@tanstack/react-virtual"
import TableHeader from "./TableHeader"
import { useQueryState } from "nuqs"

// outside for reference
const emptyArray = []

export default function DataTable({
  type,
  data,
  availableColumns = [],
  visibleColumns,
  setVisibleColumns,
  loading = false,
  onRowClicked = undefined,
  loadMore = undefined,
  defaultSortBy = "createdAt",
}: {
  type: string
  data?: any[]
  availableColumns?: any[]
  visibleColumns?: VisibilityState
  setVisibleColumns?: (columns: VisibilityState) => void
  loading?: boolean
  onRowClicked?: (row: any) => void
  loadMore?: (() => void) | null
  defaultSortBy?: string
}) {
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: defaultSortBy,
      desc: true,
    },
  ])

  const [hello, setHello] = useQueryState("hello", { defaultValue: "123" })
  console.log(hello)

  const tableContainerRef = useRef<HTMLDivElement>(null)

  const scheme = useComputedColorScheme()

  const table = useReactTable({
    data: data ?? emptyArray, // So it doesn't break when data is undefined because of reference
    columns: availableColumns,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
    onColumnVisibilityChange: (fn) => {
      if (!fn || !setVisibleColumns) return
      const data = fn() // for some reason, need to call the function to get the updated state

      setVisibleColumns(data as VisibilityState)
    },
    state: {
      sorting,
      columnVisibility: visibleColumns,
    },
    onSortingChange: setSorting,
  })

  const columnSizeVars = useMemo(() => {
    const headers = table.getFlatHeaders()
    const colSizes: { [key: string]: number } = {}
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]!
      colSizes[`--header-${header.id}-size`] = header.getSize()
      colSizes[`--col-${header.column.id}-size`] = header.column.getSize()
    }
    return colSizes
  }, [table.getState().columnSizingInfo, table.getState().columnSizing])

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

  return (
    <>
      <Card withBorder p={0} className={scheme} h="auto">
        <div
          ref={tableContainerRef}
          className={classes.tableContainer}
          onScroll={(e) => {
            fetchMoreOnBottomReached(e.currentTarget)
          }}
        >
          <Menu closeOnItemClick={false}>
            <Menu.Target>
              <ActionIcon
                component="span"
                variant="light"
                color="gray"
                className={classes.columnIcon}
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
            cellSpacing={0}
            style={{
              ...columnSizeVars,
            }}
          >
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHeader key={header.id} header={header} />
                  ))}
                </tr>
              ))}
            </thead>
            <MemoizedTableBody
              table={table}
              tableContainerRef={tableContainerRef}
              onRowClicked={onRowClicked}
            />
          </table>

          {loading && (
            <Text m="auto" p="md" c="dimmed" size="xs" ta="center">
              Fetching...
            </Text>
          )}
          {!table.getRowModel().rows.length && !loading && (
            <Text m="auto" p="md" c="dimmed" size="xs" ta="center">
              No data
            </Text>
          )}
        </div>
      </Card>
    </>
  )
}

interface TableBodyProps {
  table: ReturnType<typeof useReactTable>
  tableContainerRef: React.RefObject<HTMLDivElement>
  onRowClicked?: (row: any) => void
}

function TableBody({ table, tableContainerRef, onRowClicked }: TableBodyProps) {
  const { rows } = table.getRowModel()

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 70,
    measureElement:
      typeof window !== "undefined" &&
      navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: 4,
  })

  const items = rowVirtualizer.getVirtualItems()

  const paddingTop = items.length > 0 ? items[0].start : 0
  const paddingBottom =
    items.length > 0
      ? rowVirtualizer.getTotalSize() - items[items.length - 1].end
      : 0

  return (
    <tbody
      style={{
        height: `${rowVirtualizer.getTotalSize()}px`,
      }}
    >
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
            data-index={virtualRow.index}
            onClick={
              onRowClicked ? () => onRowClicked(row.original) : undefined
            }
            className={virtualRow.index % 2 ? "ListItemOdd" : "ListItemEven"}
            ref={(node) => rowVirtualizer.measureElement(node)}
            style={{
              // transform: `translateY(${virtualRow.start}px)`, //this should always be a `style` as it changes on scroll
              height: `${virtualRow.size}px`,
              ...(onRowClicked ? { cursor: "pointer" } : {}),
            }}
          >
            {row.getVisibleCells().map((cell) => (
              <td
                key={cell.id}
                style={{
                  width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
                }}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
  )
}

const MemoizedTableBody = React.memo(TableBody, (prevProps, nextProps) => {
  return (
    prevProps.table.options.data === nextProps.table.options.data &&
    prevProps.onRowClicked === nextProps.onRowClicked
  )
})
