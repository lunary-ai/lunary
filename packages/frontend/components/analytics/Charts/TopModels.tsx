import { formatCost, formatLargeNumber } from "@/utils/format";
import BarList from "../BarList";
import { Box } from "@mantine/core";

interface Data {
  name: string;
  cost: number;
  totalTokens: number;
  completionTokens: number;
  promptTokens: number;
  projectName?: string | null;
}

interface TopModelsProps {
  data: Data[];
  showProjectColumn?: boolean;
  showTokenBreakdown?: boolean;
  enableLinks?: boolean;
}

export default function TopModels({
  data,
  showProjectColumn = false,
  showTokenBreakdown = false,
  enableLinks = true,
}: TopModelsProps) {
  const outputColor = "var(--mantine-color-blue-4)";
  const inputColor = "var(--mantine-color-cyan-3)";

  const renderHeaderLabel = (label: string, color: string) => (
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

  return (
    <Box px="md">
      <BarList
        data={data.map((model) => {
          return {
            value: model.name,
            ...(enableLinks && {
              url: `/logs?filters=models=${model.name}`,
            }),
            ...(showProjectColumn && {
              projectName: model.projectName ?? "—",
            }),
            totalTokens: model.totalTokens,
            inputTokens: model.promptTokens,
            outputTokens: model.completionTokens,
            cost: model.cost,
            barSections: [
              {
                value: "Output",
                tooltip: "Output Tokens",
                count: model.completionTokens,
                color: outputColor,
              },
              {
                value: "Input",
                tooltip: "Input Tokens",
                count: model.promptTokens,
                color: inputColor,
              },
            ],
          };
        })}
        columns={[
          {
            name: "Model",
            bar: true,
            key: "model",
          },
          ...(showProjectColumn
            ? [
                {
                  name: "Project",
                  key: "projectName",
                },
              ]
            : []),
          {
            name: "Total Tokens",
            key: "totalTokens",
            main: true,
            render: formatLargeNumber,
          },
          ...(showTokenBreakdown
            ? [
                {
                  name: renderHeaderLabel("Input Tokens", inputColor),
                  key: "inputTokens",
                  render: formatLargeNumber,
                },
                {
                  name: renderHeaderLabel("Output Tokens", outputColor),
                  key: "outputTokens",
                  render: formatLargeNumber,
                },
              ]
            : []),
          {
            name: "Cost",
            key: "cost",
            render: formatCost,
          },
        ]}
      />
    </Box>
  );
}
