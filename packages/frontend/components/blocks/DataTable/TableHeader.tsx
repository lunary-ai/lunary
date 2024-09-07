import { useSortParams } from "@/utils/hooks";
import { Group } from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconSelector,
} from "@tabler/icons-react";
import { flexRender, Header } from "@tanstack/react-table";
import classes from "./index.module.css";

interface SortIconProps {
  status: false | "asc" | "desc";
}

function SortIcon({ status }: SortIconProps) {
  if (status === false) {
    return <IconSelector size={14} />;
  } else if (status === "asc") {
    return <IconChevronUp size={14} />;
  } else if (status === "desc") {
    return <IconChevronDown size={14} />;
  }
}

interface TableHeaderProps {
  header: Header<any, unknown>;
}

export default function TableHeader({ header }: TableHeaderProps) {
  const { sortField, setSortField, sortDirection, setSortDirection } =
    useSortParams();

  const name = flexRender(header.column.columnDef.header, header.getContext());
  const canColumnBeSorted = header.column.getCanSort();
  const isSorted = sortField === header.id;
  const currentSortDirection = isSorted ? sortDirection : false;

  async function handleClick() {
    if (!canColumnBeSorted) return;

    if (isSorted) {
      if (currentSortDirection === "desc") {
        await setSortDirection("asc");
      } else {
        await setSortField("createdAt");
        await setSortDirection("desc");
      }
    } else {
      await setSortField(header.id);
      await setSortDirection("desc");
    }
  }

  return (
    <th
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        width: `calc(var(--header-${header?.id}-size) * 1px)`,
      }}
    >
      <Group onClick={handleClick}>
        {name}
        {canColumnBeSorted && <SortIcon status={currentSortDirection} />}
      </Group>
      <div
        onMouseDown={header.getResizeHandler()}
        onTouchStart={header.getResizeHandler()}
        className={`${classes.resizer} ${
          header.column.getIsResizing() ? classes.isResizing : ""
        }`}
      />
    </th>
  );
}
