import { useDashboards } from "@/utils/dataHooks/dashboards";
import { Loader } from "@mantine/core";

export default function Dashboard() {
  const { dashboards, isLoading } = useDashboards();

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      {dashboards.map((dashboard) => dashboard.name)}
    </div>
  );
}
