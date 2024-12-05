import { formatCost, formatLargeNumber } from "@/utils/format";
import BarList from "../BarList";

interface Data {
  name: string;
  cost: number;
  totalTokens: number;
  completionTokens: number;
  promptTokens: number;
}

export default function TopModels({ data }: { data: Data[] }) {
  return (
    <BarList
      data={data.map((model) => ({
        value: model.name,
        tokens: model.totalTokens,
        cost: model.cost,
        barSections: [
          {
            value: "Completion",
            tooltip: "Completion Tokens",
            count: model.completionTokens,
            color: "var(--mantine-color-blue-4)",
          },
          {
            value: "Prompt",
            tooltip: "Prompt Tokens",
            count: model.promptTokens,
            color: "var(--mantine-color-cyan-3)",
          },
        ],
      }))}
      columns={[
        {
          name: "Model",
          bar: true,
          key: "model",
        },
        {
          name: "Tokens",
          key: "tokens",
          main: true,
          render: formatLargeNumber,
        },
        {
          name: "Cost",
          key: "cost",
          render: formatCost,
        },
      ]}
    />
  );
}
