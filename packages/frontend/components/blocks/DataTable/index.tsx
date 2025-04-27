import {
  MouseEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ActionIcon,
  Card,
  Checkbox,
  Group,
  Menu,
  Text,
  useComputedColorScheme,
} from "@mantine/core";
import { IconColumns3 } from "@tabler/icons-react";
import {
  VisibilityState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import classes from "./index.module.css";

import TableBody from "./TableBody";
import TableHeader from "./TableHeader";

// outside for reference
const emptyArray: any[] = [];

type DataTableProps = {
  type: string;
  data?: any[];
  availableColumns?: any[];
  visibleColumns?: VisibilityState;
  setVisibleColumns?: (columns: VisibilityState) => void;
  loading?: boolean;
  isSelectMode?: boolean;
  onRowClicked?: (
    row: any,
    event: MouseEvent<HTMLTableRowElement, MouseEvent>,
  ) => void;
  loadMore?: (() => void) | null;
  defaultSortBy?: string;
  setSelectedRows: (rows: any[]) => void;
};

export default function DataTable({
  type,
  data,
  availableColumns = [],
  visibleColumns,
  setVisibleColumns,
  loading = false,
  isSelectMode = false,
  onRowClicked,
  loadMore,
  setSelectedRows,
}: DataTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const scheme = useComputedColorScheme();

  const table = useReactTable({
    data: data ?? emptyArray,
    columns: availableColumns,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
    getRowId: (row) => row.id,
    onColumnVisibilityChange: (fn) => {
      if (!fn || !setVisibleColumns) return;
      const data = fn();
      setVisibleColumns(data as VisibilityState);
    },
    state: {
      columnVisibility: visibleColumns,
      // rowSelection,
    },
    enableRowSelection: true,
  });

  useEffect(() => {
    if (!setSelectedRows) return;
    const rowSelection = table.getState().rowSelection;
    const rowIds = Object.keys(rowSelection);
    if (rowIds) {
      setSelectedRows(rowIds);
    }
  }, [table.getState().rowSelection, setSelectedRows]);

  useEffect(() => {
    table.setColumnVisibility((old) => ({
      ...old,
      select: isSelectMode,
    }));
  }, [isSelectMode, table]);

  useEffect(() => {
    if (isSelectMode === false) {
      table.setRowSelection({});
    }
  }, [isSelectMode]);

  const columnSizeVars = useMemo(() => {
    const headers = table.getFlatHeaders();
    const sizes: Record<string, number> = {};
    headers.forEach((header) => {
      sizes[`--header-${header.id}-size`] = header.getSize();
      sizes[`--col-${header.column.id}-size`] = header.column.getSize();
    });
    return sizes;
  }, [table.getState().columnSizingInfo, table.getState().columnSizing]);

  table.getColumn("select")?.getToggleVisibilityHandler();

  const fetchMoreOnBottomReached = useCallback(
    (containerRefElement?: HTMLDivElement | null) => {
      if (containerRefElement) {
        const { scrollHeight, scrollTop, clientHeight } = containerRefElement;
        if (
          scrollHeight - scrollTop - clientHeight < 1300 &&
          !loading &&
          loadMore
        ) {
          loadMore();
        }
      }
    },
    [loadMore, loading],
  );

  useEffect(() => {
    fetchMoreOnBottomReached(tableContainerRef.current);
  }, [fetchMoreOnBottomReached]);

  return (
    <Card withBorder p={0} className={scheme} h="auto">
      <div
        ref={tableContainerRef}
        className={classes.tableContainer}
        onScroll={(e) => fetchMoreOnBottomReached(e.currentTarget)}
      >
        <Menu closeOnItemClick={false}>
          <Menu.Target>
            <ActionIcon
              component="span"
              variant="default"
              className={classes.columnIcon}
            >
              <IconColumns3
                size={16}
                color={scheme === "dark" ? "white" : "black"}
              />
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
                {headerGroup.headers.map((header, i) => (
                  <TableHeader
                    key={header.id}
                    header={header}
                    isLastColumn={i + 1 === headerGroup.headers.length}
                  />
                ))}
              </tr>
            ))}
          </thead>

          <TableBody
            table={table}
            tableContainerRef={tableContainerRef}
            onRowClicked={onRowClicked}
            rowSelection={table.getState().rowSelection}
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
  );
}
