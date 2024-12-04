import { useDashboard } from "@/utils/dataHooks/dashboards";
import { useRouter } from "next/router";

export default function Dashboard() {
  const router = useRouter();
  const dashboardId = router.query.id as string;
  const { dashboard } = useDashboard(dashboardId);
  console.log(dashboard);

  return router.query.id;
}
