import { Group } from "@mantine/core"
import {
  IconSelector,
  IconChevronUp,
  IconChevronDown,
} from "@tabler/icons-react"
import { flexRender, Header } from "@tanstack/react-table"
import classes from "./index.module.css"

interface SortIconProps {
  status: false | "asc" | "desc"
}
function SortIcon({ status }: SortIconProps) {
  if (status === false) {
    return <IconSelector size={14} />
  } else if (status === "asc") {
    return <IconChevronUp size={14} />
  } else if (status === "desc") {
    return <IconChevronDown size={14} />
  }
}

interface TableHeaderProps {
  header: Header<any, unknown>
}
export default function TableHeader({ header }: TableHeaderProps) {
  const name = flexRender(header.column.columnDef.header, header.getContext())
  const size = header.getSize()
  const canColumnBeSorted = header.column.getCanSort()
  const sortStatus = header.column.getIsSorted()

  function handleClick() {
    console.log(header.column.getCanSort())
  }

  return (
    <th
      style={{ width: `calc(var(--header-${header?.id}-size) * 1px)` }}
      // style={{ width: header.getSize() }}
      onClick={handleClick}
    >
      <Group>
        {name}
        {canColumnBeSorted && <SortIcon status={sortStatus} />}
      </Group>
      <div
        onMouseDown={header.getResizeHandler()}
        {...{
          onTouchStart: header.getResizeHandler(),
          className: `${classes.resizer} ${
            header.column.getIsResizing() ? classes.isResizing : ""
          }`,
        }}
      />
    </th>
  )
}
