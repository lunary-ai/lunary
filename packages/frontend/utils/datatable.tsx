import SmartViewer from "@/components/SmartViewer";
import AppUserAvatar from "@/components/blocks/AppUserAvatar";
import Feedback from "@/components/blocks/OldFeedback";
import ProtectedText from "@/components/blocks/ProtectedText";
import { Badge, Button, Checkbox, Group, Text, Tooltip } from "@mantine/core";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";

import Link from "next/link";
import { EvaluatorType } from "shared";
import { useProjectRules, useProjectSWR } from "./dataHooks";
import { renderEnrichment } from "./enrichment";
import { capitalize, formatCost, formatDateTime, msToTime } from "./format";
import { IconBiohazard } from "@tabler/icons-react";
const columnHelper = createColumnHelper<any>();

export function selectColumn() {
  return columnHelper.accessor("select", {
    id: "select",
    header: ({ table }: { table: any }) => (
      <Checkbox
        size="xs"
        radius="sm"
        checked={table.getIsAllRowsSelected()}
        indeterminate={table.getIsSomeRowsSelected()}
        onChange={table.getToggleAllRowsSelectedHandler()}
        onClick={(e) => e.stopPropagation()}
      />
    ),
    cell: ({ row }: { row: any }) => (
      <Checkbox
        size="xs"
        radius="sm"
        styles={{ input: { cursor: "pointer" } }}
        checked={row.getIsSelected()}
        indeterminate={row.getIsSomeSelected()}
        disabled={!row.getCanSelect?.()}
        onChange={row.getToggleSelectedHandler()}
        onClick={(e) => e.stopPropagation()}
      />
    ),
    size: 40,
    enableSorting: false,
    enableResizing: false,
    enableHiding: true,
  });
}

export function timeColumn(timeColumn, label = "Date") {
  return columnHelper.accessor(timeColumn, {
    header: label,
    id: timeColumn,
    size: 140,
    sortingFn: (a, b) =>
      new Date(a.getValue(timeColumn)).getTime() -
      new Date(b.getValue(timeColumn)).getTime(),
    cell: (info) => {
      const isToday =
        new Date(info.getValue())?.toDateString() === new Date().toDateString();
      if (isToday) {
        return new Date(info.getValue()).toLocaleTimeString(
          typeof window !== "undefined" ? window.navigator.language : "en-US",
        );
      } else {
        return formatDateTime(info.getValue());
      }
    },
  });
}

export function durationColumn(unit = "s"): ColumnDef<any> {
  return {
    id: "duration",
    header: "Duration",
    size: 110,
    enableSorting: true,
    cell: (props) => {
      const value = props?.getValue() || 0;
      const run = props.row.original;
      const duration = new Date(run.endedAt) - new Date(run.createdAt);
      const metadata = props.row.original.metadata?.cache;

      const isCached = metadata?.cached || duration < 0.01 * 1000;

      if (isCached && run.type === "llm" && run.output) {
        return "Cached";
      }

      if (value === 0) {
        return "0.00s";
      } else if (unit === "s") {
        return `${(props.getValue() / 1000).toFixed(2)}s`;
      } else if (unit === "full") {
        return msToTime(props.getValue());
      }
    },
    accessorFn: (row) => {
      if (!row.endedAt) {
        return NaN;
      }

      const duration =
        new Date(row.endedAt).getTime() - new Date(row.createdAt).getTime();
      return duration;
    },
  };
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
  });
}

export function tagsColumn() {
  return columnHelper.accessor("tags", {
    header: "Tags",
    size: 120,
    minSize: 80,
    enableSorting: false,
    cell: (props) => {
      const tags = props.getValue();

      if (!tags) return null;

      return (
        <Group gap={4}>
          {tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </Group>
      );
    },
  });
}

export function inputColumn(label = "input") {
  return columnHelper.accessor("input", {
    header: label,
    minSize: 250,
    enableSorting: false,
    cell: (props) => <SmartViewer data={props.getValue()} compact />,
  });
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
  });
}

export function templateColumn() {
  return columnHelper.accessor("templateVersionId", {
    header: "Template",
    enableSorting: false,
    cell: (props) => {
      const templateVersionId = props.getValue();

      if (!templateVersionId) return null;

      const row = props.row.original;

      return (
        <Button
          size="compact-xs"
          variant="light"
          component={Link}
          href={`/prompts/${templateVersionId}`}
        >
          {row.templateSlug}
        </Button>
      );
    },
  });
}

