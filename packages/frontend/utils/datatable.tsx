import SmartViewer from "@/components/SmartViewer"
import AppUserAvatar from "@/components/blocks/AppUserAvatar"
import Feedback from "@/components/blocks/OldFeedback"
import ProtectedText from "@/components/blocks/ProtectedText"
import { Badge, Button, Group } from "@mantine/core"
import { ColumnDef, createColumnHelper } from "@tanstack/react-table"

import Link from "next/link"
import { EvaluatorType } from "shared"
import { useProjectSWR } from "./dataHooks"
import { renderEnrichment } from "./enrichment"
import { capitalize, formatCost, formatDateTime, msToTime } from "./format"
const columnHelper = createColumnHelper<any>()

export function timeColumn(timeColumn, label = "Time") {
  return columnHelper.accessor(timeColumn, {
    header: label,
    id: timeColumn,
    size: 140,
    sortingFn: (a, b) =>
      new Date(a.getValue(timeColumn)).getTime() -
      new Date(b.getValue(timeColumn)).getTime(),
    cell: (info) => {
      const isToday =
        new Date(info.getValue()).toDateString() === new Date().toDateString()
      if (isToday) {
        return new Date(info.getValue()).toLocaleTimeString(
          typeof window !== "undefined" ? window.navigator.language : "en-US",
        )
      } else {
        return formatDateTime(info.getValue())
      }
    },
  })
}

export function durationColumn(unit = "s"): ColumnDef<any> {
  return {
    id: "duration",
    header: "Duration",
    size: 110,
    enableSorting: true,
    cell: (props) => {
      const value = props?.getValue() || 0

      if (value === 0) {
        return "0.00s"
      } else if (unit === "s") {
        // console.log(props.getValue())
        return `${(props.getValue() / 1000).toFixed(2)}s`
      } else if (unit === "full") {
        console.log(props.getValue())
        return msToTime(props.getValue())
      }
    },
    accessorFn: (row) => {
      if (!row.endedAt) {
        return NaN
      }

      const duration =
        new Date(row.endedAt).getTime() - new Date(row.createdAt).getTime()
      return duration
    },
  }
}

export function statusColumn() {
  return columnHelper.accessor("status", {
    id: "status",
    header: "Status",
    enableSorting: false,
    size: 60,
    cell: (props) => (
      <Badge color={props.getValue() === "success" ? "green" : "red"}>
        <ProtectedText>{props.getValue()}</ProtectedText>
      </Badge>
    ),
  })
}

export function tagsColumn() {
  return columnHelper.accessor("tags", {
    header: "Tags",
    size: 120,
    minSize: 80,
    enableSorting: false,
    cell: (props) => {
      const tags = props.getValue()

      if (!tags) return null

      return (
        <Group gap={4}>
          {tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </Group>
      )
    },
  })
}

export function inputColumn(label = "input") {
  return columnHelper.accessor("input", {
    header: label,
    minSize: 250,
    enableSorting: false,
    cell: (props) => <SmartViewer data={props.getValue()} compact />,
  })
}

export function outputColumn(label = "Response") {
  return columnHelper.accessor("output", {
    header: label,
    minSize: 250,
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

export function templateColumn() {
  return columnHelper.accessor("templateVersionId", {
    header: "Template",
    enableSorting: false,
    cell: (props) => {
      const templateVersionId = props.getValue()

      if (!templateVersionId) return null

      const row = props.row.original

      return (
        <Button
          size="compact-xs"
          variant="light"
          component={Link}
          href={`/prompts/${templateVersionId}`}
        >
          {row.templateSlug}
        </Button>
      )
    },
  })
}

export function userColumn() {
  return columnHelper.accessor("user", {
    header: "User",
    size: 130,
    enableSorting: false,
    cell: (props) => {
      const user = props.getValue()

      if (!user?.id) return null

      return <AppUserAvatar size="sm" user={user} withName />
    },
  })
}

export function nameColumn(label = "Name") {
  return columnHelper.accessor("name", {
    header: label,
    size: 100,
    minSize: 30,
    enableSorting: false,
    cell: (props) => {
      const { status, type } = props.row.original
      const name = props.getValue()

      return (
        <Badge
          variant="outline"
          color={
            status === "success" ? "green" : status === "error" ? "red" : "gray"
          }
        >
          {name || type}
        </Badge>
      )
    },
  })
}

export function costColumn() {
  return columnHelper.accessor("cost", {
    header: "Cost",
    size: 100,
    enableSorting: true,
    cell: (props) => {
      const cost = props.getValue()
      return <ProtectedText>{formatCost(cost)}</ProtectedText>
    },
  })
}

export function feedbackColumn(withRelatedRuns = false) {
  const cell = withRelatedRuns
    ? (props) => {
        const run = props.row.original

        const { data: relatedRuns } = useProjectSWR(`/runs/${run.id}/related`)

        const allFeedbacks = [run, ...(relatedRuns || [])]
          .filter((run) => run.feedback)
          .map((run) => run.feedback)

        return (
          <Group gap="xs">
            {allFeedbacks?.map((feedback, i) => (
              <Feedback data={feedback} key={i} />
            ))}
          </Group>
        )
      }
    : (props) => {
        const run = props.row.original

        const feedback = run.feedback || run.parentFeedback
        const isParentFeedback = !run.feedback && run.parentFeedback

        return <Feedback data={feedback} isFromParent={isParentFeedback} />
      }

  return columnHelper.accessor("feedback", {
    header: "Feedback",
    size: 100,
    enableSorting: false,
    cell,
  })
}

export function enrichmentColumn(
  name: string,
  id: string,
  evaluatorType: EvaluatorType,
) {
  return columnHelper.accessor(`enrichment-${id}`, {
    header: `${capitalize(name)} ✨`,
    id: `enrichment-${id}`,
    size: 120,
    enableSorting: false,
    cell: (props) => {
      const data = props.row.original[`enrichment-${id}`]
      if (!data) {
        return null
      }
      return renderEnrichment(data.result, evaluatorType)
    },
  })
}
