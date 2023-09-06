import { createColumnHelper } from "@tanstack/react-table"
import { Anchor, Badge } from "@mantine/core"
import SmartViewer from "@/components/Blocks/SmartViewer"
import { useAppUser } from "./supabaseHooks"
import { formatAppUser, formatCost } from "./format"
const columnHelper = createColumnHelper<any>()

export const timeColumn = (timeColumn, label = "Time") => {
  return columnHelper.accessor(timeColumn, {
    header: label,
    id: timeColumn,
    size: 60,
    enableResizing: false,
    sortingFn: (a, b) =>
      new Date(a.getValue(timeColumn)).getTime() -
      new Date(b.getValue(timeColumn)).getTime(),
    cell: (info) => {
      const isToday =
        new Date(info.getValue()).toDateString() === new Date().toDateString()
      if (isToday) {
        return new Date(info.getValue()).toLocaleTimeString("en-US")
      } else {
        return new Date(info.getValue()).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "numeric",
        })
      }
    },
  })
}

export const durationColumn = () => {
  return {
    id: "duration",
    header: "Duration",
    size: 25,
    cell: (props) => {
      if (!props.getValue()) return null
      return `${(props.getValue() / 1000).toFixed(2)}s`
    },
    accessorFn: (row) => {
      if (!row.ended_at) {
        return NaN
      }

      const duration =
        new Date(row.ended_at).getTime() - new Date(row.created_at).getTime()
      return duration
    },
  }
}

export const statusColumn = () => {
  return columnHelper.accessor("status", {
    id: "status",
    header: "Status",
    size: 60,
    cell: (props) => (
      <Badge color={props.getValue() === "success" ? "green" : "red"}>
        {props.getValue()}
      </Badge>
    ),
  })
}

export const tagsColumn = () => {
  return columnHelper.accessor("tags", {
    header: "Tags",
    size: 60,
    cell: (props) => {
      const tags = props.getValue()
      if (!tags) return null

      return tags.map((tag) => (
        <Badge
          key={tag}
          variant="outline"
          sx={{
            textTransform: "none",
          }}
        >
          {tag}
        </Badge>
      ))
    },
  })
}

export const inputColumn = (label = "input") => {
  return columnHelper.accessor("input", {
    header: label,
    size: 200,
    enableSorting: false,
    cell: (props) => <SmartViewer data={props.getValue()} compact />,
  })
}

export const outputColumn = (label = "Response") => {
  return columnHelper.accessor("output", {
    header: label,
    enableSorting: false,
    cell: (props) => (
      <SmartViewer
        data={props.getValue()}
        error={props.row.original.error}
        compact
      />
    ),
  })
}

export const userColumn = () => {
  return columnHelper.accessor("user", {
    header: "User",
    size: 60,
    cell: (props) => {
      const userId = props.getValue()
      const { user } = useAppUser(userId)

      if (!userId) return null

      return <Anchor href={`/users/${userId}`}>{formatAppUser(user)}</Anchor>
    },
  })
}

export const nameColumn = (label = "Name") => {
  return columnHelper.accessor("name", {
    header: label,
    size: 80,
    cell: (props) => {
      const status = props.row.original.status
      const name = props.getValue()

      return (
        <Badge
          variant="outline"
          sx={{
            textTransform: "none",
          }}
          color={
            status === "success" ? "green" : status === "error" ? "red" : "gray"
          }
        >
          {name}
        </Badge>
      )
    },
  })
}

export const costColumn = () => {
  return columnHelper.accessor("cost", {
    header: "Cost",
    size: 40,
    cell: (props) => {
      const cost = props.getValue()
      return formatCost(cost)
    },
  })
}
