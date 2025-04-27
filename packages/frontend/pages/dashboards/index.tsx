import { useProject } from "@/utils/dataHooks";
import { useDashboards } from "@/utils/dataHooks/dashboards";
import { Flex, Loader } from "@mantine/core";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function Dashboards() {
  const { dashboards, isLoading } = useDashboards();
  const { project } = useProject();
  const router = useRouter();

  useEffect(() => {
    if (project?.homeDashboardId) {
      router.push(`/dashboards/${project.homeDashboardId}`);
      return;
    }
    if (dashboards.length && !isLoading) {
      const homeDashboard = dashboards.find((dashboard) => dashboard.isHome);
      if (!homeDashboard) {
        router.push(`/dashboards/${dashboards[0].id}`);
        return;
      } else {
        router.push(`/dashboards/${homeDashboard.id}`);
        return;
      }
    }
  }, [project, dashboards, isLoading]);

  return (
    <Flex align="center" justify="center" h="280px">
      <Loader />
    </Flex>
  );
}
