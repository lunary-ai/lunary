import {
  Button,
  Group,
  Loader,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/router";
import { useEvals } from "@/utils/dataHooks/evals";

export default function EvalsIndexPage() {
  const router = useRouter();
  const { evals, isLoading } = useEvals();

  return (
    <Stack px="lg" py="md" style={{ height: "100%" }}>
      <Group justify="space-between" mb="md">
        <Title order={2}>evaluations</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => router.push("/evals/new")}
        >
          new evaluation
        </Button>
      </Group>

      {isLoading ? (
        <Group justify="center" mt="xl">
          <Loader />
        </Group>
      ) : evals && evals.length ? (
        <Table striped highlightOnHover withTableBorder>
          <thead>
            <tr>
              <th>name</th>
              <th>dataset</th>
              <th>created</th>
            </tr>
          </thead>
          <tbody>
            {evals.map((e: any) => (
              <tr
                key={e.id}
                style={{ cursor: "pointer" }}
                onClick={() => router.push(`/evals/${e.id}`)}
              >
                <td>{e.name}</td>
                <td>{e.datasetSlug ?? e.datasetId}</td>
                <td>{new Date(e.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Text color="dimmed">
          no evaluations yet. click “new evaluation” to create one.
        </Text>
      )}
    </Stack>
  );
}
