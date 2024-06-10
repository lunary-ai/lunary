import AnalyticsCard from "./AnalyticsCard"
import BarList from "./BarList"

export default function AgentSummary({ usage }) {
  return (
    <AnalyticsCard title="Agents">
      <BarList
        data={usage
          .filter((u) => u.type === "agent")
          .map((model) => ({
            value: model.name,
            runs: model.success + model.errors,
            errors: model.errors,
            barSections: [
              {
                value: "Success",
                tooltip: "Successful Runs",
                count: model.success,
                color: "green.3",
              },
              {
                value: "Errors",
                tooltip: "Errors",
                count: model.errors,
                color: "red.4",
              },
            ],
          }))}
        columns={[
          {
            name: "Agent",
            bar: true,
          },
          {
            name: "Runs",
            key: "runs",
            main: true,
          },
          {
            name: "Errors",
            key: "errors",
          },
        ]}
      />
    </AnalyticsCard>
  )
}
