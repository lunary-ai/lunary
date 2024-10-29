import { useDashboards } from "@/utils/dataHooks/dashboards";
import { Anchor, Loader } from "@mantine/core";

export default function Dashboard() {
  const { dashboards, isLoading } = useDashboards();

  if (isLoading) {
    return <Loader />;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      {dashboards.map((dashboard) => (
        <>
          <Anchor href={`/dashboards/${dashboard.id}`}>{dashboard.name}</Anchor>
          <br />
        </>
      ))}
    </div>
  );
}
