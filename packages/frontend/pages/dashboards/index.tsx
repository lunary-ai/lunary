import { useDashboards } from "@/utils/dataHooks/dashboards";
import {
  Anchor,
  Card,
  Container,
  Group,
  Loader,
  SimpleGrid,
  Text,
  Title,
} from "@mantine/core";

export default function Dashboard() {
  const { dashboards, isLoading } = useDashboards();

  if (isLoading) {
    return <Loader />;
  }

  return (
    <Container>
      <Title mb="lg" mt="lg">
        Dashboards
      </Title>

      <SimpleGrid cols={3}>
        {dashboards.map((dashboard) => (
          <Card key={dashboard.id} withBorder p={2} px="sm" h="200px">
            <Anchor href={`/dashboards/${dashboard.id}`} h="100%">
              <Title size="sm">{dashboard.name}</Title>
              <Text>{dashboard.description}</Text>
            </Anchor>
          </Card>
        ))}
      </SimpleGrid>
    </Container>
  );
}
