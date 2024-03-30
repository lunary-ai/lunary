import ResultsMatrix from "@/components/evals/ResultsMatrix"
import CheckPicker from "@/components/checks/Picker"
import {
  useChecklist,
  useDataset,
  useEvaluation,
  useProjectSWR,
} from "@/utils/dataHooks"
import {
  Anchor,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core"
import { IconDatabase } from "@tabler/icons-react"
import Link from "next/link"

import { useRouter } from "next/router"

// We create a matrix of results for each prompt, variable and model.
// The matrix is a 3D array, where each dimension represents a different

export default function EvalResults() {
  const router = useRouter()

  const id = router.query.id as string

  const { data, isLoading: loading } = useProjectSWR(
    id && `/evaluations/result/${id}`,
  )

  const { evaluation } = useEvaluation(id)

  const { checklist } = useChecklist(evaluation?.checklistId)
  const { dataset } = useDataset(evaluation?.datasetId)

  return (
    <Container size="100%">
      <Stack>
        <Anchor href="/evaluations">← Back to Evaluations</Anchor>

        <Group>
          <Title>Evaluation </Title>
          <Badge variant="light" color="green">
            complete
          </Badge>
        </Group>

        <Card withBorder>
          <Stack>
            {checklist && (
              <Group>
                <Text>Checklist:</Text>
                <CheckPicker value={checklist.data} disabled />
              </Group>
            )}
            {dataset && (
              <Group>
                <Text>Dataset:</Text>
                <Button
                  size="xs"
                  variant="light"
                  color="blue"
                  leftSection={<IconDatabase size={12} />}
                  component={Link}
                  href={`/datasets/${evaluation?.datasetId}`}
                >
                  {dataset.slug}
                </Button>
              </Group>
            )}
          </Stack>
        </Card>

        {loading ? (
          <Loader />
        ) : (
          <>
            {data?.length > 0 ? (
              <Stack gap="xl">
                <ResultsMatrix data={data} />
              </Stack>
            ) : (
              <p>No data</p>
            )}
          </>
        )}
      </Stack>
    </Container>
  )
}