export function userColumn() {
  return columnHelper.accessor("user", {
    header: "User",
    size: 170,
    enableSorting: false,
    cell: (props) => {
      const user = props.getValue();

      if (!user?.id) return null;

      return <AppUserAvatar size="sm" user={user} withName />;
    },
  });
}

export function nameColumn(label = "Name") {
  return columnHelper.accessor("name", {
    header: label,
    size: 120,
    minSize: 30,
    enableSorting: false,
    cell: (props) => {
      const { status, type } = props.row.original;
      const name = props.getValue();

      return (
        <Badge
          variant="outline"
          color={
            status === "success" ? "green" : status === "error" ? "red" : "gray"
          }
        >
          {name || type}
        </Badge>
      );
    },
  });
}

export function costColumn() {
  return columnHelper.accessor("cost", {
    header: "Cost",
    size: 100,
    enableSorting: true,
    cell: (props) => {
      const cost = props.getValue();
      return <ProtectedText>{formatCost(cost)}</ProtectedText>;
    },
  });
}

export function feedbackColumn(type: "llm" | "traces" | "threads") {
  let cell;
  if (type === "traces") {
    cell = (props) => {
      const run = props.row.original;

      const { data: relatedRuns } = useProjectSWR(`/runs/${run.id}/related`);

      const allFeedbacks = [run, ...(relatedRuns || [])]
        .filter((run) => run.feedback)
        .map((run) => run.feedback)
        .filter((feedback) => {
          return feedback.thumb || feedback.comment;
        });

      return (
        <Group gap="xs" justify="flex-start">
          {allFeedbacks
            ?.filter((feedback) => feedback)
            .map((feedback, i) => <Feedback data={feedback} key={i} />)}
        </Group>
      );
    };
  } else if (type === "threads") {
    cell = (props) => {
      const run = props.row.original;

      return (
        <Group gap="xs" justify="left">
          {run.feedbacks?.map((feedback, i) => (
            <Feedback data={feedback} key={i} />
          ))}
        </Group>
      );
    };
  } else if (type === "llm") {
    cell = (props) => {
      const run = props.row.original;

      const feedback = run.feedback || run.parentFeedback;
      const isParentFeedback = !run.feedback && run.parentFeedback;

      return <Feedback data={feedback} isFromParent={isParentFeedback} />;
    };
  }

  return columnHelper.accessor("feedback", {
    header: "Feedback",
    size: 100,
    enableSorting: false,
    cell,
  });
}

export function enrichmentColumn(
  name: string,
  id: string,
  evaluatorType: EvaluatorType,
  maskPII: boolean = false,
) {
  return columnHelper.accessor(`enrichment-${id}`, {
    header: evaluatorType === "topics" ? "Topics" : `${capitalize(name)}`,
    id: `enrichment-${id}`,
    size: 120,
    enableSorting: false,
    cell: (props) => {
      const data = props.row.original[`enrichment-${id}`];
      if (!data) {
        return null;
      }
      return renderEnrichment(data.result, evaluatorType, maskPII);
    },
  });
}

export function scoresColumn() {
  return columnHelper.accessor("scores", {
    header: "Scores",
    enableSorting: false,
    size: 430,
    cell: (props) => {
      const scores = props.getValue();
      if (scores && scores.length) {
        return (
          <Group gap="sm" wrap="nowrap">
            {scores?.map((score, i) => (
              <Badge key={i} variant="outline" color="blue">
                {score.label}:{" "}
                {typeof score.value === "number"
                  ? score.value.toFixed(4)
                  : score.value}
              </Badge>
            ))}
          </Group>
        );
      }
    },
  });
}

export function toxicityColumn(id: string) {
  return {
    id: `toxicity-${id}`,
    header: "Toxicity",
    accessorFn: (row) => row.toxicity, // keep full object for the cell
    enableSorting: false,

    cell: ({ getValue }) => {
      const tox = getValue();

      const isToxic = tox.input.isToxic || tox.output.isToxic;
      if (!isToxic) return;

      const labels = [
        ...(tox.input.isToxic ? tox.input.labels : []),
        ...(tox.output.isToxic ? tox.output.labels : []),
      ];

      return (
        <Tooltip label={labels.join(", ")} withArrow>
          <Badge color="red" leftSection={<IconBiohazard width={12} />}>
            Toxic
          </Badge>
        </Tooltip>
      );
    },
  };
}
