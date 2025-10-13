import { useMemo } from "react";
import { Box, Text } from "@mantine/core";
import { formatCost, formatLargeNumber } from "@/utils/format";
import BarList, { type BarListColumn } from "../BarList";

const OUTPUT_COLOR = "var(--mantine-color-blue-4)";
const INPUT_COLOR = "var(--mantine-color-cyan-3)";
const PROJECT_COLUMN_WIDTH = "22rem";
const EMPTY_PLACEHOLDER = "—";

interface Data {
  name: string;
  cost: number;
  totalTokens: number;
  completionTokens: number;
  promptTokens: number;
  projectName?: string | null;
}

interface TopModelsRow {
  model: string;
  value: string;
  url?: string;
  projectName?: string | null;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  barSections: {
    value: string;
    tooltip: string;
    count: number;
    color: string;
  }[];
}

interface TopModelsProps {
  data: Data[];
  showProjectColumn?: boolean;
  showTokenBreakdown?: boolean;
  enableLinks?: boolean;
  maxRows?: number;
}

function renderLegendLabel(label: string, color: string) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          backgroundColor: color,
        }}
      />
      {label}
    </span>
  );
}

function renderProjectCell(value: unknown) {
  const content =
    typeof value === "string" && value.trim().length > 0
      ? value
      : EMPTY_PLACEHOLDER;

  return (
    <Text
      size="sm"
      style={{
        display: "block",
        textOverflow: "ellipsis",
        overflow: "hidden",
        whiteSpace: "nowrap",
      }}
      title={content}
    >
      {content}
    </Text>
  );
}

export default function TopModels({
  data,
  showProjectColumn = false,
  showTokenBreakdown = false,
  enableLinks = true,
  maxRows = 5,
}: TopModelsProps) {
  const rows = useMemo<TopModelsRow[]>(() => {
    return data.map((model) => {
      const base: TopModelsRow = {
        model: model.name,
        value: model.name,
        totalTokens: model.totalTokens,
        inputTokens: model.promptTokens,
        outputTokens: model.completionTokens,
        cost: model.cost,
        projectName: model.projectName ?? null,
        barSections: [
          {
            value: "Output",
            tooltip: "Output Tokens",
            count: model.completionTokens,
            color: OUTPUT_COLOR,
          },
          {
            value: "Input",
            tooltip: "Input Tokens",
            count: model.promptTokens,
            color: INPUT_COLOR,
          },
        ],
      };

      if (enableLinks) {
        base.url = `/logs?filters=models=${model.name}`;
      }

      return base;
    });
  }, [data, enableLinks]);

  const columns = useMemo<BarListColumn[]>(() => {
    const result: BarListColumn[] = [
      {
        name: "Model",
        bar: true,
        key: "model",
      },
    ];

    if (showProjectColumn) {
      result.push({
        name: "Project",
        key: "projectName",
        width: PROJECT_COLUMN_WIDTH,
        render: renderProjectCell,
      });
    }

    result.push({
      name: "Total Tokens",
      key: "totalTokens",
      main: true,
      render: formatLargeNumber,
    });

    if (showTokenBreakdown) {
      result.push(
        {
          name: renderLegendLabel("Input Tokens", INPUT_COLOR),
          key: "inputTokens",
          render: formatLargeNumber,
        },
        {
          name: renderLegendLabel("Output Tokens", OUTPUT_COLOR),
          key: "outputTokens",
          render: formatLargeNumber,
        },
      );
    }

    result.push({
      name: "Cost",
      key: "cost",
      render: formatCost,
    });

    return result;
  }, [showProjectColumn, showTokenBreakdown]);

  return (
    <Box px="md">
      <BarList data={rows} columns={columns} maxRows={maxRows} />
    </Box>
  );
}
