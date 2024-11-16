import { flexRender, useReactTable } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { memo } from "react";

interface TableBodyProps {
  table: ReturnType<typeof useReactTable>;
  tableContainerRef: React.RefObject<HTMLDivElement>;
  onRowClicked?: (row: any) => void;
}
function TableBody({ table, tableContainerRef, onRowClicked }: TableBodyProps) {
  const { rows } = table.getRowModel();

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
  });

  const items = rowVirtualizer.getVirtualItems();

  const paddingTop = items.length > 0 ? items[0].start : 0;
  const paddingBottom =
    items.length > 0
      ? rowVirtualizer.getTotalSize() - items[items.length - 1].end
      : 0;

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
        const row = rows[virtualRow.index];
        return (
          <tr
            key={row.id}
            data-index={virtualRow.index}
            onClick={() => onRowClicked?.(row.original)}
            className={virtualRow.index % 2 ? "ListItemOdd" : "ListItemEven"}
            ref={(node) => rowVirtualizer.measureElement(node)}
            style={{
              height: `${virtualRow.size}px`,
              cursor: onRowClicked ? "pointer" : "auto",
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
        );
      })}
      {paddingBottom > 0 && (
        <tr>
          <td style={{ height: `${paddingBottom}px` }} />
        </tr>
      )}
    </tbody>
  );
}

// Avoid unnecessary rerendering of the body (for example when the column size is changed)
export default memo(TableBody, (prevProps, nextProps) => {
  return (
    prevProps.table.options.data === nextProps.table.options.data &&
    prevProps.onRowClicked === nextProps.onRowClicked
  );
});
