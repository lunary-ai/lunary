import { formatCost, formatLargeNumber } from "@/utils/format"
import AnalyticsCard from "./AnalyticsCard"
import BarList from "./BarList"

export default function UsageSummary({ usage }) {
  return (
    <AnalyticsCard title="LLM Usage">
      <BarList
        data={usage
          .filter((u) => u.type === "llm")
          .map((model) => ({
            value: model.name,
            tokens: model.completion_tokens + model.prompt_tokens,
            cost: model.cost,
            barSections: [
              {
                value: "Completion",
                tooltip: "Completion Tokens",
                count: model.completion_tokens,
                color: "purple.4",
              },
              {
                value: "Prompt",
                tooltip: "Prompt Tokens",
                count: model.prompt_tokens,
                color: "cyan.3",
              },
            ],
          }))}
        columns={[
          {
            name: "Model",
            bar: true,
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
    </AnalyticsCard>
  )
}
