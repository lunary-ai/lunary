import TopTopics from "@/components/analytics/Charts/TopTopics";
import TotalUsersByDepartment from "@/components/analytics/Charts/TotalUsersByDerpartment";
import TotalUsersByLocation from "@/components/analytics/Charts/TotalUsersByLocation";
import { SimpleGrid } from "@mantine/core";

export default function Analytics2() {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
      <TopTopics />
      <TotalUsersByLocation />
      <TotalUsersByDepartment />
    </SimpleGrid>
  );
}
