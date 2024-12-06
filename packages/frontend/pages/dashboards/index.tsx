import { useDashboards } from "@/utils/dataHooks/dashboards";
import { Flex, Loader } from "@mantine/core";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function Dashboards() {
  const { dashboards, isLoading } = useDashboards();
  const router = useRouter();

  useEffect(() => {
    if (dashboards.length && !isLoading) {
      const homeDashboard = dashboards.find((dashboard) => dashboard.isHome);
      if (!homeDashboard) {
        return router.push(`/dashboards/${dashboards[0].id}`);
      } else {
        return router.push(`/dashboards/${homeDashboard.id}`);
      }
    }
  }, [dashboards, isLoading]);

  return (
    <Flex align="center" justify="center" h="280px">
      <Loader />
    </Flex>
  );
}
