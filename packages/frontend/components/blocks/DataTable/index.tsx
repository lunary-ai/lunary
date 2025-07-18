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

  // Initialize column sizing based on column definitions
  const [columnSizing, setColumnSizing] = useState(() => {
    const sizing = {};
    availableColumns.forEach((col) => {
      if (col.size) {
        sizing[col.id] = col.size;
      }
    });
    return sizing;
  });

  // Update column sizing when columns change
  useEffect(() => {
    setColumnSizing((prev) => {
      const newSizing = { ...prev };
      availableColumns.forEach((col) => {
        if (col.size && !newSizing[col.id]) {
          newSizing[col.id] = col.size;
        }
      });
      return newSizing;
    });
  }, [availableColumns]);

  const table = useReactTable({
    data: data ?? emptyArray,
    columns: availableColumns,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualSorting: true,
    getRowId: (row) => row?.id,
    // onColumnVisibilityChange: setColumnVisibility,
    onColumnVisibilityChange: (updater) => {
      if (!updater || !setVisibleColumns) return;

      const newVisibility = updater();
      const oldVisibility = table.getState().columnVisibility;

      Object.keys(newVisibility).forEach((columnId) => {
        if (newVisibility[columnId] && !oldVisibility[columnId]) {
          // Column is becoming visible, ensure it has the correct size
          const column = availableColumns.find((col) => col.id === columnId);
          if (column && column.size) {
            setColumnSizing((prev) => ({
              ...prev,
              [columnId]: column.size,
            }));
          }
        }
      });

      setVisibleColumns(newVisibility as VisibilityState);
    },
    onColumnSizingChange: setColumnSizing,
    state: {
      columnVisibility: visibleColumns,
      columnSizing,
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

  const columnSizeVars = useMemo(() => {
    const headers = table.getFlatHeaders();
    const sizes: Record<string, number> = {};
    headers.forEach((header) => {
      sizes[`--header-${header.id}-size`] = header.getSize();
      sizes[`--col-${header.column.id}-size`] = header.column.getSize();
    });
    return sizes;
  }, [table.getState().columnSizingInfo, table.getState().columnSizing]);

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

  const rowNumber = table.getRowModel().rows.length;

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
              .filter((column) => column.getCanHide() && column.id !== "select")
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

        {!rowNumber && loading && (
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
